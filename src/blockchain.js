const { EventEmitter } = require('events');
const { SmartContract } = require('./smart-contract');

class Blockchain extends EventEmitter {
    constructor() {
        super();
        this.chain = [];
        this.contracts = new Map();
        this.instantTransactions = new Map();
    }

    addTransaction(transaction) {
        if (!transaction.verifySignature()) {
            throw new Error('Invalid transaction signature');
        }

        // Handle contract transactions
        if (transaction.data.data?.type === 'contract_deployment') {
            this.deployContract(transaction);
        } else if (transaction.data.data?.type === 'contract_interaction') {
            this.executeContract(transaction);
        }

        this.instantTransactions.set(transaction.hash, transaction);
        this.emit('transaction:added', transaction);
    }

    deployContract(transaction) {
        const contract = new SmartContract(
            transaction.to,
            transaction.data.data.code
        );
        this.contracts.set(contract.address, contract);
        this.emit('contract:deployed', contract);
    }

    executeContract(transaction) {
        const contract = this.contracts.get(transaction.to);
        if (!contract) {
            throw new Error('Contract not found');
        }

        const result = contract.execute(
            transaction.data.data.method,
            transaction.data.data.params,
            transaction.from,
            transaction.amount,
            this.chain.length
        );

        this.emit('contract:executed', {
            contract: contract.address,
            method: transaction.data.data.method,
            result
        });
    }

    getBalanceOfAddress(address) {
        let balance = 0;
        
        // Check contract balance
        const contract = this.contracts.get(address);
        if (contract) {
            return contract.getBalance();
        }

        // Check transaction history
        for (const block of this.chain) {
            for (const tx of block.data) {
                if (tx.to === address) {
                    balance += tx.amount;
                }
                if (tx.from === address) {
                    balance -= tx.amount;
                }
            }
        }

        // Check pending transactions
        for (const tx of this.instantTransactions.values()) {
            if (tx.to === address) {
                balance += tx.amount;
            }
            if (tx.from === address) {
                balance -= tx.amount;
            }
        }

        return balance;
    }
}

module.exports = { Blockchain }; 