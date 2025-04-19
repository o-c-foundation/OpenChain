const crypto = require('crypto');

class SmartContract {
    constructor(address, code) {
        this.address = address;
        this.code = code;
        this.state = {
            initialized: false,
            storage: new Map(),
            balance: 0
        };
        this.events = [];
    }

    execute(method, params, from, value = 0, blockNumber) {
        try {
            // Create execution context
            const context = {
                from,
                value,
                blockNumber,
                state: this.state,
                storage: this.state.storage,
                events: [],
                emit: (event, data) => {
                    this.events.push({ event, data, blockNumber });
                }
            };

            // Add funds to contract if value is provided
            if (value > 0) {
                this.state.balance += value;
            }

            // Execute the method
            const fn = new Function('context', 'params', `
                with (context) {
                    ${this.code}
                    return ${method}(params);
                }
            `);

            const result = fn(context, params);
            
            // Update state
            this.state = {
                ...this.state,
                ...context.state,
                storage: context.storage
            };
            
            // Add new events
            this.events.push(...context.events);
            
            return result;
        } catch (error) {
            console.error('Contract execution error:', error);
            throw error;
        }
    }

    getState() {
        return {
            address: this.address,
            balance: this.state.balance,
            storage: Object.fromEntries(this.state.storage),
            initialized: this.state.initialized
        };
    }

    getBalance() {
        return this.state.balance;
    }

    getEvents() {
        return this.events;
    }

    validateTransaction(tx) {
        if (!tx.to || tx.to !== this.address) {
            throw new Error('Invalid transaction target');
        }
        return true;
    }
}

module.exports = { SmartContract }; 