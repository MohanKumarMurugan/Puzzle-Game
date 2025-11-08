/**
 * WebSocket Server for Find Words Multiplayer Game
 * Handles real-time game synchronization between multiple players
 */
// === WALRUS IMPORTS & SETUP ===
require('dotenv').config();
const http = require('http'); // For HTTP requests
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // Serve static files
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
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

// ✅ Define the OPEN constant for socket state checking
const OPEN = WebSocket.OPEN;

// Upload JSON data to Walrus Publisher
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

// (Optional) Retrieve blob from aggregator
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

// Game rooms storage
const rooms = new Map();

// Generate unique room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Game state structure
class GameRoom {
    constructor(roomCode, hostId) {
        this.roomCode = roomCode;
        this.hostId = hostId;
        this.players = new Map(); // playerId -> { ws, playerNumber, name }
        this.gameState = {
            grid: [],
            words: [],
            foundWords: new Set(),
            playerScores: { 1: 0, 2: 0 },
            playerFoundWords: { 1: new Set(), 2: new Set() },
            currentPlayer: 1,
            gameStarted: false,
            gridSize: 15,
            mode: 'random',
            difficulty: 'medium',
            customWords: []
        };
        this.gameConfig = null; // Stores game configuration
    }

    addPlayer(playerId, ws, playerName) {
        if (this.players.size >= 2) {
            return false; // Room is full
        }
        
        const playerNumber = this.players.size + 1;
        this.players.set(playerId, {
            ws,
            playerNumber,
            name: playerName || `Player ${playerNumber}`
        });
        
        return true;
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
    }

    broadcast(message, excludePlayerId = null) {
        const data = JSON.stringify(message);
        this.players.forEach((player, id) => {
            if (id !== excludePlayerId && player.ws.readyState === OPEN) {
                player.ws.send(data);
            }
        });
    }

    getPlayerNumber(playerId) {
        const player = this.players.get(playerId);
        return player ? player.playerNumber : null;
    }
}

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    let playerId = null;
    let currentRoom = null;

    ws.on('message', (message) => {
        try {
            const rawMessage = message.toString();
            console.log('Raw message received:', rawMessage.substring(0, 200)); // Log first 200 chars
            const data = JSON.parse(rawMessage);
            console.log('Parsed message type:', data.type);
            handleMessage(ws, data);
        } catch (error) {
            console.error('Error parsing message:', error);
            console.error('Message that failed:', message.toString().substring(0, 500));
            sendError(ws, 'Invalid message format: ' + error.message);
        }
    });

    ws.on('close', () => {
        if (playerId && currentRoom) {
            handlePlayerDisconnect(currentRoom, playerId);
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    function handleMessage(ws, data) {
        switch (data.type) {
            case 'CREATE_ROOM':
                handleCreateRoom(ws, data);
                break;
            case 'JOIN_ROOM':
                handleJoinRoom(ws, data);
                break;
            case 'GAME_CONFIG':
                handleGameConfig(ws, data);
                break;
            case 'START_GAME':
                handleStartGame(ws, data);
                break;
            case 'WORD_FOUND':
                handleWordFound(ws, data);
                break;
            case 'NEW_GAME':
                handleNewGame(ws, data);
                break;
            case 'PLAYER_ACTION':
                handlePlayerAction(ws, data);
                break;
            case 'LEVEL_COMPLETE':
                // Client notifies server of level completion (handled in handleWordFound)
                break;
            case 'PLAYER_LEVEL_COMPLETE':
                // Player completed their level independently
                handlePlayerLevelComplete(ws, data);
                break;
            case 'GAME_OVER':
                // Client notifies server of game over (handled in handleWordFound or handleLevelTimeUp)
                break;
            default:
                sendError(ws, 'Unknown message type');
        }
    }

    function handleCreateRoom(ws, data) {
        console.log('=== handleCreateRoom called ===');
        console.log('Received data:', data);
        
        const roomCode = generateRoomCode();
        console.log('Generated room code:', roomCode);
        
        playerId = data.playerId || `player_${Date.now()}_${Math.random()}`;
        console.log('Using playerId:', playerId);
        
        const room = new GameRoom(roomCode, playerId);
        
        const added = room.addPlayer(playerId, ws, data.playerName);
        if (!added) {
            console.error('Failed to add player to room');
            sendError(ws, 'Failed to create room - room is full');
            return;
        }
        
        rooms.set(roomCode, room);
        currentRoom = room;

        const response = {
            type: 'ROOM_CREATED',
            roomCode: roomCode,
            playerId: playerId,
            playerNumber: 1
        };
        
        console.log('Sending ROOM_CREATED response:', response);
        
        try {
            ws.send(JSON.stringify(response));
            console.log(`✓ Room ${roomCode} created successfully by player ${playerId}`);
        } catch (error) {
            console.error('✗ Error sending ROOM_CREATED:', error);
            sendError(ws, 'Error creating room: ' + error.message);
        }
    }

    function handleJoinRoom(ws, data) {
        const { roomCode } = data;
        if (!roomCode) {
            sendError(ws, 'Room code is required');
            return;
        }
        // Normalize room code to uppercase for case-insensitive matching
        const normalizedRoomCode = roomCode.toUpperCase();
        const room = rooms.get(normalizedRoomCode);

        if (!room) {
            sendError(ws, 'Room not found');
            return;
        }

        if (room.players.size >= 2) {
            sendError(ws, 'Room is full');
            return;
        }

        playerId = data.playerId || `player_${Date.now()}_${Math.random()}`;
        const added = room.addPlayer(playerId, ws, data.playerName);
        
        if (!added) {
            sendError(ws, 'Failed to join room');
            return;
        }

        currentRoom = room;
        const playerNumber = room.getPlayerNumber(playerId);

        // Convert Sets to Arrays for JSON serialization
        const gameStateForClient = room.gameState.gameStarted ? {
            ...room.gameState,
            foundWords: Array.from(room.gameState.foundWords),
            playerFoundWords: {
                1: Array.from(room.gameState.playerFoundWords[1]),
                2: Array.from(room.gameState.playerFoundWords[2])
            }
        } : null;

        // Send join confirmation to new player
        ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            roomCode: normalizedRoomCode,
            playerId,
            playerNumber,
            gameState: gameStateForClient,
            gameConfig: room.gameConfig
        }));

        // Notify other players
        room.broadcast({
            type: 'PLAYER_JOINED',
            playerId,
            playerNumber,
            playerName: data.playerName || `Player ${playerNumber}`
        }, playerId);

        console.log(`Player ${playerId} joined room ${normalizedRoomCode} as player ${playerNumber}`);
    }

    function handleGameConfig(ws, data) {
        if (!currentRoom || currentRoom.hostId !== playerId) {
            sendError(ws, 'Only the host can configure the game');
            return;
        }

        currentRoom.gameConfig = data.config;
        currentRoom.broadcast({
            type: 'GAME_CONFIG_UPDATED',
            config: data.config
        }, playerId);

        ws.send(JSON.stringify({
            type: 'GAME_CONFIG_SAVED',
            config: data.config
        }));
    }

    function handleStartGame(ws, data) {
        if (!currentRoom || currentRoom.hostId !== playerId) {
            sendError(ws, 'Only the host can start the game');
            return;
        }

        if (currentRoom.players.size < 2) {
            sendError(ws, 'Need at least 2 players to start');
            return;
        }

        // Simplified validation with clear error messages
        console.log('=== handleStartGame ===');
        console.log('Data received. Type:', data ? data.type : 'null');
        
        if (!data) {
            console.error('✗ No data received');
            sendError(ws, 'No data received from client');
            return;
        }
        
        if (!data.gameState) {
            console.error('✗ gameState missing. Data keys:', Object.keys(data));
            sendError(ws, 'Missing gameState. Please click "New Game" first, then "Start Game"');
            return;
        }
        
        // Check words with detailed logging
        const words = data.gameState.words;
        console.log('Words check:', {
            exists: !!words,
            type: typeof words,
            isArray: Array.isArray(words),
            length: words ? (Array.isArray(words) ? words.length : 'not array') : 'null/undefined'
        });
        
        if (!words) {
            console.error('✗ words is null/undefined');
            sendError(ws, 'Words are missing. Please click "New Game" to generate puzzle first');
            return;
        }
        
        if (!Array.isArray(words)) {
            console.error('✗ words is not an array. Type:', typeof words, 'Value:', words);
            sendError(ws, 'Words must be an array. Please refresh and try again');
            return;
        }
        
        if (words.length === 0) {
            console.error('✗ words array is empty');
            sendError(ws, 'Words array is empty. Please click "New Game" to generate puzzle first');
            return;
        }
        
        console.log('✓ Validation passed! Words:', words.length, 'items');

        // Initialize game state from config (store words and grid so both players see the same puzzle)
        const currentLevel = data.gameState.currentLevel || 1;
        currentRoom.gameState = {
            words: data.gameState.words, // Same words for all players
            grid: data.gameState.grid || [], // Same grid for all players
            foundWords: new Set(),
            playerScores: data.gameState.playerScores || { 1: 0, 2: 0 }, // Keep scores across levels
            playerFoundWords: { 1: new Set(), 2: new Set() },
            currentPlayer: 1,
            gameStarted: true,
            gridSize: data.gameState.gridSize || 15,
            mode: data.gameState.mode || 'random',
            difficulty: data.gameState.difficulty || 'medium',
            customWords: data.gameState.customWords || [],
            currentLevel: currentLevel
        };
        
        // Set synchronized timer start time (only on first level, continue for subsequent levels)
        if (!currentRoom.levelStartTime || currentLevel === 1) {
            // First level or reset - start the timer
            const levelStartTime = Date.now();
            currentRoom.levelStartTime = levelStartTime;
            // Clear existing timer if any
            if (currentRoom.levelTimer) {
                clearTimeout(currentRoom.levelTimer);
            }
            currentRoom.levelTimer = setTimeout(() => {
                handleLevelTimeUp(currentRoom);
            }, 120000); // 2 minutes = 120000ms total for all levels
            console.log('Timer started for level', currentLevel);
        } else {
            // Subsequent level - timer continues, don't reset
            console.log('Timer continuing for level', currentLevel, '(cumulative, started at', new Date(currentRoom.levelStartTime).toLocaleTimeString(), ')');
        }
        
        const levelStartTime = currentRoom.levelStartTime || Date.now();
        
        // Send game config to each player (including the grid so both players see the same puzzle)
        // IMPORTANT: Send to ALL players including the host
        const playersList = Array.from(currentRoom.players.entries());
        console.log(`Sending GAME_STARTED to ${playersList.length} players (including host)`);
        
        playersList.forEach(([id, player]) => {
            const gameConfig = {
                words: data.gameState.words,
                grid: data.gameState.grid || [], // Include grid so both players see the same puzzle
                gridSize: data.gameState.gridSize || 15,
                mode: data.gameState.mode || 'random',
                difficulty: data.gameState.difficulty || 'medium',
                customWords: data.gameState.customWords || [],
                currentLevel: currentLevel,
                playerScores: data.gameState.playerScores || { 1: 0, 2: 0 },
                foundWords: [],
                playerFoundWords: { 1: [], 2: [] },
                currentPlayer: 1,
                gameStarted: true
            };

            if (player.ws.readyState === OPEN) {
                const message = {
                    type: 'GAME_STARTED',
                    gameConfig: gameConfig, // Send config with grid so both players see the same puzzle
                    levelStartTime: currentRoom.levelStartTime || levelStartTime, // Use existing start time if available (cumulative)
                    currentLevel: currentLevel
                };
                
                console.log(`✓ Sending GAME_STARTED to player ${id} (Player ${player.playerNumber}, Host: ${id === currentRoom.hostId})`);
                try {
                    player.ws.send(JSON.stringify(message));
                    console.log(`  ✓ Message sent successfully to Player ${player.playerNumber}`);
                } catch (error) {
                    console.error(`  ✗ Error sending to Player ${player.playerNumber}:`, error);
                }
            } else {
                console.error(`✗ Player ${id} (Player ${player.playerNumber}) WebSocket not open. State: ${player.ws.readyState}`);
            }
        });

        console.log(`Game started in room ${currentRoom.roomCode}, Level ${currentLevel} - Both players will see the same puzzle`);
    }

    function handleWordFound(ws, data) {
        if (!currentRoom) {
            sendError(ws, 'Not in a room');
            return;
        }

        const playerNumber = currentRoom.getPlayerNumber(playerId);
        if (!playerNumber) {
            sendError(ws, 'Player not found in room');
            return;
        }

        // Validate word finding
        if (typeof data.wordIndex === 'undefined' || !Array.isArray(data.cells)) {
            sendError(ws, 'Invalid word found data');
            return;
        }

        const { wordIndex, cells } = data;
        const gameState = currentRoom.gameState;

        // Check if this player has already found this word (prevent duplicate scoring)
        if (gameState.playerFoundWords[playerNumber].has(wordIndex)) {
            return; // Player already found this word, ignore
        }

        // Update game state - both players can find the same word and get points
        gameState.playerFoundWords[playerNumber].add(wordIndex);
        gameState.playerScores[playerNumber]++;
        
        // Add to global foundWords set if not already there (for level completion tracking)
        // Level completes when all unique words have been found by at least one player
        if (!gameState.foundWords.has(wordIndex)) {
            gameState.foundWords.add(wordIndex);
        }

        // Mark cells as found (for reference, but each player has their own grid)
        cells.forEach(({ row, col }) => {
            if (gameState.grid[row] && gameState.grid[row][col]) {
                gameState.grid[row][col].found = true;
            }
        });

        // No turn switching - both players play simultaneously
        // currentPlayer is kept for compatibility but not used for turn restrictions

        // Check level completion (all unique words found by at least one player)
        const allWordsFound = gameState.foundWords.size === gameState.words.length;
        
        // Broadcast word found to all players
        // Note: Each player has their own puzzle, so cells array is for reference only
        currentRoom.broadcast({
            type: 'WORD_FOUND',
            playerId,
            playerNumber,
            wordIndex,
            cells,
            playerScores: gameState.playerScores,
            foundWordsCount: gameState.foundWords.size,
            totalWords: gameState.words.length,
            levelComplete: allWordsFound
        });

        // If level completed, advance to next level or end game
        if (allWordsFound) {
            const currentLevel = gameState.currentLevel || 1;
            if (currentLevel < 3) {
                // Advance to next level
                handleLevelComplete(currentRoom, currentLevel);
            } else {
                // All levels completed - end game
                handleGameOver(currentRoom);
            }
        }
    }

    function handleNewGame(ws, data) {
        if (!currentRoom || currentRoom.hostId !== playerId) {
            sendError(ws, 'Only the host can start a new game');
            return;
        }

        // Improved validation with detailed error messages
        if (!data || !data.gameState) {
            sendError(ws, 'Missing game state data. Please click "New Game" first.');
            return;
        }

        // Check words - this is required
        if (!data.gameState.words) {
            sendError(ws, 'Words are missing. Please click "New Game" to generate puzzle first.');
            return;
        }

        if (!Array.isArray(data.gameState.words)) {
            sendError(ws, 'Words must be an array. Please refresh and try again.');
            return;
        }

        if (data.gameState.words.length === 0) {
            sendError(ws, 'Words array is empty. Please click "New Game" to generate puzzle first.');
            return;
        }

        // Grid is optional in new architecture (each player generates their own)
        // But we'll still validate it if provided
        if (data.gameState.grid && !Array.isArray(data.gameState.grid)) {
            sendError(ws, 'Grid must be an array. Please refresh and try again.');
            return;
        }

        // Reset game state
        // Note: grid is optional since each player generates their own puzzle
        currentRoom.gameState = {
            grid: data.gameState.grid || [], // Optional - each player has their own grid
            words: data.gameState.words, // Required - same words for all players
            foundWords: new Set(),
            playerScores: data.gameState.playerScores || { 1: 0, 2: 0 },
            playerFoundWords: { 1: new Set(), 2: new Set() },
            currentPlayer: 1,
            gameStarted: false,
            gridSize: data.gameState.gridSize || 15,
            mode: data.gameState.mode || 'random',
            difficulty: data.gameState.difficulty || 'medium',
            customWords: data.gameState.customWords || [],
            currentLevel: data.gameState.currentLevel || 1
        };

        // Convert Sets to Arrays for broadcasting
        const newGameStateForBroadcast = {
            ...currentRoom.gameState,
            foundWords: Array.from(currentRoom.gameState.foundWords),
            playerFoundWords: {
                1: Array.from(currentRoom.gameState.playerFoundWords[1]),
                2: Array.from(currentRoom.gameState.playerFoundWords[2])
            }
        };

        currentRoom.broadcast({
            type: 'NEW_GAME_STARTED',
            gameState: newGameStateForBroadcast
        });
    }

    function handlePlayerAction(ws, data) {
        if (!currentRoom) return;

        // Broadcast player actions (like selection) to other players
        currentRoom.broadcast({
            type: 'PLAYER_ACTION',
            playerId,
            playerNumber: currentRoom.getPlayerNumber(playerId),
            action: data.action
        }, playerId);
    }

    function handlePlayerDisconnect(room, disconnectedPlayerId) {
        const player = room.players.get(disconnectedPlayerId);
        if (player) {
            room.removePlayer(disconnectedPlayerId);
            
            // Notify other players
            room.broadcast({
                type: 'PLAYER_DISCONNECTED',
                playerId: disconnectedPlayerId,
                playerNumber: player.playerNumber
            });

            // If host disconnected, close room or transfer host
            if (room.hostId === disconnectedPlayerId && room.players.size > 0) {
                // Transfer host to first remaining player
                const remainingPlayers = Array.from(room.players.keys());
                room.hostId = remainingPlayers[0];
                room.broadcast({
                    type: 'HOST_CHANGED',
                    newHostId: room.hostId
                });
            }

            // Clean up empty rooms
            if (room.players.size === 0) {
                rooms.delete(room.roomCode);
                console.log(`Room ${room.roomCode} closed (empty)`);
            }

            console.log(`Player ${disconnectedPlayerId} disconnected from room ${room.roomCode}`);
        }
    }

    function handleLevelComplete(room, completedLevel) {
        // Clear timer
        if (room.levelTimer) {
            clearTimeout(room.levelTimer);
        }
        
        const nextLevel = completedLevel + 1;
        
        // Broadcast level completion
        room.broadcast({
            type: 'LEVEL_COMPLETE',
            currentLevel: completedLevel,
            nextLevel: nextLevel,
            playerScores: room.gameState.playerScores
        });
        
        console.log(`Level ${completedLevel} completed in room ${room.roomCode}, advancing to level ${nextLevel}`);
    }

    function handlePlayerLevelComplete(ws, data) {
        if (!currentRoom) {
            sendError(ws, 'Not in a room');
            return;
        }

        const { playerNumber, completedLevel, nextLevel, playerScores } = data;
        
        // Update player scores
        if (playerScores) {
            currentRoom.gameState.playerScores = playerScores;
        }
        
        // Broadcast player level completion to all players (for score updates)
        // Note: Each player advances independently, so we just update scores
        currentRoom.broadcast({
            type: 'PLAYER_LEVEL_COMPLETE',
            playerNumber: playerNumber,
            completedLevel: completedLevel,
            nextLevel: nextLevel,
            playerScores: currentRoom.gameState.playerScores
        });
        
        console.log(`Player ${playerNumber} completed level ${completedLevel} in room ${currentRoom.roomCode}, advancing to level ${nextLevel}`);
    }

    function handleLevelTimeUp(room) {
        // Clear timer
        if (room.levelTimer) {
            clearTimeout(room.levelTimer);
        }
        
        // Timer ended - immediately end the game for all players
        // Don't advance to next level, game is over
        handleGameOver(room);
    }

    async function handleGameOver(room) {
    // Clear timer
    if (room.levelTimer) {
        clearTimeout(room.levelTimer);
    }

    // Determine winner
    const player1Score = room.gameState.playerScores[1];
    const player2Score = room.gameState.playerScores[2];

    let winner = 0; // 0 = tie, 1 = player 1, 2 = player 2
    if (player1Score > player2Score) {
        winner = 1;
    } else if (player2Score > player1Score) {
        winner = 2;
    }

    // Prepare data to upload to Walrus
    const gameResult = {
        roomCode: room.roomCode,
        timestamp: new Date().toISOString(),
        player1: room.players.get([...room.players.keys()][0])?.name || "Player 1",
        player2: room.players.get([...room.players.keys()][1])?.name || "Player 2",
        scores: { player1: player1Score, player2: player2Score },
        winner: winner === 0 ? "Tie" : `Player ${winner}`,
    };

    console.log("🏁 Uploading final result to Walrus:", gameResult);

    // Upload to Walrus
    const claim = await claimToWalrus(gameResult);
    let blobId = null;
    if (claim && claim.newlyCreated && claim.newlyCreated.blobObject) {
        blobId = claim.newlyCreated.blobObject.blobId;
    }

    // Broadcast game over + Walrus claim info
    room.broadcast({
        type: 'GAME_OVER',
        playerScores: room.gameState.playerScores,
        winner: winner,
        walrus: {
            uploaded: !!blobId,
            blobId: blobId,
            aggregatorUrl: blobId ? `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}` : null
        }
    });

    console.log(`🎉 Game over in room ${room.roomCode}. Winner: ${winner || 'Tie'}`);
    if (blobId) console.log(`📦 Walrus Blob ID: ${blobId}`);
 }


    function sendError(ws, message) {
        if (ws.readyState === OPEN) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                message
            }));
        }
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open in browser: http://localhost:${PORT}`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});

