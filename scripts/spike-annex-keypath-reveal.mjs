#!/usr/bin/env node

import { Buffer } from "node:buffer";

import ECPairFactory from "ecpair";
import {
  Psbt,
  Transaction,
  crypto as btcCrypto,
  initEccLib,
  networks,
  payments,
  script as btcScript,
  toXOnly
} from "bitcoinjs-lib";
import * as tinysecp from "tiny-secp256k1";

initEccLib(tinysecp);

const ECPair = ECPairFactory(tinysecp);
const NETWORK = networks.regtest;
const PROTOCOL_MAGIC = Buffer.from("ont", "utf8");
const EXPERIMENTAL_ANNEX_TYPE = 0xf0;

const internalKeyPair = ECPair.fromPrivateKey(Buffer.alloc(32, 61), {
  network: NETWORK,
  compressed: true
});
const internalPubkey = Buffer.from(toXOnly(internalKeyPair.publicKey));
const taprootPayment = payments.p2tr({
  internalPubkey,
  network: NETWORK
});

if (!taprootPayment.output || !taprootPayment.address || !taprootPayment.pubkey) {
  throw new Error("failed to derive taproot payment");
}

const prevoutValue = 50_000n;
const feeSats = 500n;
const changeValue = prevoutValue - feeSats;
const prevout = {
  txid: Buffer.alloc(32, 0x42).toString("hex"),
  vout: 1
};
const carrierInputIndex = 0;
const anchorTxid = Buffer.alloc(32, 0x11).toString("hex");
const bondVout = 2;
const name = "benchclaim00";

const proofA = createDeterministicProofBytes(99, 0x21);
const annexA = Buffer.concat([Buffer.from([0x50, 0x00]), proofA]);
const headerA = buildIllustrativeHybridHeader({
  anchorTxid,
  bondVout,
  carrierInputIndex,
  annex: annexA,
  name
});
const baseTransaction = buildBaseTransaction({
  prevout,
  header: headerA,
  changeScript: taprootPayment.output,
  changeValue
});
const basePsbt = buildBasePsbt({
  prevout,
  prevoutValue,
  header: headerA,
  changeAddress: taprootPayment.address,
  internalPubkey
});

const tweakedPrivateKey = tweakPrivateKey({
  privateKey: Buffer.from(internalKeyPair.privateKey ?? []),
  publicKey: Buffer.from(internalKeyPair.publicKey)
});
const tweakedPublicKey = Buffer.from(taprootPayment.pubkey);

const signingScripts = [taprootPayment.output];
const values = [prevoutValue];
const hashWithAnnexA = Buffer.from(
  baseTransaction.hashForWitnessV1(
    0,
    signingScripts,
    values,
    Transaction.SIGHASH_DEFAULT,
    undefined,
    annexA
  )
);
const hashWithoutAnnex = Buffer.from(
  baseTransaction.hashForWitnessV1(0, signingScripts, values, Transaction.SIGHASH_DEFAULT)
);
const signatureA = Buffer.from(tinysecp.signSchnorr(hashWithAnnexA, tweakedPrivateKey));
const signedTransactionA = baseTransaction.clone();
signedTransactionA.setWitness(0, [signatureA, annexA]);

const proofB = flipLastByte(proofA);
const annexB = Buffer.concat([Buffer.from([0x50, 0x00]), proofB]);
const hashWithAnnexB = Buffer.from(
  baseTransaction.hashForWitnessV1(
    0,
    signingScripts,
    values,
    Transaction.SIGHASH_DEFAULT,
    undefined,
    annexB
  )
);
const signatureB = Buffer.from(tinysecp.signSchnorr(hashWithAnnexB, tweakedPrivateKey));
const signedTransactionB = baseTransaction.clone();
signedTransactionB.setWitness(0, [signatureB, annexB]);

const decodedPaymentA = payments.p2tr({
  output: taprootPayment.output,
  witness: signedTransactionA.ins[0]?.witness,
  network: NETWORK
});

const report = {
  kind: "ont-annex-keypath-reveal-spike",
  network: "regtest",
  summary: {
    signedTxid: signedTransactionA.getId(),
    signedWtxid: displayHash(signedTransactionA.getHash(true)),
    alternateSignedTxid: signedTransactionB.getId(),
    alternateSignedWtxid: displayHash(signedTransactionB.getHash(true))
  },
  findings: {
    annexChangesTaprootSighash:
      bytesToHex(hashWithAnnexA) !== bytesToHex(hashWithoutAnnex),
    schnorrSignatureVerifiesWithAnnex: tinysecp.verifySchnorr(
      hashWithAnnexA,
      tweakedPublicKey,
      signatureA
    ),
    schnorrSignatureFailsWithoutAnnex: !tinysecp.verifySchnorr(
      hashWithoutAnnex,
      tweakedPublicKey,
      signatureA
    ),
    txidDoesNotCommitToWitness: signedTransactionA.getId() === signedTransactionB.getId(),
    wtxidChangesWhenAnnexChanges:
      displayHash(signedTransactionA.getHash(true)) !== displayHash(signedTransactionB.getHash(true)),
    explicitHeaderAnnexHashMatches:
      bytesToHex(btcCrypto.sha256(annexA)) === bytesToHex(extractAnnexHashFromHeader(headerA)),
    parsedP2trRecognizesKeySpendSignature: decodedPaymentA.signature?.length === 64,
    parsedP2trHasAnnexField: Object.prototype.hasOwnProperty.call(decodedPaymentA, "annex"),
    rawWitnessElementCount: signedTransactionA.ins[0]?.witness.length ?? null
  },
  artifacts: {
    basePsbtBase64: basePsbt.toBase64(),
    unsignedBaseTransactionHex: baseTransaction.toHex(),
    explicitHeaderHex: bytesToHex(headerA),
    explicitHeaderBytes: headerA.length,
    annexHex: bytesToHex(annexA),
    annexBytes: annexA.length,
    taprootPrevoutScriptHex: bytesToHex(taprootPayment.output),
    taprootChangeAddress: taprootPayment.address
  },
  witness: {
    annexHexRecoveredFromWitness: bytesToHex(
      Buffer.from(signedTransactionA.ins[0]?.witness.at(-1) ?? [])
    ),
    signatureHexRecoveredFromWitness: bytesToHex(
      Buffer.from(signedTransactionA.ins[0]?.witness[0] ?? [])
    )
  }
};

console.log("# Annex Key-Path Reveal Tooling Spike");
console.log("");
console.log(`signed txid: ${report.summary.signedTxid}`);
console.log(`signed wtxid: ${report.summary.signedWtxid}`);
console.log(`alternate signed wtxid: ${report.summary.alternateSignedWtxid}`);
console.log("");
console.log("Key findings:");
for (const [label, value] of Object.entries(report.findings)) {
  console.log(`- ${label}: ${value}`);
}
console.log("");
console.log("JSON:");
console.log(JSON.stringify(report, null, 2));

function buildIllustrativeHybridHeader({
  anchorTxid,
  bondVout,
  carrierInputIndex,
  annex,
  name
}) {
  const nameBytes = Buffer.from(name, "utf8");
  const annexHash = btcCrypto.sha256(annex);
  const annexLength = Buffer.alloc(2);
  annexLength.writeUInt16BE(annex.length, 0);

  return Buffer.concat([
    PROTOCOL_MAGIC,
    Buffer.from([1, EXPERIMENTAL_ANNEX_TYPE]),
    Buffer.from(anchorTxid, "hex"),
    Buffer.from([bondVout, carrierInputIndex]),
    annexHash,
    annexLength,
    Buffer.from([nameBytes.length]),
    nameBytes
  ]);
}

function buildBaseTransaction({ prevout, header, changeScript, changeValue }) {
  const transaction = new Transaction();
  transaction.version = 2;
  transaction.addInput(reverseHex(prevout.txid), prevout.vout);
  transaction.addOutput(btcScript.compile([btcScript.OPS.OP_RETURN, header]), 0n);
  transaction.addOutput(changeScript, changeValue);
  return transaction;
}

function buildBasePsbt({ prevout, prevoutValue, header, changeAddress, internalPubkey }) {
  const psbt = new Psbt({ network: NETWORK });
  psbt.setVersion(2);
  psbt.addInput({
    hash: prevout.txid,
    index: prevout.vout,
    witnessUtxo: {
      script: taprootPayment.output,
      value: prevoutValue
    },
    tapInternalKey: internalPubkey
  });
  psbt.addOutput({
    script: btcScript.compile([btcScript.OPS.OP_RETURN, header]),
    value: 0n
  });
  psbt.addOutput({
    address: changeAddress,
    value: prevoutValue - feeSats
  });
  return psbt;
}

function tweakPrivateKey({ privateKey, publicKey }) {
  if (privateKey.length !== 32) {
    throw new Error("internal private key is required for taproot signing spike");
  }

  const adjustedPrivateKey =
    publicKey[0] === 3
      ? Buffer.from(tinysecp.privateNegate(privateKey))
      : Buffer.from(privateKey);
  const tweak = Buffer.from(btcCrypto.taggedHash("TapTweak", toXOnly(publicKey)));
  const tweaked = tinysecp.privateAdd(adjustedPrivateKey, tweak);

  if (!tweaked) {
    throw new Error("failed to tweak taproot private key");
  }

  return Buffer.from(tweaked);
}

function createDeterministicProofBytes(length, start) {
  const buffer = Buffer.alloc(length);

  for (let index = 0; index < length; index += 1) {
    buffer[index] = (start + index) % 256;
  }

  return buffer;
}

function flipLastByte(buffer) {
  const copy = Buffer.from(buffer);
  copy[copy.length - 1] ^= 0x01;
  return copy;
}

function extractAnnexHashFromHeader(header) {
  return header.subarray(39, 71);
}

function reverseHex(hex) {
  return Buffer.from(hex, "hex").reverse();
}

function displayHash(bytes) {
  return Buffer.from(bytes).reverse().toString("hex");
}

function bytesToHex(bytes) {
  return Buffer.from(bytes).toString("hex");
}
