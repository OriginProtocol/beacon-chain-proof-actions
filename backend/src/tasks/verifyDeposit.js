#!/usr/bin/env node

require('dotenv').config();

const { ethers } = require('ethers');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios');

const argv = addCommonRuntimArgs(yargs(hideBin(process.argv))
  .usage('Standalone verifyDeposit script\\n\\nUsage: $0 [options]'))
    .help()
    .parse();

// Default beacon APIs
function getDefaultBeaconApi(network) {
  const apis = {
    mainnet: 'https://beaconcha.in/api/v1',
    holesky: 'https://holesky.beaconcha.in/api/v1'
  };
  return apis[network] || 'https://beaconcha.in/api/v1';
}

if (!argv.beaconApi) {
  argv.beaconApi = getDefaultBeaconApi(argv.network);
}

// Strategy contract ABI for verifyDeposit
const strategyAbi = [
  "function deposits(bytes32 depositRoot) external view returns (uint64 slot, uint256 amountGwei, bytes32 pubKeyHash, uint8 status, uint32 depositIndex)",
  "function validator(bytes32 pubKeyHash) external view returns (uint8 state, uint32 index)",
  "function verifyDeposit(bytes32 blockRoot, bytes32 depositMessageRoot, bytes32[] validatorBalanceLeaves, bytes[] validatorBalanceProofs, bytes32[] pendingDepositLeaves, bytes[] pendingDepositProofs, uint32[] pendingDepositIndexes) external",
  "event DepositVerified(bytes32 indexed depositRoot, uint256 depositIndex)"
];

async function fetchBeaconData(beaconApi, endpoint, slot) {
  try {
    const url = slot ? `${beaconApi}/beacon/states/${slot}/${endpoint}` : `${beaconApi}/${endpoint}`;
    const response = await axios.get(url, { timeout: 15000 });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch beacon ${endpoint}: ${error.message}`);
  }
}

function generateMerkleProof(leaves, targetIndex, targetLeaf) {
  // Simple Merkle proof generation for demonstration
  // In production, use a proper Merkle tree library
  const proof = [];
  let index = targetIndex;
  
  // This is a simplified proof - production code needs proper tree traversal
  for (let level = 0; level < 8; level++) { // 8 levels for typical validator tree
    if (index % 2 === 1) {
      proof.push(ethers.constants.HashZero); // Sibling hash
    } else {
      const siblingHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32'],
          [targetLeaf, ethers.constants.HashZero]
        )
      );
      proof.push(siblingHash);
    }
    index = Math.floor(index / 2);
    if (index === 0) break;
  }
  
  return proof.map(p => p.startsWith('0x') ? p : '0x' + p.slice(2));
}

async function getBeaconBlockRoot(beaconApi, slot) {
  const data = await fetchBeaconData(beaconApi, 'block', slot);
  return data.data.root;
}

async function verifyDepositStandalone() {
  console.log(`\n=== Standalone verifyDeposit Script ===`);
  console.log(`Network: ${argv.network}`);
  console.log(`Strategy: ${argv.strategyAddress}`);
  console.log(`Deposit Root: ${argv.depositRoot}`);
  console.log(`RPC URL: ${argv.rpcUrl}`);
  console.log(`Beacon API: ${argv.beaconApi}`);
  console.log(`Dry run: ${argv.dryRun ? 'Yes' : 'No'}`);
  
  // Setup provider and wallet
  const provider = new ethers.providers.JsonRpcProvider(argv.rpcUrl);
  const privateKey = argv.privateKey.startsWith('0x') ? argv.privateKey : '0x' + argv.privateKey;
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`\nUsing account: ${wallet.address}`);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`Account balance: ${ethers.utils.formatEther(balance)} ETH`);
  
  if (balance.lt(ethers.utils.parseEther('0.01'))) {
    console.warn('⚠️  Low balance - may need more ETH for gas');
  }
  
  // Setup strategy contract
  const strategy = new ethers.Contract(argv.strategyAddress, strategyAbi, wallet);
  
  if (argv.dryRun) {
    console.log('\n--- Dry Run Mode ---');
    
    try {
      // Check deposit status
      console.log('Reading deposit data from strategy...');
      const depositData = await strategy.deposits(argv.depositRoot);
      console.log('Deposit data:');
      console.log(`  Slot: ${depositData.slot.toString()}`);
      console.log(`  Amount: ${ethers.utils.formatEther(depositData.amountGwei)} ETH`);
      console.log(`  PubKey Hash: ${depositData.pubKeyHash}`);
      console.log(`  Status: ${depositData.status.toString()} (1=Pending)`);
      console.log(`  Deposit Index: ${depositData.depositIndex.toString()}`);
      
      if (depositData.status.toNumber() !== 1) {
        console.warn(`⚠️  Deposit status is ${depositData.status.toString()}, expected 1 (Pending)`);
      }
      
      // Check validator status
      const validatorData = await strategy.validator(depositData.pubKeyHash);
      console.log('\nValidator data:');
      console.log(`  State: ${validatorData.state.toString()} (3=Verified)`);
      console.log(`  Index: ${validatorData.index.toString()}`);
      
      if (validatorData.state.toNumber() !== 3) {
        console.warn(`⚠️  Validator state is ${validatorData.state.toString()}, expected 3 (Verified)`);
      }
      
    } catch (error) {
      console.error('Error reading contract state:', error.message);
    }
    
    console.log('\nDry run completed - no transaction sent');
    return;
  }
  
  try {
    console.log('\n--- Executing verifyDeposit ---');
    
    // Determine slot
    let slot = argv.slot;
    if (!slot) {
      try {
        const latestData = await fetchBeaconData(argv.beaconApi, 'headers/head');
        const latestSlot = parseInt(latestData.data.number);
        slot = (latestSlot - 33).toString();
        console.log(`Using slot: ${slot} (latest - 33)`);
      } catch (error) {
        console.error('Could not determine slot automatically:', error.message);
        process.exit(1);
      }
    }
    
    // Get block root
    console.log(`Getting block root for slot ${slot}...`);
    const blockRoot = await getBeaconBlockRoot(argv.beaconApi, slot);
    console.log(`Block root: ${blockRoot}`);
    
    // Check deposit data first
    console.log('Checking deposit data...');
    const depositData = await strategy.deposits(argv.depositRoot);
    
    if (depositData.status.toNumber() !== 1) {
      throw new Error(`Deposit status is ${depositData.status.toString()}, must be 1 (Pending)`);
    }
    
    if (depositData.slot.toNumber() === 0) {
      throw new Error(`Deposit slot is 0, deposit not found`);
    }
    
    const validatorData = await strategy.validator(depositData.pubKeyHash);
    if (validatorData.state.toNumber() !== 3) {
      throw new Error(`Validator state is ${validatorData.state.toString()}, must be 3 (Verified)`);
    }
    
    console.log(`Deposit found: ${ethers.utils.formatEther(depositData.amountGwei)} ETH at slot ${depositData.slot.toString()}`);
    console.log(`Validator index: ${validatorData.index.toString()}`);
    
    // Generate proofs (simplified for demo - production needs proper implementation)
    console.log('\nGenerating Merkle proofs...');
    const depositMessageRoot = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'uint256', 'bytes32'],
        [argv.depositRoot, depositData.amountGwei, depositData.pubKeyHash]
      )
    );
    
    // Simplified proof generation - in production you'd use actual beacon chain data
    const validatorBalanceLeaves = [depositMessageRoot];
    const validatorBalanceProofs = generateMerkleProof(
      validatorBalanceLeaves, 
      validatorData.index.toNumber(), 
      depositMessageRoot
    );
    
    const pendingDepositLeaves = [argv.depositRoot];
    const pendingDepositProofs = generateMerkleProof(
      pendingDepositLeaves, 
      depositData.depositIndex.toNumber(), 
      argv.depositRoot
    );
    const pendingDepositIndexes = [depositData.depositIndex];
    
    console.log('Generated proofs:');
    console.log(`  Validator balance proofs: ${validatorBalanceProofs.length} items`);
    console.log(`  Pending deposit proofs: ${pendingDepositProofs.length} items`);
    console.log(`  Pending deposit indexes: ${pendingDepositIndexes}`);
    
    // Estimate gas
    console.log('\nEstimating gas...');
    const gasEstimate = await strategy.estimateGas.verifyDeposit(
      blockRoot,
      depositMessageRoot,
      validatorBalanceLeaves,
      validatorBalanceProofs,
      pendingDepositLeaves,
      pendingDepositProofs,
      pendingDepositIndexes
    );
    console.log(`Estimated gas: ${gasEstimate.toString()}`);
    
    const gasPrice = await provider.getGasPrice();
    const gasCost = gasEstimate.mul(gasPrice);
    console.log(`Estimated gas cost: ${ethers.utils.formatEther(gasCost)} ETH`);
    
    if (balance.lt(gasCost.mul(12).div(10))) {
      throw new Error(`Insufficient balance for gas. Need at least ${ethers.utils.formatEther(gasCost.mul(12).div(10))} ETH`);
    }
    
    console.log('\nSending verifyDeposit transaction...');
    const tx = await strategy.verifyDeposit(
      blockRoot,
      depositMessageRoot,
      validatorBalanceLeaves,
      validatorBalanceProofs,
      pendingDepositLeaves,
      pendingDepositProofs,
      pendingDepositIndexes,
      {
        gasLimit: gasEstimate.mul(12).div(10) // 20% buffer
      }
    );
    
    console.log(`Transaction sent: https://${argv.network === 'mainnet' ? '' : argv.network + '.'}etherscan.io/tx/${tx.hash}`);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      const event = receipt.events?.find(e => e.event === 'DepositVerified');
      if (event) {
        console.log('\n🎉 Deposit verified successfully!');
        console.log(`   Deposit root: ${event.args.depositRoot}`);
        console.log(`   Deposit index: ${event.args.depositIndex.toString()}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        const actualGasPrice = receipt.effectiveGasPrice || gasPrice;
        console.log(`   Gas cost: ${ethers.utils.formatEther(receipt.gasUsed.mul(actualGasPrice))} ETH`);
      } else {
        console.log('Transaction succeeded but DepositVerified event not found');
      }
    } else {
      console.log('❌ Transaction failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error executing verifyDeposit:');
    console.error(error.message);
    
    if (error.transactionHash || error.hash) {
      const txHash = error.transactionHash || error.hash;
      console.log(`Transaction hash: https://${argv.network === 'mainnet' ? '' : argv.network + '.'}etherscan.io/tx/${txHash}`);
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  verifyDepositStandalone().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { verifyDepositStandalone };
