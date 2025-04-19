class Explorer {
    constructor() {
        this.currentPage = 'blocks';
        this.currentPageNumber = 1;
        this.refreshInterval = null;
        this.setupEventListeners();
        this.loadPage('blocks');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                this.loadPage(page);
            });
        });

        // Search
        document.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            const query = document.getElementById('searchInput').value;
            this.search(query);
        });
    }

    async loadPage(page) {
        // Clear any existing refresh interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        this.currentPage = page;
        const content = document.getElementById('content');
        content.innerHTML = '<div class="loading">Loading...</div>';

        try {
            let html = '';
            switch (page) {
                case 'blocks':
                    html = await this.loadBlocks();
                    break;
                case 'transactions':
                    html = await this.loadTransactions();
                    // Set up auto-refresh for transactions page
                    this.refreshInterval = setInterval(() => this.refreshTransactions(), 5000);
                    break;
                case 'contracts':
                    html = await this.loadContracts();
                    break;
                case 'network':
                    html = await this.loadNetwork();
                    break;
            }
            content.innerHTML = html;
        } catch (error) {
            content.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        }
    }

    async loadBlocks() {
        const response = await fetch(`/api/blocks?page=${this.currentPageNumber}`);
        const data = await response.json();

        let html = `
            <h2>Latest Blocks</h2>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Block</th>
                            <th>Hash</th>
                            <th>Transactions</th>
                            <th>Validator</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.blocks.forEach(block => {
            html += `
                <tr>
                    <td>${block.number}</td>
                    <td class="hash">${block.hash}</td>
                    <td>${block.transactions.length}</td>
                    <td class="address">${block.validator || 'N/A'}</td>
                    <td>${new Date(block.timestamp).toLocaleString()}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
            ${this.createPagination(data.totalPages)}
        `;

        return html;
    }

    async loadTransactions() {
        // Load both confirmed and pending transactions
        const [confirmedResponse, pendingResponse] = await Promise.all([
            fetch(`/api/transactions?page=${this.currentPageNumber}`),
            fetch('/api/transactions/pending')
        ]);
        
        const confirmedData = await confirmedResponse.json();
        const pendingData = await pendingResponse.json();

        // Combine confirmed and pending transactions
        const allTransactions = [
            ...pendingData.transactions.map(tx => ({ ...tx, status: 'pending' })),
            ...confirmedData.transactions.map(tx => ({ ...tx, status: 'confirmed' }))
        ];

        let html = `
            <h2>Latest Transactions</h2>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Hash</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody id="transactionTableBody">
        `;

        allTransactions.forEach(tx => {
            html += this.renderTransactionRow(tx);
        });

        html += `
                    </tbody>
                </table>
            </div>
            ${this.createPagination(confirmedData.totalPages)}
        `;

        return html;
    }

    renderTransactionRow(tx) {
        const statusClass = tx.status === 'pending' ? 'bg-warning' : 'bg-success';
        return `
            <tr>
                <td class="hash">${tx.id}</td>
                <td class="address">${tx.from}</td>
                <td class="address">${tx.to}</td>
                <td>${tx.amount} OpenT</td>
                <td><span class="badge ${statusClass}">${tx.status}</span></td>
                <td>${new Date(tx.timestamp).toLocaleString()}</td>
            </tr>
        `;
    }

    async refreshTransactions() {
        if (this.currentPage !== 'transactions') return;

        try {
            const [confirmedResponse, pendingResponse] = await Promise.all([
                fetch(`/api/transactions?page=${this.currentPageNumber}`),
                fetch('/api/transactions/pending')
            ]);
            
            const confirmedData = await confirmedResponse.json();
            const pendingData = await pendingResponse.json();

            const allTransactions = [
                ...pendingData.transactions.map(tx => ({ ...tx, status: 'pending' })),
                ...confirmedData.transactions.map(tx => ({ ...tx, status: 'confirmed' }))
            ];

            const tbody = document.getElementById('transactionTableBody');
            if (tbody) {
                tbody.innerHTML = allTransactions.map(tx => this.renderTransactionRow(tx)).join('');
            }
        } catch (error) {
            console.error('Error refreshing transactions:', error);
        }
    }

    async loadContracts() {
        const response = await fetch('/api/contracts');
        const contracts = await response.json();

        let html = `
            <h2>Smart Contracts</h2>
            <div class="row">
        `;

        contracts.forEach(contract => {
            html += `
                <div class="col-md-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Contract ${contract.address}</h5>
                        </div>
                        <div class="card-body">
                            <p><strong>Owner:</strong> <span class="address">${contract.owner}</span></p>
                            <p><strong>Balance:</strong> ${contract.balance} OpenT</p>
                            <button class="btn btn-primary btn-sm" onclick="explorer.viewContract('${contract.address}')">
                                View Details
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        return html;
    }

    async loadNetwork() {
        const [statsResponse, validatorsResponse] = await Promise.all([
            fetch('/api/network/stats'),
            fetch('/api/network/validators')
        ]);

        const stats = await statsResponse.json();
        const validators = await validatorsResponse.json();

        let html = `
            <h2>Network Status</h2>
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Network Statistics</h5>
                        </div>
                        <div class="card-body">
                            <p><strong>Blocks:</strong> ${stats.blockCount}</p>
                            <p><strong>Transactions:</strong> ${stats.transactionCount}</p>
                            <p><strong>Contracts:</strong> ${stats.contractCount}</p>
                            <p><strong>Average Block Time:</strong> ${stats.averageBlockTime.toFixed(2)}s</p>
                            <p><strong>Network Hashrate:</strong> ${(stats.networkHashrate / 1000).toFixed(2)} KH/s</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Validators</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Address</th>
                                            <th>Stake</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
        `;

        validators.forEach(validator => {
            html += `
                <tr>
                    <td class="address">${validator.address}</td>
                    <td>${validator.stake} OpenT</td>
                    <td>
                        <span class="validator-status ${validator.isActive ? 'active' : 'inactive'}"></span>
                        ${validator.isActive ? 'Active' : 'Inactive'}
                    </td>
                </tr>
            `;
        });

        html += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return html;
    }

    createPagination(totalPages) {
        let html = '<nav><ul class="pagination justify-content-center">';
        
        // Previous button
        html += `
            <li class="page-item ${this.currentPageNumber === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="explorer.changePage(${this.currentPageNumber - 1})">Previous</a>
            </li>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            html += `