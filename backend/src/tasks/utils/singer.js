const ethers = require("ethers");
const {
  DefenderRelaySigner,
  DefenderRelayProvider,
} = require("@openzeppelin/defender-relay-client/lib/ethers");
const { isMainnet, getDefaultProvider } = require('./utils');

const getDefenderSigner = async () => {
  const speed = process.env.SPEED || "fastest";
  if (!["safeLow", "average", "fast", "fastest"].includes(speed)) {
    console.error(
      `Defender Relay Speed param must be either 'safeLow', 'average', 'fast' or 'fastest'. Not "${speed}"`
    );
    process.exit(2);
  }

  const getIsMainnet = await isMainnet();

  const apiKey = getIsMainnet
    ? process.env.DEFENDER_API_KEY
    : process.env.HOODI_DEFENDER_API_KEY;
  const apiSecret = getIsMainnet
    ? process.env.DEFENDER_API_SECRET
    : process.env.HOODI_DEFENDER_API_SECRET;

  const credentials = { apiKey, apiSecret };

  const provider = new DefenderRelayProvider(credentials);
  const signer = new DefenderRelaySigner(credentials, provider, {
    speed,
  });

  log(
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
