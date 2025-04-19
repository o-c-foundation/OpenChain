import { Transaction } from '../transaction';
import { Block } from '../block';
import { Blockchain } from '../blockchain';
import { Mempool } from '../mempool';
import EventEmitter from 'events';

export interface SimulationConfig {
    blockTime: number;         // Time between blocks in ms (default: 5000ms)
    networkLatency: number;    // Simulated network delay in ms (default: 200ms)
    errorRate: number;         // Rate of random errors (0-1, default: 0.05)
    miningDifficulty: number;  // Initial mining difficulty (default: 4)
}

export interface NetworkStats {
    totalNodes: number;
    activeNodes: number;
    averageLatency: number;
    blockPropagationTime: number;
}

export interface SimulationMetrics {
    transactionsPerSecond: number;
    averageBlockTime: number;
    networkHealth: number;     // 0-1 score
    mempoolSize: number;
}

export class SimulationManager extends EventEmitter {
    private blockchain: Blockchain;
    private mempool: Mempool;
    private config: SimulationConfig;
    private isRunning: boolean = false;
    private simulationInterval: NodeJS.Timeout | null = null;
    private metrics: SimulationMetrics;
    private lastBlockTime: number;

    constructor(
        blockchain: Blockchain,
        mempool: Mempool,
        config?: Partial<SimulationConfig>
    ) {
        super();
        this.blockchain = blockchain;
        this.mempool = mempool;
        this.config = {
            blockTime: 5000,
            networkLatency: 200,
            errorRate: 0.05,
            miningDifficulty: 4,
            ...config
        };
        this.lastBlockTime = Date.now();
        this.metrics = {
            transactionsPerSecond: 0,
            averageBlockTime: this.config.blockTime,
            networkHealth: 1,
            mempoolSize: 0
        };

        // Set up event listeners
        this.on('block:created', this.handleBlockCreated.bind(this));
        this.on('transaction:received', this.handleTransaction.bind(this));
        this.on('error:occurred', this.handleError.bind(this));
    }

    public startSimulation(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.simulationInterval = setInterval(() => {
            this.simulationTick();
        }, 1000); // Update metrics every second

        this.emit('simulation:started', {
            timestamp: Date.now(),
            config: this.config
        });
    }

    public stopSimulation(): void {
        if (!this.isRunning) return;

        this.isRunning = false;
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }

        this.emit('simulation:stopped', {
            timestamp: Date.now(),
            metrics: this.metrics
        });
    }

    public setBlockTime(milliseconds: number): void {
        this.config.blockTime = Math.max(1000, milliseconds);
        this.emit('config:updated', { blockTime: this.config.blockTime });
    }

    public setNetworkLatency(milliseconds: number): void {
        this.config.networkLatency = Math.max(0, milliseconds);
        this.emit('config:updated', { networkLatency: this.config.networkLatency });
    }

    public getMetrics(): SimulationMetrics {
        return { ...this.metrics };
    }

    public getNetworkStats(): NetworkStats {
        return {
            totalNodes: Math.floor(Math.random() * 5) + 5, // Simulate 5-10 nodes
            activeNodes: Math.floor(Math.random() * 5) + 3, // Simulate 3-8 active nodes
            averageLatency: this.config.networkLatency,
            blockPropagationTime: this.config.networkLatency * 2
        };
    }

    private simulationTick(): void {
        // Update metrics
        this.updateMetrics();

        // Simulate network events
        this.simulateNetworkEvents();

        // Create new block if enough time has passed
        const now = Date.now();
        if (now - this.lastBlockTime >= this.config.blockTime) {
            this.createNewBlock();
            this.lastBlockTime = now;
        }

        this.emit('simulation:tick', {
            timestamp: now,
            metrics: this.metrics
        });
    }

    private updateMetrics(): void {
        const pendingTxs = this.mempool.getAllTransactions().length;
        const blockCount = this.blockchain.getHeight();
        
        this.metrics = {
            transactionsPerSecond: pendingTxs / (this.config.blockTime / 1000),
            averageBlockTime: this.calculateAverageBlockTime(),
            networkHealth: this.calculateNetworkHealth(),
            mempoolSize: pendingTxs
        };
    }

    private calculateAverageBlockTime(): number {
        // Simple moving average of block times
        return this.config.blockTime; // Simplified for simulation
    }

    private calculateNetworkHealth(): number {
        // Simulate network health based on various factors
        const baseHealth = 0.95; // Start with 95% health
        const randomFactor = Math.random() * 0.1; // Random fluctuation
        return Math.min(1, Math.max(0, baseHealth + randomFactor));
    }

    private simulateNetworkEvents(): void {
        // Simulate random network events
        if (Math.random() < this.config.errorRate) {
            this.emit('error:occurred', {
                type: 'network',
                message: 'Simulated network error',
                timestamp: Date.now()
            });
        }
    }

    private createNewBlock(): void {
        // Get pending transactions from mempool
        const transactions = this.mempool.getTransactionsSortedByFee(10);
        
        // Simulate block creation with network latency
        setTimeout(() => {
            const newBlock = new Block(
                this.blockchain.getLatestBlock().hash,
                transactions,
                Date.now(),
                this.blockchain.getHeight() + 1
            );

            this.emit('block:created', newBlock);
        }, this.config.networkLatency);
    }

    private handleBlockCreated(block: Block): void {
        // Remove included transactions from mempool
        block.transactions.forEach(tx => {
            this.mempool.removeTransaction(tx.id);
        });

        this.emit('block:mined', {
            blockHeight: block.height,
            transactions: block.transactions.length,
            timestamp: Date.now()
        });
    }

    private handleTransaction(transaction: Transaction): void {
        // Simulate transaction propagation with network latency
        setTimeout(() => {
            try {
                this.mempool.addTransaction(transaction);
                this.emit('transaction:confirmed', {
                    transactionId: transaction.id,
                    timestamp: Date.now()
                });
            } catch (error) {
                this.emit('transaction:failed', {
                    transactionId: transaction.id,
                    error: error.message,
                    timestamp: Date.now()
                });
            }
        }, this.config.networkLatency);
    }

    private handleError(error: any): void {
        // Reduce network health temporarily
        this.metrics.networkHealth *= 0.95;
        
        // Emit error event for logging/monitoring
        this.emit('simulation:error', {
            error,
            timestamp: Date.now(),
            metrics: this.metrics
        });
    }

    public generateRandomTransaction(): void {
        // Simulate a random transaction for demonstration
        const amount = Math.random() * 100;
        const transaction = Transaction.createTransaction(
            { getAddress: () => 'simulator_' + Math.random().toString(36).substr(2, 9) } as any,
            'simulator_' + Math.random().toString(36).substr(2, 9),
            amount
        );
        
        this.handleTransaction(transaction);
    }
} 