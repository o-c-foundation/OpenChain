import { Transaction } from './transaction';
import { createHash } from 'crypto';

export class Block {
    public readonly hash: string;
    public readonly previousHash: string;
    public readonly timestamp: number;
    public readonly height: number;
    public readonly transactions: Transaction[];
    public readonly nonce: number;
    public readonly difficulty: number;
    private _size: number;

    constructor(
        previousHash: string,
        transactions: Transaction[],
        timestamp: number = Date.now(),
        height: number,
        difficulty: number = 4
    ) {
        this.previousHash = previousHash;
        this.transactions = transactions;
        this.timestamp = timestamp;
        this.height = height;
        this.difficulty = difficulty;
        this.nonce = this.findNonce();
        this.hash = this.calculateHash();
        this._size = this.calculateSize();
    }

    public get size(): number {
        return this._size;
    }

    private calculateSize(): number {
        // Calculate block size in bytes (simplified for simulation)
        const blockData = JSON.stringify({
            previousHash: this.previousHash,
            timestamp: this.timestamp,
            transactions: this.transactions,
            nonce: this.nonce,
            height: this.height
        });
        return Buffer.from(blockData).length;
    }

    private calculateHash(): string {
        const data = JSON.stringify({
            previousHash: this.previousHash,
            timestamp: this.timestamp,
            transactions: this.transactions.map(tx => tx.id),
            nonce: this.nonce,
            height: this.height
        });
        return createHash('sha256').update(data).digest('hex');
    }

    private findNonce(): number {
        let nonce = 0;
        while (!this.isValidNonce(nonce)) {
            nonce++;
        }
        console.log(`Block mined: ${this.hash}`);
        return nonce;
    }

    private isValidNonce(nonce: number): boolean {
        const data = JSON.stringify({
            previousHash: this.previousHash,
            timestamp: this.timestamp,
            transactions: this.transactions.map(tx => tx.id),
            nonce: nonce,
            height: this.height
        });
        const hash = createHash('sha256').update(data).digest('hex');
        return hash.startsWith('0'.repeat(this.difficulty));
    }

    public isValid(): boolean {
        // Verify block hash
        if (this.hash !== this.calculateHash()) {
            return false;
        }

        // Verify proof of work
        if (!this.hash.startsWith('0'.repeat(this.difficulty))) {
            return false;
        }

        // Verify all transactions
        for (const transaction of this.transactions) {
            if (!transaction.verifySignature()) {
                return false;
            }
        }

        return true;
    }

    public toJSON(): any {
        return {
            hash: this.hash,
            previousHash: this.previousHash,
            timestamp: this.timestamp,
            height: this.height,
            transactions: this.transactions.map(tx => tx.toJSON()),
            nonce: this.nonce,
            difficulty: this.difficulty,
            size: this.size
        };
    }

    public static fromJSON(json: any): Block {
        const transactions = json.transactions.map((txJson: any) => Transaction.fromJSON(txJson));
        const block = new Block(
            json.previousHash,
            transactions,
            json.timestamp,
            json.height,
            json.difficulty
        );
        return block;
    }
} 