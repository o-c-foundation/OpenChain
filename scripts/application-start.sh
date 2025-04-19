#!/bin/bash
# Application Start script for OpenChain deployment

# Start the OpenChain service
systemctl start openchain

# Enable the service to start on system boot
systemctl enable openchain

# Output status information
echo "Application started. Service status:"
systemctl status openchain --no-pager 