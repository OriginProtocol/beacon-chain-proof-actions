require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration - allow requests from frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const jobNamesRoutes = require('./routes/job-names.js');
const runsRoutes = require('./routes/runs.js');
const walletInfoRoutes = require('./routes/wallet-info.js');
const updateRepoRoutes = require('./routes/update-repo.js');
const triggerJobRoutes = require('./routes/trigger-job.js');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/job-names', jobNamesRoutes);
app.use('/api/runs', runsRoutes);
app.use('/api/wallet-info', walletInfoRoutes);
app.use('/api/update-repo', updateRepoRoutes);
app.use('/api/trigger-job', triggerJobRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});
