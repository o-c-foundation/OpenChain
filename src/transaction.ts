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
    public readonly id: string;
    public readonly hash: string;
    public readonly data: TransactionData;
    public readonly from: string;
    public readonly to: string;
    public readonly amount: number;
    public readonly isContract: boolean;
    public readonly contractAddress?: string;
    private signature?: string;
    private _size: number;
    private status: TransactionStatus;

    constructor(data: TransactionData, signature?: string) {
        this.validateTransactionData(data);
        this.data = {
            ...data,
            timestamp: data.timestamp || Date.now(),
            nonce: data.nonce || Math.floor(Math.random() * 1000000)
        };
        this.id = this.calculateHash();
        this.hash = this.id;
        this.from = data.from;
        this.to = data.to;
        this.amount = data.amount;
        this.isContract = data.data?.type === 'contract_deployment' || data.data?.type === 'contract_interaction';
        this.contractAddress = this.isContract ? (data.data?.type === 'contract_deployment' ? undefined : data.to) : undefined;
        this.status = TransactionStatus.PENDING;
        if (signature) {
            this.signature = signature;
        }
        this._size = this.calculateSize();
    }

    public get size(): number {
        return this._size;
    }

    public getSize(): number {
        return this._size;
    }

    private calculateSize(): number {
        const size = Buffer.from(JSON.stringify(this)).length;
        if (size > MAX_TRANSACTION_SIZE) {
            throw new TransactionError(`Transaction size ${size} exceeds maximum allowed size ${MAX_TRANSACTION_SIZE}`);
        }
        return size;
    }

    public calculateHash(): string {
        const data = JSON.stringify({
            from: this.data.from,
            to: this.data.to,
            amount: this.data.amount,
            timestamp: this.data.timestamp,
            nonce: this.data.nonce,
            data: this.data.data
        });
        return createHash('sha256').update(data).digest('hex');
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
            from: fromWallet.address,
            to,
            amount,
            timestamp: Date.now(),
            nonce: Math.floor(Math.random() * 1000000),
            gasLimit,
            gasPrice,
            data
        };

        const transaction = new Transaction(transactionData);
        const signature = Transaction.signTransaction(transactionData, fromWallet);
        transaction.sign(signature);
        return transaction;
    }

    private static signTransaction(
        data: TransactionData,
        wallet: Wallet
    ): string {
        try {
            const key = EC.keyFromPrivate(wallet.exportPrivateKey());
            const hash = createHash('sha256')
                .update(JSON.stringify(data))
                .digest();
            
            const signature = key.sign(hash);
            return signature.toDER('hex');
        } catch (error) {
            throw new TransactionError(`Failed to sign transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public toJSON(): any {
        return {
            id: this.id,
            data: this.data,
            signature: this.signature,
            size: this.size,
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
} 