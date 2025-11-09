/**
 * Sui Wallet Connection Handler
 * Connects to Sui blockchain wallets and integrates with Walrus
 */

class SuiWalletManager {
    constructor() {
        this.wallet = null;
        this.address = null;
        this.connected = false;
        this.network = 'testnet'; // Sui network: testnet, mainnet, devnet
        this.suiClient = null;
        
        // Initialize Sui client for blockchain interaction
        this.initSuiClient();
        
        this.init();
    }
    
    initSuiClient() {
        // Initialize Sui client for blockchain queries
        // Using Sui testnet RPC endpoint
        const testnetRpcUrl = 'https://fullnode.testnet.sui.io';
        
        // We'll use fetch for blockchain queries since we don't have the SDK
        this.rpcUrl = testnetRpcUrl;
        console.log('🌐 Sui blockchain client initialized for', this.network);
        console.log('🔗 RPC Endpoint:', this.rpcUrl);
    }
    
    init() {
        // Bind wallet connection button
        const connectBtn = document.getElementById('walletConnectBtn');
        const disconnectBtn = document.getElementById('walletDisconnectBtn');
        const refreshBtn = document.getElementById('walletRefreshBtn');
        
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectWallet());
        }
        
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnectWallet());
        }
        
        
        // Wait for wallet extensions to load, then check connection
        // Wallet extensions may take time to inject into the page
        // Try multiple times with increasing delays
        const checkDelays = [500, 1000, 2000, 3000, 5000];
        checkDelays.forEach((delay, index) => {
            setTimeout(() => {
                if (index === 0) {
                    // First check - try to reconnect if previously connected
                    this.checkExistingConnection();
                } else if (!this.connected) {
                    // Subsequent checks - just log available wallets
                    console.log(`Re-checking for wallets after ${delay}ms delay...`);
                    const wallets = this.detectWallets();
                    if (wallets.length > 0 && !this.connected) {
                        console.log('💡 Wallets available but not connected. Click "Connect Wallet" button to connect.');
                    }
                }
            }, delay);
        });
    }
    
    async checkExistingConnection() {
        // Check localStorage for previous connection
        const savedAddress = localStorage.getItem('suiWalletAddress');
        if (savedAddress) {
            console.log('Found saved wallet address, attempting to reconnect...');
            // Wait a bit for wallet extensions to load
            setTimeout(async () => {
                await this.connectWallet();
            }, 1000);
        } else {
            console.log('No saved wallet connection found');
        }
    }
    
    async connectWallet() {
        try {
            console.log('Attempting to connect wallet...');
            
            // Try to detect installed wallets
            const wallets = this.detectWallets();
            
            if (wallets.length === 0) {
                console.error('❌ No wallets detected');
                
                // Provide helpful error message
                const errorMsg = `No Sui wallet detected!

Please make sure:
1. ✅ A Sui wallet extension is installed (Sui Wallet, Suiet, or Ethos Wallet)
2. ✅ The wallet extension is enabled in your browser
3. ✅ The page has been refreshed after installing the extension
4. ✅ The wallet extension is unlocked

After installing/refreshing, click "Connect Wallet" again.

If you have a wallet installed, try:
- Refreshing this page (F5)
- Checking if the extension is enabled in browser settings
- Opening the wallet extension manually first`;
                
                alert(errorMsg);
                return;
            }
            
            // Use the first available wallet
            this.wallet = wallets[0];
            console.log('✅ Wallet detected:', this.wallet);
            console.log('📋 Wallet object keys:', Object.keys(this.wallet));
            console.log('🔍 Wallet methods available:', {
                requestPermissions: typeof this.wallet.requestPermissions,
                hasPermissions: typeof this.wallet.hasPermissions,
                getAccounts: typeof this.wallet.getAccounts,
                connect: typeof this.wallet.connect,
                features: !!this.wallet.features,
                name: this.wallet.name || 'Unknown'
            });
            
            // Important: Make sure wallet is ready
            if (!this.wallet) {
                throw new Error('Wallet object is null or undefined');
            }
            
            // Show loading state
            const connectBtn = document.getElementById('walletConnectBtn');
            const walletStatus = document.getElementById('walletStatus');
            if (connectBtn) connectBtn.disabled = true;
            if (walletStatus) walletStatus.textContent = '⏳ Connecting...';
            
            // Request connection - try different wallet APIs
            let accounts = null;
            let address = null;
            let connectionError = null;
            
            // Method 1: Sui Wallet specific - requestPermissions (most reliable for Sui Wallet extension)
            if (this.wallet.requestPermissions) {
                console.log('🔵 Method 1: Using requestPermissions (Sui Wallet standard)');
                try {
                    console.log('Calling requestPermissions - this should trigger the popup...');
                    accounts = await this.wallet.requestPermissions({
                        network: 'testnet'
                    });
                    console.log('requestPermissions result:', accounts);
                    if (accounts && accounts.length > 0) {
                        const account = accounts[0];
                        address = account.address || account;
                        console.log('✅ Got address from requestPermissions:', address);
                    }
                } catch (err) {
                    console.error('❌ requestPermissions error:', err);
                    connectionError = err;
                    // Don't return - try other methods
                }
            }
            
            // Method 2: Check if already has permissions first
            if (!address && this.wallet.hasPermissions) {
                console.log('🔵 Method 2: Checking existing permissions');
                try {
                    const hasPerms = await this.wallet.hasPermissions();
                    console.log('Has permissions:', hasPerms);
                    if (hasPerms) {
                        if (this.wallet.getAccounts) {
                            accounts = await this.wallet.getAccounts();
                            console.log('getAccounts result:', accounts);
                            if (accounts && accounts.length > 0) {
                                const account = accounts[0];
                                address = account.address || account;
                                console.log('✅ Got address from getAccounts:', address);
                            }
                        }
                    }
                } catch (err) {
                    console.error('❌ hasPermissions/getAccounts error:', err);
                }
            }
            
            // Method 3: Wallet Standard API
            if (!address && this.wallet.features && this.wallet.features['standard:connect']) {
                console.log('🔵 Method 3: Using Wallet Standard API');
                try {
                    const result = await this.wallet.features['standard:connect'].connect();
                    console.log('Wallet Standard connect result:', result);
                    if (result && result.accounts && result.accounts.length > 0) {
                        address = result.accounts[0].address;
                    } else if (result && result.address) {
                        address = result.address;
                    }
                    if (address) {
                        console.log('✅ Got address from Wallet Standard:', address);
                    }
                } catch (err) {
                    console.error('❌ Wallet Standard connect error:', err);
                }
            }
            
            // Method 4: Sui-specific API
            if (!address && this.wallet.features && this.wallet.features['sui:signAndExecuteTransaction']) {
                console.log('🔵 Method 4: Using Sui-specific API');
                try {
                    // Try to get accounts directly
                    if (this.wallet.getAccounts) {
                        accounts = await this.wallet.getAccounts();
                        if (accounts && accounts.length > 0) {
                            const account = accounts[0];
                            address = account.address || account;
                            console.log('✅ Got address from Sui API getAccounts:', address);
                        }
                    }
                } catch (err) {
                    console.error('❌ Sui API error:', err);
                }
            }
            
            // Method 5: Direct connect method
            if (!address && this.wallet.connect) {
                console.log('🔵 Method 5: Using direct connect method');
                try {
                    const result = await this.wallet.connect();
                    console.log('Direct connect result:', result);
                    if (result && result.accounts && result.accounts.length > 0) {
                        address = result.accounts[0].address || result.accounts[0];
                    } else if (result && result.address) {
                        address = result.address;
                    } else if (result && typeof result === 'string') {
                        address = result;
                    }
                    if (address) {
                        console.log('✅ Got address from direct connect:', address);
                    }
                } catch (err) {
                    console.error('❌ Direct connect error:', err);
                }
            }
            
            // Method 6: getAccounts (if already connected)
            if (!address && this.wallet.getAccounts) {
                console.log('🔵 Method 6: Trying getAccounts (already connected check)');
                try {
                    accounts = await this.wallet.getAccounts();
                    if (accounts && accounts.length > 0) {
                        const account = accounts[0];
                        address = account.address || account;
                        console.log('✅ Got address from getAccounts:', address);
                    }
                } catch (err) {
                    console.error('❌ getAccounts error:', err);
                }
            }
            
            // Reset button state
            if (connectBtn) connectBtn.disabled = false;
            
            if (address) {
                this.address = address;
                this.connected = true;
                
                // Set up blockchain connection
                await this.setupBlockchainConnection();
                
                // Verify connection by checking balance
                const balance = await this.getBalance();
                console.log('💰 Wallet balance:', balance, 'SUI');
                
                // Save to localStorage
                localStorage.setItem('suiWalletAddress', this.address);
                localStorage.setItem('suiWalletNetwork', this.network);
                
                // Update UI
                this.updateWalletUI();
                
                // Show connection confirmation
                this.showConnectionConfirmation(address, balance);
                
                console.log('✅ Wallet connected to Sui blockchain successfully!');
                console.log('📍 Address:', this.address);
                console.log('🌐 Network:', this.network);
                
                // Notify game instance if it exists
                if (window.game && typeof window.game.onWalletConnected === 'function') {
                    window.game.onWalletConnected(this.address);
                }
            } else {
                // No address retrieved - provide helpful error
                let errorMessage = 'Could not retrieve wallet address.\n\n';
                
                if (connectionError) {
                    errorMessage += `Error: ${connectionError.message}\n\n`;
                }
                
                errorMessage += `Troubleshooting steps:\n`;
                errorMessage += `1. Make sure your wallet extension is UNLOCKED\n`;
                errorMessage += `2. Check if the wallet popup appeared (it might be blocked)\n`;
                errorMessage += `3. Try clicking the wallet extension icon manually first\n`;
                errorMessage += `4. Refresh the page and try again\n`;
                errorMessage += `5. Check browser console (F12) for detailed error messages`;
                
                console.error('❌ Connection failed - no address retrieved');
                console.error('Connection error:', connectionError);
                console.error('Wallet object:', this.wallet);
                console.error('Available methods:', {
                    requestPermissions: typeof this.wallet.requestPermissions,
                    hasPermissions: typeof this.wallet.hasPermissions,
                    getAccounts: typeof this.wallet.getAccounts,
                    connect: typeof this.wallet.connect,
                    features: !!this.wallet.features
                });
                
                alert(errorMessage);
            }
        } catch (error) {
            console.error('❌ Wallet connection error:', error);
            
            // Reset button state
            const connectBtn = document.getElementById('walletConnectBtn');
            const walletStatus = document.getElementById('walletStatus');
            if (connectBtn) connectBtn.disabled = false;
            if (walletStatus) walletStatus.textContent = '🔗 Connect Wallet';
            
            let errorMsg = 'Failed to connect wallet:\n\n';
            errorMsg += error.message || error;
            errorMsg += '\n\nTroubleshooting:\n';
            errorMsg += '1. Make sure wallet extension is installed and enabled\n';
            errorMsg += '2. Unlock your wallet first\n';
            errorMsg += '3. Check if popup was blocked by browser\n';
            errorMsg += '4. Try refreshing the page\n';
            errorMsg += '5. Check browser console (F12) for details';
            
            alert(errorMsg);
        }
    }
    
    detectWallets() {
        const wallets = [];
        console.log('🔍 Detecting Sui wallets...');
        console.log('Scanning window object for wallet extensions...');
        
        // Method 1: Check for Sui Wallet (official Chrome extension)
        // Sui Wallet typically exposes itself as window.suiWallet
        try {
            if (typeof window.suiWallet !== 'undefined' && window.suiWallet) {
                console.log('✅ Found window.suiWallet');
                // Verify it has connection methods
                if (window.suiWallet.requestPermissions || window.suiWallet.getAccounts || window.suiWallet.connect) {
                    wallets.push({ name: 'Sui Wallet', wallet: window.suiWallet });
                    console.log('  ✓ Sui Wallet has connection methods');
                } else {
                    console.log('  ⚠️ Sui Wallet found but missing connection methods');
                }
            }
        } catch (e) {
            console.log('⚠️ Error checking window.suiWallet:', e.message);
        }
        
        // Method 2: Check for Sui Wallet in alternative locations
        try {
            if (typeof window.__suiWallet__ !== 'undefined' && window.__suiWallet__) {
                console.log('✅ Found window.__suiWallet__');
                wallets.push({ name: 'Sui Wallet (Alt)', wallet: window.__suiWallet__ });
            }
        } catch (e) {
            console.log('⚠️ Error checking window.__suiWallet__:', e.message);
        }
        
        // Method 3: Suiet Wallet
        try {
            if (typeof window.suiet !== 'undefined' && window.suiet) {
                console.log('✅ Found window.suiet');
                wallets.push({ name: 'Suiet', wallet: window.suiet });
            }
        } catch (e) {
            console.log('⚠️ Error checking window.suiet:', e.message);
        }
        
        // Method 4: Ethos Wallet
        try {
            if (typeof window.ethosWallet !== 'undefined' && window.ethosWallet) {
                console.log('✅ Found window.ethosWallet');
                wallets.push({ name: 'Ethos Wallet', wallet: window.ethosWallet });
            }
        } catch (e) {
            console.log('⚠️ Error checking window.ethosWallet:', e.message);
        }
        
        // Method 5: Wallet Standard API (navigator.wallets)
        try {
            if (window.navigator && typeof window.navigator.wallets !== 'undefined') {
                const navWallets = window.navigator.wallets;
                console.log('✅ Found navigator.wallets:', navWallets ? navWallets.length : 0, 'wallets');
                if (Array.isArray(navWallets)) {
                    navWallets.forEach(w => {
                        if (w && w.features) {
                            const hasSuiFeature = w.features['sui:signAndExecuteTransaction'];
                            const hasStandardFeature = w.features['standard:connect'];
                            if (hasSuiFeature || hasStandardFeature) {
                                console.log('  - Found standard wallet:', w.name || 'Unknown');
                                wallets.push({ name: w.name || 'Standard Wallet', wallet: w });
                            }
                        }
                    });
                }
            }
        } catch (e) {
            console.log('⚠️ Error checking navigator.wallets:', e.message);
        }
        
        // Method 6: Check window.wallets array
        try {
            if (window.wallets && Array.isArray(window.wallets)) {
                console.log('✅ Found window.wallets:', window.wallets.length, 'wallets');
                window.wallets.forEach(w => {
                    if (w && w.features) {
                        const hasSuiFeature = w.features['sui:signAndExecuteTransaction'];
                        const hasStandardFeature = w.features['standard:connect'];
                        if (hasSuiFeature || hasStandardFeature) {
                            wallets.push({ name: w.name || 'Wallet', wallet: w });
                        }
                    }
                });
            }
        } catch (e) {
            console.log('⚠️ Error checking window.wallets:', e.message);
        }
        
        // Method 7: Deep scan - Check ALL window properties for wallet-like objects
        console.log('🔍 Deep scanning window object...');
        try {
            const windowKeys = Object.keys(window);
            const walletKeywords = ['sui', 'wallet', 'suiet', 'ethos', 'connect', 'sign'];
            
            windowKeys.forEach(key => {
                // Skip if already checked
                if (['suiWallet', 'suiet', 'ethosWallet', 'wallets'].includes(key)) {
                    return;
                }
                
                // Check if key contains wallet-related keywords
                const lowerKey = key.toLowerCase();
                if (walletKeywords.some(kw => lowerKey.includes(kw))) {
                    try {
                        const prop = window[key];
                        if (prop && typeof prop === 'object' && prop !== null) {
                            // Check if it looks like a wallet (has connect, requestPermissions, or getAccounts)
                            const hasConnect = typeof prop.connect === 'function';
                            const hasRequestPermissions = typeof prop.requestPermissions === 'function';
                            const hasGetAccounts = typeof prop.getAccounts === 'function';
                            const hasFeatures = prop.features && typeof prop.features === 'object';
                            
                            if (hasConnect || hasRequestPermissions || hasGetAccounts || hasFeatures) {
                                console.log(`✅ Found potential wallet: window.${key}`, {
                                    hasConnect,
                                    hasRequestPermissions,
                                    hasGetAccounts,
                                    hasFeatures
                                });
                                if (!wallets.find(w => w.wallet === prop)) {
                                    wallets.push({ name: key, wallet: prop });
                                }
                            }
                        }
                    } catch (e) {
                        // Skip properties that throw errors when accessed
                    }
                }
            });
        } catch (e) {
            console.log('⚠️ Error during deep scan:', e.message);
        }
        
        // Method 8: Check for injected scripts (some extensions inject via script tags)
        try {
            const scripts = document.querySelectorAll('script[src*="wallet"], script[src*="sui"]');
            if (scripts.length > 0) {
                console.log('✅ Found wallet-related script tags:', scripts.length);
            }
        } catch (e) {
            console.log('⚠️ Error checking script tags:', e.message);
        }
        
        // Log all detected wallets
        console.log('📊 Total wallets detected:', wallets.length);
        if (wallets.length === 0) {
            console.warn('⚠️ No wallets detected. Diagnostic info:');
            console.warn('  1. Your wallet extension is installed and enabled');
            console.warn('  2. The page has been refreshed after installing the extension');
            console.warn('  3. The wallet extension is unlocked');
            console.warn('  4. Check browser console for extension errors');
            
            // Comprehensive diagnostic
            console.log('📋 Diagnostic Information:');
            console.log('Window properties checked:', {
                'window.suiWallet': typeof window.suiWallet,
                'window.suiet': typeof window.suiet,
                'window.ethosWallet': typeof window.ethosWallet,
                'navigator.wallets': typeof (window.navigator && window.navigator.wallets),
                'window.wallets': typeof window.wallets
            });
            
            // List all window properties that might be relevant
            const relevantProps = Object.keys(window).filter(k => 
                k.toLowerCase().includes('sui') || 
                k.toLowerCase().includes('wallet') ||
                k.toLowerCase().includes('suiet') ||
                k.toLowerCase().includes('ethos')
            );
            if (relevantProps.length > 0) {
                console.log('🔍 Found potentially relevant window properties:', relevantProps);
                relevantProps.forEach(prop => {
                    try {
                        const val = window[prop];
                        console.log(`  - window.${prop}:`, typeof val, val ? 'exists' : 'null/undefined');
                    } catch (e) {
                        console.log(`  - window.${prop}:`, 'access error');
                    }
                });
            }
            
            console.log('\n💡 Troubleshooting steps:');
            console.log('  1. Open Chrome Extensions page (chrome://extensions/)');
            console.log('  2. Make sure your Sui wallet extension is ENABLED');
            console.log('  3. Check if the extension has "Allow access to file URLs" enabled');
            console.log('  4. Refresh this page (F5)');
            console.log('  5. Try opening the wallet extension popup manually first');
            console.log('  6. Check if the extension works on other Sui dApps');
        } else {
            wallets.forEach(w => console.log('  ✅', w.name));
        }
        
        // Return just the wallet objects for compatibility
        return wallets.map(w => w.wallet);
    }
    
    disconnectWallet() {
        this.wallet = null;
        this.address = null;
        this.connected = false;
        
        // Clear localStorage
        localStorage.removeItem('suiWalletAddress');
        
        // Update UI
        this.updateWalletUI();
        
        console.log('Wallet disconnected');
        
        // Notify game instance
        if (window.game && typeof window.game.onWalletDisconnected === 'function') {
            window.game.onWalletDisconnected();
        }
    }
    
    async setupBlockchainConnection() {
        try {
            console.log('🔗 Setting up blockchain connection...');
            
            // Verify the address is valid on Sui blockchain
            if (this.address && this.address.startsWith('0x')) {
                console.log('✅ Valid Sui address format');
                
                // Test connection by getting account info
                const accountInfo = await this.getAccountInfo();
                if (accountInfo) {
                    console.log('✅ Blockchain connection verified');
                    return true;
                }
            }
        } catch (error) {
            console.warn('⚠️ Blockchain connection setup warning:', error.message);
            // Don't fail the connection if blockchain query fails
            // Wallet might still work for signing
        }
        return false;
    }
    
    async getBalance() {
        try {
            if (!this.address) return '0';
            
            // Query Sui blockchain for balance using RPC
            const response = await fetch(this.rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'suix_getBalance',
                    params: [this.address]
                })
            });
            
            const data = await response.json();
            if (data.result) {
                // Balance is in MIST (1 SUI = 1,000,000,000 MIST)
                const balanceMist = parseInt(data.result.totalBalance || '0');
                const balanceSui = balanceMist / 1000000000;
                return balanceSui.toFixed(4);
            }
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
        return '0';
    }
    
    async getAccountInfo() {
        try {
            if (!this.address) return null;
            
            // Get account information from Sui blockchain
            const response = await fetch(this.rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'sui_getObject',
                    params: [this.address]
                })
            });
            
            const data = await response.json();
            return data.result;
        } catch (error) {
            console.error('Error fetching account info:', error);
            return null;
        }
    }
    
    showConnectionConfirmation(address, balance) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'wallet-confirmation';
        notification.innerHTML = `
            <div class="wallet-confirmation-content">
                <div class="wallet-confirmation-icon">✅</div>
                <div class="wallet-confirmation-text">
                    <strong>Wallet Connected!</strong>
                    <div class="wallet-confirmation-address">${address.substring(0, 8)}...${address.substring(address.length - 6)}</div>
                    <div class="wallet-confirmation-balance">Balance: ${balance} SUI</div>
                    <div class="wallet-confirmation-network">Network: Sui ${this.network.charAt(0).toUpperCase() + this.network.slice(1)}</div>
                </div>
                <button class="wallet-confirmation-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
    
    updateWalletUI() {
        const connectBtn = document.getElementById('walletConnectBtn');
        const walletInfo = document.getElementById('walletInfo');
        const walletStatus = document.getElementById('walletStatus');
        const walletAddress = document.getElementById('walletAddress');
        const walletNetwork = document.getElementById('walletNetwork');
        
        if (this.connected && this.address) {
            // Show connected state
            if (connectBtn) connectBtn.classList.add('connected');
            if (walletStatus) walletStatus.textContent = '✅ Connected';
            if (walletInfo) walletInfo.classList.remove('hidden');
            if (walletAddress) {
                // Show shortened address
                const shortAddress = `${this.address.substring(0, 6)}...${this.address.substring(this.address.length - 4)}`;
                walletAddress.textContent = shortAddress;
                walletAddress.title = this.address; // Full address on hover
            }
            if (walletNetwork) {
                walletNetwork.textContent = `Sui ${this.network.charAt(0).toUpperCase() + this.network.slice(1)}`;
            }
        } else {
            // Show disconnected state
            if (connectBtn) connectBtn.classList.remove('connected');
            if (walletStatus) walletStatus.textContent = '🔗 Connect Wallet';
            if (walletInfo) walletInfo.classList.add('hidden');
        }
    }
    
    getAddress() {
        return this.address;
    }
    
    isConnected() {
        return this.connected && this.address !== null;
    }
    
    async signMessage(message) {
        if (!this.isConnected() || !this.wallet) {
            throw new Error('Wallet not connected');
        }
        
        try {
            const result = await this.wallet.signMessage({
                message: new TextEncoder().encode(message)
            });
            return result;
        } catch (error) {
            console.error('Sign message error:', error);
            throw error;
        }
    }
}

// Initialize wallet manager when DOM is ready
let walletManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        walletManager = new SuiWalletManager();
        window.walletManager = walletManager;
        
        // Expose debug function
        window.debugWallet = () => {
            console.log('=== Wallet Debug ===');
            console.log('Wallet Manager:', walletManager);
            console.log('Connected:', walletManager.isConnected());
            console.log('Address:', walletManager.getAddress());
            console.log('Detected wallets:', walletManager.detectWallets());
            console.log('Window objects:', {
                suiWallet: !!window.suiWallet,
                suiet: !!window.suiet,
                ethosWallet: !!window.ethosWallet,
                navigatorWallets: !!(window.navigator && window.navigator.wallets),
                windowWallets: !!window.wallets
            });
        };
    });
} else {
    walletManager = new SuiWalletManager();
    window.walletManager = walletManager;
    
    // Expose debug function
    window.debugWallet = () => {
        console.log('=== Wallet Debug ===');
        console.log('Wallet Manager:', walletManager);
        console.log('Connected:', walletManager.isConnected());
        console.log('Address:', walletManager.getAddress());
        console.log('Detected wallets:', walletManager.detectWallets());
        console.log('Window objects:', {
            suiWallet: !!window.suiWallet,
            suiet: !!window.suiet,
            ethosWallet: !!window.ethosWallet,
            navigatorWallets: !!(window.navigator && window.navigator.wallets),
            windowWallets: !!window.wallets
        });
    };
}

