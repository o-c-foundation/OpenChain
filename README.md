# OpenChain Blockchain Platform

OpenChain is a modular blockchain simulation platform with smart contract functionality, designed for educational and demonstration purposes.

## Features

- Full blockchain implementation with blocks, transactions, and mining
- Smart contract platform with JavaScript-based contracts
- Built-in stablecoin (opUSD) implementation
- Multi-node network simulation
- Web-based blockchain explorer
- REST API for blockchain interaction
- Wallet functionality

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Local Installation

```bash
# Clone the repository
git clone https://github.com/o-c-foundation/OpenChain.v1.05.01.git
cd OpenChain.v1.05.01

# Install dependencies
npm install

# Start the application
npm start
```

The application will be available at http://localhost:3000

### AWS Deployment

This repository includes AWS CodeDeploy configuration for easy deployment to EC2 instances. See [AWS-CODEDEPLOY.md](AWS-CODEDEPLOY.md) for detailed instructions.

## Project Structure

```
├── contracts/            # Smart contract examples
│   └── opUSD.js          # Stablecoin contract implementation
├── deploy/               # Deployment TypeScript sources
│   └── src/              # Core blockchain implementation (TS)
├── public/               # Static web assets
├── scripts/              # Deployment scripts
├── src/                  # JavaScript implementation
├── appspec.yml           # AWS CodeDeploy configuration
├── server.js             # Main server entry point
└── package.json          # Project dependencies
```

## API Documentation

### Blockchain API

- `GET /info` - Get blockchain information
- `GET /blocks` - List blockchain blocks
- `GET /block/:id` - Get block details
- `GET /transactions` - List transactions
- `GET /transaction/:id` - Get transaction details
- `GET /address/:address` - Get address information

### Contract API

- `POST /contracts/deploy` - Deploy a smart contract
- `POST /contracts/execute` - Execute a contract method
- `POST /contracts/call` - Call a contract method (read-only)

## Testing

To test the stablecoin contract:

```bash
npm run test-opusd
```

## Deployment

The simplest way to deploy OpenChain is using the provided AWS deployment scripts:

```bash
# Deploy to a single node
node deploy-opusd.js
```

For multi-node deployments, see the AWS CodeDeploy instructions.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

# opUSD Stablecoin for OpenChain

A $1.00 USD-pegged stablecoin implementation for the OpenChain blockchain.

## Overview

This project implements a USD-pegged stablecoin called opUSD on the OpenChain blockchain. The stablecoin maintains a fixed value of $1.00 USD and provides standard ERC-20 compatible functionality.

## Prerequisites

- Node.js (v14 or higher)
- npm
- Running OpenChain node (localhost:3000)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/openchain-stablecoin.git
cd openchain-stablecoin
```

2. Install dependencies:
```bash
npm install
```

## Getting Started

### Deploying the opUSD Contract

1. Make sure your OpenChain node is running:
```bash
npm start
```

2. Deploy the opUSD contract:
```bash
npm run deploy-opusd
```

This will:
- Deploy the opUSD contract to the blockchain
- Initialize it with an initial supply of 1,000,000 tokens
- Save the contract details to `opusd-contract-info.json`

### Testing the opUSD Contract

Run the test script to verify the contract works correctly:

```bash
npm run test-opusd
```

The test script demonstrates:
- Checking token details
- Checking wallet balances
- Transferring tokens between wallets
- Minting new tokens (owner only)
- Burning tokens (owner only)

## Contract Functions

### User Functions

- `transfer(to, amount)` - Send tokens to another wallet
- `balanceOf(address)` - Check the balance of an address
- `approve(spender, amount)` - Allow another address to spend your tokens
- `transferFrom(from, to, amount)` - Transfer tokens as an approved spender

### Admin Functions (Owner Only)

- `mint(to, amount)` - Create new tokens
- `burn(from, amount)` - Destroy tokens
- `pause()` - Pause the contract in case of emergency
- `unpause()` - Resume contract operations
- `transferOwnership(newOwner)` - Transfer contract control

## Contract Security

The opUSD contract includes several security features:
- Controlled token supply (only owner can mint/burn)
- Emergency pause functionality
- Input validation and error handling
- Balance checking to prevent unauthorized spending

## Technical Details

The opUSD token has the following properties:
- Name: OpenChain USD
- Symbol: opUSD
- Decimals: 18
- Fixed price: $1.00 USD

## License

This project is licensed under the MIT License - see the LICENSE file for details. 