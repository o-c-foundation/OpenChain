import { createHash } from 'crypto';
import { Transaction } from '../blockchain/transaction';
import { Block } from '../block';
import { SmartContract } from '../smart-contract';

export interface AccountState {
    address: string;
    balance: number;
    nonce: number;
    codeHash?: string;
    storageRoot?: string;
}

export class StateManager {
    private accounts: Map<string, AccountState>;
    private contracts: Map<string, string>;
    private storage: Map<string, Map<string, any>>;
    private stateRoot: string;
    private nonces: Map<string, number>;
    private transactions: Transaction[];

    constructor() {
        this.accounts = new Map();
        this.contracts = new Map();
        this.storage = new Map();
        this.stateRoot = this.calculateStateRoot();
        this.nonces = new Map();
        this.transactions = [];
    }

    public getAccount(address: string): AccountState | undefined {
        return this.accounts.get(address);
    }

    public getContract(address: string): string | undefined {
        return this.contracts.get(address);
    }

    public getStorage(address: string, key: string): any {
        return this.storage.get(address)?.get(key);
    }

    public getStateRoot(): string {
        return this.stateRoot;
    }

    public applyTransaction(tx: Transaction): boolean {
        const fromAccount = this.accounts.get(tx.from);
        if (!fromAccount) {
            return false;
        }

        // Check nonce
        if (tx.nonce !== fromAccount.nonce + 1) {
            return false;
        }

        // Check balance
        if (fromAccount.balance < tx.amount) {
            return false;
        }

        // Update sender's account
        fromAccount.balance -= tx.amount;
        this.incrementNonce(tx.from);

        // Update recipient's account
        const toAccount = this.accounts.get(tx.to) || {
            address: tx.to,
            balance: 0,
            nonce: 0
        };
        toAccount.balance += tx.amount;
        this.accounts.set(tx.to, toAccount);

        // Update state root
        this.stateRoot = this.calculateStateRoot();

        return true;
    }

    public applyBlock(block: Block): boolean {
        // Apply all transactions in the block
        for (const tx of block.transactions) {
            if (!this.applyTransaction(tx)) {
                return false;
            }
        }

        return true;
    }

    public createContract(address: string, code: string): boolean {
        if (this.contracts.has(address)) {
            return false;
        }

        this.contracts.set(address, code);

        // Update account state
        const account = this.accounts.get(address) || {
            address,
            balance: 0,
            nonce: 0
        };
        account.codeHash = createHash('sha256').update(code).digest('hex');
        this.accounts.set(address, account);

        // Update state root
        this.stateRoot = this.calculateStateRoot();

        return true;
    }

    public async executeContract(address: string, method: string, params: any[] = []): Promise<any> {
        const code = this.contracts.get(address);
        if (!code) {
            throw new Error('Contract not found');
        }

        // In a real implementation, this would execute the contract code
        // For now, we'll just return a mock result
        return {
            method,
            params,
            address
        };
    }

    public setStorage(address: string, key: string, value: any): void {
        let contractStorage = this.storage.get(address);
        if (!contractStorage) {
            contractStorage = new Map();
            this.storage.set(address, contractStorage);
        }
        contractStorage.set(key, value);
    }

    private calculateStateRoot(): string {
        // In a real implementation, this would use a Merkle Patricia Tree
        // For simulation, we'll use a simple hash of all account states
        const accounts = Array.from(this.accounts.values())
            .sort((a, b) => a.address.localeCompare(b.address));

        const stateString = JSON.stringify(accounts);
        return createHash('sha256').update(stateString).digest('hex');
    }

    public getAccountBalance(address: string): number {
        return this.accounts.get(address)?.balance || 0;
    }

    public getNonce(address: string): number {
        return this.nonces.get(address) || 0;
    }

    public incrementNonce(address: string): void {
        const currentNonce = this.getNonce(address);
        this.nonces.set(address, currentNonce + 1);
    }

    public addTransaction(tx: Transaction): void {
        this.transactions.push(tx);
        this.incrementNonce(tx.from);
    }

    public getContractState(address: string): any {
        const code = this.contracts.get(address);
        if (!code) {
            return null;
        }

        return {
            address,
            codeHash: this.accounts.get(address)?.codeHash,
            storage: Object.fromEntries(this.storage.get(address) || []),
            state: code
        };
    }

    public toJSON(): any {
        return {
            accounts: Array.from(this.accounts.entries()),
            contracts: Array.from(this.contracts.entries()).map(([address, code]) => ({
                address,
                code,
                state: this.contracts.get(address)
            })),
            storage: Array.from(this.storage.entries()).map(([address, storage]) => ({
                address,
                storage: Object.fromEntries(storage)
            })),
            stateRoot: this.stateRoot
        };
    }

    public static fromJSON(json: any): StateManager {
        const manager = new StateManager();
        
        // Restore accounts
        json.accounts.forEach(([address, state]: [string, AccountState]) => {
            manager.accounts.set(address, state);
        });

        // Restore contracts
        json.contracts.forEach(({ address, code, state }: any) => {
            manager.contracts.set(address, code);
        });

        // Restore storage
        json.storage.forEach(({ address, storage }: any) => {
            const contractStorage = new Map(Object.entries(storage));
            manager.storage.set(address, contractStorage);
        });

        manager.stateRoot = json.stateRoot;
        return manager;
    }
} 