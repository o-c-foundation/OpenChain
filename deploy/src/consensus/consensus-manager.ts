import { Blockchain } from '../blockchain';
import { Block } from '../block';

export type ConsensusType = 'PoW' | 'PoS' | 'PoA';

export interface Validator {
    address: string;
    stake: number;
    isActive: boolean;
}

export class ConsensusManager {
    private blockchain: Blockchain;
    private consensusType: ConsensusType;
    private validators: Map<string, Validator>;
    private minStake: number;

    constructor(blockchain: Blockchain, consensusType: ConsensusType = 'PoW') {
        this.blockchain = blockchain;
        this.consensusType = consensusType;
        this.validators = new Map();
        this.minStake = 1000; // Minimum stake required for PoS
    }

    public setConsensusType(type: ConsensusType): void {
        this.consensusType = type;
    }

    public getConsensusType(): ConsensusType {
        return this.consensusType;
    }

    public registerValidator(address: string, stake: number): void {
        if (this.consensusType !== 'PoS') {
            throw new Error('Validator registration only available in PoS mode');
        }

        if (stake < this.minStake) {
            throw new Error(`Stake must be at least ${this.minStake} OpenT`);
        }

        this.validators.set(address, {
            address,
            stake,
            isActive: true
        });
    }

    public validateBlock(block: Block): boolean {
        switch (this.consensusType) {
            case 'PoW':
                return this.validatePoW(block);
            case 'PoS':
                return this.validatePoS(block);
            case 'PoA':
                return this.validatePoA(block);
            default:
                throw new Error('Invalid consensus type');
        }
    }

    private validatePoW(block: Block): boolean {
        // Check if block hash meets difficulty requirement
        const hash = block.calculateHash();
        const difficulty = this.blockchain.difficulty;
        return hash.substring(0, difficulty) === Array(difficulty + 1).join('0');
    }

    private validatePoS(block: Block): boolean {
        // Get validator for this block
        const validator = this.validators.get(block.data.validator);
        if (!validator || !validator.isActive) {
            return false;
        }

        // Check if validator has sufficient stake
        if (validator.stake < this.minStake) {
            return false;
        }

        // Simple PoS validation - in reality, this would be more complex
        return true;
    }

    private validatePoA(block: Block): boolean {
        // In PoA, only authorized validators can create blocks
        const validator = this.validators.get(block.data.validator);
        return validator !== undefined && validator.isActive;
    }

    public getNextValidator(): string | null {
        if (this.consensusType !== 'PoS' && this.consensusType !== 'PoA') {
            return null;
        }

        // Simple round-robin validator selection
        // In a real implementation, this would be more sophisticated
        const activeValidators = Array.from(this.validators.values())
            .filter(v => v.isActive);

        if (activeValidators.length === 0) {
            return null;
        }

        const blockNumber = this.blockchain.chain.length;
        return activeValidators[blockNumber % activeValidators.length].address;
    }

    public getValidators(): Validator[] {
        return Array.from(this.validators.values());
    }

    public getValidator(address: string): Validator | undefined {
        return this.validators.get(address);
    }
} 