#!/bin/bash

echo "🚀 Starting OpenChain deployment..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if we're logged into AWS
aws sts get-caller-identity &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Not logged into AWS. Please run 'aws configure' first."
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm run build

# Create deployment package
echo "📦 Creating deployment package..."
zip -r deploy.zip . -x "node_modules/*" "*.git*"

# Set variables
STACK_NAME="openchain-stack"
BUCKET_NAME="openchain-deployments"
REGION="us-east-1"

# Create S3 bucket if it doesn't exist
aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "🪣 Creating S3 bucket..."
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION"
fi

# Upload deployment package to S3
echo "📤 Uploading deployment package to S3..."
aws s3 cp deploy.zip "s3://$BUCKET_NAME/deploy.zip"

# Check if the stack exists
aws cloudformation describe-stacks --stack-name "$STACK_NAME" &>/dev/null
if [ $? -eq 0 ]; then
    # Update existing stack
    echo "🔄 Updating existing stack..."
    aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://aws/cloudformation.yaml \
        --capabilities CAPABILITY_IAM
else
    # Create new stack
    echo "🆕 Creating new stack..."
    aws cloudformation create-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://aws/cloudformation.yaml \
        --capabilities CAPABILITY_IAM
fi

# Wait for stack creation/update to complete
echo "⏳ Waiting for stack update to complete..."
aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME"

# Get the deployment URL
URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`URL`].OutputValue' \
    --output text)

echo "✅ Deployment complete!"
echo "🌐 Application URL: $URL"

# Cleanup
echo "🧹 Cleaning up..."
rm deploy.zip

echo "📝 Deployment logs can be found in CloudWatch"
echo "🎮 Admin panel available at $URL/admin"
echo "🔍 Block explorer available at $URL/explorer"
echo "📊 Dashboard available at $URL/dashboard" 