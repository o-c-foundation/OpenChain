// Wallet functionality
class OpenTWallet {
    constructor() {
        this.web3 = new Web3();
        this.currentWallet = null;
        this.networkStatus = 'disconnected';
        this.targetAddress = '0xB4844D547E444d340315A36fdAB4c5cd5259063C';
        this.loadSavedWallet();
        this.initializeEventListeners();
        this.connectToNetwork();
        
        // Prevent wallet changes on refresh
        window.addEventListener('beforeunload', () => {
            if (this.currentWallet) {
                this.saveWalletToStorage();
            }
        });
    }

    // Initialize event listeners
    initializeEventListeners() {
        // Quick Access button
        document.getElementById('quickAccessBtn').addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('quickAccessModal'));
            modal.show();
        });

        // Toggle private key visibility
        document.getElementById('togglePrivateKey').addEventListener('click', (e) => {
            const input = document.getElementById('quickAccessPrivateKey');
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            e.target.innerHTML = type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
        });

        // Confirm quick access
        document.getElementById('confirmQuickAccess').addEventListener('click', () => {
            this.quickAccess();
        });

        // Quick access private key enter key
        document.getElementById('quickAccessPrivateKey').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.quickAccess();
            }
        });

        // Create wallet button
        document.getElementById('createWalletBtn').addEventListener('click', () => {
            if (this.currentWallet) {
                if (!confirm('You already have a wallet. Creating a new one will replace it. Are you sure?')) {
                    return;
                }
            }
            this.createNewWallet();
        });

        // Copy buttons
        document.getElementById('copyAddressBtn').addEventListener('click', () => {
            this.copyToClipboard('walletAddress');
        });

        document.getElementById('copyPrivateKeyBtn').addEventListener('click', () => {
            this.copyToClipboard('privateKey');
        });

        // Send form
        document.getElementById('sendForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendTransaction();
        });

        // Refresh balance button
        document.getElementById('refreshBalanceBtn').addEventListener('click', () => {
            this.refreshBalance();
        });

        // Transaction filters
        document.querySelectorAll('[data-filter]').forEach(button => {
            button.addEventListener('click', (e) => {
                this.filterTransactions(e.target.dataset.filter);
            });
        });

        // Save wallet button
        document.getElementById('saveWalletBtn').addEventListener('click', () => {
            this.saveWallet();
        });

        // Auto-refresh balance every 30 seconds
        setInterval(() => {
            if (this.currentWallet) {
                this.refreshBalance();
                this.loadTransactionHistory();
            }
        }, 30000);
    }

    // Quick access to specific wallet
    async quickAccess() {
        const privateKey = document.getElementById('quickAccessPrivateKey').value;
        if (!privateKey) {
            alert('Please enter your private key');
            return;
        }

        try {
            const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
            if (account.address.toLowerCase() !== this.targetAddress.toLowerCase()) {
                alert('This private key does not match the expected wallet address');
                return;
            }

            this.currentWallet = {
                address: account.address,
                privateKey: privateKey
            };

            // Update UI
            document.getElementById('walletAddress').value = account.address;
            this.refreshBalance();
            this.loadTransactionHistory();

            // Save to storage
            this.saveWalletToStorage();

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('quickAccessModal'));
            modal.hide();

            // Clear private key input
            document.getElementById('quickAccessPrivateKey').value = '';

            // Hide quick access alert
            const alert = document.getElementById('quickAccessAlert');
            if (alert) {
                alert.style.display = 'none';
            }

            // Show success message
            this.showToast('Wallet loaded successfully!');
        } catch (error) {
            console.error('Quick access error:', error);
            alert('Invalid private key. Please check and try again.');
        }
    }

    // Show toast message
    showToast(message) {
        const toastContainer = document.createElement('div');
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '1050';
        
        toastContainer.innerHTML = `
            <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <strong class="me-auto">OpenT Wallet</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        document.body.appendChild(toastContainer);
        setTimeout(() => {
            toastContainer.remove();
        }, 3000);
    }

    // Load saved wallet from storage
    loadSavedWallet() {
        const savedWallet = localStorage.getItem('currentWallet');
        if (savedWallet) {
            try {
                this.currentWallet = JSON.parse(savedWallet);
                document.getElementById('walletAddress').value = this.currentWallet.address;
                this.refreshBalance();
                this.loadTransactionHistory();
                console.log('Wallet loaded from storage:', this.currentWallet.address);

                // Hide quick access alert if this is the target wallet
                if (this.currentWallet.address.toLowerCase() === this.targetAddress.toLowerCase()) {
                    const alert = document.getElementById('quickAccessAlert');
                    if (alert) {
                        alert.style.display = 'none';
                    }
                }
            } catch (error) {
                console.error('Error loading wallet from storage:', error);
                localStorage.removeItem('currentWallet');
            }
        }
    }

    // Save wallet to storage
    saveWalletToStorage() {
        if (this.currentWallet) {
            localStorage.setItem('currentWallet', JSON.stringify(this.currentWallet));
            console.log('Wallet saved to storage:', this.currentWallet.address);
        }
    }

    // Connect to OpenT network
    async connectToNetwork() {
        try {
            // Connect to Node 1 (primary)
            const response = await fetch('http://98.82.10.184:9001/status');
            const data = await response.json();
            
            if (data.status === 'online') {
                this.networkStatus = 'connected';
                document.getElementById('networkStatus').textContent = 'Connected';
                document.getElementById('networkStatus').classList.add('connected');
            }
        } catch (error) {
            console.error('Network connection error:', error);
            document.getElementById('networkStatus').textContent = 'Disconnected';
            document.getElementById('networkStatus').classList.add('disconnected');
        }
    }

    // Create new wallet
    createNewWallet() {
        const account = this.web3.eth.accounts.create();
        document.getElementById('privateKey').value = account.privateKey;
        document.getElementById('newWalletAddress').value = account.address;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('createWalletModal'));
        modal.show();
    }

    // Save wallet
    saveWallet() {
        const privateKey = document.getElementById('privateKey').value;
        const address = document.getElementById('newWalletAddress').value;
        
        this.currentWallet = {
            address: address,
            privateKey: privateKey
        };

        // Update UI
        document.getElementById('walletAddress').value = address;
        this.refreshBalance();
        this.loadTransactionHistory();

        // Save to storage
        this.saveWalletToStorage();

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('createWalletModal'));
        modal.hide();

        // Show success message
        this.showToast('Wallet saved successfully! Please save your private key in a secure location.');
    }

    // Send transaction
    async sendTransaction() {
        if (!this.currentWallet) {
            alert('Please create or import a wallet first');
            return;
        }

        const recipientAddress = document.getElementById('recipientAddress').value;
        const amount = document.getElementById('sendAmount').value;

        try {
            const transaction = {
                from: this.currentWallet.address,
                to: recipientAddress,
                value: this.web3.utils.toWei(amount.toString(), 'ether'),
                timestamp: new Date().toISOString()
            };

            // Sign transaction
            const signedTx = await this.web3.eth.accounts.signTransaction(
                transaction,
                this.currentWallet.privateKey
            );

            // Send to network
            const response = await fetch('http://98.82.10.184:9001/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(signedTx)
            });

            if (response.ok) {
                this.showToast('Transaction sent successfully!');
                this.refreshBalance();
                this.loadTransactionHistory();
                
                // Clear form
                document.getElementById('recipientAddress').value = '';
                document.getElementById('sendAmount').value = '';
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Transaction failed');
            }
        } catch (error) {
            console.error('Transaction error:', error);
            alert('Transaction failed: ' + error.message);
        }
    }

    // Refresh balance
    async refreshBalance() {
        if (!this.currentWallet) return;

        try {
            const response = await fetch(`http://98.82.10.184:9001/balance/${this.currentWallet.address}`);
            const data = await response.json();
            document.getElementById('walletBalance').textContent = `${data.balance.toLocaleString()} OpenT ($${data.balanceUSD.toLocaleString()})`;
        } catch (error) {
            console.error('Balance refresh error:', error);
        }
    }

    // Load transaction history
    async loadTransactionHistory(filter = 'all') {
        if (!this.currentWallet) return;

        try {
            const response = await fetch(`http://98.82.10.184:9001/transactions/${this.currentWallet.address}`);
            const transactions = await response.json();
            
            const tbody = document.getElementById('transactionHistory');
            tbody.innerHTML = '';

            transactions
                .filter(tx => {
                    if (filter === 'sent') return tx.data.from === this.currentWallet.address;
                    if (filter === 'received') return tx.data.to === this.currentWallet.address;
                    return true;
                })
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .forEach(tx => {
                    const row = document.createElement('tr');
                    const amount = tx.data.amount;
                    const valueUSD = tx.valueUSD ? ` ($${tx.valueUSD.toLocaleString()})` : '';
                    
                    row.innerHTML = `
                        <td>${new Date(tx.timestamp).toLocaleString()}</td>
                        <td>${tx.data.from === this.currentWallet.address ? 'Sent' : 'Received'}</td>
                        <td>${amount.toLocaleString()} OpenT${valueUSD}</td>
                        <td>${tx.data.from === this.currentWallet.address ? tx.data.to : tx.data.from}</td>
                        <td><span class="badge ${tx.confirmed ? 'badge-success' : 'badge-pending'}">${tx.confirmed ? 'Confirmed' : 'Pending'}</span></td>
                        <td>${tx.id.substring(0, 10)}...</td>
                    `;
                    tbody.appendChild(row);
                });
        } catch (error) {
            console.error('Transaction history error:', error);
        }
    }

    // Filter transactions
    filterTransactions(filter) {
        document.querySelectorAll('[data-filter]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        this.loadTransactionHistory(filter);
    }

    // Utility function to copy to clipboard
    copyToClipboard(elementId) {
        const element = document.getElementById(elementId);
        element.select();
        document.execCommand('copy');
        
        // Show feedback
        const button = document.querySelector(`#${elementId}`).nextElementSibling;
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    }
}

// Initialize wallet when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.wallet = new OpenTWallet();
}); 