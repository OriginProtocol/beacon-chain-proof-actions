#!/usr/bin/env node

require('dotenv').config();

const { ethers } = require('ethers');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { environmentVariableCheck, addCommonRuntimArgs, getContracts } = require('./common/common');
const { executeTransaction, findEventInReceipt } = require('./common/utils');
const minSnapBalancesDelay = 35 * 12 + 10 // 35 contract second delay + 10 seconds buffer

const argv = addCommonRuntimArgs(yargs(hideBin(process.argv))
  .usage('Standalone snapBalances script\\n\\nUsage: $0 [options]'))
    .help()
    .parse();

// Strategy contract ABI - minimal for snapBalances
const strategyAbi = [
  "function snapBalances() external",
  "event BalancesSnapped(bytes32 indexed blockRoot, uint256 ethBalance)",
  "function snappedBalance() external view returns (bytes32 blockRoot, uint64 timestamp, uint128 ethBalance)"
];

async function snapBalancesStandalone() {
  await environmentVariableCheck(argv.dryRun);
  const { stakingStrategy, stakingStrategyView } = await getContracts();
  
  try {
    console.log('\n--- Executing snapBalances ---');
    
    // Check current snapped balance first
    const currentSnappedTime = Number((await stakingStrategy.snappedBalance()).timestamp);
    console.log(`Current snapped timestamp: ${new Date(currentSnappedTime * 1000).toISOString()}`);
    const currentTime = Math.floor(Date.now() / 1000);
    console.log(`Current time: ${new Date(currentTime * 1000).toISOString()}`);

    if (currentSnappedTime + minSnapBalancesDelay > currentTime) {
      console.log("Not enough time has passed since the last snapBalances. Skipping...");
      return;
    }

    if (argv.dryRun) {
      return;
    }

    const { receipt } = await executeTransaction(stakingStrategy.snapBalances, [], argv.dryRun);

    const snappedEvent = await findEventInReceipt(receipt, stakingStrategy, 'BalancesSnapped');

    if (snappedEvent) {
      console.log(`\n🎉 Balances snapped successfully!`);
      console.log(`   Beacon block root: ${snappedEvent.args.blockRoot}`);
      console.log(`   ETH balance: ${ethers.formatEther(snappedEvent.args.ethBalance)} ETH`);
    } else {
      console.log('Transaction succeeded but BalancesSnapped event not found');
    }
    
  } catch (error) {
    console.error('\n❌ Error executing snapBalances:');
    console.error(error.message);    
    process.exit(1);
  }
}

// Make executable and run
if (require.main === module) {
  snapBalancesStandalone().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { snapBalancesStandalone };
