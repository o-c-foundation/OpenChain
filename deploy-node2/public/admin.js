// WebSocket connection
const ws = new WebSocket('ws://localhost:3000');

// Chart configuration
let networkChart;
const chartConfig = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'TPS',
            data: [],
            borderColor: '#48bb78',
            tension: 0.4
        }, {
            label: 'Network Health',
            data: [],
            borderColor: '#4299e1',
            tension: 0.4
        }, {
            label: 'Active Nodes',
            data: [],
            borderColor: '#ecc94b',
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        animation: false,
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#4a5568'
                },
                ticks: {
                    color: '#e2e8f0'
                }
            },
            x: {
                grid: {
                    color: '#4a5568'
                },
                ticks: {
                    color: '#e2e8f0'
                }
            }
        },
        plugins: {
            legend: {
                labels: {
                    color: '#e2e8f0'
                }
            }
        }
    }
};

// Authentication state
let isAuthenticated = false;
const ADMIN_TOKEN_KEY = 'openchain_admin_token';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    setupEventListeners();
    initializeChart();
    setupWebSocket();
});

// Authentication functions
function checkAuthentication() {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
        verifyToken(token);
    }
}

function verifyToken(token) {
    // In a real application, verify with the server
    ws.send(JSON.stringify({
        type: 'admin:verify',
        token: token
    }));
}

function handleLogin(username, password) {
    // In a real application, authenticate with the server
    if (username === 'admin' && password === 'openchain') {
        const token = 'dummy_token'; // In real app, get from server
        localStorage.setItem(ADMIN_TOKEN_KEY, token);
        showAdminPanel();
    } else {
        addAdminLog('Authentication failed', 'error');
    }
}

function handleLogout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    hideAdminPanel();
}

function showAdminPanel() {
    isAuthenticated = true;
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('adminStatus').textContent = 'Authenticated';
    initializeNodeGrid();
}

function hideAdminPanel() {
    isAuthenticated = false;
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('adminContent').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('adminStatus').textContent = 'Not Authenticated';
}

// Event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        handleLogin(username, password);
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Simulation controls
    document.getElementById('startSimulation').addEventListener('click', startSimulation);
    document.getElementById('stopSimulation').addEventListener('click', stopSimulation);
    document.getElementById('resetSimulation').addEventListener('click', resetSimulation);

    // Configuration inputs
    document.getElementById('blockTimeInput').addEventListener('change', updateBlockTime);
    document.getElementById('latencyInput').addEventListener('change', updateNetworkLatency);
    document.getElementById('errorRateInput').addEventListener('change', updateErrorRate);
    document.getElementById('nodeCountInput').addEventListener('change', updateNodeCount);
}

// Chart initialization
function initializeChart() {
    const ctx = document.getElementById('networkChart').getContext('2d');
    networkChart = new Chart(ctx, chartConfig);
}

// WebSocket setup
function setupWebSocket() {
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };

    ws.onopen = () => {
        addAdminLog('Connected to blockchain network', 'info');
    };

    ws.onclose = () => {
        addAdminLog('Disconnected from blockchain network', 'error');
    };
}

// Message handling
function handleWebSocketMessage(data) {
    if (!isAuthenticated) return;

    switch (data.type) {
        case 'admin:verified':
            showAdminPanel();
            break;
        case 'simulation:tick':
            updateMetrics(data.metrics);
            updateChart(data.metrics);
            updateNodeStatus(data.nodes);
            break;
        case 'scenario:completed':
            handleScenarioComplete(data);
            break;
        case 'error':
            handleError(data.error);
            break;
    }
}

// UI updates
function updateMetrics(metrics) {
    document.getElementById('tps').textContent = metrics.transactionsPerSecond.toFixed(2);
    document.getElementById('blockTime').textContent = `${(metrics.averageBlockTime / 1000).toFixed(1)}s`;
    document.getElementById('networkHealth').textContent = `${(metrics.networkHealth * 100).toFixed(0)}%`;
    document.getElementById('mempoolSize').textContent = metrics.mempoolSize;
}

function updateChart(metrics) {
    const timestamp = new Date().toLocaleTimeString();
    
    networkChart.data.labels.push(timestamp);
    networkChart.data.datasets[0].data.push(metrics.transactionsPerSecond);
    networkChart.data.datasets[1].data.push(metrics.networkHealth);
    networkChart.data.datasets[2].data.push(metrics.activeNodes);

    if (networkChart.data.labels.length > 20) {
        networkChart.data.labels.shift();
        networkChart.data.datasets.forEach(dataset => dataset.data.shift());
    }

    networkChart.update();
}

// Node management
function initializeNodeGrid() {
    const nodeGrid = document.getElementById('nodeGrid');
    const nodeCount = document.getElementById('nodeCountInput').value;
    
    nodeGrid.innerHTML = '';
    for (let i = 0; i < nodeCount; i++) {
        const nodeItem = document.createElement('div');
        nodeItem.className = 'node-item';
        nodeItem.id = `node-${i}`;
        nodeItem.innerHTML = `
            <div class="node-status">
                <span class="status-indicator status-active"></span>
                <span>Node ${i + 1}</span>
            </div>
            <div class="node-metrics">
                <small>Blocks: 0</small>
                <small>Peers: 0</small>
            </div>
        `;
        nodeGrid.appendChild(nodeItem);
    }
}

function updateNodeStatus(nodes) {
    nodes.forEach((node, index) => {
        const nodeElement = document.getElementById(`node-${index}`);
        if (nodeElement) {
            const indicator = nodeElement.querySelector('.status-indicator');
            indicator.className = `status-indicator status-${node.status}`;
            
            const metrics = nodeElement.querySelector('.node-metrics');
            metrics.innerHTML = `
                <small>Blocks: ${node.blocks}</small>
                <small>Peers: ${node.peers}</small>
            `;
        }
    });
}

// Scenario management
function triggerScenario(type) {
    if (!isAuthenticated) return;

    let config = {};
    switch (type) {
        case 'partition':
            config = { duration: 30000 }; // 30 seconds
            break;
        case 'nodeFail':
            config = {
                nodeCount: document.getElementById('failureNodes').value,
                duration: 15000 // 15 seconds
            };
            break;
        case 'byzantine':
            config = {
                nodeCount: 1,
                behavior: 'invalid_blocks'
            };
            break;
    }

    ws.send(JSON.stringify({
        type: 'scenario:trigger',
        scenario: type,
        config: config
    }));

    addAdminLog(`Triggered ${type} scenario`, 'info');
}

function handleScenarioComplete(data) {
    addAdminLog(`Scenario ${data.scenario} completed: ${data.result}`, 'info');
}

// Simulation controls
function startSimulation() {
    if (!isAuthenticated) return;
    ws.send(JSON.stringify({ type: 'simulation:start' }));
    document.getElementById('startSimulation').disabled = true;
    document.getElementById('stopSimulation').disabled = false;
}

function stopSimulation() {
    if (!isAuthenticated) return;
    ws.send(JSON.stringify({ type: 'simulation:stop' }));
    document.getElementById('startSimulation').disabled = false;
    document.getElementById('stopSimulation').disabled = true;
}

function resetSimulation() {
    if (!isAuthenticated) return;
    ws.send(JSON.stringify({ type: 'simulation:reset' }));
    addAdminLog('Simulation reset', 'info');
}

// Configuration updates
function updateBlockTime() {
    if (!isAuthenticated) return;
    const value = document.getElementById('blockTimeInput').value;
    ws.send(JSON.stringify({
        type: 'config:update',
        key: 'blockTime',
        value: parseInt(value)
    }));
}

function updateNetworkLatency() {
    if (!isAuthenticated) return;
    const value = document.getElementById('latencyInput').value;
    ws.send(JSON.stringify({
        type: 'config:update',
        key: 'networkLatency',
        value: parseInt(value)
    }));
}

function updateErrorRate() {
    if (!isAuthenticated) return;
    const value = document.getElementById('errorRateInput').value;
    ws.send(JSON.stringify({
        type: 'config:update',
        key: 'errorRate',
        value: parseInt(value) / 100
    }));
}

function updateNodeCount() {
    if (!isAuthenticated) return;
    const value = document.getElementById('nodeCountInput').value;
    ws.send(JSON.stringify({
        type: 'config:update',
        key: 'nodeCount',
        value: parseInt(value)
    }));
    initializeNodeGrid();
}

// Logging
function addAdminLog(message, type = 'info') {
    const log = document.getElementById('adminEventLog');
    const entry = document.createElement('div');
    entry.className = 'event-entry';
    entry.innerHTML = `
        <span class="event-time">${new Date().toLocaleTimeString()}</span>
        <span class="event-type ${type}">${type}</span>
        <span class="event-message">${message}</span>
    `;
    log.insertBefore(entry, log.firstChild);

    if (log.children.length > 50) {
        log.removeChild(log.lastChild);
    }
}

// Error handling
function handleError(error) {
    addAdminLog(error.message, 'error');
} 