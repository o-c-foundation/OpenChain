class NetworkVisualizer {
    constructor() {
        this.network = null;
        this.nodes = new vis.DataSet();
        this.edges = new vis.DataSet();
        this.simulationActive = false;
        this.currentScenario = null;
        this.wsConnection = null;
        
        this.initializeWebSocket();
        this.initializeNetwork();
        this.setupEventListeners();
        this.initializeScenarioDescriptions();
    }

    initializeWebSocket() {
        this.wsConnection = new WebSocket('ws://localhost:3000/simulation');
        
        this.wsConnection.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
    }

    initializeNetwork() {
        const container = document.getElementById('network-container');
        const options = {
            nodes: {
                shape: 'dot',
                size: 30,
                font: {
                    size: 14,
                    color: '#ffffff'
                },
                borderWidth: 2,
                shadow: true
            },
            edges: {
                width: 2,
                color: { color: '#848484', highlight: '#848484' },
                smooth: {
                    type: 'continuous'
                }
            },
            physics: {
                stabilization: false,
                barnesHut: {
                    gravitationalConstant: -80000,
                    springConstant: 0.001,
                    springLength: 200
                }
            }
        };

        this.network = new vis.Network(
            container,
            { nodes: this.nodes, edges: this.edges },
            options
        );
    }

    setupEventListeners() {
        document.getElementById('start-simulation').addEventListener('click', () => {
            this.startSimulation();
        });

        document.getElementById('reset-simulation').addEventListener('click', () => {
            this.resetSimulation();
        });

        document.getElementById('scenario-select').addEventListener('change', (e) => {
            this.updateScenarioDescription(e.target.value);
        });

        // Initialize first scenario description
        this.updateScenarioDescription('network_growth');
    }

    initializeScenarioDescriptions() {
        this.scenarioDescriptions = {
            network_growth: {
                title: "Network Growth Simulation",
                description: "Demonstrates how a blockchain network grows as new nodes join and establish connections.",
                concepts: [
                    "Peer discovery and connection",
                    "Network topology formation",
                    "Node synchronization"
                ]
            },
            network_partition: {
                title: "Network Partition Simulation",
                description: "Shows how the network handles temporary partitions and eventual reconciliation.",
                concepts: [
                    "Network splits and healing",
                    "Chain reorganization",
                    "Consensus challenges"
                ]
            },
            transaction_propagation: {
                title: "Transaction Propagation",
                description: "Visualizes how transactions spread through the network.",
                concepts: [
                    "Transaction broadcasting",
                    "Network latency effects",
                    "Mempool synchronization"
                ]
            },
            mining_competition: {
                title: "Mining Competition",
                description: "Demonstrates competing miners creating blocks simultaneously.",
                concepts: [
                    "Block creation",
                    "Mining rewards",
                    "Temporary forks"
                ]
            },
            chain_reorganization: {
                title: "Chain Reorganization",
                description: "Shows how the network handles competing chains and reaches consensus.",
                concepts: [
                    "Longest chain rule",
                    "Block validation",
                    "Fork resolution"
                ]
            }
        };
    }

    updateScenarioDescription(scenarioId) {
        const scenario = this.scenarioDescriptions[scenarioId];
        if (!scenario) return;

        const descriptionElement = document.getElementById('scenario-description');
        const conceptsElement = document.getElementById('concept-details');
        const learningPoints = document.getElementById('learning-points');

        descriptionElement.innerHTML = `
            <h4>${scenario.title}</h4>
            <p>${scenario.description}</p>
        `;

        conceptsElement.innerHTML = scenario.concepts
            .map(concept => `<div class="concept-item">${concept}</div>`)
            .join('');

        learningPoints.innerHTML = ''; // Will be populated during simulation
    }

    async startSimulation() {
        if (this.simulationActive) return;
        
        this.simulationActive = true;
        const scenarioSelect = document.getElementById('scenario-select');
        const selectedScenario = scenarioSelect.value;

        // Disable controls during simulation
        scenarioSelect.disabled = true;
        document.getElementById('start-simulation').disabled = true;

        // Send scenario start command to server
        this.wsConnection.send(JSON.stringify({
            type: 'start_scenario',
            scenario: selectedScenario
        }));
    }

    resetSimulation() {
        this.simulationActive = false;
        this.nodes.clear();
        this.edges.clear();
        
        // Reset controls
        document.getElementById('scenario-select').disabled = false;
        document.getElementById('start-simulation').disabled = false;
        document.getElementById('learning-points').innerHTML = '';
        
        // Reset statistics
        document.getElementById('total-nodes').textContent = '0';
        document.getElementById('active-connections').textContent = '0';
        document.getElementById('avg-latency').textContent = '0 ms';
        document.getElementById('network-health').textContent = 'Good';
        
        // Send reset command to server
        this.wsConnection.send(JSON.stringify({
            type: 'reset_simulation'
        }));
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'node_added':
                this.addNode(data.nodeId, data.status);
                this.updateStats(data.stats);
                this.addLearningPoint(data.educational);
                break;
            case 'connection_established':
                this.addEdge(data.from, data.to);
                this.updateStats(data.stats);
                break;
            case 'node_status_changed':
                this.updateNodeStatus(data.nodeId, data.status);
                this.updateStats(data.stats);
                break;
            case 'transaction_propagated':
                this.visualizeTransactionPropagation(data.from, data.to);
                this.addLearningPoint(data.educational);
                break;
            case 'block_mined':
                this.visualizeBlockMining(data.nodeId);
                this.addLearningPoint(data.educational);
                break;
            case 'simulation_complete':
                this.handleSimulationComplete(data);
                break;
        }
    }

    addNode(nodeId, status) {
        this.nodes.add({
            id: nodeId,
            label: nodeId,
            color: {
                background: status.isOnline ? '#4CAF50' : '#ff5722',
                border: '#2B7CE9'
            }
        });
    }

    addEdge(from, to) {
        this.edges.add({
            from: from,
            to: to,
            id: `${from}-${to}`
        });
    }

    updateNodeStatus(nodeId, status) {
        this.nodes.update({
            id: nodeId,
            color: {
                background: status.isOnline ? '#4CAF50' : '#ff5722'
            }
        });
    }

    visualizeTransactionPropagation(from, to) {
        // Highlight the path of transaction propagation
        const edge = this.edges.get(`${from}-${to}`);
        if (edge) {
            this.edges.update({
                ...edge,
                color: { color: '#FFA500' },
                width: 3
            });

            // Reset edge after animation
            setTimeout(() => {
                this.edges.update({
                    ...edge,
                    color: { color: '#848484' },
                    width: 2
                });
            }, 1000);
        }
    }

    visualizeBlockMining(nodeId) {
        const node = this.nodes.get(nodeId);
        if (node) {
            // Highlight the mining node
            this.nodes.update({
                ...node,
                color: {
                    background: '#FFD700',
                    border: '#FFA500'
                },
                size: 40
            });

            // Reset node after animation
            setTimeout(() => {
                this.nodes.update({
                    ...node,
                    color: {
                        background: '#4CAF50',
                        border: '#2B7CE9'
                    },
                    size: 30
                });
            }, 2000);
        }
    }

    updateStats(stats) {
        document.getElementById('total-nodes').textContent = stats.totalNodes;
        document.getElementById('active-connections').textContent = stats.totalConnections;
        document.getElementById('avg-latency').textContent = `${Math.round(stats.averageLatency)} ms`;
        
        const healthElement = document.getElementById('network-health');
        healthElement.textContent = stats.activeNodes === stats.totalNodes ? 'Good' : 'Degraded';
        healthElement.className = `badge badge-${stats.activeNodes === stats.totalNodes ? 'success' : 'warning'}`;
    }

    addLearningPoint(educational) {
        if (!educational) return;

        const learningPoints = document.getElementById('learning-points');
        const point = document.createElement('li');
        point.textContent = educational.message;
        point.className = 'learning-point';
        
        if (educational.details) {
            point.setAttribute('title', educational.details);
        }

        learningPoints.appendChild(point);
    }

    handleSimulationComplete(data) {
        this.simulationActive = false;
        document.getElementById('scenario-select').disabled = false;
        document.getElementById('start-simulation').disabled = false;
        
        // Add final learning points
        if (data.summary) {
            this.addLearningPoint({
                message: 'Simulation Complete: ' + data.summary,
                details: data.learningOutcome
            });
        }
    }
}

// Initialize the visualizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.networkVisualizer = new NetworkVisualizer();
}); 