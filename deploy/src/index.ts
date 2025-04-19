import express from 'express';
import { Server } from 'http';
import { WebSocketServer } from 'ws';
import { Blockchain } from './blockchain';
import { Validator } from './validator';
import validatorRouter from './validator-api';
import contractRouter from './contract-api';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

// Initialize blockchain
const blockchain = new Blockchain();

// Initialize validator
const validatorAddress = 'validator-address-' + uuidv4();
const validatorPrivateKey = 'validator-private-key-' + uuidv4();
const validator = new Validator(blockchain, validatorAddress, validatorPrivateKey);

// Start validator
validator.start();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/validator', validatorRouter);
app.use('/api/contracts', contractRouter);

// WebSocket setup
const server = new Server(app);
const wss = new WebSocketServer({ server });

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    // Send initial blockchain state
    ws.send(JSON.stringify({
        type: 'blockchain',
        data: blockchain.getChain()
    }));

    // Send initial validator stats
    ws.send(JSON.stringify({
        type: 'validator',
        data: validator.getNetworkStats()
    }));

    // Handle incoming messages
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());
            
            switch (data.type) {
                case 'transaction':
                    // Handle transaction submission
                    const tx = data.data;
                    await validator.validatePendingTransactions();
                    break;
                    
                case 'block':
                    // Handle block submission
                    const block = data.data;
                    await validator.validatePendingBlocks();
                    break;
                    
                case 'contract':
                    // Handle smart contract interaction
                    const contract = data.data;
                    await validator.validatePendingTransactions();
                    break;
            }
        } catch (error) {
            console.error('WebSocket error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                data: error.message
            }));
        }
    });

    // Handle disconnection
    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});

// Start server
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Validator address: ${validatorAddress}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    validator.stop();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
}); 