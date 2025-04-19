class Explorer {
    constructor() {
        this.currentPage = 'blocks';
        this.currentPageNumber = 1;
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
        const response = await fetch(`/api/transactions?page=${this.currentPageNumber}`);
        const data = await response.json();

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
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.transactions.forEach(tx => {
            html += `
                <tr>
                    <td class="hash">${tx.id}</td>
                    <td class="address">${tx.from}</td>
                    <td class="address">${tx.to}</td>
                    <td>${tx.amount} OpenT</td>
                    <td><span class="badge bg-success">${tx.status}</span></td>
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
                <li class="page-item ${i === this.currentPageNumber ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="explorer.changePage(${i})">${i}</a>
                </li>
            `;
        }

        // Next button
        html += `
            <li class="page-item ${this.currentPageNumber === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="explorer.changePage(${this.currentPageNumber + 1})">Next</a>
            </li>
        `;

        html += '</ul></nav>';
        return html;
    }

    changePage(page) {
        this.currentPageNumber = page;
        this.loadPage(this.currentPage);
    }

    async search(query) {
        const response = await fetch(`/api/search?q=${query}`);
        const result = await response.json();

        if (result.error) {
            alert(result.error);
            return;
        }

        let html = '<div class="card"><div class="card-body">';
        
        switch (result.type) {
            case 'block':
                html += this.renderBlock(result.data);
                break;
            case 'transaction':
                html += this.renderTransaction(result.data);
                break;
            case 'address':
                html += this.renderAddress(result.data);
                break;
            case 'contract':
                html += this.renderContract(result.data);
                break;
        }

        html += '</div></div>';
        document.getElementById('content').innerHTML = html;
    }

    renderBlock(block) {
        return `
            <h3>Block ${block.number}</h3>
            <p><strong>Hash:</strong> <span class="hash">${block.hash}</span></p>
            <p><strong>Previous Hash:</strong> <span class="hash">${block.previousHash}</span></p>
            <p><strong>Timestamp:</strong> ${new Date(block.timestamp).toLocaleString()}</p>
            <p><strong>Transactions:</strong> ${block.transactions.length}</p>
        `;
    }

    renderTransaction(tx) {
        return `
            <h3>Transaction</h3>
            <p><strong>Hash:</strong> <span class="hash">${tx.id}</span></p>
            <p><strong>From:</strong> <span class="address">${tx.from}</span></p>
            <p><strong>To:</strong> <span class="address">${tx.to}</span></p>
            <p><strong>Amount:</strong> ${tx.amount} OpenT</p>
            <p><strong>Status:</strong> <span class="badge bg-success">${tx.status}</span></p>
        `;
    }

    renderAddress(address) {
        return `
            <h3>Address ${address.address}</h3>
            <p><strong>Balance:</strong> ${address.balance} OpenT</p>
            <p><strong>Transaction Count:</strong> ${address.transactionCount}</p>
        `;
    }

    renderContract(contract) {
        return `
            <h3>Contract ${contract.address}</h3>
            <p><strong>Owner:</strong> <span class="address">${contract.owner}</span></p>
            <p><strong>Balance:</strong> ${contract.balance} OpenT</p>
            <p><strong>State:</strong></p>
            <pre>${JSON.stringify(contract.state, null, 2)}</pre>
        `;
    }

    async viewContract(address) {
        const response = await fetch(`/api/contracts/${address}`);
        const contract = await response.json();
        
        let html = `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">Contract Details</h5>
                </div>
                <div class="card-body">
                    ${this.renderContract(contract)}
                </div>
            </div>
            <button class="btn btn-secondary mt-3" onclick="explorer.loadPage('contracts')">
                Back to Contracts
            </button>
        `;

        document.getElementById('content').innerHTML = html;
    }
}

// Initialize explorer
const explorer = new Explorer(); 