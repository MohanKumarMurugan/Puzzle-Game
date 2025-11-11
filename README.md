# LexiBattle 🎮

A comprehensive word search puzzle game built with HTML, CSS, and JavaScript. Features single-player, two-player, and online multiplayer modes with an intuitive drag-and-select interface. Includes Sui blockchain wallet integration for enhanced gameplay.

---

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Game Modes](#-game-modes)
- [How to Play](#-how-to-play)
- [Installation & Setup](#-installation--setup)
- [Project Structure](#-project-structure)
- [Technical Details](#-technical-details)
- [Customization](#-customization)
- [Troubleshooting](#-troubleshooting)
- [Browser Compatibility](#-browser-compatibility)

---

## 🌟 Features

### Game Modes
- **Single Player**: Play solo and challenge yourself
- **Two Players**: Local multiplayer on the same device
- **Multiplayer (Online)**: Play with friends over the internet via WebSocket

### Grid Options
- Multiple grid sizes: 10x10, 12x12, 15x15, 18x18, 20x20
- Dynamic grid generation with random letter filling
- Responsive design that works on desktop and mobile devices

### Word Placement
- Advanced algorithm places words in 8 directions:
  - Horizontal (left-to-right and right-to-left)
  - Vertical (top-to-bottom and bottom-to-top)
  - Diagonal (all 4 diagonal directions)

### Interactive Features
- **Click-and-drag selection**: Select words by dragging across grid cells
- **Real-time feedback**: See your current selection highlighted
- **Word validation**: Automatic detection of found words (forward and backward)
- **Visual feedback**: Found words are highlighted and marked in the word list
- **Game timer**: Track your completion time
- **Win detection**: Celebrate when all words are found!
- **Hint system**: Get hints to find difficult words
- **Difficulty levels**: Easy, Medium, and Hard word lists

### Blockchain Integration
- **Sui Wallet Connection**: Connect your Sui wallet (Walrus, Sui Wallet, etc.)
- **Testnet Support**: Currently configured for Sui Testnet
- **Wallet Status Display**: See your connected wallet address

### Data Persistence
- Custom words are saved to localStorage
- Your custom word lists persist between browser sessions

---

## 🚀 Quick Start

### Single-Player Mode (No Installation Required)

1. **Download or clone** the project files
2. **Open `index.html`** in any modern web browser
3. **Start playing** immediately - no installation required!

### Two-Player Mode

1. Open `index.html` in your browser
2. Click **"2 Players"** button
3. Players take turns finding words
4. The game tracks scores for both players

---

## 🎮 Game Modes

### Single Player Mode
- Play at your own pace
- Track your completion time
- Use hints when stuck
- Choose from Easy, Medium, or Hard difficulty

### Two Players Mode
- Local multiplayer on the same device
- Turn-based gameplay
- Score tracking for both players
- First player to find all words wins

### Multiplayer (Online) Mode
- Play with friends over the internet
- Real-time synchronization via WebSocket
- Room-based system with 6-character room codes
- Host creates room, other players join with code
- See detailed setup instructions in [Installation & Setup](#-installation--setup)

---

## 🎯 How to Play

### Basic Gameplay

1. **Select Game Mode**: Choose Single Player, 2 Players, or Multiplayer (Online)
2. **Choose Settings**:
   - Select Random Mode (predefined words) or Custom Mode (your own words)
   - Choose difficulty level (Easy/Medium/Hard) for Random Mode
   - Select grid size (10x10 to 20x20)
3. **Start Game**: Click "New Game" to generate the puzzle
4. **Find Words**: Click and drag across letters to select words
5. **Complete**: Find all words to win!

### Random Mode
- Uses predefined word lists based on difficulty
- Words are automatically placed in the grid
- No setup required - just click "New Game"

### Custom Mode
1. Click "Custom Mode" button
2. Enter words in the input field (3-15 letters, A-Z only)
3. Press Enter or click "Add Word"
4. Words are saved automatically
5. Select grid size and click "New Game"

### Word Selection Tips
- Words can be found in any direction (horizontal, vertical, diagonal)
- Words can be read forward or backward
- Selected words are highlighted in real-time
- Found words are marked in the word list
- Use the hint button (💡) for help finding words

---

## 🛠️ Installation & Setup

### Prerequisites

For **Single-Player** and **Two-Player** modes:
- No prerequisites needed! Just open `index.html` in a browser.

For **Multiplayer (Online)** mode:
- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)

### Multiplayer Server Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```
   This installs required packages:
   - `ws` - WebSocket support
   - `dotenv` - Environment variables
   - `node-fetch` - HTTP requests

2. **Start the WebSocket Server**
   ```bash
   npm start
   ```
   The server will start on `ws://localhost:3000` by default.
   
   You should see:
   ```
   WebSocket server running on ws://localhost:3000
   ```

3. **Open the Game**
   - Option 1: Open `index.html` directly in your browser
   - Option 2: Use a local HTTP server:
     ```bash
     # Using Python 3
     python -m http.server 8000
     
     # Using Python 2
     python -m SimpleHTTPServer 8000
     
     # Using Node.js http-server (install: npm install -g http-server)
     http-server
     ```
   - Then navigate to `http://localhost:8000`

4. **Play Multiplayer**
   - Click **"Multiplayer (Online)"** button
   - **Host (Player 1)**: Click "Create Room" - you'll get a 6-character room code
   - **Player 2**: Enter the room code and click "Join Room"
   - Once both players are connected, the host can configure the game
   - Host clicks "New Game" to generate the puzzle
   - Host clicks "Start Game" to begin
   - Players take turns finding words - the game synchronizes in real-time!

### Development Mode

For automatic server restart on file changes:
```bash
npm run dev
```
(Requires `nodemon` - installed as a dev dependency)

---

## 📁 Project Structure

```
Find_Words/
├── index.html          # Main HTML structure and UI
├── styles.css          # Complete styling, animations, and responsive design
├── script.js           # Core game logic (single, two-player, and multiplayer)
├── wallet.js           # Sui blockchain wallet connection handler
├── server.js           # WebSocket server for multiplayer mode
├── package.json        # Node.js dependencies and npm scripts
└── README.md           # This documentation
```

### File Descriptions

- **`index.html`**: Main HTML structure with game UI, modals, and controls
- **`styles.css`**: All styling including glassmorphism effects, animations, and responsive breakpoints
- **`script.js`**: Complete game logic including:
  - Word placement algorithms
  - Grid generation
  - Selection detection
  - Multiplayer synchronization
  - Timer and scoring systems
- **`wallet.js`**: Sui wallet integration for blockchain connectivity
- **`server.js`**: WebSocket server handling multiplayer connections and game state synchronization
- **`package.json`**: Project metadata and dependencies

---

## 🔧 Technical Details

### Core Algorithms

#### Word Placement Algorithm
Words are placed in 8 possible directions:
```javascript
const directions = [
    { dx: 0, dy: 1 },   // horizontal (right)
    { dx: 0, dy: -1 },  // horizontal (left)
    { dx: 1, dy: 0 },   // vertical (down)
    { dx: -1, dy: 0 },  // vertical (up)
    { dx: 1, dy: 1 },   // diagonal down-right
    { dx: 1, dy: -1 },  // diagonal down-left
    { dx: -1, dy: 1 },  // diagonal up-right
    { dx: -1, dy: -1 }  // diagonal up-left
];
```

#### Grid Generation Process
1. Create empty grid matrix
2. Place words using collision detection
3. Fill remaining spaces with random letters
4. Render to DOM with event bindings

#### Selection Detection
- Calculates straight-line paths between start and end points
- Validates selections for horizontal, vertical, and diagonal lines
- Supports both forward and backward word detection

### Architecture

- **Object-oriented design**: Main `FindWordsGame` class
- **Event-driven**: User interactions trigger game state changes
- **Modular functions**: Separate functions for different game aspects
- **LocalStorage integration**: Data persistence for custom words
- **WebSocket communication**: Real-time multiplayer synchronization

### Design Features

- **Glassmorphism effects**: Modern UI with frosted glass panels
- **Gradient backgrounds**: Beautiful color schemes
- **Smooth animations**: Transitions for all interactions
- **Responsive typography**: Scales with screen size
- **Mobile-friendly**: Touch-optimized controls

---

## 🎨 Customization

### Adding New Word Lists

Edit the `wordLists` object in `script.js`:

```javascript
this.wordLists = {
    easy: ['CAT', 'DOG', 'SUN', ...],
    medium: ['COMPUTER', 'RAINBOW', ...],
    hard: ['JAVASCRIPT', 'ALGORITHM', ...]
};
```

### Modifying Grid Sizes

Edit the grid size options in `index.html`:
```html
<select id="gridSize">
    <option value="10">10x10</option>
    <option value="12">12x12</option>
    <!-- Add more sizes here -->
</select>
```

### Styling Changes

- Modify `styles.css` for visual changes
- CSS custom properties make theming easy
- Grid sizing is controlled via CSS Grid

### Wallet Configuration

Edit `wallet.js` to change:
- Network (testnet/mainnet/devnet)
- RPC endpoints
- Wallet detection logic

### Server Configuration

Edit `server.js` to change:
- WebSocket port (default: 3000)
- Room code generation
- Connection timeout settings

---

## 🔍 Troubleshooting

### Game Issues

**Grid not displaying**
- Check that JavaScript is enabled in your browser
- Open browser console (F12) to check for errors
- Try refreshing the page

**Words not found**
- Ensure you're selecting in a straight line (horizontal, vertical, or diagonal)
- Check that the word exists in the word list
- Try selecting in the opposite direction (words can be backward)

**Mobile selection issues**
- Try shorter, more precise gestures
- Ensure you're dragging in a straight line
- Use the hint button if stuck

**Timer not working**
- Make sure you've clicked "Start Game" button
- Check browser console for JavaScript errors

### Multiplayer Issues

**Can't connect to server**
- Verify the server is running: `npm start`
- Check server is on correct port (default: 3000)
- Verify firewall isn't blocking the connection
- Check browser console for WebSocket errors
- Ensure both players are using the same server URL

**"Room not found" error**
- Verify the room code is correct (6 characters, case-insensitive)
- Ensure the room was created and hasn't expired
- Make sure both players are using the same server
- Try creating a new room

**Game not starting in multiplayer**
- Ensure both players are connected (should show "2/2" players)
- Only the host can start the game
- Check that the host clicked "New Game" before "Start Game"
- Verify WebSocket connection is active (green indicator)

**npm install fails**
- Make sure Node.js is installed: `node --version`
- Try deleting `node_modules` and `package-lock.json`, then run `npm install` again
- Check your internet connection
- Try using `npm install --legacy-peer-deps`

**Port already in use**
- If port 3000 is busy, edit `server.js` to use a different port
- Update the WebSocket URL in `script.js` to match the new port
- Or stop the process using port 3000

### Wallet Issues

**Wallet not connecting**
- Ensure you have a Sui wallet extension installed (Walrus, Sui Wallet, etc.)
- Check that the wallet extension is enabled
- Try refreshing the page
- Check browser console for connection errors

**Wrong network**
- The game is configured for Sui Testnet by default
- Edit `wallet.js` to change the network if needed

### Performance Tips

- Use smaller grid sizes on older devices
- Clear browser cache if experiencing issues
- Ensure adequate screen resolution for larger grids
- For multiplayer, ensure stable internet connection
- Close other browser tabs to free up memory

---

## 🌐 Browser Compatibility

### Supported Browsers
- **Chrome** 60+
- **Firefox** 60+
- **Safari** 12+
- **Edge** 79+
- **Opera** 50+

### Required Features
- JavaScript enabled
- LocalStorage support
- WebSocket support (for multiplayer)
- CSS Grid support
- ES6+ JavaScript features

---

## 📊 Game Statistics

The game tracks:
- **Words found** vs total words
- **Completion time** (mm:ss format)
- **Player scores** (in multiplayer modes)
- **Win celebration** with completion modal

---

## 💾 Data Management

### LocalStorage Usage
- Custom words are automatically saved
- Data persists across browser sessions
- Clear data via the "Clear All" button in Custom Mode

### Privacy
- All data is stored locally in your browser
- No external servers or data collection (except multiplayer WebSocket)
- Complete offline functionality for single-player mode
- Wallet connections are handled locally

---

## 🤝 Contributing

Ideas for enhancements:
- Add sound effects and background music
- Implement different visual themes
- Create difficulty-based scoring system
- Add word definitions or hints with explanations
- Implement save/load game states
- Add leaderboards
- Create tournament mode
- Add more word categories

---

## 📄 License

This project is open source. Feel free to use, modify, and distribute as needed.

---

## 🎉 Enjoy Playing LexiBattle!

Have fun finding words and challenging your friends! If you encounter any issues or have suggestions, feel free to contribute or report them.

---

**Made with ❤️ for word puzzle enthusiasts**
