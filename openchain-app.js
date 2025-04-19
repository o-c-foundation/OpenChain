document.addEventListener('DOMContentLoaded', () => {
    // Global variables
    const API_URL = 'http://localhost:3000';
    let currentPage = {
        blocks: 1,
        transactions: 1
    };
    let walletManager = null;
    
    // Initialize application
    initApp();
    
    // Event listeners for tab switching
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('show.bs.tab', event => {
            const targetTab = event.target.getAttribute('data-bs-target').replace('#', '');
            if (targetTab === 'dashboard') loadDashboard();
            if (targetTab === 'blocks') loadBlocks();
            if (targetTab === 'transactions') loadTransactions();
            if (targetTab === 'wallet') initWallet();
        });
    });
    
    // Search functionality
    document.getElementById('searchForm').addEventListener('submit', event => {
        event.preventDefault();
        const searchTerm = document.getElementById('searchInput').value.trim();
        if (searchTerm) {
            search(searchTerm);
        }
    });
    
    // Functions
    async function initApp() {
        loadDashboard();
        initWallet();
    }
    
    async function loadDashboard() {
        try {
            showLoading('dashboardStats');
            
            const nodeInfo = await fetchData('/info');
            const latestBlocks = await fetchData('/blocks?limit=5');
            const latestTransactions = await fetchData('/transactions?limit=5');
            
            updateNodeInfo(nodeInfo);
            updateLatestBlocks(latestBlocks);
            updateLatestTransactions(latestTransactions);
            
            hideLoading('dashboardStats');
        } catch (error) {
            showError('dashboardStats', 'Failed to load dashboard data');
            console.error('Dashboard error:', error);
        }
    }
    
    async function loadBlocks(page = 1) {
        try {
            showLoading('blocksContent');
            
            const limit = 10;
            const offset = (page - 1) * limit;
            const blocks = await fetchData(`/blocks?limit=${limit}&offset=${offset}`);
            const totalBlocks = await fetchData('/info').then(info => info.blocks || 0);
            
            currentPage.blocks = page;
            updateBlockList(blocks);
            updatePagination('blocksPagination', totalBlocks, limit, page, loadBlocks);
            
            hideLoading('blocksContent');
        } catch (error) {
            showError('blocksContent', 'Failed to load blocks');
            console.error('Blocks error:', error);
        }
    }
    
    async function loadTransactions(page = 1) {
        try {
            showLoading('transactionsContent');
            
            const limit = 10;
            const offset = (page - 1) * limit;
            const transactions = await fetchData(`/transactions?limit=${limit}&offset=${offset}`);
            const totalTxs = await fetchData('/info').then(info => info.transactions || 0);
            
            currentPage.transactions = page;
            updateTransactionList(transactions);
            updatePagination('transactionsPagination', totalTxs, limit, page, loadTransactions);
            
            hideLoading('transactionsContent');
        } catch (error) {
            showError('transactionsContent', 'Failed to load transactions');
            console.error('Transactions error:', error);
        }
    }
    
    function initWallet() {
        if (!walletManager) {
            walletManager = new WalletManager(document.getElementById('walletContent'), API_URL);
        }
    }
    
    async function search(term) {
        try {
            showLoading('searchResults');
            
            // Try to search by block hash/height
            try {
                const block = await fetchData(`/block/${term}`);
                if (block) {
                    showBlockDetails(block);
                    return;
                }
            } catch (e) {
                // Not a block, continue
            }
            
            // Try to search by transaction hash
            try {
                const tx = await fetchData(`/transaction/${term}`);
                if (tx) {
                    showTransactionDetails(tx);
                    return;
                }
            } catch (e) {
                // Not a transaction, continue
            }
            
            // Try to search by address
            try {
                const address = await fetchData(`/address/${term}`);
                if (address) {
                    showAddressDetails(address);
                    return;
                }
            } catch (e) {
                // Not an address, continue
            }
            
            // No results found
            document.getElementById('searchResults').innerHTML = 
                '<div class="alert alert-warning">No results found for: ' + term + '</div>';
        } catch (error) {
            showError('searchResults', 'Search failed');
            console.error('Search error:', error);
        } finally {
            hideLoading('searchResults');
        }
    }
    
    // Helper functions
    async function fetchData(endpoint) {
        const response = await fetch(API_URL + endpoint);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
    }
    
    function updateNodeInfo(info) {
        document.getElementById('nodeStats').innerHTML = `
            <div class="col-md-3">
                <div class="card mb-4">
                    <div class="card-body">
                        <h5 class="card-title">Blocks</h5>
                        <p class="display-4">${info.blocks || 0}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card mb-4">
                    <div class="card-body">
                        <h5 class="card-title">Transactions</h5>
                        <p class="display-4">${info.transactions || 0}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card mb-4">
                    <div class="card-body">
                        <h5 class="card-title">Nodes</h5>
                        <p class="display-4">${info.peers || 0}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card mb-4">
                    <div class="card-body">
                        <h5 class="card-title">Hash Rate</h5>
                        <p class="display-4">${formatHashRate(info.hashRate || 0)}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    function updateLatestBlocks(blocks) {
        let html = '';
        
        blocks.forEach(block => {
            html += `
                <tr>
                    <td><a href="#" class="block-link" data-block="${block.height}">${block.height}</a></td>
                    <td>${shortHash(block.hash)}</td>
                    <td>${block.transactions?.length || 0}</td>
                    <td>${formatTimestamp(block.timestamp)}</td>
                </tr>
            `;
        });
        
        document.getElementById('latestBlocks').innerHTML = html;
        
        // Add event listeners to block links
        document.querySelectorAll('.block-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const blockHeight = e.target.getAttribute('data-block');
                fetchData(`/block/${blockHeight}`).then(block => {
                    showBlockDetails(block);
                }).catch(err => {
                    console.error('Error fetching block:', err);
                });
            });
        });
    }
    
    function updateLatestTransactions(transactions) {
        let html = '';
        
        transactions.forEach(tx => {
            html += `
                <tr>
                    <td><a href="#" class="tx-link" data-tx="${tx.id}">${shortHash(tx.id)}</a></td>
                    <td>${shortHash(tx.fromAddress || 'Mining Reward')}</td>
                    <td>${shortHash(tx.toAddress)}</td>
                    <td>${tx.amount}</td>
                </tr>
            `;
        });
        
        document.getElementById('latestTransactions').innerHTML = html;
        
        // Add event listeners to transaction links
        document.querySelectorAll('.tx-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const txId = e.target.getAttribute('data-tx');
                fetchData(`/transaction/${txId}`).then(tx => {
                    showTransactionDetails(tx);
                }).catch(err => {
                    console.error('Error fetching transaction:', err);
                });
            });
        });
    }
    
    function updateBlockList(blocks) {
        let html = '';
        
        blocks.forEach(block => {
            html += `
                <tr>
                    <td><a href="#" class="block-link" data-block="${block.height}">${block.height}</a></td>
                    <td>${shortHash(block.hash)}</td>
                    <td>${block.transactions?.length || 0}</td>
                    <td>${formatTimestamp(block.timestamp)}</td>
                    <td>${block.nonce}</td>
                    <td>${shortHash(block.previousHash)}</td>
                </tr>
            `;
        });
        
        document.getElementById('blocksList').innerHTML = html;
        
        // Add event listeners to block links
        document.querySelectorAll('.block-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const blockHeight = e.target.getAttribute('data-block');
                fetchData(`/block/${blockHeight}`).then(block => {
                    showBlockDetails(block);
                }).catch(err => {
                    console.error('Error fetching block:', err);
                });
            });
        });
    }
    
    function updateTransactionList(transactions) {
        let html = '';
        
        transactions.forEach(tx => {
            html += `
                <tr>
                    <td><a href="#" class="tx-link" data-tx="${tx.id}">${shortHash(tx.id)}</a></td>
                    <td>${shortHash(tx.fromAddress || 'Mining Reward')}</td>
                    <td>${shortHash(tx.toAddress)}</td>
                    <td>${tx.amount}</td>
                    <td>${formatTimestamp(tx.timestamp)}</td>
                </tr>
            `;
        });
        
        document.getElementById('transactionsList').innerHTML = html;
        
        // Add event listeners to transaction links
        document.querySelectorAll('.tx-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const txId = e.target.getAttribute('data-tx');
                fetchData(`/transaction/${txId}`).then(tx => {
                    showTransactionDetails(tx);
                }).catch(err => {
                    console.error('Error fetching transaction:', err);
                });
            });
        });
    }
    
    function updatePagination(elementId, total, limit, currentPage, callback) {
        const pages = Math.ceil(total / limit);
        let html = '';
        
        // Previous button
        html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage-1}">Previous</a>
        </li>`;
        
        // Page numbers
        for (let i = 1; i <= pages; i++) {
            if (i === 1 || i === pages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += `<li class="page-item disabled"><a class="page-link" href="#">...</a></li>`;
            }
        }
        
        // Next button
        html += `<li class="page-item ${currentPage === pages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage+1}">Next</a>
        </li>`;
        
        document.getElementById(elementId).innerHTML = html;
        
        // Add event listeners to pagination links
        document.querySelectorAll(`#${elementId} .page-link`).forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (!e.target.parentNode.classList.contains('disabled')) {
                    const page = parseInt(e.target.getAttribute('data-page'));
                    callback(page);
                }
            });
        });
    }
    
    function showBlockDetails(block) {
        // Create a modal to display block details
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'blockModal';
        modal.setAttribute('tabindex', '-1');
        
        let txList = '';
        if (block.transactions && block.transactions.length > 0) {
            block.transactions.forEach(tx => {
                txList += `
                    <tr>
                        <td><a href="#" class="tx-link" data-tx="${tx.id}">${shortHash(tx.id)}</a></td>
                        <td>${shortHash(tx.fromAddress || 'Mining Reward')}</td>
                        <td>${shortHash(tx.toAddress)}</td>
                        <td>${tx.amount}</td>
                    </tr>
                `;
            });
        } else {
            txList = '<tr><td colspan="4" class="text-center">No transactions</td></tr>';
        }
        
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Block #${block.height}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-3 fw-bold">Hash:</div>
                            <div class="col-md-9 text-break">${block.hash}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-3 fw-bold">Previous Hash:</div>
                            <div class="col-md-9 text-break">${block.previousHash}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-3 fw-bold">Timestamp:</div>
                            <div class="col-md-9">${formatTimestamp(block.timestamp)}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-3 fw-bold">Nonce:</div>
                            <div class="col-md-9">${block.nonce}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-3 fw-bold">Transactions:</div>
                            <div class="col-md-9">${block.transactions?.length || 0}</div>
                        </div>
                        
                        <h6 class="mt-4">Transactions in this block:</h6>
                        <div class="table-responsive">
                            <table class="table table-striped table-sm">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>From</th>
                                        <th>To</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${txList}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Initialize and show the modal
        const blockModal = new bootstrap.Modal(document.getElementById('blockModal'));
        blockModal.show();
        
        // Add event listener to remove modal from DOM when hidden
        document.getElementById('blockModal').addEventListener('hidden.bs.modal', function () {
            document.body.removeChild(modal);
        });
        
        // Add event listeners to transaction links in the modal
        modal.querySelectorAll('.tx-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                blockModal.hide();
                const txId = e.target.getAttribute('data-tx');
                fetchData(`/transaction/${txId}`).then(tx => {
                    showTransactionDetails(tx);
                }).catch(err => {
                    console.error('Error fetching transaction:', err);
                });
            });
        });
    }
    
    function showTransactionDetails(tx) {
        // Create a modal to display transaction details
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'txModal';
        modal.setAttribute('tabindex', '-1');
        
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Transaction Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-3 fw-bold">Transaction ID:</div>
                            <div class="col-md-9 text-break">${tx.id}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-3 fw-bold">From:</div>
                            <div class="col-md-9 text-break">${tx.fromAddress || 'Mining Reward'}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-3 fw-bold">To:</div>
                            <div class="col-md-9 text-break">${tx.toAddress}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-3 fw-bold">Amount:</div>
                            <div class="col-md-9">${tx.amount}</div>
                        </div>
                        <div class="row mb-3">
                            <div class="col-md-3 fw-bold">Timestamp:</div>
                            <div class="col-md-9">${formatTimestamp(tx.timestamp)}</div>
                        </div>
                        ${tx.signature ? `
                        <div class="row mb-3">
                            <div class="col-md-3 fw-bold">Signature:</div>
                            <div class="col-md-9 text-break">${tx.signature}</div>
                        </div>` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Initialize and show the modal
        const txModal = new bootstrap.Modal(document.getElementById('txModal'));
        txModal.show();
        
        // Add event listener to remove modal from DOM when hidden
        document.getElementById('txModal').addEventListener('hidden.bs.modal', function () {
            document.body.removeChild(modal);
        });
    }
    
    function showAddressDetails(address) {
        // Implement address details modal similar to block and transaction details
    }
    
    // UI Helper functions
    function showLoading(elementId) {
        document.getElementById(elementId).innerHTML = `
            <div class="d-flex justify-content-center my-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }
    
    function hideLoading(elementId) {
        // This function doesn't need to do anything as the content will be replaced
    }
    
    function showError(elementId, message) {
        document.getElementById(elementId).innerHTML = `
            <div class="alert alert-danger" role="alert">
                ${message}
            </div>
        `;
    }
    
    function shortHash(hash) {
        if (!hash) return 'N/A';
        return hash.substring(0, 8) + '...' + hash.substring(hash.length - 8);
    }
    
    function formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString();
    }
    
    function formatHashRate(hashRate) {
        if (hashRate < 1000) return hashRate.toFixed(2) + ' H/s';
        if (hashRate < 1000000) return (hashRate / 1000).toFixed(2) + ' KH/s';
        if (hashRate < 1000000000) return (hashRate / 1000000).toFixed(2) + ' MH/s';
        return (hashRate / 1000000000).toFixed(2) + ' GH/s';
    }
});

// WalletManager class to handle wallet functionality
class WalletManager {
    constructor(container, apiUrl) {
        this.container = container;
        this.apiUrl = apiUrl;
        this.wallets = [];
        this.currentWallet = null;
        
        this.init();
    }
    
    async init() {
        this.renderWalletUI();
        this.attachEventListeners();
        await this.loadWallets();
    }
    
    renderWalletUI() {
        this.container.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">My Wallets</h5>
                        </div>
                        <div class="card-body">
                            <div id="walletsList" class="mb-3">
                                <p class="text-center">No wallets found</p>
                            </div>
                            <div class="d-flex justify-content-between">
                                <button id="createWalletBtn" class="btn btn-primary">Create New Wallet</button>
                                <button id="importWalletBtn" class="btn btn-outline-secondary">Import Wallet</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Wallet Details</h5>
                        </div>
                        <div class="card-body" id="walletDetails">
                            <p class="text-center">Select a wallet to view details</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Transactions</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <button id="sendTransactionBtn" class="btn btn-primary mb-3" disabled>Send Transaction</button>
                            </div>
                            <div id="transactionsForWallet">
                                <p class="text-center">Select a wallet to view transactions</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Modals -->
            <div class="modal fade" id="createWalletModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Create New Wallet</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="walletName" class="form-label">Wallet Name</label>
                                <input type="text" class="form-control" id="walletName" placeholder="My Wallet">
                            </div>
                            <div class="mb-3">
                                <label for="walletPassword" class="form-label">Password (optional)</label>
                                <input type="password" class="form-control" id="walletPassword" placeholder="Password for encryption">
                                <div class="form-text">A password is recommended to secure your wallet</div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="confirmCreateWallet">Create Wallet</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="modal fade" id="importWalletModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Import Wallet</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="walletPrivateKey" class="form-label">Private Key</label>
                                <input type="text" class="form-control" id="walletPrivateKey" placeholder="Your wallet private key">
                            </div>
                            <div class="mb-3">
                                <label for="importWalletName" class="form-label">Wallet Name</label>
                                <input type="text" class="form-control" id="importWalletName" placeholder="My Imported Wallet">
                            </div>
                            <div class="mb-3">
                                <label for="importWalletPassword" class="form-label">Password (optional)</label>
                                <input type="password" class="form-control" id="importWalletPassword" placeholder="Password for encryption">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="confirmImportWallet">Import Wallet</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="modal fade" id="sendTransactionModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Send Transaction</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="recipientAddress" class="form-label">Recipient Address</label>
                                <input type="text" class="form-control" id="recipientAddress" placeholder="Recipient's wallet address">
                            </div>
                            <div class="mb-3">
                                <label for="transactionAmount" class="form-label">Amount</label>
                                <input type="number" class="form-control" id="transactionAmount" placeholder="Amount to send" min="0.00000001" step="0.00000001">
                            </div>
                            <div class="mb-3" id="walletPasswordPrompt" style="display:none;">
                                <label for="walletPasswordForTx" class="form-label">Wallet Password</label>
                                <input type="password" class="form-control" id="walletPasswordForTx" placeholder="Enter wallet password">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="confirmSendTransaction">Send</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        // Create wallet
        document.getElementById('createWalletBtn').addEventListener('click', () => {
            const createWalletModal = new bootstrap.Modal(document.getElementById('createWalletModal'));
            createWalletModal.show();
        });
        
        document.getElementById('confirmCreateWallet').addEventListener('click', () => {
            const name = document.getElementById('walletName').value.trim();
            const password = document.getElementById('walletPassword').value;
            
            if (name) {
                this.createWallet(name, password);
                bootstrap.Modal.getInstance(document.getElementById('createWalletModal')).hide();
            }
        });
        
        // Import wallet
        document.getElementById('importWalletBtn').addEventListener('click', () => {
            const importWalletModal = new bootstrap.Modal(document.getElementById('importWalletModal'));
            importWalletModal.show();
        });
        
        document.getElementById('confirmImportWallet').addEventListener('click', () => {
            const privateKey = document.getElementById('walletPrivateKey').value.trim();
            const name = document.getElementById('importWalletName').value.trim();
            const password = document.getElementById('importWalletPassword').value;
            
            if (privateKey && name) {
                this.importWallet(privateKey, name, password);
                bootstrap.Modal.getInstance(document.getElementById('importWalletModal')).hide();
            }
        });
        
        // Send transaction
        document.getElementById('sendTransactionBtn').addEventListener('click', () => {
            if (!this.currentWallet) return;
            
            // Show wallet password field if wallet is encrypted
            if (this.currentWallet.encrypted) {
                document.getElementById('walletPasswordPrompt').style.display = 'block';
            } else {
                document.getElementById('walletPasswordPrompt').style.display = 'none';
            }
            
            const sendTransactionModal = new bootstrap.Modal(document.getElementById('sendTransactionModal'));
            sendTransactionModal.show();
        });
        
        document.getElementById('confirmSendTransaction').addEventListener('click', () => {
            const recipient = document.getElementById('recipientAddress').value.trim();
            const amount = parseFloat(document.getElementById('transactionAmount').value);
            const password = document.getElementById('walletPasswordForTx')?.value;
            
            if (recipient && amount > 0 && this.currentWallet) {
                this.sendTransaction(recipient, amount, password);
                bootstrap.Modal.getInstance(document.getElementById('sendTransactionModal')).hide();
            }
        });
    }
    
    async loadWallets() {
        try {
            const response = await fetch(`${this.apiUrl}/wallets`);
            if (response.ok) {
                this.wallets = await response.json();
                this.updateWalletsList();
            } else {
                console.error('Failed to load wallets:', response.statusText);
            }
        } catch (error) {
            console.error('Error loading wallets:', error);
        }
    }
    
    updateWalletsList() {
        const walletsListElement = document.getElementById('walletsList');
        
        if (this.wallets.length === 0) {
            walletsListElement.innerHTML = '<p class="text-center">No wallets found</p>';
            return;
        }
        
        let html = '<div class="list-group">';
        
        this.wallets.forEach(wallet => {
            html += `
                <button type="button" class="list-group-item list-group-item-action wallet-item ${this.currentWallet?.address === wallet.address ? 'active' : ''}" 
                        data-address="${wallet.address}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-0">${wallet.name}</h6>
                            <small class="text-muted">${this.shortenAddress(wallet.address)}</small>
                        </div>
                        <div>
                            <span class="badge bg-primary rounded-pill">${wallet.balance} coins</span>
                        </div>
                    </div>
                </button>
            `;
        });
        
        html += '</div>';
        walletsListElement.innerHTML = html;
        
        // Add event listeners to wallet items
        document.querySelectorAll('.wallet-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const address = e.currentTarget.getAttribute('data-address');
                this.selectWallet(address);
            });
        });
    }
    
    selectWallet(address) {
        this.currentWallet = this.wallets.find(wallet => wallet.address === address);
        
        // Update UI
        document.querySelectorAll('.wallet-item').forEach(item => {
            if (item.getAttribute('data-address') === address) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        this.updateWalletDetails();
        this.loadWalletTransactions();
        
        // Enable send transaction button
        document.getElementById('sendTransactionBtn').disabled = false;
    }
    
    updateWalletDetails() {
        const walletDetailsElement = document.getElementById('walletDetails');
        
        if (!this.currentWallet) {
            walletDetailsElement.innerHTML = '<p class="text-center">Select a wallet to view details</p>';
            return;
        }
        
        walletDetailsElement.innerHTML = `
            <h4 class="mb-3">${this.currentWallet.name}</h4>
            <div class="mb-3">
                <p class="mb-1"><strong>Address:</strong></p>
                <p class="text-break">${this.currentWallet.address}</p>
            </div>
            <div class="mb-3">
                <p class="mb-1"><strong>Balance:</strong></p>
                <h3>${this.currentWallet.balance} coins</h3>
            </div>
            <div class="d-grid gap-2">
                <button class="btn btn-outline-primary" id="showPrivateKeyBtn">Show Private Key</button>
            </div>
        `;
        
        // Add event listener to show private key button
        document.getElementById('showPrivateKeyBtn').addEventListener('click', () => {
            // Implement private key reveal with password prompt
            alert('This feature is not yet implemented.');
        });
    }
    
    async loadWalletTransactions() {
        const transactionsElement = document.getElementById('transactionsForWallet');
        
        if (!this.currentWallet) {
            transactionsElement.innerHTML = '<p class="text-center">Select a wallet to view transactions</p>';
            return;
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/address/${this.currentWallet.address}/transactions`);
            if (response.ok) {
                const transactions = await response.json();
                
                if (transactions.length === 0) {
                    transactionsElement.innerHTML = '<p class="text-center">No transactions found for this wallet</p>';
                    return;
                }
                
                let html = `
                    <div class="table-responsive">
                        <table class="table table-striped table-sm">
                            <thead>
                                <tr>
                                    <th>Transaction ID</th>
                                    <th>Type</th>
                                    <th>From/To</th>
                                    <th>Amount</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                transactions.forEach(tx => {
                    const isSent = tx.fromAddress === this.currentWallet.address;
                    const counterparty = isSent ? tx.toAddress : (tx.fromAddress || 'Mining Reward');
                    
                    html += `
                        <tr>
                            <td><a href="#" class="tx-link" data-tx="${tx.id}">${this.shortenAddress(tx.id)}</a></td>
                            <td><span class="badge ${isSent ? 'bg-danger' : 'bg-success'}">${isSent ? 'Sent' : 'Received'}</span></td>
                            <td>${this.shortenAddress(counterparty)}</td>
                            <td>${isSent ? '-' : '+'}${tx.amount}</td>
                            <td>${this.formatDate(tx.timestamp)}</td>
                        </tr>
                    `;
                });
                
                html += `
                    </tbody>
                </table>
            </div>
        `;
                
                transactionsElement.innerHTML = html;
                
                // Add event listeners to transaction links
                document.querySelectorAll('.tx-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const txId = e.target.getAttribute('data-tx');
                        this.showTransactionDetails(txId);
                    });
                });
            } else {
                transactionsElement.innerHTML = '<p class="text-center text-danger">Failed to load transactions</p>';
            }
        } catch (error) {
            console.error('Error loading wallet transactions:', error);
            transactionsElement.innerHTML = '<p class="text-center text-danger">Error loading transactions</p>';
        }
    }
    
    async createWallet(name, password = '') {
        try {
            const response = await fetch(`${this.apiUrl}/wallet/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, password })
            });
            
            if (response.ok) {
                const wallet = await response.json();
                this.wallets.push(wallet);
                this.updateWalletsList();
                this.selectWallet(wallet.address);
                
                // Show success message
                alert(`Wallet "${name}" created successfully! Make sure to backup your private key.`);
            } else {
                console.error('Failed to create wallet:', response.statusText);
                alert('Failed to create wallet. Please try again.');
            }
        } catch (error) {
            console.error('Error creating wallet:', error);
            alert('Error creating wallet. Please try again.');
        }
    }
    
    async importWallet(privateKey, name, password = '') {
        try {
            const response = await fetch(`${this.apiUrl}/wallet/import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ privateKey, name, password })
            });
            
            if (response.ok) {
                const wallet = await response.json();
                this.wallets.push(wallet);
                this.updateWalletsList();
                this.selectWallet(wallet.address);
                
                // Show success message
                alert(`Wallet "${name}" imported successfully!`);
            } else {
                console.error('Failed to import wallet:', response.statusText);
                alert('Failed to import wallet. Please check your private key and try again.');
            }
        } catch (error) {
            console.error('Error importing wallet:', error);
            alert('Error importing wallet. Please try again.');
        }
    }
    
    async sendTransaction(recipient, amount, password = '') {
        if (!this.currentWallet) return;
        
        try {
            const response = await fetch(`${this.apiUrl}/transaction/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fromAddress: this.currentWallet.address,
                    toAddress: recipient,
                    amount,
                    password
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                alert(`Transaction sent successfully! Transaction ID: ${result.id}`);
                
                // Reload wallet data
                await this.loadWallets();
                if (this.currentWallet) {
                    this.selectWallet(this.currentWallet.address);
                }
            } else {
                const error = await response.json();
                console.error('Failed to send transaction:', error);
                alert(`Failed to send transaction: ${error.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error sending transaction:', error);
            alert('Error sending transaction. Please try again.');
        }
    }
    
    async showTransactionDetails(txId) {
        try {
            const response = await fetch(`${this.apiUrl}/transaction/${txId}`);
            if (response.ok) {
                const tx = await response.json();
                
                // Create and show modal with transaction details
                const modal = document.createElement('div');
                modal.className = 'modal fade';
                modal.id = 'txDetailsModal';
                modal.setAttribute('tabindex', '-1');
                
                modal.innerHTML = `
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Transaction Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-md-3 fw-bold">Transaction ID:</div>
                                    <div class="col-md-9 text-break">${tx.id}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-3 fw-bold">From:</div>
                                    <div class="col-md-9 text-break">${tx.fromAddress || 'Mining Reward'}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-3 fw-bold">To:</div>
                                    <div class="col-md-9 text-break">${tx.toAddress}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-3 fw-bold">Amount:</div>
                                    <div class="col-md-9">${tx.amount}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-3 fw-bold">Timestamp:</div>
                                    <div class="col-md-9">${this.formatDate(tx.timestamp)}</div>
                                </div>
                                ${tx.signature ? `
                                <div class="row mb-3">
                                    <div class="col-md-3 fw-bold">Signature:</div>
                                    <div class="col-md-9 text-break">${tx.signature}</div>
                                </div>` : ''}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Initialize and show the modal
                const txModal = new bootstrap.Modal(document.getElementById('txDetailsModal'));
                txModal.show();
                
                // Add event listener to remove modal from DOM when hidden
                document.getElementById('txDetailsModal').addEventListener('hidden.bs.modal', function () {
                    document.body.removeChild(modal);
                });
            } else {
                console.error('Failed to load transaction details:', response.statusText);
            }
        } catch (error) {
            console.error('Error loading transaction details:', error);
        }
    }
    
    // Helper functions
    shortenAddress(address) {
        if (!address) return 'N/A';
        return address.substring(0, 8) + '...' + address.substring(address.length - 8);
    }
    
    formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString();
    }
} 