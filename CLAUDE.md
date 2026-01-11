# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Digital LAN multiplayer version of the board game "Escape from the Aliens in Outer Space" (Ultimate Edition). Features real-time WebSocket communication between a host/spectator screen and player devices.

## Commands

```bash
# Install all dependencies (root + client)
npm install && cd client && npm install && cd ..

# Start both server and client concurrently
npm run dev

# Start server only (port 3001)
npm run server

# Start client only (React dev server, port 3000)
npm run client

# Production build
npm run build
```

## Architecture

### Client-Server Communication
- **Server** (`server/index.js`): Express + WebSocket server on port 3001
- **Client** (`client/`): React app using `useWebSocket` hook for real-time communication
- **Maps**: Galatea (default, compact), Galilei (classic), and Fermi available in `client/src/data/maps.js`
- Message types defined in `handleMessage()` switch statement in `server/index.js`
- Host sees all positions (`getHostView()`); players see only their own position (`getPlayerView()`)

### Room System
- `server/game/RoomManager.js`: Manages multiple concurrent game rooms with auto-cleanup after 1 hour of inactivity
- Each room has a unique 4-letter code (e.g., "ABCD") that players use to join
- WebSocket messages: `CREATE_ROOM`, `JOIN_ROOM`, `START_GAME`, `KICK_PLAYER`, `ADD_BOT`
- Clients track room state via `lastMessage` events (`ROOM_CREATED`, `ROOM_JOINED`)

### Game State Flow
1. Host creates room via `CREATE_ROOM` → receives `roomCode`
2. Players join via `JOIN_ROOM` with name and room code
3. Host can add AI bots via `ADD_BOT` during lobby phase
4. Host starts game with `START_GAME` (includes map data)
5. Game proceeds through player turns with `MOVE_PLAYER`, `MOVE_AND_ATTACK`, `ATTACK`, `DECLARE_NOISE`, `USE_ITEM`, `USE_POWER` messages
6. Server broadcasts state updates to room via `broadcastGameState(roomCode)`

### Key Server Files
- `server/game/GameState.js`: Core game logic class (~1600 lines) - turn management, movement validation, combat, item usage, character powers, mutation mechanics
- `server/game/cards.js`: Card deck definitions (78 Dangerous Sector cards, 6 Escape Hatch cards, 12 Item types)
- `server/game/characters.js`: 16 characters (8 human, 8 alien) with unique powers
- `server/game/mapUtils.js`: Hex grid utilities using odd-q offset coordinates for movement validation and pathfinding (BFS)
- `server/game/AIPlayer.js`: AI bot implementation for teaching games
- `server/game/tutorialHints.js`: Tutorial system for new players

### Key Client Components
- `client/src/App.js`: Main component managing screens (landing → lobby → game) and WebSocket message handling
- `client/src/components/GameBoard.js`: Main game view with hex grid
- `client/src/components/HexGrid.js`: Hex map rendering with zoom/pan
- `client/src/components/PlayerTracker.js`: Turn order and player status display
- `client/src/hooks/useWebSocket.js`: WebSocket connection hook with auto-reconnect and message queuing

### Game Rules Implementation
- Humans: Move 1 sector, try to reach escape hatches
- Aliens: Move 1-2 sectors (3 after feeding/killing a human)
- Dangerous sectors trigger card draws requiring noise declarations
- Items come embedded on Silence cards (Ultimate Edition rules)
- Character powers tracked in `player.powerUsage` object
- Pending actions (e.g., noise declaration after move) stored in `gameState.pendingAction`
- Humans attacked by aliens mutate into aliens (not killed)
- Mutated players lose their original human character powers

### State Visibility
The server maintains information hiding:
- Players only see their own position/role/items via `getPlayerView()`
- Host view exposes all player positions for spectator display via `getHostView()`
- Ghost tokens (tracking guesses) are client-side only
- Spectators (dead aliens, escaped humans, ended game) get full visibility
- Tutorial mode provides movement hints for new players

### WebSocket Message Protocol
Key message types (client → server):
- `CREATE_ROOM`, `JOIN_ROOM`, `START_GAME` - Room management
- `MOVE_PLAYER`, `MOVE_AND_ATTACK`, `ATTACK_IN_PLACE` - Movement/combat
- `DECLARE_NOISE`, `DECLARE_SECOND_NOISE` - Noise declarations
- `USE_ITEM`, `USE_POWER`, `USE_ESCAPE_HATCH` - Actions
- `HOST_JOIN_AS_PLAYER`, `ADD_BOT`, `KICK_PLAYER` - Lobby management

Key message types (server → client):
- `GAME_STATE_UPDATE` - Full game state (handled separately from `lastMessage`)
- `ROOM_CREATED`, `ROOM_JOINED` - Room events
- `CARD_DRAWN` - Private card info sent only to the drawing player
- `GLOBAL_POPUP` - Broadcast events (kills, escapes, mutations, game end)
