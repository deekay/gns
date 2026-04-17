import { describe, expect, it } from "vitest";
import ECPairFactory from "ecpair";
import {
  Transaction,
  crypto as btcCrypto,
  initEccLib,
  networks,
  payments,
  script as btcScript,
  toXOnly
} from "bitcoinjs-lib";
import * as tinysecp from "tiny-secp256k1";

import {
  computeBatchCommitLeafHash,
  computeCommitHash,
  createMerkleProof,
  encodeBatchRevealPayload,
  encodeMerkleProof,
  computeMerkleRoot
} from "@ont/protocol";

import {
  extractExperimentalAnnexBatchRevealRecord,
  verifyExperimentalAnnexBatchReveal
} from "./experimental-annex.js";

initEccLib(tinysecp);

const ECPair = ECPairFactory(tinysecp);
const NETWORK = networks.regtest;
const EXPERIMENTAL_BATCH_REVEAL_EXTENSION_TYPE = 0xf0;

describe("experimental annex core spike", () => {
  it("parses and verifies an annex-bearing batch reveal while showing the explicit chunk model would reject it", () => {
    const ownerPubkey = "11".repeat(32);
    const nonce = 42n;
    const name = "alice";
    const bondVout = 1;
    const commitHash = computeCommitHash({
      name,
      nonce,
      ownerPubkey
    });
    const leafHashes = [
      computeBatchCommitLeafHash({
        bondVout,
        ownerPubkey,
        commitHash
      }),
      computeBatchCommitLeafHash({
        bondVout: 2,
        ownerPubkey: "22".repeat(32),
        commitHash: computeCommitHash({
          name: "bob",
          nonce: 7n,
          ownerPubkey: "22".repeat(32)
        })
      })
    ];
    const merkleRoot = computeMerkleRoot(leafHashes);
    const proofHex = Buffer.from(encodeMerkleProof(createMerkleProof(leafHashes, 0))).toString("hex");
    const annex = Buffer.concat([Buffer.from([0x50, 0x00]), Buffer.from(proofHex, "hex")]);
    const batchRevealPayload = Buffer.from(
      encodeBatchRevealPayload({
        anchorTxid: "aa".repeat(32),
        ownerPubkey,
        nonce,
        bondVout,
        proofBytesLength: proofHex.length / 2,
        proofChunkCount: 0,
        name
      })
    );
    const explicitHeader = buildExperimentalHeader({
      batchRevealPayload,
      carrierInputIndex: 0,
      annex
    });
    const signedTransactionHex = buildSignedAnnexRevealTransaction({
      explicitHeader,
      annex
    });

    const record = extractExperimentalAnnexBatchRevealRecord({
      signedTransactionHex
    });
    const verification = verifyExperimentalAnnexBatchReveal({
      signedTransactionHex,
      expectedMerkleRoot: merkleRoot
    });

    expect(record.payload.name).toBe(name);
    expect(record.payload.proofChunkCount).toBe(0);
    expect(record.annexProofHex).toBe(proofHex);
    expect(verification.verification.annexPresent).toBe(true);
    expect(verification.verification.annexPrefixValid).toBe(true);
    expect(verification.verification.headerCommitsToAnnex).toBe(true);
    expect(verification.verification.payloadProofBytesMatchAnnexProofBytes).toBe(true);
    expect(verification.verification.payloadProofChunkCountIsZero).toBe(true);
    expect(verification.verification.explicitChunkModelWouldAccept).toBe(false);
    expect(verification.verification.annexAwareMerkleProofValid).toBe(true);
    expect(verification.verification.annexAwareModelWouldAccept).toBe(true);
  });
});

function buildExperimentalHeader(options: {
  readonly batchRevealPayload: Buffer;
  readonly carrierInputIndex: number;
  readonly annex: Buffer;
}): Buffer {
  const annexLength = Buffer.alloc(2);
  annexLength.writeUInt16BE(options.annex.length, 0);

  return Buffer.concat([
    options.batchRevealPayload,
    Buffer.from([EXPERIMENTAL_BATCH_REVEAL_EXTENSION_TYPE, options.carrierInputIndex]),
    btcCrypto.sha256(options.annex),
    annexLength
  ]);
}

function buildSignedAnnexRevealTransaction(options: {
  readonly explicitHeader: Buffer;
  readonly annex: Buffer;
}): string {
  const prevoutValue = 75_000n;
  const feeSats = 500n;
  const internalKeyPair = ECPair.fromPrivateKey(Buffer.alloc(32, 61), {
    network: NETWORK,
    compressed: true
  });
  const internalPubkey = Buffer.from(toXOnly(internalKeyPair.publicKey));
  const taprootPayment = payments.p2tr({
    internalPubkey,
    network: NETWORK
  });

  if (!taprootPayment.output) {
    throw new Error("failed to derive test taproot payment");
  }

  const transaction = new Transaction();
  transaction.version = 2;
  transaction.addInput(Buffer.from("42".repeat(32), "hex").reverse(), 1);
  transaction.addOutput(btcScript.compile([btcScript.OPS.OP_RETURN, options.explicitHeader]), 0n);
  transaction.addOutput(taprootPayment.output, prevoutValue - feeSats);

  const tweakedPrivateKey = tweakPrivateKey({
    privateKey: Buffer.from(internalKeyPair.privateKey ?? []),
    publicKey: Buffer.from(internalKeyPair.publicKey)
  });
  const sighash = Buffer.from(
    transaction.hashForWitnessV1(
      0,
      [taprootPayment.output],
      [prevoutValue],
      Transaction.SIGHASH_DEFAULT,
      undefined,
      options.annex
    )
  );
  const signature = Buffer.from(tinysecp.signSchnorr(sighash, tweakedPrivateKey));

  transaction.setWitness(0, [signature, options.annex]);
  return transaction.toHex();
}

function tweakPrivateKey(options: {
  readonly privateKey: Uint8Array;
  readonly publicKey: Uint8Array;
}): Buffer {
  const adjustedPrivateKey =
    options.publicKey[0] === 3
      ? Buffer.from(tinysecp.privateNegate(options.privateKey))
      : Buffer.from(options.privateKey);
  const tweak = Buffer.from(btcCrypto.taggedHash("TapTweak", toXOnly(options.publicKey)));
  const tweaked = tinysecp.privateAdd(adjustedPrivateKey, tweak);

  if (!tweaked) {
    throw new Error("failed to tweak taproot private key");
  }

  return Buffer.from(tweaked);
}
