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
```

## Architecture

### Client-Server Communication
- **Server** (`server/index.js`): Express + WebSocket server on port 3001
- **Client** (`client/`): React app using `useWebSocket` hook for real-time communication
- **Maps**: Galatea (default, compact) and Galilei (classic) available in `client/src/data/maps.js`
- Message types defined in `handleMessage()` switch statement in `server/index.js`
- Host sees all positions (`getHostView()`); players see only their own position (`getPlayerView()`)

### Game State Flow
1. Players join lobby via WebSocket `JOIN_LOBBY` message
2. Host creates game with `CREATE_GAME` (includes map data) then `START_GAME`
3. Game proceeds through player turns with `MOVE`, `ATTACK`, `DECLARE_NOISE`, `USE_ITEM` messages
4. Server broadcasts state updates to all clients via `broadcastGameState()`

### Key Server Files
- `server/game/GameState.js`: Core game logic class - turn management, movement validation, combat, item usage, character powers
- `server/game/cards.js`: Card deck definitions (78 Dangerous Sector cards, 6 Escape Hatch cards)
- `server/game/characters.js`: 16 characters (8 human, 8 alien) with unique powers
- `server/game/mapUtils.js`: Hex grid utilities for movement validation

### Key Client Components
- `client/src/App.js`: Main component managing screens (join → lobby → game)
- `client/src/components/GameBoard.js`: Main game view with hex grid
- `client/src/components/HexGrid.js`: Hex map rendering with zoom/pan
- `client/src/hooks/useWebSocket.js`: WebSocket connection hook with auto-reconnect

### Game Rules Implementation
- Humans: Move 1 sector, try to reach escape hatches
- Aliens: Move 1-2 sectors (3 after feeding/killing a human)
- Dangerous sectors trigger card draws requiring noise declarations
- Items come embedded on Silence cards (Ultimate Edition rules)
- Character powers tracked in `player.powerUsage` object

### State Visibility
The server maintains information hiding:
- Players only see their own position/role/items
- Host view exposes all player positions for spectator display
- Ghost tokens (tracking guesses) are client-side only
