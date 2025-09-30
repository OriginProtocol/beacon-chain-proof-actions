const { Hono } = require('hono');
const { db } = require('../lib/db.js');

const router = new Hono();

router.get('/', async (c) => {
  try {
    // Fetch distinct job names and their counts (overall)
    const jobNamesQuery = 'SELECT job_name, COUNT(*) as count FROM job_runs GROUP BY job_name ORDER BY job_name';
    const jobNamesResult = await db.query(jobNamesQuery);
    const jobNames = jobNamesResult.rows.map(row => ({ name: row.job_name, count: parseInt(row.count) }));

    return c.json({ jobNames });
  } catch (error) {
    console.error('API error:', error);
    return c.json({ error: 'Failed to fetch job names' }, 500);
  }
});

module.exports = router;
