import { Block } from '../block';
import { Transaction } from '../transaction';
import { createHash } from 'crypto';
import { SmartContract } from '../smart-contract';

export class SecurityManager {
    private readonly maxGasLimit: number;
    private readonly maxBlockSize: number;
    private readonly maxTransactionSize: number;
    private readonly maxContractSize: number;
    private readonly maxContractDepth: number;
    private readonly maxContractExecutionTime: number;
    private readonly blacklistedAddresses: Set<string>;
    private readonly whitelistedAddresses: Set<string>;

    constructor(
        maxGasLimit: number = 1000000,
        maxBlockSize: number = 1024 * 1024, // 1MB
        maxTransactionSize: number = 1024 * 10, // 10KB
        maxContractSize: number = 1024 * 100, // 100KB
        maxContractDepth: number = 100,
        maxContractExecutionTime: number = 5000 // 5 seconds
    ) {
        this.maxGasLimit = maxGasLimit;
        this.maxBlockSize = maxBlockSize;
        this.maxTransactionSize = maxTransactionSize;
        this.maxContractSize = maxContractSize;
        this.maxContractDepth = maxContractDepth;
        this.maxContractExecutionTime = maxContractExecutionTime;
        this.blacklistedAddresses = new Set();
        this.whitelistedAddresses = new Set();
    }

    public validateBlock(block: Block): boolean {
        // Check block size
        if (block.size > this.maxBlockSize) {
            return false;
        }

        // Check block hash
        if (block.hash !== block.calculateHash()) {
            return false;
        }

        // Check previous block hash
        if (block.index > 0 && block.previousHash === '') {
            return false;
        }

        // Check timestamp
        const now = Date.now();
        if (block.timestamp > now + 60000 || block.timestamp < now - 60000) {
            return false;
        }

        return true;
    }

    public validateTransaction(transaction: Transaction): boolean {
        // Check transaction size
        if (transaction.size > this.maxTransactionSize) {
            return false;
        }

        // Check transaction hash
        if (transaction.hash !== transaction.calculateHash()) {
            return false;
        }

        // Check signature
        if (!transaction.verifySignature()) {
            return false;
        }

        // Check blacklisted addresses
        if (this.blacklistedAddresses.has(transaction.data.from) ||
            this.blacklistedAddresses.has(transaction.data.to)) {
            return false;
        }

        // Check whitelisted addresses if whitelist is enabled
        if (this.whitelistedAddresses.size > 0) {
            if (!this.whitelistedAddresses.has(transaction.data.from) ||
                !this.whitelistedAddresses.has(transaction.data.to)) {
                return false;
            }
        }

        return true;
    }

    public validateContract(contract: SmartContract): boolean {
        // Check contract size
        if (contract.size > this.maxContractSize) {
            return false;
        }

        // Check contract code for malicious patterns
        if (this.detectMaliciousCode(contract.code)) {
            return false;
        }

        return true;
    }

    private detectMaliciousCode(code: string): boolean {
        // Check for infinite loops
        if (code.includes('while(true)') || code.includes('for(;;)')) {
            return true;
        }

        // Check for excessive recursion
        if (code.includes('function recursive') && code.includes('recursive()')) {
            return true;
        }

        // Check for dangerous operations
        const dangerousPatterns = [
            'eval(',
            'Function(',
            'setTimeout(',
            'setInterval(',
            'process.',
            'require(',
            'import('
        ];

        for (const pattern of dangerousPatterns) {
            if (code.includes(pattern)) {
                return true;
            }
        }

        return false;
    }

    public addToBlacklist(address: string): void {
        this.blacklistedAddresses.add(address);
    }

    public removeFromBlacklist(address: string): void {
        this.blacklistedAddresses.delete(address);
    }

    public addToWhitelist(address: string): void {
        this.whitelistedAddresses.add(address);
    }

    public removeFromWhitelist(address: string): void {
        this.whitelistedAddresses.delete(address);
    }

    public isAddressBlacklisted(address: string): boolean {
        return this.blacklistedAddresses.has(address);
    }

    public isAddressWhitelisted(address: string): boolean {
        return this.whitelistedAddresses.has(address);
    }

    public getSecurityStats(): any {
        return {
            maxGasLimit: this.maxGasLimit,
            maxBlockSize: this.maxBlockSize,
            maxTransactionSize: this.maxTransactionSize,
            maxContractSize: this.maxContractSize,
            maxContractDepth: this.maxContractDepth,
            maxContractExecutionTime: this.maxContractExecutionTime,
            blacklistedAddresses: Array.from(this.blacklistedAddresses),
            whitelistedAddresses: Array.from(this.whitelistedAddresses)
        };
    }
} 