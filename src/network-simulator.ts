import { EventEmitter } from 'events';
import { Block } from './block';
import { Transaction } from './transaction';
import { Blockchain } from './blockchain';

interface NetworkNode {
    id: string;
    blockchain: Blockchain;
    peers: Set<string>;
    latency: number;
    bandwidth: number;
    isOnline: boolean;
}

interface NetworkStats {
    totalNodes: number;
    activeNodes: number;
    totalConnections: number;
    averageLatency: number;
    networkHashrate: number;
}

export class NetworkSimulator extends EventEmitter {
    private nodes: Map<string, NetworkNode>;
    private simulatedLatency: boolean;
    private educational: boolean;
    private tooltips: Map<string, string>;

    constructor(simulatedLatency: boolean = true, educational: boolean = true) {
        super();
        this.nodes = new Map();
        this.simulatedLatency = simulatedLatency;
        this.educational = educational;
        this.initializeTooltips();
    }

    private initializeTooltips(): void {
        this.tooltips = new Map([
            ['block_propagation', 'When a new block is mined, it needs to be shared with all other nodes in the network. This process is called block propagation.'],
            ['network_latency', 'Network latency is the time it takes for data to travel from one node to another. Higher latency can lead to temporary chain splits.'],
            ['peer_discovery', 'Nodes discover each other through a P2P network. Each node maintains a list of peers it can connect to.'],
            ['consensus', 'Nodes must agree on the current state of the blockchain. This agreement is reached through consensus mechanisms like Proof of Work.']
        ]);
    }

    public addNode(nodeId: string, blockchain: Blockchain): void {
        const node: NetworkNode = {
            id: nodeId,
            blockchain,
            peers: new Set(),
            latency: Math.random() * 100 + 50, // Random latency between 50-150ms
            bandwidth: Math.random() * 1000 + 1000, // Random bandwidth between 1-2 Mbps
            isOnline: true
        };

        this.nodes.set(nodeId, node);
        
        if (this.educational) {
            this.emit('educational', {
                type: 'node_added',
                message: `New node ${nodeId} joined the network. In a real blockchain, nodes can join or leave at any time.`,
                details: this.tooltips.get('peer_discovery')
            });
        }

        // Connect to some existing nodes
        this.setupPeerConnections(nodeId);
    }

    private setupPeerConnections(nodeId: string): void {
        const node = this.nodes.get(nodeId);
        if (!node) return;

        // Connect to up to 8 random peers
        const availablePeers = Array.from(this.nodes.keys()).filter(id => id !== nodeId);
        const numPeers = Math.min(8, availablePeers.length);
        
        for (let i = 0; i < numPeers; i++) {
            const randomPeer = availablePeers[Math.floor(Math.random() * availablePeers.length)];
            this.connectNodes(nodeId, randomPeer);
            availablePeers.splice(availablePeers.indexOf(randomPeer), 1);
        }
    }

    public connectNodes(nodeId1: string, nodeId2: string): void {
        const node1 = this.nodes.get(nodeId1);
        const node2 = this.nodes.get(nodeId2);

        if (!node1 || !node2) return;

        node1.peers.add(nodeId2);
        node2.peers.add(nodeId1);

        if (this.educational) {
            this.emit('educational', {
                type: 'peer_connection',
                message: `Node ${nodeId1} connected to ${nodeId2}. Peers exchange blockchain data to stay synchronized.`,
                details: this.tooltips.get('peer_discovery')
            });
        }
    }

    public async broadcastBlock(sourceNodeId: string, block: Block): Promise<void> {
        const sourceNode = this.nodes.get(sourceNodeId);
        if (!sourceNode) return;

        if (this.educational) {
            this.emit('educational', {
                type: 'block_broadcast',
                message: `Node ${sourceNodeId} is broadcasting a new block to its peers.`,
                details: this.tooltips.get('block_propagation')
            });
        }

        // Simulate network propagation
        for (const peerId of sourceNode.peers) {
            const peer = this.nodes.get(peerId);
            if (!peer || !peer.isOnline) continue;

            if (this.simulatedLatency) {
                const delay = this.calculatePropagationDelay(sourceNode, peer, block);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            try {
                peer.blockchain.addBlock(block);
                this.emit('block:propagated', {
                    from: sourceNodeId,
                    to: peerId,
                    block: block
                });
            } catch (error) {
                this.emit('block:rejected', {
                    nodeId: peerId,
                    block: block,
                    reason: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    }

    public async broadcastTransaction(sourceNodeId: string, transaction: Transaction): Promise<void> {
        const sourceNode = this.nodes.get(sourceNodeId);
        if (!sourceNode) return;

        for (const peerId of sourceNode.peers) {
            const peer = this.nodes.get(peerId);
            if (!peer || !peer.isOnline) continue;

            if (this.simulatedLatency) {
                const delay = Math.random() * peer.latency;
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            try {
                peer.blockchain.addTransaction(transaction);
                this.emit('transaction:propagated', {
                    from: sourceNodeId,
                    to: peerId,
                    transaction: transaction
                });
            } catch (error) {
                this.emit('transaction:rejected', {
                    nodeId: peerId,
                    transaction: transaction,
                    reason: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    }

    private calculatePropagationDelay(source: NetworkNode, target: NetworkNode, block: Block): number {
        const blockSize = block.size; // Size in bytes
        const bandwidth = Math.min(source.bandwidth, target.bandwidth); // Bandwidth in bytes/s
        const transferTime = (blockSize / bandwidth) * 1000; // Convert to milliseconds
        const networkLatency = (source.latency + target.latency) / 2;
        
        return transferTime + networkLatency;
    }

    public simulateNetworkPartition(nodeIds: string[]): void {
        for (const nodeId of nodeIds) {
            const node = this.nodes.get(nodeId);
            if (node) {
                node.isOnline = false;
            }
        }

        if (this.educational) {
            this.emit('educational', {
                type: 'network_partition',
                message: 'A network partition has occurred. Some nodes are temporarily disconnected from the network.',
                details: 'Network partitions can lead to temporary chain splits, which are resolved when connectivity is restored.'
            });
        }
    }

    public healNetworkPartition(nodeIds: string[]): void {
        for (const nodeId of nodeIds) {
            const node = this.nodes.get(nodeId);
            if (node) {
                node.isOnline = true;
            }
        }

        if (this.educational) {
            this.emit('educational', {
                type: 'partition_healed',
                message: 'The network partition has been healed. Nodes are reconnecting and synchronizing their chains.',
                details: 'The longest valid chain will be adopted by all nodes, ensuring network consensus.'
            });
        }
    }

    public getNetworkStats(): NetworkStats {
        let totalConnections = 0;
        let totalLatency = 0;
        let activeNodes = 0;
        let totalHashrate = 0;

        this.nodes.forEach(node => {
            if (node.isOnline) {
                activeNodes++;
                totalConnections += node.peers.size;
                totalLatency += node.latency;
                // Simulate hashrate based on recent blocks
                totalHashrate += Math.random() * 1000 + 500; // Simplified hashrate calculation
            }
        });

        return {
            totalNodes: this.nodes.size,
            activeNodes,
            totalConnections: totalConnections / 2, // Divide by 2 as each connection is counted twice
            averageLatency: totalLatency / activeNodes,
            networkHashrate: totalHashrate
        };
    }

    public getEducationalContent(topic: string): string | undefined {
        return this.tooltips.get(topic);
    }
} 