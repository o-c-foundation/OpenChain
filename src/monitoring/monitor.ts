import { Block } from '../block';
import { Transaction } from '../transaction';
import { SmartContract } from '../smart-contract';

export class Monitor {
    private readonly metrics: Map<string, any>;
    private readonly alerts: Set<string>;
    private readonly performanceThresholds: Map<string, number>;
    private readonly healthChecks: Map<string, () => boolean>;

    constructor() {
        this.metrics = new Map();
        this.alerts = new Set();
        this.performanceThresholds = new Map();
        this.healthChecks = new Map();

        // Initialize default thresholds
        this.performanceThresholds.set('blockProcessingTime', 1000); // 1 second
        this.performanceThresholds.set('transactionProcessingTime', 100); // 100ms
        this.performanceThresholds.set('contractExecutionTime', 5000); // 5 seconds
        this.performanceThresholds.set('memoryUsage', 0.8); // 80% of available memory
        this.performanceThresholds.set('cpuUsage', 0.8); // 80% of CPU

        // Initialize health checks
        this.healthChecks.set('blockchainSync', () => this.isBlockchainSynced());
        this.healthChecks.set('networkConnectivity', () => this.isNetworkConnected());
        this.healthChecks.set('databaseHealth', () => this.isDatabaseHealthy());
    }

    public trackBlock(block: Block, processingTime: number): void {
        this.updateMetric('blocksProcessed', (this.metrics.get('blocksProcessed') || 0) + 1);
        this.updateMetric('averageBlockProcessingTime', 
            this.calculateMovingAverage('averageBlockProcessingTime', processingTime));
        
        if (processingTime > this.performanceThresholds.get('blockProcessingTime')) {
            this.addAlert(`Block processing time exceeded threshold: ${processingTime}ms`);
        }
    }

    public trackTransaction(transaction: Transaction, processingTime: number): void {
        this.updateMetric('transactionsProcessed', (this.metrics.get('transactionsProcessed') || 0) + 1);
        this.updateMetric('averageTransactionProcessingTime',
            this.calculateMovingAverage('averageTransactionProcessingTime', processingTime));
        
        if (processingTime > this.performanceThresholds.get('transactionProcessingTime')) {
            this.addAlert(`Transaction processing time exceeded threshold: ${processingTime}ms`);
        }
    }

    public trackContract(contract: SmartContract, executionTime: number): void {
        this.updateMetric('contractsExecuted', (this.metrics.get('contractsExecuted') || 0) + 1);
        this.updateMetric('averageContractExecutionTime',
            this.calculateMovingAverage('averageContractExecutionTime', executionTime));
        
        if (executionTime > this.performanceThresholds.get('contractExecutionTime')) {
            this.addAlert(`Contract execution time exceeded threshold: ${executionTime}ms`);
        }
    }

    public trackResourceUsage(): void {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        this.updateMetric('memoryUsage', memoryUsage.heapUsed / memoryUsage.heapTotal);
        this.updateMetric('cpuUsage', cpuUsage.user / cpuUsage.system);

        if (this.metrics.get('memoryUsage') > this.performanceThresholds.get('memoryUsage')) {
            this.addAlert('Memory usage exceeded threshold');
        }

        if (this.metrics.get('cpuUsage') > this.performanceThresholds.get('cpuUsage')) {
            this.addAlert('CPU usage exceeded threshold');
        }
    }

    public runHealthChecks(): void {
        for (const [checkName, checkFunction] of this.healthChecks) {
            if (!checkFunction()) {
                this.addAlert(`Health check failed: ${checkName}`);
            }
        }
    }

    public getMetrics(): Map<string, any> {
        return new Map(this.metrics);
    }

    public getAlerts(): string[] {
        return Array.from(this.alerts);
    }

    public clearAlerts(): void {
        this.alerts.clear();
    }

    private updateMetric(key: string, value: any): void {
        this.metrics.set(key, value);
    }

    private calculateMovingAverage(key: string, newValue: number): number {
        const currentAverage = this.metrics.get(key) || 0;
        const count = this.metrics.get(`${key}Count`) || 0;
        const newCount = count + 1;
        
        this.metrics.set(`${key}Count`, newCount);
        return (currentAverage * count + newValue) / newCount;
    }

    private addAlert(message: string): void {
        this.alerts.add(`${new Date().toISOString()} - ${message}`);
    }

    private isBlockchainSynced(): boolean {
        // Implementation depends on your blockchain sync logic
        return true;
    }

    private isNetworkConnected(): boolean {
        // Implementation depends on your network connectivity check
        return true;
    }

    private isDatabaseHealthy(): boolean {
        // Implementation depends on your database health check
        return true;
    }
} 