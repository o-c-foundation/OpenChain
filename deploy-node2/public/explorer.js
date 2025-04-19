// WebSocket connection
const ws = new WebSocket('ws://localhost:3000');

// Chart configuration
let performanceChart;
const chartConfig = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'TPS',
            data: [],
            borderColor: '#4CAF50',
            tension: 0.4
        }, {
            label: 'Network Health',
            data: [],
            borderColor: '#2196F3',
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        animation: false,
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeChart();
    setupEventListeners();
    setupWebSocket();
});

// Initialize Chart.js
function initializeChart() {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    performanceChart = new Chart(ctx, chartConfig);
}

// Set up event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('data-section');
            showSection(section);
        });
    });

    // Simulation controls
    document.getElementById('startSimulation').addEventListener('click', startSimulation);
    document.getElementById('stopSimulation').addEventListener('click', stopSimulation);
    document.getElementById('generateTransaction').addEventListener('click', generateTransaction);

    // Configuration inputs
    document.getElementById('blockTimeInput').addEventListener('change', updateBlockTime);
    document.getElementById('latencyInput').addEventListener('change', updateNetworkLatency);
    document.getElementById('errorRateInput').addEventListener('change', updateErrorRate);

    // Search form
    document.getElementById('searchForm').addEventListener('submit', handleSearch);
}

// WebSocket setup and message handling
function setupWebSocket() {
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };

    ws.onopen = () => {
        console.log('Connected to blockchain network');
        updateSimulationStatus('Connected');
    };

    ws.onclose = () => {
        console.log('Disconnected from blockchain network');
        updateSimulationStatus('Disconnected');
        disableSimulationControls();
    };
}

// Handle incoming WebSocket messages
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'simulation:tick':
            updateMetrics(data.metrics);
            updateChart(data.metrics);
            break;
        case 'block:mined':
            addBlockToTable(data.block);
            addEventLog(`New block mined: ${data.block.height}`);
            break;
        case 'transaction:confirmed':
            updateTransactionStatus(data.transactionId, 'Confirmed');
            addEventLog(`Transaction confirmed: ${data.transactionId}`);
            break;
        case 'transaction:failed':
            updateTransactionStatus(data.transactionId, 'Failed');
            addEventLog(`Transaction failed: ${data.transactionId}`);
            break;
        case 'network:stats':
            updateNetworkStats(data.stats);
            break;
        case 'simulation:error':
            handleSimulationError(data.error);
            break;
    }
}

// UI update functions
function updateMetrics(metrics) {
    document.getElementById('tps').textContent = metrics.transactionsPerSecond.toFixed(2);
    document.getElementById('blockTime').textContent = `${(metrics.averageBlockTime / 1000).toFixed(1)}s`;
    document.getElementById('networkHealth').textContent = `${(metrics.networkHealth * 100).toFixed(0)}%`;
    document.getElementById('mempoolSize').textContent = metrics.mempoolSize;
}

function updateNetworkStats(stats) {
    document.getElementById('activeNodes').textContent = `${stats.activeNodes}/${stats.totalNodes}`;
    document.getElementById('networkLatency').textContent = `${stats.averageLatency}ms`;
}

function updateChart(metrics) {
    const timestamp = new Date().toLocaleTimeString();
    
    performanceChart.data.labels.push(timestamp);
    performanceChart.data.datasets[0].data.push(metrics.transactionsPerSecond);
    performanceChart.data.datasets[1].data.push(metrics.networkHealth);

    // Keep last 20 data points
    if (performanceChart.data.labels.length > 20) {
        performanceChart.data.labels.shift();
        performanceChart.data.datasets.forEach(dataset => dataset.data.shift());
    }

    performanceChart.update();
}

function addBlockToTable(block) {
    const table = document.getElementById('blocksTable').getElementsByTagName('tbody')[0];
    const row = table.insertRow(0);
    
    row.innerHTML = `
        <td>${block.height}</td>
        <td class="hash">${block.hash}</td>
        <td>${new Date(block.timestamp).toLocaleTimeString()}</td>
        <td>${block.transactions.length}</td>
        <td>${block.size} bytes</td>
    `;

    // Keep only last 10 blocks in the table
    if (table.rows.length > 10) {
        table.deleteRow(table.rows.length - 1);
    }
}

function updateTransactionStatus(txId, status) {
    const row = document.querySelector(`tr[data-tx-id="${txId}"]`);
    if (row) {
        const statusCell = row.querySelector('.tx-status');
        statusCell.textContent = status;
        statusCell.className = `tx-status status-${status.toLowerCase()}`;
    }
}

function addEventLog(message) {
    const log = document.getElementById('eventLog');
    const entry = document.createElement('div');
    entry.className = 'event-entry';
    entry.innerHTML = `
        <span class="event-time">${new Date().toLocaleTimeString()}</span>
        <span class="event-message">${message}</span>
    `;
    log.insertBefore(entry, log.firstChild);

    // Keep only last 50 events
    if (log.children.length > 50) {
        log.removeChild(log.lastChild);
    }
}

// Simulation control functions
function startSimulation() {
    ws.send(JSON.stringify({ type: 'simulation:start' }));
    updateSimulationStatus('Running');
    enableSimulationControls();
}

function stopSimulation() {
    ws.send(JSON.stringify({ type: 'simulation:stop' }));
    updateSimulationStatus('Stopped');
    disableSimulationControls();
}

function generateTransaction() {
    ws.send(JSON.stringify({ type: 'transaction:generate' }));
}

function updateBlockTime() {
    const value = document.getElementById('blockTimeInput').value;
    ws.send(JSON.stringify({
        type: 'config:update',
        key: 'blockTime',
        value: parseInt(value)
    }));
}

function updateNetworkLatency() {
    const value = document.getElementById('latencyInput').value;
    ws.send(JSON.stringify({
        type: 'config:update',
        key: 'networkLatency',
        value: parseInt(value)
    }));
}

function updateErrorRate() {
    const value = document.getElementById('errorRateInput').value;
    ws.send(JSON.stringify({
        type: 'config:update',
        key: 'errorRate',
        value: parseInt(value) / 100
    }));
}

// UI helper functions
function showSection(sectionId) {
    document.querySelectorAll('section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
}

function updateSimulationStatus(status) {
    document.querySelector('.simulation-status').textContent = `Status: ${status}`;
}

function enableSimulationControls() {
    document.getElementById('startSimulation').disabled = true;
    document.getElementById('stopSimulation').disabled = false;
    document.getElementById('generateTransaction').disabled = false;
}

function disableSimulationControls() {
    document.getElementById('startSimulation').disabled = false;
    document.getElementById('stopSimulation').disabled = true;
    document.getElementById('generateTransaction').disabled = true;
}

function handleSimulationError(error) {
    addEventLog(`Error: ${error.message}`);
    // You could add more error handling here
}

function handleSearch(e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value;
    ws.send(JSON.stringify({
        type: 'search',
        query: query
    }));
} 