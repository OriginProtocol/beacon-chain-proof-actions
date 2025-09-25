
module.exports = [
  {
  	// names should have no spaces or special characters
    name: 'fund_taks',
    //schedule: '0 */1 * * *', // Every hour
    schedule: '*/5 * * * * *', // Every 5 seconds
    command: 'pnpm hardhat fund --network mainnet',
  },
  {
  	// names should have no spaces or special characters
    name: 'validator_snap_balances',
    //schedule: '0 */1 * * *', // Every hour
    schedule: '*/5 * * * * *', // Every 5 seconds
    command: 'pnpm hardhat snapBalances --network mainnet',
  }
];

