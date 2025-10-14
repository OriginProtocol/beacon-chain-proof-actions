require('dotenv').config(); // Load environment variables from .env
const { Pool } = require('pg');
const path = require('path');

const env = process.env.NODE_ENV || 'development'; // Default to development

const db = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT || 5432,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false, // Optional SSL for hosted DBs
});
console.log('Connected to production PostgreSQL');

// Initialize table (run once or on startup)
async function initDb() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS job_runs (
      id SERIAL PRIMARY KEY,
      job_name TEXT NOT NULL,
      run_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      command TEXT NOT NULL,
      stdout TEXT,
      stderr TEXT,
      success BOOLEAN NOT NULL
    );
  `);
  console.log('Job runs table initialized');
}

async function getLastSuccessfulJobs() {
  const jobNamesQuery = `
    SELECT 
      job_name, 
      EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - MAX(run_time)))::INTEGER as seconds_since_last_run
    FROM job_runs 
    WHERE success = true 
    GROUP BY job_name 
    ORDER BY job_name`;
  const jobNamesResult = await db.query(jobNamesQuery);
  return jobNamesResult.rows.map(row => ({ 
    name: row.job_name, 
    secondsSince: parseInt(row.seconds_since_last_run) 
  }));
}

initDb().catch(err => console.error('DB init error:', err));

module.exports = { db, getLastSuccessfulJobs };