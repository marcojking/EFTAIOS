# EFTAIOS Digital - Escape from the Aliens in Outer Space

A digital LAN version of the board game "Escape from the Aliens in Outer Space" (Ultimate Edition).

## Features

- **LAN Multiplayer**: Host connects and shows all positions for spectators; players connect from phones/computers
- **Ghost Token Tracking**: Players can place tokens to track where they think other players are
- **Real-time WebSocket Communication**: Instant updates across all connected devices
- **Hex Grid Map**: Full Galilei map with zoom and pan controls
- **Ultimate Edition Support**: All 16 characters with special powers, 10 item types, 78 Dangerous Sector cards

## Setup

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

1. Install server dependencies:
```bash
npm install
```

2. Install client dependencies:
```bash
cd client
npm install
cd ..
```

Or use the convenience script:
```bash
npm run install-all
```

### Running the Game

**Start both server and client:**
```bash
npm run dev
```

Or run them separately:

**Server only:**
```bash
npm run server
```

**Client only (in another terminal):**
```bash
npm run client
```

The server will display its LAN address (e.g., `http://192.168.1.100:3001`).

## LAN Setup & Troubleshooting

### For the Host Computer

1. **Find your LAN IP**: Open Command Prompt and run `ipconfig`. Look for "IPv4 Address" under your active network adapter (usually starts with `192.168.` or `10.`)

2. **Allow through Windows Firewall**: 
   - Windows may prompt you when you first run `npm run server` - click "Allow access"
   - If it was blocked: Go to Windows Security → Firewall & network protection → Allow an app through firewall → Find or add `node.exe`
   - Alternative: Temporarily disable firewall to test if that's the issue

3. **Server shows LAN address**: When the server starts, it displays something like:
   ```
   EFTAIOS Server running on port 3001
   LAN address: http://192.168.1.100:3001
   ```
   Players should use this IP address to connect.

### For Players Joining

1. Enter the host's **LAN IP address and port** (e.g., `192.168.1.100:3001`)
2. Make sure you're on the **same WiFi network** as the host
3. If using a phone: **Disable mobile data** to ensure WiFi is used
4. Don't include `http://` or `ws://` - just the IP and port

### Common Issues

| Issue | Solution |
|-------|----------|
| "Connection refused" | Check Windows Firewall settings, ensure server is running |
| Works locally but not from other devices | Firewall is blocking - run `npm run server` and allow when prompted |
| Connection timeout | Wrong IP address, different networks, or firewall blocking |
| "localhost:3001" works but LAN IP doesn't | Firewall issue - Node.js needs network access permission |

### Quick Firewall Fix (Windows)

Open PowerShell as Administrator and run:
```powershell
netsh advfirewall firewall add rule name="EFTAIOS Server" dir=in action=allow protocol=TCP localport=3001
```

## How to Play

### Host/Spectator

1. Open the game in a browser
2. Select "Host / Spectator"
3. Enter the server address (default: `localhost:3001`)
4. Enter your name and create the lobby
5. Wait for players to join
6. Start the game when ready
7. The host screen shows ALL player positions (for spectators watching on a big screen)

### Players

1. Open the game on your phone or computer
2. Select "Player"
3. Enter the server's LAN address (e.g., `192.168.1.100:3001`)
4. Enter your name
5. Wait in the lobby for the host to start the game

### Ghost Token System

Each player can track where they think other players are:

1. Click on a player token in the **Player Token Bank** at the top
2. Click any hex on the map to place that player's ghost there
3. Click the "ON MAP ×" badge to remove a ghost token
4. Ghost tokens are private to each player's screen

### Game Rules

- **Humans**: Move 1 sector per turn, try to reach escape hatches
- **Aliens**: Move 1-2 sectors per turn (3 after feeding), try to catch humans
- **Dangerous Sectors**: Draw a card when you enter
  - **Noise in Your Sector**: Must announce your true location
  - **Noise in Any Sector**: Can lie about your location
  - **Silence**: Say "Silence in all sectors" (may include an item)
- **Items**: Only humans can use items (Aliens can collect them as decoys)
- **Escape Hatches**: Humans draw a card - green = escaped, red = damaged
- **Game End**: After 39 turns or when all humans escape/die

## Configuration

### Card Counts

Edit `server/game/cards.js` to adjust card distributions based on your physical game version.

The game supports two editions:
- **Original Edition** (`GAME_VERSION = 'original'`): Items are on Silence cards
- **Black Edition** (`GAME_VERSION = 'black_edition'`): Separate item deck

## Project Structure

```
30_CODE/
├── server/
│   ├── index.js           # WebSocket server
│   └── game/
│       ├── GameState.js   # Game logic
│       ├── cards.js       # Card definitions
│       ├── characters.js  # Character definitions
│       ├── mapUtils.js    # Hex grid utilities
│       └── maps/
│           └── galilei.js # Galilei map data
├── client/
│   ├── public/
│   └── src/
│       ├── App.js         # Main app component
│       ├── components/
│       │   ├── GameBoard.js
│       │   ├── HexGrid.js
│       │   ├── PlayerTokenBank.js
│       │   ├── GameLog.js
│       │   ├── PlayerHUD.js
│       │   ├── CardModal.js
│       │   └── Lobby.js
│       ├── hooks/
│       │   └── useWebSocket.js
│       └── data/
│           └── maps.js
└── package.json
```

## Credits

Based on "Escape from the Aliens in Outer Space" by Santa Ragione / Cranio Creations.
Game designers: Mario Porpora, Pietro Righi Riva, Luca Francesco Rossi, Nicol Tedeschi.
