#!/bin/bash

# OpenChain Deployment Script for EC2 Instances
# This script bypasses TypeScript compilation and deploys directly

echo "🚀 Starting OpenChain deployment to EC2..."

# Check if EC2 instance IP is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide the EC2 instance IP as an argument"
    echo "Usage: ./deploy-to-ec2.sh <ec2-ip-address>"
    exit 1
fi

EC2_IP=$1
SSH_KEY=${2:-"~/.ssh/id_rsa"}
USER=${3:-"ec2-user"}

echo "📦 Creating deployment package..."
# Create a deployment directory
mkdir -p deploy
cp -r src public package.json package-lock.json tsconfig.json README.md .env.example deploy/
cp -r aws Dockerfile docker-compose.yml deploy/

# Create a simple start script to bypass TypeScript compilation
cat > deploy/start.js << 'EOL'
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

// Start the server using ts-node (dev mode)
const server = spawn('npx', ['ts-node', 'src/index.ts'], {
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'pipe'
});

// Log output
const logFile = fs.createWriteStream('logs/server.log', { flags: 'a' });
server.stdout.pipe(logFile);
server.stderr.pipe(logFile);

server.stdout.pipe(process.stdout);
server.stderr.pipe(process.stderr);

console.log('Server started in development mode');
EOL

# Create a zip file
echo "📦 Creating zip archive..."
cd deploy
zip -r ../openchain-deploy.zip .
cd ..

# Upload to EC2
echo "📤 Uploading to EC2 instance at ${EC2_IP}..."
scp -i $SSH_KEY openchain-deploy.zip $USER@$EC2_IP:~/

# Install and start the application
echo "🔧 Installing and starting the application..."
ssh -i $SSH_KEY $USER@$EC2_IP << 'EOF'
mkdir -p openchain
unzip -o openchain-deploy.zip -d openchain
cd openchain
npm install
npm install -g pm2 ts-node typescript
pm2 stop openchain || true
pm2 delete openchain || true
pm2 start start.js --name openchain
pm2 save
echo "✅ Deployment completed successfully!"
echo "📊 OpenChain is now running on http://$HOSTNAME:3000"
EOF

# Cleanup
echo "🧹 Cleaning up..."
rm -rf deploy openchain-deploy.zip

echo "✅ Deployment process completed!" 