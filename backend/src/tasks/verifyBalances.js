#!/usr/bin/env node

require('dotenv').config();

const { ethers, formatUnits } = require('ethers');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { environmentVariableCheck, addCommonRuntimArgs, getContracts } = require('./utils/common');
const { executeTransaction, findEventInReceipt, toHex } = require('./utils/utils');
const { getBeaconBlock } = require('./utils/beacon');
const { 
  generatePendingDepositsContainerProof,
  generatePendingDepositProof,
  generateBalancesContainerProof,
  generateBalanceProof
} = require('./utils/proofs');
const { ZERO_BYTES32 } = require('./utils/constants');

const argv = addCommonRuntimArgs(yargs(hideBin(process.argv))
  .usage('Standalone verifyBalances script\\n\\nUsage: $0 [options]'))
    .help()
    .parse();


async function verifyBalancesStandalone() {
  await environmentVariableCheck(argv.dryRun);
  const { stakingStrategy, stakingStrategyView } = await getContracts();
  
  console.log('\n--- Executing verifyBalances ---');

  // Check current snapped balance first
  const snappedBalance = await stakingStrategy.snappedBalance();
  if (snappedBalance.timestamp == 0) {
    console.warn("⚠️ No snapped balance found. Exiting...");
    return;
  }
  const slot = snappedBalance.blockRoot;
  console.log(`Using block root to verify balances: ${slot}`);

  // Uses the beacon chain data for the beacon block root
  const { blockView, blockTree, stateView } = await getBeaconBlock(slot);
  const verificationSlot = blockView.slot;

  const {
    leaf: pendingDepositContainerRoot,
    proof: pendingDepositContainerProof,
  } = await generatePendingDepositsContainerProof({
    blockView,
    blockTree,
    stateView,
  });

  let pendingDepositIndexes = [];
  let pendingDepositRoots = [];
  let pendingDepositProofs = [];

  const pendingDeposits = await stakingStrategyView.getPendingDeposits();
  // For each of the strategy's pending deposits
  for (const deposit of pendingDeposits) {
    // Find the strategy's deposit in the beacon chain's pending deposits
    let pendingDepositIndex = -1;
    for (let i = 0; i < stateView.pendingDeposits.length; i++) {
      const pd = stateView.pendingDeposits.get(i);
      if (toHex(pd.hashTreeRoot()) === deposit.pendingDepositRoot) {
        console.log(
          `Found pending deposit with root ${deposit.pendingDepositRoot} at index ${i}`
        );
        pendingDepositIndex = i;
        pendingDepositIndexes.push(pendingDepositIndex);
        pendingDepositRoots.push(deposit.pendingDepositRoot);
        break;
      }
    }
    if (pendingDepositIndex === -1) {
      throw Error(
        `Could not find pending deposit with root hash ${deposit.pendingDepositRoot}`
      );
    }
    const { proof } = await generatePendingDepositProof({
      blockView,
      blockTree,
      stateView,
      depositIndex: pendingDepositIndex,
    });
    pendingDepositProofs.push(proof);
  }

  const verifiedValidators = await stakingStrategyView.getVerifiedValidators();

  let balancesContainerRoot = ZERO_BYTES32;
  let balancesContainerProof = "0x";
  let blockRoot = ZERO_BYTES32;
  if (verifiedValidators.length > 0) {
    const balancesContainerProofData = await generateBalancesContainerProof({
      blockView,
      blockTree,
      stateView,
    });
    balancesContainerRoot = balancesContainerProofData.leaf;
    balancesContainerProof = balancesContainerProofData.proof;
    blockRoot = balancesContainerProofData.root;
  }

  const validatorBalanceLeaves = [];
  const validatorBalanceProofs = [];
  const validatorBalances = [];
  for (const validator of verifiedValidators) {
    const { proof, leaf, balance } = await generateBalanceProof({
      validatorIndex: validator.index,
      blockView,
      blockTree,
      stateView,
    });
    validatorBalanceLeaves.push(leaf);
    validatorBalanceProofs.push(proof);
    validatorBalances.push(balance);

    console.log(
      `Validator ${validator.index} has balance: ${formatUnits(balance, 9)} ETH`
    );
  }
  const validatorBalancesFormatted = validatorBalances.map((bal) =>
    formatUnits(bal, 9)
  );

  if (argv.dryRun) {
    console.log(`snapped slot                      : ${verificationSlot}`);
    console.log(`snap balances block root          : ${blockRoot}`);
    console.log(`\nbalancesContainerRoot           : ${balancesContainerRoot}`);
    console.log(`\nbalancesContainerProof:\n${balancesContainerProof}`);
    console.log(
      `\nvalidatorBalanceLeaves:\n[${validatorBalanceLeaves
        .map((leaf) => `"${leaf}"`)
        .join(",\n")}]`
    );
    console.log(
      `\nvalidatorBalanceProofs:\n[${validatorBalanceProofs
        .map((proof) => `"${proof}"`)
        .join(",\n")}]`
    );
    console.log(
      `validatorBalances: [${validatorBalancesFormatted.join(", ")}]`
    );
    console.log(
      `\npendingDepositsContainerRoot           : ${pendingDepositContainerRoot}`
    );
    console.log(
      `\npendingDepositsContainerProof:\n${pendingDepositContainerProof}`
    );
    console.log(
      `\npendingDepositIndexes:\n[${pendingDepositIndexes
        .map((index) => `"${index}"`)
        .join(",")}]`
    );
    console.log(
      `\npendingDepositProofs:\n[${pendingDepositProofs
        .map((proof) => `"${proof}"`)
        .join(",\n")}]`
    );
    return;
  }

  const balanceProofs = {
    balancesContainerRoot,
    balancesContainerProof,
    validatorBalanceLeaves,
    validatorBalanceProofs,
  };
  const pendingDepositProofsData = {
    pendingDepositContainerRoot,
    pendingDepositContainerProof,
    pendingDepositIndexes,
    pendingDepositRoots,
    pendingDepositProofs,
  };

  console.log(
    `About to verify ${verifiedValidators.length} validator balances for slot ${verificationSlot} to beacon block root ${blockRoot}`
  );
  console.log(balanceProofs);
  console.log(pendingDepositProofsData);

  const { receipt } = await executeTransaction(stakingStrategy.verifyBalances, [balanceProofs, pendingDepositProofsData], argv.dryRun);

  const verifiedEvent = await findEventInReceipt(receipt, stakingStrategy, 'BalancesVerified');

  if (verifiedEvent) {
    console.log(`\n🎉 Balances verified successfully!`);
    console.log(`   Beacon block root: ${verifiedEvent.args.blockRoot}`);
  } else {
    console.log('Transaction succeeded but BalancesVerified event not found');
  }
}

if (require.main === module) {
  verifyBalancesStandalone().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { verifyBalancesStandalone };
