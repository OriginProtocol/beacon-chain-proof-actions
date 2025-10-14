require('dotenv').config();

const { Hono } = require('hono');
const { cors } = require('hono/cors');
const { serve } = require('@hono/node-server');
const { getLastSuccessfulJobs } = require('./lib/db');

const app = new Hono();

const PORT = process.env.API_PORT || 3001;

// Middleware
app.use('/*', cors({
  origin: (origin, c) => {
    console.log('Requested Origin:', origin);  // Log to check what’s incoming
    console.log('What is the env var process.env.FRONTEND_URL:', process.env.FRONTEND_URL);  // Log to check what’s incoming
    console.log("process.env.FRONTEND_URL matches", process.env.FRONTEND_URL === origin);

    return origin;  // Reflects back the origin for testing (secure only if you trust sources)
  },
  //origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  allowMethods: ['GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

// Import routes
const jobNamesRoutes = require('./routes/job-names.js');
const runsRoutes = require('./routes/runs.js');
const walletInfoRoutes = require('./routes/wallet-info.js');

// Mount routes
app.route('/api/job-names', jobNamesRoutes);
app.route('/api/runs', runsRoutes);
app.route('/api/wallet-info', walletInfoRoutes);

// Health check endpoint (no rate limiting)
app.get('/health', async (c) => {
  const jobIntervals = await getLastSuccessfulJobs();
  console.log("Job intervals since last successful run:", jobIntervals);
  
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    lastSuccessfulRuns: jobIntervals,
  });
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404);
});

// Start server
serve({
  fetch: app.fetch,
  port: PORT
}, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});
