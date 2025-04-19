const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Configuration
const API_URL = 'http://98.82.10.184:3000';
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || 'd16e05525cb0ade55b3773c870cd88ee2e7c1b5f94df854defd86239bf7990cf'; // Primary wallet
const INITIAL_SUPPLY = 1000000; // 1 million tokens initial supply

async function deployOpUSD() {
    try {
        console.log('Starting opUSD contract deployment...');

        // 1. Read the contract code
        const contractPath = path.join(__dirname, 'contracts', 'opUSD.js');
        if (!fs.existsSync(contractPath)) {
            throw new Error(`Contract file not found at ${contractPath}`);
        }
        
        const contractCode = fs.readFileSync(contractPath, 'utf8');
        console.log('Contract code loaded successfully.');

        // 2. Check if wallet exists
        if (!WALLET_ADDRESS) {
            throw new Error('Wallet address is required. Set it in the script or via WALLET_ADDRESS env variable.');
        }
        
        console.log(`Using wallet address: ${WALLET_ADDRESS}`);
        
        // 3. Deploy the contract
        console.log('Deploying contract...');
        const response = await axios.post(`${API_URL}/api/contracts/deploy`, {
            from: WALLET_ADDRESS,
            code: contractCode,
            initialParams: [WALLET_ADDRESS, INITIAL_SUPPLY]
        });
        
        if (!response.data || !response.data.success) {
            throw new Error('Contract deployment failed: ' + (response.data?.error || 'Unknown error'));
        }
        
        const contractAddress = response.data.contractAddress;
        console.log(`Contract deployed successfully at address: ${contractAddress}`);
        
        // 4. Initialize the contract
        console.log('Initializing contract...');
        const initResponse = await axios.post(`${API_URL}/api/contracts/execute`, {
            from: WALLET_ADDRESS,
            contractAddress,
            method: 'initialize',
            params: [WALLET_ADDRESS, INITIAL_SUPPLY]
        });
        
        if (!initResponse.data || !initResponse.data.success) {
            throw new Error('Contract initialization failed: ' + (initResponse.data?.error || 'Unknown error'));
        }
        
        console.log('Contract initialized successfully.');
        
        // 5. Get token details
        console.log('Fetching token details...');
        const nameResponse = await axios.post(`${API_URL}/api/contracts/call`, {
            contractAddress,
            method: 'name',
            params: []
        });
        
        const symbolResponse = await axios.post(`${API_URL}/api/contracts/call`, {
            contractAddress,
            method: 'symbol',
            params: []
        });
        
        const totalSupplyResponse = await axios.post(`${API_URL}/api/contracts/call`, {
            contractAddress,
            method: 'totalSupply',
            params: []
        });
        
        const priceResponse = await axios.post(`${API_URL}/api/contracts/call`, {
            contractAddress,
            method: 'getPrice',
            params: []
        });
        
        // 6. Save contract information to a file
        const contractInfo = {
            address: contractAddress,
            name: nameResponse.data.result,
            symbol: symbolResponse.data.result,
            totalSupply: totalSupplyResponse.data.result,
            price: priceResponse.data.result,
            owner: WALLET_ADDRESS,
            deploymentDate: new Date().toISOString()
        };
        
        fs.writeFileSync(
            path.join(__dirname, 'opusd-contract-info.json'),
            JSON.stringify(contractInfo, null, 2)
        );
        
        console.log('\nopUSD Stablecoin Contract Deployment Summary:');
        console.log('==============================================');
        console.log(`Token Name: ${contractInfo.name}`);
        console.log(`Token Symbol: ${contractInfo.symbol}`);
        console.log(`Contract Address: ${contractInfo.address}`);
        console.log(`Total Supply: ${contractInfo.totalSupply}`);
        console.log(`Price: $${contractInfo.price.toFixed(2)} USD`);
        console.log(`Owner: ${contractInfo.owner}`);
        console.log(`Deployment Date: ${contractInfo.deploymentDate}`);
        console.log('==============================================');
        console.log('\nContract information saved to opusd-contract-info.json');
        
        return contractInfo;
    } catch (error) {
        console.error('Deployment failed:', error.message);
        if (error.response) {
            console.error('API Error:', error.response.data);
        }
        throw error;
    }
}

// Run the deployment if called directly
if (require.main === module) {
    deployOpUSD()
        .then(() => {
            console.log('Deployment completed successfully.');
            process.exit(0);
        })
        .catch(err => {
            console.error('Deployment failed:', err);
            process.exit(1);
        });
}

module.exports = { deployOpUSD };