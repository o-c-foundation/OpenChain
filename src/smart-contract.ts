import * as CryptoJS from 'crypto-js';

export interface ContractState {
    [key: string]: any;
}

export interface ContractEvent {
    name: string;
    data: any;
    timestamp: number;
    blockNumber: number;
}

export interface ContractContext {
    state: ContractState;
    sender: string;
    value: number;
    balance: number;
    contract: SmartContract;
    events: ContractEvent[];
    blockNumber: number;
}

export class SmartContract {
    public address: string;
    public code: string;
    public state: ContractState;
    public owner: string;
    public balance: number;
    public events: ContractEvent[];
    public parentContract?: SmartContract;
    public gasLimit: number;
    public gasUsed: number;

    constructor(code: string, owner: string, parentContract?: SmartContract) {
        this.code = code;
        this.owner = owner;
        this.state = {};
        this.balance = 0;
        this.address = this.generateAddress();
        this.events = [];
        this.parentContract = parentContract;
        this.gasLimit = 1000000; // Default gas limit
        this.gasUsed = 0;
    }

    private generateAddress(): string {
        return CryptoJS.SHA256(
            this.code +
            this.owner +
            Date.now().toString()
        ).toString();
    }

    public emitEvent(name: string, data: any, blockNumber: number): void {
        const event: ContractEvent = {
            name,
            data,
            timestamp: Date.now(),
            blockNumber
        };
        this.events.push(event);
    }

    public getEvents(name?: string): ContractEvent[] {
        if (name) {
            return this.events.filter(event => event.name === name);
        }
        return this.events;
    }

    public execute(method: string, params: any[], sender: string, value: number = 0, blockNumber: number): any {
        try {
            // Reset gas usage
            this.gasUsed = 0;

            // Add funds to contract if value is provided
            if (value > 0) {
                this.balance += value;
            }

            // Create execution context
            const context: ContractContext = {
                state: this.state,
                sender,
                value,
                balance: this.balance,
                contract: this,
                events: [],
                blockNumber
            };

            // Execute parent contract method if exists
            if (this.parentContract && this.parentContract.hasMethod(method)) {
                const parentResult = this.parentContract.execute(method, params, sender, value, blockNumber);
                if (parentResult !== undefined) {
                    return parentResult;
                }
            }

            // Execute contract method
            const fn = new Function('context', 'params', `
                ${this.code}
                return ${method}(context, params);
            `);

            const result = fn(context, params);

            // Update contract state and events
            this.state = context.state;
            this.balance = context.balance;
            this.events = [...this.events, ...context.events];

            // Check gas usage
            if (this.gasUsed > this.gasLimit) {
                throw new Error('Gas limit exceeded');
            }

            return result;
        } catch (error) {
            throw new Error(`Contract execution failed: ${error.message}`);
        }
    }

    public hasMethod(method: string): boolean {
        try {
            const fn = new Function('context', 'params', `
                ${this.code}
                return typeof ${method} === 'function';
            `);
            return fn({}, []);
        } catch {
            return false;
        }
    }

    public getState(): ContractState {
        return this.state;
    }

    public getBalance(): number {
        return this.balance;
    }

    public getGasUsed(): number {
        return this.gasUsed;
    }

    public setGasLimit(limit: number): void {
        this.gasLimit = limit;
    }
} 