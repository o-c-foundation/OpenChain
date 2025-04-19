import { createHash } from 'crypto';
import bs58 from 'bs58';
import { Transaction } from './transaction';

export class Wallet {
    private readonly privateKey: string;
    public readonly publicKey: string;
    public readonly address: string;
    private balance: number;

    constructor(privateKey?: string) {
        if (privateKey) {
            this.privateKey = privateKey;
        } else {
            // Generate a new private key if none provided
            this.privateKey = createHash('sha256')
                .update(Math.random().toString())
                .digest('hex');
        }

        // Derive public key from private key
        this.publicKey = createHash('sha256')
            .update(this.privateKey)
            .digest('hex');

        // Generate address from public key
        this.address = createHash('sha256')
            .update(this.publicKey)
            .digest('hex');

        this.balance = 0;
    }

    public getBalance(): number {
        return this.balance;
    }

    public updateBalance(amount: number): void {
        this.balance += amount;
    }

    public createTransaction(to: string, amount: number, data?: any): Transaction {
        if (amount > this.balance) {
            throw new Error('Insufficient balance');
        }

        return new Transaction({
            from: this.address,
            to,
            amount,
            data
        });
    }

    public signTransaction(transaction: Transaction): void {
        const signature = createHash('sha256')
            .update(transaction.hash + this.privateKey)
            .digest('hex');
        transaction.sign(signature);
    }

    public exportPrivateKey(): string {
        return this.privateKey;
    }

    public static isValidAddress(address: string): boolean {
        try {
            // Decode base58 address
            const decoded = bs58.decode(address);
            
            // Check length (1 version byte + 20 bytes hash + 4 bytes checksum)
            if (decoded.length !== 25) return false;
            
            // Extract version byte
            const version = decoded[0];
            if (version !== 0x41) return false;
            
            // Extract payload and checksum
            const payload = decoded.slice(0, 21);
            const checksum = decoded.slice(21);
            
            // Verify checksum
            const calculatedChecksum = createHash('sha256')
                .update(createHash('sha256').update(payload).digest())
                .digest()
                .slice(0, 4);
            
            return Buffer.compare(checksum, calculatedChecksum) === 0;
        } catch (error) {
            return false;
        }
    }

    public static fromPrivateKey(privateKeyHex: string): Wallet {
        const privateKey = Buffer.from(privateKeyHex, 'hex');
        return new Wallet(privateKey.toString('hex'));
    }
} 