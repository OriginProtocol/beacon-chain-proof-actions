const ethers = require("ethers");
const { isMainnet, getDefaultProvider } = require('./utils');

const getDefenderSigner = async () => {
  const { Relayer } = await import('@openzeppelin/defender-sdk-relay-signer-client');
  const _isMainnet = await isMainnet();
  const apiKey = _isMainnet
    ? process.env.DEFENDER_API_KEY
    : process.env.HOODI_DEFENDER_API_KEY;
  const apiSecret = _isMainnet
    ? process.env.DEFENDER_API_SECRET
    : process.env.HOODI_DEFENDER_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.warn('⚠️ DEFENDER_API_KEY or DEFENDER_API_SECRET is not set in environment variables.');
    return null;
  }

  const credentials = { apiKey, apiSecret };
  const client = new Relayer(credentials);
  const provider = client.getProvider({ ethersVersion: 'v6' });
  const speed = 'fast';
  const signer = await client.getSigner(provider, { speed, ethersVersion: 'v6' });

  console.log(
    `Using Defender Relayer account ${await signer.getAddress()} with key ${apiKey} and speed ${speed}`
  );
  return signer;
};

const getWalletSigner = async () => {
    const envPrivateKey = process.env.TASK_EXECUTOR_PRIVATE_KEY;
    const privateKey = envPrivateKey.startsWith('0x') ? envPrivateKey : '0x' + envPrivateKey;
    const provider = await getDefaultProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);

    console.log(`Using wallet account ${wallet.address}`);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);
    if (balance < ethers.parseEther('0.001')) {
      console.warn('⚠️  Low balance - may not have enough ETH for gas');
    }
    return wallet;
};

const getDefaultSigner = async () => {
  if (process.env.TASK_EXECUTOR_PRIVATE_KEY) {
    return getWalletSigner();
  }
  return getDefenderSigner();
};

module.exports = {
  getDefenderSigner,
  getWalletSigner,
  getDefaultSigner,
};
