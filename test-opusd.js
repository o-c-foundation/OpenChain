const fs = require('fs');
const axios = require('axios');
const path = require('path');
const { deployOpUSD } = require('./deploy-opusd');

// Configuration
const API_URL = 'http://localhost:3000';

// Utility function to read contract info
async function getContractInfo() {
    const contractInfoPath = path.join(__dirname, 'opusd-contract-info.json');
    
    if (fs.existsSync(contractInfoPath)) {
        const contractInfo = JSON.parse(fs.readFileSync(contractInfoPath, 'utf8'));
        return contractInfo;
    } else {
        // If contract info doesn't exist, deploy the contract
        console.log('Contract information not found. Deploying new contract...');
        return await deployOpUSD();
    }
}

// Check the contract details
async function checkContractDetails(contractAddress) {
    console.log('\nChecking contract details...');
    
    const nameResponse = await axios.post(`${API_URL}/contracts/call`, {
        contractAddress,
        method: 'name',
        params: []
    });
    
    const symbolResponse = await axios.post(`${API_URL}/contracts/call`, {
        contractAddress,
        method: 'symbol',
        params: []
    });
    
    const totalSupplyResponse = await axios.post(`${API_URL}/contracts/call`, {
        contractAddress,
        method: 'totalSupply',
        params: []
    });
    
    const priceResponse = await axios.post(`${API_URL}/contracts/call`, {
        contractAddress,
        method: 'getPrice',
        params: []
    });
    
    console.log(`Token Name: ${nameResponse.data.result}`);
    console.log(`Token Symbol: ${symbolResponse.data.result}`);
    console.log(`Total Supply: ${totalSupplyResponse.data.result}`);
    console.log(`Price: $${priceResponse.data.result} USD`);
}

// Check the balance of a wallet
async function checkBalance(contractAddress, walletAddress) {
    console.log(`\nChecking balance for wallet: ${walletAddress}`);
    
    const balanceResponse = await axios.post(`${API_URL}/contracts/call`, {
        contractAddress,
        method: 'balanceOf',
        params: [walletAddress]
    });
    
    console.log(`Balance: ${balanceResponse.data.result} opUSD`);
    return balanceResponse.data.result;
}

// Transfer tokens to another wallet
async function transferTokens(contractAddress, fromWallet, toWallet, amount) {
    console.log(`\nTransferring ${amount} opUSD from ${fromWallet} to ${toWallet}`);
    
    try {
        const transferResponse = await axios.post(`${API_URL}/contracts/execute`, {
            from: fromWallet,
            contractAddress,
            method: 'transfer',
            params: [toWallet, amount]
        });
        
        console.log('Transfer successful:', transferResponse.data);
        return transferResponse.data;
    } catch (error) {
        console.error('Transfer failed:', error.message);
        if (error.response) {
            console.error('API Error:', error.response.data);
        }
        throw error;
    }
}

// Mint new tokens (requires owner permissions)
async function mintTokens(contractAddress, ownerWallet, toWallet, amount) {
    console.log(`\nMinting ${amount} new opUSD tokens to ${toWallet}`);
    
    try {
        const mintResponse = await axios.post(`${API_URL}/contracts/execute`, {
            from: ownerWallet,
            contractAddress,
            method: 'mint',
            params: [toWallet, amount]
        });
        
        console.log('Minting successful:', mintResponse.data);
        return mintResponse.data;
    } catch (error) {
        console.error('Minting failed:', error.message);
        if (error.response) {
            console.error('API Error:', error.response.data);
        }
        throw error;
    }
}

// Burn tokens (requires owner permissions)
async function burnTokens(contractAddress, ownerWallet, fromWallet, amount) {
    console.log(`\nBurning ${amount} opUSD tokens from ${fromWallet}`);
    
    try {
        const burnResponse = await axios.post(`${API_URL}/contracts/execute`, {
            from: ownerWallet,
            contractAddress,
            method: 'burn',
            params: [fromWallet, amount]
        });
        
        console.log('Burning successful:', burnResponse.data);
        return burnResponse.data;
    } catch (error) {
        console.error('Burning failed:', error.message);
        if (error.response) {
            console.error('API Error:', error.response.data);
        }
        throw error;
    }
}

// Run a basic test scenario
async function runTests() {
    try {
        // Get contract info
        const contractInfo = await getContractInfo();
        const contractAddress = contractInfo.address;
        const ownerWallet = contractInfo.owner;
        
        // Get test wallet or create one
        let testWallet;
        try {
            const walletsResponse = await axios.get(`${API_URL}/wallets`);
            // Find a wallet that is not the owner wallet
            const otherWallet = walletsResponse.data.find(wallet => wallet.address !== ownerWallet);
            
            if (otherWallet) {
                testWallet = otherWallet.address;
            } else {
                // Create a new wallet if no other wallet found
                const newWalletResponse = await axios.post(`${API_URL}/wallet/create`, {
                    name: 'Test Wallet',
                    password: ''
                });
                testWallet = newWalletResponse.data.address;
            }
        } catch (error) {
            // Fallback to a random address if we can't get a real wallet
            testWallet = '0x' + Math.random().toString(16).substring(2, 42);
        }
        
        console.log(`Owner wallet: ${ownerWallet}`);
        console.log(`Test wallet: ${testWallet}`);
        
        // Check contract details
        await checkContractDetails(contractAddress);
        
        // Check owner balance
        const ownerBalance = await checkBalance(contractAddress, ownerWallet);
        
        // Check test wallet balance
        const testWalletBalance = await checkBalance(contractAddress, testWallet);
        
        // Transfer some tokens to test wallet
        const transferAmount = 100;
        if (ownerBalance >= transferAmount) {
            await transferTokens(contractAddress, ownerWallet, testWallet, transferAmount);
            
            // Check balances after transfer
            await checkBalance(contractAddress, ownerWallet);
            await checkBalance(contractAddress, testWallet);
        } else {
            console.log(`Owner has insufficient balance (${ownerBalance}) to transfer ${transferAmount} tokens`);
        }
        
        // Mint some new tokens to test wallet
        const mintAmount = 500;
        await mintTokens(contractAddress, ownerWallet, testWallet, mintAmount);
        
        // Check balances after minting
        await checkBalance(contractAddress, testWallet);
        
        // Burn some tokens from test wallet
        const burnAmount = 200;
        await burnTokens(contractAddress, ownerWallet, testWallet, burnAmount);
        
        // Check balances after burning
        await checkBalance(contractAddress, testWallet);
        
        // Check total supply
        const totalSupplyResponse = await axios.post(`${API_URL}/contracts/call`, {
            contractAddress,
            method: 'totalSupply',
            params: []
        });
        
        console.log(`\nFinal Total Supply: ${totalSupplyResponse.data.result} opUSD`);
        
        console.log('\nAll tests completed successfully!');
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

// Run the tests if called directly
if (require.main === module) {
    runTests()
        .then(() => {
            console.log('Test script completed.');
            process.exit(0);
        })
        .catch(err => {
            console.error('Test script failed:', err);
            process.exit(1);
        });
}

module.exports = {
    getContractInfo,
    checkContractDetails,
    checkBalance,
    transferTokens,
    mintTokens,
    burnTokens,
    runTests
}; 