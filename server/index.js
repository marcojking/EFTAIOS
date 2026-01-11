const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const RoomManager = require('./game/RoomManager');
const { DANGEROUS_SECTOR_CARDS, ITEM_CARDS, ESCAPE_HATCH_CARDS } = require('./game/cards');
const { generateMoveHints, generateTurnTips } = require('./game/tutorialHints');
const { BotPlayer, createTeachingGame } = require('./game/AIPlayer');

// Store bot instances for any room with bots
const roomBots = new Map(); // roomCode -> BotPlayer[]

// Process bot turns automatically
// This function handles a bot's complete turn and recursively processes next bot if needed
async function processBotTurns(roomCode) {
  const gameState = roomManager.getRoom(roomCode);
  const bots = roomBots.get(roomCode);

  console.log(`[BOT] processBotTurns called for room ${roomCode}`);
  console.log(`[BOT] gameState exists: ${!!gameState}, bots: ${bots?.length || 0}, phase: ${gameState?.phase}`);

  if (!gameState || !bots || bots.length === 0) {
    console.log(`[BOT] Early exit: no gameState or no bots`);
    return;
  }
  if (gameState.phase !== 'playing') {
    console.log(`[BOT] Early exit: phase is ${gameState.phase}`);
    return;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  console.log(`[BOT] Current player: ${currentPlayer?.name}, isAI: ${currentPlayer?.isAI}, index: ${gameState.currentPlayerIndex}`);

  if (!currentPlayer || !currentPlayer.isAI) {
    console.log(`[BOT] Early exit: current player is not a bot`);
    return;
  }

  // Find the bot instance for this player
  const botInstance = bots.find(b => b.playerId === currentPlayer.id);
  console.log(`[BOT] Found bot instance: ${!!botInstance}, looking for ID: ${currentPlayer.id}`);
  console.log(`[BOT] Available bot IDs: ${bots.map(b => b.playerId).join(', ')}`);

  if (!botInstance) {
    console.log(`[BOT] Early exit: no bot instance found`);
    return;
  }

  // Add a small delay to make bot turns visible
  await new Promise(resolve => setTimeout(resolve, 800));

  // Execute the bot's turn
  console.log(`[BOT] Executing turn for ${currentPlayer.name}`);
  const turnResult = await executeBotTurn(gameState, currentPlayer, botInstance, roomCode);
  console.log(`[BOT] Turn result:`, turnResult);

  // Broadcast the updated state
  broadcastGameState(roomCode);

  // If there's a pending action (noise declaration needed), handle it
  if (gameState.pendingAction && gameState.pendingAction.playerId === currentPlayer.id) {
    console.log(`[BOT] Handling pending action: ${gameState.pendingAction.type}`);
    await new Promise(resolve => setTimeout(resolve, 400));
    await handleBotPendingAction(gameState, currentPlayer, botInstance, roomCode);
    broadcastGameState(roomCode);
  }

  // Check if the game ended
  if (gameState.phase === 'ended') {
    console.log(`[BOT] Game ended, stopping bot turns`);
    return;
  }

  // Small delay before next bot turn
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check if the next player is also a bot
  const nextPlayer = gameState.players[gameState.currentPlayerIndex];
  console.log(`[BOT] Next player: ${nextPlayer?.name}, isAI: ${nextPlayer?.isAI}`);

  if (nextPlayer && nextPlayer.isAI && nextPlayer.alive && !nextPlayer.escaped) {
    // Recursively process next bot turn
    console.log(`[BOT] Next player is also a bot, continuing...`);
    processBotTurns(roomCode);
  } else {
    console.log(`[BOT] Next player is human or bot processing complete`);
  }
}

// Execute a single bot turn
async function executeBotTurn(gameState, player, botInstance, roomCode) {
  const isHuman = player.role === 'human';
  console.log(`[BOT] executeBotTurn for ${player.name}, role: ${player.role}, position: ${player.position}`);

  // Check for escape hatch opportunity (humans only)
  if (isHuman) {
    const escapeMove = findEscapeOpportunity(gameState, player);
    if (escapeMove) {
      console.log(`[BOT] Human bot attempting escape to ${escapeMove}`);
      const result = gameState.movePlayer(player.id, escapeMove);
      return { action: 'escape_attempt', result };
    }
  }

  // Check if should use item before moving (e.g., Adrenaline)
  if (isHuman && player.items && player.items.length > 0) {
    const adrenalineItem = player.items.find(i => i.type === 'ADRENALINE');
    if (adrenalineItem && shouldUseAdrenaline(gameState, player)) {
      console.log(`[BOT] Using adrenaline`);
      gameState.useItem(player.id, adrenalineItem.id, null);
    }
  }

  // Decide move using bot heuristics
  const decision = botInstance.decideMove(gameState);
  console.log(`[BOT] Move decision:`, decision);

  if (decision.action === 'move' && decision.target) {
    // Check if alien should attack
    if (!isHuman) {
      const attackDecision = botInstance.decideAttack(gameState);
      if (attackDecision.action === 'attack') {
        console.log(`[BOT] Alien attacking at ${decision.target}`);
        const result = gameState.moveAndAttack(player.id, decision.target);
        return { action: 'move_and_attack', result };
      }
    }

    // Normal move
    console.log(`[BOT] Moving to ${decision.target}`);
    const result = gameState.movePlayer(player.id, decision.target);
    return { action: 'move', target: decision.target, result };
  }

  // Lurking Alien can attack in place
  if (!isHuman && player.character?.power?.canAttackWithoutMoving) {
    const attackDecision = botInstance.decideAttack(gameState);
    if (attackDecision.action === 'attack') {
      console.log(`[BOT] Lurking alien attacking in place`);
      const result = gameState.attackInPlace(player.id);
      return { action: 'attack_in_place', result };
    }
  }

  console.log(`[BOT] No valid action found for bot`);
  return { action: 'none' };
}

// Handle pending actions (noise declarations) for bots
async function handleBotPendingAction(gameState, player, botInstance, roomCode) {
  const pending = gameState.pendingAction;
  if (!pending || pending.playerId !== player.id) return;

  if (pending.type === 'DECLARE_NOISE') {
    const card = pending.card;
    console.log(`[BOT] Declaring noise for card type: ${card.type}`);

    if (card.type === 'SILENCE') {
      // Silence card - declare silence
      gameState.declareNoise(player.id, null, true);
    } else if (card.type === 'NOISE_YOUR_SECTOR') {
      // Must announce actual sector
      gameState.declareNoise(player.id, player.position, false);
    } else if (card.type === 'NOISE_ANY_SECTOR') {
      // Can lie - bot decides where to announce
      const deceptionSector = botInstance.decideDeception(gameState, true);
      console.log(`[BOT] Announcing deceptive noise at ${deceptionSector}`);
      gameState.declareNoise(player.id, deceptionSector, false);
    }
  } else if (pending.type === 'ESCAPE_CHOICE') {
    // Engineer's power - choose between two escape cards
    // Always choose the green one if available
    const greenIndex = pending.cards.findIndex(c => c.type === 'GREEN');
    const choiceIndex = greenIndex >= 0 ? greenIndex : 0;
    console.log(`[BOT] Choosing escape card index: ${choiceIndex}`);
    gameState.chooseEscapeCard(player.id, choiceIndex);
  } else if (pending.type === 'SECOND_NOISE' || pending.type === 'CAT_NOISE') {
    // Choose a deceptive second sector
    const deceptionSector = botInstance.decideDeception(gameState, true);
    console.log(`[BOT] Declaring second noise at ${deceptionSector}`);
    gameState.declareSecondNoise(player.id, deceptionSector);
  }
}

// Find an escape opportunity for human bots
function findEscapeOpportunity(gameState, player) {
  const map = gameState.map;
  const maxDistance = player.moveSpeed;

  // Check if any escape hatch is reachable
  const escapeHatches = map.grid.filter(h =>
    h.state === 'airlock' &&
    gameState.escapeHatchStatus[h.label] === 'available'
  );

  for (const hatch of escapeHatches) {
    const { isValidMove } = require('./game/mapUtils');
    const validation = isValidMove(map, player.position, hatch.label, maxDistance, 'human');
    if (validation.valid) {
      return hatch.label;
    }
  }

  return null;
}

// Decide if human bot should use Adrenaline
function shouldUseAdrenaline(gameState, player) {
  const map = gameState.map;

  // Check if Adrenaline would help reach an escape hatch
  const escapeHatches = map.grid.filter(h =>
    h.state === 'airlock' &&
    gameState.escapeHatchStatus[h.label] === 'available'
  );

  for (const hatch of escapeHatches) {
    const { isValidMove } = require('./game/mapUtils');
    // Would not be reachable without adrenaline
    const withoutAdrenaline = isValidMove(map, player.position, hatch.label, player.moveSpeed, 'human');
    // Would be reachable with adrenaline
    const withAdrenaline = isValidMove(map, player.position, hatch.label, player.moveSpeed + 1, 'human');

    if (!withoutAdrenaline.valid && withAdrenaline.valid) {
      return true;
    }
  }

  // Use if late game (turn 25+) and would help get closer
  if (gameState.currentTurn >= 25) {
    return true;
  }

  return false;
}

// Helper to check if the current player is a bot and process their turn
function checkAndProcessBotTurns(roomCode, gameState) {
  if (!gameState || gameState.phase !== 'playing') return;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (currentPlayer && currentPlayer.isAI && currentPlayer.alive && !currentPlayer.escaped) {
    // Small delay before bot turn starts
    setTimeout(() => processBotTurns(roomCode), 300);
  }
}

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

  // Check if player is a spectator:
  // - Game has ended (all players become spectators)
  // - Dead alien
  // - Escaped human
  const isSpectator =
    gameState.phase === 'ended' ||
    (player.role === 'alien' && !player.alive) ||
    (player.role === 'human' && player.escaped);

  // Generate tutorial hints if player is in tutorial mode and it's their turn
  let tutorialHints = null;
  if (player.tutorialMode &&
    gameState.phase === 'playing' &&
    gameState.players[gameState.currentPlayerIndex]?.id === playerId) {
    tutorialHints = {
      moveHints: generateMoveHints(gameState, playerId),
      tips: generateTurnTips(gameState, playerId)
    };
  }

  return {
    phase: gameState.phase,
    currentTurn: gameState.currentTurn,
    currentPlayerIndex: gameState.currentPlayerIndex,
    currentPlayerId: gameState.players[gameState.currentPlayerIndex]?.id,
    firstPlayerId: gameState.firstPlayerId,
    maxTurns: gameState.maxTurns,
    map: gameState.map,
    isSpectatorView: isSpectator, // Flag so client knows it's in spectator mode
    tutorialHints: tutorialHints, // Tutorial hints for new players
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
      hasFed: p.hasFed || false,
      tutorialMode: p.tutorialMode || false // Include tutorial mode status for all players
    })),
    // Filter announcements based on visibility and reveal toggle
    announcements: gameState.announcements.filter(a => {
      // Spectators see everything
      if (isSpectator) return true;

      // If visibility is 'all' or not set, always show
      if (a.visibility === 'all' || !a.visibility) return true;

      // Always-announced types (regardless of toggle):
      // Spotlight, Sensor, Medic Reveal Identity, Engineer escape choice, escapes, deaths, noise
      const alwaysAnnounced = [
        'SPOTLIGHT', 'SENSOR', 'REVEAL_IDENTITY', 'POWER_USED',
        'ESCAPE', 'ESCAPE_FAILED', 'ELIMINATED', 'MUTATION',
        'NOISE', 'SILENCE', 'NOISE_IN_SECTOR', 'SILENT_MOVE', 'SILENT_SECTOR',
        'ATTACK', 'GAME_START', 'GAME_END', 'GLOBAL_POPUP'
      ];
      if (alwaysAnnounced.includes(a.type)) {
        return true;
      }

      // Toggle-dependent announcements (only show if revealCardsAndAbilities is ON)
      const toggleDependentTypes = [
        'DEFENSE_USED', 'CLONE_USED', 'TELEPORT_USED', 'ADRENALINE_USED',
        'SEDATIVES_USED', 'POWER_FREE_TELEPORT', 'ATTACK_IMMUNE'
      ];
      if (toggleDependentTypes.includes(a.type)) {
        return gameState.settings.revealCardsAndAbilities;
      }

      // Default: hide spectator_only from players
      return a.visibility !== 'spectator_only';
    }),
    escapeHatchStatus: gameState.escapeHatchStatus,
    activeEffects: gameState.activeEffects || {}, // Include active effects (adrenaline, sedatives) for client-side highlighting
    pendingAction: gameState.pendingAction?.playerId === playerId ? gameState.pendingAction : null,
    dangerousDeckRemaining: gameState.dangerousDeck.length,
    itemDeckRemaining: gameState.itemDeck.length,
    // Include turn history for spectator timeline lookback
    turnHistory: isSpectator ? gameState.turnHistory : null,
    settings: gameState.settings // Send settings to client
  };
}

// Get host/spectator view
function getHostView(gameState, botDebugInfo = null) {
  if (!gameState) return null;
  return {
    ...gameState,
    isHostView: true,
    settings: gameState.settings,
    botDebugInfo: botDebugInfo
  };
}

// Collect debug info from all bots in a room
function collectBotDebugInfo(roomCode) {
  const bots = roomBots.get(roomCode);
  if (!bots || bots.length === 0) return null;

  const debugInfo = {};
  bots.forEach(bot => {
    debugInfo[bot.playerId] = bot.getDebugInfo();
  });
  return debugInfo;
}

// Broadcast updated state to all players in a room
function broadcastGameState(roomCode) {
  const gameState = roomManager.getRoom(roomCode);
  if (!gameState) return;

  const roomClients = getRoomClients(roomCode);
  const botDebugInfo = collectBotDebugInfo(roomCode); // Collect once for efficiency

  roomClients.forEach(client => {
    let view;
    // isHostPlayer means host is also playing (not just spectating)
    // ALSO: If it's a teaching game, host is ALWAYS a player
    const isTeachingHost = gameState.isTeachingMode && client.isHost;

    if (client.isHost && !client.isHostPlayer && !isTeachingHost) {
      view = getHostView(gameState, botDebugInfo);
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
      console.log(`[WS] Received message type: ${message.type} from client: ${clients.get(ws)?.id}`);
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
      console.log('[CREATE_ROOM] Handler triggered, mapData:', message.mapData);
      const roomCode = roomManager.createRoom(message.mapData || null);
      console.log('[CREATE_ROOM] Room created with code:', roomCode);

      // Update client state
      // Use persistent ID if provided, otherwise keep session ID
      if (message.playerId) {
        client.id = message.playerId;
      }

      client.roomCode = roomCode;
      client.isHost = true;
      clients.set(ws, client);

      console.log('[CREATE_ROOM] Sending ROOM_CREATED response');
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

        // Log player info after game start
        console.log('[START_GAME] Players after role assignment:');
        gameState.players.forEach((p, i) => {
          console.log(`  [${i}] ${p.name}: ${p.role}, isAI: ${p.isAI}, id: ${p.id}`);
        });

        // Log bot instances
        const bots = roomBots.get(roomCode) || [];
        console.log(`[START_GAME] Bot instances in roomBots: ${bots.length}`);
        bots.forEach(b => console.log(`  Bot ID: ${b.playerId}`));

        // Check if first player is a bot and start bot turn processing
        const firstPlayer = gameState.players[gameState.currentPlayerIndex];
        console.log(`[START_GAME] First player: ${firstPlayer?.name}, isAI: ${firstPlayer?.isAI}`);

        if (firstPlayer && firstPlayer.isAI) {
          console.log('[START_GAME] First player is a bot, starting bot turns...');
          processBotTurns(roomCode);
        } else {
          console.log('[START_GAME] First player is human, waiting for their move');
        }
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
        const playerId = message.playerId;
        const playerToRemove = gameState.players.find(p => p.id === playerId);

        // Remove player from game state
        gameState.players = gameState.players.filter(p => p.id !== playerId);

        // If it's a bot, remove from roomBots
        if (playerToRemove?.isAI) {
          const bots = roomBots.get(roomCode) || [];
          const updatedBots = bots.filter(b => b.playerId !== playerId);
          roomBots.set(roomCode, updatedBots);
        } else {
          // Find and notify the kicked human player
          for (const [clientWs, clientData] of clients.entries()) {
            if (clientData.id === playerId && clientData.roomCode === roomCode) {
              sendTo(clientWs, { type: 'KICKED', message: 'You have been removed from the lobby by the host.' });
              clientData.roomCode = null; // Remove from room
              break;
            }
          }
        }

        broadcastGameState(roomCode);
      }
      break;
    }

    case 'ADD_BOT': {
      const roomCode = client.roomCode;
      const gameState = roomManager.getRoom(roomCode);

      if (!gameState || !client.isHost || gameState.phase !== 'LOBBY') {
        sendTo(ws, { type: 'ERROR', message: 'Cannot add bot' });
        break;
      }

      const difficulty = message.difficulty || 'advanced';
      const botCount = gameState.players.filter(p => p.isAI).length;
      const botId = `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const botName = `Bot ${botCount + 1}`;

      // Add to game state
      const player = gameState.addPlayer(botId, botName);
      player.isAI = true;
      player.difficulty = difficulty;

      // Add bot instance (pass null to generate a random personality)
      const botInstance = new BotPlayer(botId, null);
      const currentBots = roomBots.get(roomCode) || [];
      currentBots.push(botInstance);
      roomBots.set(roomCode, currentBots);

      broadcastGameState(roomCode);
      break;
    }

    case 'UPDATE_BOT_DIFFICULTY': {
      const roomCode = client.roomCode;
      const gameState = roomManager.getRoom(roomCode);

      if (!gameState || !client.isHost || gameState.phase !== 'LOBBY') {
        break;
      }

      const { botId, difficulty } = message;
      const player = gameState.players.find(p => p.id === botId);

      if (player && player.isAI) {
        player.difficulty = difficulty;

        // Update bot instance
        const bots = roomBots.get(roomCode) || [];
        const botInstance = bots.find(b => b.playerId === botId);
        if (botInstance) {
          botInstance.difficulty = difficulty;
        }

        broadcastGameState(roomCode);
      }
      break;
    }

    case 'SET_TUTORIAL_MODE': {
      // Player toggles their own tutorial mode
      const roomCode = client.roomCode;
      const gameState = roomManager.getRoom(roomCode);

      if (gameState) {
        const player = gameState.players.find(p => p.id === client.id);
        if (player) {
          player.tutorialMode = message.enabled === true;
          broadcastGameState(roomCode);
        }
      }
      break;
    }

    case 'HOST_JOIN_AS_PLAYER': {
      // Host wants to also be a player (not just spectator)
      const roomCode = client.roomCode;
      const gameState = roomManager.getRoom(roomCode);

      if (!gameState) {
        sendTo(ws, { type: 'ERROR', message: 'Room not found' });
        break;
      }

      if (gameState.phase !== 'LOBBY') {
        sendTo(ws, { type: 'ERROR', message: 'Can only join during lobby phase' });
        break;
      }

      // Add host as player
      const player = gameState.addPlayer(client.id, message.name || 'Host');
      client.isHostPlayer = true;
      clients.set(ws, client);

      sendTo(ws, {
        type: 'HOST_JOINED_AS_PLAYER',
        playerId: client.id,
        player: player
      });

      broadcastGameState(roomCode);
      break;
    }



    case 'REQUEST_AI_MOVE': {
      // Request AI to make a move (called after human's turn in teaching mode)
      const roomCode = client.roomCode;
      const gameState = roomManager.getRoom(roomCode);
      const bots = roomBots.get(roomCode);

      if (!gameState || !bots) {
        sendTo(ws, { type: 'ERROR', message: 'No bots in this game' });
        break;
      }

      // Find current AI player
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (!currentPlayer?.isAI) {
        sendTo(ws, { type: 'ERROR', message: 'Not AI turn' });
        break;
      }

      // Find AI instance
      const aiInstance = bots.find(ai => ai.playerId === currentPlayer.id);
      if (!aiInstance) break;

      // AI decides move
      const decision = aiInstance.decideMove(gameState);

      if (decision.action === 'move' && decision.target) {
        // Execute AI move
        const result = gameState.movePlayer(currentPlayer.id, decision.target);

        // Send AI move info to human
        sendTo(ws, {
          type: 'AI_MOVE_MADE',
          aiPlayerId: currentPlayer.id,
          move: decision,
          result: result.success ? 'success' : result.message
        });

        // If AI needs to announce noise, handle it
        if (result.cardDrawn && result.cardDrawn.type === 'NOISE_ANY') {
          const noiseSector = aiInstance.decideDeception(gameState, true);
          gameState.announceNoise(currentPlayer.id, noiseSector);
        }

        broadcastGameState(roomCode);
      }
      break;
    }

    case 'AI_FEEDBACK': {
      // Record feedback on an AI move
      const roomCode = client.roomCode;
      const bots = roomBots.get(roomCode);

      if (!bots || bots.length === 0) {
        sendTo(ws, { type: 'ERROR', message: 'No bots in this game' });
        break;
      }

      const { turnNumber, rating, comment, aiPlayerId } = message;
      const aiInstance = bots.find(ai => ai.playerId === aiPlayerId);

      if (aiInstance) {
        aiInstance.recordFeedback(turnNumber, rating, comment);
        sendTo(ws, { type: 'FEEDBACK_RECORDED', turnNumber, rating });
      }
      break;
    }

    case 'EXPORT_AI_LOG': {
      // Export the full AI strategy log for analysis
      const roomCode = client.roomCode;
      const bots = roomBots.get(roomCode);

      if (!bots || bots.length === 0) {
        sendTo(ws, { type: 'ERROR', message: 'No bots in this game' });
        break;
      }

      const logs = bots.map(ai => ai.exportLog());
      sendTo(ws, {
        type: 'AI_LOG_EXPORT',
        logs,
        timestamp: Date.now()
      });
      break;
    }

    case 'TOGGLE_SETTING': {
      const roomCode = client.roomCode;
      const gameState = roomManager.getRoom(roomCode);

      if (!gameState || !client.isHost || gameState.phase !== 'LOBBY') {
        break;
      }

      const { key, value } = message;
      if (gameState.updateSetting(key, value)) {
        broadcastGameState(roomCode);
      }
      break;
    }

    case 'MOVE_PLAYER': {
      const roomCode = client.roomCode;
      const gameState = roomManager.getRoom(roomCode);

      if (gameState) {
        if (gameState.phase === 'ended') {
          sendTo(ws, { type: 'ERROR', message: 'Game has ended' });
          break;
        }
        const result = gameState.movePlayer(client.id, message.destination);
        if (result.success) {
          broadcastGameState(roomCode);

          // Send card drawn info ONLY to the moving player
          if (result.cardDrawn) {
            sendTo(ws, {
              type: 'CARD_DRAWN',
              card: result.cardDrawn,
              itemCard: result.itemDrawn || null,
              targetSector: result.targetSector
            });
          }

          // Check if next player is a bot (turn advanced after secure sector move)
          checkAndProcessBotTurns(roomCode, gameState);
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
        if (gameState.phase === 'ended') {
          sendTo(ws, { type: 'ERROR', message: 'Game has ended' });
          break;
        }
        const result = gameState.moveAndAttack(client.id, message.sector, message.usePower || false);
        if (result.success) {
          broadcastGameState(roomCode);
          checkAndProcessBotTurns(roomCode, gameState);
        } else {
          sendTo(ws, { type: 'ERROR', message: result.error || 'Move and attack failed' });
        }
      }
      break;
    }

    case 'ATTACK_IN_PLACE': {
      const roomCode = client.roomCode;
      const gameState = roomManager.getRoom(roomCode);

      if (gameState) {
        if (gameState.phase === 'ended') {
          sendTo(ws, { type: 'ERROR', message: 'Game has ended' });
          break;
        }
        const result = gameState.attackInPlace(client.id);
        if (result.success) {
          broadcastGameState(roomCode);
          checkAndProcessBotTurns(roomCode, gameState);
        } else {
          sendTo(ws, { type: 'ERROR', message: result.error || 'Attack in place failed' });
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
        if (gameState.phase === 'ended') {
          sendTo(ws, { type: 'ERROR', message: 'Game has ended' });
          break;
        }
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
          // Check if next player is a bot after turn-ending actions
          checkAndProcessBotTurns(roomCode, gameState);
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
