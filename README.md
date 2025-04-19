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