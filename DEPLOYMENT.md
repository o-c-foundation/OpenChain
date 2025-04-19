# OpenChain Network Deployment Guide

This guide will help you deploy the OpenChain network on AWS.

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI installed and configured
3. Node.js and npm installed
4. Git installed

## Deployment Steps

### 1. Configure AWS CLI

```bash
aws configure
```

Enter your AWS Access Key ID, Secret Access Key, region (e.g., us-east-1), and output format (json).

### 2. Clone the Repository

```bash
git clone https://github.com/o-c-foundation/OpenChain.git
cd OpenChain
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Build the Project

```bash
npm run build
```

### 5. Deploy to AWS

Make the deployment script executable:

```bash
chmod +x scripts/deploy-aws.sh
```

Run the deployment script:

```bash
./scripts/deploy-aws.sh
```

The script will:
- Create an EC2 key pair
- Set up a security group
- Launch 3 EC2 instances
- Install necessary dependencies
- Clone and build the project
- Start the nodes

### 6. Verify Deployment

After deployment, you can verify the nodes are running by:

1. Checking the EC2 instances in the AWS Console
2. Accessing the nodes' APIs:
   - REST API: http://<instance-ip>:3000
   - WebSocket: ws://<instance-ip>:3001

### 7. Network Configuration

The network configuration is stored in `config/network-config.json`. You can modify:
- Port numbers
- Consensus parameters
- Mining rewards
- Peer connection settings
- Sync parameters

### 8. Monitoring

Access the monitoring dashboard at:
- http://<instance-ip>:3000/dashboard

## Security Considerations

1. Keep your AWS credentials secure
2. Store the generated key pair file (`openchain-key.pem`) securely
3. Regularly update the security group rules
4. Monitor instance usage and costs

## Troubleshooting

1. Check EC2 instance status in AWS Console
2. View instance logs:
   ```bash
   ssh -i openchain-key.pem ec2-user@<instance-ip>
   tail -f /var/log/cloud-init-output.log
   ```
3. Check application logs:
   ```bash
   ssh -i openchain-key.pem ec2-user@<instance-ip>
   tail -f OpenChain/logs/app.log
   ```

## Maintenance

1. Regular updates:
   ```bash
   git pull
   npm install
   npm run build
   ```

2. Node restart:
   ```bash
   pm2 restart all
   ```

## Cost Management

- Monitor AWS costs in the AWS Console
- Consider using AWS Cost Explorer
- Set up billing alerts
- Use appropriate instance types based on needs

## Support

For issues or questions:
1. Check the documentation
2. Open an issue on GitHub
3. Contact the development team 