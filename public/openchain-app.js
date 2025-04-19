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
    document.querySelectorAll('.navbar .nav-link').forEach(tab => {
        tab.addEventListener('click', event => {
            event.preventDefault();
            
            // Remove active class from all tabs
            document.querySelectorAll('.navbar .nav-link').forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            event.target.classList.add('active');
            
            // Hide all tab panes
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // Show selected tab pane
            const targetId = event.target.getAttribute('data-bs-target');
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
                
                // Load content based on tab
                if (targetId === 'dashboardTabContent') loadDashboard();
                if (targetId === 'blocksTabContent') loadBlocks();
                if (targetId === 'transactionsTabContent') loadTransactions();
                if (targetId === 'walletTabContent') initWallet();
            }
        });
    });
    
    // Add event listeners for View All buttons
    document.getElementById('viewAllBlocks')?.addEventListener('click', e => {
        e.preventDefault();
        // Trigger click on Blocks tab
        document.querySelector('.nav-link[data-bs-target="blocksTabContent"]').click();
    });
    
    document.getElementById('viewAllTx')?.addEventListener('click', e => {
        e.preventDefault();
        // Trigger click on Transactions tab
        document.querySelector('.nav-link[data-bs-target="transactionsTabContent"]').click();
    });
    
    // Search functionality
    document.getElementById('searchButton')?.addEventListener('click', event => {
        const searchTerm = document.getElementById('searchInput').value.trim();
        if (searchTerm) {
            search(searchTerm);
        }
    });
    
    // Theme switcher
    document.getElementById('themeSwitch')?.addEventListener('click', () => {
        const htmlElement = document.documentElement;
        const currentTheme = htmlElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        htmlElement.setAttribute('data-theme', newTheme);
        
        // Update the theme switcher icon
        const themeIcon = document.querySelector('#themeSwitch i');
        if (themeIcon) {
            themeIcon.className = newTheme === 'light' ? 'bi bi-moon-stars' : 'bi bi-sun';
        }
        
        // Store the theme preference in localStorage
        localStorage.setItem('theme', newTheme);
    });
    
    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        const themeIcon = document.querySelector('#themeSwitch i');
        if (themeIcon) {
            themeIcon.className = savedTheme === 'light' ? 'bi bi-moon-stars' : 'bi bi-sun';
        }
    }
    
    // Functions
    async function initApp() {
        loadDashboard();
        // Initialize wallet afterwards
        setTimeout(() => {
            initWallet();
        }, 1000);
    }
    
    async function loadDashboard() {
        try {
            // Update the loading state for stats cards
            document.querySelectorAll('.stats-card .card-value').forEach(el => {
                el.textContent = 'Loading...';
            });
            
            // Show loading state for blocks and transactions
            document.getElementById('latestBlocksLoading').style.display = 'block';
            document.getElementById('latestTxLoading').style.display = 'block';
            document.getElementById('latestBlocks').innerHTML = '';
            document.getElementById('latestTransactions').innerHTML = '';
            
            const nodeInfo = await fetchData('/info');
            const latestBlocks = await fetchData('/blocks?limit=5');
            const latestTransactions = await fetchData('/transactions?limit=5');
            
            // Update node connection info
            document.getElementById('nodeId').textContent = `localhost:3000`;
            
            // Update the stats cards
            document.getElementById('blockchainHeight').textContent = nodeInfo.blocks || '0';
            document.getElementById('totalTransactions').textContent = nodeInfo.transactions || '0';
            document.getElementById('difficulty').textContent = nodeInfo.difficulty || '0';
            document.getElementById('hashRate').textContent = formatHashRate(nodeInfo.hashRate || 0);
            
            // Add coin value and market cap info if it exists
            if (nodeInfo.coinValueUSD && nodeInfo.currentSupply) {
                // Find or create market data section
                let marketDataSection = document.getElementById('marketData');
                if (!marketDataSection) {
                    marketDataSection = document.createElement('div');
                    marketDataSection.id = 'marketData';
                    marketDataSection.className = 'row mb-4';
                    // Insert after the stats cards
                    document.getElementById('statsCards').insertAdjacentElement('afterend', marketDataSection);
                }
                
                // Update market data content
                marketDataSection.innerHTML = `
                    <div class="col-md-4 col-sm-12 mb-3">
                        <div class="card stats-card">
                            <div class="card-body">
                                <div class="card-title">COIN VALUE</div>
                                <div class="card-value">$${nodeInfo.coinValueUSD.toFixed(2)} USD</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 col-sm-12 mb-3">
                        <div class="card stats-card">
                            <div class="card-body">
                                <div class="card-title">CIRCULATING SUPPLY</div>
                                <div class="card-value">${formatNumber(nodeInfo.currentSupply)} / ${formatNumber(nodeInfo.maxSupply)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 col-sm-12 mb-3">
                        <div class="card stats-card">
                            <div class="card-body">
                                <div class="card-title">MARKET CAP</div>
                                <div class="card-value">$${formatNumber(nodeInfo.marketCap)}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Update blocks and transactions
            updateLatestBlocksList(latestBlocks);
            updateLatestTransactionsList(latestTransactions);
            
            // Hide loading indicators
            document.getElementById('latestBlocksLoading').style.display = 'none';
            document.getElementById('latestTxLoading').style.display = 'none';
        } catch (error) {
            console.error('Dashboard error:', error);
            // Show error messages in the UI
            document.querySelectorAll('.stats-card .card-value').forEach(el => {
                el.textContent = 'Error';
            });
            document.getElementById('latestBlocksLoading').innerHTML = 'Failed to load blocks';
            document.getElementById('latestTxLoading').innerHTML = 'Failed to load transactions';
        }
    }
    
    async function loadBlocks(page = 1) {
        try {
            document.getElementById('blocksLoading').style.display = 'block';
            document.getElementById('blocksList').innerHTML = '';
            
            const limit = 10;
            const offset = (page - 1) * limit;
            const blocks = await fetchData(`/blocks?limit=${limit}&offset=${offset}`);
            const totalBlocks = await fetchData('/info').then(info => info.blocks || 0);
            
            currentPage.blocks = page;
            updateBlockList(blocks);
            updatePagination('blocksPagination', totalBlocks, limit, page, loadBlocks);
            
            document.getElementById('blocksLoading').style.display = 'none';
        } catch (error) {
            console.error('Blocks error:', error);
            document.getElementById('blocksLoading').innerHTML = 'Failed to load blocks';
        }
    }
    
    async function loadTransactions(page = 1) {
        try {
            document.getElementById('transactionsLoading').style.display = 'block';
            document.getElementById('transactionsList').innerHTML = '';
            
            const limit = 10;
            const offset = (page - 1) * limit;
            const transactions = await fetchData(`/transactions?limit=${limit}&offset=${offset}`);
            const totalTxs = await fetchData('/info').then(info => info.transactions || 0);
            
            currentPage.transactions = page;
            updateTransactionList(transactions);
            updatePagination('transactionsPagination', totalTxs, limit, page, loadTransactions);
            
            document.getElementById('transactionsLoading').style.display = 'none';
        } catch (error) {
            console.error('Transactions error:', error);
            document.getElementById('transactionsLoading').innerHTML = 'Failed to load transactions';
        }
    }
    
    function initWallet() {
        try {
            if (!walletManager) {
                walletManager = new WalletManager(document.getElementById('walletTabContent'), API_URL);
            }
        } catch (error) {
            console.error('Wallet initialization error:', error);
        }
    }
    
    async function search(term) {
        try {
            // Create search results area if it doesn't exist
            let resultsArea = document.getElementById('searchResults');
            if (!resultsArea) {
                resultsArea = document.createElement('div');
                resultsArea.id = 'searchResults';
                resultsArea.className = 'mt-3';
                document.querySelector('main > .container').appendChild(resultsArea);
            }
            
            resultsArea.innerHTML = `
                <div class="d-flex justify-content-center my-3">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Searching...</span>
                    </div>
                </div>
            `;
            
            // Try to search by block hash/height
            try {
                const block = await fetchData(`/block/${term}`);
                if (block) {
                    showBlockDetails(block);
                    resultsArea.innerHTML = '';
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
                    resultsArea.innerHTML = '';
                    return;
                }
            } catch (e) {
                // Not a transaction, continue
            }
            
            // Try to search by address
            try {
                const address = await fetchData(`/address/${term}`);
                if (address) {
                    // Show wallet info
                    document.querySelector('.nav-link[data-bs-target="walletTabContent"]').click();
                    resultsArea.innerHTML = '';
                    return;
                }
            } catch (e) {
                // Not an address, continue
            }
            
            // No results found
            resultsArea.innerHTML = `
                <div class="alert alert-warning">
                    No results found for: ${term}
                </div>
            `;
        } catch (error) {
            console.error('Search error:', error);
            document.getElementById('searchResults').innerHTML = `
                <div class="alert alert-danger">
                    Search failed: ${error.message}
                </div>
            `;
        }
    }
    
    // Helper functions
    async function fetchData(endpoint) {
        console.log(`Fetching data from: ${API_URL}${endpoint}`);
        try {
            const response = await fetch(API_URL + endpoint);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            throw error;
        }
    }
    
    function updateLatestBlocksList(blocks) {
        const blocksElement = document.getElementById('latestBlocks');
        if (!blocksElement) return;
        
        let html = '<ul class="list-group list-group-flush">';
        
        blocks.forEach(block => {
            html += `
                <li class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <a href="#" class="block-link" data-block="${block.height}">Block #${block.height}</a>
                            <div class="small text-muted">${formatTimestamp(block.timestamp)}</div>
                        </div>
                        <div class="d-flex align-items-center">
                            <span class="badge bg-primary rounded-pill me-2">${block.transactions?.length || 0} txs</span>
                            <span class="text-muted small">${shortHash(block.hash)}</span>
                        </div>
                    </div>
                </li>
            `;
        });
        
        html += '</ul>';
        blocksElement.innerHTML = html;
        
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
    
    function updateLatestTransactionsList(transactions) {
        const txElement = document.getElementById('latestTransactions');
        if (!txElement) return;
        
        let html = '<ul class="list-group list-group-flush">';
        
        transactions.forEach(tx => {
            html += `
                <li class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <a href="#" class="tx-link" data-tx="${tx.id}">${shortHash(tx.id)}</a>
                            <div class="small text-muted">${formatTimestamp(tx.timestamp)}</div>
                        </div>
                        <div>
                            <span class="badge bg-success rounded-pill">${tx.amount} coins</span>
                        </div>
                    </div>
                    <div class="small mt-1">
                        <span class="text-muted">From:</span> ${shortHash(tx.fromAddress || 'Mining Reward')}
                        <span class="text-muted ms-2">To:</span> ${shortHash(tx.toAddress)}
                    </div>
                </li>
            `;
        });
        
        html += '</ul>';
        txElement.innerHTML = html;
        
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
    
    function formatNumber(num) {
        if (num === undefined || num === null) return '0';
        
        // For large numbers, format with commas
        if (num >= 1000) {
            return num.toLocaleString('en-US', {
                maximumFractionDigits: 0
            });
        }
        
        // For smaller numbers with decimals
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
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
        this.loadWallets();
        this.attachEventListeners();
    }
    
    renderWalletUI() {
        // First check if the wallets list is empty
        if (this.wallets.length === 0) {
            document.getElementById('walletNotLoadedInfo').style.display = 'block';
            document.getElementById('walletMainContent').style.display = 'none';
            return;
        }
        
        // If we have wallets, hide the empty state and show the wallet interface
        document.getElementById('walletNotLoadedInfo').style.display = 'none';
        document.getElementById('walletMainContent').style.display = 'block';
        
        // Update the wallet selector dropdown
        const walletSelector = document.getElementById('walletSelector');
        walletSelector.innerHTML = '<option value="">Select Wallet</option>';
        
        this.wallets.forEach(wallet => {
            const option = document.createElement('option');
            option.value = wallet.address;
            option.textContent = `${wallet.name} (${this.shortenAddress(wallet.address)})`;
            if (this.currentWallet && this.currentWallet.address === wallet.address) {
                option.selected = true;
            }
            walletSelector.appendChild(option);
        });
        
        // Update wallet balance and info if a wallet is selected
        if (this.currentWallet) {
            // Calculate USD value if not already provided
            const valueUSD = this.currentWallet.valueUSD || (this.currentWallet.balance * 150); // Default to $150 per coin
            
            // Update balance
            document.getElementById('walletBalance').textContent = `${this.currentWallet.balance} OPC`;
            document.getElementById('walletBalanceChange').textContent = `≈ $${valueUSD.toFixed(2)} USD`;
            
            // Update token list
            const tokensList = document.getElementById('tokensList');
            tokensList.innerHTML = `
                <div class="token-item">
                    <div class="token-name-container">
                        <div class="token-icon">
                            <img src="https://via.placeholder.com/40" alt="OpenChain" width="40" height="40">
                        </div>
                        <div>
                            <div class="token-name">OpenChain</div>
                            <div class="token-symbol">OPC</div>
                        </div>
                    </div>
                    <div class="token-price">
                        <div class="token-value">${this.currentWallet.balance} OPC</div>
                        <div class="token-amount">≈ $${valueUSD.toFixed(2)} USD</div>
                        <div class="token-change">+2.3%</div>
                    </div>
                </div>
            `;
            
            // Update tokens total value
            document.getElementById('tokensTotal').textContent = `$${valueUSD.toFixed(2)}`;
        }
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
        
        // Wallet selector
        document.getElementById('walletSelector').addEventListener('change', (e) => {
            const selected = e.target.value;
            if (selected) {
                this.selectWallet(selected);
            } else {
                this.currentWallet = null;
                this.renderWalletUI();
            }
        });
        
        // Send transaction
        document.getElementById('sendBtn')?.addEventListener('click', () => {
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
        
        document.getElementById('confirmSendTransaction')?.addEventListener('click', () => {
            const recipient = document.getElementById('recipientAddress').value.trim();
            const amount = parseFloat(document.getElementById('transactionAmount').value);
            const password = document.getElementById('walletPasswordForTx')?.value;
            
            if (recipient && amount > 0 && this.currentWallet) {
                this.sendTransaction(recipient, amount, password);
                bootstrap.Modal.getInstance(document.getElementById('sendTransactionModal')).hide();
            }
        });
        
        // Wallet action buttons
        document.getElementById('receiveBtn')?.addEventListener('click', () => {
            if (!this.currentWallet) return;
            
            // Create a modal to show the wallet address
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'receiveModal';
            modal.setAttribute('tabindex', '-1');
            
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Receive Funds</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>Share your wallet address to receive funds:</p>
                            <div class="input-group mb-3">
                                <input type="text" class="form-control" value="${this.currentWallet.address}" readonly>
                                <button class="btn btn-outline-secondary" type="button" id="copyAddressBtn">
                                    <i class="bi bi-clipboard"></i>
                                </button>
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
            const receiveModal = new bootstrap.Modal(document.getElementById('receiveModal'));
            receiveModal.show();
            
            // Add event listener to copy address button
            document.getElementById('copyAddressBtn')?.addEventListener('click', () => {
                const addressField = document.querySelector('#receiveModal input');
                addressField.select();
                document.execCommand('copy');
                
                // Change button to show copied
                const copyBtn = document.getElementById('copyAddressBtn');
                copyBtn.innerHTML = '<i class="bi bi-check"></i>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="bi bi-clipboard"></i>';
                }, 2000);
            });
            
            // Add event listener to remove modal from DOM when hidden
            document.getElementById('receiveModal').addEventListener('hidden.bs.modal', function () {
                document.body.removeChild(modal);
            });
        });
        
        // Mining button
        document.getElementById('stakeBtn')?.addEventListener('click', () => {
            if (!this.currentWallet) return;
            this.startMining();
        });
    }
    
    async loadWallets() {
        try {
            const response = await fetch(`${this.apiUrl}/wallets`);
            if (response.ok) {
                this.wallets = await response.json();
                this.renderWalletUI();
            } else {
                console.error('Failed to load wallets:', response.statusText);
            }
        } catch (error) {
            console.error('Error loading wallets:', error);
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
                this.renderWalletUI();
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
                this.renderWalletUI();
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
        
        this.renderWalletUI();
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
    
    // Add mining method for wallet
    async startMining() {
        if (!this.currentWallet) return;
        
        try {
            const response = await fetch(`${this.apiUrl}/mine`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    minerAddress: this.currentWallet.address
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                alert(`Mining successful! You received ${result.reward} coins as a reward.`);
                
                // Reload wallet data
                await this.loadWallets();
                if (this.currentWallet) {
                    this.selectWallet(this.currentWallet.address);
                }
            } else {
                const error = await response.json();
                console.error('Mining failed:', error);
                alert(`Mining failed: ${error.message || error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error during mining:', error);
            alert('Error during mining. Please try again.');
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
} 