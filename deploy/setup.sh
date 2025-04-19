#!/bin/bash

# Install Node.js 14.x
curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash -
sudo yum install -y nodejs

# Install PM2 globally
sudo npm install -y pm2@latest -g

# Create directory for OpenChain
mkdir -p ~/openchain
cd ~/openchain

# Extract deployment package
unzip -o openchain-deploy.zip

# Install dependencies
npm install

# Build TypeScript files
./node_modules/.bin/tsc

# Start the application with PM2
pm2 delete openchain-node2 || true
pm2 start dist/node2.js --name openchain-node2
pm2 save

# Configure firewall
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo service iptables save

echo "Setup completed successfully"