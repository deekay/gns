#!/usr/bin/env node

import ECPairFactory from "ecpair";
import { initEccLib, networks, payments, Psbt, Transaction } from "bitcoinjs-lib";
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
const BATCH_SIZES = [1, 2, 4, 8, 16, 32, 64];

const payer = createFundingAccount(250);
const revealPayer = createFundingAccount(251);

const rows = BATCH_SIZES.map((batchSize) => measureBatchSize(batchSize));

console.log("# Merkle Batching Footprint Report");
console.log("");
console.log("Assumptions:");
console.log("- ordinary-lane claim flow only");
console.log("- signed p2wpkh transactions");
console.log("- one dedicated commit funding input per single-name commit");
console.log("- one shared funding input for the batch commit");
console.log("- one reveal transaction per name in both paths");
console.log("- default proof chunk size of 66 bytes");
console.log("- benchmark names are normalized lowercase alphanumeric strings of equal length");
console.log("");
console.log("| Batch Size | Legacy Tx Count | Batch Tx Count | Legacy Total vB | Batch Total vB | vB Saved | vB Saved % | Legacy Avg/Claim vB | Batch Avg/Claim vB | Legacy Raw Bytes | Batch Raw Bytes | Avg Proof Bytes |");
console.log("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");

for (const row of rows) {
  console.log(
    `| ${row.batchSize} | ${row.legacy.txCount} | ${row.batch.txCount} | ${row.legacy.totalVbytes} | ${row.batch.totalVbytes} | ${row.delta.savedVbytes} | ${row.delta.savedVbytesPct} | ${row.legacy.avgPerClaimVbytes} | ${row.batch.avgPerClaimVbytes} | ${row.legacy.totalRawBytes} | ${row.batch.totalRawBytes} | ${row.batch.avgProofBytes} |`
  );
}

console.log("");
console.log("Commit-only comparison:");
console.log("");
console.log("| Batch Size | Legacy Commit Tx Count | Batch Commit Tx Count | Legacy Commit vB | Batch Commit vB | Commit vB Saved | Commit vB Saved % |");
console.log("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");

for (const row of rows) {
  console.log(
    `| ${row.batchSize} | ${row.legacy.commitTxCount} | ${row.batch.commitTxCount} | ${row.legacy.commitVbytes} | ${row.batch.commitVbytes} | ${row.delta.commitSavedVbytes} | ${row.delta.commitSavedVbytesPct} |`
  );
}

console.log("");
console.log("JSON:");
console.log(JSON.stringify({ kind: "gns-batch-footprint-report", rows }, null, 2));

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
  const batchRevealSigned = batchCommitArtifacts.updatedClaimPackages.map((claimPackage, index) =>
    signBuiltArtifacts(
      buildBatchRevealArtifacts({
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
      }),
      [revealPayer.wif]
    )
  );

  const legacyCommitVbytes = sumBy(legacyCommitSigned, ({ transaction }) => transaction.virtualSize());
  const legacyRevealVbytes = sumBy(legacyRevealSigned, ({ transaction }) => transaction.virtualSize());
  const legacyCommitRawBytes = sumBy(legacyCommitSigned, ({ transaction }) => transaction.byteLength());
  const legacyRevealRawBytes = sumBy(legacyRevealSigned, ({ transaction }) => transaction.byteLength());

  const batchCommitVbytes = signedBatchCommit.transaction.virtualSize();
  const batchRevealVbytes = sumBy(batchRevealSigned, ({ transaction }) => transaction.virtualSize());
  const batchCommitRawBytes = signedBatchCommit.transaction.byteLength();
  const batchRevealRawBytes = sumBy(batchRevealSigned, ({ transaction }) => transaction.byteLength());
  const avgProofBytes = roundToInt(
    batchCommitArtifacts.updatedClaimPackages.reduce(
      (sum, claimPackage) => sum + claimPackage.batchProofBytes,
      0
    ) / batchCommitArtifacts.updatedClaimPackages.length
  );

  const legacyTotalVbytes = legacyCommitVbytes + legacyRevealVbytes;
  const batchTotalVbytes = batchCommitVbytes + batchRevealVbytes;
  const legacyTotalRawBytes = legacyCommitRawBytes + legacyRevealRawBytes;
  const batchTotalRawBytes = batchCommitRawBytes + batchRevealRawBytes;

  return {
    batchSize,
    legacy: {
      txCount: legacyCommitSigned.length + legacyRevealSigned.length,
      commitTxCount: legacyCommitSigned.length,
      commitVbytes: legacyCommitVbytes,
      revealVbytes: legacyRevealVbytes,
      totalVbytes: legacyTotalVbytes,
      totalRawBytes: legacyTotalRawBytes,
      avgPerClaimVbytes: roundToOneDecimal(legacyTotalVbytes / batchSize)
    },
    batch: {
      txCount: 1 + batchRevealSigned.length,
      commitTxCount: 1,
      commitVbytes: batchCommitVbytes,
      revealVbytes: batchRevealVbytes,
      totalVbytes: batchTotalVbytes,
      totalRawBytes: batchTotalRawBytes,
      avgPerClaimVbytes: roundToOneDecimal(batchTotalVbytes / batchSize),
      avgProofBytes
    },
    delta: {
      savedVbytes: legacyTotalVbytes - batchTotalVbytes,
      savedVbytesPct: formatPercent((legacyTotalVbytes - batchTotalVbytes) / legacyTotalVbytes),
      commitSavedVbytes: legacyCommitVbytes - batchCommitVbytes,
      commitSavedVbytesPct: formatPercent((legacyCommitVbytes - batchCommitVbytes) / legacyCommitVbytes),
      savedRawBytes: legacyTotalRawBytes - batchTotalRawBytes
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

function createFundingAccount(seed) {
  const privateKey = Buffer.alloc(32, seed);
  const keyPair = ECPair.fromPrivateKey(privateKey, {
    network: NETWORK,
    compressed: true
  });
  const payment = payments.p2wpkh({
    pubkey: keyPair.publicKey,
    network: NETWORK
  });

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
  const transaction = psbt.extractTransaction(true);

  return {
    artifacts,
    transaction
  };
}

function sumBy(items, iteratee) {
  return items.reduce((sum, item) => sum + iteratee(item), 0);
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function roundToInt(value) {
  return Math.round(value);
}

function formatPercent(value) {
  return `${roundToOneDecimal(value * 100)}%`;
}
