import { Block } from '../block';
import { Blockchain } from '../blockchain';
import { PeerManager } from '../network/peer-manager';
import { StateManager } from '../state/state-manager';

export class SyncManager {
    private blockchain: Blockchain;
    private peerManager: PeerManager;
    private stateManager: StateManager;
    private isSyncing: boolean;
    private syncHeight: number;
    private syncStartTime: number;

    constructor(
        blockchain: Blockchain,
        peerManager: PeerManager,
        stateManager: StateManager
    ) {
        this.blockchain = blockchain;
        this.peerManager = peerManager;
        this.stateManager = stateManager;
        this.isSyncing = false;
        this.syncHeight = 0;
        this.syncStartTime = 0;
    }

    public async startSync(): Promise<void> {
        if (this.isSyncing) {
            return;
        }

        this.isSyncing = true;
        this.syncStartTime = Date.now();
        this.syncHeight = this.blockchain.getHeight();

        try {
            await this.syncWithPeers();
        } catch (error) {
            console.error('Sync error:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    private async syncWithPeers(): Promise<void> {
        const peers = this.peerManager.getPeers();
        if (peers.length === 0) {
            return;
        }

        // Find the highest peer
        const highestPeer = peers.reduce((highest, peer) => {
            return peer.height > highest.height ? peer : highest;
        }, peers[0]);

        if (highestPeer.height <= this.syncHeight) {
            return;
        }

        // Request blocks in batches
        const batchSize = 100;
        for (let i = this.syncHeight + 1; i <= highestPeer.height; i += batchSize) {
            const end = Math.min(i + batchSize - 1, highestPeer.height);
            await this.syncBlocks(i, end);
        }
    }

    private async syncBlocks(start: number, end: number): Promise<void> {
        const peers = this.peerManager.getPeers();
        if (peers.length === 0) {
            return;
        }

        // Request blocks from multiple peers
        const blockPromises = peers.map(peer => 
            this.requestBlocks(peer, start, end)
        );

        try {
            const results = await Promise.allSettled(blockPromises);
            const validBlocks = this.validateBlocksFromPeers(results);

            if (validBlocks.length > 0) {
                await this.processBlocks(validBlocks);
            }
        } catch (error) {
            console.error('Error syncing blocks:', error);
        }
    }

    private async requestBlocks(peer: any, start: number, end: number): Promise<Block[]> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Request timeout'));
            }, 10000);

            peer.ws.send(JSON.stringify({
                type: 'GET_BLOCKS',
                start,
                end
            }));

            const handler = (data: string) => {
                try {
                    const message = JSON.parse(data);
                    if (message.type === 'BLOCKS') {
                        clearTimeout(timeout);
                        peer.ws.removeListener('message', handler);
                        resolve(message.blocks.map((b: any) => Block.fromJSON(b)));
                    }
                } catch (error) {
                    clearTimeout(timeout);
                    peer.ws.removeListener('message', handler);
                    reject(error);
                }
            };

            peer.ws.on('message', handler);
        });
    }

    private validateBlocksFromPeers(results: PromiseSettledResult<Block[]>[]): Block[] {
        const validBlocks: Block[] = [];
        const blockHashes = new Set<string>();

        for (const result of results) {
            if (result.status === 'fulfilled') {
                for (const block of result.value) {
                    if (!blockHashes.has(block.hash)) {
                        blockHashes.add(block.hash);
                        validBlocks.push(block);
                    }
                }
            }
        }

        return validBlocks.sort((a, b) => a.index - b.index);
    }

    private async processBlocks(blocks: Block[]): Promise<void> {
        for (const block of blocks) {
            if (block.index !== this.blockchain.getHeight() + 1) {
                // Handle chain reorganization
                await this.handleReorg(block);
            } else {
                // Add block to chain
                if (this.blockchain.addBlock(block)) {
                    this.stateManager.applyBlock(block);
                    this.syncHeight = block.index;
                }
            }
        }
    }

    private async handleReorg(newBlock: Block): Promise<void> {
        const currentHeight = this.blockchain.getHeight();
        const forkPoint = await this.findForkPoint(newBlock);

        if (forkPoint === -1) {
            return;
        }

        // Roll back to fork point
        const blocksToRemove = this.blockchain.chain.slice(forkPoint + 1);
        for (const block of blocksToRemove.reverse()) {
            this.blockchain.removeBlock(block.hash);
            // In a real implementation, we would also roll back the state
        }

        // Add new blocks
        const newBlocks = await this.getBlocksFromHeight(forkPoint + 1);
        for (const block of newBlocks) {
            if (this.blockchain.addBlock(block)) {
                this.stateManager.applyBlock(block);
            }
        }
    }

    private async findForkPoint(newBlock: Block): Promise<number> {
        let currentBlock = newBlock;
        while (currentBlock.index > 0) {
            const existingBlock = this.blockchain.getBlockByHash(currentBlock.previousHash);
            if (existingBlock) {
                return existingBlock.index;
            }
            currentBlock = await this.getBlockByHash(currentBlock.previousHash);
        }
        return -1;
    }

    private async getBlocksFromHeight(height: number): Promise<Block[]> {
        const peers = this.peerManager.getPeers();
        if (peers.length === 0) {
            return [];
        }

        const blockPromises = peers.map(peer =>
            this.requestBlocks(peer, height, height + 100)
        );

        const results = await Promise.allSettled(blockPromises);
        return this.validateBlocksFromPeers(results);
    }

    private async getBlockByHash(hash: string): Promise<Block> {
        const peers = this.peerManager.getPeers();
        if (peers.length === 0) {
            throw new Error('No peers available');
        }

        const blockPromises = peers.map(peer =>
            this.requestBlocks(peer, 0, 0) // In a real implementation, we would have a specific endpoint for this
        );

        const results = await Promise.allSettled(blockPromises);
        const blocks = this.validateBlocksFromPeers(results);
        return blocks.find(b => b.hash === hash) || Promise.reject('Block not found');
    }

    public getSyncStatus(): any {
        return {
            isSyncing: this.isSyncing,
            currentHeight: this.syncHeight,
            startTime: this.syncStartTime,
            duration: this.isSyncing ? Date.now() - this.syncStartTime : 0
        };
    }
} 