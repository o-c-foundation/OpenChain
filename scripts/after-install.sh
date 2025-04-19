#!/bin/bash
# After Install script for OpenChain deployment

# Navigate to application directory
cd /home/ec2-user/openchain

# Install dependencies
npm install

# Set proper permissions
chown -R ec2-user:ec2-user /home/ec2-user/openchain

# Create environment file
cat > /home/ec2-user/openchain/.env << EOL
PORT=3000
NODE_ENV=production
# Get the instance ID to use as a unique node identifier
NODE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
# Discover other nodes (this would need to be customized based on your AWS setup)
EOL

# Create systemd service file
cat > /etc/systemd/system/openchain.service << EOL
[Unit]
Description=OpenChain Node
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/openchain
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

# Reload systemd to recognize the new service
systemctl daemon-reload 