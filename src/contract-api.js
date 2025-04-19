const express = require('express');
const { StateManager } = require('./state/state-manager');
const { SmartContract } = require('./smart-contract');
const { Blockchain } = require('./blockchain');
const { Transaction } = require('./transaction');
const crypto = require('crypto');

const router = express.Router();
const stateManager = new StateManager();
const blockchain = new Blockchain();

// Deploy a new contract
router.post('/deploy', async (req, res) => {
    try {
        const { from, code, initialParams = [] } = req.body;
        
        if (!from || !code) {
            return res.status(400).json({ success: false, error: 'Missing required parameters' });
        }
        
        // Generate contract address from code + deployer + timestamp
        const contractAddress = crypto.createHash('sha256')
            .update(code + from + Date.now().toString())
            .digest('hex');
        
        // Create the contract
        const success = stateManager.createContract(contractAddress, code);
        
        if (!success) {
            return res.status(400).json({ success: false, error: 'Failed to deploy contract' });
        }
        
        // Create a deployment transaction
        const tx = new Transaction({
            from,
            to: contractAddress,
            amount: 0,
            nonce: stateManager.getAccountNonce(from) + 1,
            timestamp: Date.now(),
            data: {
                type: 'contract_deployment',
                code,
                initialParams
            }
        });
        
        // Add transaction to blockchain
        blockchain.addTransaction(tx);
        
        res.json({
            success: true,
            contractAddress,
            transaction: tx.data
        });
    } catch (error) {
        console.error('Contract deployment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Execute a contract method (modifies state)
router.post('/execute', async (req, res) => {
    try {
        const { from, contractAddress, method, params = [] } = req.body;
        
        if (!from || !contractAddress || !method) {
            return res.status(400).json({ success: false, error: 'Missing required parameters' });
        }
        
        // Get the contract
        const contract = stateManager.getContract(contractAddress);
        if (!contract) {
            return res.status(404).json({ success: false, error: 'Contract not found' });
        }
        
        // Execute the method
        const result = stateManager.executeContract(contractAddress, method, params, from, 0, blockchain.blocks.length);
        
        // Create a transaction for this contract call
        const tx = new Transaction({
            from,
            to: contractAddress,
            amount: 0,
            nonce: stateManager.getAccountNonce(from) + 1,
            timestamp: Date.now(),
            data: {
                type: 'contract_interaction',
                method,
                params,
                result
            }
        });
        
        // Add transaction to blockchain
        blockchain.addTransaction(tx);
        
        res.json({
            success: true,
            result,
            transaction: tx.data
        });
    } catch (error) {
        console.error('Contract execution error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Call a contract method (read only)
router.post('/call', async (req, res) => {
    try {
        const { contractAddress, method, params = [] } = req.body;
        
        if (!contractAddress || !method) {
            return res.status(400).json({ success: false, error: 'Missing required parameters' });
        }
        
        // Get the contract
        const contract = stateManager.getContract(contractAddress);
        if (!contract) {
            return res.status(404).json({ success: false, error: 'Contract not found' });
        }
        
        // Call the method (read only)
        const result = stateManager.executeContract(contractAddress, method, params, null, 0, blockchain.blocks.length);
        
        res.json({
            success: true,
            result
        });
    } catch (error) {
        console.error('Contract call error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get contract details
router.get('/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        // Get the contract state
        const contractState = stateManager.getContractState(address);
        if (!contractState) {
            return res.status(404).json({ success: false, error: 'Contract not found' });
        }
        
        res.json({
            success: true,
            contract: contractState
        });
    } catch (error) {
        console.error('Get contract error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router; 