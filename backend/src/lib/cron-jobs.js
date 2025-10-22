module.exports = [
  {
    // names should have no spaces or special characters
    name: 'snap_balances',
    schedule: '0 9,12,15,18 * * *', // 9:00 AM, 12:00 PM, 3:00 PM, 6:00 PM daily
    command: 'pwd && node src/tasks/snapBalances.js',
  },
  {
    // names should have no spaces or special characters
    name: 'verify_balances',
    schedule: '10 9,12,15,18 * * *', // 9:10 AM, 12:10 PM, 3:10 PM, 6:10 PM daily
    command: 'node src/tasks/verifyBalances.js',
  },
  {
    // names should have no spaces or special characters
    name: 'verify_deposit',
    schedule: '30 9,14,19 * * *', // 9:30 AM, 2:30 PM, 7:30 PM daily
    command: 'node src/tasks/verifyDeposit.js',
  },
  {
    // names should have no spaces or special characters
    name: 'clean_cache',
    schedule: '0 13 * * *', // 1:00 PM daily
    command: 'node src/tasks/cleanCache.js',
  }
];
