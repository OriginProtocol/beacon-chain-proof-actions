const ethers = require("ethers");
const beaconChainGenesisTimeMainnet = 1606824023; // Tue Dec 01 2020 12:00:23 GMT+0000
const beaconChainGenesisTimeHoodi = 1742213400; //	Mon Mar 17 2025 12:10:00 GMT+0000

const MAX_UINT64 = BigInt("0xffffffffffffffff");
const ZERO_BYTES32 = ethers.zeroPadValue("0x", 32);

module.exports = {
  beaconChainGenesisTimeMainnet,
  beaconChainGenesisTimeHoodi,
  MAX_UINT64,
  ZERO_BYTES32
};