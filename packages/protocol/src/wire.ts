import { bytesToHex, hexToBytes } from "./bytes.js";
import { OntEventType, PROTOCOL_MAGIC, PROTOCOL_VERSION } from "./constants.js";
import {
  createAuctionBidPayload,
  createBatchAnchorPayload,
  createBatchRevealPayload,
  createCommitPayload,
  createRevealPayload,
  createRevealProofChunkPayload,
  createTransferPayload,
  type AuctionBidEventPayload,
  type BatchAnchorEventPayload,
  type BatchRevealEventPayload,
  type CommitEventPayload,
  type RevealEventPayload,
  type RevealProofChunkEventPayload,
  type TransferEventPayload
} from "./events.js";

const MAGIC_BYTES = Buffer.from(PROTOCOL_MAGIC, "utf8");

export const COMMIT_PAYLOAD_LENGTH = 3 + 1 + 1 + 1 + 32 + 32;
export const TRANSFER_BODY_LENGTH = 32 + 32 + 1 + 1 + 64;
export const MAX_REVEAL_NAME_LENGTH = 32;
export const BATCH_ANCHOR_PAYLOAD_LENGTH = 3 + 1 + 1 + 1 + 1 + 32;
export const BATCH_REVEAL_MIN_PAYLOAD_LENGTH = 3 + 1 + 1 + 32 + 32 + 8 + 1 + 2 + 1 + 1;
export const REVEAL_PROOF_CHUNK_MIN_PAYLOAD_LENGTH = 3 + 1 + 1 + 1;
export const AUCTION_BID_PAYLOAD_LENGTH = 3 + 1 + 1 + 1 + 1 + 4 + 8 + 32 + 16 + 32 + 16;

export type DecodedOntPayload =
  | { readonly type: OntEventType.Commit; readonly payload: CommitEventPayload }
  | { readonly type: OntEventType.Reveal; readonly payload: RevealEventPayload }
  | { readonly type: OntEventType.Transfer; readonly payload: TransferEventPayload }
  | { readonly type: OntEventType.BatchAnchor; readonly payload: BatchAnchorEventPayload }
  | { readonly type: OntEventType.BatchReveal; readonly payload: BatchRevealEventPayload }
  | { readonly type: OntEventType.RevealProofChunk; readonly payload: RevealProofChunkEventPayload }
  | { readonly type: OntEventType.AuctionBid; readonly payload: AuctionBidEventPayload };

export function encodeCommitPayload(payload: CommitEventPayload): Uint8Array {
  const normalized = createCommitPayload(payload);

  return joinBytes(
    MAGIC_BYTES,
    Uint8Array.of(PROTOCOL_VERSION, OntEventType.Commit, normalized.bondVout),
    hexToBytes(normalized.ownerPubkey),
    hexToBytes(normalized.commitHash)
  );
}

export function decodeCommitPayload(payload: Uint8Array): CommitEventPayload {
  assertHeader(payload, OntEventType.Commit, COMMIT_PAYLOAD_LENGTH);

  return createCommitPayload({
    bondVout: payload[5] ?? 0,
    ownerPubkey: bytesToHex(payload.slice(6, 38)),
    commitHash: bytesToHex(payload.slice(38, 70))
  });
}

export function encodeRevealPayload(payload: RevealEventPayload): Uint8Array {
  const normalized = createRevealPayload(payload);
  const nameBytes = Buffer.from(normalized.name, "utf8");

  if (nameBytes.length > MAX_REVEAL_NAME_LENGTH) {
    throw new Error(`name must be at most ${MAX_REVEAL_NAME_LENGTH} bytes`);
  }

  return joinBytes(
    MAGIC_BYTES,
    Uint8Array.of(PROTOCOL_VERSION, OntEventType.Reveal),
    hexToBytes(normalized.commitTxid),
    bigIntToUint64Bytes(normalized.nonce),
    Uint8Array.of(nameBytes.length),
    nameBytes
  );
}

export function decodeRevealPayload(payload: Uint8Array): RevealEventPayload {
  assertHeader(payload, OntEventType.Reveal);

  const nameLength = payload[45];

  if (nameLength === undefined) {
    throw new Error("reveal payload is missing name length");
  }

  if (nameLength > MAX_REVEAL_NAME_LENGTH) {
    throw new Error(`reveal name length must be at most ${MAX_REVEAL_NAME_LENGTH}`);
  }

  if (payload.length !== 46 + nameLength) {
    throw new Error("reveal payload length does not match embedded name length");
  }

  return createRevealPayload({
    commitTxid: bytesToHex(payload.slice(5, 37)),
    nonce: uint64BytesToBigInt(payload.slice(37, 45)),
    name: Buffer.from(payload.slice(46)).toString("utf8")
  });
}

export function encodeBatchAnchorPayload(payload: BatchAnchorEventPayload): Uint8Array {
  const normalized = createBatchAnchorPayload(payload);

  return joinBytes(
    MAGIC_BYTES,
    Uint8Array.of(
      PROTOCOL_VERSION,
      OntEventType.BatchAnchor,
      normalized.flags,
      normalized.leafCount
    ),
    hexToBytes(normalized.merkleRoot)
  );
}

export function decodeBatchAnchorPayload(payload: Uint8Array): BatchAnchorEventPayload {
  assertHeader(payload, OntEventType.BatchAnchor, BATCH_ANCHOR_PAYLOAD_LENGTH);

  return createBatchAnchorPayload({
    flags: payload[5] ?? 0,
    leafCount: payload[6] ?? 0,
    merkleRoot: bytesToHex(payload.slice(7, 39))
  });
}

export function encodeBatchRevealPayload(payload: BatchRevealEventPayload): Uint8Array {
  const normalized = createBatchRevealPayload(payload);
  const nameBytes = Buffer.from(normalized.name, "utf8");

  if (nameBytes.length > MAX_REVEAL_NAME_LENGTH) {
    throw new Error(`name must be at most ${MAX_REVEAL_NAME_LENGTH} bytes`);
  }

  return joinBytes(
    MAGIC_BYTES,
    Uint8Array.of(PROTOCOL_VERSION, OntEventType.BatchReveal),
    hexToBytes(normalized.anchorTxid),
    hexToBytes(normalized.ownerPubkey),
    bigIntToUint64Bytes(normalized.nonce),
    Uint8Array.of(normalized.bondVout),
    uint16ToBytes(normalized.proofBytesLength),
    Uint8Array.of(normalized.proofChunkCount, nameBytes.length),
    nameBytes
  );
}

export function decodeBatchRevealPayload(payload: Uint8Array): BatchRevealEventPayload {
  assertHeader(payload, OntEventType.BatchReveal);

  if (payload.length < BATCH_REVEAL_MIN_PAYLOAD_LENGTH) {
    throw new Error(
      `batch reveal payload must be at least ${BATCH_REVEAL_MIN_PAYLOAD_LENGTH} bytes`
    );
  }

  const nameLength = payload[81];

  if (nameLength === undefined) {
    throw new Error("batch reveal payload is missing name length");
  }

  if (nameLength > MAX_REVEAL_NAME_LENGTH) {
    throw new Error(`batch reveal name length must be at most ${MAX_REVEAL_NAME_LENGTH}`);
  }

  if (payload.length !== BATCH_REVEAL_MIN_PAYLOAD_LENGTH + nameLength) {
    throw new Error("batch reveal payload length does not match embedded name length");
  }

  return createBatchRevealPayload({
    anchorTxid: bytesToHex(payload.slice(5, 37)),
    ownerPubkey: bytesToHex(payload.slice(37, 69)),
    nonce: uint64BytesToBigInt(payload.slice(69, 77)),
    bondVout: payload[77] ?? 0,
    proofBytesLength: uint16FromBytes(payload.slice(78, 80)),
    proofChunkCount: payload[80] ?? 0,
    name: Buffer.from(payload.slice(82)).toString("utf8")
  });
}

export function encodeRevealProofChunkPayload(payload: RevealProofChunkEventPayload): Uint8Array {
  const normalized = createRevealProofChunkPayload(payload);

  return joinBytes(
    MAGIC_BYTES,
    Uint8Array.of(PROTOCOL_VERSION, OntEventType.RevealProofChunk, normalized.chunkIndex),
    hexToBytes(normalized.proofBytesHex)
  );
}

export function decodeRevealProofChunkPayload(payload: Uint8Array): RevealProofChunkEventPayload {
  assertHeader(payload, OntEventType.RevealProofChunk);

  if (payload.length < REVEAL_PROOF_CHUNK_MIN_PAYLOAD_LENGTH) {
    throw new Error(
      `reveal proof chunk payload must be at least ${REVEAL_PROOF_CHUNK_MIN_PAYLOAD_LENGTH} bytes`
    );
  }

  return createRevealProofChunkPayload({
    chunkIndex: payload[5] ?? 0,
    proofBytesHex: bytesToHex(payload.slice(6))
  });
}

export function encodeAuctionBidPayload(payload: AuctionBidEventPayload): Uint8Array {
  const normalized = createAuctionBidPayload(payload);

  return joinBytes(
    MAGIC_BYTES,
    Uint8Array.of(
      PROTOCOL_VERSION,
      OntEventType.AuctionBid,
      normalized.flags,
      normalized.bondVout
    ),
    uint32ToBytes(normalized.reservedLockBlocks),
    bigIntToUint64Bytes(normalized.bidAmountSats),
    hexToBytes(normalized.ownerPubkey),
    hexToBytes(normalized.auctionLotCommitment),
    hexToBytes(normalized.auctionCommitment),
    hexToBytes(normalized.bidderCommitment)
  );
}

export function decodeAuctionBidPayload(payload: Uint8Array): AuctionBidEventPayload {
  assertHeader(payload, OntEventType.AuctionBid, AUCTION_BID_PAYLOAD_LENGTH);

  return createAuctionBidPayload({
    flags: payload[5] ?? 0,
    bondVout: payload[6] ?? 0,
    reservedLockBlocks: uint32FromBytes(payload.slice(7, 11)),
    bidAmountSats: uint64BytesToBigInt(payload.slice(11, 19)),
    ownerPubkey: bytesToHex(payload.slice(19, 51)),
    auctionLotCommitment: bytesToHex(payload.slice(51, 67)),
    auctionCommitment: bytesToHex(payload.slice(67, 99)),
    bidderCommitment: bytesToHex(payload.slice(99, 115))
  });
}

export function encodeTransferBody(payload: TransferEventPayload): Uint8Array {
  const normalized = createTransferPayload(payload);

  return joinBytes(
    hexToBytes(normalized.prevStateTxid),
    hexToBytes(normalized.newOwnerPubkey),
    Uint8Array.of(normalized.flags, normalized.successorBondVout),
    hexToBytes(normalized.signature)
  );
}

export function decodeTransferBody(payload: Uint8Array): TransferEventPayload {
  if (payload.length !== TRANSFER_BODY_LENGTH) {
    throw new Error(`transfer body must be ${TRANSFER_BODY_LENGTH} bytes`);
  }

  return createTransferPayload({
    prevStateTxid: bytesToHex(payload.slice(0, 32)),
    newOwnerPubkey: bytesToHex(payload.slice(32, 64)),
    flags: payload[64] ?? 0,
    successorBondVout: payload[65] ?? 0,
    signature: bytesToHex(payload.slice(66, 130))
  });
}

export function decodeOntPayload(payload: Uint8Array): DecodedOntPayload {
  const type = peekEventType(payload);

  switch (type) {
    case OntEventType.Commit:
      return { type, payload: decodeCommitPayload(payload) };
    case OntEventType.Reveal:
      return { type, payload: decodeRevealPayload(payload) };
    case OntEventType.Transfer:
      return { type, payload: decodeTransferBody(payload.slice(5)) };
    case OntEventType.BatchAnchor:
      return { type, payload: decodeBatchAnchorPayload(payload) };
    case OntEventType.BatchReveal:
      return { type, payload: decodeBatchRevealPayload(payload) };
    case OntEventType.RevealProofChunk:
      return { type, payload: decodeRevealProofChunkPayload(payload) };
    case OntEventType.AuctionBid:
      return { type, payload: decodeAuctionBidPayload(payload) };
  }
}

export function peekEventType(payload: Uint8Array): OntEventType {
  assertOntPrefix(payload);

  const type = payload[4];

  if (
    type !== OntEventType.Commit &&
    type !== OntEventType.Reveal &&
    type !== OntEventType.Transfer &&
    type !== OntEventType.BatchAnchor &&
    type !== OntEventType.BatchReveal &&
    type !== OntEventType.RevealProofChunk &&
    type !== OntEventType.AuctionBid
  ) {
    throw new Error(`unsupported event type ${type}`);
  }

  return type;
}

export function encodeTransferPayload(payload: TransferEventPayload): Uint8Array {
  return joinBytes(
    MAGIC_BYTES,
    Uint8Array.of(PROTOCOL_VERSION, OntEventType.Transfer),
    encodeTransferBody(payload)
  );
}

function assertHeader(payload: Uint8Array, eventType: OntEventType, exactLength?: number): void {
  if (exactLength !== undefined && payload.length !== exactLength) {
    throw new Error(`payload must be ${exactLength} bytes`);
  }

  assertOntPrefix(payload);

  const type = payload[4];
  if (type !== eventType) {
    throw new Error(`unexpected event type ${type}`);
  }
}

function assertOntPrefix(payload: Uint8Array): void {
  if (payload.length < 5) {
    throw new Error("payload is too short");
  }

  const magic = Buffer.from(payload.slice(0, 3)).toString("utf8");
  if (magic !== PROTOCOL_MAGIC) {
    throw new Error("payload does not start with the ONT magic bytes");
  }

  const version = payload[3];
  if (version !== PROTOCOL_VERSION) {
    throw new Error(`unsupported protocol version ${version}`);
  }
}

function bigIntToUint64Bytes(value: bigint): Uint8Array {
  if (value < 0n || value > 0xffff_ffff_ffff_ffffn) {
    throw new Error("value must fit in an unsigned 64-bit integer");
  }

  const bytes = new Uint8Array(8);
  let remaining = value;

  for (let index = 7; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }

  return bytes;
}

function uint64BytesToBigInt(bytes: Uint8Array): bigint {
  if (bytes.length !== 8) {
    throw new Error("uint64 requires exactly 8 bytes");
  }

  let value = 0n;

  for (const current of bytes) {
    value = (value << 8n) | BigInt(current);
  }

  return value;
}

function uint16ToBytes(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new Error("value must fit in an unsigned 16-bit integer");
  }

  return Uint8Array.of((value >> 8) & 0xff, value & 0xff);
}

function uint16FromBytes(bytes: Uint8Array): number {
  if (bytes.length !== 2) {
    throw new Error("uint16 requires exactly 2 bytes");
  }

  return (bytes[0] ?? 0) * 0x100 + (bytes[1] ?? 0);
}

function uint32ToBytes(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new Error("value must fit in an unsigned 32-bit integer");
  }

  return Uint8Array.of(
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff
  );
}

function uint32FromBytes(bytes: Uint8Array): number {
  if (bytes.length !== 4) {
    throw new Error("uint32 requires exactly 4 bytes");
  }

  return (
    ((bytes[0] ?? 0) * 0x1000000)
    + ((bytes[1] ?? 0) << 16)
    + ((bytes[2] ?? 0) << 8)
    + (bytes[3] ?? 0)
  );
}

function joinBytes(...parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }

  return combined;
}
