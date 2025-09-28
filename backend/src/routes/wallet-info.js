const express = require('express');
const { ethers } = require('ethers');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const privateKey = process.env.DEPLOYER_PK;
    const providerUrl = process.env.PROVIDER_URL;

    if (!privateKey || !providerUrl) {
      throw new Error('Missing DEPLOYER_PK or PROVIDER_URL in environment variables');
    }

    const provider = new ethers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const address = wallet.address;
    const balanceWei = await provider.getBalance(address);
    const balance = ethers.formatEther(balanceWei);
    const etherscanLink = `https://etherscan.io/address/${address}`; // Assuming mainnet; adjust for testnets if needed

    res.json({ address, balance, etherscanLink });
  } catch (error) {
    console.error('Wallet info error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet info' });
  }
});

module.exports = router;
