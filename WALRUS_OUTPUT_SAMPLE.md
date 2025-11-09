# 📦 Walrus Output Guide

## How to View Walrus Output

### 1. **Server Console Output**

When a game ends, check your **server console** (where you ran `npm start`). You'll see:

```
============================================================
📦 WALRUS UPLOAD OUTPUT
============================================================

📤 Uploaded Data:
{
  "roomCode": "ABC123",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "player1": "Player 1",
  "player2": "Player 2",
  "player1Wallet": "0x1234567890abcdef...",
  "player2Wallet": "0xabcdef1234567890...",
  "scores": {
    "player1": 15,
    "player2": 12
  },
  "winner": "TBD",
  "blockchain": "Sui Testnet",
  "walrusIntegration": true
}

🔑 Blob ID: 0xabc123def456...
🌐 Aggregator URL: https://aggregator.walrus-testnet.walrus.space/v1/blobs/0xabc123def456...

💡 To view the data:
   Visit: https://aggregator.walrus-testnet.walrus.space/v1/blobs/0xabc123def456...
   Or fetch programmatically: fetch("https://aggregator.walrus-testnet.walrus.space/v1/blobs/0xabc123def456...")
============================================================
```

### 2. **Browser Console Output**

In your **browser console** (F12), you'll see:

```javascript
GAME_OVER received: {
  type: "GAME_OVER",
  playerScores: { 1: 15, 2: 12 },
  walrus: {
    uploaded: true,
    blobId: "0xabc123def456...",
    aggregatorUrl: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/0xabc123def456..."
  }
}

📦 Walrus Upload Result: {
  uploaded: true,
  blobId: "0xabc123def456...",
  aggregatorUrl: "https://aggregator.walrus-testnet.walrus.space/v1/blobs/0xabc123def456..."
}

✅ Game result uploaded to Walrus!
🔗 Blob ID: 0xabc123def456...
🌐 View at: https://aggregator.walrus-testnet.walrus.space/v1/blobs/0xabc123def456...
```

### 3. **Game Modal Display**

The Walrus URL is also shown in the game over modal message.

---

## Sample Walrus Output

### **Sample JSON Data Uploaded to Walrus:**

```json
{
  "roomCode": "XYZ789",
  "timestamp": "2024-01-15T14:22:33.456Z",
  "player1": "Player 1",
  "player2": "Player 2",
  "player1Wallet": "0x04e9a1234567890abcdef1234567890abcdef1234567890abcdef1234567890e6f4",
  "player2Wallet": "0x0a1b2c3d4e5f678901234567890123456789012345678901234567890123456789",
  "scores": {
    "player1": 20,
    "player2": 18
  },
  "winner": "TBD",
  "blockchain": "Sui Testnet",
  "walrusIntegration": true
}
```

### **Sample Walrus Response:**

```json
{
  "newlyCreated": {
    "blobObject": {
      "blobId": "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
      "size": 342,
      "contentType": "application/json"
    },
    "expiration": "2024-01-22T14:22:33.456Z"
  }
}
```

### **Sample Aggregator Response (when fetching):**

```json
{
  "blobId": "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
  "data": {
    "roomCode": "XYZ789",
    "timestamp": "2024-01-15T14:22:33.456Z",
    "player1": "Player 1",
    "player2": "Player 2",
    "player1Wallet": "0x04e9a1234567890abcdef1234567890abcdef1234567890abcdef1234567890e6f4",
    "player2Wallet": "0x0a1b2c3d4e5f678901234567890123456789012345678901234567890123456789",
    "scores": {
      "player1": 20,
      "player2": 18
    },
    "winner": "TBD",
    "blockchain": "Sui Testnet",
    "walrusIntegration": true
  },
  "metadata": {
    "uploadedAt": "2024-01-15T14:22:33.456Z",
    "size": 342
  }
}
```

---

## How to View Walrus Data

### **Method 1: Browser Console**

1. Open browser console (F12)
2. After game ends, look for the Walrus output
3. Copy the `aggregatorUrl`
4. Paste it in a new browser tab to view

### **Method 2: Direct URL Access**

1. Get the `aggregatorUrl` from console logs
2. Open it in your browser:
   ```
   https://aggregator.walrus-testnet.walrus.space/v1/blobs/0x...
   ```
3. You'll see the JSON data

### **Method 3: Programmatic Fetch**

In browser console, run:

```javascript
// Replace with your actual blob ID
const blobId = "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890";
const url = `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`;

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log('📦 Walrus Data:', data);
    console.log('📄 Game Result:', data.data || data);
  })
  .catch(err => console.error('Error:', err));
```

### **Method 4: Server-Side Fetch**

The server automatically fetches and displays the blob after upload. Check server console for:

```
📥 Retrieved blob content from aggregator: { ... }
```

---

## Understanding the Output

### **Fields in Walrus Output:**

| Field | Description | Example |
|-------|-------------|---------|
| `roomCode` | Unique game room identifier | `"ABC123"` |
| `timestamp` | When the game ended (ISO format) | `"2024-01-15T10:30:45.123Z"` |
| `player1` | Player 1 name | `"Player 1"` |
| `player2` | Player 2 name | `"Player 2"` |
| `player1Wallet` | Player 1's Sui blockchain address | `"0x04e9a..."` |
| `player2Wallet` | Player 2's Sui blockchain address | `"0x0a1b2..."` |
| `scores` | Final scores for both players | `{ "player1": 15, "player2": 12 }` |
| `winner` | Winner determination | `"TBD"` or `1` or `2` |
| `blockchain` | Blockchain network used | `"Sui Testnet"` |
| `walrusIntegration` | Flag indicating Walrus storage | `true` |

### **Blob Information:**

- **Blob ID**: Unique identifier for the stored data (hex string)
- **Size**: Size of the data in bytes
- **Expiration**: When the blob expires (if applicable)
- **Aggregator URL**: URL to retrieve the blob data

---

## Testing Walrus Output

### **Quick Test:**

1. Start the server: `npm start`
2. Open game: `http://localhost:3000`
3. Create a room and play a quick game
4. Let the game end (or complete all levels)
5. Check **server console** for Walrus output
6. Check **browser console** for Walrus URL
7. Copy the aggregator URL and open it in a new tab

### **Verify Upload:**

```javascript
// In browser console after game ends
// Check if walrus data is available
if (window.game && window.game.walrusBlobId) {
  console.log('Blob ID:', window.game.walrusBlobId);
  console.log('View URL:', window.game.walrusUrl);
  
  // Fetch the data
  fetch(window.game.walrusUrl)
    .then(r => r.json())
    .then(d => console.log('Retrieved:', d));
}
```

---

## Troubleshooting

### **No Walrus Output:**

1. Check server console for errors
2. Verify Walrus endpoints are reachable:
   ```bash
   curl https://publisher.walrus-testnet.walrus.space/v1/blobs -X OPTIONS
   ```
3. Check network tab in browser DevTools for failed requests

### **Blob ID but Can't View:**

1. Wait a few seconds (aggregator may need time to index)
2. Try the aggregator URL directly in browser
3. Check if blob has expired (check expiration timestamp)

### **Empty or Missing Data:**

1. Verify wallet addresses were provided during game end
2. Check server logs for upload errors
3. Ensure game completed properly (not interrupted)

---

## Example Complete Flow

```
1. Game Ends
   ↓
2. Server uploads to Walrus Publisher
   ↓
3. Server receives blob ID
   ↓
4. Server displays output in console
   ↓
5. Server broadcasts to clients
   ↓
6. Browser displays in console and modal
   ↓
7. Data available at Aggregator URL
```

---

## Summary

**To see Walrus output:**
1. ✅ Check **server console** - Full output with formatted display
2. ✅ Check **browser console** - Blob ID and URL
3. ✅ Check **game modal** - URL shown in message
4. ✅ Visit **aggregator URL** - View stored data directly

The output includes all game results, player scores, wallet addresses, and blockchain information stored on Walrus (decentralized storage on Sui blockchain).

