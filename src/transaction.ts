import { createHash } from 'crypto';
import { ec } from 'elliptic';
import { Wallet } from './wallet';
import bs58 from 'bs58';

const EC = new ec('secp256k1');
const MAX_TRANSACTION_SIZE = 1024 * 100; // 100KB limit
const MIN_AMOUNT = 0.000001; // Minimum transaction amount

export class TransactionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TransactionError';
    }
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    FAILED = 'FAILED'
}

export interface TransactionData {
    from: string;
    to: string;
    amount: number;
    timestamp: number;
    nonce: number;
    gasLimit?: number;
    gasPrice?: number;
    data?: any;
}

export class Transaction {
    public readonly hash: string;
    public readonly data: TransactionData;
    public readonly id: string;
    private signature?: string;
    private status: TransactionStatus;

    constructor(data: TransactionData, signature?: string) {
        this.validateTransactionData(data);
        this.data = {
            ...data,
            timestamp: data.timestamp || Date.now(),
            nonce: data.nonce || Math.floor(Math.random() * 1000000)
        };
        this.hash = this.calculateHash();
        this.id = this.hash;
        this.status = TransactionStatus.PENDING;
        if (signature) {
            this.signature = signature;
        }
    }

    private validateTransactionData(data: TransactionData): void {
        if (!data.from || !data.to) {
            throw new TransactionError('Invalid addresses');
        }
        if (data.amount < MIN_AMOUNT) {
            throw new TransactionError(`Amount must be at least ${MIN_AMOUNT}`);
        }
        if (data.from === data.to) {
            throw new TransactionError('Sender and receiver cannot be the same');
        }
        if (data.gasLimit && data.gasLimit < 0) {
            throw new TransactionError('Gas limit must be positive');
        }
        if (data.gasPrice && data.gasPrice < 0) {
            throw new TransactionError('Gas price must be positive');
        }
    }

    public calculateHash(): string {
        const dataToHash = {
            ...this.data,
            timestamp: this.data.timestamp,
            nonce: this.data.nonce
        };
        return createHash('sha256')
            .update(JSON.stringify(dataToHash))
            .digest('hex');
    }

    public sign(signature: string): void {
        if (this.signature) {
            throw new TransactionError('Transaction already signed');
        }
        this.signature = signature;
    }

    public verifySignature(): boolean {
        try {
            if (!this.signature) {
                return false;
            }
            
            const key = EC.keyFromPublic(
                bs58.decode(this.data.from).slice(1, -4),
                'hex'
            );
            
            const hash = createHash('sha256')
                .update(JSON.stringify(this.data))
                .digest();
            
            return key.verify(hash, this.signature);
        } catch (error) {
            console.error('Signature verification failed:', error);
            return false;
        }
    }

    public getSize(): number {
        const size = Buffer.from(JSON.stringify(this)).length;
        if (size > MAX_TRANSACTION_SIZE) {
            throw new TransactionError(`Transaction size ${size} exceeds maximum allowed size ${MAX_TRANSACTION_SIZE}`);
        }
        return size;
    }

    public getFee(): number {
        if (!this.data.gasLimit || !this.data.gasPrice) {
            return 0;
        }
        return this.data.gasLimit * this.data.gasPrice;
    }

    public getStatus(): TransactionStatus {
        return this.status;
    }

    public setStatus(status: TransactionStatus): void {
        this.status = status;
    }

    public static createTransaction(
        fromWallet: Wallet,
        to: string,
        amount: number,
        data?: any,
        gasLimit?: number,
        gasPrice?: number
    ): Transaction {
        const transactionData: TransactionData = {
            from: fromWallet.getAddress(),
            to,
            amount,
            timestamp: Date.now(),
            nonce: Math.floor(Math.random() * 1000000),
            gasLimit,
            gasPrice,
            data
        };

        const transaction = new Transaction(transactionData);
        const signature = this.signTransaction(transactionData, fromWallet);
        transaction.sign(signature);
        return transaction;
    }

    private static signTransaction(
        data: TransactionData,
        wallet: Wallet
    ): string {
        try {
            const key = EC.keyFromPrivate(wallet.getPrivateKey());
            const hash = createHash('sha256')
                .update(JSON.stringify(data))
                .digest();
            
            const signature = key.sign(hash);
            return signature.toDER('hex');
        } catch (error) {
            throw new TransactionError(`Failed to sign transaction: ${error.message}`);
        }
    }

    public toJSON(): any {
        return {
            id: this.id,
            data: this.data,
            signature: this.signature,
            status: this.status
        };
    }

    public static fromJSON(json: any): Transaction {
        if (!json.data || !json.id) {
            throw new TransactionError('Invalid transaction JSON format');
        }
        const transaction = new Transaction(json.data, json.signature);
        transaction.setStatus(json.status || TransactionStatus.PENDING);
        return transaction;
    }
} 