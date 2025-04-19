import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { Block } from '../block';
import { Transaction } from '../transaction';
import { Blockchain } from '../blockchain';

export interface Peer {
    id: string;
    address: string;
    port: number;
    ws: WebSocket;
    lastSeen: number;
    height: number;
}

export class PeerManager extends EventEmitter {
    private peers: Map<string, Peer>;
    private blockchain: Blockchain;
    private server: WebSocket.Server;
    private readonly maxPeers: number;
    private readonly peerTimeout: number;

    constructor(blockchain: Blockchain, port: number, maxPeers: number = 50) {
        super();
        this.blockchain = blockchain;
        this.peers = new Map();
        this.maxPeers = maxPeers;
        this.peerTimeout = 30000; // 30 seconds

        this.server = new WebSocket.Server({ port });
        this.setupServer();
        this.startPeerDiscovery();
    }

    private setupServer(): void {
        this.server.on('connection', (ws: WebSocket, req) => {
            const peerId = req.headers['x-peer-id'] as string;
            const address = req.socket.remoteAddress || 'unknown';
            const port = req.socket.remotePort || 0;

            if (this.peers.size >= this.maxPeers) {
                ws.close(1000, 'Too many peers');
                return;
            }

            const peer: Peer = {
                id: peerId,
                address,
                port,
                ws,
                lastSeen: Date.now(),
                height: 0
            };

            this.addPeer(peer);
            this.setupPeerConnection(peer);
        });
    }

    private setupPeerConnection(peer: Peer): void {
        peer.ws.on('message', (data: string) => {
            try {
                const message = JSON.parse(data);
                this.handleMessage(peer, message);
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        peer.ws.on('close', () => {
            this.removePeer(peer.id);
        });

        peer.ws.on('error', (error) => {
            console.error('Peer connection error:', error);
            this.removePeer(peer.id);
        });
    }

    private handleMessage(peer: Peer, message: any): void {
        switch (message.type) {
            case 'HELLO':
                this.handleHello(peer, message);
                break;
            case 'PEERS':
                this.handlePeers(peer, message);
                break;
            case 'BLOCK':
                this.handleBlock(peer, message);
                break;
            case 'TRANSACTION':
                this.handleTransaction(peer, message);
                break;
            case 'GET_BLOCKS':
                this.handleGetBlocks(peer, message);
                break;
            case 'GET_TRANSACTIONS':
                this.handleGetTransactions(peer, message);
                break;
        }
    }

    private handleHello(peer: Peer, message: any): void {
        peer.height = message.height;
        this.sendPeers(peer);
    }

    private handlePeers(peer: Peer, message: any): void {
        message.peers.forEach((p: any) => {
            if (!this.peers.has(p.id) && this.peers.size < this.maxPeers) {
                this.connectToPeer(p.address, p.port);
            }
        });
    }

    private handleBlock(peer: Peer, message: any): void {
        const block = Block.fromJSON(message.block);
        this.emit('block', block);
    }

    private handleTransaction(peer: Peer, message: any): void {
        const transaction = Transaction.fromJSON(message.transaction);
        this.emit('transaction', transaction);
    }

    private handleGetBlocks(peer: Peer, message: any): void {
        const { start, end } = message;
        const blocks = this.blockchain.getBlocks(start, end);
        this.sendBlocks(peer, blocks);
    }

    private handleGetTransactions(peer: Peer, message: any): void {
        const { blockHash } = message;
        const transactions = this.blockchain.getBlockTransactions(blockHash);
        this.sendTransactions(peer, transactions);
    }

    public connectToPeer(address: string, port: number): void {
        const ws = new WebSocket(`ws://${address}:${port}`);
        const peerId = Math.random().toString(36).substring(2);

        ws.on('open', () => {
            const peer: Peer = {
                id: peerId,
                address,
                port,
                ws,
                lastSeen: Date.now(),
                height: 0
            };

            this.addPeer(peer);
            this.setupPeerConnection(peer);
            this.sendHello(peer);
        });

        ws.on('error', (error) => {
            console.error('Error connecting to peer:', error);
        });
    }

    private sendHello(peer: Peer): void {
        peer.ws.send(JSON.stringify({
            type: 'HELLO',
            height: this.blockchain.getHeight(),
            version: '1.0.0'
        }));
    }

    private sendPeers(peer: Peer): void {
        const peers = Array.from(this.peers.values())
            .filter(p => p.id !== peer.id)
            .map(p => ({
                id: p.id,
                address: p.address,
                port: p.port
            }));

        peer.ws.send(JSON.stringify({
            type: 'PEERS',
            peers
        }));
    }

    public broadcastBlock(block: Block): void {
        const message = JSON.stringify({
            type: 'BLOCK',
            block: block.toJSON()
        });

        this.peers.forEach(peer => {
            if (peer.height < block.index) {
                peer.ws.send(message);
            }
        });
    }

    public broadcastTransaction(transaction: Transaction): void {
        const message = JSON.stringify({
            type: 'TRANSACTION',
            transaction: transaction.toJSON()
        });

        this.peers.forEach(peer => {
            peer.ws.send(message);
        });
    }

    private sendBlocks(peer: Peer, blocks: Block[]): void {
        peer.ws.send(JSON.stringify({
            type: 'BLOCKS',
            blocks: blocks.map(b => b.toJSON())
        }));
    }

    private sendTransactions(peer: Peer, transactions: Transaction[]): void {
        peer.ws.send(JSON.stringify({
            type: 'TRANSACTIONS',
            transactions: transactions.map(tx => tx.toJSON())
        }));
    }

    private addPeer(peer: Peer): void {
        this.peers.set(peer.id, peer);
        this.emit('peer:added', peer);
    }

    private removePeer(peerId: string): void {
        const peer = this.peers.get(peerId);
        if (peer) {
            this.peers.delete(peerId);
            this.emit('peer:removed', peer);
        }
    }

    private startPeerDiscovery(): void {
        setInterval(() => {
            this.cleanupPeers();
            this.discoverPeers();
        }, 30000);
    }

    private cleanupPeers(): void {
        const now = Date.now();
        this.peers.forEach(peer => {
            if (now - peer.lastSeen > this.peerTimeout) {
                this.removePeer(peer.id);
            }
        });
    }

    private discoverPeers(): void {
        // In a real implementation, this would use a DHT or other discovery mechanism
        // For simulation, we'll use a simple approach
        this.peers.forEach(peer => {
            this.sendPeers(peer);
        });
    }

    public getPeers(): Peer[] {
        return Array.from(this.peers.values());
    }

    public getPeerCount(): number {
        return this.peers.size;
    }
} 