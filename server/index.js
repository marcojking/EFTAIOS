const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const GameState = require('./game/GameState');
const { DANGEROUS_SECTOR_CARDS, ITEM_CARDS, ESCAPE_HATCH_CARDS } = require('./game/cards');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Game state
let gameState = null;
const clients = new Map(); // WebSocket -> { id, name, isHost }

// Broadcast to all clients
function broadcast(message, excludeWs = null) {
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Send to specific client
function sendTo(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Get player-specific view of game state (hides other players' positions)
function getPlayerView(playerId) {
  if (!gameState) return null;

  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return null;

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
      hasMoved: player.hasMoved
    },
    players: gameState.players.map(p => ({
      id: p.id,
      name: p.name,
      role: p.id === playerId ? p.role : (p.revealed ? p.role : null),
      character: p.id === playerId ? p.character : (p.revealed ? p.character : null),
      revealed: p.revealed,
      alive: p.alive,
      escaped: p.escaped,
      itemCount: p.items.length,
      hasFed: p.hasFed
    })),
    announcements: gameState.announcements,
    escapeHatchStatus: gameState.escapeHatchStatus,
    pendingAction: gameState.pendingAction?.playerId === playerId ? gameState.pendingAction : null,
    dangerousDeckRemaining: gameState.dangerousDeck.length,
    itemDeckRemaining: gameState.itemDeck.length
  };
}

// Get host/spectator view (shows everything)
function getHostView() {
  if (!gameState) return null;

  return {
    ...gameState,
    isHostView: true
  };
}

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  clients.set(ws, { id: clientId, name: null, isHost: false });

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
    console.log(`Client disconnected: ${client?.id}`);

    if (gameState && client) {
      const player = gameState.players.find(p => p.id === client.id);
      if (player) {
        player.connected = false;
        broadcast({ type: 'PLAYER_DISCONNECTED', playerId: client.id });
      }
    }

    clients.delete(ws);
  });
});

function handleMessage(ws, message) {
  const client = clients.get(ws);

  switch (message.type) {
    case 'JOIN_LOBBY':
      handleJoinLobby(ws, client, message);
      break;

    case 'CREATE_GAME':
      handleCreateGame(ws, client, message);
      break;

    case 'START_GAME':
      handleStartGame(ws, client);
      break;

    case 'MOVE':
      handleMove(ws, client, message);
      break;

    case 'ATTACK':
      handleAttack(ws, client, message);
      break;

    case 'MOVE_AND_ATTACK':
      handleMoveAndAttack(ws, client, message);
      break;

    case 'ATTACK_IN_PLACE':
      handleAttackInPlace(ws, client);
      break;

    case 'USE_ITEM':
      handleUseItem(ws, client, message);
      break;

    case 'USE_POWER':
      handleUsePower(ws, client, message);
      break;

    case 'DECLARE_NOISE':
      handleDeclareNoise(ws, client, message);
      break;

    case 'DECLARE_SECOND_NOISE':
      handleDeclareSecondNoise(ws, client, message);
      break;

    case 'CHOOSE_ESCAPE_CARD':
      handleChooseEscapeCard(ws, client, message);
      break;

    case 'UPDATE_GHOST_TOKENS':
      handleUpdateGhostTokens(ws, client, message);
      break;

    case 'GET_STATE':
      sendPlayerState(ws, client);
      break;

    default:
      console.log('Unknown message type:', message.type);
  }
}

function handleJoinLobby(ws, client, message) {
  client.name = message.name;
  client.isHost = message.isHost || false;

  sendTo(ws, {
    type: 'JOINED',
    clientId: client.id,
    isHost: client.isHost,
    type: 'JOINED',
    clientId: client.id,
    isHost: client.isHost,
    lanAddress: `${getLocalIP()}:${PORT}`, // Best guess
    allOrignals: getAllIPs().map(ip => `${ip}:${PORT}`) // List of all valid IPs
  });

  // Send current lobby state
  const lobbyPlayers = Array.from(clients.values())
    .filter(c => c.name)
    .map(c => ({ id: c.id, name: c.name, isHost: c.isHost }));

  broadcast({ type: 'LOBBY_UPDATE', players: lobbyPlayers });
}

function handleCreateGame(ws, client, message) {
  if (!client.isHost) {
    sendTo(ws, { type: 'ERROR', message: 'Only host can create game' });
    return;
  }

  const playerList = Array.from(clients.values())
    .filter(c => c.name && !c.isHost)
    .map(c => ({ id: c.id, name: c.name }));

  gameState = new GameState(message.mapData, playerList);

  broadcast({ type: 'GAME_CREATED' });
}

function handleStartGame(ws, client) {
  if (!client.isHost) {
    sendTo(ws, { type: 'ERROR', message: 'Only host can start game' });
    return;
  }

  if (!gameState) {
    sendTo(ws, { type: 'ERROR', message: 'No game created' });
    return;
  }

  gameState.start();

  // Send personalized state to each player
  clients.forEach((c, clientWs) => {
    if (c.isHost) {
      sendTo(clientWs, { type: 'GAME_STARTED', state: getHostView() });
    } else {
      sendTo(clientWs, { type: 'GAME_STARTED', state: getPlayerView(c.id) });
    }
  });
}

function handleMove(ws, client, message) {
  if (!gameState || gameState.phase !== 'playing') return;

  const result = gameState.movePlayer(client.id, message.sector);

  if (result.success) {
    broadcastGameState();

    if (result.cardDrawn) {
      // Only send the drawn card to the player who drew it
      sendTo(ws, {
        type: 'CARD_DRAWN',
        card: result.cardDrawn,
        itemCard: result.itemDrawn || null
      });
    }
  } else {
    sendTo(ws, { type: 'ERROR', message: result.error });
  }
}

function handleAttack(ws, client, message) {
  if (!gameState || gameState.phase !== 'playing') return;

  const result = gameState.attack(client.id, message.sector, message.usePower || false);

  if (result.success) {
    broadcast({
      type: 'ATTACK_RESULT',
      attacker: client.id,
      sector: message.sector,
      victims: result.victims,
      survivors: result.survivors
    });
    broadcastGameState();
  } else {
    sendTo(ws, { type: 'ERROR', message: result.error });
  }
}

function handleMoveAndAttack(ws, client, message) {
  if (!gameState || gameState.phase !== 'playing') return;

  const result = gameState.moveAndAttack(client.id, message.sector, message.usePower || false);

  if (result.success) {
    broadcast({
      type: 'MOVE_AND_ATTACK_RESULT',
      attacker: client.id,
      sector: message.sector,
      victims: result.victims,
      survivors: result.survivors
    });
    broadcastGameState();
  } else {
    sendTo(ws, { type: 'ERROR', message: result.error });
  }
}

function handleUseItem(ws, client, message) {
  if (!gameState || gameState.phase !== 'playing') return;

  const result = gameState.useItem(client.id, message.itemId, message.target);

  if (result.success) {
    // Handle Cat item's second noise requirement
    if (result.effect?.requiresSecondSector) {
      sendTo(ws, {
        type: 'CAT_SECOND_NOISE_REQUIRED',
        firstSector: result.effect.firstSector
      });
    } else {
      broadcast({
        type: 'ITEM_USED',
        playerId: client.id,
        itemType: message.itemType,
        result: result.effect
      });
    }
    broadcastGameState();
  } else {
    sendTo(ws, { type: 'ERROR', message: result.error });
  }
}

function handleDeclareNoise(ws, client, message) {
  if (!gameState || gameState.phase !== 'playing') return;

  const result = gameState.declareNoise(
    client.id,
    message.sector,
    message.isSilence,
    message.useDoublePower || false
  );

  if (result.success) {
    if (result.requiresSecondNoise) {
      // Pilot's double noise - send back to player for second sector selection
      sendTo(ws, {
        type: 'SECOND_NOISE_REQUIRED',
        firstSector: result.firstSector
      });
    } else {
      broadcast({
        type: 'NOISE_DECLARED',
        playerId: client.id,
        sector: message.isSilence ? null : message.sector,
        isSilence: message.isSilence
      });
    }
    broadcastGameState();
  } else {
    sendTo(ws, { type: 'ERROR', message: result.error });
  }
}

function handleDeclareSecondNoise(ws, client, message) {
  if (!gameState || gameState.phase !== 'playing') return;

  const result = gameState.declareSecondNoise(client.id, message.sector);

  if (result.success) {
    broadcast({
      type: 'DOUBLE_NOISE_DECLARED',
      playerId: client.id
    });
    broadcastGameState();
  } else {
    sendTo(ws, { type: 'ERROR', message: result.error });
  }
}

function handleAttackInPlace(ws, client) {
  if (!gameState || gameState.phase !== 'playing') return;

  const result = gameState.attackInPlace(client.id);

  if (result.success) {
    broadcast({
      type: 'ATTACK_RESULT',
      attacker: client.id,
      attackType: 'lurking',
      victims: result.victims,
      survivors: result.survivors
    });
    broadcastGameState();
  } else {
    sendTo(ws, { type: 'ERROR', message: result.error });
  }
}

function handleUsePower(ws, client, message) {
  if (!gameState || gameState.phase !== 'playing') return;

  let result;

  switch (message.power) {
    case 'free_teleport':
      result = gameState.useFreeTeport(client.id);
      break;

    case 'reveal_identity':
      result = gameState.useRevealIdentity(client.id, message.targetPlayerId);
      break;

    case 'stay_still':
      result = gameState.useStayStill(client.id);
      break;

    default:
      sendTo(ws, { type: 'ERROR', message: 'Unknown power' });
      return;
  }

  if (result.success) {
    broadcast({
      type: 'POWER_USED',
      playerId: client.id,
      power: message.power,
      result: result
    });
    broadcastGameState();
  } else {
    sendTo(ws, { type: 'ERROR', message: result.error });
  }
}

function handleChooseEscapeCard(ws, client, message) {
  if (!gameState || gameState.phase !== 'playing') return;

  const result = gameState.chooseEscapeCard(client.id, message.cardIndex);

  if (result.success) {
    broadcast({
      type: 'ESCAPE_RESOLVED',
      playerId: client.id,
      escaped: result.escaped,
      sector: message.sector
    });
    broadcastGameState();
  } else {
    sendTo(ws, { type: 'ERROR', message: result.error });
  }
}

function handleUpdateGhostTokens(ws, client, message) {
  // Ghost tokens are client-side only, but we can sync them if needed
  // For now, this is handled entirely on the client
}

function sendPlayerState(ws, client) {
  if (!gameState) {
    sendTo(ws, { type: 'STATE', state: null });
    return;
  }

  if (client.isHost) {
    sendTo(ws, { type: 'STATE', state: getHostView() });
  } else {
    sendTo(ws, { type: 'STATE', state: getPlayerView(client.id) });
  }
}

function broadcastGameState() {
  clients.forEach((client, ws) => {
    if (client.isHost) {
      sendTo(ws, { type: 'STATE_UPDATE', state: getHostView() });
    } else if (client.name) {
      sendTo(ws, { type: 'STATE_UPDATE', state: getPlayerView(client.id) });
    }
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`EFTAIOS Server running on port ${PORT}`);
  console.log(`LAN address: http://${getLocalIP()}:${PORT}`);
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/build')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Get all valid LAN IPs
function getAllIPs() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal (localhost) and non-IPv4
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
}

// Get the best guess for the LAN IP (prioritizing common LAN subnets)
function getLocalIP() {
  const ips = getAllIPs();

  // Preference order: 192.168.x.x -> 10.x.x.x -> 172.x.x.x
  const pref192 = ips.find(ip => ip.startsWith('192.168.'));
  if (pref192) return pref192;

  const pref10 = ips.find(ip => ip.startsWith('10.'));
  if (pref10) return pref10;

  const pref172 = ips.find(ip => ip.startsWith('172.'));
  if (pref172) return pref172;

  return ips[0] || 'localhost';
}
