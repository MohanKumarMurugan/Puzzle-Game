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
        
        // Multiplayer mode properties (only mode available)
        this.playerMode = 'multiplayer'; // Only multiplayer mode
        this.currentPlayer = 1; // 1 or 2
        this.playerScores = { 1: 0, 2: 0 };
        this.playerFoundWords = { 1: new Set(), 2: new Set() };
        
        // Level system properties
        this.currentLevel = 1; // 1 = Easy, 2 = Medium, 3 = Hard
        this.levelDifficulties = ['easy', 'medium', 'hard'];
        this.levelTimeLimit = 120; // 2 minutes in seconds
        this.levelTimer = null; // Countdown timer
        this.levelStartTime = null; // Server-synchronized start time
        this.levelTimerInterval = null;
        
        // Multiplayer WebSocket properties
        this.ws = null;
        this.roomCode = null;
        this.playerId = null;
        this.playerNumber = null;
        this.isHost = false;
        this.wsConnected = false;
        this.wsServerUrl = 'ws://localhost:3000';
        this.pendingActions = []; // Queue for actions pending WebSocket connection
        
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
        // Auto-set multiplayer mode
        this.setPlayerMode('multiplayer');
        // Don't auto-start game, wait for room creation
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Player mode selection (only multiplayer available)
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
        
        // Modal
        document.getElementById('playAgain').addEventListener('click', () => {
            document.getElementById('winModal').classList.add('hidden');
            this.newGame();
        });

        // Grid interaction will be bound dynamically when grid is created
    }

    /**
     * Set player mode (only multiplayer available)
     */
    setPlayerMode(mode) {
        this.playerMode = 'multiplayer'; // Force multiplayer mode
        
        // Update UI
        document.getElementById('multiplayerMode').classList.add('active');
        document.getElementById('multiplayerPanel').classList.remove('hidden');
        
        // Show player stats
        const playerStats = document.getElementById('playerStats');
        playerStats.classList.remove('hidden');
        
        // Show player scores display above game box
        document.getElementById('playerScoresDisplay').classList.remove('hidden');
        
        // Hide buttons that shouldn't be visible in multiplayer
        // (Already handled by multiplayer-hidden class in HTML)
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
        
        // Stop existing timers
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        if (this.levelTimerInterval) {
            clearInterval(this.levelTimerInterval);
        }
        
        // Set difficulty based on current level
        this.difficulty = this.levelDifficulties[this.currentLevel - 1];
        
        // Try to update difficulty selector if it exists (may be hidden in multiplayer)
        const difficultySelect = document.getElementById('difficulty');
        if (difficultySelect) {
            difficultySelect.value = this.difficulty;
        }
        
        // Generate words based on current level difficulty
        this.generateRandomWords();
        
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
     */
    generateRandomWords() {
        // Use words from current difficulty level
        const levelWords = this.wordLists[this.difficulty] || this.wordLists.medium;
        
        // Debug logging
        console.log('generateRandomWords - difficulty:', this.difficulty);
        console.log('generateRandomWords - levelWords:', levelWords);
        
        if (!levelWords || levelWords.length === 0) {
            console.error('No words found for difficulty:', this.difficulty);
            this.words = [];
            return;
        }
        
        // Select 8 words for the level (or all if less than 8)
        const numWords = Math.min(8, levelWords.length);
        this.words = [];
        
        const shuffled = [...levelWords].sort(() => Math.random() - 0.5);
        for (let i = 0; i < numWords; i++) {
            this.words.push(shuffled[i]);
        }
        
        console.log('Generated', this.words.length, 'words:', this.words);
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
            
            // Handle 2-player mode scoring (local or multiplayer)
            if (this.playerMode === 'two' || this.playerMode === 'multiplayer') {
                const currentPlayerForScoring = this.playerMode === 'multiplayer' ? this.playerNumber : this.currentPlayer;
                this.playerFoundWords[currentPlayerForScoring].add(foundWordIndex);
                this.playerScores[currentPlayerForScoring]++;
                this.updatePlayerStats();
                
                // Switch to next player (only in local 2-player mode)
                if (this.playerMode === 'two') {
                    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                    this.updatePlayerTurnIndicator();
                }
            }
            
            // If the found word was the current hint word, reset hint tracking
            if (this.currentHintWordIndex === foundWordIndex) {
                this.currentHintWordIndex = -1;
                this.clearHints();
            }
            
            // Send to server if multiplayer
            if (this.playerMode === 'multiplayer' && this.wsConnected) {
                this.sendWebSocketMessage({
                    type: 'WORD_FOUND',
                    wordIndex: foundWordIndex,
                    cells: this.selectedCells
                });
            }
            
            this.updateStats();
            // Win condition is handled by server in multiplayer mode
            // Only check locally for single-player mode
            if (this.playerMode !== 'multiplayer') {
                this.checkWinCondition();
            }
            
            // Animate found cells with player color in 2-player mode
            this.selectedCells.forEach(({ row, col }) => {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    setTimeout(() => {
                        cell.classList.add('found');
                        if (this.playerMode === 'two' || this.playerMode === 'multiplayer') {
                            const playerNum = this.playerMode === 'multiplayer' ? this.playerNumber : (this.currentPlayer === 1 ? 2 : 1);
                            cell.classList.add(`player-${playerNum}-found`);
                        }
                    }, 100);
                }
                this.grid[row][col].found = true;
            });
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
        
        this.levelTimer = this.levelTimeLimit; // 2 minutes in seconds
        
        this.levelTimerInterval = setInterval(() => {
            if (this.levelStartTime) {
                // Calculate elapsed time from server-synchronized start
                const elapsed = Math.floor((Date.now() - this.levelStartTime) / 1000);
                const remaining = Math.max(0, this.levelTimeLimit - elapsed);
                
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
                this.levelTimer--;
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
        
        // End current level - determine if game continues or ends
        if (this.currentLevel < 3) {
            // Move to next level
            this.advanceToNextLevel();
        } else {
            // Game over - all levels completed
            this.endGame();
        }
    }

    advanceToNextLevel() {
        // Move to next level
        this.currentLevel++;
        
        // Notify server if host
        if (this.playerMode === 'multiplayer' && this.isHost && this.wsConnected) {
            this.sendWebSocketMessage({
                type: 'LEVEL_COMPLETE',
                currentLevel: this.currentLevel - 1,
                nextLevel: this.currentLevel,
                playerScores: this.playerScores
            });
        }
        
        // Start next level
        this.newGame();
        
        // Auto-start next level after a brief delay
        setTimeout(() => {
            if (this.isHost) {
                this.startGame();
            }
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
        
        // Notify server if host
        if (this.playerMode === 'multiplayer' && this.isHost && this.wsConnected) {
            this.sendWebSocketMessage({
                type: 'GAME_OVER',
                playerScores: this.playerScores,
                winner: winner
            });
        }
        
        // Show win modal
        this.showGameOverModal(winner);
    }

    showGameOverModal(winner) {
        document.getElementById('finalPlayer1Score').textContent = this.playerScores[1];
        document.getElementById('finalPlayer2Score').textContent = this.playerScores[2];
        
        let winnerText = '';
        if (winner === 0) {
            winnerText = "It's a Tie! 🤝";
        } else if (winner === this.playerNumber) {
            winnerText = 'You Win! 🎉';
        } else {
            winnerText = 'You Lost! 😔';
        }
        
        document.getElementById('winTitle').textContent = winnerText;
        document.getElementById('winMessage').textContent = 'All levels completed!';
        document.getElementById('winStats').classList.add('hidden');
        document.getElementById('playerWinStats').classList.remove('hidden');
        
        setTimeout(() => {
            document.getElementById('winModal').classList.remove('hidden');
        }, 500);
    }

    /**
     * Show start overlay and blur grid
     */
    showStartOverlay() {
        const startOverlay = document.getElementById('startOverlay');
        const grid = document.getElementById('grid');
        
        startOverlay.classList.remove('hidden');
        grid.classList.add('blurred');
        
        // Reset timer displays
        document.getElementById('timer').textContent = '00:00';
        document.getElementById('gameTimer').textContent = '00:00';
    }

    /**
     * Start the game
     */
    startGame() {
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
            startOverlay.classList.add('hidden');
            grid.classList.remove('blurred');
            this.startTimer();
        }
    }

    /**
     * Check if player has won
     */
    checkWinCondition() {
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
    
    /**
     * Update player stats display
     */
    updatePlayerStats() {
        if (this.playerMode === 'two' || this.playerMode === 'multiplayer') {
            document.getElementById('player1Score').textContent = this.playerScores[1];
            document.getElementById('player2Score').textContent = this.playerScores[2];
            
            // Update score display above game box (multiplayer)
            if (this.playerMode === 'multiplayer') {
                document.getElementById('player1PointsDisplay').textContent = this.playerScores[1];
                document.getElementById('player2PointsDisplay').textContent = this.playerScores[2];
            }
            
            this.updatePlayerTurnIndicator();
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
                console.log('WebSocket connected');
                
                // Execute any pending actions
                while (this.pendingActions.length > 0) {
                    const action = this.pendingActions.shift();
                    if (action && typeof action === 'function') {
                        action();
                    }
                }
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
                console.log('Sending WebSocket message type:', message.type);
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
                console.log('Message sent successfully');
            } catch (error) {
                console.error('Error stringifying message:', error);
                console.error('Message that failed:', message);
                alert('Error sending message to server: ' + error.message);
            }
        } else {
            console.error('WebSocket not connected. State:', this.ws ? this.ws.readyState : 'no ws object');
            alert('Not connected to server. Please check your connection.');
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'ROOM_CREATED':
                this.roomCode = data.roomCode;
                this.playerId = data.playerId;
                this.playerNumber = data.playerNumber;
                this.isHost = true;
                this.updateRoomUI();
                // Show score display in multiplayer mode
                document.getElementById('playerScoresDisplay').classList.remove('hidden');
                break;

            case 'ROOM_JOINED':
                this.roomCode = data.roomCode;
                this.playerId = data.playerId;
                this.playerNumber = data.playerNumber;
                this.isHost = false;
                this.updateRoomUI();
                // Show score display in multiplayer mode
                document.getElementById('playerScoresDisplay').classList.remove('hidden');
                
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

            case 'GAME_CONFIG_UPDATED':
                // Game config updated by host
                break;

            case 'GAME_STARTED':
                console.log('Received GAME_STARTED message', data);
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
                    this.playerScores = data.gameConfig.playerScores || { 1: 0, 2: 0 };
                    this.foundWords = new Set();
                    this.playerFoundWords = { 1: new Set(), 2: new Set() };
                    this.currentPlayer = 1;
                    
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
                // Use server-synchronized timer start time
                if (data.levelStartTime) {
                    this.levelStartTime = data.levelStartTime;
                }
                if (data.currentLevel) {
                    this.currentLevel = data.currentLevel;
                }
                this.startTimer();
                console.log('Game started for player', this.playerNumber);
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

            case 'GAME_OVER':
                // Game over - show winner
                if (data.playerScores) {
                    this.playerScores = data.playerScores;
                }
                this.showGameOverModal(data.winner);
                break;

            case 'WORD_FOUND':
                // Word found by any player (both players play simultaneously)
                // Update scores regardless of who found it
                if (data.playerScores) {
                    this.playerScores = data.playerScores;
                }
                
                if (data.playerNumber !== this.playerNumber) {
                    // Another player found a word - update scores and stats
                    // Note: We don't mark cells in our grid since each player has their own puzzle
                    this.updatePlayerStats();
                } else {
                    // We found a word - scores already updated locally, just sync with server
                    this.updatePlayerStats();
                }
                
                // Check if level is complete (combined from both players)
                if (data.levelComplete) {
                    this.checkWinCondition();
                }
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
                alert('Error: ' + data.message);
                break;

            case 'HOST_CHANGED':
                if (data.newHostId === this.playerId) {
                    this.isHost = true;
                    alert('You are now the host');
                }
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
            this.sendWebSocketMessage({
                type: 'CREATE_ROOM',
                playerId: this.playerId,
                playerName: 'Player 1'
            });
        };

        if (!this.wsConnected) {
            this.connectWebSocket();
            // Queue the action to execute when connection opens
            this.pendingActions.push(createRoomAction);
        } else {
            createRoomAction();
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
        this.disconnectWebSocket();
        document.getElementById('roomCodeInput').value = '';
        // Reset level
        this.currentLevel = 1;
        this.playerScores = { 1: 0, 2: 0 };
        this.playerFoundWords = { 1: new Set(), 2: new Set() };
        // Don't start new game - wait for room creation
    }

    updateRoomUI() {
        document.getElementById('roomCodeDisplay').textContent = this.roomCode;
        document.getElementById('roomInfo').classList.remove('hidden');
        document.getElementById('roomCodeInput').value = '';
        this.updatePlayersCount(this.playerNumber === 1 ? 1 : 2);
    }

    updatePlayersCount(count) {
        document.getElementById('playersCount').textContent = `${count}/2`;
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
    new FindWordsGame();
});
