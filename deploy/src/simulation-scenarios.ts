import { NetworkSimulator } from './network-simulator';
import { Blockchain } from './blockchain';
import { Transaction } from './transaction';
import { Block } from './block';

export class SimulationScenarios {
    private networkSimulator: NetworkSimulator;
    private scenarios: Map<string, () => Promise<void>>;

    constructor(networkSimulator: NetworkSimulator) {
        this.networkSimulator = networkSimulator;
        this.scenarios = new Map();
        this.initializeScenarios();
    }

    private initializeScenarios(): void {
        this.scenarios.set('network_growth', this.networkGrowthScenario.bind(this));
        this.scenarios.set('network_partition', this.networkPartitionScenario.bind(this));
        this.scenarios.set('transaction_propagation', this.transactionPropagationScenario.bind(this));
        this.scenarios.set('mining_competition', this.miningCompetitionScenario.bind(this));
        this.scenarios.set('chain_reorganization', this.chainReorganizationScenario.bind(this));
    }

    public async runScenario(scenarioName: string): Promise<void> {
        const scenario = this.scenarios.get(scenarioName);
        if (!scenario) {
            throw new Error(`Scenario '${scenarioName}' not found`);
        }
        await scenario();
    }

    public getAvailableScenarios(): string[] {
        return Array.from(this.scenarios.keys());
    }

    private async networkGrowthScenario(): Promise<void> {
        // Simulate network growth from 1 to 10 nodes
        const initialBlockchain = new Blockchain();
        this.networkSimulator.addNode('node1', initialBlockchain);

        for (let i = 2; i <= 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const newBlockchain = new Blockchain();
            this.networkSimulator.addNode(`node${i}`, newBlockchain);
        }
    }

    private async networkPartitionScenario(): Promise<void> {
        // Create a network of 6 nodes
        const nodes = [];
        for (let i = 1; i <= 6; i++) {
            const blockchain = new Blockchain();
            this.networkSimulator.addNode(`node${i}`, blockchain);
            nodes.push(`node${i}`);
        }

        // Simulate network partition
        await new Promise(resolve => setTimeout(resolve, 3000));
        const partition1 = nodes.slice(0, 3);
        const partition2 = nodes.slice(3);
        
        this.networkSimulator.simulateNetworkPartition(partition1);

        // Let the partitions operate independently
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Heal the partition
        this.networkSimulator.healNetworkPartition(partition1);
    }

    private async transactionPropagationScenario(): Promise<void> {
        // Create a network of 5 nodes
        const blockchain = new Blockchain();
        for (let i = 1; i <= 5; i++) {
            this.networkSimulator.addNode(`node${i}`, blockchain);
        }

        // Create and broadcast transactions
        const transactions = [];
        for (let i = 1; i <= 3; i++) {
            const tx = new Transaction({
                from: `wallet${i}`,
                to: `wallet${i + 1}`,
                amount: 10,
                timestamp: Date.now(),
                nonce: i,
                data: { type: 'transfer' }
            });
            transactions.push(tx);
        }

        // Broadcast transactions with delays
        for (const tx of transactions) {
            await this.networkSimulator.broadcastTransaction('node1', tx);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    private async miningCompetitionScenario(): Promise<void> {
        // Create competing miners
        const miners = [];
        for (let i = 1; i <= 3; i++) {
            const blockchain = new Blockchain();
            this.networkSimulator.addNode(`miner${i}`, blockchain);
            miners.push(`miner${i}`);
        }

        // Simulate concurrent mining
        const pendingTransactions = [
            new Transaction({
                from: 'wallet1',
                to: 'wallet2',
                amount: 5,
                timestamp: Date.now(),
                nonce: 1
            })
        ];

        // Each miner tries to create a block
        const blocks = miners.map(minerId => {
            const blockchain = new Blockchain();
            return new Block(
                blockchain.getLatestBlock().hash,
                pendingTransactions,
                Date.now(),
                blockchain.getHeight() + 1,
                4
            );
        });

        // Broadcast competing blocks
        for (let i = 0; i < miners.length; i++) {
            await this.networkSimulator.broadcastBlock(miners[i], blocks[i]);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    private async chainReorganizationScenario(): Promise<void> {
        // Create two competing chains
        const chain1 = new Blockchain();
        const chain2 = new Blockchain();

        this.networkSimulator.addNode('node1', chain1);
        this.networkSimulator.addNode('node2', chain2);

        // Create different blocks for each chain
        const tx1 = new Transaction({
            from: 'wallet1',
            to: 'wallet2',
            amount: 10,
            timestamp: Date.now(),
            nonce: 1
        });

        const tx2 = new Transaction({
            from: 'wallet3',
            to: 'wallet4',
            amount: 15,
            timestamp: Date.now(),
            nonce: 2
        });

        const block1 = new Block(
            chain1.getLatestBlock().hash,
            [tx1],
            Date.now(),
            chain1.getHeight() + 1,
            4
        );

        const block2 = new Block(
            chain2.getLatestBlock().hash,
            [tx2],
            Date.now(),
            chain2.getHeight() + 1,
            4
        );

        // Simulate chain reorganization
        await this.networkSimulator.broadcastBlock('node1', block1);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.networkSimulator.broadcastBlock('node2', block2);
    }
} 