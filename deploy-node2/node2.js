// Node 2 REST API Server
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = 3000;

// Node 2 network configuration
const nodeConfig = {
  nodeId: 'node2',
  name: 'OpenChain Node 2',
  ip: '52.70.33.81', // This is the EC2 instance IP for Node 2
  port: PORT,
  role: 'validator',
  peers: ['node1']
};

// Primary node connection
const primaryNode = {
  url: 'http://98.82.10.184:3000',
  sync: true,
  syncInterval: 10000 // 10 seconds
};

// In-memory storage
let blocks = [];
let transactions = [];
let mempool = [];
let coinPrice = 150;
let syncInProgress = false;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to calculate wallet balance
function getWalletBalance(address) {
  let balance = 0;
  transactions.forEach(tx => {
    if (tx.data.to === address) balance += tx.data.amount;
    if (tx.data.from === address && tx.data.from !== 'system') balance -= tx.data.amount;
  });
  return balance;
}

// Sync data from primary node
async function syncWithPrimary() {
  if (syncInProgress || !primaryNode.sync) return;
  
  syncInProgress = true;
  console.log(`Syncing with primary node: ${primaryNode.url}`);
  
  try {
    // Sync blocks
    const blocksResponse = await axios.get(`${primaryNode.url}/api/blocks`);
    blocks = blocksResponse.data.blocks;
    
    // Sync transactions
    const txResponse = await axios.get(`${primaryNode.url}/api/transactions`);
    transactions = txResponse.data.transactions;
    
    console.log(`Sync completed. Blocks: ${blocks.length}, Transactions: ${transactions.length}`);
  } catch (error) {
    console.error('Error syncing with primary node:', error.message);
  } finally {
    syncInProgress = false;
  }
}

// Routes - these match the primary node API
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    nodeId: nodeConfig.nodeId,
    role: nodeConfig.role,
    peers: nodeConfig.peers,
    blockHeight: blocks.length,
    timestamp: new Date().toISOString(),
    coinPrice: coinPrice,
    synced: !syncInProgress
  });
});

app.get('/api/peers', (req, res) => {
  res.json({
    nodeId: nodeConfig.nodeId,
    peers: nodeConfig.peers
  });
});

app.get('/api/blocks', (req, res) => {
  res.json({
    count: blocks.length,
    blocks: blocks
  });
});

app.get('/api/blocks/:hash', (req, res) => {
  const block = blocks.find(b => b.hash === req.params.hash);
  if (!block) {
    return res.status(404).json({ error: 'Block not found' });
  }
  res.json(block);
});

app.post('/api/blocks', (req, res) => {
  const newBlock = req.body;
  console.log(`Received new block: ${JSON.stringify(newBlock)}`);
  blocks.push(newBlock);
  res.status(201).json({
    message: 'Block added successfully',
    block: newBlock
  });
});

app.get('/api/transactions', (req, res) => {
  res.json({
    count: transactions.length,
    transactions: transactions
  });
});

app.get('/api/balance/:address', (req, res) => {
  const balance = getWalletBalance(req.params.address);
  res.json({
    balance: balance,
    balanceUSD: balance * coinPrice
  });
});

app.post('/api/transactions', async (req, res) => {
  const transaction = req.body;
  console.log('Received new transaction:', transaction);

  if (!transaction.data || !transaction.data.from || !transaction.data.to || !transaction.data.amount) {
    return res.status(400).json({ error: 'Invalid transaction format' });
  }

  // Forward transaction to primary node
  try {
    const response = await axios.post(`${primaryNode.url}/api/transactions`, transaction);
    
    // Add to local transactions after successful forwarding
    transactions.push(transaction);
    
    res.json({
      message: 'Transaction forwarded to primary node',
      transaction: transaction,
      primary_response: response.data
    });
  } catch (error) {
    console.error('Error forwarding transaction:', error.message);
    res.status(500).json({
      error: 'Failed to forward transaction to primary node',
      details: error.message
    });
  }
});

// Start server and initial sync
async function initialize() {
  // Perform initial sync
  await syncWithPrimary();
  
  // Set up regular sync interval
  setInterval(syncWithPrimary, primaryNode.syncInterval);
  
  // Start the server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Node 2 API server running at http://0.0.0.0:${PORT}`);
    console.log(`Node ID: ${nodeConfig.nodeId}`);
    console.log(`Role: ${nodeConfig.role}`);
    console.log(`Connected to primary node: ${primaryNode.url}`);
    console.log(`Static files being served from: ${path.join(__dirname, 'public')}`);
  });
}

// Start everything
initialize(); 