import * as CryptoJS from 'crypto-js';

export class Block {
    public index: number;
    public timestamp: number;
    public data: any;
    public previousHash: string;
    public hash: string;
    public nonce: number;

    constructor(index: number, timestamp: number, data: any, previousHash: string = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.nonce = 0;
        this.hash = this.calculateHash();
    }

    calculateHash(): string {
        return CryptoJS.SHA256(
            this.index +
            this.timestamp +
            JSON.stringify(this.data) +
            this.previousHash +
            this.nonce
        ).toString();
    }

    mineBlock(difficulty: number): void {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log(`Block mined: ${this.hash}`);
    }
} 