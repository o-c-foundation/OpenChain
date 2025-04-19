const crypto = require('crypto');

class StateManager {
    constructor() {
        this.contracts = new Map();
        this.accounts = new Map();
        this.transactions = new Map();
        this.nonces = new Map();
    }

    createContract(address, code) {
        if (this.contracts.has(address)) {
            return false;
        }

        this.contracts.set(address, {
            code,
            state: {},
            storage: new Map()
        });

        return true;
    }

    getContract(address) {
        return this.contracts.get(address);
    }

    getContractState(address) {
        const contract = this.contracts.get(address);
        if (!contract) {
            return null;
        }

        return {
            address,
            code: contract.code,
            state: contract.state,
            storage: Object.fromEntries(contract.storage)
        };
    }

    executeContract(address, method, params, from, value, blockNumber) {
        const contract = this.contracts.get(address);
        if (!contract) {
            throw new Error('Contract not found');
        }

        // Create a sandbox for contract execution
        const sandbox = {
            msg: {
                sender: from,
                value: value
            },
            block: {
                number: blockNumber
            },
            storage: contract.storage,
            state: contract.state
        };

        // Execute the contract code in the sandbox
        const fn = new Function('sandbox', `
            with (sandbox) {
                ${contract.code}
                return ${method}(...arguments);
            }
        `);

        try {
            return fn.call(sandbox, ...params);
        } catch (error) {
            throw new Error(`Contract execution error: ${error.message}`);
        }
    }

    getAccountNonce(address) {
        return this.accounts.get(address)?.nonce || 0;
    }

    incrementAccountNonce(address) {
        const account = this.accounts.get(address) || { nonce: 0 };
        account.nonce++;
        this.accounts.set(address, account);
    }

    addTransaction(tx) {
        this.transactions.set(tx.hash, tx);
        this.incrementAccountNonce(tx.from);
        return tx;
    }

    getTransaction(hash) {
        return this.transactions.get(hash);
    }

    validateTransaction(tx) {
        if (!tx.from || !tx.to) {
            throw new Error('Invalid transaction: missing from or to address');
        }

        const nonce = this.getAccountNonce(tx.from);
        if (tx.nonce <= nonce) {
            throw new Error('Invalid nonce');
        }

        return true;
    }
}

module.exports = { StateManager }; 