import { createHash } from 'crypto';
import { ec } from 'elliptic';
import { Wallet } from './wallet';
import bs58 from 'bs58';

const EC = new ec('secp256k1');

export interface TransactionData {
    from: string;
    to: string;
    amount: number;
    data?: any;
}

export class Transaction {
    public readonly hash: string;
    public readonly data: TransactionData;
    private signature?: string;

    constructor(data: TransactionData) {
        this.data = data;
        this.hash = this.calculateHash();
    }

    public calculateHash(): string {
        return createHash('sha256')
            .update(JSON.stringify(this.data))
            .digest('hex');
    }

    public sign(signature: string): void {
        this.signature = signature;
    }

    public verifySignature(): boolean {
        // In a real implementation, this would verify the signature against the public key
        // For this example, we'll just check if a signature exists
        return !!this.signature;
    }

    public getSize(): number {
        return Buffer.from(JSON.stringify(this)).length;
    }

    public static createTransaction(
        fromWallet: Wallet,
        to: string,
        amount: number,
        data?: any
    ): Transaction {
        const transactionData: TransactionData = {
            from: fromWallet.getAddress(),
            to,
            amount,
            data
        };

        const signature = this.signTransaction(transactionData, fromWallet);
        const transaction = new Transaction(transactionData);
        transaction.sign(signature);
        return transaction;
    }

    private static signTransaction(
        data: TransactionData,
        wallet: Wallet
    ): string {
        const key = EC.keyFromPrivate(wallet.getPrivateKey());
        const hash = createHash('sha256')
            .update(JSON.stringify(data))
            .digest();
        
        const signature = key.sign(hash);
        return signature.toDER('hex');
    }

    public toJSON(): any {
        return {
    public verifySignature(): boolean {
        try {
            const key = EC.keyFromPublic(
                bs58.decode(this.data.from).slice(1, -4),
                'hex'
            );
            
            const hash = createHash('sha256')
                .update(JSON.stringify(this.data))
                .digest();
            
            return key.verify(hash, this.signature);
        } catch (error) {
            return false;
        }
    }

    public toJSON(): any {
        return {
            id: this.id,
            data: this.data,
            signature: this.signature
        };
    }

    public static fromJSON(json: any): Transaction {
        return new Transaction(json.data, json.signature);
    }
} 