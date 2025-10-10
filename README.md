# Beacon chain proof actions

A full-stack application for executing cron-job off-chain DeFi operations to support OETH validator staking strategy. UI displays the historical record of executed actions.

## Architecture

This project is split into two main components:

- **Frontend**: Next.js application (port 3000) - User interface for monitoring job runs and wallet information
- **Backend**: Express.js API server (port 3001) - API endpoints, cron job orchestration, and database operations
- **Tasks**: Standalone Node.js scripts for blockchain operations (snap balances, verify deposits, verify balances etc.)
- **Database**: PostgreSQL - Stores job execution logs and metadata

## Features

- 🔄 Automated cron job execution for Ethereum staking operations
- 📊 Real-time monitoring dashboard for job runs and transaction history
- 💰 Wallet balance monitoring and Etherscan integration
- 🧹 Automated cache cleanup and file management
- 🗄️ PostgreSQL database for persistent logging and job tracking
- 🐳 Docker containerization with concurrent server + cron execution
- 🔐 Secure signer management (wallet or Defender relay)
- ⚡ Gas optimization and transaction monitoring

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Dockerized version)
- Docker & Docker Compose (recommended for deployment)
- Ethereum RPC provider (Infura, Alchemy, or local node)
- Etherscan API key for transaction monitoring

### Development Setup

1. **Clone and Install Dependencies:**
   ```bash
   # Install all workspace dependencies
   pnpm install
   
   # Or if using npm:
   npm install
   ```

2. **Environment Setup:**
   - Copy `dev.env` to `.env` (frontend) and `backend/dev.env` to `backend/.env`
   - Configure database connection, Ethereum provider, and wallet private keys
   - Set `ETHERSCAN_API_KEY` for transaction links
   - Configure one of the transaction signing options
      - Configure `TASK_EXECUTOR_PRIVATE_KEY` for wallet signer
      - Configure `DEFENDER_API_KEY` & `HOODI_DEFENDER_API_SECRET` for Defender relayer signer

3. **Start Services:**
   ```bash
   # Start both frontend and backend with cron jobs
   pnpm run dev:full
   
   # Or start separately:
   pnpm run backend:dev  # Backend API + cron on port 3001
   pnpm run dev          # Frontend on port 3000 (in another terminal)

   # Run the cronjob service that executes the tasks
   pnpm run run-cron
   ```

4. **Access the Application:**
   - Frontend Dashboard: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

### Docker Development

```bash
# Start all services with Docker Compose
docker-compose up --build

# Access the same URLs as above
# View combined logs:
docker-compose logs -f

# Run specific service:
docker-compose up backend  # Backend only
```

## Production Deployment

### Docker Compose (Recommended)

```bash
# Production build and start
docker-compose -f docker-compose.prod.yml up -d --build

# View service logs
docker-compose logs -f backend  # Server + cron logs
docker-compose logs -f frontend # Frontend logs (if separate)

# Scale services
docker-compose up -d --scale backend=2

# Update deployment
docker-compose pull && docker-compose up -d --build
```

### Environment Variables

#### Frontend (.env.local)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_ETHERSCAN_NETWORK=mainnet
```

#### Backend (backend/.env)
```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://localhost:3000

# Database
PG_HOST=localhost
PG_USER=postgres
PG_PASSWORD=password
PG_DATABASE=automated_actions
PG_PORT=5432
PG_SSL=false

# Beacon Chain
# Execution layer provider: e.g. https://eth-mainnet.g.alchemy.com/v2...
PROVIDER_URL=
# Beacon chain provider: e.g. https://blue-white-gadget.ethereum-hoodi.quiknode.pro/...
BEACON_PROVIDER_URL=
# API Key for https://beaconcha.in/
BEACONCHAIN_API_KEY=Nk81d1d6Z01DQnFoVEZGeU9RcGhHYll5VjNQTA

# staking strategy address and view cotract for mainnet and hoodi. PROVIDER_URL will determine whether to use mainnet or hoodie
STAKING_STRATEGY_PROXY=
STAKING_STRATEGY_VIEW=
STAKING_STRATEGY_HOODI_PROXY=0xb5B92DEFC0a9623E31e10Fe0BaE02610bf76fd09
STAKING_STRATEGY_HOODI_VIEW=0x13eDDe0650E41f3B54E43f6783EA6eFD49F0C804

# Optional limit of maximum Gas Price. If current network prices go above this price the transaction 
# is not attempted. Leave empty for no limit
MAX_GAS_PRICE_GWEI=

# wallet that will be executing the on-chain transactions without 0x prefix
# if below key is configured it will be prioritised. If the key is not configured
# then the defender signer will attempt to be created
TASK_EXECUTOR_PRIVATE_KEY=0x_your_wallet_private_key
# for Defender signer. PROVIDER_URL will determine whether to use mainnet or hoodie
DEFENDER_API_KEY=
HOODI_DEFENDER_API_KEY=
DEFENDER_API_SECRET=
HOODI_DEFENDER_API_SECRET=
```

## API Endpoints

- `GET /health` - Backend health check
- `GET /api/job-names` - List scheduled jobs with execution statistics
- `GET /api/runs` - Paginated job execution history (`?page=1&limit=20&job_name=snap_balances`)
- `GET /api/wallet-info` - Current wallet address, balance, and Etherscan link
- `GET /api/gas-price` - Current recommended gas price for transactions

### Job Runs Response Example
```json
{
  "runs": [
    {
      "id": 1,
      "job_name": "snap_balances",
      "status": "completed",
      "started_at": "2025-01-09T15:00:00.000Z",
      "completed_at": "2025-01-09T15:00:45.000Z",
      "duration_ms": 45000,
      "gas_used": "1250000",
      "gas_cost_eth": "0.00325",
      "output": "Balances snapped successfully - Block root: 0x...",
      "error": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

## Automated Tasks

The system runs scheduled blockchain operations via cron jobs:

| Job Name | Schedule | Description |
|----------|----------|-------------|
| `snap_balances` | 3:00 PM daily | Snapshot validator balances to smart contract |
| `verify_balances` | 3:03 PM daily | Verify staking balances against beacon chain |
| `verify_deposit` | 9:30 AM, 2:30 PM, 7:30 PM daily | Process and verify pending deposits |
| `clean_cache` | 1:00 PM daily | Remove cache files older than 5 days |

### Customizing Schedules

Edit `backend/src/lib/cron-jobs.js` to modify timing:

```js
module.exports = [
  {
    name: 'snap_balances',
    schedule: '0 15 * * *', // 3:00 PM daily (cron format)
    command: 'node src/tasks/snapBalances.js',
  },
  // ... other jobs
];
```

## Project Structure

```
automated-actions/
├── backend/                          # Express.js API + Cron Orchestration
│   ├── src/
│   │   ├── lib/
│   │   │   ├── cron-jobs.js         # Job schedule definitions
│   │   │   └── db.js                # PostgreSQL connection
│   │   ├── routes/                  # API endpoints (job-names, runs, wallet-info)
│   │   ├── scripts/
│   │   │   └── run-cron.js          # Cron job executor
│   │   ├── server.js                # Main Express server
│   │   └── tasks/                   # Standalone blockchain operations
│   │       ├── snapBalances.js      # Snapshot validator balances
│   │       ├── verifyBalances.js    # Verify staking balances
│   │       ├── verifyDeposit.js     # Process pending deposits
│   │       ├── cleanCache.js        # Cache cleanup utility
│   │       └── utils/               # Shared utilities (signers, proofs, beacon)
│   │           ├── common.js        # Cache management, contracts
│   │           ├── singer.js        # Wallet/Defender signer management
│   │           ├── utils.js         # Transaction execution, gas estimation
│   │           ├── beacon.js        # Beacon chain state processing
│   │           └── proofs.js        # Merkle proof generation/verification
│   ├── package.json                 # Backend dependencies
│   └── dev.env                      # Backend environment template
├── src/                             # Next.js Frontend
│   ├── app/                         # App Router pages
│   │   ├── page.js                  # Main dashboard (job monitoring)
│   │   ├── layout.js                # Root layout with theme provider
│   │   └── globals.css              # Global styles
│   └── utils/                       # Frontend utilities
│       └── time.js                  # Date/time formatting
├── docker-compose.yml               # Development multi-service setup
├── Dockerfile.backend               # Backend container (server + cron)
├── pnpm-workspace.yaml              # Monorepo workspace config
└── dev.env                          # Root environment template
```

## Scripts

### Development
```bash
pnpm run dev:full          # Start everything (frontend + backend + cron)
pnpm run backend:dev       # Backend API + cron jobs only
pnpm run dev               # Frontend only
node backend/src/tasks/snapBalances.js  # Run specific task manually
```

### Production
```bash
npm run build              # Build frontend for production
npm run start              # Start backend in production
docker-compose up -d       # Dockerized production deployment
```

### Utilities
```bash
node backend/src/tasks/cleanCache.js    # Manual cache cleanup
node backend/src/scripts/run-cron.js    # Run all cron jobs once
pnpm run db:migrate          # Database migrations (if using Prisma)
```

## Security & Best Practices

- **Private Keys**: Use environment variables or secret management (AWS Secrets Manager, HashiCorp Vault)
- **Rate Limiting**: API endpoints include rate limiting middleware
- **CORS**: Configured for frontend-only access in production
- **HTTPS**: Use reverse proxy (nginx, Caddy) for SSL termination
- **Monitoring**: Integrate with logging services (Sentry, DataDog) for error tracking
- **Backup**: Regular database backups and cache pruning

## Troubleshooting

### Common Issues

1. **Cron Jobs Not Running**
   - Check `backend/src/lib/cron-jobs.js` syntax
   - Verify `run-cron.js` is executing without errors
   - Ensure tasks have proper error handling

2. **Database Connection Failed**
   ```bash
   # Test database connection
   node backend/src/scripts/testpg.js
   
   # Check environment variables
   cat backend/.env | grep DATABASE_URL
   ```

3. **Ethereum RPC Errors**
   - Verify `ETHEREUM_RPC_URL` is accessible
   - Check rate limits with your provider
   - Test signer configuration in `backend/src/tasks/utils/singer.js`

4. **Docker Issues**
   ```bash
   # Rebuild containers
   docker-compose down && docker-compose up --build
   
   # Check container logs
   docker-compose logs backend
   
   # Clear Docker cache
   docker system prune -f
   ```

### Logs & Debugging

- **Application Logs**: `docker-compose logs -f backend` or `tail -f backend/logs/*.log`
- **Database Logs**: Enable PostgreSQL logging in `postgresql.conf`
- **Blockchain Logs**: Tasks output detailed transaction information to console
- **Frontend Errors**: Browser DevTools + Next.js error boundaries

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Built for Ethereum staking automation and DeFi operations monitoring. Contributions welcome!*
