import { Transaction, TransactionStatus } from './transaction';

export class MempoolError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MempoolError';
    }
}

interface MempoolConfig {
    maxSize: number;           // Maximum size in bytes
    maxTransactionAge: number; // Maximum age in milliseconds
    maxTransactions: number;   // Maximum number of transactions
}

export class Mempool {
    private transactions: Map<string, Transaction>;
    private config: MempoolConfig;
    private size: number;

    constructor(config?: Partial<MempoolConfig>) {
        this.transactions = new Map();
        this.size = 0;
        this.config = {
            maxSize: 1024 * 1024 * 10,    // 10MB default
            maxTransactionAge: 1000 * 60 * 60 * 24, // 24 hours
            maxTransactions: 10000,        // 10k transactions
            ...config
        };
    }

    public addTransaction(transaction: Transaction): void {
        this.validateTransaction(transaction);
        
        // Check if transaction already exists
        if (this.transactions.has(transaction.id)) {
            throw new MempoolError(`Transaction ${transaction.id} already exists in mempool`);
        }

        // Check mempool limits
        const txSize = transaction.getSize();
        if (this.size + txSize > this.config.maxSize) {
            this.removeOldTransactions();
            if (this.size + txSize > this.config.maxSize) {
                throw new MempoolError('Mempool size limit exceeded');
            }
        }

        if (this.transactions.size >= this.config.maxTransactions) {
            this.removeLowestFeeTransactions();
            if (this.transactions.size >= this.config.maxTransactions) {
                throw new MempoolError('Mempool transaction count limit exceeded');
            }
        }

        // Add transaction
        this.transactions.set(transaction.id, transaction);
        this.size += txSize;
    }

    private validateTransaction(transaction: Transaction): void {
        if (!transaction.verifySignature()) {
            throw new MempoolError('Invalid transaction signature');
        }

        const age = Date.now() - transaction.data.timestamp;
        if (age > this.config.maxTransactionAge) {
            throw new MempoolError('Transaction too old');
        }
    }

    public removeTransaction(transactionId: string): void {
        const transaction = this.transactions.get(transactionId);
        if (transaction) {
            this.size -= transaction.getSize();
            this.transactions.delete(transactionId);
        }
    }

    public getTransaction(transactionId: string): Transaction | undefined {
        return this.transactions.get(transactionId);
    }

    public getAllTransactions(): Transaction[] {
        return Array.from(this.transactions.values());
    }

    public getTransactionsSortedByFee(limit?: number): Transaction[] {
        const sortedTransactions = Array.from(this.transactions.values())
            .sort((a, b) => b.getFee() - a.getFee());
        
        return limit ? sortedTransactions.slice(0, limit) : sortedTransactions;
    }

    private removeOldTransactions(): void {
        const now = Date.now();
        for (const [id, tx] of this.transactions) {
            if (now - tx.data.timestamp > this.config.maxTransactionAge) {
                this.removeTransaction(id);
            }
        }
    }

    private removeLowestFeeTransactions(): void {
        const sortedTransactions = this.getTransactionsSortedByFee();
        const toRemove = Math.ceil(sortedTransactions.length * 0.1); // Remove 10% of transactions
        
        for (let i = sortedTransactions.length - 1; i >= sortedTransactions.length - toRemove; i--) {
            this.removeTransaction(sortedTransactions[i].id);
        }
    }

    public clear(): void {
        this.transactions.clear();
        this.size = 0;
    }

    public getMempoolSize(): { bytes: number; count: number } {
        return {
            bytes: this.size,
            count: this.transactions.size
        };
    }

    public getTransactionsByAddress(address: string): Transaction[] {
        return Array.from(this.transactions.values())
            .filter(tx => tx.data.from === address || tx.data.to === address);
    }

    public updateTransactionStatus(transactionId: string, status: TransactionStatus): void {
        const transaction = this.transactions.get(transactionId);
        if (transaction) {
            transaction.setStatus(status);
            if (status === TransactionStatus.CONFIRMED || status === TransactionStatus.FAILED) {
                this.removeTransaction(transactionId);
            }
        }
    }

    public getPendingNonce(address: string): number {
        const pendingTxs = this.getTransactionsByAddress(address)
            .filter(tx => tx.data.from === address)
            .sort((a, b) => b.data.nonce - a.data.nonce);
        
        return pendingTxs.length > 0 ? pendingTxs[0].data.nonce + 1 : 0;
    }
} 