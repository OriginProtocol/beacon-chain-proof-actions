const { Hono } = require('hono');
const { ethers } = require('ethers');
const { getDefaultSigner } = require('../tasks/utils/singer');
const { getNetworkName, getDefaultProvider } = require('../tasks/utils/utils');

const router = new Hono();

router.get('/', async (c) => {
  try {
    const privateKey = process.env.TASK_EXECUTOR_PRIVATE_KEY;
    const providerUrl = process.env.PROVIDER_URL;
    const defenderApiKey = process.env.DEFENDER_API_KEY;
    const networkName = await getNetworkName();

    if ((!privateKey && !defenderApiKey) || !providerUrl) {
      throw new Error('Missing  one of (TASK_EXECUTOR_PRIVATE_KEY or DEFENDER_API_KEY) or PROVIDER_URL in environment variables');
    }
    const provider = await getDefaultProvider();
    const { type, address } = await getDefaultSigner();

    const balanceWei = await provider.getBalance(address);
    let balance = ethers.formatEther(balanceWei);
    balance = parseFloat(balance).toFixed(4).toString();
    const etherscanLink = `https://${networkName == 'mainnet' ? '' : 'hoodi.'}etherscan.io/address/${address}`;

    return c.json({ address, balance, etherscanLink, type });
  } catch (error) {
    console.error('Wallet info error:', error);
    return c.json({ error: 'Failed to fetch wallet info' }, 500);
  }
});

module.exports = router;
