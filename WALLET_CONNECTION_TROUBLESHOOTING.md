# 🔧 Wallet Connection Troubleshooting Guide

## Issue: Sui Wallet Extension Popup Not Appearing

If clicking "Connect Wallet" doesn't show the Sui wallet extension popup, follow these steps:

## Quick Fixes

### 1. **Check Wallet Extension Status**
- Open Chrome Extensions: `chrome://extensions/`
- Find "Sui Wallet" extension
- Make sure it's **ENABLED** (toggle is ON)
- Make sure the extension is **UNLOCKED** (open it and unlock if needed)

### 2. **Refresh the Page**
- Press `F5` or `Ctrl+R` to refresh
- Wallet extensions inject scripts on page load
- Sometimes they need a refresh to be detected

### 3. **Check Browser Popup Blocker**
- Look for a popup blocker icon in the address bar
- Click it and allow popups for this site
- Or go to Chrome Settings → Privacy → Site Settings → Pop-ups and redirects
- Add your site to allowed list

### 4. **Unlock Wallet First**
- Click the Sui Wallet extension icon in Chrome toolbar
- Make sure your wallet is **UNLOCKED**
- Then try connecting again

### 5. **Check Console for Errors**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Click "Connect Wallet"
4. Look for error messages
5. Share the errors if you need help

## Step-by-Step Debugging

### Step 1: Verify Wallet is Detected

Open browser console (F12) and type:
```javascript
window.suiWallet
```

**Expected Result:**
- Should show an object (not `undefined`)
- If `undefined`, wallet extension is not detected

**If undefined:**
1. Check if extension is installed
2. Check if extension is enabled
3. Refresh the page
4. Try restarting Chrome

### Step 2: Check Wallet Methods

In console, type:
```javascript
window.suiWallet.requestPermissions
```

**Expected Result:**
- Should show `function requestPermissions() { ... }`
- If `undefined`, the wallet API might be different

### Step 3: Manual Connection Test

In console, try:
```javascript
window.suiWallet.requestPermissions({ network: 'testnet' })
```

**Expected Result:**
- Should trigger the wallet popup
- If it works, the issue is with the button click handler
- If it doesn't work, the wallet might need to be unlocked first

### Step 4: Check for Errors

Look in console for:
- `❌ requestPermissions error: ...`
- `⚠️ Wallet found but missing connection methods`
- Any red error messages

## Common Issues

### Issue 1: "No wallets detected"

**Solution:**
1. Make sure Sui Wallet extension is installed
2. Enable the extension in `chrome://extensions/`
3. Refresh the page
4. Check console for detection logs

### Issue 2: "requestPermissions is not a function"

**Solution:**
- Your wallet might use a different API
- Check console for available methods
- The code will try alternative methods automatically

### Issue 3: Popup appears but connection fails

**Solution:**
1. Make sure you **approve** the connection in the popup
2. Check if wallet is set to correct network (Testnet)
3. Check console for connection errors

### Issue 4: Button shows "Connecting..." but nothing happens

**Solution:**
1. Check browser console for errors
2. Make sure wallet extension is unlocked
3. Try clicking the wallet extension icon manually first
4. Wait a few seconds - sometimes popup takes time

## Manual Connection Test

If automatic connection doesn't work, try this in browser console:

```javascript
// Test 1: Direct requestPermissions call
window.suiWallet.requestPermissions({ network: 'testnet' })
  .then(accounts => {
    console.log('✅ Connected!', accounts);
  })
  .catch(err => {
    console.error('❌ Error:', err);
  });

// Test 2: Check if already connected
window.suiWallet.getAccounts()
  .then(accounts => {
    console.log('✅ Already connected:', accounts);
  })
  .catch(err => {
    console.log('Not connected yet:', err);
  });
```

## What the Code Does

When you click "Connect Wallet", the code:

1. **Detects wallets** - Scans for `window.suiWallet`
2. **Shows loading** - Button changes to "⏳ Connecting..."
3. **Calls requestPermissions** - This should trigger the popup
4. **Waits for approval** - User approves in popup
5. **Gets address** - Retrieves wallet address
6. **Connects to blockchain** - Verifies connection
7. **Shows confirmation** - Green notification appears

## Expected Console Output

When connection works, you should see:

```
🔍 Detecting Sui wallets...
✅ Found window.suiWallet
  ✓ Sui Wallet has connection methods
✅ Wallet detected: [object Object]
📋 Wallet object keys: [...]
🔍 Wallet methods available: {
  requestPermissions: "function",
  hasPermissions: "function",
  getAccounts: "function",
  ...
}
🔵 Method 1: Using requestPermissions (Sui Wallet standard)
Calling requestPermissions - this should trigger the popup...
requestPermissions result: [...]
✅ Got address from requestPermissions: 0x...
🔗 Setting up blockchain connection...
✅ Valid Sui address format
✅ Blockchain connection verified
💰 Wallet balance: 0.0000 SUI
✅ Wallet connected to Sui blockchain successfully!
```

## Still Not Working?

1. **Check Extension Version**
   - Make sure you have the latest Sui Wallet extension
   - Update if needed from Chrome Web Store

2. **Try Different Wallet**
   - Suiet Wallet
   - Ethos Wallet
   - See if they work

3. **Check Network**
   - Make sure you're on Sui Testnet in wallet settings
   - Some wallets require network selection

4. **Browser Compatibility**
   - Make sure you're using Chrome/Edge (Chromium-based)
   - Firefox might have different API

5. **Share Debug Info**
   - Run `debugWallet()` in console
   - Copy the output
   - Share for troubleshooting

## Alternative: Play Without Wallet

Remember: **Wallet connection is optional!**

You can play the game without connecting a wallet:
- Just start playing - no wallet needed
- Game works in "Friendly Mode"
- Results still saved (without blockchain address)

The wallet is only needed if you want:
- Results stored on blockchain
- Wallet address in game data
- Full blockchain integration

