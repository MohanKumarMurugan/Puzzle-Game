# Multiplayer Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the WebSocket Server

```bash
npm start
```

The server will run on `ws://localhost:3000` by default.

### 3. Open the Game

Open `index.html` in your web browser (or use a local server like Live Server in VS Code).

### 4. Play Multiplayer

1. Click **"Multiplayer (Online)"** button
2. **Host (Player 1)**: Click "Create Room" - you'll get a 6-character room code
3. **Player 2**: Enter the room code and click "Join Room"
4. Once both players are connected, the host can configure the game and click "New Game"
5. The host clicks "Start Game" to begin
6. Players take turns finding words - the game synchronizes in real-time!

## Features

- **Real-time synchronization**: Game state syncs between players instantly
- **Turn-based gameplay**: Players take turns finding words
- **Room system**: Create or join rooms with 6-character codes
- **Connection status**: Visual indicator shows connection state
- **Automatic reconnection**: Attempts to reconnect if connection is lost
- **Host controls**: Only the host can start new games

## Server Configuration

To change the server URL, edit `script.js`:

```javascript
this.wsServerUrl = 'ws://localhost:3000'; // Change this
```

For production, you'll need to:
1. Deploy the server to a hosting service
2. Update the WebSocket URL in `script.js` to point to your server
3. Use `wss://` (secure WebSocket) for HTTPS sites

## Troubleshooting

- **Can't connect**: Make sure the server is running (`npm start`)
- **Room not found**: Check that the room code is correct (6 characters, case-insensitive)
- **Game not starting**: Ensure both players are connected (should show "2/2" players)

