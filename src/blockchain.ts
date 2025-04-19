import { Block } from './block';
import { Transaction } from './transaction';
import { SmartContract } from './smart-contract';
import { Wallet } from './wallet';

export class Blockchain {
    private chain: Block[];
    private pendingTransactions: Transaction[];
    private smartContracts: Map<string, SmartContract>;
    private readonly miningReward: number;
    private readonly maxSupply: number;
    private readonly initialSupply: number;
    private totalMined: number;
    private readonly founderWallet: Wallet;

    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.pendingTransactions = [];
        this.smartContracts = new Map();
        this.miningReward = 1; // 1 OpenT per block
        this.maxSupply = 100000000; // 100M OpenT
        this.initialSupply = 10000000; // 10M OpenT
        this.totalMined = 0;
        
        // Create founder wallet and distribute initial supply
        this.founderWallet = new Wallet();
        this.distributeInitialSupply();
    }

    private createGenesisBlock(): Block {
        return new Block(0, Date.now(), [], '0');
    }

    private distributeInitialSupply(): void {
        // Create a special transaction for the initial supply
        const genesisTransaction = new Transaction({
            from: '0x0000000000000000000000000000000000000000', // System address
            to: this.founderWallet.address,
            amount: this.initialSupply,
            data: { type: 'initial_distribution' }
        });

        // Add to pending transactions
        this.pendingTransactions.push(genesisTransaction);
        
        // Update founder's balance
        this.founderWallet.updateBalance(this.initialSupply);
        
        // Update total mined
        this.totalMined += this.initialSupply;
    }

    public getLatestBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    public addBlock(block: Block): void {
        // Verify block
        if (!this.isValidBlock(block)) {
            throw new Error('Invalid block');
        }

        // Check mining limit
        if (this.totalMined + this.miningReward > this.maxSupply) {
            throw new Error('Mining limit reached');
        }

        // Add block to chain
        this.chain.push(block);

        // Process transactions
        for (const transaction of block.transactions) {
            this.processTransaction(transaction);
        }

        // Add mining reward
        this.totalMined += this.miningReward;
    }

    private processTransaction(transaction: Transaction): void {
        // Update balances
        if (transaction.data.from !== '0x0000000000000000000000000000000000000000') {
            const fromWallet = this.getWalletByAddress(transaction.data.from);
            if (fromWallet) {
                fromWallet.updateBalance(-transaction.data.amount);
            }
        }

        const toWallet = this.getWalletByAddress(transaction.data.to);
        if (toWallet) {
            toWallet.updateBalance(transaction.data.amount);
        }
    }

    public minePendingTransactions(minerAddress: string): void {
        // Create new block with pending transactions
        const block = new Block(
            this.chain.length,
            Date.now(),
            this.pendingTransactions,
            this.getLatestBlock().hash
        );

        // Add mining reward transaction
        const rewardTransaction = new Transaction({
            from: '0x0000000000000000000000000000000000000000',
            to: minerAddress,
            amount: this.miningReward,
            data: { type: 'mining_reward' }
        });

        block.addTransaction(rewardTransaction);

        // Add block to chain
        this.addBlock(block);

        // Clear pending transactions
        this.pendingTransactions = [];
    }

    public getBalance(address: string): number {
        const wallet = this.getWalletByAddress(address);
        return wallet ? wallet.getBalance() : 0;
    }

    public getTotalSupply(): number {
        return this.totalMined;
    }

    public getRemainingSupply(): number {
        return this.maxSupply - this.totalMined;
    }

    public getFounderAddress(): string {
        return this.founderWallet.address;
    }

    private getWalletByAddress(address: string): Wallet | undefined {
        // In a real implementation, this would look up the wallet in a database
        // For this example, we'll just return the founder wallet if the address matches
        return address === this.founderWallet.address ? this.founderWallet : undefined;
    }

    private isValidBlock(block: Block): boolean {
        const previousBlock = this.getLatestBlock();
        
        // Check block hash
        if (block.hash !== block.calculateHash()) {
            return false;
        }

        // Check previous block hash
        if (block.previousHash !== previousBlock.hash) {
            return false;
        }

        // Check block index
        if (block.index !== previousBlock.index + 1) {
            return false;
        }

        return true;
    }
} 