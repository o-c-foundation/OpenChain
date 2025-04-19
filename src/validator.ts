import { Block, Blockchain } from './blockchain';
import { Transaction } from './transaction';
import { SmartContract } from './smart-contract';
import { NetworkMonitor } from './network-monitor';
import { PerformanceManager } from './performance-manager';
import { SecurityManager } from './security-manager';
import { Monitor } from './monitor';

export class Validator {
    private blockchain: Blockchain;
    private networkMonitor: NetworkMonitor;
    private performanceManager: PerformanceManager;
    private securityManager: SecurityManager;
    private monitor: Monitor;
    private isActive: boolean = false;
    private validatorAddress: string;
    private validatorPrivateKey: string;

    constructor(
        blockchain: Blockchain,
        validatorAddress: string,
        validatorPrivateKey: string
    ) {
        this.blockchain = blockchain;
        this.validatorAddress = validatorAddress;
        this.validatorPrivateKey = validatorPrivateKey;
        this.networkMonitor = new NetworkMonitor();
        this.performanceManager = new PerformanceManager();
        this.securityManager = new SecurityManager();
        this.monitor = new Monitor();
    }

    async start() {
        this.isActive = true;
        console.log('Validator started');
        
        // Start monitoring systems
        this.networkMonitor.start();
        this.performanceManager.start();
        this.securityManager.start();
        this.monitor.start();

        // Begin validation loop
        while (this.isActive) {
            try {
                await this.validatePendingTransactions();
                await this.validatePendingBlocks();
                await this.monitorNetworkHealth();
                await this.checkSecurity();
                
                // Add some delay to prevent CPU overuse
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error('Validator error:', error);
                this.monitor.addAlert('Validator error: ' + error.message);
            }
        }
    }

    stop() {
        this.isActive = false;
        this.networkMonitor.stop();
        this.performanceManager.stop();
        this.securityManager.stop();
        this.monitor.stop();
        console.log('Validator stopped');
    }

    private async validatePendingTransactions() {
        const pendingTransactions = this.blockchain.getPendingTransactions();
        
        for (const tx of pendingTransactions) {
            try {
                // Validate transaction signature
                if (!tx.verifySignature()) {
                    this.monitor.addAlert(`Invalid transaction signature: ${tx.hash}`);
                    continue;
                }

                // Check sender balance
                const senderBalance = await this.blockchain.getBalance(tx.from);
                if (senderBalance < tx.amount) {
                    this.monitor.addAlert(`Insufficient balance for transaction: ${tx.hash}`);
                    continue;
                }

                // Validate smart contract transactions
                if (tx.isContract) {
                    const contract = new SmartContract(tx.contractAddress);
                    if (!await contract.validateTransaction(tx)) {
                        this.monitor.addAlert(`Invalid contract transaction: ${tx.hash}`);
                        continue;
                    }
                }

                // Add to validated transactions
                this.blockchain.addValidatedTransaction(tx);
            } catch (error) {
                this.monitor.addAlert(`Transaction validation error: ${error.message}`);
            }
        }
    }

    private async validatePendingBlocks() {
        const pendingBlocks = this.blockchain.getPendingBlocks();
        
        for (const block of pendingBlocks) {
            try {
                // Validate block structure
                if (!this.validateBlockStructure(block)) {
                    this.monitor.addAlert(`Invalid block structure: ${block.hash}`);
                    continue;
                }

                // Validate block transactions
                if (!await this.validateBlockTransactions(block)) {
                    this.monitor.addAlert(`Invalid block transactions: ${block.hash}`);
                    continue;
                }

                // Validate block hash
                if (!this.validateBlockHash(block)) {
                    this.monitor.addAlert(`Invalid block hash: ${block.hash}`);
                    continue;
                }

                // Add to blockchain
                await this.blockchain.addBlock(block);
                this.monitor.addAlert(`Block added to chain: ${block.hash}`);
            } catch (error) {
                this.monitor.addAlert(`Block validation error: ${error.message}`);
            }
        }
    }

    private validateBlockStructure(block: Block): boolean {
        return (
            block.index !== undefined &&
            block.timestamp !== undefined &&
            block.transactions !== undefined &&
            block.previousHash !== undefined &&
            block.hash !== undefined &&
            block.nonce !== undefined
        );
    }

    private async validateBlockTransactions(block: Block): Promise<boolean> {
        for (const tx of block.transactions) {
            if (!await this.validateTransaction(tx)) {
                return false;
            }
        }
        return true;
    }

    private validateBlockHash(block: Block): boolean {
        const calculatedHash = this.blockchain.calculateHash(
            block.index,
            block.timestamp,
            block.transactions,
            block.previousHash,
            block.nonce
        );
        return calculatedHash === block.hash;
    }

    private async validateTransaction(tx: Transaction): Promise<boolean> {
        // Check if transaction exists in validated transactions
        return this.blockchain.hasValidatedTransaction(tx.hash);
    }

    private async monitorNetworkHealth() {
        const health = await this.networkMonitor.getNetworkHealth();
        if (health.status === 'degraded' || health.status === 'critical') {
            this.monitor.addAlert(`Network health ${health.status}: ${health.message}`);
        }
    }

    private async checkSecurity() {
        const securityStatus = await this.securityManager.checkSecurity();
        if (!securityStatus.isSecure) {
            this.monitor.addAlert(`Security issue detected: ${securityStatus.message}`);
        }
    }

    getValidatorAddress(): string {
        return this.validatorAddress;
    }

    getNetworkStats() {
        return {
            networkHealth: this.networkMonitor.getNetworkHealth(),
            performance: this.performanceManager.getStats(),
            security: this.securityManager.getStatus(),
            monitoring: this.monitor.getStats()
        };
    }
} 