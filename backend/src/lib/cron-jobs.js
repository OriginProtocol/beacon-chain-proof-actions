module.exports = [
  {
    // names should have no spaces or special characters
    name: 'snap_balances',
    schedule: '0 15 * * *', // 3:00 PM daily
    command: 'pwd && node src/tasks/snapBalances.js',
  },
  {
    // names should have no spaces or special characters
    name: 'verify_balances',
    schedule: '3 15 * * *', // 3:03 PM daily
    command: 'node src/tasks/verifyBalances.js',
  },
  {
    // names should have no spaces or special characters
    name: 'verify_deposit',
    //schedule: '30 9,14,19 * * *', // 9:30 AM, 2:30 PM, 7:30 PM daily
    schedule: '*/10 * * * *', // every 10 minutes
    command: 'node src/tasks/verifyDeposit.js',
  },
  {
    // names should have no spaces or special characters
    name: 'clean_cache',
    schedule: '0 13 * * *', // 1:00 PM daily
    command: 'node src/tasks/cleanCache.js',
  }
];
