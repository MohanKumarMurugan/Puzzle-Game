/**
 * WebSocket Server for Find Words Multiplayer Game
 * Handles real-time game synchronization between multiple players
 */

// === WALRUS IMPORTS & SETUP ===
require('dotenv').config();
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// ✅ Walrus testnet endpoints (from .env or defaults)
const WALRUS_PUBLISHER_URL = process.env.PUBLISHER || "https://publisher.walrus-testnet.walrus.space";
const WALRUS_AGGREGATOR_URL = process.env.AGGREGATOR || "https://aggregator.walrus-testnet.walrus.space";

// ✅ Test Walrus connection on startup (non-404 version)
(async () => {
  try {
    const res = await fetch(`${WALRUS_PUBLISHER_URL}/v1/blobs`, { method: "OPTIONS" });
    if ([200, 204, 405].includes(res.status)) {
      console.log("🌐 Walrus Publisher reachable ✅");
    } else {
      console.log("⚠️ Walrus Publisher response:", res.status);
    }
  } catch (e) {
    console.log("❌ Unable to reach Walrus Publisher:", e.message);
  }
})();

// ✅ Create server that serves static files + WebSocket
const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './index.html';

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const wss = new WebSocket.Server({ server });
const OPEN = WebSocket.OPEN;

// === WALRUS UPLOAD FUNCTION ===
async function claimToWalrus(data) {
  try {
    const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/blobs`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: Buffer.from(JSON.stringify(data))
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Failed to upload to Walrus:", errorText);
      return null;
    }

    const result = await response.json();
    console.log("✅ Uploaded to Walrus:", result);
    return result;
  } catch (error) {
    console.error("❌ Walrus upload error:", error);
    return null;
  }
}

// === (Optional) Retrieve blob from aggregator ===
async function fetchWalrusBlob(blobId) {
  try {
    const res = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`);
    if (!res.ok) throw new Error("Failed to fetch blob");
    return await res.json();
  } catch (err) {
    console.error("Error fetching blob:", err);
    return null;
  }
}

// === GAME LOGIC ===
const rooms = new Map();

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

class GameRoom {
  constructor(roomCode, hostId) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.players = new Map();
    this.gameState = {
      grid: [],
      words: [],
      foundWords: new Set(),
      playerScores: { 1: 0, 2: 0 },
      playerFoundWords: { 1: new Set(), 2: new Set() },
      currentPlayer: 1,
      gameStarted: false,
      currentLevel: 1
    };
  }

  addPlayer(playerId, ws, name) {
    if (this.players.size >= 2) return false;
    const playerNumber = this.players.size + 1;
    this.players.set(playerId, { ws, playerNumber, name: name || `Player ${playerNumber}` });
    return true;
  }

  broadcast(message) {
    const msg = JSON.stringify(message);
    this.players.forEach((player) => {
      if (player.ws.readyState === OPEN) player.ws.send(msg);
    });
  }
}

// === WEBSOCKET HANDLER ===
wss.on('connection', (ws) => {
  let playerId = `p_${Date.now()}_${Math.random()}`;
  let currentRoom = null;

  ws.on('message', async (message) => {
    const data = JSON.parse(message.toString());

    if (data.type === 'CREATE_ROOM') {
      const roomCode = generateRoomCode();
      const room = new GameRoom(roomCode, playerId);
      room.addPlayer(playerId, ws, data.playerName);
      rooms.set(roomCode, room);
      currentRoom = room;

      ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomCode, playerId, playerNumber: 1 }));
      console.log(`Room ${roomCode} created by ${playerId}`);
    }

    else if (data.type === 'JOIN_ROOM') {
      const room = rooms.get(data.roomCode.toUpperCase());
      if (!room) return ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));

      room.addPlayer(playerId, ws, data.playerName);
      currentRoom = room;
      const playerNumber = room.players.size;
      ws.send(JSON.stringify({ type: 'ROOM_JOINED', roomCode: data.roomCode, playerNumber }));

      room.broadcast({ type: 'PLAYER_JOINED', playerId, playerNumber });
    }

    else if (data.type === 'START_GAME') {
      console.log('Received START_GAME request. connection playerId=', playerId, 'currentRoom=', currentRoom ? currentRoom.roomCode : null);

      // Recover playerId/roomCode if provided in payload
      if (!playerId && data && data.playerId) playerId = data.playerId;
      if (!currentRoom && data && data.roomCode) currentRoom = rooms.get(data.roomCode.toUpperCase());

      if (!currentRoom) {
        sendError(ws, 'Not in a room - cannot start the game');
        return;
      }

      if (currentRoom.hostId !== playerId) {
        sendError(ws, 'Only the host can start the game');
        console.warn('START_GAME rejected - requester is not host. requester=', playerId, 'host=', currentRoom.hostId);
        return;
      }

      // Validate payload
      if (!data || !data.gameState || !Array.isArray(data.gameState.words) || data.gameState.words.length === 0) {
        sendError(ws, 'Invalid gameState sent. Please generate words before starting the game');
        console.error('START_GAME validation failed. payload:', data);
        return;
      }

      // Initialize room game state similar to previous implementation
      const currentLevel = data.gameState.currentLevel || 1;
      currentRoom.gameState = {
        words: data.gameState.words,
        grid: data.gameState.grid || [],
        foundWords: new Set(),
        playerScores: data.gameState.playerScores || { 1: 0, 2: 0 },
        playerFoundWords: { 1: new Set(), 2: new Set() },
        currentPlayer: 1,
        gameStarted: true,
        gridSize: data.gameState.gridSize || 15,
        mode: data.gameState.mode || 'random',
        difficulty: data.gameState.difficulty || 'medium',
        customWords: data.gameState.customWords || [],
        currentLevel: currentLevel
      };

      // Start a synchronized timer for the room (simple 2-minute timeout as before)
      if (currentRoom.levelTimer) clearTimeout(currentRoom.levelTimer);
      currentRoom.levelStartTime = Date.now();
      currentRoom.levelTimer = setTimeout(() => {
        // broadcast time-up and end game
        currentRoom.broadcast({ type: 'TIME_UP' });
      }, 120000);

      // Broadcast GAME_STARTED to all players in room
      currentRoom.broadcast({
        type: 'GAME_STARTED',
        gameConfig: {
          words: currentRoom.gameState.words,
          grid: currentRoom.gameState.grid,
          gridSize: currentRoom.gameState.gridSize,
          mode: currentRoom.gameState.mode,
          difficulty: currentRoom.gameState.difficulty,
          currentLevel: currentRoom.gameState.currentLevel,
          playerScores: currentRoom.gameState.playerScores
        },
        levelStartTime: currentRoom.levelStartTime,
        currentLevel: currentRoom.gameState.currentLevel
      });

      console.log(`Game started in room ${currentRoom.roomCode} (level ${currentLevel})`);
    }

    else if (data.type === 'GAME_OVER') {
      // GAME_OVER: upload final result to Walrus and broadcast
      if (!currentRoom) {
        sendError(ws, 'Not in a room - cannot end game');
        return;
      }

      const gameResult = {
        roomCode: currentRoom.roomCode,
        timestamp: new Date().toISOString(),
        player1: currentRoom.players.get([...currentRoom.players.keys()][0])?.name || "Player 1",
        player2: currentRoom.players.get([...currentRoom.players.keys()][1])?.name || "Player 2",
        scores: currentRoom.gameState ? currentRoom.gameState.playerScores : { player1: 0, player2: 0 },
        winner: 'TBD'
      };

      console.log("🏁 Uploading final result to Walrus:", gameResult);
      const claim = await claimToWalrus(gameResult);
      const blobId = claim?.newlyCreated?.blobObject?.blobId;

      currentRoom.broadcast({
        type: 'GAME_OVER',
        playerScores: currentRoom.gameState ? currentRoom.gameState.playerScores : { 1: 0, 2: 0 },
        walrus: {
          uploaded: !!blobId,
          blobId: blobId,
          aggregatorUrl: blobId ? `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}` : null
        }
      });

      console.log(`🎉 Game over in room ${currentRoom.roomCode}. Walrus blob: ${blobId || 'none'}`);
    }
  });
});

// === START SERVER ===
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open in browser: http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});
