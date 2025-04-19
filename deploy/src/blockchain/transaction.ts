export class Transaction {
  from: string;
  to: string;
  value: number;
  data: string;
  nonce: number;
  hash: string;

  constructor(from: string, to: string, value: number = 0, data: string = '') {
    this.from = from;
    this.to = to;
    this.value = value;
    this.data = data;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  private calculateHash(): string {
    const data = `${this.from}${this.to}${this.value}${this.data}${this.nonce}`;
    return require('crypto').createHash('sha256').update(data).digest('hex');
  }

  setNonce(nonce: number): void {
    this.nonce = nonce;
    this.hash = this.calculateHash();
  }
} 