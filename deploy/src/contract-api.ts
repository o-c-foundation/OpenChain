import express from 'express';
import { StateManager } from './state-manager';
import { Transaction } from './transaction';

const router = express.Router();
const stateManager = StateManager.getInstance();

// Deploy a new contract
router.post('/deploy', async (req, res) => {
    try {
        const { from, code, initialParams } = req.body;

        // Validate required parameters
        if (!from) {
            return res.status(400).json({ success: false, error: 'Missing from address' });
        }

        if (!code) {
            return res.status(400).json({ success: false, error: 'Missing contract code' });
        }

        // Generate contract address
        const contractAddress = `contract-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
        
        // Create transaction
        const tx = new Transaction(from, contractAddress, 'DEPLOY', { code, params: initialParams || [] }, 100);
        
        // Add transaction to blockchain
        await stateManager.addTransaction(tx);
        
        console.log(`Contract deployed at address: ${contractAddress}`);
        
        // Return success response
        return res.json({ 
            success: true, 
            contractAddress, 
            txHash: tx.hash 
        });
    } catch (error) {
        console.error('Contract deployment error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Execute a contract method (writing to state)
router.post('/execute', async (req, res) => {
    try {
        const { from, contractAddress, method, params } = req.body;
        
        // Rename contractAddress to 'to' for clarity
        const to = contractAddress;

        // Validate required parameters
        if (!from) {
            return res.status(400).json({ success: false, error: 'Missing from address' });
        }

        if (!to) {
            return res.status(400).json({ success: false, error: 'Missing contract address' });
        }

        if (!method) {
            return res.status(400).json({ success: false, error: 'Missing method name' });
        }
        
        // Create transaction for contract execution
        const tx = new Transaction(from, to, 'EXECUTE', { method, params: params || [] }, 50);
        
        // Add transaction to blockchain
        const result = await stateManager.addTransaction(tx);
        
        // Return success response
        return res.json({ 
            success: true, 
            result,
            txHash: tx.hash 
        });
    } catch (error) {
        console.error('Contract execution error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Call a contract method (read-only)
router.post('/call', async (req, res) => {
    try {
        const { contractAddress, method, params } = req.body;
        
        // Rename contractAddress to 'to' for clarity
        const to = contractAddress;

        // Validate required parameters
        if (!to) {
            return res.status(400).json({ success: false, error: 'Missing contract address' });
        }

        if (!method) {
            return res.status(400).json({ success: false, error: 'Missing method name' });
        }
        
        // Call the contract method (read-only)
        const result = await stateManager.callContractMethod(to, method, params || []);
        
        // Return success response
        return res.json({ 
            success: true, 
            result
        });
    } catch (error) {
        console.error('Contract call error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

export default router; 