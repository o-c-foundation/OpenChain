#!/bin/bash
echo 'Setting up OpenChain Node...'
sudo yum update -y
sudo yum install -y nodejs npm unzip
mkdir -p ~/openchain
cd ~/openchain
unzip -o ~/deploy.zip
npm install
echo "PORT=3002" > .env
echo "NODE_ID=openchain-node3" >> .env
echo "PEERS=http://18.205.17.171:3000,http://204.236.194.11:3001" >> .env
echo 'Creating systemd service...'
sudo tee /etc/systemd/system/openchain.service > /dev/null << EOT
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
EOT

sudo systemctl daemon-reload
sudo systemctl enable openchain
sudo systemctl restart openchain
echo 'OpenChain Node deployed successfully!'