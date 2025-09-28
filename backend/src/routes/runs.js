const express = require('express');
const { db } = require('../lib/db.js');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const jobName = req.query.job_name || null; // Optional filter
    const offset = (page - 1) * limit;

    // Build base query with optional filter
    let whereClause = '';
    let countQuery = `SELECT COUNT(*) FROM job_runs`;
    let runsQuery = `SELECT * FROM job_runs ORDER BY run_time DESC LIMIT $1 OFFSET $2`;
    let params = [limit, offset];

    if (jobName) {
      countQuery = `SELECT COUNT(*) FROM job_runs WHERE job_name = $1`;
      runsQuery = `SELECT * FROM job_runs WHERE job_name = $1 ORDER BY run_time DESC LIMIT $2 OFFSET $3`;
      params = [jobName, limit, offset];
    }

    // Fetch total count (filtered if applicable)
    const countResult = await db.query(countQuery, jobName ? [jobName] : []);
    const total = parseInt(countResult.rows[0].count);
    const runs = await db.query(runsQuery, params);

    console.log("runs.rows", runs.rows.length);
    res.json({ runs: runs.rows, total });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Failed to fetch runs' });
  }
});

module.exports = router;
