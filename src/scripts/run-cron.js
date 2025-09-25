require('dotenv').config();
const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');
const { db } = require('../lib/db');
const jobs = require('../lib/cron-jobs');

const secondaryPath = path.join(__dirname, '../..', './origin-dollar');
const contractsPath = path.join(secondaryPath, 'contracts'); // Where Hardhat tasks are ran from

jobs.forEach(job => {
  cron.schedule(job.schedule, () => {
    const fullCommand = job.command;
    const runTime = new Date();

    exec(fullCommand, { cwd: contractsPath, env: { ...process.env } }, async (error, stdout, stderr) => {
      const success = !error;
      try {
        await db.query(
          'INSERT INTO job_runs (job_name, run_time, command, stdout, stderr, success) VALUES ($1, $2, $3, $4, $5, $6)',
          [job.name, runTime, fullCommand, stdout, stderr || (error ? error.message : ''), success]
        );
        console.log(`Job "${job.name}" ran at ${runTime}: Success`);
      } catch (dbError) {
        console.error(`DB insert error for job "${job.name}":`, dbError);
      }
    });
  });
  console.log(`Scheduled job: ${job.name} (${job.schedule})`);
});

console.log('Cron runner started. Press Ctrl+C to stop.');

