import { bytesToHex, hexToBytes } from "./bytes.js";
import { GnsEventType, PROTOCOL_MAGIC, PROTOCOL_VERSION } from "./constants.js";
import {
  createCommitPayload,
  createRevealPayload,
  createTransferPayload,
  type CommitEventPayload,
  type RevealEventPayload,
  type TransferEventPayload
} from "./events.js";

const MAGIC_BYTES = Buffer.from(PROTOCOL_MAGIC, "utf8");

export const COMMIT_PAYLOAD_LENGTH = 3 + 1 + 1 + 1 + 32 + 32;
export const TRANSFER_BODY_LENGTH = 32 + 32 + 1 + 1 + 64;
export const MAX_REVEAL_NAME_LENGTH = 32;

export type DecodedGnsPayload =
  | { readonly type: GnsEventType.Commit; readonly payload: CommitEventPayload }
  | { readonly type: GnsEventType.Reveal; readonly payload: RevealEventPayload }
  | { readonly type: GnsEventType.Transfer; readonly payload: TransferEventPayload };

export function encodeCommitPayload(payload: CommitEventPayload): Uint8Array {
  const normalized = createCommitPayload(payload);

  return joinBytes(
    MAGIC_BYTES,
    Uint8Array.of(PROTOCOL_VERSION, GnsEventType.Commit, normalized.bondVout),
    hexToBytes(normalized.ownerPubkey),
    hexToBytes(normalized.commitHash)
  );
}

export function decodeCommitPayload(payload: Uint8Array): CommitEventPayload {
  assertHeader(payload, GnsEventType.Commit, COMMIT_PAYLOAD_LENGTH);

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
    Uint8Array.of(PROTOCOL_VERSION, GnsEventType.Reveal),
    hexToBytes(normalized.commitTxid),
    bigIntToUint64Bytes(normalized.nonce),
    Uint8Array.of(nameBytes.length),
    nameBytes
  );
}

export function decodeRevealPayload(payload: Uint8Array): RevealEventPayload {
  assertHeader(payload, GnsEventType.Reveal);

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

export function decodeGnsPayload(payload: Uint8Array): DecodedGnsPayload {
  const type = peekEventType(payload);

  switch (type) {
    case GnsEventType.Commit:
      return { type, payload: decodeCommitPayload(payload) };
    case GnsEventType.Reveal:
      return { type, payload: decodeRevealPayload(payload) };
    case GnsEventType.Transfer:
      return { type, payload: decodeTransferBody(payload.slice(5)) };
  }
}

export function peekEventType(payload: Uint8Array): GnsEventType {
  assertGnsPrefix(payload);

  const type = payload[4];

  if (
    type !== GnsEventType.Commit &&
    type !== GnsEventType.Reveal &&
    type !== GnsEventType.Transfer
  ) {
    throw new Error(`unsupported event type ${type}`);
  }

  return type;
}

export function encodeTransferPayload(payload: TransferEventPayload): Uint8Array {
  return joinBytes(
    MAGIC_BYTES,
    Uint8Array.of(PROTOCOL_VERSION, GnsEventType.Transfer),
    encodeTransferBody(payload)
  );
}

function assertHeader(payload: Uint8Array, eventType: GnsEventType, exactLength?: number): void {
  if (exactLength !== undefined && payload.length !== exactLength) {
    throw new Error(`payload must be ${exactLength} bytes`);
  }

  assertGnsPrefix(payload);

  const type = payload[4];
  if (type !== eventType) {
    throw new Error(`unexpected event type ${type}`);
  }
}

function assertGnsPrefix(payload: Uint8Array): void {
  if (payload.length < 5) {
    throw new Error("payload is too short");
  }

  const magic = Buffer.from(payload.slice(0, 3)).toString("utf8");
  if (magic !== PROTOCOL_MAGIC) {
    throw new Error("payload does not start with the GNS magic bytes");
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
