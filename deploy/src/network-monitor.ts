import { Blockchain } from './blockchain';

export interface NetworkStats {
    blockCount: number;
    transactionCount: number;
    contractCount: number;
    averageBlockTime: number;
    networkHashrate: number;
    activeNodes: number;
    pendingTransactions: number;
    gasUsed: number;
    gasLimit: number;
}

export class NetworkMonitor {
    private blockchain: Blockchain;
    private stats: NetworkStats;
    private blockTimes: number[];
    private readonly BLOCK_TIME_WINDOW = 100; // Number of blocks to consider for average

    constructor(blockchain: Blockchain) {
        this.blockchain = blockchain;
        this.stats = this.initializeStats();
        this.blockTimes = [];
    }

    private initializeStats(): NetworkStats {
        return {
            blockCount: 0,
            transactionCount: 0,
            contractCount: 0,
            averageBlockTime: 0,
            networkHashrate: 0,
            activeNodes: 0,
            pendingTransactions: 0,
            gasUsed: 0,
            gasLimit: 0
        };
    }

    public updateStats(): void {
        const chain = this.blockchain.chain;
        const latestBlock = chain[chain.length - 1];
        const previousBlock = chain[chain.length - 2];

        // Update block count
        this.stats.blockCount = chain.length;

        // Calculate block time
        if (previousBlock) {
            const blockTime = latestBlock.timestamp - previousBlock.timestamp;
            this.blockTimes.push(blockTime);
            if (this.blockTimes.length > this.BLOCK_TIME_WINDOW) {
                this.blockTimes.shift();
            }
            this.stats.averageBlockTime = this.calculateAverageBlockTime();
        }

        // Update transaction count
        this.stats.transactionCount = chain.reduce((count, block) => 
            count + (Array.isArray(block.data) ? block.data.length : 0), 0);

        // Update contract count
        this.stats.contractCount = this.blockchain.contracts.size;

        // Update pending transactions
        this.stats.pendingTransactions = this.blockchain.pendingTransactions.length;

        // Calculate network hashrate (simplified)
        this.stats.networkHashrate = this.calculateNetworkHashrate();

        // Update gas statistics
        this.updateGasStats();
    }

    private calculateAverageBlockTime(): number {
        if (this.blockTimes.length === 0) return 0;
        return this.blockTimes.reduce((sum, time) => sum + time, 0) / this.blockTimes.length;
    }

    private calculateNetworkHashrate(): number {
        // Simplified hashrate calculation based on difficulty and average block time
        const difficulty = this.blockchain.difficulty;
        const averageBlockTime = this.stats.averageBlockTime || 1;
        return Math.pow(2, difficulty) / averageBlockTime;
    }

    private updateGasStats(): void {
        let totalGasUsed = 0;
        let totalGasLimit = 0;

        this.blockchain.contracts.forEach(contract => {
            totalGasUsed += contract.getGasUsed();
            totalGasLimit += contract.gasLimit;
        });

        this.stats.gasUsed = totalGasUsed;
        this.stats.gasLimit = totalGasLimit;
    }

    public getStats(): NetworkStats {
        return { ...this.stats };
    }

    public getHealthStatus(): 'healthy' | 'degraded' | 'critical' {
        const stats = this.getStats();

        // Check block production
        if (stats.averageBlockTime > 30) return 'degraded';
        if (stats.averageBlockTime > 60) return 'critical';

        // Check transaction backlog
        if (stats.pendingTransactions > 1000) return 'degraded';
        if (stats.pendingTransactions > 5000) return 'critical';

        // Check gas usage
        const gasUtilization = stats.gasUsed / stats.gasLimit;
        if (gasUtilization > 0.8) return 'degraded';
        if (gasUtilization > 0.95) return 'critical';

        return 'healthy';
    }

    public getPerformanceMetrics(): {
        tps: number;
        bps: number;
        gasEfficiency: number;
    } {
        const stats = this.getStats();
        return {
            tps: stats.transactionCount / (stats.blockCount * this.stats.averageBlockTime),
            bps: 1 / this.stats.averageBlockTime,
            gasEfficiency: stats.gasUsed / stats.gasLimit
        };
    }
} 