# Automated Actions

A full-stack application for monitoring and managing automated DeFi operations with cron jobs.

## Architecture

This project is split into two main components:

- **Frontend**: Next.js application (port 3000) - User interface for monitoring job runs
- **Backend**: Express.js API server (port 3001) - API endpoints and database operations
- **Database**: PostgreSQL - Stores job execution logs and metadata

## Features

- 🔄 Automated cron job execution of Hardhat tasks
- 📊 Real-time monitoring dashboard for job runs
- 💰 Wallet balance and information display
- 🗄️ PostgreSQL database for persistent logging
- 🐳 Docker containerization for easy deployment

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Docker & Docker Compose (for containerized deployment)

### Development Setup

1. **Clone Origin Dollar Repository:**
   ```bash
   # The origin-dollar repository has been moved to backend/origin-dollar/
   # If you need to update it, you can pull changes from the original repo
   cd backend/origin-dollar
   git pull origin master
   ```

2. **Install dependencies:**
   ```bash
   # Install all workspace dependencies
   pnpm install
   ```

3. **Environment Setup:**
   - Copy `.env` and configure database and wallet settings
   - Configure `backend/.env` with backend-specific settings

4. **Start both services:**
   ```bash
   # Start frontend and backend together
   pnpm run dev:full

   # Or start separately:
   pnpm run backend:dev  # Backend on port 3001
   pnpm run dev          # Frontend on port 3000
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health check: http://localhost:3001/health

### Production Setup

```bash
# Build and start with Docker Compose
docker-compose up --build

# Or start manually:
npm run backend:start  # Backend
npm run start          # Frontend (after build)
```

## API Endpoints

- `GET /api/job-names` - List job names with execution counts
- `GET /api/runs` - Paginated job execution history
- `GET /api/wallet-info` - Wallet balance and address information
- `POST /api/update-repo` - Update the Origin Dollar repository via git pull
- `GET /health` - Backend health check

### Repository Update Endpoint

**POST `/api/update-repo`**

Updates the Origin Dollar smart contracts repository by performing a `git pull` operation. This allows updating the contracts without rebuilding the Docker container.

**Response:**
```json
{
  "success": true,
  "message": "Repository updated successfully",
  "output": "Merge made by the 'ort' strategy...\n13 files changed...",
  "timestamp": "2025-09-27T00:04:21.068Z"
}
```

**Error Response:**
```json
{
  "error": "Failed to update repository",
  "details": "Error message from git command"
}
```

## Cron Jobs

The application runs automated Hardhat tasks:
- `fund_taks`: Funds accounts on mainnet
- `validator_snap_balances`: Takes validator balance snapshots

Configure job schedules in `backend/src/lib/cron-jobs.js`. Jobs execute Hardhat tasks from `backend/origin-dollar/contracts/`.

## Project Structure

```
├── backend/                 # Express.js API server
│   ├── origin-dollar/       # Origin Protocol smart contracts
│   ├── src/
│   │   ├── lib/
│   │   │   ├── cron-jobs.js # Cron job configurations
│   │   │   └── db.js       # Database connection
│   │   ├── routes/         # API route handlers
│   │   ├── scripts/
│   │   │   └── run-cron.js # Cron job runner script
│   │   └── server.js       # Main server file
│   └── package.json
├── src/                     # Next.js frontend (UI only)
│   ├── app/
│   │   └── page.js         # Main dashboard (job monitoring + repo management)
│   └── scripts/
│     └── testpg.js         # Database test script
├── docker-compose.yml       # Multi-service setup
└── Dockerfile.backend       # Backend container config
```

## Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### Backend (backend/.env)
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
PG_HOST=localhost
PG_USER=postgres
PG_PASSWORD=password
PG_DATABASE=automated_actions
PG_PORT=5432

# Wallet
DEPLOYER_PK=your_private_key_here
PROVIDER_URL=https://mainnet.infura.io/v3/your_project_id
```

## Scripts

- `pnpm run dev` - Start frontend in development
- `pnpm run backend:dev` - Start backend in development
- `pnpm run dev:full` - Start both frontend and backend
- `pnpm run run-cron` - Execute cron jobs manually

## Security Notes

- API endpoints include CORS configuration
- Helmet.js provides security headers
- Wallet private keys should be stored securely
- Consider authentication for production deployments
