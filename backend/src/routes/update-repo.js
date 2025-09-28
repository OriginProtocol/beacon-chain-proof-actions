const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const router = express.Router();

// POST /api/update-repo
router.post('/', async (req, res) => {
  try {
    const repoPath = path.join(__dirname, '../..', 'origin-dollar');

    // Execute git pull with merge strategy in the origin-dollar directory
    exec('git pull --no-rebase origin master', { cwd: repoPath }, (gitError, gitStdout, gitStderr) => {
      if (gitError) {
        console.error('Git pull error:', gitError);
        return res.status(500).json({
          error: 'Failed to update repository',
          details: gitError.message,
          gitOutput: gitStderr || gitError.message
        });
      }

      console.log('Repository updated successfully, now installing dependencies...');

      // After successful git pull, run pnpm install
      exec('pnpm install', { cwd: repoPath }, (installError, installStdout, installStderr) => {
        const installSuccess = !installError;

        console.log('Dependencies installation completed:', installSuccess ? 'Success' : 'Failed');

        res.json({
          success: true,
          message: 'Repository updated and dependencies installed successfully',
          gitOutput: gitStdout.trim(),
          installOutput: installStdout.trim() || (installStderr ? installStderr.trim() : ''),
          installSuccess,
          timestamp: new Date().toISOString()
        });
      });
    });

  } catch (error) {
    console.error('Update repo error:', error);
    res.status(500).json({
      error: 'Failed to update repository',
      details: error.message
    });
  }
});

module.exports = router;
