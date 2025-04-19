import { Block } from '../block';
import { Transaction } from '../transaction';
import { StateManager } from '../state/state-manager';
import { createHash } from 'crypto';

export class PerformanceManager {
    private stateManager: StateManager;
    private blockCache: Map<string, Block>;
    private stateCache: Map<string, any>;
    private transactionBatch: Transaction[];
    private readonly maxCacheSize: number;
    private readonly batchSize: number;

    constructor(stateManager: StateManager, maxCacheSize: number = 1000, batchSize: number = 100) {
        this.stateManager = stateManager;
        this.blockCache = new Map();
        this.stateCache = new Map();
        this.transactionBatch = [];
        this.maxCacheSize = maxCacheSize;
        this.batchSize = batchSize;
    }

    public cacheBlock(block: Block): void {
        if (this.blockCache.size >= this.maxCacheSize) {
            // Remove oldest block from cache
            const oldestKey = this.blockCache.keys().next().value;
            this.blockCache.delete(oldestKey);
        }
        this.blockCache.set(block.hash, block);
    }

    public getCachedBlock(hash: string): Block | undefined {
        return this.blockCache.get(hash);
    }

    public cacheState(address: string, state: any): void {
        if (this.stateCache.size >= this.maxCacheSize) {
            // Remove oldest state from cache
            const oldestKey = this.stateCache.keys().next().value;
            this.stateCache.delete(oldestKey);
        }
        this.stateCache.set(address, state);
    }

    public getCachedState(address: string): any | undefined {
        return this.stateCache.get(address);
    }

    public addToBatch(transaction: Transaction): void {
        this.transactionBatch.push(transaction);
        if (this.transactionBatch.length >= this.batchSize) {
            this.processBatch();
        }
    }

    private processBatch(): void {
        if (this.transactionBatch.length === 0) {
            return;
        }

        // Sort transactions by nonce to ensure proper ordering
        this.transactionBatch.sort((a, b) => a.data.nonce - b.data.nonce);

        // Process transactions in parallel
        const promises = this.transactionBatch.map(tx => 
            this.processTransaction(tx)
        );

        Promise.all(promises)
            .then(results => {
                // Handle successful transactions
                results.forEach((success, index) => {
                    if (success) {
                        console.log(`Transaction ${this.transactionBatch[index].hash} processed successfully`);
                    }
                });
            })
            .catch(error => {
                console.error('Error processing batch:', error);
            });

        // Clear the batch
        this.transactionBatch = [];
    }

    private async processTransaction(transaction: Transaction): Promise<boolean> {
        try {
            return this.stateManager.applyTransaction(transaction);
        } catch (error) {
            console.error('Error processing transaction:', error);
            return false;
        }
    }

    public pruneOldBlocks(height: number): void {
        // Remove blocks older than the specified height from cache
        for (const [hash, block] of this.blockCache.entries()) {
            if (block.index < height) {
                this.blockCache.delete(hash);
            }
        }
    }

    public clearCache(): void {
        this.blockCache.clear();
        this.stateCache.clear();
    }

    public getCacheStats(): any {
        return {
            blockCacheSize: this.blockCache.size,
            stateCacheSize: this.stateCache.size,
            transactionBatchSize: this.transactionBatch.length,
            maxCacheSize: this.maxCacheSize,
            batchSize: this.batchSize
        };
    }
} 