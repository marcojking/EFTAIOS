const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const RoomManager = require('./game/RoomManager');
const { DANGEROUS_SECTOR_CARDS, ITEM_CARDS, ESCAPE_HATCH_CARDS } = require('./game/cards');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Room manager handling multiple game states
const roomManager = new RoomManager();

// Client connection tracking: ws -> { id, roomCode, isHost }
const clients = new Map();

// Helper: Get all clients in a specific room
function getRoomClients(roomCode) {
  const roomClients = [];
  for (const [ws, client] of clients.entries()) {
    if (client.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
      roomClients.push({ ws, ...client });
    }
  }
  return roomClients;
}

// Helper: Broadcast to a specific room
function broadcastToRoom(roomCode, message, excludeWs = null) {
  if (!roomCode) return;
  const data = JSON.stringify(message);

  for (const [ws, client] of clients.entries()) {
    if (client.roomCode === roomCode && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

// Helper: Send to specific client
function sendTo(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Get player-specific view of game state
function getPlayerView(gameState, playerId) {
  if (!gameState) return null;

  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return null;

  // Check if player is a spectator (dead alien)
  const isSpectator = player.role === 'alien' && !player.alive;

  return {
    phase: gameState.phase,
    currentTurn: gameState.currentTurn,
    currentPlayerIndex: gameState.currentPlayerIndex,
    currentPlayerId: gameState.players[gameState.currentPlayerIndex]?.id,
    firstPlayerId: gameState.firstPlayerId,
    maxTurns: gameState.maxTurns,
    map: gameState.map,
    myPlayer: {
      ...player,
      powerUsage: player.powerUsage,
      hasMoved: player.hasMoved,
      isSpectator: isSpectator // explicit flag for client
    },
    players: gameState.players.map(p => ({
      id: p.id,
      name: p.name,
      // specific logic: reveal everything if spectator
      role: (p.id === playerId || isSpectator) ? p.role : (p.revealed ? p.role : null),
      character: (p.id === playerId || isSpectator) ? p.character : (p.revealed ? p.character : null),
      position: (p.id === playerId || isSpectator || p.revealed) ? p.position : null, // Include position for spectators
      revealed: p.revealed || false,
      alive: p.alive ?? true,
      escaped: p.escaped || false,
      itemCount: p.items ? p.items.length : (p.hand ? p.hand.length : 0),
      hasFed: p.hasFed || false
    })),
    announcements: gameState.announcements,
    escapeHatchStatus: gameState.escapeHatchStatus,
    pendingAction: gameState.pendingAction?.playerId === playerId ? gameState.pendingAction : null,
    dangerousDeckRemaining: gameState.dangerousDeck.length,
    itemDeckRemaining: gameState.itemDeck.length
  };
}

// Get host/spectator view
function getHostView(gameState) {
  if (!gameState) return null;
  return {
    ...gameState,
    isHostView: true
  };
}

// Broadcast updated state to all players in a room
function broadcastGameState(roomCode) {
  const gameState = roomManager.getRoom(roomCode);
  if (!gameState) return;

  const roomClients = getRoomClients(roomCode);

  roomClients.forEach(client => {
    let view;
    if (client.isHost) {
      view = getHostView(gameState);
    } else {
      view = getPlayerView(gameState, client.id);
    }

    if (view) {
      sendTo(client.ws, {
        type: 'GAME_STATE_UPDATE',
        gameState: view
      });
    }
  });
}

function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        if (net.address.startsWith('192.168.') || net.address.startsWith('10.')) {
          return net.address;
        }
      }
    }
  }
  return 'localhost';
}

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  // Client starts with no room
  clients.set(ws, { id: clientId, roomCode: null, isHost: false });

  console.log(`Client connected: ${clientId}`);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    console.log(`Client disconnected: ${client?.id} from room ${client?.roomCode}`);

    // Handle disconnection logic here if needed (e.g. notify room)
    const roomCode = client?.roomCode;
    clients.delete(ws);

    // Optional: Notify room of disconnection
    if (roomCode) {
      const gameState = roomManager.getRoom(roomCode);
      if (gameState) {
        broadcastGameState(roomCode);
      }
    }
  });
});

function handleMessage(ws, message) {
  const client = clients.get(ws);
  if (!client) return;

  switch (message.type) {
    case 'CREATE_ROOM': {
      // Host creates a room
      const roomCode = roomManager.createRoom(message.mapData || null);

      // Update client state
      // Use persistent ID if provided, otherwise keep session ID
      if (message.playerId) {
        client.id = message.playerId;
      }

      client.roomCode = roomCode;
      client.isHost = true;
      clients.set(ws, client);

      sendTo(ws, {
        type: 'ROOM_CREATED',
        roomCode: roomCode,
        playerId: client.id
      });
      break;
    }

    case 'JOIN_ROOM': {
      // Player joins a room
      const roomCode = message.roomCode?.toUpperCase();
      const gameState = roomManager.getRoom(roomCode);

      if (!gameState) {
        sendTo(ws, { type: 'ERROR', message: 'Room not found' });
        return;
      }

      // Determine Player ID to use
      const targetPlayerId = message.playerId || client.id;

      // Check if this is a reconnection (player exists in game)
      const existingPlayer = gameState.players.find(p => p.id === targetPlayerId);

      // If game started, ONLY allow reconnection
      if (gameState.phase !== 'LOBBY' && !existingPlayer) {
        sendTo(ws, { type: 'ERROR', message: 'Game already in progress' });
        return;
      }

      // If persistent ID provided, update client session to match
      if (message.playerId) {
        client.id = message.playerId;
      }

      // Update client state
      client.roomCode = roomCode;
      client.name = message.name;
      client.isHost = false; // Joiners are never hosts (unless we implement host reclaim, but ignoring for now)
      clients.set(ws, client);

      // Add player to game state (or update existing)
      const player = gameState.addPlayer(client.id, message.name);

      // Mark connected status if we track it (GameState doesn't explicitly track 'connected' bool in a way that affects logic much, but good to know)
      // We could add player.connected = true; here if we want to show online status later.

      sendTo(ws, {
        type: 'ROOM_JOINED',
        roomCode: roomCode,
        playerId: client.id,
        player: player
      });

      // Notify everyone in room
      broadcastGameState(roomCode);
      break;
    }

    case 'START_GAME': {
      const roomCode = client.roomCode;
      const gameState = roomManager.getRoom(roomCode);

      console.log('START_GAME received:', {
        roomCode,
        isHost: client.isHost,
        hasGameState: !!gameState,
        playersCount: gameState?.players?.length || 0
      });

      if (!gameState) {
        console.log('START_GAME failed: No game state for room', roomCode);
        sendTo(ws, { type: 'ERROR', message: 'Room not found' });
        break;
      }

      if (!client.isHost) {
        console.log('START_GAME failed: Client is not host');
        sendTo(ws, { type: 'ERROR', message: 'Only the host can start the game' });
        break;
      }

      const result = gameState.startGame(message.mapData);
      console.log('START_GAME result:', result);

      if (result && result.success) {
        broadcastGameState(roomCode);
      } else {
        sendTo(ws, { type: 'ERROR', message: result?.message || 'Failed to start game' });
      }
      break;
    }

    case 'KICK_PLAYER': {
      const roomCode = client.roomCode;
      const gameState = roomManager.getRoom(roomCode);

      // Only host can kick, and only during lobby
      if (gameState && client.isHost && gameState.phase === 'LOBBY') {
        // Remove player from game state
        gameState.players = gameState.players.filter(p => p.id !== message.playerId);

        // Find and notify the kicked player
        for (const [clientWs, clientData] of clients.entries()) {
          if (clientData.id === message.playerId && clientData.roomCode === roomCode) {
            sendTo(clientWs, { type: 'KICKED', message: 'You have been removed from the lobby by the host.' });
            clientData.roomCode = null; // Remove from room
            break;
          }
        }

        broadcastGameState(roomCode);
      }
      break;
    }

    case 'MOVE_PLAYER': {
      const roomCode = client.roomCode;
      const gameState = roomManager.getRoom(roomCode);

      if (gameState) {
        const result = gameState.movePlayer(client.id, message.destination);
        if (result.success) {
          // If silent move, only tell the player
          if (result.silent) {
            broadcastGameState(roomCode); // Updates everyone that p moved (hidden)
          } else {
            // Normal move or noise
            broadcastGameState(roomCode);
          }

          // Send card drawn info ONLY to the moving player
          if (result.cardDrawn) {
            sendTo(ws, {
              type: 'CARD_DRAWN',
              card: result.cardDrawn,
              itemCard: result.itemDrawn || null,
              targetSector: result.targetSector
            });
          }
        } else {
          sendTo(ws, { type: 'ERROR', message: result.message });
        }
      }
      break;
    }

    case 'MOVE_AND_ATTACK': {
      const roomCode = client.roomCode;
      const gameState = roomManager.getRoom(roomCode);

      if (gameState) {
        const result = gameState.moveAndAttack(client.id, message.sector);
        if (result.success) {
          broadcastGameState(roomCode);
        } else {
          sendTo(ws, { type: 'ERROR', message: result.error || 'Move and attack failed' });
        }
      }
      break;
    }

    // ... Delegate all other actions to the room's GameState ...
    case 'DECLARE_NOISE':
    case 'USE_ITEM':
    case 'ATTACK':
    case 'USE_ESCAPE_HATCH':
    case 'END_TURN':
    case 'PRIME_ATTACK':
    case 'USE_POWER':
    case 'DECLARE_SECOND_NOISE': {
      const roomCode = client.roomCode;
      const gameState = roomManager.getRoom(roomCode);

      if (gameState) {
        // Generic handler for all other actions
        // We map the message type to the method name on GameState
        // e.g. DECLARE_NOISE -> declareNoise

        // Manual mapping for safety
        let result = { success: false, message: 'Unknown action' };

        if (message.type === 'DECLARE_NOISE') {
          // message.silence handles the isSilence param
          // message.useDoublePower handles double noise power
          // message.useCat handles Cat item noise
          result = gameState.declareNoise(
            client.id,
            message.sector,
            message.silence,
            message.useDoublePower || false,
            message.useCat || false
          );
        } else if (message.type === 'USE_ITEM') {
          result = gameState.useItem(client.id, message.itemIndex, message.targetSector);
        } else if (message.type === 'ATTACK') {
          result = gameState.attack(client.id, message.sector);
        } else if (message.type === 'USE_ESCAPE_HATCH') {
          result = gameState.useEscapeHatch(client.id, message.cardIndex);
        } else if (message.type === 'END_TURN') {
          result = gameState.endTurn(client.id);
        } else if (message.type === 'PRIME_ATTACK') {
          result = gameState.primeAttack(client.id, message.primed);
        } else if (message.type === 'USE_POWER') {
          // Route power usage to appropriate method
          switch (message.powerId) {
            case 'free_teleport':
              result = gameState.useFreeTeport(client.id);
              break;
            case 'reveal_identity':
              result = gameState.useRevealIdentity(client.id, message.targetPlayerId);
              break;
            case 'stay_still':
              result = gameState.useStayStill(client.id);
              // If Stay Still on dangerous sector, send card info to player
              if (result.success && result.cardDrawn) {
                sendTo(ws, {
                  type: 'CARD_DRAWN',
                  card: result.cardDrawn,
                  itemCard: result.itemDrawn || null,
                  targetSector: result.targetSector
                });
              }
              break;
            default:
              result = { success: false, error: 'Unknown power' };
          }
        } else if (message.type === 'DECLARE_SECOND_NOISE') {
          result = gameState.declareSecondNoise(client.id, message.sector);
        }

        if (result.success) {
          broadcastGameState(roomCode);
        } else {
          sendTo(ws, { type: 'ERROR', message: result.message || result.error });
        }
      }
      break;
    }

    // Keep alive / Debug
    case 'PING':
      sendTo(ws, { type: 'PONG' });
      break;
  }
}

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local Access: http://${getLocalIP()}:${PORT}`);
});
