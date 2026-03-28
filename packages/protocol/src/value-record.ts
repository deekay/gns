import { createHash } from "node:crypto";
import * as secp256k1 from "tiny-secp256k1";

import { assertHexBytes, bytesToHex, hexToBytes } from "./bytes.js";
import { normalizeName } from "./names.js";

export const VALUE_RECORD_FORMAT = "gns-value-record";
export const VALUE_RECORD_VERSION = 1;

export interface ValueRecordFields {
  readonly name: string;
  readonly ownerPubkey: string;
  readonly sequence: number;
  readonly valueType: number;
  readonly payloadHex: string;
}

export interface SignedValueRecord extends ValueRecordFields {
  readonly format: typeof VALUE_RECORD_FORMAT;
  readonly recordVersion: typeof VALUE_RECORD_VERSION;
  readonly exportedAt: string;
  readonly signature: string;
}

export function createValueRecord(input: ValueRecordFields & {
  readonly exportedAt?: string;
  readonly signature: string;
}): SignedValueRecord {
  return {
    format: VALUE_RECORD_FORMAT,
    recordVersion: VALUE_RECORD_VERSION,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    name: normalizeName(input.name),
    ownerPubkey: assertHexBytes(input.ownerPubkey, 32, "ownerPubkey"),
    sequence: assertSequence(input.sequence),
    valueType: assertByte(input.valueType, "valueType"),
    payloadHex: normalizePayloadHex(input.payloadHex),
    signature: assertHexBytes(input.signature, 64, "signature")
  };
}

export function signValueRecord(input: {
  readonly name: string;
  readonly ownerPrivateKeyHex: string;
  readonly sequence: number;
  readonly valueType: number;
  readonly payloadHex: string;
  readonly exportedAt?: string;
}): SignedValueRecord {
  const ownerPrivateKeyHex = assertHexBytes(input.ownerPrivateKeyHex, 32, "ownerPrivateKeyHex");
  const ownerPrivateKey = hexToBytes(ownerPrivateKeyHex);

  if (!secp256k1.isPrivate(ownerPrivateKey)) {
    throw new Error("ownerPrivateKeyHex must be a valid secp256k1 private key");
  }

  const ownerPubkey = bytesToHex(secp256k1.xOnlyPointFromScalar(ownerPrivateKey));
  const fields: ValueRecordFields = {
    name: normalizeName(input.name),
    ownerPubkey,
    sequence: assertSequence(input.sequence),
    valueType: assertByte(input.valueType, "valueType"),
    payloadHex: normalizePayloadHex(input.payloadHex)
  };

  return createValueRecord({
    ...fields,
    ...(input.exportedAt === undefined ? {} : { exportedAt: input.exportedAt }),
    signature: bytesToHex(secp256k1.signSchnorr(computeValueRecordDigest(fields), ownerPrivateKey))
  });
}

export function verifyValueRecord(input: SignedValueRecord): boolean {
  const ownerPubkey = hexToBytes(assertHexBytes(input.ownerPubkey, 32, "ownerPubkey"));
  const signature = hexToBytes(assertHexBytes(input.signature, 64, "signature"));

  if (!secp256k1.isXOnlyPoint(ownerPubkey)) {
    return false;
  }

  return secp256k1.verifySchnorr(
    computeValueRecordDigest({
      name: input.name,
      ownerPubkey: input.ownerPubkey,
      sequence: input.sequence,
      valueType: input.valueType,
      payloadHex: input.payloadHex
    }),
    ownerPubkey,
    signature
  );
}

export function computeValueRecordHash(input: ValueRecordFields): string {
  return bytesToHex(computeValueRecordDigest(input));
}

export function parseSignedValueRecord(input: unknown): SignedValueRecord {
  const record = assertRecord(input, "value record");

  if (record.format !== VALUE_RECORD_FORMAT) {
    throw new Error(`value record format must be ${VALUE_RECORD_FORMAT}`);
  }

  if (record.recordVersion !== VALUE_RECORD_VERSION) {
    throw new Error(`value record version must be ${VALUE_RECORD_VERSION}`);
  }

  if (typeof record.exportedAt !== "string") {
    throw new Error("value record exportedAt must be a string");
  }

  return createValueRecord({
    exportedAt: record.exportedAt,
    name: assertString(record.name, "name"),
    ownerPubkey: assertString(record.ownerPubkey, "ownerPubkey"),
    sequence: assertInteger(record.sequence, "sequence"),
    valueType: assertInteger(record.valueType, "valueType"),
    payloadHex: assertString(record.payloadHex, "payloadHex"),
    signature: assertString(record.signature, "signature")
  });
}

function computeValueRecordDigest(input: ValueRecordFields): Uint8Array {
  const name = normalizeName(input.name);
  const ownerPubkey = assertHexBytes(input.ownerPubkey, 32, "ownerPubkey");
  const sequence = assertSequence(input.sequence);
  const valueType = assertByte(input.valueType, "valueType");
  const payloadHex = normalizePayloadHex(input.payloadHex);
  const payloadBytes = hexToBytes(payloadHex);
  const hasher = createHash("sha256");

  hasher.update(Uint8Array.of(Buffer.byteLength(name, "utf8")));
  hasher.update(Buffer.from(name, "utf8"));
  hasher.update(hexToBytes(ownerPubkey));
  hasher.update(bigIntToUint64Bytes(BigInt(sequence)));
  hasher.update(Uint8Array.of(valueType));
  hasher.update(uint16ToBytes(payloadBytes.length));
  hasher.update(payloadBytes);

  return hasher.digest();
}

function normalizePayloadHex(payloadHex: string): string {
  if (typeof payloadHex !== "string") {
    throw new Error("payloadHex must be a string");
  }

  const normalized = payloadHex.toLowerCase();
  const payloadBytes = hexToBytes(normalized);

  if (payloadBytes.length > 0xffff) {
    throw new Error("payloadHex must fit in 65535 bytes");
  }

  return normalized;
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

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value as Record<string, unknown>;
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }

  return value;
}

function assertInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }

  return value as number;
}
