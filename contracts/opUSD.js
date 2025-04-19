/**
 * opUSD Stablecoin Contract
 * A simple USD-pegged stablecoin with $1.00 stable value
 */

// Token data
let name = "OpenChain USD";
let symbol = "opUSD";
let decimals = 18;
let totalSupply = 0;

// Main token functionality
function initialize(context, params) {
    if (context.state.initialized) {
        throw new Error("Contract already initialized");
    }

    const [owner, initialSupply] = params;
    
    // Validation
    if (!owner) {
        throw new Error("Owner address is required");
    }
    
    // Setup initial state
    context.state.name = name;
    context.state.symbol = symbol;
    context.state.decimals = decimals;
    context.state.totalSupply = 0;
    context.state.balances = {};
    context.state.allowances = {};
    context.state.owner = owner;
    context.state.paused = false;
    context.state.initialized = true;
    context.state.price = 1.00; // Fixed $1.00 USD price

    // Mint initial supply if provided
    if (initialSupply > 0) {
        context.state.balances[owner] = initialSupply;
        context.state.totalSupply = initialSupply;
        
        // Emit transfer event (from zero address)
        context.events.push({
            name: "Transfer",
            data: {
                from: "0x0000000000000000000000000000000000000000",
                to: owner,
                value: initialSupply
            },
            timestamp: Date.now(),
            blockNumber: context.blockNumber
        });
    }
    
    return true;
}

// View functions
function name(context, params) {
    return context.state.name;
}

function symbol(context, params) {
    return context.state.symbol;
}

function decimals(context, params) {
    return context.state.decimals;
}

function totalSupply(context, params) {
    return context.state.totalSupply;
}

function balanceOf(context, params) {
    const [address] = params;
    return context.state.balances[address] || 0;
}

function allowance(context, params) {
    const [owner, spender] = params;
    const key = `${owner}:${spender}`;
    return context.state.allowances[key] || 0;
}

// Get the token price (always $1.00)
function getPrice(context, params) {
    return context.state.price;
}

// Transfer tokens
function transfer(context, params) {
    if (context.state.paused) {
        throw new Error("Contract is paused");
    }
    
    const [to, value] = params;
    const from = context.sender;
    
    if (!to) {
        throw new Error("Recipient address is required");
    }
    
    if (value <= 0) {
        throw new Error("Amount must be positive");
    }
    
    const fromBalance = context.state.balances[from] || 0;
    
    if (fromBalance < value) {
        throw new Error("Insufficient balance");
    }
    
    // Update balances
    context.state.balances[from] = fromBalance - value;
    context.state.balances[to] = (context.state.balances[to] || 0) + value;
    
    // Emit transfer event
    context.events.push({
        name: "Transfer",
        data: {
            from,
            to,
            value
        },
        timestamp: Date.now(),
        blockNumber: context.blockNumber
    });
    
    return true;
}

// Transfer from another account (requires approval)
function transferFrom(context, params) {
    if (context.state.paused) {
        throw new Error("Contract is paused");
    }
    
    const [from, to, value] = params;
    const spender = context.sender;
    
    if (!from || !to) {
        throw new Error("From and To addresses are required");
    }
    
    if (value <= 0) {
        throw new Error("Amount must be positive");
    }
    
    const fromBalance = context.state.balances[from] || 0;
    
    if (fromBalance < value) {
        throw new Error("Insufficient balance");
    }
    
    const key = `${from}:${spender}`;
    const currentAllowance = context.state.allowances[key] || 0;
    
    if (currentAllowance < value) {
        throw new Error("Insufficient allowance");
    }
    
    // Update balances and allowance
    context.state.balances[from] = fromBalance - value;
    context.state.balances[to] = (context.state.balances[to] || 0) + value;
    context.state.allowances[key] = currentAllowance - value;
    
    // Emit transfer event
    context.events.push({
        name: "Transfer",
        data: {
            from,
            to,
            value
        },
        timestamp: Date.now(),
        blockNumber: context.blockNumber
    });
    
    return true;
}

// Approve spending of tokens
function approve(context, params) {
    if (context.state.paused) {
        throw new Error("Contract is paused");
    }
    
    const [spender, value] = params;
    const owner = context.sender;
    
    if (!spender) {
        throw new Error("Spender address is required");
    }
    
    if (value < 0) {
        throw new Error("Amount cannot be negative");
    }
    
    const key = `${owner}:${spender}`;
    context.state.allowances[key] = value;
    
    // Emit approval event
    context.events.push({
        name: "Approval",
        data: {
            owner,
            spender,
            value
        },
        timestamp: Date.now(),
        blockNumber: context.blockNumber
    });
    
    return true;
}

// Admin functions

// Mint new tokens (only owner)
function mint(context, params) {
    const [to, value] = params;
    
    if (context.sender !== context.state.owner) {
        throw new Error("Only owner can mint tokens");
    }
    
    if (!to) {
        throw new Error("Recipient address is required");
    }
    
    if (value <= 0) {
        throw new Error("Amount must be positive");
    }
    
    // Update balance and total supply
    context.state.balances[to] = (context.state.balances[to] || 0) + value;
    context.state.totalSupply += value;
    
    // Emit transfer event (from zero address)
    context.events.push({
        name: "Transfer",
        data: {
            from: "0x0000000000000000000000000000000000000000",
            to,
            value
        },
        timestamp: Date.now(),
        blockNumber: context.blockNumber
    });
    
    return true;
}

// Burn tokens (only owner)
function burn(context, params) {
    const [from, value] = params;
    
    if (context.sender !== context.state.owner) {
        throw new Error("Only owner can burn tokens");
    }
    
    if (!from) {
        throw new Error("From address is required");
    }
    
    if (value <= 0) {
        throw new Error("Amount must be positive");
    }
    
    const fromBalance = context.state.balances[from] || 0;
    
    if (fromBalance < value) {
        throw new Error("Insufficient balance");
    }
    
    // Update balance and total supply
    context.state.balances[from] = fromBalance - value;
    context.state.totalSupply -= value;
    
    // Emit transfer event (to zero address)
    context.events.push({
        name: "Transfer",
        data: {
            from,
            to: "0x0000000000000000000000000000000000000000",
            value
        },
        timestamp: Date.now(),
        blockNumber: context.blockNumber
    });
    
    return true;
}

// Pause the contract (only owner)
function pause(context, params) {
    if (context.sender !== context.state.owner) {
        throw new Error("Only owner can pause the contract");
    }
    
    context.state.paused = true;
    
    // Emit pause event
    context.events.push({
        name: "Paused",
        data: {
            by: context.sender
        },
        timestamp: Date.now(),
        blockNumber: context.blockNumber
    });
    
    return true;
}

// Unpause the contract (only owner)
function unpause(context, params) {
    if (context.sender !== context.state.owner) {
        throw new Error("Only owner can unpause the contract");
    }
    
    context.state.paused = false;
    
    // Emit unpause event
    context.events.push({
        name: "Unpaused",
        data: {
            by: context.sender
        },
        timestamp: Date.now(),
        blockNumber: context.blockNumber
    });
    
    return true;
}

// Transfer ownership of the contract (only owner)
function transferOwnership(context, params) {
    const [newOwner] = params;
    
    if (context.sender !== context.state.owner) {
        throw new Error("Only owner can transfer ownership");
    }
    
    if (!newOwner) {
        throw new Error("New owner address is required");
    }
    
    context.state.owner = newOwner;
    
    // Emit ownership transfer event
    context.events.push({
        name: "OwnershipTransferred",
        data: {
            from: context.sender,
            to: newOwner
        },
        timestamp: Date.now(),
        blockNumber: context.blockNumber
    });
    
    return true;
} 