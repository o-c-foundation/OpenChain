# OpenChain

An educational blockchain simulation platform designed to demonstrate blockchain concepts and mechanisms in real-time.

## Features

- Real-time blockchain simulation
- Interactive block explorer
- Admin control panel
- Network scenario simulations
- Educational tooltips and explanations
- Performance monitoring and visualization

## Technology Stack

- Node.js (v16+)
- TypeScript
- WebSocket for real-time updates
- Chart.js for visualizations
- AWS deployment support

## Local Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/openchain.git
cd openchain
```

2. Install dependencies:
```bash
npm install
```

3. Create a .env file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run dev
```

5. Access the application:
- Block Explorer: http://localhost:8080
- Admin Panel: http://localhost:8080/admin.html

## Production Deployment

### Prerequisites

1. Install AWS CLI:
```bash
# Windows (using PowerShell as Administrator)
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi

# Mac
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

2. Configure AWS credentials:
```bash
aws configure
```

3. Deploy to AWS:
```bash
npm run aws:deploy
```

## Admin Access

Default admin credentials (change in production):
- Username: admin
- Password: openchain

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run linting
- `npm run format` - Format code
- `npm run aws:init` - Initialize AWS environment
- `npm run aws:deploy` - Deploy to AWS

## Project Structure

```
openchain/
├── src/
│   ├── blockchain/    # Core blockchain implementation
│   ├── simulation/    # Simulation logic
│   ├── api/          # REST API endpoints
│   └── websocket/    # WebSocket handlers
├── public/           # Static files
├── config/          # Configuration files
├── tests/           # Test files
└── .ebextensions/   # AWS configuration
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Deployment Guide

### Prerequisites
- Node.js v14+ and npm
- MongoDB (for blockchain data storage)
- SSL certificate (for production deployment)

### Local Development
1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the development server:
```bash
npm run dev
```

### Production Deployment

#### Option 1: AWS Deployment
1. Set up an EC2 instance:
   - Use t2.medium or higher
   - Ubuntu Server 20.04 LTS
   - Configure security groups for ports 80, 443, and 3000

2. Install dependencies:
```bash
sudo apt update
sudo apt install nodejs npm mongodb nginx
```

3. Configure Nginx:
```bash
sudo nano /etc/nginx/sites-available/openchain
```
Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/openchain /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

5. Set up SSL with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

6. Deploy the application:
```bash
git clone https://github.com/yourusername/openchain.git
cd openchain
npm install
npm run build
npm start
```

7. Set up PM2 for process management:
```bash
npm install -g pm2
pm2 start dist/index.js --name openchain
pm2 startup
pm2 save
```

#### Option 2: Docker Deployment
1. Build the Docker image:
```bash
docker build -t openchain .
```

2. Run with Docker Compose:
```bash
docker-compose up -d
```

### Monitoring and Maintenance
- Monitor system health using the built-in dashboard at `/dashboard`
- View network simulation at `/simulation`
- Access block explorer at `/explorer`
- Check wallet interface at `/wallet`

### Security Considerations
- Keep MongoDB secure and regularly backed up
- Rotate API keys and secrets regularly
- Monitor system resources and set up alerts
- Keep all dependencies updated
- Enable rate limiting for API endpoints
- Set up DDoS protection

### Troubleshooting
Common issues and solutions:
1. WebSocket Connection Failed:
   - Check firewall settings
   - Verify correct port configuration
   - Ensure SSL is properly set up

2. Performance Issues:
   - Monitor system resources
   - Check MongoDB indexes
   - Verify network connectivity
   - Optimize blockchain data storage

3. Simulation Not Working:
   - Check WebSocket connection
   - Verify browser compatibility
   - Clear browser cache
   - Check console for errors

For more detailed troubleshooting, check the logs:
```bash
pm2 logs openchain
```

### Support and Updates
- Report issues on GitHub
- Check for updates regularly
- Subscribe to security notifications
- Join the community forum for support

## License
MIT License - See LICENSE file for details 