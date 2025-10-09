const { concatProof, getValidator } = require("./beacon");
const { formatUnits } = require("ethers");
const { MAX_UINT64 } = require("./constants");
const { toHex } = require("./utils");

// BeaconBlock.state.PendingDeposits[0].slot
async function generateFirstPendingDepositSlotProof({
  blockView,
  blockTree,
  stateView,
  test,
}) {
  // Have to dynamically import the Lodestar API client as its an ESM module
  const { concatGindices, createProof, ProofType, toGindex } = await import(
    "@chainsafe/persistent-merkle-tree"
  );

  console.log(`There are ${stateView.pendingDeposits.length} pending deposits`);
  const generalizedIndex =
    stateView.pendingDeposits.length > 0
      ? concatGindices([
          blockView.type.getPathInfo(["stateRoot"]).gindex,
          stateView.type.getPathInfo(["pendingDeposits", 0]).gindex,
          toGindex(3, 4n), // depth 3, index 4 for slot = 12
        ])
      : concatGindices([
          blockView.type.getPathInfo(["stateRoot"]).gindex,
          stateView.type.getPathInfo(["pendingDeposits", 0]).gindex,
        ]);
  console.log(
    `Generalized index for the slot of the first pending deposit or the root node of the first pending deposit in the beacon block: ${generalizedIndex}`
  );
  let firstPendingDepositSlot = 1;
  let firstPendingDepositPubKey = "0x";
  if (stateView.pendingDeposits.length == 0) {
    console.log("No deposits in the deposit queue");
  } else {
    const firstPendingDeposit = stateView.pendingDeposits.get(0);
    firstPendingDepositSlot = firstPendingDeposit.slot;
    firstPendingDepositPubKey = toHex(firstPendingDeposit.pubkey);
    console.log(
      `First pending deposit has slot ${
        firstPendingDeposit.slot
      }, withdrawal credential ${toHex(
        firstPendingDeposit.withdrawalCredentials
      )} and public key ${firstPendingDepositPubKey}`
    );
  }

  console.log(
    `Generating proof for the the first pending deposit slot to beacon block root ${toHex(
      blockTree.root
    )}`
  );
  const proofObj = createProof(blockTree.rootNode, {
    type: ProofType.single,
    gindex: generalizedIndex,
  });
  console.log(`First pending deposit slot leaf: ${toHex(proofObj.leaf)}`);
  const proofBytes = toHex(concatProof(proofObj));
  console.log(
    `First pending deposit slot proof of depth ${proofObj.witnesses.length} in bytes:\n${proofBytes}`
  );
  
  return {
    proof: proofBytes,
    generalizedIndex,
    root: toHex(blockTree.root),
    leaf: toHex(proofObj.leaf),
    slot: firstPendingDepositSlot,
    isEmpty: stateView.pendingDeposits.length === 0,
  };
}

async function generateValidatorWithdrawableEpochProof({
  blockView,
  blockTree,
  stateView,
  validatorIndex,
}) {
  // Have to dynamically import the Lodestar API client as its an ESM module
  const { concatGindices, createProof, ProofType, toGindex } = await import(
    "@chainsafe/persistent-merkle-tree"
  );

  const validator = stateView.validators.get(validatorIndex);
  if (
    !validator ||
    toHex(validator.node.root) ==
      "0x0000000000000000000000000000000000000000000000000000000000000000"
  ) {
    throw new Error(
      `Validator with index ${validatorIndex} not found in the state at slot ${blockView.slot}.`
    );
  }
  const withdrawableEpoch =
    validator.withdrawableEpoch == Infinity
      ? MAX_UINT64
      : validator.withdrawableEpoch;
  console.log(
    `Validator ${validatorIndex} has withdrawable epoch ${withdrawableEpoch} and public key ${toHex(
      validator.pubkey
    )}`
  );
  console.log(`${stateView.validators.length} validators at slot ${blockView.slot}.`);

  const generalizedIndexValidatorContainer = concatGindices([
    // 715n,
    // (2n ^ 41n) + BigInt(validatorIndex),
    blockView.type.getPathInfo(["stateRoot"]).gindex,
    stateView.type.getPathInfo(["validators", validatorIndex]).gindex,
  ]);
  const generalizedIndexWithdrawableEpoch = concatGindices([
    generalizedIndexValidatorContainer,
    toGindex(3, 7n), // depth 3, withdrawableEpoch index 7 = 2 ^ 3 + 7 = 15
  ]);

  console.log(
    `Gen index for withdrawableEpoch of validator ${validatorIndex} in beacon block: ${generalizedIndexWithdrawableEpoch}`
  );

  console.log(
    `Generating validator withdrawableEpoch proof to beacon block root ${toHex(
      blockTree.root
    )}`
  );
  const proofObj = createProof(blockTree.rootNode, {
    type: ProofType.single,
    gindex: generalizedIndexWithdrawableEpoch,
  });
  console.log(`Validator withdrawableEpoch leaf (hash): ${toHex(proofObj.leaf)}`);
  const proofBytes = toHex(concatProof(proofObj));
  const depth = proofObj.witnesses.length;
  console.log(`Withdrawable epoch proof of depth ${depth} in bytes:\n${proofBytes}`);

  return {
    proof: proofBytes,
    generalizedIndexWithdrawableEpoch,
    root: toHex(blockTree.root),
    leaf: toHex(proofObj.leaf),
    withdrawableEpoch,
  };
}

// BeaconBlock.state.validators[validatorIndex].pubkey
async function generateValidatorPubKeyProof({
  validatorIndex,
  blockView,
  blockTree,
  stateView,
}) {
  // Have to dynamically import the Lodestar API client as its an ESM module
  const { concatGindices, createProof, ProofType, toGindex } = await import(
    "@chainsafe/persistent-merkle-tree"
  );

  const validatorDetails = stateView.validators.get(validatorIndex);
  if (
    !validatorDetails ||
    toHex(validatorDetails.node.root) ==
      "0x0000000000000000000000000000000000000000000000000000000000000000"
  ) {
    throw new Error(
      `Validator with index ${validatorIndex} not found in the state at slot ${blockView.slot}.`
    );
  }
  console.log(
    `Validator public key for validator ${validatorIndex}: ${toHex(
      validatorDetails.pubkey
    )}`
  );

  const generalizedIndex = concatGindices([
    blockView.type.getPathInfo(["stateRoot"]).gindex,
    stateView.type.getPathInfo(["validators", validatorIndex]).gindex,
    toGindex(3, 0n), // depth 3, index 0 for pubkey = 8
  ]);
  console.log(
    `gen index for pubkey of validator ${validatorIndex} in beacon block: ${generalizedIndex}`
  );

  console.log(
    `Generating validator pubkey proof to beacon block root ${toHex(
      blockTree.root
    )}`
  );
  const proofObj = createProof(blockTree.rootNode, {
    type: ProofType.single,
    gindex: generalizedIndex,
  });
  console.log(`Validator public key leaf (hash): ${toHex(proofObj.leaf)}`);
  const proofBytes = toHex(concatProof(proofObj));
  const depth = proofObj.witnesses.length;
  console.log(`Public key proof of depth ${depth} in bytes:\n${proofBytes}`);

  return {
    proof: proofBytes,
    generalizedIndex,
    root: toHex(blockTree.root),
    leaf: toHex(proofObj.leaf),
    pubKey: toHex(validatorDetails.pubkey),
  };
}

// BeaconBlock.state.pendingDeposits
async function generatePendingDepositsContainerProof({
  blockView,
  blockTree,
  stateView,
}) {
  // Have to dynamically import the Lodestar API client as its an ESM module
  const { concatGindices, createProof, ProofType } = await import(
    "@chainsafe/persistent-merkle-tree"
  );

  const generalizedIndex = concatGindices([
    blockView.type.getPathInfo(["stateRoot"]).gindex,
    stateView.type.getPathInfo(["pendingDeposits"]).gindex,
  ]);
  console.log(
    `gen index for pending deposits container in beacon block: ${generalizedIndex}`
  );

  console.log(
    `Generating pending deposits container proof to beacon block root ${toHex(
      blockTree.root
    )}`
  );
  const proofObj = createProof(blockTree.rootNode, {
    type: ProofType.single,
    gindex: generalizedIndex,
  });
  console.log(`Pending deposits container leaf: ${toHex(proofObj.leaf)}`);

  const proofBytes = toHex(concatProof(proofObj));
  const depth = proofObj.witnesses.length;
  console.log(
    `Pending deposits container proof of depth ${depth} in bytes:\n${proofBytes}`
  );

  return {
    proof: proofBytes,
    generalizedIndex,
    root: toHex(blockTree.root),
    leaf: toHex(proofObj.leaf),
  };
}

// BeaconBlock.state.pendingDeposits[depositIndex]
// Generates a proof in the Pending Deposits container rather than the whole beacon block
async function generatePendingDepositProof({
  blockView,
  blockTree,
  stateView,
  depositIndex,
}) {
  // Have to dynamically import the Lodestar API client as its an ESM module
  const { concatGindices, createProof, ProofType, toGindex } = await import(
    "@chainsafe/persistent-merkle-tree"
  );

  // Read the pending deposit from the state
  const pendingDeposit = stateView.pendingDeposits.get(depositIndex);
  console.log(`Pending deposit ${depositIndex}:`);
  console.log(`  pubkey : ${toHex(pendingDeposit.pubkey)}`);
  console.log(`  cred   : ${toHex(pendingDeposit.withdrawalCredentials)}`);
  console.log(`  amount : ${formatUnits(pendingDeposit.amount, 9)}`);
  console.log(`  slot   : ${pendingDeposit.slot}`);

  // BeaconBlock.state.pendingDeposits
  const genIndexPendingDepositsContainer = concatGindices([
    blockView.type.getPathInfo(["stateRoot"]).gindex,
    stateView.type.getPathInfo(["pendingDeposits"]).gindex,
  ]);
  console.log(
    `gen index for pending deposits container in beacon block: ${genIndexPendingDepositsContainer}`
  );
  const pendingDepositsTree = blockTree.getSubtree(
    genIndexPendingDepositsContainer
  );

  // BeaconBlock.state.pendingDeposits[depositIndex]
  const genIndexPendingDepositContainer = toGindex(
    stateView.pendingDeposits.type.depth,
    BigInt(depositIndex)
  );
  console.log(
    `index for pending deposit in pending deposits container: ${genIndexPendingDepositContainer}`
  );

  console.log(
    `Generating pending deposit proof to pending deposits container root ${toHex(
      pendingDepositsTree.root
    )}`
  );
  const proofObj = createProof(pendingDepositsTree.rootNode, {
    type: ProofType.single,
    gindex: genIndexPendingDepositContainer,
  });
  console.log(`Pending deposit leaf: ${toHex(proofObj.leaf)}`);

  const proofBytes = toHex(concatProof(proofObj));
  const depth = proofObj.witnesses.length;
  console.log(
    `pending deposit ${depositIndex} proof of depth ${depth} in Pending Deposits container in bytes:\n${proofBytes}`
  );

  return {
    proof: proofBytes,
    generalizedIndex: genIndexPendingDepositContainer,
    root: toHex(pendingDepositsTree.root),
    leaf: toHex(proofObj.leaf),
    depth,
    pendingDeposit,
  };
}

// BeaconBlock.state.balances
async function generateBalancesContainerProof({
  blockView,
  blockTree,
  stateView,
}) {
  // Have to dynamically import the Lodestar API client as its an ESM module
  const { concatGindices, createProof, ProofType } = await import(
    "@chainsafe/persistent-merkle-tree"
  );

  const generalizedIndex = concatGindices([
    blockView.type.getPathInfo(["stateRoot"]).gindex,
    stateView.type.getPathInfo(["balances"]).gindex,
  ]);
  console.log(`gen index for balances container in beacon block: ${generalizedIndex}`);

  console.log(
    `Generating balances container proof to beacon block root ${toHex(
      blockTree.root
    )}`
  );
  const proofObj = createProof(blockTree.rootNode, {
    type: ProofType.single,
    gindex: generalizedIndex,
  });
  console.log(`Balances container leaf: ${toHex(proofObj.leaf)}`);

  const proofBytes = toHex(concatProof(proofObj));
  const depth = proofObj.witnesses.length;
  console.log(`Balances container proof of depth ${depth} in bytes:\n${proofBytes}`);

  return {
    proof: proofBytes,
    generalizedIndex,
    root: toHex(blockTree.root),
    leaf: toHex(proofObj.leaf),
  };
}

// BeaconBlock.state.balances[validatorIndex]
// Generates a proof in the Balances container rather than the whole beacon block
async function generateBalanceProof({
  blockView,
  blockTree,
  stateView,
  validatorIndex,
}) {
  // Have to dynamically import the Lodestar API client as its an ESM module
  const { concatGindices, createProof, ProofType, toGindex } = await import(
    "@chainsafe/persistent-merkle-tree"
  );

  console.log("validatorIndex", validatorIndex)
  console.log("validatorIndex", typeof validatorIndex)

  // Read the validator's balance from the state
  const validatorBalance = stateView.balances.get(parseInt(validatorIndex));
  console.log(
    `Validator ${validatorIndex} balance: ${formatUnits(validatorBalance, 9)}`
  );

  // BeaconBlock.state.balances
  const genIndexBalancesContainer = concatGindices([
    blockView.type.getPathInfo(["stateRoot"]).gindex,
    stateView.type.getPathInfo(["balances"]).gindex,
  ]);
  console.log(
    `gen index for balances container in beacon block: ${genIndexBalancesContainer}`
  );
  const balancesTree = blockTree.getSubtree(genIndexBalancesContainer);

  // BeaconBlock.state.balances[validatorIndex]
  const balanceIndex = validatorIndex / 4n;
  console.log(`Balance index in the balances container: ${balanceIndex}`);
  const genIndexBalanceContainer = toGindex(
    stateView.balances.type.depth,
    BigInt(balanceIndex)
  );
  console.log(`index for balance in balances container: ${genIndexBalanceContainer}`);

  console.log(`Balances sub tree root: ${toHex(balancesTree.root)}`);

  console.log(
    `Generating balance in balances container proof to balances container root ${toHex(
      balancesTree.root
    )}`
  );
  const proofObj = createProof(balancesTree.rootNode, {
    type: ProofType.single,
    gindex: genIndexBalanceContainer,
  });
  console.log(`Balances container leaf: ${toHex(proofObj.leaf)}`);

  const proofBytes = toHex(concatProof(proofObj));
  const depth = proofObj.witnesses.length;
  console.log(
    `Validator ${validatorIndex} balance proof of depth ${depth} in Balances container in bytes:\n${proofBytes}`
  );

  return {
    proof: proofBytes,
    generalizedIndex: genIndexBalancesContainer,
    root: toHex(balancesTree.root),
    leaf: toHex(proofObj.leaf),
    depth,
    balance: validatorBalance,
  };
}

module.exports = {
  generateFirstPendingDepositSlotProof,
  generateValidatorWithdrawableEpochProof,
  generateValidatorPubKeyProof,
  generatePendingDepositsContainerProof,
  generatePendingDepositProof,
  generateBalancesContainerProof,
  generateBalanceProof,
};
