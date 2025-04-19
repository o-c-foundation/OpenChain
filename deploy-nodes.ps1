# Deploy OpenChain to 3 AWS EC2 instances
# This script creates 3 EC2 instances and deploys our blockchain nodes to them

# Configuration
$AWS_REGION = "us-east-1"
$INSTANCE_TYPE = "t2.micro"
$AMI_ID = "ami-0c7217cdde317cfec" # Amazon Linux 2023
$KEY_NAME = "openchain-key"
$SECURITY_GROUP_NAME = "openchain-sg"
$NODE_COUNT = 3
$NODE_NAMES = @("openchain-node1", "openchain-node2", "openchain-node3")
$NODE_PORTS = @(3000, 3001, 3002)

# Step 1: Create security group if it doesn't exist
Write-Host "Creating security group..."
$securityGroupJson = aws ec2 describe-security-groups --region $AWS_REGION --filters "Name=group-name,Values=$SECURITY_GROUP_NAME"
$securityGroup = $securityGroupJson | ConvertFrom-Json
if (-not $securityGroup.SecurityGroups -or $securityGroup.SecurityGroups.Count -eq 0) {
    $sgJson = aws ec2 create-security-group --group-name $SECURITY_GROUP_NAME --description "Security group for OpenChain nodes" --region $AWS_REGION
    $sg = $sgJson | ConvertFrom-Json
    $securityGroupId = $sg.GroupId

    # Add inbound rules
    aws ec2 authorize-security-group-ingress --group-id $securityGroupId --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $AWS_REGION
    aws ec2 authorize-security-group-ingress --group-id $securityGroupId --protocol tcp --port 3000-3002 --cidr 0.0.0.0/0 --region $AWS_REGION
    Write-Host "Security group created: $securityGroupId"
} else {
    $securityGroupId = $securityGroup.SecurityGroups[0].GroupId
    Write-Host "Security group already exists: $securityGroupId"
}

# Step 2: Create EC2 instances if needed
Write-Host "Creating EC2 instances..."
$publicIps = @()
$instanceIds = @()

for ($i=0; $i -lt $NODE_COUNT; $i++) {
    $nodeName = $NODE_NAMES[$i]
    
    # Check if instance with this name already exists
    $existingInstanceJson = aws ec2 describe-instances --region $AWS_REGION --filters "Name=tag:Name,Values=$nodeName" "Name=instance-state-name,Values=running"
    $existingInstance = $existingInstanceJson | ConvertFrom-Json
    
    if ($existingInstance.Reservations.Count -gt 0) {
        $instanceId = $existingInstance.Reservations[0].Instances[0].InstanceId
        $publicIp = $existingInstance.Reservations[0].Instances[0].PublicIpAddress
        Write-Host "Instance $nodeName already exists with ID: $instanceId, IP: $publicIp"
    } else {
        # Create new instance
        $instanceJson = aws ec2 run-instances `
            --image-id $AMI_ID `
            --count 1 `
            --instance-type $INSTANCE_TYPE `
            --key-name $KEY_NAME `
            --security-group-ids $securityGroupId `
            --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$nodeName}]" `
            --region $AWS_REGION
            
        $instance = $instanceJson | ConvertFrom-Json
        $instanceId = $instance.Instances[0].InstanceId
        
        Write-Host "Waiting for instance $instanceId to start..."
        aws ec2 wait instance-running --instance-ids $instanceId --region $AWS_REGION
        
        # Get public IP
        $instanceInfoJson = aws ec2 describe-instances --instance-ids $instanceId --region $AWS_REGION
        $instanceInfo = $instanceInfoJson | ConvertFrom-Json
        $publicIp = $instanceInfo.Reservations[0].Instances[0].PublicIpAddress
        
        Write-Host "Instance $nodeName created with ID: $instanceId, IP: $publicIp"
    }
    
    $instanceIds += $instanceId
    $publicIps += $publicIp
}

# Step 3: Wait for SSH to be available on all instances
Write-Host "Waiting for SSH to be available on all instances..."
foreach ($ip in $publicIps) {
    $sshReady = $false
    $retryCount = 0
    while (-not $sshReady -and $retryCount -lt 10) {
        try {
            $testResult = Test-NetConnection -ComputerName $ip -Port 22 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
            if ($testResult.TcpTestSucceeded) {
                $sshReady = $true
                Write-Host "SSH is available on $ip"
            } else {
                Write-Host "Waiting for SSH on $ip... (attempt $retryCount)"
                Start-Sleep -Seconds 10
                $retryCount++
            }
        } catch {
            Write-Host "Waiting for SSH on $ip... (attempt $retryCount)"
            Start-Sleep -Seconds 10
            $retryCount++
        }
    }
}

# Step 4: Prepare deployment package
Write-Host "Preparing deployment package..."
Remove-Item -Path deploy.zip -ErrorAction SilentlyContinue
Compress-Archive -Path "server.js", "package.json", "deploy/src", "contracts", "public", "src" -DestinationPath deploy.zip -Force

# Step 5: Deploy to each EC2 instance
for ($i=0; $i -lt $NODE_COUNT; $i++) {
    $nodeName = $NODE_NAMES[$i]
    $nodeIp = $publicIps[$i]
    $nodePort = $NODE_PORTS[$i]
    
    Write-Host "Deploying to $nodeName ($nodeIp)..."
    
    # Generate peer config
    $peers = ""
    for ($j=0; $j -lt $NODE_COUNT; $j++) {
        if ($j -ne $i) {
            if ($peers -ne "") {
                $peers += ","
            }
            $peers += "http://$($publicIps[$j]):$($NODE_PORTS[$j])"
        }
    }
    
    # Create setup script
    $setupScript = @"
#!/bin/bash
echo 'Setting up OpenChain Node...'
sudo yum update -y
sudo yum install -y nodejs npm unzip
mkdir -p ~/openchain
cd ~/openchain
unzip -o ~/deploy.zip
npm install
echo "PORT=$nodePort" > .env
echo "NODE_ID=$nodeName" >> .env
echo "PEERS=$peers" >> .env
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
"@
    
    # Save setup script to file
    $setupScript | Out-File -FilePath setup.sh -Encoding ascii -NoNewline

    # Use AWS SSM to copy files and run commands (avoids SSH issues in PowerShell)
    Write-Host "Copying files to $nodeName ($nodeIp)..."
    
    # Use AWS CLI to copy files
    aws ec2-instance-connect send-ssh-public-key --instance-id $instanceIds[$i] --availability-zone $AWS_REGION"a" --instance-os-user ec2-user --ssh-public-key file://.ssh/id_ed25519.pub

    # First, try to use SCP directly
    try {
        Write-Host "Copying deployment package..."
        scp -i "$KEY_NAME.pem" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null deploy.zip "ec2-user@$($nodeIp):/home/ec2-user/deploy.zip"
        scp -i "$KEY_NAME.pem" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null setup.sh "ec2-user@$($nodeIp):/home/ec2-user/setup.sh"
        
        Write-Host "Running setup script..."
        ssh -i "$KEY_NAME.pem" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "ec2-user@$($nodeIp)" "chmod +x /home/ec2-user/setup.sh && /home/ec2-user/setup.sh"
    }
    catch {
        Write-Host "Direct SSH/SCP failed, trying alternative method: $_.Exception.Message"
        
        # If direct SSH fails, store setup information for manual deployment
        New-Item -Path "node-$i-setup" -ItemType Directory -Force | Out-Null
        Copy-Item deploy.zip -Destination "node-$i-setup/" -Force
        Copy-Item setup.sh -Destination "node-$i-setup/" -Force
        
        # Create instructions file
        @"
Manual deployment instructions for Node $i ($nodeName):
IP: $nodeIp
Port: $nodePort

1. Copy the files in this directory to the EC2 instance:
   scp -i ~/.ssh/$KEY_NAME deploy.zip setup.sh ec2-user@${nodeIp}:~/

2. SSH into the instance:
   ssh -i ~/.ssh/$KEY_NAME ec2-user@${nodeIp}

3. Run the setup script:
   chmod +x ~/setup.sh && ~/setup.sh

4. Verify the service is running:
   systemctl status openchain
"@ | Out-File -FilePath "node-$i-setup/README.txt" -Encoding ascii
        
        Write-Host "Setup information saved to node-$i-setup directory for manual deployment"
    }

    Write-Host "Deployment completed for $nodeName ($nodeIp)"
}

# Step 6: Output deployment information
Write-Host "Deployment completed. Node endpoints:"
for ($i=0; $i -lt $NODE_COUNT; $i++) {
    Write-Host "$($NODE_NAMES[$i]): http://$($publicIps[$i]):$($NODE_PORTS[$i])"
}

# Save deployment info to a JSON file
$nodeConfig = @{
    nodes = @()
}
for ($i=0; $i -lt $NODE_COUNT; $i++) {
    $nodeConfig.nodes += @{
        name = $NODE_NAMES[$i]
        url = "http://$($publicIps[$i]):$($NODE_PORTS[$i])"
        ip = $publicIps[$i]
        port = $NODE_PORTS[$i]
    }
}
$nodeConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath nodes-config.json

Write-Host "Deployment information saved to nodes-config.json"
Write-Host "Deployment completed successfully!" 