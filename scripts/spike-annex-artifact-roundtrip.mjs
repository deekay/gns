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
const EXPERIMENTAL_ANNEX_FORMAT = "ont-batch-proof-v0";

const signerKeyPair = ECPair.fromPrivateKey(Buffer.alloc(32, 71), {
  network: NETWORK,
  compressed: true
});
const signerInternalPubkey = Buffer.from(toXOnly(signerKeyPair.publicKey));
const taprootPayment = payments.p2tr({
  internalPubkey: signerInternalPubkey,
  network: NETWORK
});

if (!taprootPayment.output || !taprootPayment.address || !taprootPayment.pubkey) {
  throw new Error("failed to derive taproot payment");
}

const unsignedEnvelope = buildUnsignedEnvelope({
  signerInternalPubkey,
  changeAddress: taprootPayment.address
});
const signedEnvelope = signUnsignedEnvelope({
  unsignedEnvelope,
  signerWif: signerKeyPair.toWIF()
});
const verification = verifyRoundTrip({
  unsignedEnvelope,
  signedEnvelope
});

console.log("# Annex Artifact Round-Trip Spike");
console.log("");
console.log(`unsigned txid: ${unsignedEnvelope.unsignedBaseTransactionId}`);
console.log(`signed txid:   ${signedEnvelope.signedTransactionId}`);
console.log(`signed wtxid:  ${signedEnvelope.signedTransactionWitnessId}`);
console.log("");
console.log("Verification:");
for (const [label, value] of Object.entries(verification)) {
  console.log(`- ${label}: ${value}`);
}
console.log("");
console.log("JSON:");
console.log(
  JSON.stringify(
    {
      kind: "ont-annex-artifact-roundtrip-spike",
      unsignedEnvelope,
      signedEnvelope,
      verification
    },
    null,
    2
  )
);

function buildUnsignedEnvelope({ signerInternalPubkey, changeAddress }) {
  const prevoutValue = 75_000n;
  const feeSats = 500n;
  const changeValue = prevoutValue - feeSats;
  const prevout = {
    txid: Buffer.alloc(32, 0x31).toString("hex"),
    vout: 2
  };
  const carrierInputIndex = 0;
  const anchorTxid = Buffer.alloc(32, 0x19).toString("hex");
  const bondVout = 1;
  const name = "benchclaim00";
  const proofBytes = createDeterministicProofBytes(99, 0x41);
  const annex = Buffer.concat([Buffer.from([0x50, 0x00]), proofBytes]);
  const explicitHeader = buildIllustrativeHybridHeader({
    anchorTxid,
    bondVout,
    carrierInputIndex,
    annex,
    name
  });

  const transaction = new Transaction();
  transaction.version = 2;
  transaction.addInput(reverseHex(prevout.txid), prevout.vout);
  transaction.addOutput(btcScript.compile([btcScript.OPS.OP_RETURN, explicitHeader]), 0n);
  transaction.addOutput(taprootPayment.output, changeValue);

  const psbt = new Psbt({ network: NETWORK });
  psbt.setVersion(2);
  psbt.addInput({
    hash: prevout.txid,
    index: prevout.vout,
    witnessUtxo: {
      script: taprootPayment.output,
      value: prevoutValue
    },
    tapInternalKey: signerInternalPubkey
  });
  psbt.addOutput({
    script: btcScript.compile([btcScript.OPS.OP_RETURN, explicitHeader]),
    value: 0n
  });
  psbt.addOutput({
    address: changeAddress,
    value: changeValue
  });

  return {
    kind: "ont-batch-reveal-annex-artifacts",
    network: "regtest",
    psbtBase64: psbt.toBase64(),
    unsignedBaseTransactionHex: transaction.toHex(),
    unsignedBaseTransactionId: transaction.getId(),
    carrierInputIndex,
    carrierPrevout: prevout,
    explicitHeaderHex: bytesToHex(explicitHeader),
    explicitHeaderSha256: bytesToHex(btcCrypto.sha256(explicitHeader)),
    annexHex: bytesToHex(annex),
    annexSha256: bytesToHex(btcCrypto.sha256(annex)),
    annexBytesLength: annex.length,
    annexFormat: EXPERIMENTAL_ANNEX_FORMAT,
    anchorTxid,
    name,
    bondVout
  };
}

function signUnsignedEnvelope({ unsignedEnvelope, signerWif }) {
  const psbt = Psbt.fromBase64(unsignedEnvelope.psbtBase64, { network: NETWORK });
  const tx = Transaction.fromHex(unsignedEnvelope.unsignedBaseTransactionHex);
  const keyPair = ECPair.fromWIF(signerWif, NETWORK);
  const input = psbt.data.inputs[unsignedEnvelope.carrierInputIndex];

  if (!input?.witnessUtxo) {
    throw new Error("annex prototype signer requires witnessUtxo on the carrier input");
  }

  if (!input.tapInternalKey) {
    throw new Error("annex prototype signer requires tapInternalKey on the carrier input");
  }

  if (tx.getId() !== unsignedEnvelope.unsignedBaseTransactionId) {
    throw new Error("unsigned base transaction id does not match the envelope");
  }

  const headerBytes = Buffer.from(unsignedEnvelope.explicitHeaderHex, "hex");
  const parsedHeader = parseIllustrativeHybridHeader(headerBytes);

  if (parsedHeader.carrierInputIndex !== unsignedEnvelope.carrierInputIndex) {
    throw new Error("explicit header carrierInputIndex does not match the envelope");
  }

  if (parsedHeader.annexSha256 !== unsignedEnvelope.annexSha256) {
    throw new Error("explicit header annex hash does not match the envelope");
  }

  const annex = Buffer.from(unsignedEnvelope.annexHex, "hex");
  const annexSha256 = bytesToHex(btcCrypto.sha256(annex));

  if (annexSha256 !== unsignedEnvelope.annexSha256) {
    throw new Error("annex bytes do not match annexSha256");
  }

  const tweakedPrivateKey = tweakPrivateKey({
    privateKey: Buffer.from(keyPair.privateKey ?? []),
    publicKey: Buffer.from(keyPair.publicKey)
  });

  const sighash = Buffer.from(
    tx.hashForWitnessV1(
      unsignedEnvelope.carrierInputIndex,
      [input.witnessUtxo.script],
      [input.witnessUtxo.value],
      Transaction.SIGHASH_DEFAULT,
      undefined,
      annex
    )
  );
  const signature = Buffer.from(tinysecp.signSchnorr(sighash, tweakedPrivateKey));

  tx.setWitness(unsignedEnvelope.carrierInputIndex, [signature, annex]);

  return {
    kind: "ont-signed-batch-reveal-annex-artifacts",
    network: unsignedEnvelope.network,
    signedTransactionHex: tx.toHex(),
    signedTransactionId: tx.getId(),
    signedTransactionWitnessId: displayHash(tx.getHash(true)),
    signedInputCount: 1,
    signedPsbtBase64: null,
    signedPsbtReason:
      "custom annex finalization signs and attaches witness outside standard PSBT fields",
    carrierInputIndex: unsignedEnvelope.carrierInputIndex,
    annexSha256: unsignedEnvelope.annexSha256,
    annexBytesLength: unsignedEnvelope.annexBytesLength,
    explicitHeaderSha256: unsignedEnvelope.explicitHeaderSha256,
    anchorTxid: unsignedEnvelope.anchorTxid,
    name: unsignedEnvelope.name,
    bondVout: unsignedEnvelope.bondVout
  };
}

function verifyRoundTrip({ unsignedEnvelope, signedEnvelope }) {
  const tx = Transaction.fromHex(signedEnvelope.signedTransactionHex);
  const carrierWitness = tx.ins[signedEnvelope.carrierInputIndex]?.witness ?? [];
  const recoveredAnnex = Buffer.from(carrierWitness.at(-1) ?? []);
  const recoveredSignature = Buffer.from(carrierWitness[0] ?? []);
  const headerBytes = extractOpReturnPayload(tx.outs[0]?.script ?? new Uint8Array());
  const parsedHeader = parseIllustrativeHybridHeader(headerBytes);
  const headerHash = bytesToHex(btcCrypto.sha256(headerBytes));
  const annexHash = bytesToHex(btcCrypto.sha256(recoveredAnnex));
  const psbt = Psbt.fromBase64(unsignedEnvelope.psbtBase64, { network: NETWORK });
  const input = psbt.data.inputs[signedEnvelope.carrierInputIndex];
  const internalPubkey = Buffer.from(input?.tapInternalKey ?? []);

  if (!input?.witnessUtxo) {
    throw new Error("round-trip verifier requires witnessUtxo on the carrier input");
  }

  const tweakedPublicKey = deriveTweakedOutputKey({
    internalPubkey,
    tapMerkleRoot: input.tapMerkleRoot
  });
  const sighash = Buffer.from(
    tx.hashForWitnessV1(
      signedEnvelope.carrierInputIndex,
      [input.witnessUtxo.script],
      [input.witnessUtxo.value],
      Transaction.SIGHASH_DEFAULT,
      undefined,
      recoveredAnnex
    )
  );

  return {
    witnessAnnexPresent: recoveredAnnex.length === unsignedEnvelope.annexBytesLength,
    witnessAnnexMatchesUnsignedEnvelope: bytesToHex(recoveredAnnex) === unsignedEnvelope.annexHex,
    witnessAnnexHashMatchesHeader: annexHash === parsedHeader.annexSha256,
    witnessAnnexHashMatchesSignedEnvelope: annexHash === signedEnvelope.annexSha256,
    headerShaMatchesUnsignedEnvelope: headerHash === unsignedEnvelope.explicitHeaderSha256,
    headerShaMatchesSignedEnvelope: headerHash === signedEnvelope.explicitHeaderSha256,
    headerCarrierInputMatchesSignedEnvelope:
      parsedHeader.carrierInputIndex === signedEnvelope.carrierInputIndex,
    signedTxidMatchesEnvelope: tx.getId() === signedEnvelope.signedTransactionId,
    signedWtxidMatchesEnvelope: displayHash(tx.getHash(true)) === signedEnvelope.signedTransactionWitnessId,
    signatureVerifiesAgainstRecoveredAnnex:
      recoveredSignature.length === 64 &&
      tweakedPublicKey.length === 32 &&
      tinysecp.verifySchnorr(sighash, tweakedPublicKey, recoveredSignature)
  };
}

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

function parseIllustrativeHybridHeader(bytes) {
  if (bytes.length < 74) {
    throw new Error("illustrative hybrid header is too short");
  }

  if (!Buffer.from(bytes.subarray(0, 3)).equals(PROTOCOL_MAGIC)) {
    throw new Error("illustrative hybrid header is missing the ont magic");
  }

  const nameLength = bytes[73];

  if (nameLength === undefined || bytes.length !== 74 + nameLength) {
    throw new Error("illustrative hybrid header length does not match the embedded name length");
  }

  return {
    version: bytes[3],
    type: bytes[4],
    anchorTxid: bytesToHex(bytes.subarray(5, 37)),
    bondVout: bytes[37],
    carrierInputIndex: bytes[38],
    annexSha256: bytesToHex(bytes.subarray(39, 71)),
    annexBytesLength: Buffer.from(bytes.subarray(71, 73)).readUInt16BE(0),
    name: Buffer.from(bytes.subarray(74)).toString("utf8")
  };
}

function tweakPrivateKey({ privateKey, publicKey }) {
  if (privateKey.length !== 32) {
    throw new Error("internal private key is required for taproot signing");
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

function deriveTweakedOutputKey({ internalPubkey, tapMerkleRoot }) {
  const tweaked = tinysecp.xOnlyPointAddTweak(
    internalPubkey,
    Buffer.from(
      btcCrypto.taggedHash(
        "TapTweak",
        tapMerkleRoot ? Buffer.concat([internalPubkey, Buffer.from(tapMerkleRoot)]) : internalPubkey
      )
    )
  );

  if (!tweaked?.xOnlyPubkey) {
    throw new Error("failed to derive the tweaked taproot output key");
  }

  return Buffer.from(tweaked.xOnlyPubkey);
}

function extractOpReturnPayload(scriptBytes) {
  const decompiled = btcScript.decompile(scriptBytes);

  if (!decompiled || decompiled[0] !== btcScript.OPS.OP_RETURN || !(decompiled[1] instanceof Uint8Array)) {
    throw new Error("expected the first output to be OP_RETURN with a single payload push");
  }

  return Buffer.from(decompiled[1]);
}

function createDeterministicProofBytes(length, start) {
  const buffer = Buffer.alloc(length);

  for (let index = 0; index < length; index += 1) {
    buffer[index] = (start + index) % 256;
  }

  return buffer;
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
