// Performance chart configuration
const performanceChart = new Chart(
    document.getElementById('performance-chart'),
    {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Block Processing Time (ms)',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                },
                {
                    label: 'Transaction Processing Time (ms)',
                    data: [],
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                },
                {
                    label: 'Contract Execution Time (ms)',
                    data: [],
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    }
);

// Resource usage chart configuration
const resourceChart = new Chart(
    document.getElementById('resource-chart'),
    {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Memory Usage (MB)',
                    data: [],
                    borderColor: 'rgb(255, 159, 64)',
                    tension: 0.1
                },
                {
                    label: 'CPU Usage (%)',
                    data: [],
                    borderColor: 'rgb(153, 102, 255)',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    }
);

// Function to update metrics
function updateMetrics(data) {
    // Update health status
    const healthStatus = document.getElementById('health-status');
    healthStatus.className = `status-indicator ${data.healthStatus}`;
    healthStatus.querySelector('.status-text').textContent = data.healthStatus;

    // Update metric values
    document.getElementById('blocks-processed').textContent = data.blocksProcessed;
    document.getElementById('transactions-processed').textContent = data.transactionsProcessed;
    document.getElementById('contracts-executed').textContent = data.contractsExecuted;

    // Update performance chart
    const timestamp = new Date().toLocaleTimeString();
    performanceChart.data.labels.push(timestamp);
    performanceChart.data.datasets[0].data.push(data.blockProcessingTime);
    performanceChart.data.datasets[1].data.push(data.transactionProcessingTime);
    performanceChart.data.datasets[2].data.push(data.contractExecutionTime);
    performanceChart.update();

    // Update resource chart
    resourceChart.data.labels.push(timestamp);
    resourceChart.data.datasets[0].data.push(data.memoryUsage);
    resourceChart.data.datasets[1].data.push(data.cpuUsage);
    resourceChart.update();

    // Update alerts
    updateAlerts(data.alerts);
}

// Function to update alerts
function updateAlerts(alerts) {
    const alertsContainer = document.getElementById('alerts-list');
    alertsContainer.innerHTML = '';

    alerts.forEach(alert => {
        const alertElement = document.createElement('div');
        alertElement.className = `alert ${alert.severity}`;
        alertElement.innerHTML = `
            <span class="alert-timestamp">${new Date(alert.timestamp).toLocaleString()}</span>
            <span class="alert-message">${alert.message}</span>
        `;
        alertsContainer.appendChild(alertElement);
    });
}

// WebSocket connection for real-time updates
const ws = new WebSocket(`ws://${window.location.host}/ws/dashboard`);

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateMetrics(data);
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

ws.onclose = () => {
    console.log('WebSocket connection closed');
};

// Initial data fetch
fetch('/api/monitoring/metrics')
    .then(response => response.json())
    .then(data => updateMetrics(data))
    .catch(error => console.error('Error fetching metrics:', error)); 