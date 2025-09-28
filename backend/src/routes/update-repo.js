const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const router = express.Router();

// POST /api/update-repo
router.post('/', async (req, res) => {
  try {
    const repoPath = path.join(__dirname, '../..', 'origin-dollar');

    // Execute git pull with merge strategy in the origin-dollar directory
    exec('git pull --no-rebase origin master', { cwd: repoPath }, (error, stdout, stderr) => {
      if (error) {
        console.error('Git pull error:', error);
        return res.status(500).json({
          error: 'Failed to update repository',
          details: error.message
        });
      }

      console.log('Repository updated successfully');
      res.json({
        success: true,
        message: 'Repository updated successfully',
        output: stdout.trim(),
        timestamp: new Date().toISOString()
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
