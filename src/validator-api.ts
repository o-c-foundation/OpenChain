import express from 'express';
import { Validator } from './validator';
import { Blockchain } from './blockchain';
import { Transaction } from './transaction';
import { Block } from './block';
import { SmartContract } from './smart-contract';
import { rateLimit } from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

const router = express.Router();

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiting to all routes
router.use(limiter);

// Initialize validator
let validator: Validator;

export function initializeValidator(blockchain: Blockchain, validatorAddress: string, validatorPrivateKey: string) {
    validator = new Validator(blockchain, validatorAddress, validatorPrivateKey);
    validator.start();
}

// Get validator status
router.get('/status', (req, res) => {
    try {
        const stats = validator.getNetworkStats();
        res.json({
            status: 'active',
            validatorAddress: validator.getValidatorAddress(),
            stats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit transaction for validation
router.post('/transactions', async (req, res) => {
    try {
        const { from, to, amount, signature, isContract, contractAddress } = req.body;
        
        // Create transaction
        const transaction = new Transaction(
            from,
            to,
            amount,
            signature,
            isContract,
            contractAddress
        );

        // Add to pending transactions
        await validator.validatePendingTransactions();
        
        res.json({
            status: 'pending',
            transactionHash: transaction.hash
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Submit block for validation
router.post('/blocks', async (req, res) => {
    try {
        const { index, timestamp, transactions, previousHash, hash, nonce } = req.body;
        
        // Create block
        const block = new Block(
            index,
            timestamp,
            transactions,
            previousHash,
            hash,
            nonce
        );

        // Add to pending blocks
        await validator.validatePendingBlocks();
        
        res.json({
            status: 'pending',
            blockHash: block.hash
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get network health
router.get('/health', (req, res) => {
    try {
        const stats = validator.getNetworkStats();
        res.json(stats.networkHealth);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get performance metrics
router.get('/performance', (req, res) => {
    try {
        const stats = validator.getNetworkStats();
        res.json(stats.performance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get security status
router.get('/security', (req, res) => {
    try {
        const stats = validator.getNetworkStats();
        res.json(stats.security);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get monitoring alerts
router.get('/alerts', (req, res) => {
    try {
        const stats = validator.getNetworkStats();
        res.json(stats.monitoring);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Smart contract validation
router.post('/contracts/validate', async (req, res) => {
    try {
        const { contractAddress, transaction } = req.body;
        
        const contract = new SmartContract(contractAddress);
        const isValid = await contract.validateTransaction(transaction);
        
        res.json({ isValid });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Generate session token for API access
router.post('/auth/token', (req, res) => {
    try {
        const token = uuidv4();
        const hashedToken = createHash('sha256').update(token).digest('hex');
        
        // Store hashed token (in a real implementation, use a database)
        // For now, we'll just return the token
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router; 