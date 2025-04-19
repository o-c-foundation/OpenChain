# Script to create EC2 key pair for OpenChain deployment
$KEY_NAME = "openchain-key"
$AWS_REGION = "us-east-1"

Write-Host "Creating EC2 key pair: $KEY_NAME in region $AWS_REGION"

# Check if key pair already exists
$existingKey = aws ec2 describe-key-pairs --region $AWS_REGION --filters "Name=key-name,Values=$KEY_NAME" --query "KeyPairs[*].KeyName" --output text

if ($existingKey -eq $KEY_NAME) {
    Write-Host "Key pair $KEY_NAME already exists. Deleting and recreating..."
    aws ec2 delete-key-pair --key-name $KEY_NAME --region $AWS_REGION
}

# Create new key pair
$keyPair = aws ec2 create-key-pair --key-name $KEY_NAME --query "KeyMaterial" --output text --region $AWS_REGION

if ($keyPair) {
    # Save to file
    $keyPair | Out-File -FilePath "$KEY_NAME.pem" -Encoding ascii
    # Fix line endings
    ((Get-Content "$KEY_NAME.pem") -join "`n") + "`n" | Set-Content -NoNewline -Path "$KEY_NAME.pem" -Encoding ascii
    # Set permissions
    if ($env:OS -match "Windows") {
        # Windows - restrict access to current user
        icacls "$KEY_NAME.pem" /inheritance:r /grant "${env:USERNAME}:F"
    } else {
        # Linux/macOS - chmod 400
        chmod 400 "$KEY_NAME.pem"
    }
    
    Write-Host "Key pair created and saved to $KEY_NAME.pem"
    Write-Host "Be sure to keep this file secure!"
} else {
    Write-Host "Failed to create key pair!"
    exit 1
}

# Install key to SSH directory
Write-Host "Installing key to SSH directory..."
Copy-Item -Path "$KEY_NAME.pem" -Destination ".ssh/$KEY_NAME" -Force
# Fix line endings
((Get-Content ".ssh/$KEY_NAME") -join "`n") + "`n" | Set-Content -NoNewline -Path ".ssh/$KEY_NAME" -Encoding ascii
# Configure SSH to use this key
$keyConfig = @"
Host ec2-*.$AWS_REGION.compute.amazonaws.com
  IdentityFile ~/.ssh/$KEY_NAME
  User ec2-user
"@
Add-Content -Path ".ssh/config" -Value $keyConfig

Write-Host "Key installed successfully to SSH directory" 