import { getBondSats } from "./bond.js";
import { assertHexBytes, bytesToHex } from "./bytes.js";
import { PROTOCOL_NAME } from "./constants.js";
import { computeCommitHash } from "./events.js";
import { normalizeName } from "./names.js";
import { encodeCommitPayload, encodeRevealPayload } from "./wire.js";

export const CLAIM_PACKAGE_FORMAT = "ont-claim-package";
export const CLAIM_PACKAGE_VERSION = 1;

export interface ClaimPackage {
  readonly format: typeof CLAIM_PACKAGE_FORMAT;
  readonly packageVersion: typeof CLAIM_PACKAGE_VERSION;
  readonly protocol: typeof PROTOCOL_NAME;
  readonly exportedAt: string;
  readonly name: string;
  readonly ownerPubkey: string;
  readonly nonceHex: string;
  readonly nonceDecimal: string;
  readonly requiredBondSats: string;
  readonly bondVout: number;
  readonly bondDestination: string | null;
  readonly changeDestination: string | null;
  readonly commitHash: string;
  readonly commitPayloadHex: string;
  readonly commitPayloadBytes: number;
  readonly commitTxid: string | null;
  readonly revealReady: boolean;
  readonly revealPayloadHex: string | null;
  readonly revealPayloadBytes: number | null;
}

export interface CreateClaimPackageInput {
  readonly name: string;
  readonly ownerPubkey: string;
  readonly nonceHex: string;
  readonly bondVout?: number;
  readonly bondDestination?: string | null;
  readonly changeDestination?: string | null;
  readonly commitTxid?: string | null;
  readonly exportedAt?: string;
}

export function createClaimPackage(input: CreateClaimPackageInput): ClaimPackage {
  const name = normalizeName(input.name);
  const ownerPubkey = assertHexBytes(input.ownerPubkey, 32, "ownerPubkey");
  const nonceHex = assertHexBytes(input.nonceHex, 8, "nonceHex");
  const nonce = BigInt(`0x${nonceHex}`);
  const bondVout = input.bondVout ?? 0;

  if (!Number.isInteger(bondVout) || bondVout < 0 || bondVout > 0xff) {
    throw new Error("bondVout must fit in one byte");
  }

  const commitHash = computeCommitHash({
    name,
    nonce,
    ownerPubkey
  });
  const commitPayloadHex = bytesToHex(
    encodeCommitPayload({
      bondVout,
      ownerPubkey,
      commitHash
    })
  );

  const commitTxid = input.commitTxid ?? null;
  const revealReady = commitTxid !== null;
  const revealPayloadHex = commitTxid === null
    ? null
    : bytesToHex(
        encodeRevealPayload({
          commitTxid: assertHexBytes(commitTxid, 32, "commitTxid"),
          nonce,
          name
        })
      );

  return parseClaimPackage({
    format: CLAIM_PACKAGE_FORMAT,
    packageVersion: CLAIM_PACKAGE_VERSION,
    protocol: PROTOCOL_NAME,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    name,
    ownerPubkey,
    nonceHex,
    nonceDecimal: nonce.toString(),
    requiredBondSats: getBondSats(name.length).toString(),
    bondVout,
    bondDestination: normalizeOptionalText(input.bondDestination),
    changeDestination: normalizeOptionalText(input.changeDestination),
    commitHash,
    commitPayloadHex,
    commitPayloadBytes: commitPayloadHex.length / 2,
    commitTxid,
    revealReady,
    revealPayloadHex,
    revealPayloadBytes: revealPayloadHex === null ? null : revealPayloadHex.length / 2
  });
}

export function parseClaimPackage(input: unknown): ClaimPackage {
  const record = assertRecord(input, "claim package");

  const format = assertString(record.format, "format");
  if (format !== CLAIM_PACKAGE_FORMAT) {
    throw new Error(`claim package format must be ${CLAIM_PACKAGE_FORMAT}`);
  }

  const packageVersion = assertInteger(record.packageVersion, "packageVersion");
  if (packageVersion !== CLAIM_PACKAGE_VERSION) {
    throw new Error(`claim package version must be ${CLAIM_PACKAGE_VERSION}`);
  }

  const protocol = assertString(record.protocol, "protocol");
  if (protocol !== PROTOCOL_NAME) {
    throw new Error(`claim package protocol must be ${PROTOCOL_NAME}`);
  }

  const exportedAt = assertString(record.exportedAt, "exportedAt");
  if (Number.isNaN(Date.parse(exportedAt))) {
    throw new Error("exportedAt must be a valid ISO timestamp");
  }

  const name = normalizeName(assertString(record.name, "name"));
  const ownerPubkey = assertHexBytes(assertString(record.ownerPubkey, "ownerPubkey"), 32, "ownerPubkey");
  const nonceHex = assertHexBytes(assertString(record.nonceHex, "nonceHex"), 8, "nonceHex");
  const nonce = BigInt(`0x${nonceHex}`);
  const nonceDecimal = assertString(record.nonceDecimal, "nonceDecimal");
  if (nonceDecimal !== nonce.toString()) {
    throw new Error("nonceDecimal does not match nonceHex");
  }

  const bondVout = assertByteInteger(record.bondVout, "bondVout");
  const bondDestination = assertOptionalString(record.bondDestination, "bondDestination");
  const changeDestination = assertOptionalString(record.changeDestination, "changeDestination");

  const requiredBondSats = assertString(record.requiredBondSats, "requiredBondSats");
  if (requiredBondSats !== getBondSats(name.length).toString()) {
    throw new Error("requiredBondSats does not match the current protocol bond schedule");
  }

  const commitHash = assertHexBytes(assertString(record.commitHash, "commitHash"), 32, "commitHash");
  const expectedCommitHash = computeCommitHash({
    name,
    nonce,
    ownerPubkey
  });
  if (commitHash !== expectedCommitHash) {
    throw new Error("commitHash does not match the provided name, nonce, and ownerPubkey");
  }

  const commitPayloadHex = assertEvenLengthHex(assertString(record.commitPayloadHex, "commitPayloadHex"), "commitPayloadHex");
  const expectedCommitPayloadHex = bytesToHex(
    encodeCommitPayload({
      bondVout,
      ownerPubkey,
      commitHash
    })
  );
  if (commitPayloadHex !== expectedCommitPayloadHex) {
    throw new Error("commitPayloadHex does not match the provided claim fields");
  }

  const commitPayloadBytes = assertInteger(record.commitPayloadBytes, "commitPayloadBytes");
  if (commitPayloadBytes !== commitPayloadHex.length / 2) {
    throw new Error("commitPayloadBytes does not match commitPayloadHex");
  }

  const commitTxid = assertOptionalHex(record.commitTxid, 32, "commitTxid");
  const revealReady = assertBoolean(record.revealReady, "revealReady");
  const revealPayloadHex = assertOptionalEvenLengthHex(record.revealPayloadHex, "revealPayloadHex");
  const revealPayloadBytes = assertOptionalInteger(record.revealPayloadBytes, "revealPayloadBytes");

  if (revealReady) {
    if (commitTxid === null) {
      throw new Error("revealReady cannot be true when commitTxid is null");
    }

    if (revealPayloadHex === null || revealPayloadBytes === null) {
      throw new Error("revealReady claim packages must include reveal payload bytes");
    }

    const expectedRevealPayloadHex = bytesToHex(
      encodeRevealPayload({
        commitTxid,
        nonce,
        name
      })
    );
    if (revealPayloadHex !== expectedRevealPayloadHex) {
      throw new Error("revealPayloadHex does not match the provided claim fields");
    }

    if (revealPayloadBytes !== revealPayloadHex.length / 2) {
      throw new Error("revealPayloadBytes does not match revealPayloadHex");
    }
  } else {
    if (revealPayloadHex !== null || revealPayloadBytes !== null) {
      throw new Error("reveal payload data must be null when revealReady is false");
    }
  }

  return {
    format,
    packageVersion,
    protocol,
    exportedAt,
    name,
    ownerPubkey,
    nonceHex,
    nonceDecimal,
    requiredBondSats,
    bondVout,
    bondDestination,
    changeDestination,
    commitHash,
    commitPayloadHex,
    commitPayloadBytes,
    commitTxid,
    revealReady,
    revealPayloadHex,
    revealPayloadBytes
  };
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

function assertOptionalString(value: unknown, label: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return assertString(value, label);
}

function assertBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }

  return value;
}

function assertInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }

  return value as number;
}

function assertOptionalInteger(value: unknown, label: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return assertInteger(value, label);
}

function assertByteInteger(value: unknown, label: string): number {
  const parsed = assertInteger(value, label);

  if (parsed < 0 || parsed > 0xff) {
    throw new Error(`${label} must fit in one byte`);
  }

  return parsed;
}

function assertOptionalHex(value: unknown, byteLength: number, label: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return assertHexBytes(assertString(value, label), byteLength, label);
}

function assertEvenLengthHex(value: string, label: string): string {
  const normalized = value.toLowerCase();

  if (!/^[0-9a-f]+$/i.test(normalized)) {
    throw new Error(`${label} must be hex`);
  }

  if (normalized.length % 2 !== 0) {
    throw new Error(`${label} must have an even number of hex characters`);
  }

  return normalized;
}

function assertOptionalEvenLengthHex(value: unknown, label: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return assertEvenLengthHex(assertString(value, label), label);
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
