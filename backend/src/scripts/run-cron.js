require('dotenv').config();
const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');
const { db } = require('../lib/db.js');
const jobs = require('../lib/cron-jobs.js');

const homeDir = path.join(__dirname, '../..');

jobs.forEach(job => {
  cron.schedule(job.schedule, () => {
    const runTime = new Date();
    const fullCommand = job.command;

    // Split command into command and arguments for spawn
    const [command, ...args] = fullCommand.split(' ');

    // Initialize buffers to collect output
    let stdoutBuffer = '';
    let stderrBuffer = '';

    // Spawn the child process
    const child = spawn(command, args, {
      cwd: homeDir,
      env: { ...process.env },
      shell: true // Use shell to support complex commands (e.g., pipes, redirects)
    });

    // Pipe stdout in real-time and collect it
    child.stdout.on('data', (data) => {
      const timestamp = new Date().toISOString();
      process.stdout.write(`[${timestamp}] `);
      process.stdout.write(data); // Real-time piping to parent stdout
      stdoutBuffer += data; // Collect for DB
    });

    // Pipe stderr in real-time and collect it
    child.stderr.on('data', (data) => {
      const timestamp = new Date().toISOString();
      process.stdout.write(`[${timestamp}] `);
      process.stderr.write(data); // Real-time piping to parent stderr
      stderrBuffer += data; // Collect for DB
    });

    // Handle process exit
    child.on('close', async (code) => {
      const success = code === 0; // Success if exit code is 0
      try {
        await db.query(
          'INSERT INTO job_runs (job_name, run_time, command, stdout, stderr, success) VALUES ($1, $2, $3, $4, $5, $6)',
          [job.name, runTime, fullCommand, stdoutBuffer, stderrBuffer, success]
        );
        console.log(`Job "${job.name}" ran at ${runTime}: ${success ? 'Success' : 'Failed'}`);
      } catch (dbError) {
        console.error(`DB insert error for job "${job.name}":`, dbError);
      }
    });

    // Handle spawn errors (e.g., command not found)
    child.on('error', (error) => {
      stderrBuffer += `Spawn error: ${error.message}\n`;
      process.stderr.write(`Spawn error for "${job.name}": ${error.message}\n`);
    });
  });
  console.log(`Scheduled job: ${job.name} (${job.schedule})`);
});

console.log('Cron runner started. Press Ctrl+C to stop.');