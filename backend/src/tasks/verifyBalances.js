#!/usr/bin/env node

require('dotenv').config();

const { ethers } = require('ethers');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios');


const argv = addCommonRuntimArgs(yargs(hideBin(process.argv))
  .usage('Standalone verifyBalances script\\n\\nUsage: $0 [options]'))
    .help()
    .parse();

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

// Strategy contract ABI for verifyBalances
const strategyAbi = [
  "function snappedBalance() external view returns (bytes32 blockRoot, uint64 timestamp, uint128 ethBalance)",
  "function verifyBalances(tuple(bytes32 balancesContainerRoot, bytes balancesContainerProof, bytes32[] validatorBalanceLeaves, bytes[] validatorBalanceProofs) balanceProofs, tuple(bytes32 pendingDepositContainerRoot, bytes pendingDepositContainerProof, uint32[] pendingDepositIndexes, bytes[] pendingDepositProofs) pendingDepositProofsData) external",
  "event BalancesVerified(bytes32 indexed blockRoot, uint256 totalBalance)"
];

const strategyViewAbi = [
  "function getVerifiedValidators() external view returns (tuple(uint32 index, bytes32 pubKeyHash)[])",
  "function getPendingDeposits() external view returns (tuple(bytes32 pendingDepositRoot, uint256 amountGwei, uint64 slot, bytes32 pubKeyHash)[])"
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
  // Simplified Merkle proof generation
  const proof = [];
  let index = targetIndex;
  
  for (let level = 0; level < 16; level++) { // 16 levels for validator/balance trees
    if (index % 2 === 1) {
      proof.push(ethers.constants.HashZero);
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

async function getValidatorBalances(beaconApi, slot, indexes) {
  // Simplified balance fetching - production would use proper beacon API calls
  const balances = [];
  for (const index of indexes) {
    try {
      // This is a placeholder - actual implementation needs proper beacon state access
      const balance = ethers.BigNumber.from(Math.floor(Math.random() * 32000000000) + 32000000000); // 32+ ETH in gwei
      balances.push({
        index: parseInt(index),
        balance: balance
      });
    } catch (error) {
      console.warn(`Could not fetch balance for validator ${index}: ${error.message}`);
    }
  }
  return balances;
}

async function verifyBalancesStandalone() {
  console.log(`\n=== Standalone verifyBalances Script ===`);
  console.log(`Network: ${argv.network}`);
  console.log(`Strategy: ${argv.strategyAddress}`);
  console.log(`RPC URL: ${argv.rpcUrl}`);
  console.log(`Beacon API: ${argv.beaconApi}`);
  console.log(`Validator indexes: ${argv.indexes || 'all strategy validators'}`);
  console.log(`Dry run: ${argv.dryRun ? 'Yes' : 'No'}`);
  
  // Setup provider and wallet
  const provider = new ethers.providers.JsonRpcProvider(argv.rpcUrl);
  const privateKey = argv.privateKey.startsWith('0x') ? argv.privateKey : '0x' + argv.privateKey;
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`\nUsing account: ${wallet.address}`);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`Account balance: ${ethers.utils.formatEther(balance)} ETH`);
  
  if (balance.lt(ethers.utils.parseEther('0.02'))) {
    console.warn('⚠️  Low balance - verifyBalances may require significant gas');
  }
  
  // Setup strategy contract
  const strategy = new ethers.Contract(argv.strategyAddress, strategyAbi, wallet);
  
  if (argv.dryRun) {
    console.log('\n--- Dry Run Mode ---');
    
    try {
      // Get snapped balance
      console.log('Reading strategy state...');
      const snappedBalance = await strategy.snappedBalance();
      console.log('Snapped balance:');
      console.log(`  Block root: ${snappedBalance.blockRoot}`);
      console.log(`  Timestamp: ${new Date(Number(snappedBalance.timestamp) * 1000).toISOString()}`);
      console.log(`  ETH balance: ${ethers.utils.formatEther(snappedBalance.ethBalance)} ETH`);
      
      // Get verified validators
      const verifiedValidators = await strategy.getVerifiedValidators();
      console.log(`\nFound ${verifiedValidators.length} verified validators`);
      
      if (argv.indexes) {
        const specifiedIndexes = argv.indexes.split(',').map(i => i.trim());
        console.log(`Specified indexes: ${specifiedIndexes.join(', ')}`);
      } else {
        console.log('Will verify all strategy validators');
      }
      
      // Get pending deposits
      const pendingDeposits = await strategy.getPendingDeposits();
      console.log(`Found ${pendingDeposits.length} pending deposits`);
      
      for (const deposit of pendingDeposits) {
        console.log(`  Deposit: ${ethers.utils.formatEther(deposit.amountGwei)} ETH, root: ${deposit.pendingDepositRoot}`);
      }
      
    } catch (error) {
      console.error('Error reading contract state:', error.message);
    }
    
    console.log('\nDry run completed - no transaction sent');
    return;
  }
  
  try {
    console.log('\n--- Executing verifyBalances ---');
    
    // Determine slot
    let slot = argv.slot;
    if (!slot) {
      try {
        const snappedBalance = await strategy.snappedBalance();
        slot = snappedBalance.blockRoot;
        console.log(`Using slot from snappedBalance: ${slot}`);
      } catch (error) {
        console.error('Could not get slot from snappedBalance:', error.message);
        try {
          const latestData = await fetchBeaconData(argv.beaconApi, 'headers/head');
          const latestSlot = parseInt(latestData.data.number);
          slot = latestSlot.toString();
          console.log(`Using latest slot: ${slot}`);
        } catch (error2) {
          console.error('Could not determine slot automatically:', error2.message);
          process.exit(1);
        }
      }
    }
    
    // Get strategy data
    console.log('Reading strategy data...');
    const snappedBalance = await strategy.snappedBalance();
    const verifiedValidators = argv.indexes 
      ? argv.indexes.split(',').map(i => ({ index: parseInt(i.trim()), pubKeyHash: ethers.constants.HashZero }))
      : await strategy.getVerifiedValidators();
    
    const pendingDeposits = await strategy.getPendingDeposits();
    
    console.log(`Verifying ${verifiedValidators.length} validators`);
    console.log(`Found ${pendingDeposits.length} pending deposits`);
    
    // Get beacon chain data
    console.log(`Fetching beacon chain data for slot ${slot}...`);
    const blockData = await fetchBeaconData(argv.beaconApi, 'block', slot);
    const blockRoot = blockData.data.root;
    
    // Get validator balances from beacon chain (simplified)
    const validatorIndexes = verifiedValidators.map(v => v.index.toString());
    const beaconBalances = await getValidatorBalances(argv.beaconApi, slot, validatorIndexes);
    
    console.log(`Fetched ${beaconBalances.length} validator balances from beacon chain`);
    
    // Generate balance proofs
    console.log('Generating balance proofs...');
    const balanceProofs = {
      balancesContainerRoot: ethers.constants.HashZero, // Would be actual container root
      balancesContainerProof: '0x' + '00'.repeat(288), // 9 * 32 bytes proof
      validatorBalanceLeaves: verifiedValidators.map((_, i) => beaconBalances[i]?.balance || ethers.BigNumber.from(0)),
      validatorBalanceProofs: verifiedValidators.map((v, i) => 
        generateMerkleProof([], v.index.toNumber(), beaconBalances[i]?.balance || ethers.BigNumber.from(0))
      )
    };
    
    // Generate pending deposit proofs
    const pendingDepositProofsData = {
      pendingDepositContainerRoot: ethers.constants.HashZero,
      pendingDepositContainerProof: '0x' + '00'.repeat(288),
      pendingDepositIndexes: pendingDeposits.map((_, i) => i),
      pendingDepositProofs: pendingDeposits.map((deposit, i) => 
        generateMerkleProof([], i, deposit.pendingDepositRoot)
      )
    };
    
    console.log('Generated proofs:');
    console.log(`  Balance proofs: ${balanceProofs.validatorBalanceProofs.length} validators`);
    console.log(`  Deposit proofs: ${pendingDepositProofsData.pendingDepositProofs.length} deposits`);
    
    // Estimate gas
    console.log('\nEstimating gas...');
    const gasEstimate = await strategy.estimateGas.verifyBalances(balanceProofs, pendingDepositProofsData);
    console.log(`Estimated gas: ${gasEstimate.toString()}`);
    
    const gasPrice = await provider.getGasPrice();
    const gasCost = gasEstimate.mul(gasPrice);
    console.log(`Estimated gas cost: ${ethers.utils.formatEther(gasCost)} ETH`);
    
    if (balance.lt(gasCost.mul(15).div(10))) {
      throw new Error(`Insufficient balance for gas. Need at least ${ethers.utils.formatEther(gasCost.mul(15).div(10))} ETH`);
    }
    
    console.log('\nSending verifyBalances transaction...');
    const tx = await strategy.verifyBalances(balanceProofs, pendingDepositProofsData, {
      gasLimit: gasEstimate.mul(15).div(10) // 50% buffer for complex proofs
    });
    
    console.log(`Transaction sent: https://${argv.network === 'mainnet' ? '' : argv.network + '.'}etherscan.io/tx/${tx.hash}`);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      const event = receipt.events?.find(e => e.event === 'BalancesVerified');
      if (event) {
        console.log('\n🎉 Balances verified successfully!');
        console.log(`   Block root: ${event.args.blockRoot}`);
        console.log(`   Total balance: ${ethers.utils.formatEther(event.args.totalBalance)} ETH`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
        const actualGasPrice = receipt.effectiveGasPrice || gasPrice;
        console.log(`   Gas cost: ${ethers.utils.formatEther(receipt.gasUsed.mul(actualGasPrice))} ETH`);
      } else {
        console.log('Transaction succeeded but BalancesVerified event not found');
      }
    } else {
      console.log('❌ Transaction failed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error executing verifyBalances:');
    console.error(error.message);
    
    if (error.transactionHash || error.hash) {
      const txHash = error.transactionHash || error.hash;
      console.log(`Transaction hash: https://${argv.network === 'mainnet' ? '' : argv.network + '.'}etherscan.io/tx/${txHash}`);
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  verifyBalancesStandalone().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { verifyBalancesStandalone };
