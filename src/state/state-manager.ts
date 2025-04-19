import { createHash } from 'crypto';
import { Transaction } from '../transaction';
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
    private contracts: Map<string, SmartContract>;
    private storage: Map<string, Map<string, any>>;
    private stateRoot: string;

    constructor() {
        this.accounts = new Map();
        this.contracts = new Map();
        this.storage = new Map();
        this.stateRoot = this.calculateStateRoot();
    }

    public getAccount(address: string): AccountState | undefined {
        return this.accounts.get(address);
    }

    public getContract(address: string): SmartContract | undefined {
        return this.contracts.get(address);
    }

    public getStorage(address: string, key: string): any {
        return this.storage.get(address)?.get(key);
    }

    public getStateRoot(): string {
        return this.stateRoot;
    }

    public applyTransaction(tx: Transaction): boolean {
        const fromAccount = this.accounts.get(tx.data.from);
        if (!fromAccount) {
            return false;
        }

        // Check nonce
        if (tx.data.nonce !== fromAccount.nonce + 1) {
            return false;
        }

        // Check balance
        if (fromAccount.balance < tx.data.amount) {
            return false;
        }

        // Update sender's account
        fromAccount.balance -= tx.data.amount;
        fromAccount.nonce += 1;

        // Update recipient's account
        const toAccount = this.accounts.get(tx.data.to) || {
            address: tx.data.to,
            balance: 0,
            nonce: 0
        };
        toAccount.balance += tx.data.amount;
        this.accounts.set(tx.data.to, toAccount);

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

        const contract = new SmartContract(address, code);
        this.contracts.set(address, contract);

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

    public executeContract(address: string, method: string, args: any[]): any {
        const contract = this.contracts.get(address);
        if (!contract) {
            throw new Error('Contract not found');
        }

        return contract.execute(method, args);
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

    public getAccountNonce(address: string): number {
        return this.accounts.get(address)?.nonce || 0;
    }

    public getContractState(address: string): any {
        const contract = this.contracts.get(address);
        if (!contract) {
            return null;
        }

        return {
            address,
            codeHash: this.accounts.get(address)?.codeHash,
            storage: Object.fromEntries(this.storage.get(address) || []),
            state: contract.getState()
        };
    }

    public toJSON(): any {
        return {
            accounts: Array.from(this.accounts.entries()),
            contracts: Array.from(this.contracts.entries()).map(([address, contract]) => ({
                address,
                code: contract.getCode(),
                state: contract.getState()
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
            const contract = new SmartContract(address, code);
            contract.setState(state);
            manager.contracts.set(address, contract);
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