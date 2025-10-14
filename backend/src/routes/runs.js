const { Hono } = require('hono');
const { db } = require('../lib/db.js');

const router = new Hono();

router.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 10;
    const jobName = c.req.query('job_name') || null;
    const offset = (page - 1) * limit;

    let countQuery = `SELECT COUNT(*) FROM job_runs`;
    let runsQuery = `SELECT * FROM job_runs ORDER BY run_time DESC LIMIT $1 OFFSET $2`;
    let params = [limit, offset];

    if (jobName) {
      countQuery = `SELECT COUNT(*) FROM job_runs WHERE job_name = $1`;
      runsQuery = `SELECT * FROM job_runs WHERE job_name = $1 ORDER BY run_time DESC LIMIT $2 OFFSET $3`;
      params = [jobName, limit, offset];
    }

    // Fetch total count
    const countResult = await db.query(countQuery, jobName ? [jobName] : []);
    const total = parseInt(countResult.rows[0].count);

    // Fetch runs
    const runsResult = await db.query(runsQuery, params);

    return c.json({ runs: runsResult.rows, total });
  } catch (error) {
    console.error('API error:', error);
    return c.json({ error: 'Failed to fetch runs' }, 500);
  }
});

module.exports = router;
