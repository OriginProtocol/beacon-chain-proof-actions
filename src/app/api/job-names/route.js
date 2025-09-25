import { db } from '../../../lib/db'; // Adjust path as needed

export async function GET() {
  try {
    // Fetch distinct job names and their counts (overall)
    const jobNamesQuery = 'SELECT job_name, COUNT(*) as count FROM job_runs GROUP BY job_name ORDER BY job_name';
    const jobNamesResult = await db.query(jobNamesQuery);
    const jobNames = jobNamesResult.rows.map(row => ({ name: row.job_name, count: parseInt(row.count) }));

    return new Response(JSON.stringify({ jobNames }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch job names' }), { status: 500 });
  }
}
