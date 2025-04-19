#!/bin/bash
set -e

# Create openchain directory if it doesn't exist
mkdir -p ~/openchain
cd ~/openchain

# Extract the deployment zip
unzip -o ~/node2-deploy.zip

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    export NVM_DIR="\C:\Users\andre/.nvm"
    [ -s "\/nvm.sh" ] && \. "\/nvm.sh"
    nvm install 16
    nvm use 16
fi

# Install dependencies
npm install

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    npm install pm2 -g
fi

# Stop existing PM2 processes if running
pm2 stop all || true
pm2 delete all || true

# Start the application with PM2
pm2 start node2.js --name node2

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup | tail -n1 | bash

# Configure firewall
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo service iptables save

echo "Node 2 deployment completed successfully!"