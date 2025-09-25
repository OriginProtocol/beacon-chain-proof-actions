'use server'

import { db } from '../../../lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page')) || 1;
  const limit = parseInt(searchParams.get('limit')) || 10;
  const jobName = searchParams.get('job_name') || null; // Optional filter
  const offset = (page - 1) * limit;

  try {
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
    return new Response(JSON.stringify({ runs: runs.rows, total }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API error:', error);
    throw error;
    return new Response(JSON.stringify({ error: 'Failed to fetch runs' }), { status: 500 });
  }
}
