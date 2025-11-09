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

// === Retrieve blob from aggregator ===
async function fetchWalrusBlob(blobId) {
  try {
    console.log(`🔍 Fetching blob from Walrus: ${blobId}`);
    const res = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`);
    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Failed to fetch blob:", res.status, errorText);
      throw new Error(`Failed to fetch blob: ${res.status}`);
    }
    const blobData = await res.json();
    console.log("✅ Retrieved blob from Walrus:", blobData);
    return blobData;
  } catch (err) {
    console.error("❌ Error fetching blob:", err);
    return null;
  }
}

// === Helper: Display Walrus output in console ===
function displayWalrusOutput(gameResult, blobId, aggregatorUrl) {
  console.log('\n' + '='.repeat(60));
  console.log('📦 WALRUS UPLOAD OUTPUT');
  console.log('='.repeat(60));
  console.log('\n📤 Uploaded Data:');
  console.log(JSON.stringify(gameResult, null, 2));
  console.log('\n🔑 Blob ID:', blobId);
  console.log('🌐 Aggregator URL:', aggregatorUrl);
  console.log('\n💡 To view the data:');
  console.log(`   Visit: ${aggregatorUrl}`);
  console.log(`   Or fetch programmatically: fetch("${aggregatorUrl}")`);
  console.log('='.repeat(60) + '\n');
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
    let sentCount = 0;
    this.players.forEach((player) => {
      if (player.ws.readyState === OPEN) {
        try {
          player.ws.send(msg);
          sentCount++;
          console.log(`📤 Sent to player ${player.playerNumber}:`, message.type);
        } catch (error) {
          console.error(`❌ Error sending to player ${player.playerNumber}:`, error);
        }
      } else {
        console.warn(`⚠️ Player ${player.playerNumber} WebSocket not open (state: ${player.ws.readyState})`);
      }
    });
    console.log(`📡 Broadcast complete: ${sentCount}/${this.players.size} players`);
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

    else if (data.type === 'WORD_FOUND') {
      // Handle word found - update scores and broadcast to all players
      console.log('📥 ========== WORD_FOUND RECEIVED ==========');
      console.log('📥 Player ID:', playerId);
      console.log('📥 Full data:', JSON.stringify(data, null, 2));
      console.log('📥 Current room:', currentRoom ? currentRoom.roomCode : 'NONE');
      
      if (!currentRoom) {
        console.error('❌ WORD_FOUND: Player not in a room');
        sendError(ws, 'Not in a room');
        return;
      }

      const playerNumber = currentRoom.players.get(playerId)?.playerNumber;
      console.log('📥 Player number lookup:', {
        playerId,
        playerNumber,
        roomPlayers: Array.from(currentRoom.players.entries()).map(([id, p]) => ({ id, number: p.playerNumber }))
      });
      
      if (!playerNumber) {
        console.error('❌ WORD_FOUND: Player not found in room. PlayerId:', playerId, 'Room players:', Array.from(currentRoom.players.keys()));
        sendError(ws, 'Player not found in room');
        return;
      }

      console.log(`✅ WORD_FOUND: Player ${playerNumber} found word index ${data.wordIndex}`);

      // Validate word finding
      if (typeof data.wordIndex === 'undefined') {
        console.error('❌ WORD_FOUND: Invalid wordIndex in data:', data);
        sendError(ws, 'Invalid word found data');
        return;
      }

      const { wordIndex } = data;
      const gameState = currentRoom.gameState;

      // Check if this player has already found this word (prevent duplicate scoring)
      if (gameState.playerFoundWords[playerNumber].has(wordIndex)) {
        console.log(`Player ${playerNumber} already found word ${wordIndex}, ignoring duplicate`);
        return; // Player already found this word, ignore
      }

      // Initialize scores if not set
      if (typeof gameState.playerScores[1] === 'undefined') gameState.playerScores[1] = 0;
      if (typeof gameState.playerScores[2] === 'undefined') gameState.playerScores[2] = 0;

      // Store old scores for logging
      const oldP1Score = gameState.playerScores[1] || 0;
      const oldP2Score = gameState.playerScores[2] || 0;

      // Update game state - both players can find the same word and get points
      gameState.playerFoundWords[playerNumber].add(wordIndex);
      gameState.playerScores[playerNumber] = (gameState.playerScores[playerNumber] || 0) + 1;
      
      // Add to global foundWords set if not already there (for level completion tracking)
      if (!gameState.foundWords.has(wordIndex)) {
        gameState.foundWords.add(wordIndex);
      }

      const p1Score = gameState.playerScores[1] || 0;
      const p2Score = gameState.playerScores[2] || 0;
      
      console.log(`✅ Player ${playerNumber} found word ${wordIndex}.`);
      console.log(`   Score change: P${playerNumber} ${oldP1Score}→${p1Score} (P1), ${oldP2Score}→${p2Score} (P2)`);
      console.log(`   Current scores: P1=${p1Score}, P2=${p2Score}`);

      // Broadcast word found to ALL players with updated scores
      // This ensures both players see the score update simultaneously
      const broadcastData = {
        type: 'WORD_FOUND',
        playerId,
        playerNumber,
        wordIndex,
        playerScores: {
          1: p1Score,
          2: p2Score
        },
        foundWordsCount: gameState.foundWords.size,
        totalWords: gameState.words.length
      };
      
      console.log('📤 ========== BROADCASTING WORD_FOUND ==========');
      console.log('📤 Broadcast data:', JSON.stringify(broadcastData, null, 2));
      console.log('📤 Room code:', currentRoom.roomCode);
      console.log('📤 Number of players in room:', currentRoom.players.size);
      console.log('📤 Player details:', Array.from(currentRoom.players.entries()).map(([id, p]) => ({
        playerId: id,
        playerNumber: p.playerNumber,
        wsReadyState: p.ws.readyState
      })));
      
      // Broadcast to ALL players in the room simultaneously
      currentRoom.broadcast(broadcastData);
      
      console.log('📤 ========== BROADCAST COMPLETE ==========');

      // Check if all words found (for level completion)
      const allWordsFound = gameState.foundWords.size === gameState.words.length;
      if (allWordsFound) {
        console.log(`🎉 All words found in room ${currentRoom.roomCode}`);
        // Level completion is handled by client-side checkWinCondition
      }
    }

    else if (data.type === 'GAME_OVER') {
      // GAME_OVER: upload final result to Walrus and broadcast
      if (!currentRoom) {
        sendError(ws, 'Not in a room - cannot end game');
        return;
      }

      // Get player wallet addresses if provided
      const player1Id = [...currentRoom.players.keys()][0];
      const player2Id = [...currentRoom.players.keys()][1];
      const player1Wallet = data.walletAddresses && data.walletAddresses[1] ? data.walletAddresses[1] : null;
      const player2Wallet = data.walletAddresses && data.walletAddresses[2] ? data.walletAddresses[2] : null;

      // Get final scores from gameState (most accurate) or from client data
      const finalScores = currentRoom.gameState ? currentRoom.gameState.playerScores : (data.playerScores || { 1: 0, 2: 0 });
      const player1Score = finalScores[1] || finalScores.player1 || 0;
      const player2Score = finalScores[2] || finalScores.player2 || 0;
      
      // Determine winner based on scores: highest score wins, tie if equal
      let winner = 0; // 0 = tie, 1 = player 1, 2 = player 2
      if (player1Score > player2Score) {
        winner = 1;
      } else if (player2Score > player1Score) {
        winner = 2;
      } else {
        winner = 0; // Tie
      }
      
      console.log(`🏆 Game Over - Final Scores: P1=${player1Score}, P2=${player2Score}, Winner: ${winner === 0 ? 'Tie' : 'Player ' + winner}`);

      // Build game result - wallet addresses are optional
      const gameResult = {
        roomCode: currentRoom.roomCode,
        timestamp: new Date().toISOString(),
        player1: currentRoom.players.get(player1Id)?.name || "Player 1",
        player2: currentRoom.players.get(player2Id)?.name || "Player 2",
        player1Wallet: player1Wallet || null, // Optional - can be null
        player2Wallet: player2Wallet || null, // Optional - can be null
        scores: {
          player1: player1Score,
          player2: player2Score
        },
        winner: winner, // 0 = tie, 1 = player 1, 2 = player 2
        blockchain: player1Wallet || player2Wallet ? 'Sui Testnet' : 'Friendly Mode (No Wallet)',
        walrusIntegration: !!(player1Wallet || player2Wallet) // Only true if at least one wallet connected
      };
      
      // Log wallet status
      if (!player1Wallet && !player2Wallet) {
        console.log('ℹ️ No wallets connected - playing in friendly mode');
      } else {
        console.log('✅ Wallet(s) connected - results will be stored on blockchain');
      }

      console.log("🏁 Uploading final result to Walrus:", gameResult);
      const claim = await claimToWalrus(gameResult);
      const blobId = claim?.newlyCreated?.blobObject?.blobId;
      const aggregatorUrl = blobId ? `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}` : null;

      // Display Walrus output in console
      if (blobId) {
        displayWalrusOutput(gameResult, blobId, aggregatorUrl);
        
        // Optionally fetch and display the blob content
        setTimeout(async () => {
          const blobData = await fetchWalrusBlob(blobId);
          if (blobData) {
            console.log('📥 Retrieved blob content from aggregator:', blobData);
          }
        }, 1000);
      }

      // Broadcast game over with correct winner and scores to ALL players
      currentRoom.broadcast({
        type: 'GAME_OVER',
        playerScores: {
          1: player1Score,
          2: player2Score
        },
        winner: winner, // 0 = tie, 1 = player 1, 2 = player 2
        walrus: {
          uploaded: !!blobId,
          blobId: blobId,
          aggregatorUrl: aggregatorUrl
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
