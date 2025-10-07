const { ethers } = require('ethers');

const isMainnet = async () => {
  const { chainId } = await (await getDefaultProvider()).getNetwork();
  return chainId === 1n;
};

const isHoodi = async () => {
  const { chainId } = await (await getDefaultProvider()).getNetwork();
  return chainId === 560048n;
};

const getDefaultProvider = async () => {
  return new ethers.JsonRpcProvider(process.env.PROVIDER_URL);
};

const getNetworkName = async () => {
  if (await isMainnet()) {
    return 'Mainnet';
  } else if (await isHoodi()) {
    return 'Hoodi';
  }
};

// checks network gas prices and throws an error if they are too high.
// returns EIP 1559 params: maxFeePerGas, maxPriorityFeePerGas alightly adjusted for safety
const getGasPriceParams = async () => {
  const feeData = await (await getDefaultProvider()).getFeeData();
  const maxFeePerGas = feeData.maxFeePerGas * 12n / 10n; // 20% buffer
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 11n / 10n; // 10% buffer


  const maxGasPrice = maxFeePerGas + maxPriorityFeePerGas;
  if (!process.env.MAX_GAS_PRICE_GWEI) {
    console.warn('⚠️  no gas price limit set for transaction cost');
  } else if ((maxFeePerGas + maxPriorityFeePerGas) > ethers.parseUnits(process.env.MAX_GAS_PRICE_GWEI, 'gwei')) {
    throw new Error(`Max gas price is too high. Current gas price is ${ethers.formatUnits(maxGasPrice, 'gwei')} Gwei. Max gas price is ${process.env.MAX_GAS_PRICE_GWEI} Gwei.`);
  }

  return { maxFeePerGas, maxPriorityFeePerGas };
}

const getEtherscanLink = async (txHash) => {
  const _isMainnet = await isMainnet();
  return `Transaction sent: https://${_isMainnet ? '' : 'hoodi.'}etherscan.io/tx/${txHash}`;
}

const findEventInReceipt = async (receipt, contract, eventName) => {
  return receipt.logs
    ?.map(e => contract.interface.parseLog(e))
    .find(e => 'fragment' in e && e.fragment.name === eventName);
}

// overrides are optional and will be passed to the contract method such as value. gasLimit, 
// maxFeePerGas, maxPriorityFeePerGas are not allowed to be overridden
const executeTransaction = async (contractMethod, args = [], dryRun = false, overrides = {}) => {
  try {
    // Estimate gas (always do this for safety)
    const gasEstimate = await contractMethod.estimateGas(...args, overrides);
    const methodName = contractMethod.fragment.name
    const feeData = await (await getDefaultProvider()).getFeeData();
    const gasPrice = feeData.gasPrice;
    const gasCost = gasEstimate * gasPrice;

    console.log(`Gas estimates for ${methodName}`);
    console.log(`Gas estimate: ${gasEstimate.toString()}`);
    console.log(`Gas price:    ${gasPrice.toString()}`);
    console.log(`Gas cost: ${gasCost.toString()}`);

    if (dryRun) {
      return;
    }

    const gasLimit = gasEstimate + (gasEstimate / 5n); // Add 20% buffer to gas estimate for safety
    const { maxFeePerGas, maxPriorityFeePerGas } = await getGasPriceParams();
  
    // Execute the transaction with the calculated gasLimit
    const tx = await contractMethod(...args, { ...overrides, gasLimit, maxFeePerGas, maxPriorityFeePerGas });
    console.log(`Transaction hash: ${tx.hash}`);

    const receipt = await tx.wait();
    if (receipt.status !== 1) {
      throw new Error('❌ Transaction failed');
    }

    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   Gas cost: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} ETH`);
    console.log(`   Etherscan: ${await getEtherscanLink(tx.hash)}`);
    
    return {
      tx,
      receipt,
      gasEstimate,
      gasPrice,
      gasCost,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas
    };
  } catch (error) {
    console.error('Error handling transaction:', error);
    throw error;
  }
}

const toHex = (buff) => {
  return "0x" + Buffer.from(buff).toString("hex");
};

module.exports = {
  isMainnet,
  isHoodi,
  getNetworkName,
  getDefaultProvider,
  executeTransaction,
  findEventInReceipt,
  toHex
};