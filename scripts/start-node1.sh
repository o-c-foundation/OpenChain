#!/bin/bash

# Update system
sudo yum update -y

# Install development tools
sudo yum groupinstall -y "Development Tools"

# Install Node.js repository
curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -

# Install Node.js and npm
sudo yum install -y nodejs

# Verify installations
node --version
npm --version

# Install PM2 globally
sudo npm install -g pm2

# Clone repository if it doesn't exist
if [ ! -d "OpenChain" ]; then
    git clone https://github.com/o-c-foundation/OpenChain.git
    cd OpenChain
else
    cd OpenChain
    git pull
fi

# Install dependencies
npm install

# Build the project
npm run build

# Start the node with PM2
pm2 start dist/index.js --name openchain-node1 -- --config ../config/node1-config.json

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user 