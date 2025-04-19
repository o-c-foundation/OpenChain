import { Block } from './block';
import { Transaction, TransactionData } from './transaction';
import { SmartContract } from './smart-contract';
import { EventEmitter } from 'events';

export class BlockchainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BlockchainError';
    }
}

export class Blockchain extends EventEmitter {
    public chain: Block[];
    public pendingTransactions: Transaction[];
    public contracts: Map<string, SmartContract>;
    public difficulty: number;
    private miningReward: number;
    private maxSupply: number;
    private circulatingSupply: number;
    public instantTransactions: Map<string, Transaction>;

    constructor() {
        super();
        this.chain = [this.createGenesisBlock()];
        this.pendingTransactions = [];
        this.contracts = new Map();
        this.instantTransactions = new Map();
        this.difficulty = 4;
        this.miningReward = 50;
        this.maxSupply = 100000000; // 100 million coins
        this.circulatingSupply = 0;
        this.initializeGenesisDistribution();
    }

    private createGenesisBlock(): Block {
        return new Block(
            "0",
            [],
            Date.now(),
            0,
            this.difficulty
        );
    }

    private initializeGenesisDistribution(): void {
        const genesisTransaction = new Transaction({
            from: '0x0000000000000000000000000000000000000000', // System address
            to: '0x1000000000000000000000000000000000000000', // Initial distribution address
            amount: 10000000, // 10 million coins
            timestamp: Date.now(),
            nonce: 0,
            data: { type: 'initial_distribution' }
        });

        this.pendingTransactions.push(genesisTransaction);
        this.circulatingSupply += genesisTransaction.data.amount;
    }

    public getLatestBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    public getHeight(): number {
        return this.chain.length - 1;
    }

    public getDifficulty(): number {
        return this.difficulty;
    }

    public addBlock(block: Block): void {
        if (!this.isValidNewBlock(block)) {
            throw new BlockchainError('Invalid block');
        }

        // Process transactions
        for (const transaction of block.transactions) {
            this.processTransaction(transaction);
        }

        this.chain.push(block);
        this.emit('block:added', block);

        // Adjust difficulty every 10 blocks
        if (this.chain.length % 10 === 0) {
            this.adjustDifficulty();
        }

        // Add mining reward
        const rewardTransaction = new Transaction({
            from: '0x0000000000000000000000000000000000000000',
            to: block.transactions[0].data.from, // Miner's address
            amount: this.miningReward,
            timestamp: Date.now(),
            nonce: 0,
            data: { type: 'mining_reward' }
        });

        this.pendingTransactions.push(rewardTransaction);
        this.circulatingSupply += this.miningReward;
    }

    private isValidNewBlock(block: Block): boolean {
        const previousBlock = this.getLatestBlock();

        if (block.height !== this.getHeight() + 1) {
            return false;
        }

        if (block.previousHash !== previousBlock.hash) {
            return false;
        }

        if (!block.isValid()) {
            return false;
        }

        return true;
    }

    private processTransaction(transaction: Transaction): void {
        if (!transaction.verifySignature()) {
            throw new BlockchainError('Invalid transaction signature');
        }

        // Handle contract transactions
        if (transaction.data.data?.type === 'contract_deployment') {
            this.deployContract(transaction);
        } else if (transaction.data.data?.type === 'contract_interaction') {
            this.executeContract(transaction);
        }
    }

    private deployContract(transaction: Transaction): void {
        const contract = new SmartContract(
            transaction.data.data.code,
            transaction.data.from
        );
        this.contracts.set(contract.address, contract);
        this.emit('contract:deployed', contract);
    }

    private executeContract(transaction: Transaction): void {
        const contract = this.contracts.get(transaction.data.to);
        if (!contract) {
            throw new BlockchainError('Contract not found');
        }

        contract.execute(
            transaction.data.data.method,
            transaction.data.data.params,
            transaction.data.from,
            transaction.data.amount,
            this.getHeight()
        );
    }

    private adjustDifficulty(): void {
        const lastTenBlocks = this.chain.slice(-10);
        const averageTime = lastTenBlocks.reduce((sum, block, i) => {
            if (i === 0) return 0;
            return sum + (block.timestamp - lastTenBlocks[i - 1].timestamp);
        }, 0) / 9;

        // Target block time is 5 seconds
        if (averageTime < 4000) { // Too fast
            this.difficulty++;
        } else if (averageTime > 6000) { // Too slow
            this.difficulty = Math.max(1, this.difficulty - 1);
        }
    }

    public addTransaction(transaction: Transaction): void {
        if (!transaction.verifySignature()) {
            throw new BlockchainError('Invalid transaction signature');
        }

        this.pendingTransactions.push(transaction);
        this.emit('transaction:added', transaction);
    }

    public getPendingTransactions(): Transaction[] {
        return [...this.pendingTransactions];
    }

    public getBalance(address: string): number {
        let balance = 0;

        // Check all blocks
        for (const block of this.chain) {
            for (const transaction of block.transactions) {
                if (transaction.data.from === address) {
                    balance -= transaction.data.amount;
                    balance -= transaction.getFee();
                }
                if (transaction.data.to === address) {
                    balance += transaction.data.amount;
                }
            }
        }

        // Check pending transactions
        for (const transaction of this.pendingTransactions) {
            if (transaction.data.from === address) {
                balance -= transaction.data.amount;
                balance -= transaction.getFee();
            }
            if (transaction.data.to === address) {
                balance += transaction.data.amount;
            }
        }

        return balance;
    }

    public getContract(address: string): SmartContract | undefined {
        return this.contracts.get(address);
    }

    public isValidChain(): boolean {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (!currentBlock.isValid()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }

    public getStats(): any {
        return {
            height: this.getHeight(),
            difficulty: this.difficulty,
            circulatingSupply: this.circulatingSupply,
            maxSupply: this.maxSupply,
            pendingTransactions: this.pendingTransactions.length,
            contracts: this.contracts.size
        };
    }

    // Public methods to access protected properties
    public getChain(): Block[] {
        return [...this.chain];
    }
    
    public getPendingBlocks(): Block[] {
        // Placeholder for pending blocks
        return [];
    }
    
    public getBlockByHash(hash: string): Block | undefined {
        return this.chain.find(block => block.hash === hash);
    }
    
    public getBlockTransactions(blockHash: string): Transaction[] {
        const block = this.getBlockByHash(blockHash);
        return block ? [...block.transactions] : [];
    }
    
    public getBlocks(start: number, end: number): Block[] {
        return this.chain.slice(start, end + 1);
    }
    
    public getBalanceOfAddress(address: string): number {
        return this.getBalance(address);
    }
    
    public addValidatedTransaction(tx: Transaction): void {
        this.addTransaction(tx);
    }
    
    public hasValidatedTransaction(hash: string): boolean {
        return this.pendingTransactions.some(tx => tx.hash === hash);
    }
    
    public removeBlock(hash: string): void {
        const index = this.chain.findIndex(block => block.hash === hash);
        if (index !== -1) {
            this.chain.splice(index, 1);
        }
    }
} 