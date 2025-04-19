#!/bin/bash

# AWS Deployment Script for OpenChain

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Configuration
REGION="us-east-1"
INSTANCE_TYPE="t2.micro"
AMI_ID="ami-0c55b159cbfafe1f0"  # Amazon Linux 2
KEY_NAME="openchain-key"
SECURITY_GROUP="openchain-sg"
NODE_COUNT=3

# Create key pair
echo "Creating key pair..."
aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text > $KEY_NAME.pem
chmod 400 $KEY_NAME.pem

# Create security group
echo "Creating security group..."
aws ec2 create-security-group --group-name $SECURITY_GROUP --description "OpenChain Security Group"
aws ec2 authorize-security-group-ingress --group-name $SECURITY_GROUP --protocol tcp --port 22 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name $SECURITY_GROUP --protocol tcp --port 3000 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name $SECURITY_GROUP --protocol tcp --port 3001 --cidr 0.0.0.0/0

# Launch instances
echo "Launching $NODE_COUNT instances..."
for i in $(seq 1 $NODE_COUNT); do
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --count 1 \
        --instance-type $INSTANCE_TYPE \
        --key-name $KEY_NAME \
        --security-groups $SECURITY_GROUP \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    echo "Instance $i launched with ID: $INSTANCE_ID"
    
    # Wait for instance to be running
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID
    
    # Get public IP
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    echo "Instance $i public IP: $PUBLIC_IP"
    
    # Create setup script
    cat > setup-node-$i.sh << EOF
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
EOF
    
    # Copy setup script to instance
    scp -i $KEY_NAME.pem setup-node-$i.sh ec2-user@$PUBLIC_IP:~/
    
    # Make script executable and run it
    ssh -i $KEY_NAME.pem ec2-user@$PUBLIC_IP "chmod +x setup-node-$i.sh && ./setup-node-$i.sh"
done

echo "Deployment complete!" 