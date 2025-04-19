#!/bin/bash
# Before Install script for OpenChain deployment

# Update system packages
yum update -y

# Install required packages
yum install -y nodejs npm

# Create application directory if it doesn't exist
mkdir -p /home/ec2-user/openchain

# Set proper permissions
chown -R ec2-user:ec2-user /home/ec2-user/openchain

# Stop the application if it's already running
if systemctl is-active --quiet openchain; then
    systemctl stop openchain
fi 