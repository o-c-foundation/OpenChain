# Deploying OpenChain with AWS CodeDeploy

This repository is configured for automatic deployment using AWS CodeDeploy. Follow these steps to set up the deployment pipeline.

## Prerequisites

1. An AWS account with appropriate permissions
2. AWS CLI installed and configured on your local machine
3. GitHub repository with your OpenChain code

## Setup Instructions

### 1. Create IAM Roles

First, create the necessary IAM roles for CodeDeploy:

1. Create a service role for CodeDeploy
2. Create an instance profile role for EC2 instances

### 2. Launch EC2 Instances

Launch EC2 instances with the following configuration:

- Amazon Linux 2/Amazon Linux 2023 AMI
- t2.micro or larger instance type
- The EC2 instance profile role you created
- Security group with ports 22 (SSH), 3000-3002 (Application) open

Tag your instances with a key-value pair like `Environment:OpenChain` to identify them for deployment.

### 3. Install CodeDeploy Agent

The CodeDeploy agent should be installed on your EC2 instances. This is handled by the deployment scripts in this repository.

### 4. Create CodeDeploy Application

In the AWS Management Console:

1. Go to the CodeDeploy service
2. Create a new application
   - Name: `OpenChain`
   - Compute platform: `EC2/On-premises`
3. Create a new deployment group
   - Name: `OpenChain-Nodes`
   - Service role: Select the CodeDeploy service role you created
   - Deployment type: In-place
   - Environment configuration: Select Amazon EC2 instances and specify the tags you used
   - Deployment settings: OneAtATime is recommended
   - Load balancer: No load balancer (or configure if needed)

### 5. Configure GitHub Integration

To automatically deploy from GitHub:

1. Create a new AWS CodePipeline
2. Configure GitHub as the source provider
3. Use CodeDeploy as the deployment provider
4. Connect your GitHub repository and branch

### 6. Manual Deployment

For manual deployment:

```bash
# Create a deployment bundle
zip -r deployment.zip . -x "*.git*" "node_modules/*" "*.zip" "*.pem"

# Deploy using AWS CLI
aws deploy create-deployment \
  --application-name OpenChain \
  --deployment-group-name OpenChain-Nodes \
  --deployment-config-name CodeDeployDefault.OneAtATime \
  --s3-location bucket=YOUR_BUCKET,key=deployment.zip,bundleType=zip
```

## Deployment Process

The deployment process follows these steps:

1. **BeforeInstall**: Updates system packages and installs dependencies
2. **AfterInstall**: Sets up the application, configures environment, creates systemd service
3. **ApplicationStart**: Starts the application service
4. **ApplicationStop**: Stops the application if it's running

## Networking Configuration

For a multi-node setup, you'll need to configure the nodes to communicate with each other:

1. Ensure EC2 security groups allow communication between instances on ports 3000-3002
2. Update the `.env` file in `after-install.sh` to discover peer nodes
3. Consider using AWS Service Discovery or a similar service for dynamic node discovery

## Monitoring

Monitor your deployment:

1. Check CodeDeploy deployment status in the AWS Console
2. View application logs: `journalctl -u openchain`
3. Check service status: `systemctl status openchain`

## Troubleshooting

Common issues and solutions:

- **Deployment fails**: Check `/var/log/aws/codedeploy-agent/codedeploy-agent.log`
- **Application doesn't start**: Check `journalctl -u openchain`
- **Permission issues**: Ensure proper permissions with `chown -R ec2-user:ec2-user /home/ec2-user/openchain` 