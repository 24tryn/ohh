// ethereum-examples.js
// Example usage of EthereumProvider - Safe Ethereum interactions

/**
 * EXAMPLE 1: Basic Setup and Account Connection
 */
async function example1_BasicSetup() {
    console.log('=== Example 1: Basic Setup ===');
    
    // Create provider instance (checks for window.ethereum automatically)
    const ethProvider = new EthereumProvider();
    
    // Check if provider is available
    if (!ethProvider.isProviderAvailable()) {
        console.log('❌ Ethereum provider not available. Install MetaMask!');
        return;
    }
    
    // Get current status
    console.log('Status:', ethProvider.getStatus());
}

/**
 * EXAMPLE 2: Request Account Access
 */
async function example2_RequestAccounts() {
    console.log('=== Example 2: Request Accounts ===');
    
    const ethProvider = new EthereumProvider();
    
    try {
        // Request account access (shows MetaMask popup)
        const accounts = await ethProvider.requestAccounts();
        console.log('Connected accounts:', accounts);
        console.log('Current account:', ethProvider.currentAccount);
    } catch (error) {
        console.error('Failed to connect:', error.message);
    }
}

/**
 * EXAMPLE 3: Listen for Account Changes
 */
function example3_ListenToAccountChanges() {
    console.log('=== Example 3: Listen to Account Changes ===');
    
    const ethProvider = new EthereumProvider();
    
    // Register listener for account changes
    ethProvider.on('accountsChanged', (accounts) => {
        console.log('🔄 Accounts changed in wallet:', accounts);
        if (accounts.length === 0) {
            console.log('User disconnected their wallet');
        }
    });
    
    // Register listener for chain changes
    ethProvider.on('chainChanged', (chainId) => {
        console.log('🔄 Chain changed:', chainId);
        // chainId examples: 0x1 (Ethereum), 0x89 (Polygon), 0xa (Optimism)
    });
    
    // Register custom listeners
    ethProvider.on('connected', (connectInfo) => {
        console.log('✅ Provider connected:', connectInfo);
    });
    
    ethProvider.on('disconnected', (error) => {
        console.log('❌ Provider disconnected:', error);
    });
}

/**
 * EXAMPLE 4: Get Chain Information
 */
async function example4_ChainInfo() {
    console.log('=== Example 4: Get Chain Information ===');
    
    const ethProvider = new EthereumProvider();
    
    try {
        const chainId = await ethProvider.getChainId();
        console.log('Chain ID:', chainId);
        
        const networkId = await ethProvider.getNetworkId();
        console.log('Network ID:', networkId);
        
        const accounts = await ethProvider.getAccounts();
        console.log('Available accounts:', accounts);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * EXAMPLE 5: Check Account Balance
 */
async function example5_CheckBalance() {
    console.log('=== Example 5: Check Balance ===');
    
    const ethProvider = new EthereumProvider();
    
    try {
        // You need to be connected first
        if (!ethProvider.currentAccount) {
            await ethProvider.requestAccounts();
        }
        
        // Check balance of current account
        const balance = await ethProvider.getBalance(ethProvider.currentAccount);
        console.log(`Your balance: ${balance.eth} ETH`);
        console.log(`Balance in wei: ${balance.wei}`);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * EXAMPLE 6: Send Simple ETH Transaction
 */
async function example6_SendETH() {
    console.log('=== Example 6: Send ETH Transaction ===');
    
    const ethProvider = new EthereumProvider();
    
    try {
        // Ensure account is connected
        if (!ethProvider.currentAccount) {
            await ethProvider.requestAccounts();
        }
        
        // Example: Send 0.01 ETH to an address
        const recipientAddress = '0x742d35Cc6634C0532925a3b844Bc57e8f0C2e10E';
        const ethAmount = 0.01;
        
        const txHash = await ethProvider.sendETH(recipientAddress, ethAmount);
        console.log('Transaction sent! Hash:', txHash);
        
        // Transaction hash can be used to track on block explorer
        // e.g., https://etherscan.io/tx/{txHash}
    } catch (error) {
        if (error.code === 4001) {
            console.log('User cancelled the transaction');
        } else {
            console.error('Error sending transaction:', error.message);
        }
    }
}

/**
 * EXAMPLE 7: Send Custom Transaction
 */
async function example7_CustomTransaction() {
    console.log('=== Example 7: Send Custom Transaction ===');
    
    const ethProvider = new EthereumProvider();
    
    try {
        if (!ethProvider.currentAccount) {
            await ethProvider.requestAccounts();
        }
        
        // Send custom transaction with specific parameters
        const txHash = await ethProvider.sendTransaction({
            to: '0x742d35Cc6634C0532925a3b844Bc57e8f0C2e10E',
            value: '0x' + (0.05 * 1e18).toString(16), // 0.05 ETH in wei
            // Optional: specify gas limit
            gas: '0x5208' // 21000 gas for simple transfer
        });
        
        console.log('Custom transaction sent! Hash:', txHash);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * EXAMPLE 8: Estimate Gas
 */
async function example8_EstimateGas() {
    console.log('=== Example 8: Estimate Gas ===');
    
    const ethProvider = new EthereumProvider();
    
    try {
        if (!ethProvider.currentAccount) {
            await ethProvider.requestAccounts();
        }
        
        // Estimate gas for a transaction
        const gasEstimate = await ethProvider.estimateGas({
            from: ethProvider.currentAccount,
            to: '0x742d35Cc6634C0532925a3b844Bc57e8f0C2e10E',
            value: '0x' + (0.01 * 1e18).toString(16)
        });
        
        console.log('Estimated gas:', gasEstimate);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * EXAMPLE 9: Get Gas Price and Total Cost
 */
async function example9_GasPriceAndCost() {
    console.log('=== Example 9: Gas Price and Transaction Cost ===');
    
    const ethProvider = new EthereumProvider();
    
    try {
        if (!ethProvider.currentAccount) {
            await ethProvider.requestAccounts();
        }
        
        // Get current gas price
        const gasPrice = await ethProvider.getGasPrice();
        console.log(`Gas price: ${gasPrice.gwei} Gwei`);
        
        // Estimate gas for transaction
        const gasEstimate = await ethProvider.estimateGas({
            from: ethProvider.currentAccount,
            to: '0x742d35Cc6634C0532925a3b844Bc57e8f0C2e10E',
            value: '0x' + (0.01 * 1e18).toString(16)
        });
        
        // Calculate total cost (gas * gasPrice + value)
        const gasInWei = parseInt(gasEstimate, 16);
        const gasPriceInWei = parseInt(gasPrice.wei, 16);
        const gasCost = gasInWei * gasPriceInWei;
        const gasCostInETH = gasCost / 1e18;
        const totalCost = gasCostInETH + 0.01; // gas + 0.01 ETH transfer
        
        console.log(`Gas cost: ${gasCostInETH} ETH`);
        console.log(`Total transaction cost: ${totalCost} ETH`);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * EXAMPLE 10: Switch Networks
 */
async function example10_SwitchNetwork() {
    console.log('=== Example 10: Switch Network ===');
    
    const ethProvider = new EthereumProvider();
    
    try {
        // Switch to Polygon mainnet (chainId: 0x89)
        await ethProvider.switchChain('0x89');
        console.log('Switched to Polygon!');
        
        // The chainChanged listener will fire automatically
    } catch (error) {
        if (error.code === 4902) {
            console.log('Chain not in wallet. Adding it...');
            
            // Add Polygon to wallet first
            await ethProvider.addChain({
                chainId: '0x89',
                chainName: 'Polygon',
                rpcUrls: ['https://polygon-rpc.com/'],
                nativeCurrency: {
                    name: 'MATIC',
                    symbol: 'MATIC',
                    decimals: 18
                },
                blockExplorerUrls: ['https://polygonscan.com/']
            });
            
            // Now switch to it
            await ethProvider.switchChain('0x89');
        } else {
            console.error('Error:', error.message);
        }
    }
}

/**
 * EXAMPLE 11: Full Workflow - Connect and Send Transaction
 */
async function example11_FullWorkflow() {
    console.log('=== Example 11: Full Workflow ===');
    
    const ethProvider = new EthereumProvider();
    
    // Step 1: Check provider
    if (!ethProvider.isProviderAvailable()) {
        console.log('❌ MetaMask not installed!');
        return;
    }
    
    // Step 2: Request account access
    try {
        const accounts = await ethProvider.requestAccounts();
        console.log('✅ Connected account:', accounts[0]);
    } catch (error) {
        console.log('❌ Connection denied');
        return;
    }
    
    // Step 3: Get chain info
    const chainId = await ethProvider.getChainId();
    console.log('🔗 Chain ID:', chainId);
    
    // Step 4: Check balance
    const balance = await ethProvider.getBalance(ethProvider.currentAccount);
    console.log('💰 Balance:', balance.eth, 'ETH');
    
    // Step 5: Set up listeners for account changes
    ethProvider.on('accountsChanged', (accounts) => {
        console.log('👤 Account switched to:', accounts[0]);
    });
    
    ethProvider.on('chainChanged', (chainId) => {
        console.log('🔗 Chain switched to:', chainId);
    });
    
    // Step 6: Ready to send transactions
    console.log('✅ All setup complete! Ready to send transactions.');
}

/**
 * EXAMPLE 12: React to Real-Time Events
 */
function example12_RealtimeEvents() {
    console.log('=== Example 12: Real-Time Event Handling ===');
    
    const ethProvider = new EthereumProvider();
    
    // Store listeners that we can clean up later if needed
    const listeners = {};
    
    listeners.onAccountChange = ethProvider.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            console.log('⚠️ User disconnected wallet');
            // Update UI: hide wallet-dependent features
        } else {
            console.log('✅ User connected:', accounts[0]);
            // Update UI: show wallet-dependent features
        }
    });
    
    listeners.onChainChange = ethProvider.on('chainChanged', (chainId) => {
        const chainNames = {
            '0x1': 'Ethereum Mainnet',
            '0x89': 'Polygon',
            '0xa': 'Optimism',
            '0x38': 'Binance Smart Chain'
        };
        console.log('Switched to:', chainNames[chainId] || chainId);
        // Update UI: show chain-specific information
    });
    
    // To unsubscribe (if needed):
    // listeners.onAccountChange();
    // listeners.onChainChange();
}

// ============================================================
// HOW TO USE THESE EXAMPLES:
// ============================================================
// 
// 1. Include this file in your HTML:
//    <script src="ethereum-utils.js"></script>
//    <script src="ethereum-examples.js"></script>
//
// 2. Open browser console (F12)
//
// 3. Run any example:
//    example1_BasicSetup()
//    example2_RequestAccounts()
//    example6_SendETH()
//    etc.
//
// ============================================================
