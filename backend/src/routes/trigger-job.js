const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const { db } = require('../lib/db.js');
const jobs = require('../lib/cron-jobs.js');

const router = express.Router();

// POST /api/trigger-job
router.post('/', async (req, res) => {
  const { jobName } = req.body;

  if (!jobName) {
    return res.status(400).json({
      error: 'Missing jobName parameter',
      message: 'Please provide a jobName in the request body'
    });
  }

  // Find the job configuration
  const job = jobs.find(j => j.name === jobName);
  if (!job) {
    return res.status(404).json({
      error: 'Job not found',
      message: `Job "${jobName}" does not exist`,
      availableJobs: jobs.map(j => ({ name: j.name, schedule: j.schedule }))
    });
  }

  const runTime = new Date();
  const secondaryPath = path.join(__dirname, '../..', './origin-dollar');
  const contractsPath = path.join(secondaryPath, 'contracts');
  const fullCommand = job.command;

  console.log(`Manually triggering job: ${job.name} at ${runTime}`);

  // Execute the job command
  exec(fullCommand, { cwd: contractsPath, env: { ...process.env } }, async (error, stdout, stderr) => {
    const success = !error;

    try {
      // Log the results to the database
      const result = await db.query(
        'INSERT INTO job_runs (job_name, run_time, command, stdout, stderr, success) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [job.name, runTime, fullCommand, stdout, stderr || (error ? error.message : ''), success]
      );

      console.log(`Job "${job.name}" manually triggered at ${runTime}: ${success ? 'Success' : 'Failed'}`);

      console.log("result", result);
      console.log("error", error);
      console.log("stdout", stdout);
      console.log("stderr", stderr);

      // Return the result
      res.json({
        success: true,
        job: {
          name: job.name,
          command: fullCommand,
          runTime: runTime.toISOString(),
          success,
          id: result.rows[0].id
        },
        output: {
          stdout: stdout || null,
          stderr: stderr || (error ? error.message : null)
        },
        message: `Job "${job.name}" executed ${success ? 'successfully' : 'with errors'}`
      });

    } catch (dbError) {
      console.error(`DB insert error for manually triggered job "${job.name}":`, dbError);

      res.status(500).json({
        error: 'Database error',
        message: 'Job executed but failed to log to database',
        job: {
          name: job.name,
          command: fullCommand,
          runTime: runTime.toISOString(),
          success
        },
        output: {
          stdout: stdout || null,
          stderr: stderr || (error ? error.message : null)
        },
        dbError: dbError.message
      });
    }
  });
});

// GET /api/trigger-job - List available jobs
router.get('/', (req, res) => {
  res.json({
    message: 'Available jobs to trigger manually',
    jobs: jobs.map(j => ({
      name: j.name,
      schedule: j.schedule,
      command: j.command
    }))
  });
});

module.exports = router;
