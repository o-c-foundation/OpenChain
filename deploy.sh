#!/bin/bash

# AWS deployment script for OpenChain

# Build the application
echo "Building OpenChain..."
npm run build

# Create AWS deployment package
echo "Creating deployment package..."
zip -r deployment.zip . -x "node_modules/*" "*.git*"

# Upload to S3
echo "Uploading to S3..."
aws s3 cp deployment.zip s3://openchain-deployment/

# Update Elastic Beanstalk environment
echo "Updating Elastic Beanstalk environment..."
aws elasticbeanstalk update-environment \
    --environment-name OpenChain-Env \
    --version-label "v$(date +%Y%m%d-%H%M%S)"

# Update environment variables
echo "Updating environment variables..."
aws elasticbeanstalk update-environment \
    --environment-name OpenChain-Env \
    --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=NODE_ENV,Value=production \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=ADMIN_USERNAME,Value=admin \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=ADMIN_PASSWORD,Value=openchain

echo "Deployment complete!" 