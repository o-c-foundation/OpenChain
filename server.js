const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const contractRoutes = require('./src/contract-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Blockchain configuration
const BLOCKCHAIN_CONFIG = {
    maxSupply: 100000000, // 100 million coins max supply
    currentSupply: 0,
    coinValueUSD: 150, // $150 USD per coin
    blockReward: 50, // Mining reward
    difficulty: 4
};

// Mock data for demonstration
let blockchain = {
    chain: [],
    pendingTransactions: [],
    wallets: []
};

// Generate some initial data
function initMockData() {
    // Generate 10 blocks
    for (let i = 0; i < 10; i++) {
        const transactions = [];
        const txCount = Math.floor(Math.random() * 5) + 1;
        
        for (let j = 0; j < txCount; j++) {
            transactions.push({
                id: crypto.randomBytes(32).toString('hex'),
                fromAddress: j === 0 ? null : crypto.randomBytes(32).toString('hex'),
                toAddress: crypto.randomBytes(32).toString('hex'),
                amount: Math.random() * 100,
                timestamp: Date.now() - Math.random() * 86400000,
                signature: crypto.randomBytes(64).toString('hex')
            });
        }
        
        blockchain.chain.push({
            height: i,
            hash: crypto.randomBytes(32).toString('hex'),
            previousHash: i === 0 ? '0'.repeat(64) : blockchain.chain[i-1].hash,
            timestamp: Date.now() - (10 - i) * 600000,
            nonce: Math.floor(Math.random() * 100000),
            transactions: transactions
        });
    }
    
    // Generate some pending transactions
    for (let i = 0; i < 3; i++) {
        blockchain.pendingTransactions.push({
            id: crypto.randomBytes(32).toString('hex'),
            fromAddress: crypto.randomBytes(32).toString('hex'),
            toAddress: crypto.randomBytes(32).toString('hex'),
            amount: Math.random() * 100,
            timestamp: Date.now() - Math.random() * 3600000,
            signature: crypto.randomBytes(64).toString('hex')
        });
    }
    
    // Generate wallets
    // First wallet - user's wallet with 10,000,000 coins
    const userWalletAddress = crypto.randomBytes(32).toString('hex');
    blockchain.wallets.push({
        name: "My Primary Wallet",
        address: userWalletAddress,
        balance: 10000000, // 10 million coins
        encrypted: false,
        isUserWallet: true // Mark as user's wallet for easy identification
    });
    
    // Track coin supply
    BLOCKCHAIN_CONFIG.currentSupply += 10000000;
    
    // Generate some additional wallets with smaller balances
    for (let i = 0; i < 2; i++) {
        const address = crypto.randomBytes(32).toString('hex');
        const balance = Math.random() * 1000 + 1000; // 1000-2000 coins
        blockchain.wallets.push({
            name: `Wallet ${i+1}`,
            address: address,
            balance: balance,
            encrypted: i % 2 === 0
        });
        
        // Track coin supply
        BLOCKCHAIN_CONFIG.currentSupply += balance;
    }
    
    console.log(`Blockchain initialized with ${BLOCKCHAIN_CONFIG.currentSupply.toLocaleString()} coins in circulation`);
    console.log(`Coin value: $${BLOCKCHAIN_CONFIG.coinValueUSD} USD per coin`);
    console.log(`Total market cap: $${(BLOCKCHAIN_CONFIG.currentSupply * BLOCKCHAIN_CONFIG.coinValueUSD).toLocaleString()} USD`);
}

// Configure CORS
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'], // Allow these methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allow these headers
}));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mount contract API routes
app.use('/contracts', contractRoutes);

// Add some debugging middleware to log requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// API endpoints
app.get('/info', (req, res) => {
    res.json({
        blocks: blockchain.chain.length,
        transactions: blockchain.chain.reduce((count, block) => count + block.transactions.length, 0),
        peers: Math.floor(Math.random() * 10) + 5,
        hashRate: Math.random() * 1000000,
        difficulty: BLOCKCHAIN_CONFIG.difficulty,
        coinValueUSD: BLOCKCHAIN_CONFIG.coinValueUSD,
        currentSupply: BLOCKCHAIN_CONFIG.currentSupply,
        maxSupply: BLOCKCHAIN_CONFIG.maxSupply,
        marketCap: BLOCKCHAIN_CONFIG.currentSupply * BLOCKCHAIN_CONFIG.coinValueUSD
    });
});

app.get('/blocks', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    const blocks = blockchain.chain
        .sort((a, b) => b.height - a.height)
        .slice(offset, offset + limit);
    
    res.json(blocks);
});

app.get('/block/:id', (req, res) => {
    const id = req.params.id;
    let block;
    
    if (/^\d+$/.test(id)) {
        // Search by height
        block = blockchain.chain.find(b => b.height === parseInt(id));
    } else {
        // Search by hash
        block = blockchain.chain.find(b => b.hash === id);
    }
    
    if (block) {
        res.json(block);
    } else {
        res.status(404).json({ error: 'Block not found' });
    }
});

app.get('/transactions', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type || 'all';
    
    let transactions = [];
    
    if (type === 'pending') {
        transactions = blockchain.pendingTransactions;
    } else {
        // Get all transactions from all blocks
        blockchain.chain.forEach(block => {
            block.transactions.forEach(tx => {
                transactions.push({ ...tx, blockHeight: block.height });
            });
        });
    }
    
    // Sort by timestamp (newest first)
    transactions = transactions
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(offset, offset + limit);
    
    res.json(transactions);
});

app.get('/transaction/:id', (req, res) => {
    const id = req.params.id;
    
    // Search in pending transactions
    let tx = blockchain.pendingTransactions.find(t => t.id === id);
    
    if (!tx) {
        // Search in block transactions
        for (const block of blockchain.chain) {
            tx = block.transactions.find(t => t.id === id);
            if (tx) {
                tx = { ...tx, blockHeight: block.height };
                break;
            }
        }
    }
    
    if (tx) {
        res.json(tx);
    } else {
        res.status(404).json({ error: 'Transaction not found' });
    }
});

app.get('/address/:address', (req, res) => {
    const address = req.params.address;
    const wallet = blockchain.wallets.find(w => w.address === address);
    
    if (wallet) {
        const walletWithValue = {
            ...wallet,
            valueUSD: wallet.balance * BLOCKCHAIN_CONFIG.coinValueUSD
        };
        res.json(walletWithValue);
    } else {
        res.status(404).json({ error: 'Address not found' });
    }
});

app.get('/address/:address/transactions', (req, res) => {
    const address = req.params.address;
    const transactions = [];
    
    // Find transactions in blocks
    blockchain.chain.forEach(block => {
        block.transactions.forEach(tx => {
            if (tx.fromAddress === address || tx.toAddress === address) {
                transactions.push({ ...tx, blockHeight: block.height });
            }
        });
    });
    
    // Find pending transactions
    blockchain.pendingTransactions.forEach(tx => {
        if (tx.fromAddress === address || tx.toAddress === address) {
            transactions.push({ ...tx, pending: true });
        }
    });
    
    // Sort by timestamp (newest first)
    transactions.sort((a, b) => b.timestamp - a.timestamp);
    
    res.json(transactions);
});

app.get('/wallets', (req, res) => {
    // Add USD value to each wallet
    const walletsWithValue = blockchain.wallets.map(wallet => ({
        ...wallet,
        valueUSD: wallet.balance * BLOCKCHAIN_CONFIG.coinValueUSD
    }));
    
    res.json(walletsWithValue);
});

app.post('/wallet/create', (req, res) => {
    const { name, password } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Wallet name is required' });
    }
    
    const address = crypto.randomBytes(32).toString('hex');
    const privateKey = crypto.randomBytes(32).toString('hex');
    
    const wallet = {
        name,
        address,
        privateKey,
        balance: 100, // Start with some coins
        encrypted: Boolean(password),
        valueUSD: 100 * BLOCKCHAIN_CONFIG.coinValueUSD
    };
    
    blockchain.wallets.push(wallet);
    BLOCKCHAIN_CONFIG.currentSupply += 100;
    
    res.json(wallet);
});

app.post('/wallet/import', (req, res) => {
    const { privateKey, name, password } = req.body;
    
    if (!privateKey || !name) {
        return res.status(400).json({ error: 'Private key and name are required' });
    }
    
    // In a real implementation, we would derive the address from the private key
    const address = crypto.createHash('sha256').update(privateKey).digest('hex');
    
    const wallet = {
        name,
        address,
        privateKey,
        balance: 500, // Imported wallets get more coins for testing
        encrypted: Boolean(password),
        valueUSD: 500 * BLOCKCHAIN_CONFIG.coinValueUSD
    };
    
    blockchain.wallets.push(wallet);
    BLOCKCHAIN_CONFIG.currentSupply += 500;
    
    res.json(wallet);
});

app.post('/transaction/create', (req, res) => {
    const { fromAddress, toAddress, amount, password } = req.body;
    
    if (!fromAddress || !toAddress || !amount) {
        return res.status(400).json({ error: 'From address, to address, and amount are required' });
    }
    
    const wallet = blockchain.wallets.find(w => w.address === fromAddress);
    
    if (!wallet) {
        return res.status(404).json({ error: 'Sender wallet not found' });
    }
    
    if (wallet.encrypted && !password) {
        return res.status(401).json({ error: 'Password required for encrypted wallet' });
    }
    
    if (wallet.balance < amount) {
        return res.status(400).json({ error: 'Insufficient funds' });
    }
    
    const transaction = {
        id: crypto.randomBytes(32).toString('hex'),
        fromAddress,
        toAddress,
        amount: parseFloat(amount),
        timestamp: Date.now(),
        signature: crypto.randomBytes(64).toString('hex'),
        valueUSD: parseFloat(amount) * BLOCKCHAIN_CONFIG.coinValueUSD
    };
    
    // Update wallet balances
    wallet.balance -= amount;
    
    const recipientWallet = blockchain.wallets.find(w => w.address === toAddress);
    if (recipientWallet) {
        recipientWallet.balance += amount;
    }
    
    blockchain.pendingTransactions.push(transaction);
    
    res.json(transaction);
});

// New endpoint to mine a block (limited by max supply)
app.post('/mine', (req, res) => {
    const { minerAddress } = req.body;
    
    if (!minerAddress) {
        return res.status(400).json({ error: 'Miner address is required' });
    }
    
    // Check if mining cap reached
    if (BLOCKCHAIN_CONFIG.currentSupply >= BLOCKCHAIN_CONFIG.maxSupply) {
        return res.status(400).json({ 
            error: 'Mining cap reached', 
            message: 'The maximum supply of 100 million coins has been reached.' 
        });
    }
    
    // Calculate available rewards (don't exceed max supply)
    const availableToMine = BLOCKCHAIN_CONFIG.maxSupply - BLOCKCHAIN_CONFIG.currentSupply;
    const reward = Math.min(BLOCKCHAIN_CONFIG.blockReward, availableToMine);
    
    if (reward <= 0) {
        return res.status(400).json({ 
            error: 'No rewards available', 
            message: 'All coins have been mined.' 
        });
    }
    
    // Find miner's wallet
    const minerWallet = blockchain.wallets.find(w => w.address === minerAddress);
    if (!minerWallet) {
        return res.status(404).json({ error: 'Miner wallet not found' });
    }
    
    // Create mining reward transaction
    const rewardTransaction = {
        id: crypto.randomBytes(32).toString('hex'),
        fromAddress: null, // Mining reward has no sender
        toAddress: minerAddress,
        amount: reward,
        timestamp: Date.now(),
        signature: 'MINING_REWARD',
        valueUSD: reward * BLOCKCHAIN_CONFIG.coinValueUSD
    };
    
    // Create a new block
    const previousBlock = blockchain.chain[blockchain.chain.length - 1];
    const newBlock = {
        height: blockchain.chain.length,
        hash: crypto.randomBytes(32).toString('hex'),
        previousHash: previousBlock.hash,
        timestamp: Date.now(),
        nonce: Math.floor(Math.random() * 100000),
        transactions: [rewardTransaction, ...blockchain.pendingTransactions.slice(0, 5)]
    };
    
    // Add block to chain
    blockchain.chain.push(newBlock);
    
    // Update miner's balance
    minerWallet.balance += reward;
    
    // Update current supply
    BLOCKCHAIN_CONFIG.currentSupply += reward;
    
    // Clear processed transactions from pending
    const processedTxIds = newBlock.transactions.map(tx => tx.id);
    blockchain.pendingTransactions = blockchain.pendingTransactions.filter(
        tx => !processedTxIds.includes(tx.id)
    );
    
    res.json({
        success: true,
        block: newBlock,
        reward,
        minerBalance: minerWallet.balance,
        currentSupply: BLOCKCHAIN_CONFIG.currentSupply,
        remainingToMine: BLOCKCHAIN_CONFIG.maxSupply - BLOCKCHAIN_CONFIG.currentSupply
    });
});

// Initialize data and start server
initMockData();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Open http://localhost:${PORT}/openchain-app.html in your browser to access the application');
}); 