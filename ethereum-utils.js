// ethereum-utils.js
// Safe Ethereum provider utilities that interact with window.ethereum
// WITHOUT modifying or overwriting the global window.ethereum object

class EthereumProvider {
    constructor() {
        this.provider = null;
        this.isConnected = false;
        this.currentAccount = null;
        this.currentChainId = null;
        this.listeners = {
            accountsChanged: [],
            chainChanged: [],
            connected: [],
            disconnected: []
        };
        
        this.init();
    }

    /**
     * Initialize and check for Ethereum provider availability
     */
    init() {
        // Check if window.ethereum exists (MetaMask, etc.)
        if (typeof window.ethereum !== 'undefined') {
            this.provider = window.ethereum;
            console.log('✅ Ethereum provider detected:', this.provider);
            this.setupListeners();
        } else {
            console.warn('⚠️ Ethereum provider not found. Please install MetaMask or similar wallet.');
        }
    }

    /**
     * Check if provider is available
     */
    isProviderAvailable() {
        return this.provider !== null && typeof window.ethereum !== 'undefined';
    }

    /**
     * Setup event listeners on window.ethereum
     * SAFE: Only calls methods, doesn't modify the provider
     */
    setupListeners() {
        if (!this.isProviderAvailable()) return;

        // Listen for account changes
        this.provider.on('accountsChanged', (accounts) => {
            console.log('👤 Accounts changed:', accounts);
            this.currentAccount = accounts[0] || null;
            this.isConnected = accounts.length > 0;
            
            // Call registered listeners
            this.listeners.accountsChanged.forEach(cb => cb(accounts));
            
            if (accounts.length === 0) {
                this.listeners.disconnected.forEach(cb => cb());
            }
        });

        // Listen for chain/network changes
        this.provider.on('chainChanged', (chainId) => {
            console.log('🔗 Chain changed:', chainId);
            this.currentChainId = chainId;
            
            // Call registered listeners
            this.listeners.chainChanged.forEach(cb => cb(chainId));
        });

        // Listen for connection
        this.provider.on('connect', (connectInfo) => {
            console.log('✅ Connected:', connectInfo);
            this.isConnected = true;
            this.listeners.connected.forEach(cb => cb(connectInfo));
        });

        // Listen for disconnection
        this.provider.on('disconnect', (error) => {
            console.log('❌ Disconnected:', error);
            this.isConnected = false;
            this.currentAccount = null;
            this.listeners.disconnected.forEach(cb => cb(error));
        });
    }

    /**
     * Register custom event listeners
     * Usage: ethereumProvider.on('accountsChanged', (accounts) => { ... })
     */
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
            return () => {
                this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
            };
        }
    }

    /**
     * Request account access
     * SAFE: Only calls eth_requestAccounts, doesn't modify provider
     */
    async requestAccounts() {
        if (!this.isProviderAvailable()) {
            throw new Error('Ethereum provider not available');
        }

        try {
            const accounts = await this.provider.request({
                method: 'eth_requestAccounts'
            });
            
            this.currentAccount = accounts[0];
            this.isConnected = true;
            console.log('✅ Account access granted:', accounts);
            
            return accounts;
        } catch (error) {
            if (error.code === 4001) {
                console.warn('⚠️ User denied account access');
            } else if (error.code === -32002) {
                console.warn('⚠️ Request already pending. Check your wallet.');
            } else {
                console.error('❌ Error requesting accounts:', error);
            }
            throw error;
        }
    }

    /**
     * Get current accounts
     * SAFE: Only calls eth_accounts, doesn't modify provider
     */
    async getAccounts() {
        if (!this.isProviderAvailable()) {
            throw new Error('Ethereum provider not available');
        }

        try {
            const accounts = await this.provider.request({
                method: 'eth_accounts'
            });
            return accounts;
        } catch (error) {
            console.error('❌ Error getting accounts:', error);
            throw error;
        }
    }

    /**
     * Get current chain ID
     * SAFE: Only calls eth_chainId, doesn't modify provider
     */
    async getChainId() {
        if (!this.isProviderAvailable()) {
            throw new Error('Ethereum provider not available');
        }

        try {
            const chainId = await this.provider.request({
                method: 'eth_chainId'
            });
            this.currentChainId = chainId;
            console.log('🔗 Current chain ID:', chainId);
            return chainId;
        } catch (error) {
            console.error('❌ Error getting chain ID:', error);
            throw error;
        }
    }

    /**
     * Get network ID
     * SAFE: Only calls net_version, doesn't modify provider
     */
    async getNetworkId() {
        if (!this.isProviderAvailable()) {
            throw new Error('Ethereum provider not available');
        }

        try {
            const networkId = await this.provider.request({
                method: 'net_version'
            });
            return networkId;
        } catch (error) {
            console.error('❌ Error getting network ID:', error);
            throw error;
        }
    }

    /**
     * Get balance of an account
     * SAFE: Only calls eth_getBalance, doesn't modify provider
     */
    async getBalance(address, block = 'latest') {
        if (!this.isProviderAvailable()) {
            throw new Error('Ethereum provider not available');
        }

        try {
            const balance = await this.provider.request({
                method: 'eth_getBalance',
                params: [address, block]
            });
            
            // Convert from wei to ETH (1 ETH = 10^18 wei)
            const ethBalance = parseInt(balance, 16) / 1e18;
            console.log(`💰 Balance of ${address}: ${ethBalance} ETH`);
            
            return {
                wei: balance,
                eth: ethBalance
            };
        } catch (error) {
            console.error('❌ Error getting balance:', error);
            throw error;
        }
    }

    /**
     * Send a simple transaction (ETH transfer)
     * SAFE: Only calls eth_sendTransaction, doesn't modify provider
     * 
     * @param {Object} transactionParams - Transaction parameters
     * @param {string} transactionParams.to - Recipient address
     * @param {string} transactionParams.value - Amount in wei (or hex)
     * @param {string} transactionParams.data - Optional contract data
     * @param {string} transactionParams.gasLimit - Optional gas limit
     */
    async sendTransaction(transactionParams) {
        if (!this.isProviderAvailable()) {
            throw new Error('Ethereum provider not available');
        }

        if (!this.currentAccount) {
            throw new Error('No account connected. Call requestAccounts() first.');
        }

        // Build transaction with defaults
        const tx = {
            from: this.currentAccount,
            ...transactionParams
        };

        try {
            console.log('📤 Sending transaction:', tx);
            
            const txHash = await this.provider.request({
                method: 'eth_sendTransaction',
                params: [tx]
            });
            
            console.log('✅ Transaction sent! Hash:', txHash);
            return txHash;
        } catch (error) {
            if (error.code === 4001) {
                console.warn('⚠️ User rejected the transaction');
            } else {
                console.error('❌ Error sending transaction:', error);
            }
            throw error;
        }
    }

    /**
     * Example: Send 0.1 ETH to an address
     */
    async sendETH(toAddress, ethAmount) {
        // Convert ETH to wei (1 ETH = 10^18 wei)
        const weiAmount = (ethAmount * 1e18).toString(16);
        
        return this.sendTransaction({
            to: toAddress,
            value: '0x' + weiAmount.padStart(1, '0')
        });
    }

    /**
     * Estimate gas for a transaction
     * SAFE: Only calls eth_estimateGas, doesn't modify provider
     */
    async estimateGas(transactionParams) {
        if (!this.isProviderAvailable()) {
            throw new Error('Ethereum provider not available');
        }

        try {
            const gasEstimate = await this.provider.request({
                method: 'eth_estimateGas',
                params: [transactionParams]
            });
            
            const gasInt = parseInt(gasEstimate, 16);
            console.log('⛽ Estimated gas:', gasInt);
            
            return gasEstimate;
        } catch (error) {
            console.error('❌ Error estimating gas:', error);
            throw error;
        }
    }

    /**
     * Get gas price
     * SAFE: Only calls eth_gasPrice, doesn't modify provider
     */
    async getGasPrice() {
        if (!this.isProviderAvailable()) {
            throw new Error('Ethereum provider not available');
        }

        try {
            const gasPrice = await this.provider.request({
                method: 'eth_gasPrice'
            });
            
            const gasPriceWei = parseInt(gasPrice, 16);
            const gasPriceGwei = gasPriceWei / 1e9;
            
            console.log(`⛽ Gas price: ${gasPriceGwei} Gwei`);
            
            return {
                wei: gasPrice,
                gwei: gasPriceGwei
            };
        } catch (error) {
            console.error('❌ Error getting gas price:', error);
            throw error;
        }
    }

    /**
     * Get transaction count (for nonce)
     * SAFE: Only calls eth_getTransactionCount, doesn't modify provider
     */
    async getTransactionCount(address, block = 'latest') {
        if (!this.isProviderAvailable()) {
            throw new Error('Ethereum provider not available');
        }

        try {
            const count = await this.provider.request({
                method: 'eth_getTransactionCount',
                params: [address, block]
            });
            
            const nonce = parseInt(count, 16);
            console.log(`📊 Transaction count for ${address}: ${nonce}`);
            
            return nonce;
        } catch (error) {
            console.error('❌ Error getting transaction count:', error);
            throw error;
        }
    }

    /**
     * Switch to a different chain
     * SAFE: Only calls wallet_switchEthereumChain, doesn't modify provider
     */
    async switchChain(chainId) {
        if (!this.isProviderAvailable()) {
            throw new Error('Ethereum provider not available');
        }

        try {
            await this.provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chainId }]
            });
            
            console.log(`✅ Switched to chain: ${chainId}`);
            return true;
        } catch (error) {
            if (error.code === 4902) {
                console.warn('⚠️ Chain not added to wallet. Use addChain() first.');
            } else {
                console.error('❌ Error switching chain:', error);
            }
            throw error;
        }
    }

    /**
     * Add a new chain to wallet
     * SAFE: Only calls wallet_addEthereumChain, doesn't modify provider
     */
    async addChain(chainParams) {
        if (!this.isProviderAvailable()) {
            throw new Error('Ethereum provider not available');
        }

        try {
            await this.provider.request({
                method: 'wallet_addEthereumChain',
                params: [chainParams]
            });
            
            console.log(`✅ Chain added: ${chainParams.chainName}`);
            return true;
        } catch (error) {
            console.error('❌ Error adding chain:', error);
            throw error;
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            currentAccount: this.currentAccount,
            currentChainId: this.currentChainId,
            providerAvailable: this.isProviderAvailable()
        };
    }

    /**
     * Disconnect (user-initiated)
     */
    disconnect() {
        this.isConnected = false;
        this.currentAccount = null;
        console.log('👋 Disconnected from wallet');
    }
}

// Export for use
// Usage: const ethProvider = new EthereumProvider();
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EthereumProvider;
}
