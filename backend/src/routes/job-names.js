const express = require('express');
const { db } = require('../lib/db.js');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Fetch distinct job names and their counts (overall)
    const jobNamesQuery = 'SELECT job_name, COUNT(*) as count FROM job_runs GROUP BY job_name ORDER BY job_name';
    const jobNamesResult = await db.query(jobNamesQuery);
    const jobNames = jobNamesResult.rows.map(row => ({ name: row.job_name, count: parseInt(row.count) }));

    res.json({ jobNames });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Failed to fetch job names' });
  }
});

module.exports = router;
