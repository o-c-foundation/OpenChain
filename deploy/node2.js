// Node 2 REST API Server
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 9002;

// Node 2 network configuration
const nodeConfig = {
  nodeId: 'node2',
  name: 'OpenChain Node 2',
  ip: '52.70.33.81',
  port: PORT,
  peers: [
    { nodeId: 'node1', ip: '98.82.10.184', port: 9001 },
    { nodeId: 'node3', ip: '54.162.177.126', port: 9003 }
  ]
};

// In-memory storage (would be replaced with persistent storage in production)
const blocks = [];
const transactions = [];

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    node: nodeConfig
  });
});

app.get('/peers', (req, res) => {
  res.json({
    nodeId: nodeConfig.nodeId,
    peers: nodeConfig.peers
  });
});

app.get('/blocks', (req, res) => {
  res.json({
    count: blocks.length,
    blocks: blocks
  });
});

app.get('/blocks/:hash', (req, res) => {
  const block = blocks.find(b => b.hash === req.params.hash);
  if (!block) {
    return res.status(404).json({ error: 'Block not found' });
  }
  res.json(block);
});

app.post('/blocks', (req, res) => {
  const newBlock = req.body;
  console.log(`Received new block: ${JSON.stringify(newBlock)}`);
  
  // In a real implementation, would validate the block here
  blocks.push(newBlock);
  
  // In a real implementation, would broadcast to peers
  res.status(201).json({ 
    message: 'Block added successfully',
    block: newBlock
  });
});

app.get('/transactions', (req, res) => {
  res.json({
    count: transactions.length,
    transactions: transactions
  });
});

app.get('/transactions/:id', (req, res) => {
  const transaction = transactions.find(tx => tx.id === req.params.id);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(transaction);
});

app.post('/transactions', (req, res) => {
  const newTransaction = req.body;
  console.log(`Received new transaction: ${JSON.stringify(newTransaction)}`);
  
  // In a real implementation, would validate the transaction here
  transactions.push(newTransaction);
  
  // In a real implementation, would broadcast to peers
  res.status(201).json({ 
    message: 'Transaction added successfully',
    transaction: newTransaction
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Node 2 API server running at http://0.0.0.0:${PORT}`);
  console.log(`Node ID: ${nodeConfig.nodeId}`);
  console.log(`Connected peers: ${nodeConfig.peers.map(p => p.nodeId).join(', ')}`);
}); 