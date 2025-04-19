import { Transaction } from './transaction';

export class Mempool {
    private transactions: Map<string, Transaction>;
    private maxSize: number;

    constructor(maxSize: number = 10000) {
        this.transactions = new Map();
        this.maxSize = maxSize;
    }

    public addTransaction(transaction: Transaction): boolean {
        if (this.transactions.size >= this.maxSize) {
            return false;
        }

        if (!this.transactions.has(transaction.id)) {
            this.transactions.set(transaction.id, transaction);
            return true;
        }

        return false;
    }

    public getTransaction(id: string): Transaction | undefined {
        return this.transactions.get(id);
    }

    public removeTransaction(id: string): boolean {
        return this.transactions.delete(id);
    }

    public getTransactions(count: number = 100): Transaction[] {
        return Array.from(this.transactions.values())
            .sort((a, b) => a.data.timestamp - b.data.timestamp)
            .slice(0, count);
    }

    public clear(): void {
        this.transactions.clear();
    }

    public size(): number {
        return this.transactions.size;
    }

    public getPendingTransactions(): Transaction[] {
        return Array.from(this.transactions.values());
    }

    public removeTransactions(transactions: Transaction[]): void {
        transactions.forEach(tx => this.transactions.delete(tx.id));
    }

    public toJSON(): any[] {
        return Array.from(this.transactions.values()).map(tx => tx.toJSON());
    }

    public static fromJSON(json: any[]): Mempool {
        const mempool = new Mempool();
        json.forEach(txJson => {
            const tx = Transaction.fromJSON(txJson);
            mempool.addTransaction(tx);
        });
        return mempool;
    }
} 