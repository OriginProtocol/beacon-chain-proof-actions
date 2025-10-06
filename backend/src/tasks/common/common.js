const { ethers } = require('ethers');
const { getDefaultSigner } = require('./singer');
const { isMainnet, isHoodi, getNetworkName } = require('./utils');

// Strategy contract ABI - minimal for snapBalances
const strategyAbi = [
  "event BalancesVerified(bytes32 indexed blockRoot, uint256 totalBalance)",
  "event BalancesSnapped(bytes32 indexed blockRoot, uint256 ethBalance)",
  "function snapBalances() external",
  "function snappedBalance() external view returns (bytes32 blockRoot, uint64 timestamp, uint128 ethBalance)",
  "function verifyBalances(tuple(bytes32 balancesContainerRoot, bytes balancesContainerProof, bytes32[] validatorBalanceLeaves, bytes[] validatorBalanceProofs) balanceProofs, tuple(bytes32 pendingDepositContainerRoot, bytes pendingDepositContainerProof, uint32[] pendingDepositIndexes, bytes[] pendingDepositProofs) pendingDepositProofsData) external",
  "function deposits(bytes32 depositRoot) external view returns (uint64 slot, uint256 amountGwei, bytes32 pubKeyHash, uint8 status, uint32 depositIndex)",
  "function validator(bytes32 pubKeyHash) external view returns (uint8 state, uint32 index)",
  "function verifyDeposit(bytes32 blockRoot, bytes32 depositMessageRoot, bytes32[] validatorBalanceLeaves, bytes[] validatorBalanceProofs, bytes32[] pendingDepositLeaves, bytes[] pendingDepositProofs, uint32[] pendingDepositIndexes) external",
  "event DepositVerified(bytes32 indexed depositRoot, uint256 depositIndex)"
];

const strategyViewAbi = [
  "function getVerifiedValidators() external view returns (tuple(uint32 index, bytes32 pubKeyHash)[])",
  "function getPendingDeposits() external view returns (tuple(bytes32 pendingDepositRoot, uint256 amountGwei, uint64 slot, bytes32 pubKeyHash)[])"
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

const getContracts = async () => {
  // Setup strategy contract 
  const wallet = await getDefaultSigner();
  let strategyaAddress,strategyViewAddress;

  if (await isMainnet()) {
    strategyaAddress = process.env.STAKING_STRATEGY_PROXY;
    strategyViewAddress = process.env.STAKING_STRATEGY_VIEW;
  } else {
    strategyaAddress = process.env.STAKING_STRATEGY_HOODI_PROXY;
    strategyViewAddress = process.env.STAKING_STRATEGY_HOODI_VIEW;
  }

  const stakingStrategy = new ethers.Contract(strategyaAddress, strategyAbi, wallet);
  const stakingStrategyView = new ethers.Contract(strategyViewAddress, strategyViewAbi, wallet);


  return {
    stakingStrategy,
    stakingStrategyView
  };
};

module.exports = {
  addCommonRuntimArgs,
  environmentVariableCheck,
  getContracts,
};