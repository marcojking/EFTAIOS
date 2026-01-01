# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Digital LAN multiplayer version of the board game "Escape from the Aliens in Outer Space" (Ultimate Edition). Features real-time WebSocket communication between a host/spectator screen and player devices.

## Commands

```bash
# Install all dependencies (root + client)
npm run install-all

# Start both server and client concurrently
npm run dev

# Start server only (port 3001)
npm run server

# Start client only (React dev server)
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
- `server/game/RoomManager.js`: Manages multiple concurrent game rooms
- Each room has a unique code (e.g., "ABCD") that players use to join
- WebSocket messages: `CREATE_ROOM`, `JOIN_ROOM`, `START_GAME`
- Clients track room state via `lastMessage` events (`ROOM_CREATED`, `ROOM_JOINED`)

### Game State Flow
1. Host creates room via `CREATE_ROOM` → receives `roomCode`
2. Players join via `JOIN_ROOM` with name and room code
3. Host starts game with `START_GAME` (includes map data)
4. Game proceeds through player turns with `MOVE_PLAYER`, `ATTACK`, `DECLARE_NOISE`, `USE_ITEM` messages
5. Server broadcasts state updates to room via `broadcastGameState(roomCode)`

### Key Server Files
- `server/game/GameState.js`: Core game logic class - turn management, movement validation, combat, item usage, character powers
- `server/game/cards.js`: Card deck definitions (78 Dangerous Sector cards, 6 Escape Hatch cards)
- `server/game/characters.js`: 16 characters (8 human, 8 alien) with unique powers
- `server/game/mapUtils.js`: Hex grid utilities for movement validation

### Key Client Components
- `client/src/App.js`: Main component managing screens (landing → lobby → game)
- `client/src/components/GameBoard.js`: Main game view with hex grid
- `client/src/components/HexGrid.js`: Hex map rendering with zoom/pan
- `client/src/hooks/useWebSocket.js`: WebSocket connection hook with auto-reconnect and message queuing

### Game Rules Implementation
- Humans: Move 1 sector, try to reach escape hatches
- Aliens: Move 1-2 sectors (3 after feeding/killing a human)
- Dangerous sectors trigger card draws requiring noise declarations
- Items come embedded on Silence cards (Ultimate Edition rules)
- Character powers tracked in `player.powerUsage` object
- Pending actions (e.g., noise declaration after move) stored in `gameState.pendingAction`

### State Visibility
The server maintains information hiding:
- Players only see their own position/role/items via `getPlayerView()`
- Host view exposes all player positions for spectator display via `getHostView()`
- Ghost tokens (tracking guesses) are client-side only
