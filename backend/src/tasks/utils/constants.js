const ethers = require("ethers");
const beaconChainGenesisTimeMainnet = 1606824023; // Tue Dec 01 2020 12:00:23 GMT+0000
const beaconChainGenesisTimeHoodi = 1742213400; //	Mon Mar 17 2025 12:10:00 GMT+0000

const MAX_UINT64 = BigInt("0xffffffffffffffff");
const ZERO_BYTES32 = ethers.zeroPadValue("0x", 32);
// The number of slots that need to pass before a new beacon chain state is downloaded to check
// if any of the deposits in the strategy need processing.
const VERIFY_DEPOSIT_SLOT_BUFFER = 300;

module.exports = {
  beaconChainGenesisTimeMainnet,
  beaconChainGenesisTimeHoodi,
  MAX_UINT64,
  ZERO_BYTES32,
  VERIFY_DEPOSIT_SLOT_BUFFER
};