# Installation and Setup Guide

## Step 1: Install Node.js

You need to install Node.js to run the WebSocket server. Follow these steps:

1. **Download Node.js:**
   - Go to: https://nodejs.org/
   - Download the **LTS (Long Term Support)** version for Windows
   - Choose the Windows Installer (.msi) for your system (64-bit recommended)

2. **Install Node.js:**
   - Run the downloaded installer
   - Follow the installation wizard
   - Make sure to check "Add to PATH" option (usually checked by default)
   - Complete the installation

3. **Verify Installation:**
   - Close and reopen your terminal/PowerShell
   - Run these commands to verify:
     ```powershell
     node --version
     npm --version
     ```
   - You should see version numbers (e.g., v20.x.x and 10.x.x)

## Step 2: Install Project Dependencies

Once Node.js is installed:

1. **Open PowerShell or Command Prompt** in the project folder:
   ```
   C:\Users\Mohan\Desktop\Mohan projectss\Reference\Find_Words
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

   This will install:
   - `ws` - WebSocket library
   - `nodemon` - Development tool (optional)

## Step 3: Start the Server

After installation, start the WebSocket server:

```powershell
npm start
```

You should see:
```
WebSocket server running on port 3000
Connect to: ws://localhost:3000
```

**Keep this terminal window open** - the server needs to keep running!

## Step 4: Open the Game

1. **Open `index.html` in your web browser:**
   - You can double-click the file, or
   - Right-click → Open with → Your preferred browser

2. **For Multiplayer:**
   - Open the game in **two different browser windows** (or different browsers)
   - Click "Multiplayer (Online)" button
   - Player 1: Click "Create Room"
   - Player 2: Enter the room code and click "Join Room"
   - Host starts the game!

## Troubleshooting

### "npm is not recognized"
- Node.js is not installed or not in PATH
- Reinstall Node.js and make sure to check "Add to PATH"
- Restart your terminal after installation

### "Port 3000 already in use"
- Another application is using port 3000
- Close that application or change the port in `server.js`:
  ```javascript
  const PORT = process.env.PORT || 3001; // Change to 3001 or another port
  ```
- Also update `script.js`:
  ```javascript
  this.wsServerUrl = 'ws://localhost:3001'; // Match the port
  ```

### "Cannot connect to server"
- Make sure the server is running (`npm start`)
- Check that the WebSocket URL in `script.js` matches your server port
- Try refreshing the browser page

## Quick Start Commands

```powershell
# 1. Install dependencies (one time only)
npm install

# 2. Start the server
npm start

# 3. Open index.html in your browser
# 4. Open another browser window/tab for Player 2
```

## Alternative: Using a Local Web Server

If you prefer to use a local web server instead of opening the file directly:

1. **Using Python (if installed):**
   ```powershell
   python -m http.server 8000
   ```
   Then open: http://localhost:8000

2. **Using VS Code Live Server extension:**
   - Install "Live Server" extension in VS Code
   - Right-click `index.html` → "Open with Live Server"

3. **Using Node.js http-server:**
   ```powershell
   npm install -g http-server
   http-server -p 8000
   ```
   Then open: http://localhost:8000

