# AWS Deployment Script for OpenChain (PowerShell Version)

# Function to check AWS CLI
function Test-AwsCli {
    try {
        $awsVersion = aws --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

# Check if AWS CLI is installed and accessible
if (-not (Test-AwsCli)) {
    Write-Host "AWS CLI is not accessible. Please ensure it's installed and in your PATH."
    Write-Host "Current PATH: $env:PATH"
    exit 1
}

# Configuration
$REGION = "us-east-1"
$INSTANCE_TYPE = "t2.micro"
$AMI_ID = "ami-0c55b159cbfafe1f0"  # Amazon Linux 2
$KEY_NAME = "openchain-key"
$SECURITY_GROUP = "openchain-sg"
$NODE_COUNT = 3

try {
    # Create key pair
    Write-Host "Creating key pair..."
    aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text > "$KEY_NAME.pem"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create key pair"
    }
    icacls "$KEY_NAME.pem" /inheritance:r
    icacls "$KEY_NAME.pem" /grant:r "$($env:USERNAME):(R)"

    # Create security group
    Write-Host "Creating security group..."
    aws ec2 create-security-group --group-name $SECURITY_GROUP --description "OpenChain Security Group"
    aws ec2 authorize-security-group-ingress --group-name $SECURITY_GROUP --protocol tcp --port 22 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-name $SECURITY_GROUP --protocol tcp --port 3000 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-name $SECURITY_GROUP --protocol tcp --port 3001 --cidr 0.0.0.0/0

    # Launch instances
    Write-Host "Launching $NODE_COUNT instances..."
    for ($i = 1; $i -le $NODE_COUNT; $i++) {
        Write-Host "Launching instance $i..."
        $INSTANCE_ID = aws ec2 run-instances `
            --image-id $AMI_ID `
            --count 1 `
            --instance-type $INSTANCE_TYPE `
            --key-name $KEY_NAME `
            --security-groups $SECURITY_GROUP `
            --query 'Instances[0].InstanceId' `
            --output text
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to launch instance $i"
        }
        
        Write-Host "Instance $i launched with ID: $INSTANCE_ID"
        
        # Wait for instance to be running
        Write-Host "Waiting for instance $i to be running..."
        aws ec2 wait instance-running --instance-ids $INSTANCE_ID
        
        # Get public IP
        $PUBLIC_IP = aws ec2 describe-instances `
            --instance-ids $INSTANCE_ID `
            --query 'Reservations[0].Instances[0].PublicIpAddress' `
            --output text
        
        Write-Host "Instance $i public IP: $PUBLIC_IP"
        
        # Create setup script
        $setupScript = @"
#!/bin/bash

# Update system
sudo yum update -y

# Install Node.js and npm
curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo yum install -y nodejs

# Install Git
sudo yum install -y git

# Clone repository
git clone https://github.com/o-c-foundation/OpenChain.git
cd OpenChain

# Install dependencies
npm install

# Build the project
npm run build

# Start the node
npm start
"@
        
        $setupScript | Out-File -FilePath "setup-node-$i.sh" -Encoding ASCII
        
        Write-Host "Setup script created for instance $i"
        Write-Host "Please copy setup-node-$i.sh to the instance using an SCP client"
        Write-Host "Instance IP: $PUBLIC_IP"
        Write-Host "Username: ec2-user"
        Write-Host "Key file: $KEY_NAME.pem"
    }

    Write-Host "Deployment complete!"
} catch {
    Write-Host "Error occurred: $_"
    exit 1
} 