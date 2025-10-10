# Beacon chain proof actions Backend

Express.js API server for the Automated Actions application.

## Features

- RESTful API endpoints for job monitoring
- Wallet information retrieval
- PostgreSQL database integration
- CORS enabled for frontend communication
- Security middleware with Helmet

## API Endpoints

### GET /health
Health check endpoint.

### GET /api/job-names
Returns list of job names with execution counts.

**Response:**
```json
{
  "jobNames": [
    {
      "name": "fund_taks",
      "count": 42
    }
  ]
}
```

### GET /api/runs
Returns paginated list of job runs.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `job_name` (string): Filter by specific job name

**Response:**
```json
{
  "runs": [
    {
      "id": 1,
      "job_name": "fund_taks",
      "run_time": "2024-01-01T12:00:00.000Z",
      "command": "pnpm hardhat fund --network mainnet",
      "stdout": "...",
      "stderr": "...",
      "success": true
    }
  ],
  "total": 100
}
```

### GET /api/wallet-info
Returns wallet address, balance, and etherscan link.

**Response:**
```json
{
  "address": "0x1234...",
  "balance": "1.2345",
  "etherscanLink": "https://etherscan.io/address/0x1234..."
}
```

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will start on port 3001 by default.
