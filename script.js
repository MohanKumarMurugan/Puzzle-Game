/**
 * Find the Words Game
 * A word search puzzle game with random and custom modes
 */

class FindWordsGame {
    constructor() {
        this.grid = [];
        this.words = [];
        this.foundWords = new Set();
        this.gridSize = 15;
        this.isSelecting = false;
        this.selectedCells = [];
        this.startCell = null;
        this.currentMode = 'random';
        this.difficulty = 'medium';
        this.customWords = this.loadCustomWords();
        this.gameStartTime = null;
        this.timerInterval = null;
        this.hintedCells = [];
        this.hintCooldown = false;
        this.placedWords = []; // Store word positions for hints
        this.currentHintWordIndex = -1; // Track the current word being hinted
        this.gameStarted = false; // Track if game has started
        
        // Player mode properties
        this.playerMode = 'multiplayer'; // 'single', 'two', or 'multiplayer'
        this.currentPlayer = 1; // 1 or 2
        this.playerScores = { 1: 0, 2: 0 };
        this.playerFoundWords = { 1: new Set(), 2: new Set() };
        
        // Level system properties
        this.currentLevel = 1; // 1 = Easy, 2 = Medium, 3 = Hard
        this.levelDifficulties = ['easy', 'medium', 'hard'];
        this.levelTimeLimit = 120; // Total 2 minutes for all levels combined
        this.levelTimer = null; // Countdown timer
        this.levelStartTime = null; // Server-synchronized start time
        this.levelTimerInterval = null;
        this.totalGameTime = 0; // Track total time played
        this.playerLevels = { 1: 1, 2: 1 }; // Track each player's current level independently
        
        // Level configurations
        this.levelConfigs = {
            1: { gridSize: 10, wordCount: 7, difficulty: 'easy' },    // Easy
            2: { gridSize: 12, wordCount: 10, difficulty: 'medium' }, // Medium
            3: { gridSize: 15, wordCount: 15, difficulty: 'hard' }    // Hard
        };
        
        // Multiplayer WebSocket properties
        this.ws = null;
        this.roomCode = null;
        this.playerId = null;
        this.playerNumber = null;
        this.isHost = false;
        this.wsConnected = false;
        this.wsServerUrl = 'ws://localhost:3000';
        this.pendingActions = []; // Queue for actions pending WebSocket connection
        this.pendingWordFound = null; // Store word found data while waiting for server confirmation
        
        // Predefined word lists for random mode
        this.wordLists = {
            easy: ['CAT', 'DOG', 'SUN', 'MOON', 'TREE', 'BOOK', 'FISH', 'BIRD', 'STAR', 'FIRE', 'WIND', 'SNOW', 'RAIN', 'CLOUD', 'LEAF', 'ROSE', 'LION', 'BEAR', 'DEER', 'WOLF', 'DUCK', 'OWL', 'EAGLE', 'SHARK', 'WHALE', 'TIGER', 'PANDA', 'KOALA', 'FROG', 'SNAKE'],
            medium: ['COMPUTER', 'RAINBOW', 'OCEAN', 'MOUNTAIN', 'GARDEN', 'PLANET', 'CRYSTAL', 'THUNDER', 'FOREST', 'RIVER', 'VALLEY', 'DESERT', 'ISLAND', 'VOLCANO', 'WATERFALL', 'SUNSET', 'SUNRISE', 'STORM', 'LIGHTNING', 'TORNADO', 'HURRICANE', 'SEASHELL', 'DOLPHIN', 'ELEPHANT', 'GIRAFFE', 'PENGUIN', 'BUTTERFLY', 'DRAGONFLY', 'LADYBUG', 'HONEYBEE'],
            hard: ['JAVASCRIPT', 'ALGORITHM', 'ADVENTURE', 'KNOWLEDGE', 'TELESCOPE', 'SYMPHONY', 'MYSTERY', 'ARCHITECTURE', 'PHOTOGRAPHY', 'ASTRONOMY', 'ARCHAEOLOGY', 'PHILOSOPHY', 'MATHEMATICS', 'CHEMISTRY', 'BIOLOGY', 'PHYSICS', 'GEOGRAPHY', 'HISTORY', 'LITERATURE', 'SCULPTURE', 'PAINTING', 'MUSICIAN', 'SCIENTIST', 'EXPLORER', 'INVENTOR', 'DISCOVERY', 'INVENTION', 'CREATIVITY', 'IMAGINATION', 'EXPERIMENT']
        };
        
        this.init();
    }

    /**
     * Initialize the game
     */
    init() {
        this.bindEvents();
        // Default to multiplayer mode
        this.setPlayerMode('multiplayer');
        // Auto-connect to WebSocket server on page load
        this.connectWebSocket();
        // Don't auto-start game, wait for room creation
        
        // Wallet address for Walrus integration
        this.walletAddress = null;
    }
    
    /**
     * Wallet connection callbacks
     */
    onWalletConnected(address) {
        this.walletAddress = address;
        console.log('Wallet connected to game:', address);
    }
    
    onWalletDisconnected() {
        this.walletAddress = null;
        console.log('Wallet disconnected from game');
    }
    
    getWalletAddress() {
        return this.walletAddress;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Player mode selection (only multiplayer available)
        document.getElementById('singlePlayerMode').addEventListener('click', () => this.setPlayerMode('single'));
        document.getElementById('twoPlayerMode').addEventListener('click', () => this.setPlayerMode('two'));
        document.getElementById('multiplayerMode').addEventListener('click', () => this.setPlayerMode('multiplayer'));
        
        // Multiplayer controls
        document.getElementById('createRoomBtn').addEventListener('click', () => this.createRoom());
        document.getElementById('joinRoomBtn').addEventListener('click', () => this.joinRoom());
        document.getElementById('leaveRoomBtn').addEventListener('click', () => this.leaveRoom());
        document.getElementById('roomCodeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        
        // Mode selection
        document.getElementById('randomMode').addEventListener('click', () => this.setMode('random'));
        document.getElementById('customMode').addEventListener('click', () => this.setMode('custom'));
        
        // Grid size selection
        document.getElementById('gridSize').addEventListener('change', (e) => {
            this.gridSize = parseInt(e.target.value);
            this.newGame();
        });
        
        // Difficulty selection
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            if (this.currentMode === 'random') {
                this.newGame();
            }
        });
        
        // New game button
        document.getElementById('newGame').addEventListener('click', () => this.newGame());
        
        // Hint button
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        
        // Start button
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        
        // Custom words functionality
        document.getElementById('addWord').addEventListener('click', () => this.addCustomWord());
        document.getElementById('wordInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCustomWord();
        });
        document.getElementById('clearWords').addEventListener('click', () => this.clearCustomWords());
        
        // Modal buttons
        document.getElementById('playAgain').addEventListener('click', () => {
            document.getElementById('winModal').classList.add('hidden');
            this.resetGameForNewRound();
        });
        
        document.getElementById('closeRoom').addEventListener('click', () => {
            document.getElementById('winModal').classList.add('hidden');
            this.leaveRoom();
        });

        // Grid interaction will be bound dynamically when grid is created
    }

    /**
     * Set player mode (single, two, or multiplayer)
     */
    setPlayerMode(mode) {
        this.playerMode = mode;
        
        // Update button states
        document.getElementById('singlePlayerMode').classList.remove('active');
        document.getElementById('twoPlayerMode').classList.remove('active');
        document.getElementById('multiplayerMode').classList.remove('active');
        
        // Show/hide multiplayer panel
        const multiplayerPanel = document.getElementById('multiplayerPanel');
        const playerStats = document.getElementById('playerStats');
        const playerScoresDisplay = document.getElementById('playerScoresDisplay');
        
        if (mode === 'multiplayer') {
            document.getElementById('multiplayerMode').classList.add('active');
            multiplayerPanel.classList.remove('hidden');
            playerStats.classList.remove('hidden');
            playerScoresDisplay.classList.remove('hidden');
            
            // Connect to WebSocket if not already connected
            if (!this.wsConnected) {
                this.connectWebSocket();
            }
        } else if (mode === 'two') {
            document.getElementById('twoPlayerMode').classList.add('active');
            multiplayerPanel.classList.add('hidden');
            playerStats.classList.remove('hidden');
            playerScoresDisplay.classList.add('hidden');
            
            // Disconnect WebSocket for local 2-player mode
            this.disconnectWebSocket();
        } else if (mode === 'single') {
            document.getElementById('singlePlayerMode').classList.add('active');
            multiplayerPanel.classList.add('hidden');
            playerStats.classList.add('hidden');
            playerScoresDisplay.classList.add('hidden');
            
            // Disconnect WebSocket for single player mode
            this.disconnectWebSocket();
        }
        
        // Show/hide controls based on mode
        const modeSelectors = document.querySelectorAll('.multiplayer-hidden');
        if (mode === 'multiplayer') {
            modeSelectors.forEach(el => el.classList.add('hidden'));
        } else {
            modeSelectors.forEach(el => el.classList.remove('hidden'));
        }
        
        // Show words section for single and two-player modes
        const wordsSection = document.getElementById('wordsToFindSection');
        if (mode !== 'multiplayer' && wordsSection) {
            wordsSection.classList.remove('hidden');
        }
    }

    /**
     * Set game mode (random or custom)
     */
    setMode(mode) {
        this.currentMode = mode;
        
        // Update UI
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(mode + 'Mode').classList.add('active');
        
        // Show/hide custom panel and difficulty selector
        const customPanel = document.getElementById('customPanel');
        const difficultySelector = document.getElementById('difficultySelector');
        
        if (mode === 'custom') {
            customPanel.classList.remove('hidden');
            difficultySelector.classList.add('hidden');
        } else {
            customPanel.classList.add('hidden');
            difficultySelector.classList.remove('hidden');
        }
        
        this.newGame();
    }

    /**
     * Start a new game
     */
    newGame() {
        // In multiplayer mode, only host can start new game
        if (this.playerMode === 'multiplayer' && this.gameStarted && !this.isHost) {
            return; // Don't allow non-host to start new game
        }

        this.foundWords.clear();
        this.selectedCells = [];
        this.startCell = null;
        this.isSelecting = false;
        this.hintedCells = [];
        this.hintCooldown = false;
        this.placedWords = [];
        this.currentHintWordIndex = -1;
        this.gameStarted = false;
        
        // Reset for new level (don't reset scores - they accumulate)
        this.currentPlayer = 1;
        // Keep playerScores and playerFoundWords - they persist across levels
        
        // Stop existing timers (but don't reset levelStartTime - it continues across levels)
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        // Don't clear levelTimerInterval here - it continues across levels
        // Only clear it when game ends or time is up
        
        // Get level configuration based on current player's level in multiplayer mode
        let levelToUse = this.currentLevel;
        if (this.playerMode === 'multiplayer' && this.playerNumber) {
            // Use this player's specific level, not the shared currentLevel
            levelToUse = this.playerLevels[this.playerNumber] || this.currentLevel;
        }
        const levelConfig = this.levelConfigs[levelToUse] || this.levelConfigs[1];
        this.gridSize = levelConfig.gridSize;
        this.difficulty = levelConfig.difficulty;
        
        // Try to update difficulty selector if it exists (may be hidden in multiplayer)
        const difficultySelect = document.getElementById('difficulty');
        if (difficultySelect) {
            difficultySelect.value = this.difficulty;
        }
        
        // Update grid size selector if it exists
        const gridSizeSelect = document.getElementById('gridSize');
        if (gridSizeSelect) {
            gridSizeSelect.value = this.gridSize;
        }
        
        // Generate words based on current level difficulty and word count
        this.generateRandomWords(levelConfig.wordCount);
        
        // Debug logging
        console.log('Generated words:', this.words);
        console.log('Difficulty:', this.difficulty);
        console.log('Current level:', this.currentLevel);
        
        if (this.words.length === 0) {
            alert('Error generating words! Please try again.');
            console.error('Word generation failed. Difficulty:', this.difficulty, 'WordLists:', this.wordLists);
            return;
        }
        
        // Create and populate grid
        this.createGrid();
        this.placeWords();
        this.fillEmptySpaces();
        this.renderGrid();
        this.renderWordsList();
        this.updateStats();
        this.updatePlayerStats();
        this.updatePlayerTurnIndicator();
        this.showStartOverlay();
        
        // Clear current selection display
        document.getElementById('currentSelection').textContent = '-';
        
        // Store words in a safe place to ensure they're available for START_GAME
        // This helps prevent words from being lost
        if (this.words && this.words.length > 0) {
            console.log('✓ Puzzle ready! Words stored:', this.words.length, 'words');
            // Store a backup copy
            this._backupWords = [...this.words];
        } else {
            console.error('✗ Puzzle generation failed - no words!');
        }

        // Send new game to server if multiplayer and host
        if (this.playerMode === 'multiplayer' && this.isHost && this.wsConnected) {
            // Validate words before sending
            if (!this.words || !Array.isArray(this.words) || this.words.length === 0) {
                console.error('Cannot send NEW_GAME: words are invalid', this.words);
                alert('Error: Cannot create game - words not generated. Please try clicking "New Game" again.');
                return;
            }

            const gameState = {
                grid: this.grid || [], // Grid is optional - each player generates their own
                words: this.words, // Required - must be valid array
                foundWords: Array.from(this.foundWords),
                playerScores: this.playerScores,
                playerFoundWords: {
                    1: Array.from(this.playerFoundWords[1]),
                    2: Array.from(this.playerFoundWords[2])
                },
                currentPlayer: 1,
                gameStarted: false,
                gridSize: this.gridSize,
                mode: this.currentMode,
                difficulty: this.difficulty,
                customWords: this.customWords,
                currentLevel: this.currentLevel
            };

            console.log('Sending NEW_GAME with', gameState.words.length, 'words');
            this.sendWebSocketMessage({
                type: 'NEW_GAME',
                gameState: gameState
            });
        }
    }

    /**
     * Generate random words for current level difficulty
     * @param {number} wordCount - Number of words to generate for this level
     */
    generateRandomWords(wordCount = 8) {
        // Use words from current difficulty level
        const levelWords = this.wordLists[this.difficulty] || this.wordLists.medium;
        
        // Debug logging
        console.log('generateRandomWords - difficulty:', this.difficulty);
        console.log('generateRandomWords - wordCount:', wordCount);
        console.log('generateRandomWords - levelWords:', levelWords);
        
        if (!levelWords || levelWords.length === 0) {
            console.error('No words found for difficulty:', this.difficulty);
            this.words = [];
            return;
        }
        
        // Select specified number of words for the level (or all if less than requested)
        const numWords = Math.min(wordCount, levelWords.length);
        this.words = [];
        
        const shuffled = [...levelWords].sort(() => Math.random() - 0.5);
        for (let i = 0; i < numWords; i++) {
            this.words.push(shuffled[i]);
        }
        
        console.log('Generated', this.words.length, 'words for level', this.currentLevel, ':', this.words);
    }

    /**
     * Create empty grid
     */
    createGrid() {
        this.grid = [];
        for (let i = 0; i < this.gridSize; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                this.grid[i][j] = {
                    letter: '',
                    isWordLetter: false,
                    wordIndex: -1,
                    found: false
                };
            }
        }
    }

    /**
     * Get directions based on difficulty level
     */
    getDirectionsForDifficulty() {
        const easyDirections = [
            { dx: 0, dy: 1 },   // horizontal
            { dx: 1, dy: 0 },   // vertical
            { dx: 1, dy: 1 },   // diagonal down-right
            { dx: 1, dy: -1 }   // diagonal down-left
        ];
        
        const mediumDirections = [
            { dx: 0, dy: 1 },   // horizontal
            { dx: 1, dy: 0 },   // vertical
            { dx: 1, dy: 1 },   // diagonal down-right
            { dx: 1, dy: -1 },  // diagonal down-left
            { dx: 0, dy: -1 },  // horizontal backwards
            { dx: -1, dy: 0 }   // vertical backwards
        ];
        
        const hardDirections = [
            { dx: 0, dy: 1 },   // horizontal
            { dx: 1, dy: 0 },   // vertical
            { dx: 1, dy: 1 },   // diagonal down-right
            { dx: 1, dy: -1 },  // diagonal down-left
            { dx: 0, dy: -1 },  // horizontal backwards
            { dx: -1, dy: 0 },  // vertical backwards
            { dx: -1, dy: -1 }, // diagonal up-left
            { dx: -1, dy: 1 }   // diagonal up-right
        ];
        
        switch (this.difficulty) {
            case 'easy':
                return easyDirections;
            case 'medium':
                return mediumDirections;
            case 'hard':
                return hardDirections;
            default:
                return mediumDirections;
        }
    }

    /**
     * Place words in the grid
     */
    placeWords() {
        const allDirections = [
            { dx: 0, dy: 1 },   // horizontal
            { dx: 1, dy: 0 },   // vertical
            { dx: 1, dy: 1 },   // diagonal down-right
            { dx: 1, dy: -1 },  // diagonal down-left
            { dx: 0, dy: -1 },  // horizontal backwards
            { dx: -1, dy: 0 },  // vertical backwards
            { dx: -1, dy: -1 }, // diagonal up-left
            { dx: -1, dy: 1 }   // diagonal up-right
        ];
        
        // Filter directions based on difficulty (only for random mode)
        let directions = allDirections;
        if (this.currentMode === 'random') {
            directions = this.getDirectionsForDifficulty();
        }

        for (let wordIndex = 0; wordIndex < this.words.length; wordIndex++) {
            const word = this.words[wordIndex];
            let placed = false;
            let attempts = 0;
            const maxAttempts = 100;

            while (!placed && attempts < maxAttempts) {
                const direction = directions[Math.floor(Math.random() * directions.length)];
                const startRow = Math.floor(Math.random() * this.gridSize);
                const startCol = Math.floor(Math.random() * this.gridSize);

                if (this.canPlaceWord(word, startRow, startCol, direction)) {
                    this.placeWord(word, startRow, startCol, direction, wordIndex);
                    placed = true;
                }
                attempts++;
            }

            if (!placed) {
                console.warn(`Could not place word: ${word}`);
            }
        }
    }

    /**
     * Check if word can be placed at given position and direction
     */
    canPlaceWord(word, startRow, startCol, direction) {
        for (let i = 0; i < word.length; i++) {
            const row = startRow + i * direction.dx;
            const col = startCol + i * direction.dy;

            // Check bounds
            if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
                return false;
            }

            // Check if cell is empty or contains the same letter
            const cell = this.grid[row][col];
            if (cell.letter !== '' && cell.letter !== word[i]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Place word in the grid
     */
    placeWord(word, startRow, startCol, direction, wordIndex) {
        const wordCells = [];
        
        for (let i = 0; i < word.length; i++) {
            const row = startRow + i * direction.dx;
            const col = startCol + i * direction.dy;
            
            this.grid[row][col] = {
                letter: word[i],
                isWordLetter: true,
                wordIndex: wordIndex,
                found: false
            };
            
            wordCells.push({ row, col });
        }
        
        // Store word position for hints
        this.placedWords[wordIndex] = {
            word: word,
            cells: wordCells,
            startRow,
            startCol,
            direction
        };
    }

    /**
     * Fill empty spaces with random letters
     */
    fillEmptySpaces() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (this.grid[i][j].letter === '') {
                    // this.grid[i][j].letter = "-";
                    this.grid[i][j].letter = letters[Math.floor(Math.random() * letters.length)];
                }
            }
        }
    }

    /**
     * Render the grid in HTML
     */
    renderGrid() {
        const gridElement = document.getElementById('grid');
        gridElement.innerHTML = '';
        gridElement.dataset.size = this.gridSize;
        
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = this.grid[i][j].letter;
                cell.dataset.row = i;
                cell.dataset.col = j;
                
                // Add hint styling if cell is hinted
                if (this.hintedCells.some(hinted => hinted.row === i && hinted.col === j)) {
                    if (!this.grid[i][j].found) {
                        cell.classList.add('hinted');
                    }
                }
                
                // Add found styling if cell is found
                if (this.grid[i][j].found) {
                    cell.classList.add('found');
                }
                
                // Bind mouse events for selection
                cell.addEventListener('mousedown', (e) => this.startSelection(e, i, j));
                cell.addEventListener('mouseover', (e) => this.continueSelection(e, i, j));
                cell.addEventListener('mouseup', (e) => this.endSelection(e));
                
                gridElement.appendChild(cell);
            }
        }
        
        // Prevent text selection
        gridElement.addEventListener('selectstart', (e) => e.preventDefault());
        document.addEventListener('mouseup', () => this.endSelection());
    }

    /**
     * Start cell selection
     */
    startSelection(event, row, col) {
        event.preventDefault();
        
        // Don't allow selection if game hasn't started
        if (!this.gameStarted) return;
        
        // In local 2-player mode, check if it's the current player's turn
        if (this.playerMode === 'two') {
            // Turn-based only for local 2-player mode
        }
        
        // In multiplayer mode, both players can play simultaneously
        // No turn restrictions - both players can find words at the same time
        
        this.isSelecting = true;
        this.startCell = { row, col };
        this.selectedCells = [{ row, col }];
        this.updateSelection();
    }

    /**
     * Continue cell selection (drag)
     */
    continueSelection(event, row, col) {
        if (!this.isSelecting || !this.startCell) return;
        
        const newSelection = this.getSelectionPath(this.startCell, { row, col });
        this.selectedCells = newSelection;
        this.updateSelection();
    }

    /**
     * End cell selection
     */
    endSelection(event) {
        if (!this.isSelecting) return;
        
        this.isSelecting = false;
        this.checkSelectedWord();
        this.clearSelection();
    }

    /**
     * Get path between two cells (straight line only)
     */
    getSelectionPath(start, end) {
        const path = [];
        const dx = end.row - start.row;
        const dy = end.col - start.col;
        
        // Only allow straight lines (horizontal, vertical, diagonal)
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        if (steps === 0) return [start];
        
        const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
        const stepY = dy === 0 ? 0 : dy / Math.abs(dy);
        
        // Check if it's a valid straight line
        if (Math.abs(dx) !== 0 && Math.abs(dy) !== 0 && Math.abs(dx) !== Math.abs(dy)) {
            return [start]; // Not a valid diagonal
        }
        
        for (let i = 0; i <= steps; i++) {
            const row = start.row + i * stepX;
            const col = start.col + i * stepY;
            
            if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
                path.push({ row, col });
            }
        }
        
        return path;
    }

    /**
     * Update visual selection
     */
    updateSelection() {
        // Clear previous selection styling
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('selecting');
        });
        
        // Apply selection styling
        this.selectedCells.forEach(({ row, col }) => {
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('selecting');
            }
        });
        
        // Update current selection display
        const selectedWord = this.selectedCells.map(({ row, col }) => 
            this.grid[row][col].letter
        ).join('');
        document.getElementById('currentSelection').textContent = selectedWord || '-';
    }

    /**
     * Clear selection styling
     */
    clearSelection() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('selecting');
        });
        this.selectedCells = [];
        document.getElementById('currentSelection').textContent = '-';
    }

    /**
     * Check if selected word is valid
     */
    checkSelectedWord() {
        const selectedWord = this.selectedCells.map(({ row, col }) => 
            this.grid[row][col].letter
        ).join('');
        
        // Check forward and backward
        const reversedWord = selectedWord.split('').reverse().join('');
        
        let foundWordIndex = -1;
        let isReversed = false;
        
        for (let i = 0; i < this.words.length; i++) {
            if (this.words[i] === selectedWord) {
                foundWordIndex = i;
                break;
            } else if (this.words[i] === reversedWord) {
                foundWordIndex = i;
                isReversed = true;
                break;
            }
        }
        
        if (foundWordIndex !== -1 && !this.foundWords.has(foundWordIndex)) {
            this.markWordAsFound(foundWordIndex);
            this.foundWords.add(foundWordIndex);
            
            // Handle scoring based on mode
            if (this.playerMode === 'two') {
                // Local 2-player mode - update scores immediately
                const currentPlayerForScoring = this.currentPlayer;
                this.playerFoundWords[currentPlayerForScoring].add(foundWordIndex);
                this.playerScores[currentPlayerForScoring]++;
                this.updatePlayerStats();
                
                // Switch to next player
                this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                this.updatePlayerTurnIndicator();
            } else if (this.playerMode === 'multiplayer') {
                // Multiplayer mode - DON'T update scores or mark cells locally yet
                // Wait for server confirmation to ensure synchronization
                // Store the found word info temporarily
                const foundWordData = {
                    wordIndex: foundWordIndex,
                    cells: [...this.selectedCells]
                };
                
                // Send to server - server will update scores and broadcast to both players
                if (this.wsConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
                    const message = {
                        type: 'WORD_FOUND',
                        wordIndex: foundWordIndex,
                        cells: this.selectedCells
                    };
                    console.log('📤 Sending WORD_FOUND to server:', message);
                    this.sendWebSocketMessage(message);
                    console.log(`✅ WORD_FOUND sent - waiting for server confirmation`);
                    
                    // Store pending word data - will be processed when server confirms
                    this.pendingWordFound = foundWordData;
                } else {
                    console.error('❌ Cannot send WORD_FOUND - WebSocket not connected!', {
                        wsConnected: this.wsConnected,
                        wsExists: !!this.ws,
                        readyState: this.ws ? this.ws.readyState : 'N/A'
                    });
                    // Fallback: update locally if WebSocket is not available
                    this.playerFoundWords[this.playerNumber].add(foundWordIndex);
                    this.playerScores[this.playerNumber] = (this.playerScores[this.playerNumber] || 0) + 1;
                    this.updatePlayerStats();
                    this.markWordAsFound(foundWordIndex);
                    this.updateStats();
                    // Mark cells
                    this.selectedCells.forEach(({ row, col }) => {
                        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                        if (cell) {
                            setTimeout(() => {
                                cell.classList.add('found');
                                cell.classList.add(`player-${this.playerNumber}-found`);
                            }, 100);
                        }
                        this.grid[row][col].found = true;
                    });
                }
            } else {
                // Single player or two-player local mode - update immediately
                // If the found word was the current hint word, reset hint tracking
                if (this.currentHintWordIndex === foundWordIndex) {
                    this.currentHintWordIndex = -1;
                    this.clearHints();
                }
                
                this.updateStats();
                
                // Win condition check
                if (this.playerMode !== 'multiplayer') {
                    this.checkWinCondition();
                }
                
                // Animate found cells with player color in 2-player mode
                this.selectedCells.forEach(({ row, col }) => {
                    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    if (cell) {
                        setTimeout(() => {
                            cell.classList.add('found');
                            if (this.playerMode === 'two') {
                                const playerNum = this.currentPlayer === 1 ? 2 : 1;
                                cell.classList.add(`player-${playerNum}-found`);
                            }
                        }, 100);
                    }
                    this.grid[row][col].found = true;
                });
            }
        }
    }

    /**
     * Mark word as found in the words list
     */
    markWordAsFound(wordIndex) {
        const wordElements = document.querySelectorAll('.words-list li');
        if (wordElements[wordIndex]) {
            wordElements[wordIndex].classList.add('found');
        }
    }

    /**
     * Render words list
     */
    renderWordsList() {
        const wordsList = document.getElementById('wordsList');
        wordsList.innerHTML = '';
        
        this.words.forEach((word, index) => {
            const li = document.createElement('li');
            li.textContent = word;
            if (this.foundWords.has(index)) {
                li.classList.add('found');
            }
            wordsList.appendChild(li);
        });
    }

    /**
     * Update game statistics
     */
    updateStats() {
        document.getElementById('foundCount').textContent = this.foundWords.size;
        document.getElementById('totalCount').textContent = this.words.length;
    }

    /**
     * Start game timer
     */
    startTimer() {
        // This is called when game starts - server will send synchronized start time
        // For now, use local time if server time not available
        if (!this.levelStartTime) {
            this.levelStartTime = Date.now();
        }
        this.startLevelCountdown();
    }

    startLevelCountdown() {
        // Clear any existing timer
        if (this.levelTimerInterval) {
            clearInterval(this.levelTimerInterval);
        }
        
        // Don't reset timer - use cumulative time across all levels
        // levelStartTime is set once at game start and continues
        
        this.levelTimerInterval = setInterval(() => {
            if (this.levelStartTime) {
                // Calculate elapsed time from server-synchronized start (cumulative)
                const elapsed = Math.floor((Date.now() - this.levelStartTime) / 1000);
                const remaining = Math.max(0, this.levelTimeLimit - elapsed);
                
                // Store total game time
                this.totalGameTime = elapsed;
                
                if (remaining <= 0) {
                    // Time's up!
                    this.handleLevelTimeUp();
                    return;
                }
                
                const minutes = Math.floor(remaining / 60);
                const seconds = remaining % 60;
                const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                // Update timer display
                document.getElementById('timer').textContent = timeString;
            } else {
                // Fallback: countdown from levelTimeLimit
                if (!this.levelTimer) {
                    this.levelTimer = this.levelTimeLimit;
                }
                this.levelTimer--;
                this.totalGameTime = this.levelTimeLimit - this.levelTimer;
                
                if (this.levelTimer <= 0) {
                    this.handleLevelTimeUp();
                    return;
                }
                
                const minutes = Math.floor(this.levelTimer / 60);
                const seconds = this.levelTimer % 60;
                const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                document.getElementById('timer').textContent = timeString;
            }
        }, 1000);
    }

    handleLevelTimeUp() {
        clearInterval(this.levelTimerInterval);
        this.gameStarted = false;
        
        // Show "Times Up" message
        alert('⏰ Times Up!');
        
        // Update timer display to show 00:00
        document.getElementById('timer').textContent = '00:00';
        
        // Timer ended - immediately end the game and show results
        // Don't advance to next level, game is over
        this.endGame();
    }

    advanceToNextLevel() {
        // Don't reset timer - it continues across levels
        // Calculate time used in this level
        const levelTimeUsed = this.totalGameTime || 0;
        
        // In multiplayer mode, track each player's level independently
        if (this.playerMode === 'multiplayer' && this.playerNumber) {
            const currentPlayerLevel = this.playerLevels[this.playerNumber] || this.currentLevel;
            console.log(`Player ${this.playerNumber} completed Level ${currentPlayerLevel} in ${levelTimeUsed} seconds`);
            
            // Move this player to next level
            const nextLevel = currentPlayerLevel + 1;
            this.playerLevels[this.playerNumber] = nextLevel;
            this.currentLevel = nextLevel; // Update current level for this player's view
            
            // Check if this player has more levels
            if (nextLevel > 3) {
                // This player completed all levels
                this.endGame();
                return;
            }
            
            // Notify server about player's level completion (for score updates only)
            if (this.wsConnected) {
                this.sendWebSocketMessage({
                    type: 'PLAYER_LEVEL_COMPLETE',
                    playerNumber: this.playerNumber,
                    completedLevel: currentPlayerLevel,
                    nextLevel: nextLevel,
                    playerScores: this.playerScores,
                    totalGameTime: this.totalGameTime
                });
            }
            
            // Show level transition message
            const levelNames = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
            alert(`Level ${currentPlayerLevel} (${levelNames[currentPlayerLevel]}) Complete!\n\nStarting Level ${nextLevel} (${levelNames[nextLevel]})...`);
            
            // Reset found words for this player for the new level
            this.playerFoundWords[this.playerNumber] = new Set();
            this.foundWords.clear(); // Clear shared found words for new level
            
            // Generate and start next level for THIS PLAYER ONLY (not broadcast to others)
            this.generateNextLevelForPlayer(nextLevel);
        } else {
            // Single player or local 2-player mode
            console.log(`Level ${this.currentLevel} completed in ${levelTimeUsed} seconds`);
            
            // Move to next level
            this.currentLevel++;
            
            // Check if there are more levels
            if (this.currentLevel > 3) {
                // All levels completed
                this.endGame();
                return;
            }
            
            // Show level transition message
            const levelNames = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
            alert(`Level ${this.currentLevel - 1} (${levelNames[this.currentLevel - 1]}) Complete!\n\nStarting Level ${this.currentLevel} (${levelNames[this.currentLevel]})...`);
            
            // Start next level
            this.newGame();
            
            // Auto-start next level after a brief delay
            setTimeout(() => {
                if (this.isHost || this.playerMode !== 'multiplayer') {
                    this.startGame();
                }
            }, 2000);
        }
    }

    /**
     * Generate and start next level for a specific player (multiplayer only)
     * This is called independently for each player when they complete their level
     */
    generateNextLevelForPlayer(level) {
        // Get level configuration
        const levelConfig = this.levelConfigs[level] || this.levelConfigs[1];
        this.gridSize = levelConfig.gridSize;
        this.difficulty = levelConfig.difficulty;
        
        // Update difficulty selector if it exists
        const difficultySelect = document.getElementById('difficulty');
        if (difficultySelect) {
            difficultySelect.value = this.difficulty;
        }
        
        // Update grid size selector if it exists
        const gridSizeSelect = document.getElementById('gridSize');
        if (gridSizeSelect) {
            gridSizeSelect.value = this.gridSize;
        }
        
        // Generate words based on current level difficulty and word count
        this.generateRandomWords(levelConfig.wordCount);
        
        // Debug logging
        console.log(`Player ${this.playerNumber} generated Level ${level} puzzle:`, this.words);
        console.log('Difficulty:', this.difficulty);
        console.log('Grid size:', this.gridSize);
        
        if (this.words.length === 0) {
            alert('Error generating words! Please try again.');
            console.error('Word generation failed. Difficulty:', this.difficulty, 'WordLists:', this.wordLists);
            return;
        }
        
        // Reset game state for new level
        this.foundWords.clear();
        this.selectedCells = [];
        this.startCell = null;
        this.isSelecting = false;
        this.hintedCells = [];
        this.hintCooldown = false;
        this.placedWords = [];
        this.currentHintWordIndex = -1;
        this.gameStarted = false;
        
        // Create and populate grid
        this.createGrid();
        this.placeWords();
        this.fillEmptySpaces();
        this.renderGrid();
        this.renderWordsList();
        this.updateStats();
        this.updatePlayerStats();
        this.updatePlayerTurnIndicator();
        
        // Show words section
        this.showWordsSection();
        
        // Show start overlay (player needs to click Start to begin their next level)
        this.showStartOverlay();
        
        // Clear current selection display
        const currentSelectionEl = document.getElementById('currentSelection');
        if (currentSelectionEl) currentSelectionEl.textContent = '-';
        
        // Store words
        if (this.words && this.words.length > 0) {
            console.log(`✓ Player ${this.playerNumber} Level ${level} puzzle ready! Words stored:`, this.words.length, 'words');
            this._backupWords = [...this.words];
        } else {
            console.error('✗ Puzzle generation failed - no words!');
        }
        
        // Auto-start this player's next level after a brief delay
        // Note: This only starts for THIS player, not broadcast to others
        setTimeout(() => {
            // Start the game locally for this player only
            this.gameStarted = true;
            const startOverlay = document.getElementById('startOverlay');
            const grid = document.getElementById('grid');
            
            if (startOverlay) startOverlay.classList.add('hidden');
            if (grid) grid.classList.remove('blurred');
            
            // Start timer (continues from previous level)
            this.startTimer();
            
            console.log(`Player ${this.playerNumber} started Level ${level} independently`);
        }, 2000);
    }

    endGame() {
        // Game over - determine winner
        clearInterval(this.levelTimerInterval);
        this.gameStarted = false;
        
        // Determine winner
        const player1Score = this.playerScores[1];
        const player2Score = this.playerScores[2];
        
        let winner = 0; // 0 = tie, 1 = player 1, 2 = player 2
        if (player1Score > player2Score) {
            winner = 1;
        } else if (player2Score > player1Score) {
            winner = 2;
        }
        
        // Notify server if host (include wallet addresses for Walrus integration)
        // NOTE: Wallet is optional - game can be played without wallet connection
        if (this.playerMode === 'multiplayer' && this.isHost && this.wsConnected) {
            // Collect wallet addresses if available (optional)
            const walletAddresses = {};
            if (this.walletAddress) {
                walletAddresses[this.playerNumber] = this.walletAddress;
            }
            
            // If wallet manager is available, try to get wallet address
            if (window.walletManager && window.walletManager.isConnected()) {
                const walletAddr = window.walletManager.getAddress();
                if (walletAddr) {
                    walletAddresses[this.playerNumber] = walletAddr;
                }
            }
            
            // Send game over message (wallet addresses are optional)
            this.sendWebSocketMessage({
                type: 'GAME_OVER',
                playerScores: this.playerScores,
                winner: winner,
                walletAddresses: walletAddresses // Can be empty - that's okay!
            });
        }
        
        // Show win modal
        this.showGameOverModal(winner);
    }

    showGameOverModal(winner, walrusData = null) {
        // Update final scores (use server-provided scores)
        const player1Score = this.playerScores[1] || 0;
        const player2Score = this.playerScores[2] || 0;
        const totalScore = player1Score + player2Score; // Overall total score
        
        const finalPlayer1ScoreEl = document.getElementById('finalPlayer1Score');
        const finalPlayer2ScoreEl = document.getElementById('finalPlayer2Score');
        if (finalPlayer1ScoreEl) finalPlayer1ScoreEl.textContent = player1Score;
        if (finalPlayer2ScoreEl) finalPlayer2ScoreEl.textContent = player2Score;
        
        // Calculate total time
        const totalTime = this.totalGameTime || 0;
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Determine and display winner based on server calculation
        // winner: 0 = tie, 1 = player 1 wins (highest score), 2 = player 2 wins (highest score)
        let winnerText = '';
        let winnerMessage = '';
        const currentPlayerNum = this.playerNumber || 1; // Current player's number
        
        if (winner === 0) {
            // Tie - both players have same score
            winnerText = "It's a Tie! 🤝";
            winnerMessage = `Both players scored ${player1Score} points!\n\nTotal Score: ${totalScore} points\nTotal Time: ${timeString}`;
        } else if (winner === currentPlayerNum) {
            // Current player wins (has highest score)
            winnerText = 'You Win! 🎉';
            const yourScore = this.playerScores[currentPlayerNum] || 0;
            const opponentScore = winner === 1 ? player2Score : player1Score;
            winnerMessage = `Congratulations! You won with ${yourScore} points!\n\nOpponent scored: ${opponentScore} points\nTotal Score: ${totalScore} points\nTotal Time: ${timeString}`;
        } else {
            // Current player lost (opponent has highest score)
            winnerText = 'You Lost! 😔';
            const winnerScore = winner === 1 ? player1Score : player2Score;
            const yourScore = this.playerScores[currentPlayerNum] || 0;
            winnerMessage = `Player ${winner} won with ${winnerScore} points.\n\nYou scored: ${yourScore} points\nTotal Score: ${totalScore} points\nTotal Time: ${timeString}`;
        }
        
        // Add Walrus information if available
        if (walrusData && walrusData.uploaded && walrusData.aggregatorUrl) {
            winnerMessage += `\n\n📦 Stored on Walrus (Blockchain):\n🔗 ${walrusData.aggregatorUrl}`;
        }
        
        const winTitleEl = document.getElementById('winTitle');
        const winMessageEl = document.getElementById('winMessage');
        const winStatsEl = document.getElementById('winStats');
        const playerWinStatsEl = document.getElementById('playerWinStats');
        const winModalEl = document.getElementById('winModal');
        
        if (winTitleEl) winTitleEl.textContent = winnerText;
        if (winMessageEl) winMessageEl.textContent = winnerMessage;
        if (winStatsEl) winStatsEl.classList.add('hidden');
        if (playerWinStatsEl) playerWinStatsEl.classList.remove('hidden');
        
        setTimeout(() => {
            if (winModalEl) {
                winModalEl.classList.remove('hidden');
            }
        }, 500);
    }

    /**
     * Show start overlay and blur grid
     */
    showStartOverlay() {
        const startOverlay = document.getElementById('startOverlay');
        const grid = document.getElementById('grid');
        
        if (startOverlay) {
            startOverlay.classList.remove('hidden');
        }
        if (grid) {
            grid.classList.add('blurred');
        }
        
        // Hide words section when showing start overlay
        this.hideWordsSection();
        
        // Reset timer displays
        const timerEl = document.getElementById('timer');
        if (timerEl) timerEl.textContent = '00:00';
        const gameTimerEl = document.getElementById('gameTimer');
        if (gameTimerEl) gameTimerEl.textContent = '00:00';
    }

    /**
     * Show words-to-find section in full width (when game starts)
     */
    showWordsSection() {
        const wordsToFind = document.getElementById('wordsToFindSection');
        const gridWordsContainer = document.querySelector('.grid-words-container');
        
        if (wordsToFind) {
            wordsToFind.classList.remove('hidden');
        }
        if (gridWordsContainer) {
            gridWordsContainer.classList.add('words-visible');
        }
    }

    /**
     * Hide words-to-find section
     */
    hideWordsSection() {
        const wordsToFind = document.getElementById('wordsToFindSection');
        const gridWordsContainer = document.querySelector('.grid-words-container');
        
        if (wordsToFind) {
            wordsToFind.classList.add('hidden');
        }
        if (gridWordsContainer) {
            gridWordsContainer.classList.remove('words-visible');
        }
    }

    /**
     * Start the game
     */
    startGame() {
        // NOTE: Wallet connection is optional - players can play without wallet
        // Check wallet status but don't block gameplay
        if (window.walletManager && window.walletManager.isConnected()) {
            console.log('✅ Wallet connected - game results will be stored on blockchain');
        } else {
            console.log('ℹ️ No wallet connected - playing in friendly mode (results not stored on blockchain)');
        }
        
        // In multiplayer mode, only host can start
        if (this.playerMode === 'multiplayer') {
            if (!this.isHost) {
                alert('Only the host can start the game');
                return;
            }
            if (!this.wsConnected) {
                alert('Not connected to server');
                return;
            }
            if (this.playerNumber === 1 && !document.getElementById('playersCount').textContent.includes('2')) {
                alert('Waiting for another player to join...');
                return;
            }
        }

        // In multiplayer mode, don't start locally - wait for server to send GAME_STARTED
        // This ensures both players start simultaneously
        if (this.playerMode === 'multiplayer' && this.isHost && this.wsConnected) {
            // Get words - try multiple sources
            let wordsToSend = null;
            
            // Priority 1: Current words array
            if (this.words && Array.isArray(this.words) && this.words.length > 0) {
                wordsToSend = [...this.words];
                console.log('Using current words array:', wordsToSend.length, 'words');
            }
            // Priority 2: Backup words
            else if (this._backupWords && Array.isArray(this._backupWords) && this._backupWords.length > 0) {
                wordsToSend = [...this._backupWords];
                this.words = [...this._backupWords]; // Restore to main array
                console.log('Restored words from backup:', wordsToSend.length, 'words');
            }
            // Priority 3: Try to generate words on the fly
            else {
                console.warn('No words found, attempting to generate...');
                this.generateRandomWords();
                if (this.words && Array.isArray(this.words) && this.words.length > 0) {
                    wordsToSend = [...this.words];
                    console.log('Generated words on the fly:', wordsToSend.length, 'words');
                }
            }
            
            // Final check - if still no words, show error
            if (!wordsToSend || !Array.isArray(wordsToSend) || wordsToSend.length === 0) {
                console.error('FATAL: Could not get words!', {
                    thisWords: this.words,
                    backupWords: this._backupWords,
                    wordsToSend: wordsToSend
                });
                alert('Error: Cannot start game - no words available.\n\nPlease:\n1. Click "New Game" button\n2. Wait for puzzle to appear\n3. Then click "Start Game"\n\nIf this persists, refresh the page.');
                return;
            }
            
            // Ensure we have valid game settings
            const gridSize = this.gridSize || 15;
            const mode = this.currentMode || 'random';
            const difficulty = this.difficulty || 'medium';
            const currentLevel = this.currentLevel || 1;
            
            // Validate grid exists and is properly formatted
            if (!this.grid || !Array.isArray(this.grid) || this.grid.length === 0) {
                console.error('Grid is missing or invalid. Grid:', this.grid);
                alert('Error: Puzzle grid is not ready. Please click "New Game" first to generate the puzzle, then click "Start Game".');
                return;
            }
            
            // Create gameState with guaranteed valid words and grid
            // Include grid so both players see the same puzzle
            const gameState = {
                words: wordsToSend, // Use the validated words array
                grid: this.grid, // Include the grid so both players see the same puzzle
                foundWords: Array.from(this.foundWords || []),
                playerScores: this.playerScores || { 1: 0, 2: 0 },
                playerFoundWords: {
                    1: Array.from((this.playerFoundWords && this.playerFoundWords[1]) || []),
                    2: Array.from((this.playerFoundWords && this.playerFoundWords[2]) || [])
                },
                currentPlayer: 1,
                gameStarted: true,
                gridSize: gridSize,
                mode: mode,
                difficulty: difficulty,
                customWords: this.customWords || [],
                currentLevel: currentLevel
            };
            
            // Triple-check words are valid
            if (!gameState.words || !Array.isArray(gameState.words) || gameState.words.length === 0) {
                console.error('FATAL: gameState.words is invalid after all checks!', gameState);
                alert('Critical error: Words validation failed. Please refresh the page.');
                return;
            }
            
            // Validate grid structure
            if (!gameState.grid || !Array.isArray(gameState.grid) || gameState.grid.length !== gridSize) {
                console.error('FATAL: gameState.grid is invalid!', {
                    grid: gameState.grid,
                    gridLength: gameState.grid ? gameState.grid.length : 'null',
                    expectedSize: gridSize
                });
                alert('Critical error: Grid validation failed. Please click "New Game" again, then "Start Game".');
                return;
            }
            
            console.log('✓ Sending START_GAME with', gameState.words.length, 'words:', gameState.words);
            
            const messageToSend = {
                type: 'START_GAME',
                gameState: gameState
            };
            
            // Send the message
            this.sendWebSocketMessage(messageToSend);
            console.log('✓ START_GAME message sent to server');
            
            // Don't start locally - wait for server response to ensure synchronization
            return;
        } else {
            // Single player mode - start immediately
            this.gameStarted = true;
            const startOverlay = document.getElementById('startOverlay');
            const grid = document.getElementById('grid');
            
            // Hide start overlay and remove blur
            if (startOverlay) startOverlay.classList.add('hidden');
            if (grid) grid.classList.remove('blurred');
            
            // Show words-to-find section in full width for both players
            this.showWordsSection();
            
            this.startTimer();
        }
    }

    /**
     * Check if player has won
     */
    checkWinCondition() {
        // In multiplayer mode, check if current player has completed their level
        if (this.playerMode === 'multiplayer' && this.playerNumber) {
            const currentPlayerLevel = this.playerLevels[this.playerNumber] || this.currentLevel;
            const currentPlayerFoundWords = this.playerFoundWords[this.playerNumber] || new Set();
            
            // Check if current player has found all words in their current level
            if (currentPlayerFoundWords.size === this.words.length) {
                // Player completed their level! Advance to next level or end game
                if (currentPlayerLevel < 3) {
                    // Advance this player to next level
                    this.advanceToNextLevel();
                } else {
                    // All levels completed - end game for this player
                    this.endGame();
                }
            }
        } else {
            // Single player or local 2-player mode - use shared foundWords
            if (this.foundWords.size === this.words.length) {
                // Level completed! Advance to next level or end game
                if (this.currentLevel < 3) {
                    // Advance to next level
                    this.advanceToNextLevel();
                } else {
                    // All levels completed - end game
                    this.endGame();
                }
            }
        }
    }
    
    /**
     * Update player stats display
     */
    updatePlayerStats() {
        if (this.playerMode === 'two' || this.playerMode === 'multiplayer') {
            // Ensure scores are numbers, default to 0 if undefined
            const player1Score = Number(this.playerScores[1]) || 0;
            const player2Score = Number(this.playerScores[2]) || 0;
            
            // Update sidebar scores (for 2-player mode)
            const player1ScoreEl = document.getElementById('player1Score');
            const player2ScoreEl = document.getElementById('player2Score');
            if (player1ScoreEl) {
                player1ScoreEl.textContent = player1Score;
            }
            if (player2ScoreEl) {
                player2ScoreEl.textContent = player2Score;
            }
            
            // Update score display above game box (multiplayer) - THIS IS THE MAIN DISPLAY
            if (this.playerMode === 'multiplayer') {
                const player1PointsEl = document.getElementById('player1PointsDisplay');
                const player2PointsEl = document.getElementById('player2PointsDisplay');
                
                if (player1PointsEl) {
                    const oldValue = player1PointsEl.textContent;
                    player1PointsEl.textContent = player1Score;
                    if (oldValue !== String(player1Score)) {
                        console.log(`📊 Player 1 score updated: ${oldValue} → ${player1Score}`);
                    }
                } else {
                    console.error('❌ player1PointsDisplay element not found!');
                }
                
                if (player2PointsEl) {
                    const oldValue = player2PointsEl.textContent;
                    player2PointsEl.textContent = player2Score;
                    if (oldValue !== String(player2Score)) {
                        console.log(`📊 Player 2 score updated: ${oldValue} → ${player2Score}`);
                    }
                } else {
                    console.error('❌ player2PointsDisplay element not found!');
                }
            }
            
            this.updatePlayerTurnIndicator();
        }
    }
    
    /**
     * Animate score update when a player finds a word
     */
    animateScoreUpdate(playerNumber) {
        if (this.playerMode === 'multiplayer' && playerNumber) {
            const pointsEl = playerNumber === 1 
                ? document.getElementById('player1PointsDisplay')
                : document.getElementById('player2PointsDisplay');
            
            if (pointsEl) {
                // Add animation class
                pointsEl.classList.add('score-updated');
                
                // Remove animation class after animation completes
                setTimeout(() => {
                    pointsEl.classList.remove('score-updated');
                }, 500);
            }
        }
    }
    
    /**
     * Update player turn indicator
     */
    updatePlayerTurnIndicator() {
        if (this.playerMode === 'two' || this.playerMode === 'multiplayer') {
            const indicator1 = document.getElementById('player1Indicator');
            const indicator2 = document.getElementById('player2Indicator');
            const player1Stat = document.querySelector('.player-stat.player-1');
            const player2Stat = document.querySelector('.player-stat.player-2');
            
            if (this.playerMode === 'multiplayer') {
                // In multiplayer simultaneous mode, show player indicators but no turn restrictions
                indicator1.textContent = this.playerNumber === 1 ? '👈 You' : '👤';
                indicator2.textContent = this.playerNumber === 2 ? '👈 You' : '👤';
                // Remove active-turn highlighting since both play simultaneously
                player1Stat.classList.remove('active-turn');
                player2Stat.classList.remove('active-turn');
            } else {
                // Local 2-player mode - turn-based
                if (this.currentPlayer === 1) {
                    indicator1.textContent = '👈 Your Turn';
                    indicator2.textContent = '👤';
                    player1Stat.classList.add('active-turn');
                    player2Stat.classList.remove('active-turn');
                } else {
                    indicator1.textContent = '👤';
                    indicator2.textContent = '👈 Your Turn';
                    player1Stat.classList.remove('active-turn');
                    player2Stat.classList.add('active-turn');
                }
            }
        }
    }

    /**
     * Show hint for a random unfound word
     */
    showHint() {
        // Don't allow hints if game hasn't started
        if (!this.gameStarted) return;
        
        // Check if hint is on cooldown
        if (this.hintCooldown) {
            return;
        }
        
        // Find unfound words
        const unfoundWordIndices = [];
        for (let i = 0; i < this.words.length; i++) {
            if (!this.foundWords.has(i)) {
                unfoundWordIndices.push(i);
            }
        }
        
        // If no unfound words, do nothing
        if (unfoundWordIndices.length === 0) {
            return;
        }
        
        // Clear previous hints
        this.clearHints();
        
        // Select word to hint
        let wordIndexToHint;
        
        // If no current hint word is set or the current hint word is found, select a new one
        if (this.currentHintWordIndex === -1 || this.foundWords.has(this.currentHintWordIndex)) {
            // Select a random unfound word
            wordIndexToHint = unfoundWordIndices[Math.floor(Math.random() * unfoundWordIndices.length)];
            this.currentHintWordIndex = wordIndexToHint;
        } else {
            // Use the current hint word if it's still unfound
            wordIndexToHint = this.currentHintWordIndex;
        }
        const wordData = this.placedWords[wordIndexToHint];
        
        if (wordData) {
            // Highlight the word cells
            this.hintedCells = [...wordData.cells];
            
            // Re-render grid to show hints
            this.renderGrid();
            
            // Set cooldown
            this.hintCooldown = true;
            const hintBtn = document.getElementById('hintBtn');
            hintBtn.disabled = true;
            hintBtn.textContent = '⏰ Wait...';
            
            // Remove hint after 3 seconds and enable button after 5 seconds
            setTimeout(() => {
                this.clearHints();
                this.renderGrid();
            }, 3000);
            
            setTimeout(() => {
                this.hintCooldown = false;
                hintBtn.disabled = false;
                hintBtn.textContent = '💡 Hint';
            }, 5000);
        }
    }

    /**
     * Clear all hints
     */
    clearHints() {
        this.hintedCells = [];
    }

    /**
     * Add custom word
     */
    addCustomWord() {
        const input = document.getElementById('wordInput');
        const word = input.value.trim().toUpperCase();
        
        if (word && word.length >= 3 && word.length <= 15 && /^[A-Z]+$/.test(word)) {
            if (!this.customWords.includes(word)) {
                this.customWords.push(word);
                this.saveCustomWords();
                this.renderCustomWords();
                input.value = '';
                
                // If we're in custom mode, restart the game
                if (this.currentMode === 'custom') {
                    this.newGame();
                }
            } else {
                alert('Word already exists!');
            }
        } else {
            alert('Please enter a valid word (3-15 letters, A-Z only)');
        }
    }

    /**
     * Clear all custom words
     */
    clearCustomWords() {
        if (confirm('Are you sure you want to clear all custom words?')) {
            this.customWords = [];
            this.saveCustomWords();
            this.renderCustomWords();
            
            if (this.currentMode === 'custom') {
                this.newGame();
            }
        }
    }

    /**
     * Render custom words list
     */
    renderCustomWords() {
        const list = document.getElementById('customWordsList');
        list.innerHTML = '';
        
        this.customWords.forEach((word, index) => {
            const li = document.createElement('li');
            li.textContent = word;
            li.addEventListener('click', () => {
                this.customWords.splice(index, 1);
                this.saveCustomWords();
                this.renderCustomWords();
                
                if (this.currentMode === 'custom') {
                    this.newGame();
                }
            });
            list.appendChild(li);
        });
    }

    /**
     * Save custom words to localStorage
     */
    saveCustomWords() {
        localStorage.setItem('findWordsCustomWords', JSON.stringify(this.customWords));
    }

    /**
     * Load custom words from localStorage
     */
    loadCustomWords() {
        const saved = localStorage.getItem('findWordsCustomWords');
        return saved ? JSON.parse(saved) : ['JAVASCRIPT', 'CODING', 'PUZZLE', 'GAME'];
    }

    /**
     * WebSocket Multiplayer Methods
     */
    
    connectWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return; // Already connected
        }

        try {
            this.updateConnectionStatus('connecting', 'Connecting...');
            this.ws = new WebSocket(this.wsServerUrl);

            this.ws.onopen = () => {
                this.wsConnected = true;
                this.updateConnectionStatus('connected', 'Connected');
                console.log('WebSocket connected successfully');
                
                // Execute any pending actions after a short delay to ensure connection is fully established
                setTimeout(() => {
                    console.log('Executing', this.pendingActions.length, 'pending actions');
                    while (this.pendingActions.length > 0) {
                        const action = this.pendingActions.shift();
                        if (action && typeof action === 'function') {
                            try {
                                action();
                            } catch (error) {
                                console.error('Error executing pending action:', error);
                            }
                        }
                    }
                }, 100);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('WebSocket message received:', data.type, 'by player', this.playerNumber);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                    console.error('Received data:', event.data);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('disconnected', 'Connection Error');
            };

            this.ws.onclose = () => {
                this.wsConnected = false;
                this.updateConnectionStatus('disconnected', 'Disconnected');
                console.log('WebSocket disconnected');
                
                // Attempt to reconnect if in multiplayer mode
                if (this.playerMode === 'multiplayer' && this.roomCode) {
                    setTimeout(() => {
                        if (this.playerMode === 'multiplayer') {
                            this.connectWebSocket();
                        }
                    }, 3000);
                }
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.updateConnectionStatus('disconnected', 'Connection Failed');
            alert('Failed to connect to game server. Make sure the server is running.');
        }
    }

    disconnectWebSocket() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.wsConnected = false;
        this.pendingActions = []; // Clear pending actions
        this.roomCode = null;
        this.playerId = null;
        this.playerNumber = null;
        this.isHost = false;
        this.updateConnectionStatus('disconnected', 'Disconnected');
        document.getElementById('roomInfo').classList.add('hidden');
    }

    updateConnectionStatus(status, text) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        indicator.className = 'status-indicator';
        if (status === 'connected') {
            indicator.textContent = '🟢';
            indicator.classList.add('connected');
        } else if (status === 'connecting') {
            indicator.textContent = '🟡';
            indicator.classList.add('connecting');
        } else {
            indicator.textContent = '🔴';
            indicator.classList.add('disconnected');
        }
        
        statusText.textContent = text;
    }

    sendWebSocketMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                const jsonMessage = JSON.stringify(message);
                console.log('📤 Sending WebSocket message type:', message.type);
                
                if (message.type === 'WORD_FOUND') {
                    console.log('📤 WORD_FOUND message details:', {
                        wordIndex: message.wordIndex,
                        cells: message.cells,
                        playerNumber: this.playerNumber,
                        roomCode: this.roomCode
                    });
                }
                
                if (message.type === 'START_GAME') {
                    console.log('START_GAME message structure:', {
                        hasGameState: !!message.gameState,
                        hasWords: !!(message.gameState && message.gameState.words),
                        wordsLength: message.gameState && message.gameState.words ? message.gameState.words.length : 'N/A',
                        wordsType: message.gameState && message.gameState.words ? typeof message.gameState.words : 'N/A',
                        isWordsArray: message.gameState && message.gameState.words ? Array.isArray(message.gameState.words) : 'N/A'
                    });
                }
                
                this.ws.send(jsonMessage);
                console.log('✅ Message sent successfully:', message.type);
            } catch (error) {
                console.error('❌ Error sending message:', error);
                console.error('Message that failed:', message);
                alert('Error sending message to server: ' + error.message);
            }
        } else {
            const state = this.ws ? this.ws.readyState : 'no ws object';
            const stateNames = {
                0: 'CONNECTING',
                1: 'OPEN',
                2: 'CLOSING',
                3: 'CLOSED'
            };
            console.error('WebSocket not connected. State:', state, stateNames[state] || 'UNKNOWN');
            
            // Try to reconnect if not already connecting
            if (!this.ws || this.ws.readyState !== WebSocket.CONNECTING) {
                console.log('Attempting to reconnect...');
                this.connectWebSocket();
                // Queue the message to send after reconnection
                setTimeout(() => {
                    if (this.wsConnected) {
                        this.sendWebSocketMessage(message);
                    } else {
                        this.pendingActions.push(() => this.sendWebSocketMessage(message));
                    }
                }, 500);
            } else {
                // Connection in progress, queue the message
                this.pendingActions.push(() => this.sendWebSocketMessage(message));
            }
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'ROOM_CREATED':
                console.log('ROOM_CREATED message received:', data);
                if (!data.roomCode) {
                    console.error('ERROR: Room code missing in ROOM_CREATED message!', data);
                    alert('Error: Room code not received from server. Please try again.');
                    return;
                }
                this.roomCode = data.roomCode;
                this.playerId = data.playerId;
                this.playerNumber = data.playerNumber || 1;
                this.isHost = true;
                console.log('Room created! Code:', this.roomCode, 'Player ID:', this.playerId);
                this.updateRoomUI();
                // Show score display in multiplayer mode
                const playerScoresDisplay = document.getElementById('playerScoresDisplay');
                if (playerScoresDisplay) {
                    playerScoresDisplay.classList.remove('hidden');
                }
                // Initialize and display player scores
                this.playerScores = { 1: 0, 2: 0 };
                this.updatePlayerStats();
                break;

            case 'ROOM_JOINED':
                this.roomCode = data.roomCode;
                this.playerId = data.playerId;
                this.playerNumber = data.playerNumber;
                this.isHost = false;
                this.updateRoomUI();
                // Show score display in multiplayer mode
                document.getElementById('playerScoresDisplay').classList.remove('hidden');
                // Initialize player scores
                if (data.gameState && data.gameState.playerScores) {
                    this.playerScores = { ...data.gameState.playerScores };
                } else {
                    this.playerScores = { 1: 0, 2: 0 };
                }
                this.updatePlayerStats();
                
                // Sync game state if game already started
                if (data.gameState && data.gameState.gameStarted) {
                    this.syncGameState(data.gameState);
                }
                break;

            case 'PLAYER_JOINED':
                this.updatePlayersCount(2);
                if (this.isHost) {
                    alert(`Player ${data.playerNumber} joined the room!`);
                }
                break;

            case 'PLAYER_DISCONNECTED':
                this.updatePlayersCount(1);
                alert(`Player ${data.playerNumber} disconnected`);
                break;

            case 'PLAYER_LEFT':
                this.updatePlayersCount(data.playersRemaining || 1);
                alert(`A player left the room. Players remaining: ${data.playersRemaining || 1}`);
                break;

            case 'ERROR':
                console.error('Server error:', data.message);
                alert(`Error: ${data.message}`);
                break;

            case 'GAME_CONFIG_UPDATED':
                // Game config updated by host
                break;

            case 'GAME_STARTED':
                console.log('Received GAME_STARTED message', data);
                
                // IMPORTANT: In multiplayer mode, if this player has already advanced to a higher level,
                // ignore GAME_STARTED messages that would reset them back (unless it's the initial game start)
                if (this.playerMode === 'multiplayer' && this.playerNumber && this.playerLevels) {
                    const myCurrentLevel = this.playerLevels[this.playerNumber] || 1;
                    const serverLevel = data.gameConfig?.currentLevel || data.currentLevel || 1;
                    
                    // If this player is already on a higher level than what the server is sending,
                    // this GAME_STARTED is probably from another player completing their level
                    // Don't process it - keep this player on their current level
                    if (myCurrentLevel > serverLevel && serverLevel > 1) {
                        console.log(`Player ${this.playerNumber} ignoring GAME_STARTED - already on level ${myCurrentLevel}, server sent level ${serverLevel}`);
                        console.log('This GAME_STARTED is likely from another player - preserving independent progression');
                        break; // Don't process this message
                    }
                }
                
                // Receive game config and use the same puzzle (grid) for all players
                if (data.gameConfig) {
                    console.log('Processing gameConfig:', data.gameConfig);
                    // Set game configuration
                    this.words = data.gameConfig.words;
                    this.gridSize = data.gameConfig.gridSize || 15;
                    this.currentMode = data.gameConfig.mode || 'random';
                    this.difficulty = data.gameConfig.difficulty || 'medium';
                    this.customWords = data.gameConfig.customWords || [];
                    this.currentLevel = data.gameConfig.currentLevel || 1;
                    // Initialize player scores - ensure both players have scores
                    this.playerScores = data.gameConfig.playerScores || { 1: 0, 2: 0 };
                    // Ensure scores are numbers
                    this.playerScores[1] = Number(this.playerScores[1]) || 0;
                    this.playerScores[2] = Number(this.playerScores[2]) || 0;
                    console.log('🎮 Initialized player scores:', this.playerScores);
                    this.foundWords = new Set();
                    this.playerFoundWords = { 1: new Set(), 2: new Set() };
                    this.currentPlayer = 1;
                    // Only initialize player levels on the very first game start (level 1)
                    // Don't reset if players have already progressed to higher levels
                    if (!this.playerLevels || (data.gameConfig.currentLevel === 1 && this.playerLevels[1] === 1 && this.playerLevels[2] === 1)) {
                        this.playerLevels = { 1: 1, 2: 1 };
                    } else {
                        // Preserve existing player levels - each player progresses independently
                        // Only update the current player's level if this is their first game
                        if (!this.playerLevels[this.playerNumber] || this.playerLevels[this.playerNumber] === 1) {
                            // Keep existing levels for both players
                            console.log(`Preserving player levels: Player 1 = ${this.playerLevels[1]}, Player 2 = ${this.playerLevels[2]}`);
                        }
                    }
                    
                    // Use the grid from server so both players see the same puzzle
                    if (data.gameConfig.grid && Array.isArray(data.gameConfig.grid) && data.gameConfig.grid.length > 0) {
                        console.log('Using grid from server for player', this.playerNumber);
                        this.grid = data.gameConfig.grid.map(row => 
                            row.map(cell => ({
                                ...cell,
                                found: false // Reset found status for new game
                            }))
                        );
                    } else {
                        console.warn('No grid in gameConfig, generating own puzzle');
                        // Fallback: generate own puzzle if grid not provided
                        this.createGrid();
                        this.placeWords();
                        this.fillEmptySpaces();
                    }
                    
                    // Rebuild placedWords array from grid for hints to work
                    this.placedWords = [];
                    if (this.grid && this.words) {
                        for (let wordIndex = 0; wordIndex < this.words.length; wordIndex++) {
                            const word = this.words[wordIndex];
                            const wordCells = [];
                            for (let i = 0; i < this.gridSize; i++) {
                                for (let j = 0; j < this.gridSize; j++) {
                                    if (this.grid[i] && this.grid[i][j] && this.grid[i][j].wordIndex === wordIndex) {
                                        wordCells.push({ row: i, col: j });
                                    }
                                }
                            }
                            if (wordCells.length > 0) {
                                this.placedWords[wordIndex] = {
                                    word: word,
                                    cells: wordCells
                                };
                            }
                        }
                    }
                    
                    this.renderGrid();
                    this.renderWordsList();
                    this.updateStats();
                    this.updatePlayerStats();
                    this.updatePlayerTurnIndicator();
                    
                    // Hide start overlay and remove blur
                    const startOverlay = document.getElementById('startOverlay');
                    const grid = document.getElementById('grid');
                    if (startOverlay) {
                        startOverlay.classList.add('hidden');
                    }
                    if (grid) {
                        grid.classList.remove('blurred');
                    }
                    
                    console.log('Puzzle displayed for player', this.playerNumber);
                } else {
                    console.warn('No gameConfig in GAME_STARTED, using fallback');
                    // Fallback to old format for compatibility
                    this.syncGameState(data.gameState);
                }
                
                this.gameStarted = true;
                // Use server-synchronized timer start time (cumulative - don't reset if already set)
                if (data.levelStartTime) {
                    // Only set if not already set (first level) or if explicitly reset
                    if (!this.levelStartTime || data.currentLevel === 1) {
                        this.levelStartTime = data.levelStartTime;
                        console.log('Timer start time set:', new Date(this.levelStartTime).toLocaleTimeString());
                    } else {
                        console.log('Timer continuing from:', new Date(this.levelStartTime).toLocaleTimeString());
                    }
                }
                // IMPORTANT: Don't update currentLevel from server in multiplayer mode
                // Each player has their own level progression
                // Only update if it's the initial game start (level 1) or in single player mode
                if (this.playerMode !== 'multiplayer') {
                    if (data.currentLevel) {
                        this.currentLevel = data.currentLevel;
                    }
                } else {
                    // In multiplayer, use this player's own level, not the server's
                    // The server's currentLevel might be from another player
                    const myLevel = this.playerLevels[this.playerNumber] || this.currentLevel || 1;
                    this.currentLevel = myLevel;
                    console.log(`Player ${this.playerNumber} using their own level: ${myLevel} (not server's level ${data.currentLevel || 'N/A'})`);
                }
                
                // Show words-to-find section in full width for both players when game starts
                this.showWordsSection();
                
                // Restart timer countdown (but using existing levelStartTime for cumulative time)
                this.startTimer();
                console.log('Game started for player', this.playerNumber, 'at level', this.currentLevel);
                break;

            case 'LEVEL_COMPLETE':
                // Level completed - advance to next level
                if (data.nextLevel) {
                    this.currentLevel = data.nextLevel;
                }
                if (data.playerScores) {
                    this.playerScores = data.playerScores;
                }
                this.newGame();
                // Auto-start next level
                setTimeout(() => {
                    if (this.isHost) {
                        this.startGame();
                    }
                }, 2000);
                break;

            case 'TIME_UP':
                // Time's up - show message and update scores
                if (data.playerScores) {
                    this.playerScores = data.playerScores;
                    this.updatePlayerStats();
                }
                this.handleLevelTimeUp();
                break;

            case 'GAME_OVER':
                // Game over - show winner based on server calculation
                console.log('GAME_OVER received:', data);
                // Ensure game is stopped
                this.gameStarted = false;
                clearInterval(this.levelTimerInterval);
                
                // Update scores from server (authoritative source)
                if (data.playerScores) {
                    this.playerScores = {
                        1: data.playerScores[1] || data.playerScores.player1 || 0,
                        2: data.playerScores[2] || data.playerScores.player2 || 0
                    };
                    console.log('📊 Final scores from server:', this.playerScores);
                    this.updatePlayerStats();
                }
                
                // Display Walrus upload result
                if (data.walrus) {
                    console.log('📦 Walrus Upload Result:', data.walrus);
                    if (data.walrus.uploaded && data.walrus.blobId) {
                        console.log('✅ Game result uploaded to Walrus!');
                        console.log('🔗 Blob ID:', data.walrus.blobId);
                        console.log('🌐 View at:', data.walrus.aggregatorUrl);
                        
                        // Store Walrus info for display
                        this.walrusBlobId = data.walrus.blobId;
                        this.walrusUrl = data.walrus.aggregatorUrl;
                    } else {
                        console.warn('⚠️ Walrus upload failed or incomplete');
                    }
                }
                
                // Use server-determined winner (0 = tie, 1 = player 1, 2 = player 2)
                // Server calculates based on highest score
                const winner = data.winner !== undefined ? data.winner : 0;
                console.log('🏆 Winner from server:', winner === 0 ? 'Tie' : `Player ${winner}`);
                this.showGameOverModal(winner, data.walrus);
                break;

            case 'WORD_FOUND':
                // Word found by any player - update scores immediately for both players
                console.log('📢 WORD_FOUND received:', {
                    foundBy: data.playerNumber,
                    myNumber: this.playerNumber,
                    scores: data.playerScores,
                    wordIndex: data.wordIndex,
                    isMyWord: data.playerNumber === this.playerNumber
                });
                
                // Update scores from server (authoritative source) - CRITICAL for synchronization
                if (data.playerScores) {
                    // Store old scores for comparison
                    const oldScores = { ...this.playerScores };
                    
                    // Ensure scores are properly formatted as numbers
                    this.playerScores = {
                        1: Number(data.playerScores[1]) || Number(data.playerScores.player1) || 0,
                        2: Number(data.playerScores[2]) || Number(data.playerScores.player2) || 0
                    };
                    
                    console.log('✅ Scores updated from server:', {
                        old: oldScores,
                        new: this.playerScores,
                        changed: oldScores[1] !== this.playerScores[1] || oldScores[2] !== this.playerScores[2]
                    });
                } else {
                    console.warn('⚠️ WORD_FOUND received but no playerScores in data:', data);
                }
                
                // Mark word as found in the word list (for both players to see)
                if (typeof data.wordIndex !== 'undefined') {
                    // Only mark if not already found (prevent duplicate marking)
                    if (!this.foundWords.has(data.wordIndex)) {
                        this.foundWords.add(data.wordIndex);
                        // Update word list display
                        this.markWordAsFound(data.wordIndex);
                    }
                    
                    // Track which player found which word
                    if (data.playerNumber) {
                        this.playerFoundWords[data.playerNumber].add(data.wordIndex);
                    }
                }
                
                // Mark cells on grid if cell data is provided
                // This allows both players to see where words were found
                if (data.cells && Array.isArray(data.cells) && data.cells.length > 0) {
                    const isMyWord = data.playerNumber === this.playerNumber;
                    
                    data.cells.forEach(({ row, col }) => {
                        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                        if (cell) {
                            // Mark cell as found
                            cell.classList.add('found');
                            // Add player-specific styling
                            if (data.playerNumber) {
                                cell.classList.add(`player-${data.playerNumber}-found`);
                            }
                            // Update grid data
                            if (this.grid[row] && this.grid[row][col]) {
                                this.grid[row][col].found = true;
                            }
                        }
                    });
                    
                    console.log(`✅ Marked ${data.cells.length} cells as found (found by player ${data.playerNumber})`);
                }
                
                // Clear pending word if this is our own word (server confirmed it)
                if (data.playerNumber === this.playerNumber && this.pendingWordFound) {
                    console.log('✅ Server confirmed our word find - clearing pending');
                    this.pendingWordFound = null;
                }
                
                // If the found word was the current hint word, reset hint tracking
                if (this.currentHintWordIndex === data.wordIndex) {
                    this.currentHintWordIndex = -1;
                    this.clearHints();
                }
                
                // CRITICAL: Update UI immediately - this ensures both players see updated scores
                this.updateStats();
                this.updatePlayerStats();
                
                // Force UI update with animation to show score change
                if (data.playerNumber) {
                    this.animateScoreUpdate(data.playerNumber);
                }
                
                // Check if current player has completed their level
                // Each player advances independently
                this.checkWinCondition();
                break;

            case 'PLAYER_LEVEL_COMPLETE':
                // Another player completed their level - just update scores
                if (data.playerScores) {
                    this.playerScores = data.playerScores;
                    this.updatePlayerStats();
                }
                // Note: Each player advances independently, so we don't need to do anything else
                break;

            case 'NEW_GAME_STARTED':
                // Don't call newGame() again - it would regenerate words
                // Just sync the state if needed
                if (data.gameState) {
                    // Preserve our local words if we have them
                    if (this.words && this.words.length > 0 && (!data.gameState.words || data.gameState.words.length === 0)) {
                        console.log('Preserving local words, not syncing empty words from server');
                    } else if (data.gameState.words && data.gameState.words.length > 0) {
                        this.words = data.gameState.words;
                    }
                    // Sync other state
                    if (data.gameState.gridSize) this.gridSize = data.gameState.gridSize;
                    if (data.gameState.mode) this.currentMode = data.gameState.mode;
                    if (data.gameState.difficulty) this.difficulty = data.gameState.difficulty;
                }
                break;

            case 'GAME_WON':
                this.handleGameWon(data);
                break;

            case 'ERROR':
                // Only show alert for important errors, not for unknown message types
                if (data.message && !data.message.includes('Unknown message type')) {
                    alert('Error: ' + data.message);
                } else {
                    console.warn('Server error:', data.message);
                }
                break;

            case 'HOST_CHANGED':
                if (data.newHostId === this.playerId) {
                    this.isHost = true;
                    alert('You are now the host');
                }
                break;

            default:
                // Handle unknown message types gracefully
                console.warn('Unknown message type received:', data.type, data);
                // Don't show alert for unknown types - just log it
                break;
        }
    }

    createRoom() {
        // Reset game state for new room
        this.currentLevel = 1;
        this.playerScores = { 1: 0, 2: 0 };
        this.playerFoundWords = { 1: new Set(), 2: new Set() };
        
        const createRoomAction = () => {
            this.playerId = this.playerId || `player_${Date.now()}_${Math.random()}`;
            console.log('Creating room with playerId:', this.playerId);
            const message = {
                type: 'CREATE_ROOM',
                playerId: this.playerId,
                playerName: 'Player 1'
            };
            console.log('Sending CREATE_ROOM message:', message);
            this.sendWebSocketMessage(message);
        };

        // Check WebSocket connection state
        if (!this.ws) {
            // No WebSocket object - connect first
            console.log('No WebSocket connection, connecting...');
            this.connectWebSocket();
            this.pendingActions.push(createRoomAction);
        } else if (this.ws.readyState === WebSocket.CONNECTING) {
            // Connection in progress - queue the action
            console.log('WebSocket connecting, queuing create room action...');
            this.pendingActions.push(createRoomAction);
        } else if (this.ws.readyState === WebSocket.OPEN && this.wsConnected) {
            // Connected - execute immediately
            console.log('WebSocket connected, creating room...');
            createRoomAction();
        } else {
            // Connection closed or error - try to reconnect
            console.log('WebSocket not open, reconnecting...');
            this.wsConnected = false;
            this.connectWebSocket();
            this.pendingActions.push(createRoomAction);
        }
    }

    joinRoom() {
        const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
        if (!roomCode || roomCode.length !== 6) {
            alert('Please enter a valid 6-character room code');
            return;
        }

        const joinRoomAction = () => {
            this.sendWebSocketMessage({
                type: 'JOIN_ROOM',
                roomCode: roomCode,
                playerId: this.playerId || `player_${Date.now()}_${Math.random()}`,
                playerName: 'Player 2'
            });
        };

        if (!this.wsConnected) {
            this.connectWebSocket();
            // Queue the action to execute when connection opens
            this.pendingActions.push(joinRoomAction);
        } else {
            joinRoomAction();
        }
    }

    leaveRoom() {
        // Close/leave the room
        console.log('Leaving room...');
        this.disconnectWebSocket();
        document.getElementById('roomCodeInput').value = '';
        
        // Hide room info
        const roomInfo = document.getElementById('roomInfo');
        if (roomInfo) {
            roomInfo.classList.add('hidden');
        }
        
        // Reset game state
        this.currentLevel = 1;
        this.playerScores = { 1: 0, 2: 0 };
        this.playerFoundWords = { 1: new Set(), 2: new Set() };
        this.playerLevels = { 1: 1, 2: 1 }; // Reset player levels
        this.roomCode = null;
        this.isHost = false;
        this.playerNumber = null;
        
        // Hide score display
        const playerScoresDisplay = document.getElementById('playerScoresDisplay');
        if (playerScoresDisplay) {
            playerScoresDisplay.classList.add('hidden');
        }
        
        // Reset connection status
        this.updateConnectionStatus('disconnected', 'Disconnected');
        
        // Clear grid and reset UI
        const grid = document.getElementById('grid');
        if (grid) {
            grid.innerHTML = '';
            grid.classList.add('blurred');
        }
        
        const wordsList = document.getElementById('wordsList');
        if (wordsList) {
            wordsList.innerHTML = '';
        }
        
        // Hide words section
        this.hideWordsSection();
        
        // Show start overlay
        this.showStartOverlay();
        
        console.log('Room left successfully');
    }
    
    /**
     * Reset game for a new round (Play Again)
     */
    resetGameForNewRound() {
        console.log('Resetting game for new round...');
        
        // Hide words section
        this.hideWordsSection();
        
        // Reset game state
        this.currentLevel = 1;
        this.playerScores = { 1: 0, 2: 0 };
        this.playerFoundWords = { 1: new Set(), 2: new Set() };
        this.playerLevels = { 1: 1, 2: 1 }; // Reset player levels
        this.foundWords.clear();
        this.totalGameTime = 0;
        this.levelStartTime = null;
        
        // Clear timers
        if (this.levelTimerInterval) {
            clearInterval(this.levelTimerInterval);
        }
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Reset timer display
        document.getElementById('timer').textContent = '00:00';
        
        // If host, automatically trigger New Game
        if (this.isHost && this.wsConnected) {
            console.log('Host: Starting new game...');
            // Small delay to ensure modal is closed
            setTimeout(() => {
                this.newGame();
            }, 300);
        } else if (!this.isHost) {
            // Non-host waits for host to start
            console.log('Waiting for host to start new game...');
            this.showStartOverlay();
        } else {
            // Not connected - just reset UI
            this.newGame();
        }
    }

    updateRoomUI() {
        console.log('updateRoomUI called with roomCode:', this.roomCode);
        const roomCodeDisplay = document.getElementById('roomCodeDisplay');
        const roomInfo = document.getElementById('roomInfo');
        
        if (roomCodeDisplay) {
            roomCodeDisplay.textContent = this.roomCode || '-';
            console.log('Room code displayed:', this.roomCode);
        } else {
            console.error('roomCodeDisplay element not found!');
        }
        
        if (roomInfo) {
            roomInfo.classList.remove('hidden');
        } else {
            console.error('roomInfo element not found!');
        }
        
        const roomCodeInput = document.getElementById('roomCodeInput');
        if (roomCodeInput) {
            roomCodeInput.value = '';
        }
        
        this.updatePlayersCount(this.playerNumber === 1 ? 1 : 2);
    }

    updatePlayersCount(count) {
        const playersCountEl = document.getElementById('playersCount');
        if (playersCountEl) playersCountEl.textContent = `${count}/2`;

        // Disable Start button for non-hosts or until there are 2 players
        try {
            const startBtn = document.getElementById('startBtn');
            if (startBtn) {
                const shouldEnable = this.isHost && count >= 2;
                startBtn.disabled = !shouldEnable;
                // Add subtle visual cue
                if (shouldEnable) startBtn.classList.remove('disabled'); else startBtn.classList.add('disabled');
                console.log('Start button', shouldEnable ? 'enabled' : 'disabled', '(isHost=', this.isHost, ', players=', count, ')');
            }
        } catch (e) {
            console.warn('Could not update Start button state:', e);
        }
    }

    syncGameState(gameState) {
        // Sync grid
        if (gameState.grid && gameState.grid.length > 0) {
            this.grid = gameState.grid.map(row => 
                row.map(cell => ({
                    ...cell,
                    found: cell.found || false
                }))
            );
        }

        // Sync words
        if (gameState.words) {
            this.words = gameState.words;
        }

        // Sync found words
        if (gameState.foundWords) {
            this.foundWords = new Set(gameState.foundWords);
        }

        // Sync player scores
        if (gameState.playerScores) {
            this.playerScores = { ...gameState.playerScores };
        }

        // Sync player found words
        if (gameState.playerFoundWords) {
            this.playerFoundWords = {
                1: new Set(gameState.playerFoundWords[1] || []),
                2: new Set(gameState.playerFoundWords[2] || [])
            };
        }

        // Sync current player
        if (gameState.currentPlayer) {
            this.currentPlayer = gameState.currentPlayer;
        }

        // Sync game started state
        if (gameState.gameStarted !== undefined) {
            this.gameStarted = gameState.gameStarted;
        }

        // Sync grid size and other config
        if (gameState.gridSize) {
            this.gridSize = gameState.gridSize;
        }
        if (gameState.mode) {
            this.currentMode = gameState.mode;
        }
        if (gameState.difficulty) {
            this.difficulty = gameState.difficulty;
        }
        if (gameState.currentLevel) {
            this.currentLevel = gameState.currentLevel;
        }

        // Re-render UI
        this.renderGrid();
        this.renderWordsList();
        this.updateStats();
        this.updatePlayerStats();
        this.updatePlayerTurnIndicator();
        
        // Update start overlay if game not started
        if (!this.gameStarted) {
            this.showStartOverlay();
        } else {
            const startOverlay = document.getElementById('startOverlay');
            const grid = document.getElementById('grid');
            startOverlay.classList.add('hidden');
            grid.classList.remove('blurred');
        }
    }

    handleRemoteWordFound(data) {
        const { wordIndex, playerScores } = data;

        // Mark word as found in our tracking (for score display)
        // Note: We don't mark cells since each player has their own puzzle
        this.foundWords.add(wordIndex);
        this.playerFoundWords[data.playerNumber].add(wordIndex);
        this.playerScores = playerScores;

        // Update UI - mark word in word list but don't modify grid
        // (Each player has their own puzzle, so we can't mark cells from other player's grid)
        this.markWordAsFound(wordIndex);
        this.updateStats();
        this.updatePlayerStats();

        // Win condition is handled by server and sent via levelComplete flag
        // No need to check here since server tracks combined progress
    }

    handleGameWon(data) {
        clearInterval(this.timerInterval);
        this.playerScores = data.playerScores;
        
        const player1Score = data.playerScores[1];
        const player2Score = data.playerScores[2];
        
        document.getElementById('finalPlayer1Score').textContent = player1Score;
        document.getElementById('finalPlayer2Score').textContent = player2Score;
        
        let winnerText = '';
        if (data.winner === 0) {
            winnerText = "It's a Tie! 🤝";
        } else if (data.winner === this.playerNumber) {
            winnerText = 'You Win! 🎉';
        } else {
            winnerText = 'You Lost! 😔';
        }
        
        document.getElementById('winTitle').textContent = winnerText;
        document.getElementById('winMessage').textContent = 'All words have been found!';
        document.getElementById('winStats').classList.add('hidden');
        document.getElementById('playerWinStats').classList.remove('hidden');
        
        setTimeout(() => {
            document.getElementById('winModal').classList.remove('hidden');
        }, 500);
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new FindWordsGame();
});
