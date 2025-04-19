const crypto = require('crypto');

class Transaction {
    constructor(data) {
        this.data = {
            ...data,
            timestamp: data.timestamp || Date.now(),
            nonce: data.nonce || Math.floor(Math.random() * 1000000)
        };
        
        this.from = data.from;
        this.to = data.to;
        this.amount = data.amount || 0;
        this.hash = this.calculateHash();
        this.signature = data.signature;
        
        // Contract-specific properties
        this.isContract = data.data?.type === 'contract_deployment' || data.data?.type === 'contract_interaction';
        this.contractAddress = this.isContract ? (data.data?.type === 'contract_deployment' ? undefined : data.to) : undefined;
    }

    calculateHash() {
        const data = JSON.stringify({
            from: this.from,
            to: this.to,
            amount: this.amount,
            nonce: this.data.nonce,
            timestamp: this.data.timestamp,
            data: this.data.data
        });

        return crypto.createHash('sha256').update(data).digest('hex');
    }

    sign(privateKey) {
        const sign = crypto.createSign('SHA256');
        sign.update(this.hash);
        this.signature = sign.sign(privateKey, 'hex');
    }

    verifySignature() {
        if (!this.signature) {
            return false;
        }

        try {
            const verify = crypto.createVerify('SHA256');
            verify.update(this.hash);
            return verify.verify(this.from, this.signature, 'hex');
        } catch (error) {
            console.error('Signature verification error:', error);
            return false;
        }
    }

    toJSON() {
        return {
            from: this.from,
            to: this.to,
            amount: this.amount,
            nonce: this.data.nonce,
            timestamp: this.data.timestamp,
            data: this.data.data
        };
    }
}

module.exports = { Transaction }; 