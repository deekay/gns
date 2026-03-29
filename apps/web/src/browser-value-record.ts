import { schnorr, secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";

export const VALUE_RECORD_FORMAT = "gns-value-record";
export const VALUE_RECORD_VERSION = 1;
const NAME_PATTERN = /^[a-z0-9]{1,32}$/;
const HEX_PATTERN = /^[0-9a-f]+$/i;

export interface BrowserValueRecordFields {
  readonly name: string;
  readonly ownerPubkey: string;
  readonly sequence: number;
  readonly valueType: number;
  readonly payloadHex: string;
}

export interface BrowserSignedValueRecord extends BrowserValueRecordFields {
  readonly format: typeof VALUE_RECORD_FORMAT;
  readonly recordVersion: typeof VALUE_RECORD_VERSION;
  readonly exportedAt: string;
  readonly signature: string;
}

export function deriveOwnerPubkey(ownerPrivateKeyHex: string): string {
  const ownerPrivateKey = hexToBytes(assertHexBytes(ownerPrivateKeyHex, 32, "ownerPrivateKeyHex"));

  if (!secp256k1.utils.isValidSecretKey(ownerPrivateKey)) {
    throw new Error("ownerPrivateKeyHex must be a valid secp256k1 private key");
  }

  return bytesToHex(schnorr.getPublicKey(ownerPrivateKey));
}

export function signBrowserValueRecord(input: {
  readonly name: string;
  readonly ownerPrivateKeyHex: string;
  readonly sequence: number;
  readonly valueType: number;
  readonly payloadHex: string;
  readonly exportedAt?: string;
}): BrowserSignedValueRecord {
  const ownerPrivateKeyHex = assertHexBytes(input.ownerPrivateKeyHex, 32, "ownerPrivateKeyHex");
  const ownerPrivateKey = hexToBytes(ownerPrivateKeyHex);

  if (!secp256k1.utils.isValidSecretKey(ownerPrivateKey)) {
    throw new Error("ownerPrivateKeyHex must be a valid secp256k1 private key");
  }

  const fields: BrowserValueRecordFields = {
    name: normalizeName(input.name),
    ownerPubkey: bytesToHex(schnorr.getPublicKey(ownerPrivateKey)),
    sequence: assertSequence(input.sequence),
    valueType: assertByte(input.valueType, "valueType"),
    payloadHex: normalizePayloadHex(input.payloadHex)
  };

  return {
    format: VALUE_RECORD_FORMAT,
    recordVersion: VALUE_RECORD_VERSION,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    ...fields,
    signature: bytesToHex(schnorr.sign(computeValueRecordDigest(fields), ownerPrivateKey))
  };
}

export function verifyBrowserValueRecord(input: BrowserSignedValueRecord): boolean {
  try {
    const pubkey = hexToBytes(assertHexBytes(input.ownerPubkey, 32, "ownerPubkey"));
    const signature = hexToBytes(assertHexBytes(input.signature, 64, "signature"));

    return schnorr.verify(
      signature,
      computeValueRecordDigest({
        name: input.name,
        ownerPubkey: input.ownerPubkey,
        sequence: input.sequence,
        valueType: input.valueType,
        payloadHex: input.payloadHex
      }),
      pubkey
    );
  } catch {
    return false;
  }
}

export function payloadUtf8ToHex(value: string): string {
  return bytesToHex(new TextEncoder().encode(value));
}

export function normalizeRawPayloadHex(value: string): string {
  return normalizePayloadHex(value.trim().replace(/\s+/g, ""));
}

function computeValueRecordDigest(input: BrowserValueRecordFields): Uint8Array {
  const name = normalizeName(input.name);
  const ownerPubkey = hexToBytes(assertHexBytes(input.ownerPubkey, 32, "ownerPubkey"));
  const sequence = assertSequence(input.sequence);
  const valueType = assertByte(input.valueType, "valueType");
  const payloadBytes = hexToBytes(normalizePayloadHex(input.payloadHex));
  const nameBytes = new TextEncoder().encode(name);

  const message = new Uint8Array(
    1 + nameBytes.length + ownerPubkey.length + 8 + 1 + 2 + payloadBytes.length
  );

  let offset = 0;
  message[offset] = nameBytes.length;
  offset += 1;
  message.set(nameBytes, offset);
  offset += nameBytes.length;
  message.set(ownerPubkey, offset);
  offset += ownerPubkey.length;
  message.set(bigIntToUint64Bytes(BigInt(sequence)), offset);
  offset += 8;
  message[offset] = valueType;
  offset += 1;
  message.set(uint16ToBytes(payloadBytes.length), offset);
  offset += 2;
  message.set(payloadBytes, offset);

  return Uint8Array.from(sha256(message));
}

function normalizeName(input: string): string {
  const normalized = input.trim().toLowerCase();

  if (!NAME_PATTERN.test(normalized)) {
    throw new Error("name must be lowercase alphanumeric and 1-32 characters");
  }

  return normalized;
}

function normalizePayloadHex(payloadHex: string): string {
  if (typeof payloadHex !== "string") {
    throw new Error("payloadHex must be a string");
  }

  const normalized = payloadHex.trim().toLowerCase();
  if (!HEX_PATTERN.test(normalized)) {
    throw new Error("payloadHex must be lowercase or uppercase hex");
  }
  if (normalized.length % 2 !== 0) {
    throw new Error("payloadHex must have an even number of characters");
  }

  const payloadLength = normalized.length / 2;
  if (payloadLength > 0xffff) {
    throw new Error("payloadHex must fit in 65535 bytes");
  }

  return normalized;
}

function assertHexBytes(hex: string, expectedByteLength: number, label: string): string {
  const normalized = hex.trim().toLowerCase();

  if (!HEX_PATTERN.test(normalized)) {
    throw new Error(`${label} must be lowercase or uppercase hex`);
  }

  if (normalized.length !== expectedByteLength * 2) {
    throw new Error(`${label} must be ${expectedByteLength} bytes`);
  }

  return normalized;
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.toLowerCase();
  const bytes = new Uint8Array(normalized.length / 2);

  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }

  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function assertSequence(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("sequence must be a non-negative safe integer");
  }

  return value;
}

function assertByte(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new Error(`${label} must fit in one byte`);
  }

  return value;
}

function bigIntToUint64Bytes(value: bigint): Uint8Array {
  if (value < 0n || value > 0xffff_ffff_ffff_ffffn) {
    throw new Error("sequence must fit in 8 bytes");
  }

  const bytes = new Uint8Array(8);
  let remaining = value;

  for (let index = 7; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }

  return bytes;
}

function uint16ToBytes(value: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new Error("payload length must fit in 2 bytes");
  }

  return Uint8Array.of((value >> 8) & 0xff, value & 0xff);
}
