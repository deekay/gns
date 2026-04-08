import { createHash } from "node:crypto";
import * as secp256k1 from "tiny-secp256k1";

import { assertHexBytes, assertHexString, bytesToHex, hexToBytes } from "./bytes.js";
import { GnsEventType } from "./constants.js";
import { normalizeName } from "./names.js";

export interface CommitEventPayload {
  readonly bondVout: number;
  readonly ownerPubkey: string;
  readonly commitHash: string;
}

export interface RevealEventPayload {
  readonly commitTxid: string;
  readonly nonce: bigint;
  readonly name: string;
}

export interface TransferEventPayload {
  readonly prevStateTxid: string;
  readonly newOwnerPubkey: string;
  readonly flags: number;
  readonly successorBondVout: number;
  readonly signature: string;
}

export interface BatchAnchorEventPayload {
  readonly flags: number;
  readonly leafCount: number;
  readonly merkleRoot: string;
}

export interface BatchRevealEventPayload {
  readonly anchorTxid: string;
  readonly nonce: bigint;
  readonly bondVout: number;
  readonly proofBytesLength: number;
  readonly proofChunkCount: number;
  readonly name: string;
}

export interface RevealProofChunkEventPayload {
  readonly chunkIndex: number;
  readonly proofBytesHex: string;
}

export interface TransferAuthorizationFields {
  readonly prevStateTxid: string;
  readonly newOwnerPubkey: string;
  readonly flags: number;
  readonly successorBondVout: number;
}

export function computeCommitHash(input: { name: string; nonce: bigint; ownerPubkey: string }): string {
  const name = normalizeName(input.name);
  const ownerPubkey = assertHexBytes(input.ownerPubkey, 32, "ownerPubkey");

  if (input.nonce < 0n) {
    throw new Error("nonce must be non-negative");
  }

  const nameBytes = Buffer.from(name, "utf8");
  const ownerBytes = hexToBytes(ownerPubkey);
  const nonceBytes = bigIntToUint64Bytes(input.nonce);

  const hasher = createHash("sha256");
  hasher.update(Buffer.from([nameBytes.length]));
  hasher.update(nameBytes);
  hasher.update(ownerBytes);
  hasher.update(nonceBytes);

  return hasher.digest("hex");
}

export function createCommitPayload(input: {
  bondVout?: number;
  ownerPubkey: string;
  commitHash: string;
}): CommitEventPayload {
  const bondVout = input.bondVout ?? 0;

  if (!Number.isInteger(bondVout) || bondVout < 0 || bondVout > 0xff) {
    throw new Error("bondVout must fit in one byte");
  }

  return {
    bondVout,
    ownerPubkey: assertHexBytes(input.ownerPubkey, 32, "ownerPubkey"),
    commitHash: assertHexBytes(input.commitHash, 32, "commitHash")
  };
}

export function createRevealPayload(input: {
  commitTxid: string;
  nonce: bigint;
  name: string;
}): RevealEventPayload {
  return {
    commitTxid: assertHexBytes(input.commitTxid, 32, "commitTxid"),
    nonce: input.nonce,
    name: normalizeName(input.name)
  };
}

export function createTransferPayload(input: {
  prevStateTxid: string;
  newOwnerPubkey: string;
  flags: number;
  successorBondVout: number;
  signature: string;
}): TransferEventPayload {
  if (!Number.isInteger(input.flags) || input.flags < 0 || input.flags > 0xff) {
    throw new Error("flags must fit in one byte");
  }

  if (
    !Number.isInteger(input.successorBondVout) ||
    input.successorBondVout < 0 ||
    input.successorBondVout > 0xff
  ) {
    throw new Error("successorBondVout must fit in one byte");
  }

  return {
    prevStateTxid: assertHexBytes(input.prevStateTxid, 32, "prevStateTxid"),
    newOwnerPubkey: assertHexBytes(input.newOwnerPubkey, 32, "newOwnerPubkey"),
    flags: input.flags,
    successorBondVout: input.successorBondVout,
    signature: assertHexBytes(input.signature, 64, "signature")
  };
}

export function createBatchAnchorPayload(input: {
  readonly flags?: number;
  readonly leafCount: number;
  readonly merkleRoot: string;
}): BatchAnchorEventPayload {
  const flags = input.flags ?? 0;

  if (!Number.isInteger(flags) || flags < 0 || flags > 0xff) {
    throw new Error("flags must fit in one byte");
  }

  if (!Number.isInteger(input.leafCount) || input.leafCount < 0 || input.leafCount > 0xff) {
    throw new Error("leafCount must fit in one byte");
  }

  return {
    flags,
    leafCount: input.leafCount,
    merkleRoot: assertHexBytes(input.merkleRoot, 32, "merkleRoot")
  };
}

export function createBatchRevealPayload(input: {
  readonly anchorTxid: string;
  readonly nonce: bigint;
  readonly bondVout: number;
  readonly proofBytesLength: number;
  readonly proofChunkCount: number;
  readonly name: string;
}): BatchRevealEventPayload {
  if (
    !Number.isInteger(input.bondVout) ||
    input.bondVout < 0 ||
    input.bondVout > 0xff
  ) {
    throw new Error("bondVout must fit in one byte");
  }

  if (
    !Number.isInteger(input.proofBytesLength) ||
    input.proofBytesLength < 0 ||
    input.proofBytesLength > 0xffff
  ) {
    throw new Error("proofBytesLength must fit in two bytes");
  }

  if (
    !Number.isInteger(input.proofChunkCount) ||
    input.proofChunkCount < 0 ||
    input.proofChunkCount > 0xff
  ) {
    throw new Error("proofChunkCount must fit in one byte");
  }

  return {
    anchorTxid: assertHexBytes(input.anchorTxid, 32, "anchorTxid"),
    nonce: input.nonce,
    bondVout: input.bondVout,
    proofBytesLength: input.proofBytesLength,
    proofChunkCount: input.proofChunkCount,
    name: normalizeName(input.name)
  };
}

export function createRevealProofChunkPayload(input: {
  readonly chunkIndex: number;
  readonly proofBytesHex: string;
}): RevealProofChunkEventPayload {
  if (!Number.isInteger(input.chunkIndex) || input.chunkIndex < 0 || input.chunkIndex > 0xff) {
    throw new Error("chunkIndex must fit in one byte");
  }

  const proofBytesHex = assertHexString(input.proofBytesHex, "proofBytesHex");

  return {
    chunkIndex: input.chunkIndex,
    proofBytesHex
  };
}

export function signTransferAuthorization(
  input: TransferAuthorizationFields & { readonly ownerPrivateKeyHex: string }
): string {
  const ownerPrivateKey = hexToBytes(assertHexBytes(input.ownerPrivateKeyHex, 32, "ownerPrivateKeyHex"));

  if (!secp256k1.isPrivate(ownerPrivateKey)) {
    throw new Error("ownerPrivateKeyHex must be a valid secp256k1 private key");
  }

  return bytesToHex(
    secp256k1.signSchnorr(computeTransferAuthorizationDigest(input), ownerPrivateKey)
  );
}

export function verifyTransferAuthorization(
  input: TransferAuthorizationFields & {
    readonly ownerPubkey: string;
    readonly signature: string;
  }
): boolean {
  const ownerPubkey = hexToBytes(assertHexBytes(input.ownerPubkey, 32, "ownerPubkey"));
  const signature = hexToBytes(assertHexBytes(input.signature, 64, "signature"));

  if (!secp256k1.isXOnlyPoint(ownerPubkey)) {
    return false;
  }

  return secp256k1.verifySchnorr(
    computeTransferAuthorizationDigest(input),
    ownerPubkey,
    signature
  );
}

export function computeTransferAuthorizationHash(input: TransferAuthorizationFields): string {
  return bytesToHex(computeTransferAuthorizationDigest(input));
}

export function getEventTypeName(
  type: GnsEventType
):
  | "COMMIT"
  | "REVEAL"
  | "TRANSFER"
  | "BATCH_ANCHOR"
  | "BATCH_REVEAL"
  | "REVEAL_PROOF_CHUNK" {
  switch (type) {
    case GnsEventType.Commit:
      return "COMMIT";
    case GnsEventType.Reveal:
      return "REVEAL";
    case GnsEventType.Transfer:
      return "TRANSFER";
    case GnsEventType.BatchAnchor:
      return "BATCH_ANCHOR";
    case GnsEventType.BatchReveal:
      return "BATCH_REVEAL";
    case GnsEventType.RevealProofChunk:
      return "REVEAL_PROOF_CHUNK";
  }
}

function bigIntToUint64Bytes(value: bigint): Uint8Array {
  if (value > 0xffff_ffff_ffff_ffffn) {
    throw new Error("nonce must fit in 8 bytes");
  }

  const bytes = new Uint8Array(8);
  let remaining = value;

  for (let index = 7; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }

  return bytes;
}

export function serializeUint8ArrayToHex(bytes: Uint8Array): string {
  return bytesToHex(bytes);
}

function computeTransferAuthorizationDigest(input: TransferAuthorizationFields): Uint8Array {
  const hasher = createHash("sha256");
  hasher.update(hexToBytes(assertHexBytes(input.prevStateTxid, 32, "prevStateTxid")));
  hasher.update(hexToBytes(assertHexBytes(input.newOwnerPubkey, 32, "newOwnerPubkey")));

  if (!Number.isInteger(input.flags) || input.flags < 0 || input.flags > 0xff) {
    throw new Error("flags must fit in one byte");
  }

  if (
    !Number.isInteger(input.successorBondVout) ||
    input.successorBondVout < 0 ||
    input.successorBondVout > 0xff
  ) {
    throw new Error("successorBondVout must fit in one byte");
  }

  hasher.update(Uint8Array.of(input.flags, input.successorBondVout));
  return hasher.digest();
}
