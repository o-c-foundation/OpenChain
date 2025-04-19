# opUSD Stablecoin Contract

A stablecoin implementation for the OpenChain blockchain with a fixed value of $1.00 USD.

## Overview

opUSD is a simple stablecoin implementation that follows standard token interfaces. It maintains a stable value of $1.00 USD and provides the following functionality:

- Minting new tokens (restricted to contract owner)
- Burning tokens (restricted to contract owner)
- Transferring tokens between accounts
- Approving spending allowances for other accounts
- Pausing/unpausing the contract in case of emergencies (restricted to contract owner)
- Transferring contract ownership

## Contract Structure

The contract follows standard token practices with the following functions:

### View Functions

- `name()` - Get the token name ("OpenChain USD")
- `symbol()` - Get the token symbol ("opUSD")
- `decimals()` - Get the number of decimal places (18)
- `totalSupply()` - Get the total token supply
- `balanceOf(address)` - Get the balance of a specific address
- `allowance(owner, spender)` - Get the amount a spender is allowed to use from an owner
- `getPrice()` - Get the token price (fixed at $1.00 USD)

### Transfer Functions

- `transfer(to, amount)` - Transfer tokens to another address
- `transferFrom(from, to, amount)` - Transfer tokens on behalf of another address (requires approval)
- `approve(spender, amount)` - Approve another address to spend tokens on your behalf

### Admin Functions

- `mint(to, amount)` - Create new tokens (owner only)
- `burn(from, amount)` - Destroy tokens (owner only)
- `pause()` - Pause the contract (owner only)
- `unpause()` - Unpause the contract (owner only)
- `transferOwnership(newOwner)` - Transfer contract ownership (owner only)

## Deployment

To deploy the opUSD contract:

```bash
npm run deploy-opusd
```

This will:
1. Deploy the contract to the blockchain
2. Initialize it with an initial supply
3. Save the contract information to `opusd-contract-info.json`

## Testing

To test the contract functions:

```bash
npm run test-opusd
```

This will run a series of tests to demonstrate:
- Checking contract details
- Checking account balances
- Transferring tokens between accounts
- Minting new tokens
- Burning tokens

## Contract Security

The contract includes several security features:

- Only the owner can mint new tokens or burn existing ones
- The contract can be paused in case of emergencies
- Ownership can be transferred if needed
- All functions validate input parameters and check permissions

## License

This contract is licensed under the MIT license. 