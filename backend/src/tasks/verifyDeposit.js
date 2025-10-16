#!/usr/bin/env node

require('dotenv').config();

const { formatUnits } = require('ethers');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { environmentVariableCheck, addCommonRuntimArgs, getContracts } = require('./utils/common');
const { executeTransaction, findEventInReceipt, toHex } = require('./utils/utils');
const { getBeaconBlock, getSlot } = require('./utils/beacon');
const { 
  generateFirstPendingDepositSlotProof,
  generateValidatorWithdrawableEpochProof
} = require('./utils/proofs');
const { VERIFY_DEPOSIT_SLOT_BUFFER } = require('./utils/constants');

const argv = addCommonRuntimArgs(yargs(hideBin(process.argv))
  .usage('Standalone verifyBalances script\\n\\nUsage: $0 [options]'))
    .help()
    .parse();

// get deposits that have been processed on the beacon chain but not yet validated by the strategy
async function getProcessedDeposits(pendingDeposits) {
  const depositProcessedSlot = await getSlot() - 30;

  console.log(`Checking if any deposits have been processed on slot: ${depositProcessedSlot}`);

  // Uses the beacon chain data for the beacon block root
  const { stateView } = await getBeaconBlock(depositProcessedSlot);

  const pendingDepositMap = {};

  for (let i = 0; i < stateView.pendingDeposits.length; i++) {
    pendingDepositMap[toHex(stateView.pendingDeposits.get(i).hashTreeRoot())] = true;
  }

  const processedDeposits = [];
  for (const deposit of pendingDeposits) {
    if (!pendingDepositMap[deposit.pendingDepositRoot]) {
      processedDeposits.push(deposit);
      console.log(`Found a deposit that has been processed on the beacon chain`);
      console.log(`Pending deposit root: ${deposit.pendingDepositRoot}`);
      console.log(`Validator:            ${deposit.pubKeyHash}`);
      console.log(`Slot:                 ${deposit.slot}`);
      console.log(`Amount:               ${formatUnits(deposit.amountGwei, 'gwei')} ETH`);
    }
  }
  return {processedDeposits, depositProcessedSlot};
}

async function verifyDepositStandalone() {
  await environmentVariableCheck(argv.dryRun);
  const { stakingStrategy, stakingStrategyView } = await getContracts();
  
  console.log('\n--- Executing verifyDeposit ---');
  const pendingDeposits = await stakingStrategyView.getPendingDeposits();

  if (pendingDeposits.length === 0) {
    console.log('No pending deposits found on the strategy');
    return;
  }

  const {processedDeposits, depositProcessedSlot} = await getProcessedDeposits(pendingDeposits);
  
  /**
   * Deposit verification requires the depositProcessedSlot to be smaller than the 
   * snapshot slot. That can easily be achieved by calling the snapBalances just before
   * calling the verifyDeposit.
   */
  if (processedDeposits.length > 0) {
    const { receipt } = await executeTransaction(stakingStrategy.snapBalances, [], argv.dryRun);
  } else {
    console.log(`There are ${pendingDeposits} pending deposits but none have been processed on the beacon chain yet`);
  }

  for (const deposit of processedDeposits) {
    try {
      await verifyDeposit(deposit, depositProcessedSlot);
    } catch (error) {
      console.error(`Error verifying deposit: ${error}`);
    }
  }
}

async function verifyDeposit(deposit, depositProcessedSlot) {
  const { stakingStrategy } = await getContracts();
  let strategyDepositSlot = 0;

  const { slot, amountGwei, pubKeyHash, status, depositIndex } = await stakingStrategy.deposits(deposit.pendingDepositRoot);
  console.log(
    `🔍 Found deposit for ${formatUnits(
      amountGwei,
      'gwei'
    )} ETH, from slot ${slot} with public key hash ${
      pubKeyHash
    } and deposit index ${depositIndex}`
  );
  const strategyValidator = await stakingStrategy.validator(pubKeyHash);
  strategyValidatorIndex = Number(strategyValidator.index);

  if (strategyValidator.state !== 3n)
    throw Error(
      `Validator with pub key hash ${pubKeyHash} with index ${strategyValidatorIndex} is not VERIFIED. Status: ${strategyValidator.state}`
    );

  strategyDepositSlot = slot;
  if (strategyDepositSlot == 0) {
    throw Error(`Failed to find deposit with root ${deposit.pendingDepositRoot}`);
  }
  console.log(
    `Verifying deposit of ${formatUnits(
      amountGwei,
      9
    )} ETH at slot ${strategyDepositSlot} with public key hash ${pubKeyHash}`
  );

  if (status !== 1n) {
    throw Error(
      `Deposit with root ${deposit.pendingDepositRoot} is not Pending. Status: ${status}`
    );
  }

  console.log(`Using slot ${depositProcessedSlot}, for verifying the deposit`);

  // Uses the latest slot if the slot is undefined
  const depositProcessedBeaconData = await getBeaconBlock(depositProcessedSlot);

  // Generate a proof of the first pending deposit
  const {
    proof: pendingDepositSlotProof,
    slot: firstPendingDepositSlot,
    pubkeyHash: firstPendingDepositPubKeyHash,
    validatorIndex: firstPendingDepositValidatorIndex,
    root: processedBeaconBlockRoot,
    isEmpty,
  } = await generateFirstPendingDepositSlotProof({
    ...depositProcessedBeaconData
  });

  if (!isEmpty && firstPendingDepositSlot == 0) {
    throw Error(
      `Can not verify when the first pending deposits has a zero slot. This is from a validator consolidating to a compounding validator.\nExecute again when the first pending deposit slot is not zero.`
    );
  }
  if (!isEmpty && strategyDepositSlot > firstPendingDepositSlot) {
    throw Error(
      `Deposit at slot ${strategyDepositSlot} has not been processed at slot ${depositProcessedSlot}. Next deposit in the queue is from slot ${firstPendingDepositSlot}.`
    );
  }

  // Generate a proof of the withdrawable epoch for the strategy's validator to deposit is going to
  const {
    proof: strategyValidatorWithdrawableEpochProof,
    withdrawableEpoch: strategyValidatorWithdrawableEpoch,
  } = await generateValidatorWithdrawableEpochProof({
    ...depositProcessedBeaconData,
    validatorIndex: strategyValidatorIndex,
    includePubKeyProof: false,
  });

  const firstPendingDeposit = {
    slot: firstPendingDepositSlot,
    validatorIndex: firstPendingDepositValidatorIndex,
    proof: pendingDepositSlotProof,
  };
  const strategyValidatorData = {
    withdrawableEpoch: strategyValidatorWithdrawableEpoch.toString(),
    withdrawableEpochProof: strategyValidatorWithdrawableEpochProof,
  };

  if (argv.dryRun) {
    console.log(
      `deposit slot                              : ${strategyDepositSlot}`
    );
    console.log(`deposit root                    : ${deposit.pendingDepositRoot}`);
    console.log(
      `beacon block root                         : ${processedBeaconBlockRoot}`
    );
    console.log(
      `deposit processed slot                    : ${depositProcessedSlot}`
    );
    console.log(
      `first pending deposit pubkey.             : ${firstPendingDepositPubKeyHash}`
    );
    console.log(
      `first pending deposit index               : ${firstPendingDepositValidatorIndex}`
    );
    console.log(
      `first pending deposit slot                : ${firstPendingDepositSlot}`
    );
    console.log(
      `first pending deposit slot proof          : ${pendingDepositSlotProof}`
    );
    console.log(
      `Strategy validator index.                 : ${strategyValidatorIndex}`
    );
    console.log(
      `Strategy validator withdrawable epoch.    : ${strategyValidatorWithdrawableEpoch}`
    );
    console.log(
      `Strategy validator withdrawable proof     : ${strategyValidatorWithdrawableEpochProof}`
    );
    return;
  }

  console.log(
    `About to verify deposit from slot ${strategyDepositSlot} with processing slot ${depositProcessedSlot}, deposit root ${deposit.pendingDepositRoot}, slot of first pending deposit ${firstPendingDepositSlot} to beacon block root ${processedBeaconBlockRoot}`
  );
  const { receipt } = await executeTransaction(
    stakingStrategy.verifyDeposit,
    [deposit.pendingDepositRoot, depositProcessedSlot, firstPendingDeposit, strategyValidatorData],
    argv.dryRun
  );

  const verifiedEvent = await findEventInReceipt(receipt, stakingStrategy, 'DepositVerified');
  
  if (verifiedEvent) {
    console.log(`\n🎉 Deposit verified successfully!`);
    console.log(`   verifiedEvent.args: ${verifiedEvent.args}`);
    console.log(`   Deposit root: ${verifiedEvent.args.depositRoot}`);
  } else {
    console.log('Transaction succeeded but DepositVerified event not found');
  }
}

if (require.main === module) {
  verifyDepositStandalone().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { verifyDepositStandalone };
