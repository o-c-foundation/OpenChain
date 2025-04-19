import { Block } from './block';
import { Transaction } from './transaction';
import { ConsensusManager } from './consensus/consensus-manager';

export class BlockValidator {
    private consensusManager: ConsensusManager;

    constructor(consensusManager: ConsensusManager) {
        this.consensusManager = consensusManager;
    }

    public validateBlock(block: Block, previousBlock: Block): boolean {
        // 1. Check block structure
        if (!this.validateBlockStructure(block)) {
            return false;
        }

        // 2. Check block hash
        if (!this.validateBlockHash(block)) {
            return false;
        }

        // 3. Check previous block hash
        if (block.previousHash !== previousBlock.hash) {
            return false;
        }

        // 4. Check block index
        if (block.index !== previousBlock.index + 1) {
            return false;
        }

        // 5. Check timestamp
        if (block.timestamp <= previousBlock.timestamp) {
            return false;
        }

        // 6. Validate transactions
        if (!this.validateTransactions(block)) {
            return false;
        }

        // 7. Check consensus rules
        if (!this.consensusManager.validateBlock(block)) {
            return false;
        }

        return true;
    }

    private validateBlockStructure(block: Block): boolean {
        return (
            typeof block.index === 'number' &&
            typeof block.timestamp === 'number' &&
            typeof block.hash === 'string' &&
            typeof block.previousHash === 'string' &&
            Array.isArray(block.transactions)
        );
    }

    private validateBlockHash(block: Block): boolean {
        const calculatedHash = block.calculateHash();
        return calculatedHash === block.hash;
    }

    private validateTransactions(block: Block): boolean {
        // Check for duplicate transactions
        const transactionIds = new Set<string>();
        for (const tx of block.transactions) {
            if (transactionIds.has(tx.id)) {
                return false;
            }
            transactionIds.add(tx.id);

            // Validate transaction signature
            if (!tx.verifySignature()) {
                return false;
            }
        }

        return true;
    }

    public validateGenesisBlock(block: Block): boolean {
        // Genesis block has special validation rules
        return (
            block.index === 0 &&
            block.previousHash === '0'.repeat(64) &&
            block.transactions.length === 0 &&
            this.validateBlockHash(block)
        );
    }

    public validateBlockChain(chain: Block[]): boolean {
        // Validate genesis block
        if (!this.validateGenesisBlock(chain[0])) {
            return false;
        }

        // Validate each subsequent block
        for (let i = 1; i < chain.length; i++) {
            if (!this.validateBlock(chain[i], chain[i - 1])) {
                return false;
            }
        }

        return true;
    }
} 