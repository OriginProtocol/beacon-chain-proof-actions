const { ethers } = require('ethers');
const { getDefaultSigner } = require('./singer');
const { isMainnet, isHoodi, getNetworkName } = require('./utils');
const { beaconChainGenesisTimeMainnet, beaconChainGenesisTimeHoodi } = require('./constants');

// Strategy contract ABI - minimal for snapBalances
const strategyAbi = [
  "event BalancesVerified(uint64 indexed timestamp, uint256 totalDepositsWei, uint256 totalValidatorBalance, uint256 ethBalance)",
  "event BalancesSnapped(bytes32 indexed blockRoot, uint256 ethBalance)",
  "function snapBalances() external",
  "function snappedBalance() external view returns (bytes32 blockRoot, uint64 timestamp, uint128 ethBalance)",
  "function verifyBalances(tuple(bytes32 balancesContainerRoot, bytes balancesContainerProof, bytes32[] validatorBalanceLeaves, bytes[] validatorBalanceProofs) balanceProofs, tuple(bytes32 pendingDepositContainerRoot, bytes pendingDepositContainerProof, uint32[] pendingDepositIndexes, bytes[] pendingDepositProofs) pendingDepositProofsData) external",
  "function deposits(bytes32 depositRoot) external view returns (uint64 slot, uint256 amountGwei, bytes32 pubKeyHash, uint8 status, uint32 depositIndex)",
  "function validator(bytes32 pubKeyHash) external view returns (uint8 state, uint40 index)",
  "function verifyDeposit(bytes32 pendingDepositRoot, uint64 depositProcessedSlot, tuple(uint64 slot, bytes proof) firstPendingDeposit, tuple(uint64 withdrawableEpoch, bytes withdrawableEpochProof) strategyValidatorData)",
  "event DepositVerified(bytes32 indexed depositRoot, uint256 amountWei)"
];

const strategyViewAbi = [
  "function getVerifiedValidators() external view returns (tuple(bytes32 pubKeyHash, uint64 index, uint64 hash)[])",
  "function getPendingDeposits() external view returns (tuple(bytes32 pendingDepositRoot, bytes32 pubKeyHash, uint64 amountGwei, uint64 slot)[])"
];

const addCommonRuntimArgs = (yargs) => {
  yargs
  .option('dry-run', {
    alias: 'd',
    description: 'Show what would be done without sending transaction',
    type: 'boolean',
    default: false
  })

  return yargs;
};

const environmentVariableCheck = async (isDryRun) => {
  if (!process.env.PROVIDER_URL) {
    throw new Error('PROVIDER_URL is a required environment variable.');
  }
  const isPrivateWalletSetup = process.env.TASK_EXECUTOR_PRIVATE_KEY;
  const isDefenderSetup = process.env.DEFENDER_API_KEY || process.env.HOLESKY_DEFENDER_API_KEY;

  if (!process.env.PROVIDER_URL) {
    throw new Error('PROVIDER_URL is a required environment variable.');
  }
  if (!(await isMainnet()) && !(await isHoodi())) {
    throw new Error('Invalid network. Must be Mainnet or Hoodi.');
  }

  const networkName = await getNetworkName();
  console.log(`\n=== Environment ===`);
  console.log("provider url", process.env.PROVIDER_URL);
  console.log(`Network: ${networkName}`);
  console.log(`Dry run: ${isDryRun ? 'Yes' : 'No'}`);
  
  if (isDryRun) {
    return;
  }
  if (!isPrivateWalletSetup && !isDefenderSetup) {
    throw new Error('Either TASK_EXECUTOR_PRIVATE_KEY or DEFENDER_API_KEY or HOLESKY_DEFENDER_API_KEY is required.');
  }
};

const getContractsAndConstants = async () => {
  // Setup strategy contract 
  const wallet = await getDefaultSigner();
  let strategyaAddress,strategyViewAddress, beaconChainGenesisTime, beaconProvider

  if (await isMainnet()) {
    strategyaAddress = process.env.STAKING_STRATEGY_PROXY;
    strategyViewAddress = process.env.STAKING_STRATEGY_VIEW;
    beaconChainGenesisTime = beaconChainGenesisTimeMainnet;
    beaconProvider = `https://beaconcha.in/api/v1/`;
  } else {
    strategyaAddress = process.env.STAKING_STRATEGY_HOODI_PROXY;
    strategyViewAddress = process.env.STAKING_STRATEGY_HOODI_VIEW;
    beaconChainGenesisTime = beaconChainGenesisTimeHoodi;
    beaconProvider = `https://hoodi.beaconcha.in/api/v1/`;
  }

  const stakingStrategy = new ethers.Contract(strategyaAddress, strategyAbi, wallet);
  const stakingStrategyView = new ethers.Contract(strategyViewAddress, strategyViewAbi, wallet);

  return {
    stakingStrategy,
    stakingStrategyView,
    beaconChainGenesisTime,
    beaconProvider
  };
};

module.exports = {
  addCommonRuntimArgs,
  environmentVariableCheck,
  getContracts: getContractsAndConstants,
};