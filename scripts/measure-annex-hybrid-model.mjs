#!/usr/bin/env node

import ECPairFactory from "ecpair";
import { initEccLib, networks, payments, Psbt } from "bitcoinjs-lib";
import * as tinysecp from "tiny-secp256k1";

import {
  buildBatchCommitArtifacts,
  buildBatchRevealArtifacts,
  buildCommitArtifacts,
  buildRevealArtifacts
} from "@gns/architect";
import { createClaimPackage } from "@gns/protocol";

initEccLib(tinysecp);

const ECPair = ECPairFactory(tinysecp);
const NETWORK = networks.regtest;
const COMMIT_FEE_SATS = 1_000n;
const REVEAL_FEE_SATS = 500n;
const EXTRA_INPUT_BUFFER_SATS = 10_000n;
const BATCH_SIZES = [2, 4, 8, 16, 32, 64];

// Current explicit batch reveal payload is 94 bytes for the benchmark names.
// The hybrid annex sketch keeps the current fields, replaces `proofChunkCount`
// with `carrier_input_index`, and adds:
// - annex_sha256: 32 bytes
// - annex_format: 1 byte
const HYBRID_HEADER_EXTRA_PAYLOAD_BYTES = 33;

// Hybrid annex assumptions:
// - annex payload includes the required 0x50 prefix plus one GNS proof-format byte
// - the explicit header commits to annex_sha256 and annex_bytes_length
const ANNEX_NON_PROOF_BYTES = 2;

// Witness baseline assumptions:
// - signed p2wpkh witness: 109 bytes (2-item stack, ~73-byte DER+sighash sig, 33-byte pubkey)
// - signed p2tr key-path witness without annex: 66 bytes (1-item stack, 64-byte Schnorr sig)
const P2WPKH_WITNESS_BYTES = 109;
const P2TR_KEYPATH_WITNESS_BYTES = 66;
const INPUT_WITNESS_DELTA_WU = P2TR_KEYPATH_WITNESS_BYTES - P2WPKH_WITNESS_BYTES;

// If the reveal funding path is fully Taproot-native, change is likely P2TR too.
const P2WPKH_CHANGE_SCRIPT_BYTES = 22;
const P2TR_CHANGE_SCRIPT_BYTES = 34;
const P2TR_CHANGE_OUTPUT_DELTA_WU =
  4 * ((8 + compactSizeLength(P2TR_CHANGE_SCRIPT_BYTES) + P2TR_CHANGE_SCRIPT_BYTES) -
    (8 + compactSizeLength(P2WPKH_CHANGE_SCRIPT_BYTES) + P2WPKH_CHANGE_SCRIPT_BYTES));

const payer = createFundingAccount(250, "p2wpkh");
const revealPayer = createFundingAccount(251, "p2wpkh");

const rows = BATCH_SIZES.map((batchSize) => measureBatchSize(batchSize));

console.log("# Merkle Batching Annex Hybrid Weight Model");
console.log("");
console.log("Assumptions:");
console.log("- ordinary-lane claim flow only");
console.log("- batch commit remains unchanged from the current measured design");
console.log("- hybrid reveal keeps one explicit BATCH_REVEAL header output");
console.log(
  `- explicit header grows by ${HYBRID_HEADER_EXTRA_PAYLOAD_BYTES} payload bytes to carry annex commitment fields`
);
console.log(
  `- annex carries proof bytes plus ${ANNEX_NON_PROOF_BYTES} non-proof bytes (0x50 prefix + proof-format byte)`
);
console.log(
  `- reveal funding input moves from signed p2wpkh witness (${P2WPKH_WITNESS_BYTES} bytes) to signed p2tr key-path witness (${P2TR_KEYPATH_WITNESS_BYTES} bytes) before annex`
);
console.log("- two variants are shown:");
console.log("  - same-change: keep the reveal change output script type unchanged");
console.log("  - taproot-change: also migrate reveal change to p2tr");
console.log("");
console.log("| Batch Size | Legacy Total vB | Current Explicit Batch Total vB | Current Explicit Reveal vB | Hybrid Reveal vB (same-change) | Hybrid Reveal vB (taproot-change) | Hybrid Batch Total vB (same-change) | Hybrid Batch Total vB (taproot-change) | Net Saved vs Legacy (same-change) | Net Saved vs Legacy (taproot-change) |");
console.log("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");

for (const row of rows) {
  console.log(
    `| ${row.batchSize} | ${row.legacy.totalVbytes} | ${row.explicitBatch.totalVbytes} | ${row.explicitBatch.revealVbytesPerClaim} | ${row.hybrid.sameChange.revealVbytesPerClaim} | ${row.hybrid.taprootChange.revealVbytesPerClaim} | ${row.hybrid.sameChange.totalVbytes} | ${row.hybrid.taprootChange.totalVbytes} | ${row.hybrid.sameChange.savedVsLegacy} | ${row.hybrid.taprootChange.savedVsLegacy} |`
  );
}

console.log("");
console.log("JSON:");
console.log(JSON.stringify({ kind: "gns-annex-hybrid-weight-model", rows }, null, 2));

function measureBatchSize(batchSize) {
  const claimPackages = Array.from({ length: batchSize }, (_, index) => createBenchmarkClaimPackage(index));

  const legacyCommitSigned = claimPackages.map((claimPackage, index) =>
    signBuiltArtifacts(
      buildCommitArtifacts({
        claimPackage,
        fundingInputs: [
          createFundingInput({
            txidSeed: 10_000 + index,
            address: payer.address,
            valueSats: BigInt(claimPackage.requiredBondSats) + COMMIT_FEE_SATS + EXTRA_INPUT_BUFFER_SATS
          })
        ],
        feeSats: COMMIT_FEE_SATS,
        network: "regtest",
        bondAddress: payer.address,
        changeAddress: payer.address
      }),
      [payer.wif]
    )
  );

  const legacyRevealSigned = legacyCommitSigned.map(({ artifacts }, index) =>
    signBuiltArtifacts(
      buildRevealArtifacts({
        claimPackage: artifacts.updatedClaimPackage,
        fundingInputs: [
          createFundingInput({
            txidSeed: 20_000 + index,
            address: revealPayer.address,
            valueSats: REVEAL_FEE_SATS + EXTRA_INPUT_BUFFER_SATS
          })
        ],
        feeSats: REVEAL_FEE_SATS,
        network: "regtest",
        changeAddress: revealPayer.address
      }),
      [revealPayer.wif]
    )
  );

  const batchCommitArtifacts = buildBatchCommitArtifacts({
    claimPackages,
    fundingInputs: [
      createFundingInput({
        txidSeed: 30_000 + batchSize,
        address: payer.address,
        valueSats:
          claimPackages.reduce((sum, claimPackage) => sum + BigInt(claimPackage.requiredBondSats), 0n) +
          COMMIT_FEE_SATS +
          EXTRA_INPUT_BUFFER_SATS
      })
    ],
    feeSats: COMMIT_FEE_SATS,
    network: "regtest",
    changeAddress: payer.address
  });
  const signedBatchCommit = signBuiltArtifacts(batchCommitArtifacts, [payer.wif]);
  const batchRevealSigned = batchCommitArtifacts.updatedClaimPackages.map((claimPackage, index) => {
    const artifacts = buildBatchRevealArtifacts({
      claimPackage,
      fundingInputs: [
        createFundingInput({
          txidSeed: 40_000 + index,
          address: revealPayer.address,
          valueSats: REVEAL_FEE_SATS + EXTRA_INPUT_BUFFER_SATS
        })
      ],
      feeSats: REVEAL_FEE_SATS,
      network: "regtest",
      changeAddress: revealPayer.address
    });

    return signBuiltArtifacts(artifacts, [revealPayer.wif]);
  });

  const sampleBatchRevealArtifacts = batchRevealSigned[0]?.artifacts;

  if (!sampleBatchRevealArtifacts) {
    throw new Error("missing sample batch reveal artifacts");
  }

  const proofOutputBytes = sampleBatchRevealArtifacts.outputs
    .filter((output) => output.role === "gns_reveal_proof_chunk")
    .reduce((sum, output) => sum + outputSizeBytes(output.scriptHex.length / 2), 0);

  const currentHeaderOutput = sampleBatchRevealArtifacts.outputs.find(
    (output) => output.role === "gns_batch_reveal"
  );

  if (!currentHeaderOutput) {
    throw new Error("missing gns_batch_reveal output");
  }

  const currentHeaderOutputBytes = outputSizeBytes(currentHeaderOutput.scriptHex.length / 2);
  const currentRevealPayloadBytes =
    batchCommitArtifacts.updatedClaimPackages[0].revealPayloadHex.length / 2;
  const hybridRevealPayloadBytes = currentRevealPayloadBytes + HYBRID_HEADER_EXTRA_PAYLOAD_BYTES;
  const hybridHeaderScriptBytes = opReturnScriptBytes(hybridRevealPayloadBytes);
  const hybridHeaderOutputBytes = outputSizeBytes(hybridHeaderScriptBytes);
  const headerDeltaWu = 4 * (hybridHeaderOutputBytes - currentHeaderOutputBytes);

  const proofBytes = batchCommitArtifacts.updatedClaimPackages[0].batchProofBytes;
  const annexPayloadBytes = ANNEX_NON_PROOF_BYTES + proofBytes;
  const annexAdditionalWu = compactSizeLength(annexPayloadBytes) + annexPayloadBytes;

  const legacyCommitVbytes = sumBy(legacyCommitSigned, ({ transaction }) => transaction.virtualSize());
  const legacyRevealVbytes = sumBy(legacyRevealSigned, ({ transaction }) => transaction.virtualSize());
  const legacyTotalVbytes = legacyCommitVbytes + legacyRevealVbytes;

  const explicitBatchRevealVbytes = sumBy(batchRevealSigned, ({ transaction }) => transaction.virtualSize());
  const explicitBatchRevealAvgVbytes = roundToOneDecimal(explicitBatchRevealVbytes / batchSize);
  const currentBatchTotalVbytes = signedBatchCommit.transaction.virtualSize() + explicitBatchRevealVbytes;

  const sameChangeRevealVbytes = batchRevealSigned.map(({ transaction }) =>
    Math.ceil(
      (transaction.weight() -
        4 * proofOutputBytes +
        headerDeltaWu +
        INPUT_WITNESS_DELTA_WU +
        annexAdditionalWu) /
        4
    )
  );
  const taprootChangeRevealVbytes = batchRevealSigned.map(({ transaction }) =>
    Math.ceil(
      (transaction.weight() -
        4 * proofOutputBytes +
        headerDeltaWu +
        INPUT_WITNESS_DELTA_WU +
        annexAdditionalWu +
        P2TR_CHANGE_OUTPUT_DELTA_WU) /
        4
    )
  );
  const sameChangeRevealTotalVbytes = sumBy(sameChangeRevealVbytes, (value) => value);
  const taprootChangeRevealTotalVbytes = sumBy(taprootChangeRevealVbytes, (value) => value);
  const sameChangeRevealAvgVbytes = roundToOneDecimal(sameChangeRevealTotalVbytes / batchSize);
  const taprootChangeRevealAvgVbytes = roundToOneDecimal(taprootChangeRevealTotalVbytes / batchSize);

  return {
    batchSize,
    assumptions: {
      proofBytes,
      currentRevealPayloadBytes,
      hybridRevealPayloadBytes,
      proofOutputBytes,
      currentHeaderOutputBytes,
      hybridHeaderOutputBytes,
      annexPayloadBytes,
      annexAdditionalWu,
      inputWitnessDeltaWu: INPUT_WITNESS_DELTA_WU,
      taprootChangeOutputDeltaWu: P2TR_CHANGE_OUTPUT_DELTA_WU
    },
    legacy: {
      totalVbytes: legacyTotalVbytes
    },
    explicitBatch: {
      totalVbytes: currentBatchTotalVbytes,
      revealVbytesPerClaim: explicitBatchRevealAvgVbytes
    },
    hybrid: {
      sameChange: {
        revealVbytesPerClaim: sameChangeRevealAvgVbytes,
        totalVbytes: signedBatchCommit.transaction.virtualSize() + sameChangeRevealTotalVbytes,
        savedVsLegacy: legacyTotalVbytes - (signedBatchCommit.transaction.virtualSize() + sameChangeRevealTotalVbytes)
      },
      taprootChange: {
        revealVbytesPerClaim: taprootChangeRevealAvgVbytes,
        totalVbytes: signedBatchCommit.transaction.virtualSize() + taprootChangeRevealTotalVbytes,
        savedVsLegacy:
          legacyTotalVbytes - (signedBatchCommit.transaction.virtualSize() + taprootChangeRevealTotalVbytes)
      }
    }
  };
}

function createBenchmarkClaimPackage(index) {
  const name = `benchclaim${String(index).padStart(2, "0")}`;
  const ownerPubkey = Buffer.alloc(32, index + 1).toString("hex");
  const nonceHex = Buffer.alloc(8, index + 11).toString("hex");

  return createClaimPackage({
    name,
    ownerPubkey,
    nonceHex,
    bondDestination: payer.address,
    changeDestination: payer.address
  });
}

function createFundingAccount(seed, mode) {
  const privateKey = Buffer.alloc(32, seed);
  const keyPair = ECPair.fromPrivateKey(privateKey, {
    network: NETWORK,
    compressed: true
  });

  const payment =
    mode === "p2wpkh"
      ? payments.p2wpkh({
          pubkey: keyPair.publicKey,
          network: NETWORK
        })
      : (() => {
          const internalPubkey = Buffer.from(keyPair.publicKey).subarray(1, 33);
          return payments.p2tr({
            internalPubkey,
            network: NETWORK
          });
        })();

  if (!payment.address) {
    throw new Error("unable to derive funding address");
  }

  return {
    address: payment.address,
    wif: keyPair.toWIF()
  };
}

function createFundingInput({ txidSeed, address, valueSats }) {
  return {
    txid: Buffer.alloc(32, txidSeed % 256).toString("hex"),
    vout: 0,
    valueSats,
    address
  };
}

function signBuiltArtifacts(artifacts, wifs) {
  const psbt = Psbt.fromBase64(artifacts.psbtBase64, { network: NETWORK });
  const keyPairs = wifs.map((wif) => ECPair.fromWIF(wif, NETWORK));

  for (let inputIndex = 0; inputIndex < psbt.inputCount; inputIndex += 1) {
    let signed = false;

    for (const keyPair of keyPairs) {
      if (!psbt.inputHasPubkey(inputIndex, keyPair.publicKey)) {
        continue;
      }

      psbt.signInput(inputIndex, keyPair);
      signed = true;
      break;
    }

    if (!signed) {
      throw new Error(`no supplied WIF matched input ${inputIndex}`);
    }
  }

  psbt.finalizeAllInputs();

  return {
    artifacts,
    transaction: psbt.extractTransaction(true)
  };
}

function sumBy(items, project) {
  return items.reduce((sum, item) => sum + project(item), 0);
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function outputSizeBytes(scriptBytes) {
  return 8 + compactSizeLength(scriptBytes) + scriptBytes;
}

function opReturnScriptBytes(payloadBytes) {
  return 1 + pushDataPrefixLength(payloadBytes) + payloadBytes;
}

function pushDataPrefixLength(payloadBytes) {
  if (payloadBytes < 0x4c) {
    return 1;
  }

  if (payloadBytes <= 0xff) {
    return 2;
  }

  if (payloadBytes <= 0xffff) {
    return 3;
  }

  return 5;
}

function compactSizeLength(value) {
  if (value < 0xfd) {
    return 1;
  }

  if (value <= 0xffff) {
    return 3;
  }

  if (value <= 0xffffffff) {
    return 5;
  }

  return 9;
}
