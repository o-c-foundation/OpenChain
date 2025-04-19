#!/bin/bash
# Application Stop script for OpenChain deployment

# Check if the service is active before attempting to stop it
if systemctl is-active --quiet openchain; then
    echo "Stopping OpenChain service..."
    systemctl stop openchain
else
    echo "OpenChain service is not currently running."
fi 