// Wallet Management
class WalletManager {
    constructor() {
        this.wallets = new Map();
        this.currentWallet = null;
        this.autoLockTimeout = null;
        this.initializeEventListeners();
        this.loadWallets();
    }

    initializeEventListeners() {
        // Wallet Creation
        document.getElementById('create-wallet').addEventListener('click', () => this.showCreateWalletModal());
        document.getElementById('import-wallet').addEventListener('click', () => this.showImportWalletModal());
        document.getElementById('copy-address').addEventListener('click', () => this.copyAddress());
        document.getElementById('copy-private-key').addEventListener('click', () => this.copyPrivateKey());
        document.getElementById('download-backup').addEventListener('click', () => this.downloadBackup());
        document.getElementById('backup-wallet').addEventListener('click', () => this.downloadBackup());

        // Transaction Handling
        document.getElementById('send-form').addEventListener('submit', (e) => this.handleSendTransaction(e));
        document.getElementById('import-form').addEventListener('submit', (e) => this.handleImportWallet(e));

        // Mining Controls
        document.getElementById('start-mining').addEventListener('click', () => this.startMining());
        document.getElementById('stop-mining').addEventListener('click', () => this.stopMining());

        // Security Settings
        document.getElementById('auto-lock').addEventListener('change', (e) => this.setAutoLock(e.target.value));
        document.getElementById('change-password').addEventListener('click', () => this.changePassword());

        // Transaction Filters
        document.getElementById('transaction-type').addEventListener('change', () => this.updateTransactionList());
        document.getElementById('transaction-date').addEventListener('change', () => this.updateTransactionList());

        // Reset auto-lock timer on user activity
        document.addEventListener('mousemove', () => this.resetAutoLock());
        document.addEventListener('keypress', () => this.resetAutoLock());
    }

    async loadWallets() {
        try {
            const response = await fetch('/api/wallets');
            const wallets = await response.json();
            wallets.forEach(wallet => this.wallets.set(wallet.address, wallet));
            if (wallets.length > 0) {
                this.setCurrentWallet(wallets[0].address);
            }
        } catch (error) {
            console.error('Error loading wallets:', error);
        }
    }

    showCreateWalletModal() {
        const wallet = new Wallet();
        document.getElementById('new-private-key').textContent = wallet.exportPrivateKey();
        document.getElementById('create-wallet-modal').style.display = 'block';
        
        // Save wallet after user confirms
        document.getElementById('close-modal').addEventListener('click', () => {
            this.saveWallet(wallet);
            document.getElementById('create-wallet-modal').style.display = 'none';
        });
    }

    showImportWalletModal() {
        document.getElementById('import-wallet-modal').style.display = 'block';
    }

    async handleImportWallet(event) {
        event.preventDefault();
        const privateKey = document.getElementById('private-key').value;
        const walletName = document.getElementById('wallet-name').value;

        try {
            const wallet = Wallet.fromPrivateKey(privateKey);
            if (walletName) {
                wallet.name = walletName;
            }
            await this.saveWallet(wallet);
            document.getElementById('import-wallet-modal').style.display = 'none';
        } catch (error) {
            console.error('Error importing wallet:', error);
            alert('Invalid private key');
        }
    }

    async saveWallet(wallet) {
        try {
            const response = await fetch('/api/wallets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(wallet)
            });
            if (response.ok) {
                this.wallets.set(wallet.address, wallet);
                this.setCurrentWallet(wallet.address);
            }
        } catch (error) {
            console.error('Error saving wallet:', error);
        }
    }

    setCurrentWallet(address) {
        this.currentWallet = this.wallets.get(address);
        this.updateWalletUI();
    }

    updateWalletUI() {
        if (this.currentWallet) {
            document.getElementById('wallet-address').textContent = this.currentWallet.address;
            document.getElementById('receive-address').textContent = this.currentWallet.address;
            document.getElementById('wallet-balance').textContent = this.currentWallet.getBalance();
            this.generateQRCode();
            this.updateTransactionList();
        }
    }

    generateQRCode() {
        const qrCode = document.getElementById('qr-code');
        // In a real implementation, use a QR code library
        qrCode.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${this.currentWallet.address}" alt="QR Code">`;
    }

    async handleSendTransaction(event) {
        event.preventDefault();
        const recipient = document.getElementById('recipient').value;
        const amount = parseFloat(document.getElementById('amount').value);

        try {
            const transaction = this.currentWallet.createTransaction(recipient, amount);
            this.currentWallet.signTransaction(transaction);

            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transaction)
            });

            if (response.ok) {
                this.updateWalletUI();
                alert('Transaction sent successfully');
            } else {
                throw new Error('Transaction failed');
            }
        } catch (error) {
            console.error('Error sending transaction:', error);
            alert('Error sending transaction: ' + error.message);
        }
    }

    updateTransactionList() {
        const type = document.getElementById('transaction-type').value;
        const date = document.getElementById('transaction-date').value;
        const list = document.getElementById('transaction-list');
        
        // Fetch and display transactions based on filters
        fetch(`/api/transactions?type=${type}&date=${date}`)
            .then(response => response.json())
            .then(transactions => {
                list.innerHTML = transactions.map(tx => `
                    <div class="transaction-item ${tx.type}">
                        <div class="tx-info">
                            <span class="tx-type">${tx.type}</span>
                            <span class="tx-amount">${tx.amount} OpenT</span>
                        </div>
                        <div class="tx-details">
                            <span class="tx-address">${tx.type === 'sent' ? 'To: ' : 'From: '}${tx.address}</span>
                            <span class="tx-time">${new Date(tx.timestamp).toLocaleString()}</span>
                        </div>
                    </div>
                `).join('');
            })
            .catch(error => console.error('Error fetching transactions:', error));
    }

    // Mining Functions
    startMining() {
        const startButton = document.getElementById('start-mining');
        const stopButton = document.getElementById('stop-mining');
        
        startButton.disabled = true;
        stopButton.disabled = false;

        // Start mining process
        this.miningInterval = setInterval(() => {
            this.mineBlock();
        }, 1000);
    }

    stopMining() {
        const startButton = document.getElementById('start-mining');
        const stopButton = document.getElementById('stop-mining');
        
        startButton.disabled = false;
        stopButton.disabled = true;

        clearInterval(this.miningInterval);
    }

    async mineBlock() {
        try {
            const response = await fetch('/api/mining/mine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: this.currentWallet.address })
            });

            if (response.ok) {
                const result = await response.json();
                this.updateMiningStats(result);
                this.addMiningLog(`Block mined! Reward: ${result.reward} OpenT`);
            }
        } catch (error) {
            console.error('Error mining block:', error);
        }
    }

    updateMiningStats(stats) {
        document.getElementById('hash-rate').textContent = `${stats.hashRate} H/s`;
        document.getElementById('blocks-mined').textContent = stats.blocksMined;
        document.getElementById('mining-rewards').textContent = `${stats.totalRewards} OpenT`;
    }

    addMiningLog(message) {
        const log = document.getElementById('mining-log');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    // Security Functions
    setAutoLock(minutes) {
        if (this.autoLockTimeout) {
            clearTimeout(this.autoLockTimeout);
        }

        if (minutes > 0) {
            this.autoLockTimeout = setTimeout(() => {
                this.lockWallet();
            }, minutes * 60 * 1000);
        }
    }

    resetAutoLock() {
        if (this.autoLockTimeout) {
            clearTimeout(this.autoLockTimeout);
            this.setAutoLock(document.getElementById('auto-lock').value);
        }
    }

    lockWallet() {
        // Clear sensitive data
        this.currentWallet = null;
        document.getElementById('wallet-address').textContent = '';
        document.getElementById('wallet-balance').textContent = '0';
        document.getElementById('qr-code').innerHTML = '';
        document.getElementById('transaction-list').innerHTML = '';
        
        // Show login prompt
        alert('Wallet locked due to inactivity');
    }

    async changePassword() {
        const newPassword = document.getElementById('password').value;
        if (!newPassword) {
            alert('Please enter a new password');
            return;
        }

        try {
            const response = await fetch('/api/wallet/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword })
            });

            if (response.ok) {
                alert('Password updated successfully');
            } else {
                throw new Error('Password update failed');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            alert('Error changing password');
        }
    }

    copyAddress() {
        navigator.clipboard.writeText(this.currentWallet.address);
        alert('Address copied to clipboard');
    }

    copyPrivateKey() {
        navigator.clipboard.writeText(this.currentWallet.exportPrivateKey());
        alert('Private key copied to clipboard');
    }

    downloadBackup() {
        const backup = {
            address: this.currentWallet.address,
            privateKey: this.currentWallet.exportPrivateKey(),
            balance: this.currentWallet.getBalance()
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wallet-backup-${this.currentWallet.address}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize wallet manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.walletManager = new WalletManager();
}); 