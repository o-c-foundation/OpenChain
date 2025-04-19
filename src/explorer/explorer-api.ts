import express from 'express';
import { Blockchain } from '../blockchain';
import { ConsensusManager } from '../consensus/consensus-manager';
import { NetworkMonitor } from '../network-monitor';

export class ExplorerAPI {
    private app: express.Application;
    private blockchain: Blockchain;
    private consensusManager: ConsensusManager;
    private networkMonitor: NetworkMonitor;

    constructor(
        blockchain: Blockchain,
        consensusManager: ConsensusManager,
        networkMonitor: NetworkMonitor
    ) {
        this.app = express();
        this.blockchain = blockchain;
        this.consensusManager = consensusManager;
        this.networkMonitor = networkMonitor;
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // Block information
        this.app.get('/api/blocks', (req, res) => {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const start = (page - 1) * limit;
            const end = start + limit;

            const blocks = this.blockchain.chain
                .slice(start, end)
                .map(block => ({
                    number: block.index,
                    hash: block.hash,
                    previousHash: block.previousHash,
                    timestamp: block.timestamp,
                    transactions: block.data,
                    validator: block.data.validator
                }));

            res.json({
                blocks,
                total: this.blockchain.chain.length,
                page,
                totalPages: Math.ceil(this.blockchain.chain.length / limit)
            });
        });

        this.app.get('/api/blocks/:hash', (req, res) => {
            const block = this.blockchain.chain.find(b => b.hash === req.params.hash);
            if (!block) {
                return res.status(404).json({ error: 'Block not found' });
            }

            res.json({
                number: block.index,
                hash: block.hash,
                previousHash: block.previousHash,
                timestamp: block.timestamp,
                transactions: block.data,
                validator: block.data.validator
            });
        });

        // Transaction information
        this.app.get('/api/transactions', (req, res) => {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const start = (page - 1) * limit;
            const end = start + limit;

            const transactions = this.blockchain.chain
                .flatMap(block => block.data)
                .slice(start, end);

            res.json({
                transactions,
                total: this.blockchain.chain.reduce((sum, block) => sum + block.data.length, 0),
                page,
                totalPages: Math.ceil(this.blockchain.chain.reduce((sum, block) => sum + block.data.length, 0) / limit)
            });
        });

        this.app.get('/api/transactions/:id', (req, res) => {
            const transaction = this.blockchain.instantTransactions.get(req.params.id);
            if (!transaction) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            res.json(transaction);
        });

        // Address information
        this.app.get('/api/addresses/:address', (req, res) => {
            const balance = this.blockchain.getBalanceOfAddress(req.params.address);
            const transactions = this.blockchain.chain
                .flatMap(block => block.data)
                .filter(tx => tx.from === req.params.address || tx.to === req.params.address);

            res.json({
                address: req.params.address,
                balance,
                transactionCount: transactions.length,
                transactions
            });
        });

        // Contract information
        this.app.get('/api/contracts', (req, res) => {
            const contracts = Array.from(this.blockchain.contracts.entries())
                .map(([address, contract]) => ({
                    address,
                    owner: contract.owner,
                    balance: contract.getBalance(),
                    state: contract.getState()
                }));

            res.json(contracts);
        });

        this.app.get('/api/contracts/:address', (req, res) => {
            const contract = this.blockchain.contracts.get(req.params.address);
            if (!contract) {
                return res.status(404).json({ error: 'Contract not found' });
            }

            res.json({
                address: req.params.address,
                owner: contract.owner,
                balance: contract.getBalance(),
                state: contract.getState(),
                events: contract.getEvents()
            });
        });

        // Network information
        this.app.get('/api/network/stats', (req, res) => {
            res.json(this.networkMonitor.getStats());
        });

        this.app.get('/api/network/validators', (req, res) => {
            res.json(this.consensusManager.getValidators());
        });

        // Search
        this.app.get('/api/search', (req, res) => {
            const query = req.query.q as string;
            if (!query) {
                return res.status(400).json({ error: 'Search query required' });
            }

            // Search blocks
            const block = this.blockchain.chain.find(b => b.hash === query);
            if (block) {
                return res.json({ type: 'block', data: block });
            }

            // Search transactions
            const transaction = this.blockchain.instantTransactions.get(query);
            if (transaction) {
                return res.json({ type: 'transaction', data: transaction });
            }

            // Search addresses
            if (this.blockchain.getBalanceOfAddress(query) !== 0) {
                return res.json({ type: 'address', data: { address: query } });
            }

            // Search contracts
            const contract = this.blockchain.contracts.get(query);
            if (contract) {
                return res.json({ type: 'contract', data: contract });
            }

            res.status(404).json({ error: 'Not found' });
        });
    }

    public getApp(): express.Application {
        return this.app;
    }
} 