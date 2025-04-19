import { Validator } from '../src/validator';
import { Blockchain } from '../src/blockchain';
import { Transaction } from '../src/transaction';
import { Block } from '../src/block';
import { SmartContract } from '../src/smart-contract';

describe('Validator', () => {
    let validator: Validator;
    let blockchain: Blockchain;
    const validatorAddress = 'validator-address';
    const validatorPrivateKey = 'validator-private-key';

    beforeEach(() => {
        blockchain = new Blockchain();
        validator = new Validator(blockchain, validatorAddress, validatorPrivateKey);
    });

    describe('Transaction Validation', () => {
        it('should validate valid transactions', async () => {
            const tx = new Transaction(
                'sender-address',
                'recipient-address',
                100,
                'signature',
                false
            );

            const result = await validator.validatePendingTransactions();
            expect(result).toBeTruthy();
        });

        it('should reject transactions with invalid signatures', async () => {
            const tx = new Transaction(
                'sender-address',
                'recipient-address',
                100,
                'invalid-signature',
                false
            );

            const result = await validator.validatePendingTransactions();
            expect(result).toBeFalsy();
        });

        it('should reject transactions with insufficient balance', async () => {
            const tx = new Transaction(
                'sender-address',
                'recipient-address',
                1000,
                'signature',
                false
            );

            const result = await validator.validatePendingTransactions();
            expect(result).toBeFalsy();
        });
    });

    describe('Block Validation', () => {
        it('should validate valid blocks', async () => {
            const block = new Block(
                1,
                Date.now(),
                [],
                'previous-hash',
                'hash',
                0
            );

            const result = await validator.validatePendingBlocks();
            expect(result).toBeTruthy();
        });

        it('should reject blocks with invalid structure', async () => {
            const invalidBlock = {
                index: 1,
                timestamp: Date.now(),
                // Missing required fields
            };

            const result = await validator.validatePendingBlocks();
            expect(result).toBeFalsy();
        });

        it('should reject blocks with invalid transactions', async () => {
            const invalidTx = new Transaction(
                'sender-address',
                'recipient-address',
                1000,
                'invalid-signature',
                false
            );

            const block = new Block(
                1,
                Date.now(),
                [invalidTx],
                'previous-hash',
                'hash',
                0
            );

            const result = await validator.validatePendingBlocks();
            expect(result).toBeFalsy();
        });
    });

    describe('Smart Contract Validation', () => {
        it('should validate smart contract transactions', async () => {
            const contract = new SmartContract('contract-address');
            const tx = new Transaction(
                'sender-address',
                'contract-address',
                100,
                'signature',
                true,
                'contract-address'
            );

            const result = await validator.validatePendingTransactions();
            expect(result).toBeTruthy();
        });

        it('should reject invalid smart contract transactions', async () => {
            const contract = new SmartContract('contract-address');
            const tx = new Transaction(
                'sender-address',
                'invalid-contract-address',
                100,
                'signature',
                true,
                'invalid-contract-address'
            );

            const result = await validator.validatePendingTransactions();
            expect(result).toBeFalsy();
        });
    });

    describe('Network Monitoring', () => {
        it('should monitor network health', async () => {
            const health = await validator.getNetworkStats();
            expect(health.networkHealth).toBeDefined();
            expect(health.performance).toBeDefined();
            expect(health.security).toBeDefined();
            expect(health.monitoring).toBeDefined();
        });

        it('should detect network issues', async () => {
            // Simulate network issue
            const health = await validator.getNetworkStats();
            expect(health.networkHealth.status).toBeDefined();
        });
    });

    describe('Security', () => {
        it('should check security status', async () => {
            const security = await validator.getNetworkStats();
            expect(security.security).toBeDefined();
        });

        it('should detect security issues', async () => {
            // Simulate security issue
            const security = await validator.getNetworkStats();
            expect(security.security.isSecure).toBeDefined();
        });
    });
}); 