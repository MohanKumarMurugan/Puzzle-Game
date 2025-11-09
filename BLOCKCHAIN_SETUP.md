# 🚀 How to Run the Blockchain Connection

## Quick Start Guide

The blockchain connection runs **client-side** in your browser. Here's how to set it up:

## Step 1: Install Dependencies

Make sure you have Node.js installed, then install the project dependencies:

```bash
npm install
```

This installs:
- `ws` - WebSocket server for multiplayer
- `dotenv` - Environment variables
- `node-fetch` - For Walrus integration

## Step 2: Start the Server

Start the WebSocket server (required for multiplayer and Walrus integration):

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

You should see:
```
🌐 Walrus Publisher reachable ✅
Server running on port 3000
Open in browser: http://localhost:3000
WebSocket endpoint: ws://localhost:3000
```

## Step 3: Open the Game in Browser

1. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

   OR if you're using a different server:
   ```
   http://localhost:8000
   ```

2. **Open Developer Console** (Press `F12` or `Ctrl+Shift+I`)
   - Go to the **Console** tab
   - You'll see blockchain connection logs here

## Step 4: Connect Your Wallet to Blockchain

### Prerequisites:
- ✅ Sui Wallet extension installed in Chrome
- ✅ Wallet is unlocked
- ✅ Wallet is set to **Sui Testnet** (if your wallet supports network switching)

### Connection Steps:

1. **Click "Connect Wallet"** button (top right of the page)

2. **Approve the connection** in your wallet popup

3. **Check the Console** - You should see:
   ```
   🌐 Sui blockchain client initialized for testnet
   🔗 RPC Endpoint: https://fullnode.testnet.sui.io
   🔍 Detecting Sui wallets...
   ✅ Found window.suiWallet
   🔗 Setting up blockchain connection...
   ✅ Valid Sui address format
   ✅ Blockchain connection verified
   💰 Wallet balance: 0.0000 SUI
   ✅ Wallet connected to Sui blockchain successfully!
   📍 Address: 0x...
   🌐 Network: Sui Testnet
   ```

4. **Verify Connection**:
   - You should see your wallet address displayed (shortened format)
   - Network indicator shows "Sui Testnet"
   - Button changes to "✅ Connected"

## Step 5: Test Blockchain Integration

The blockchain connection is now active! Here's what happens:

### During Game Play:
- Your wallet address is stored locally
- Game results will include your blockchain address

### When Game Ends:
- Game results are uploaded to **Walrus** (decentralized storage)
- Your wallet address is included in the game data
- Results are stored on-chain via Walrus

### Check Console Logs:
Open the browser console to see:
- Blockchain RPC calls
- Balance queries
- Address verification
- Walrus upload confirmations

## How the Blockchain Connection Works

### Architecture:
```
Browser (Client)                    Sui Blockchain
     │                                    │
     ├─ Wallet Extension ────────────────►│
     │   (Detects & Connects)            │
     │                                    │
     ├─ wallet.js ──────────────────────►│
     │   (RPC Calls)                      │
     │   - getBalance()                   │
     │   - getAccountInfo()               │
     │                                    │
     └─ Game Results ────────────────────►│
         (via Walrus)                     │
```

### RPC Endpoints Used:
- **Sui Testnet RPC**: `https://fullnode.testnet.sui.io`
- **Methods**:
  - `suix_getBalance` - Get wallet balance
  - `sui_getObject` - Get account information

### Network:
- Currently configured for **Sui Testnet**
- To switch to Mainnet, edit `wallet.js`:
  ```javascript
  this.network = 'mainnet';
  const mainnetRpcUrl = 'https://fullnode.mainnet.sui.io';
  ```

## Troubleshooting

### Wallet Not Detected:
1. Make sure wallet extension is **enabled** in Chrome
2. **Refresh the page** (F5)
3. **Unlock your wallet** first
4. Check console for detection logs

### Connection Fails:
1. Check browser console for errors
2. Verify wallet is set to **Testnet**
3. Make sure you have internet connection
4. Try disconnecting and reconnecting

### RPC Errors:
- If you see RPC errors, the Sui testnet might be temporarily unavailable
- The wallet connection will still work for signing transactions
- Blockchain queries (balance, etc.) might fail

### Server Not Starting:
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Or use a different port
# Edit server.js: const PORT = 3001;
```

## Testing the Blockchain Connection

### Manual Test:
1. Open browser console (F12)
2. Type: `window.walletManager.getAddress()`
3. Should return your wallet address

### Check Balance:
1. In console: `window.walletManager.getBalance()`
2. Returns your SUI balance

### Verify Network:
1. In console: `window.walletManager.network`
2. Should show: `"testnet"`

## Next Steps

Once connected:
- ✅ Play games - your address is tracked
- ✅ Game results uploaded to Walrus with your address
- ✅ All blockchain interactions logged in console
- ✅ Ready for on-chain features (if you add them)

## Summary

**The blockchain connection runs automatically when you:**
1. Start the server (`npm start`)
2. Open the game in browser (`http://localhost:3000`)
3. Click "Connect Wallet"
4. Approve in your wallet

**No additional setup needed!** The blockchain integration is built-in and works client-side.

