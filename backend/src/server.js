require('dotenv').config();

const { Hono } = require('hono');
const { cors } = require('hono/cors');
const { rateLimiter } = require('hono-rate-limiter');
const { serve } = require('@hono/node-server');

const app = new Hono();

const PORT = process.env.PORT || 3001;

// Rate limiters
const generalLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
});

const strictLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
});

const healthLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 60,
  message: {
    error: 'Too many health check requests',
    retryAfter: '5 minutes'
  },
});

// Middleware
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting - temporarily commented out due to compatibility issue
// app.use('/api/*', generalLimiter);
// app.use('/api/update-repo/*', strictLimiter);
// app.use('/api/trigger-job/*', strictLimiter);
// app.use('/health/*', healthLimiter);

// Import routes (assuming they are now Hono apps)
const jobNamesRoutes = require('./routes/job-names.js');
const runsRoutes = require('./routes/runs.js');
const walletInfoRoutes = require('./routes/wallet-info.js');

// Mount routes
app.route('/api/job-names', jobNamesRoutes);
app.route('/api/runs', runsRoutes);
app.route('/api/wallet-info', walletInfoRoutes);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString()
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
