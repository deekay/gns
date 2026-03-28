import { PROTOCOL_NAME } from "./constants.js";
import { normalizeName } from "./names.js";

export const TRANSFER_PACKAGE_FORMAT = "gns-transfer-package";
export const TRANSFER_PACKAGE_VERSION = 1;

export type TransferPackageStatus = "immature" | "mature";
export type TransferPackageModeKey = "gift" | "immature-sale" | "sale";

export interface TransferPackageMode {
  readonly key: TransferPackageModeKey;
  readonly title: string;
  readonly suitability: string;
  readonly summary: string;
  readonly command: string;
}

export interface TransferPackage {
  readonly format: typeof TRANSFER_PACKAGE_FORMAT;
  readonly packageVersion: typeof TRANSFER_PACKAGE_VERSION;
  readonly protocol: typeof PROTOCOL_NAME;
  readonly exportedAt: string;
  readonly name: string;
  readonly currentStatus: TransferPackageStatus;
  readonly currentOwnerPubkey: string;
  readonly newOwnerPubkey: string;
  readonly lastStateTxid: string;
  readonly currentBondTxid: string;
  readonly currentBondVout: number;
  readonly currentBondValueSats: string;
  readonly requiredBondSats: string;
  readonly recommendedMode: TransferPackageModeKey;
  readonly sellerPayoutAddress: string | null;
  readonly successorBondAddress: string | null;
  readonly modes: readonly TransferPackageMode[];
}

export interface CreateTransferPackageInput {
  readonly name: string;
  readonly currentStatus: TransferPackageStatus;
  readonly currentOwnerPubkey: string;
  readonly newOwnerPubkey: string;
  readonly lastStateTxid: string;
  readonly currentBondTxid: string;
  readonly currentBondVout: number;
  readonly currentBondValueSats: string;
  readonly requiredBondSats: string;
  readonly recommendedMode: TransferPackageModeKey;
  readonly sellerPayoutAddress?: string | null;
  readonly successorBondAddress?: string | null;
  readonly modes: readonly TransferPackageMode[];
  readonly exportedAt?: string;
}

export function createTransferPackage(input: CreateTransferPackageInput): TransferPackage {
  return parseTransferPackage({
    format: TRANSFER_PACKAGE_FORMAT,
    packageVersion: TRANSFER_PACKAGE_VERSION,
    protocol: PROTOCOL_NAME,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    name: normalizeName(input.name),
    currentStatus: input.currentStatus,
    currentOwnerPubkey: input.currentOwnerPubkey,
    newOwnerPubkey: input.newOwnerPubkey,
    lastStateTxid: input.lastStateTxid,
    currentBondTxid: input.currentBondTxid,
    currentBondVout: input.currentBondVout,
    currentBondValueSats: input.currentBondValueSats,
    requiredBondSats: input.requiredBondSats,
    recommendedMode: input.recommendedMode,
    sellerPayoutAddress: normalizeOptionalText(input.sellerPayoutAddress),
    successorBondAddress: normalizeOptionalText(input.successorBondAddress),
    modes: input.modes
  });
}

export function parseTransferPackage(input: unknown): TransferPackage {
  const record = assertRecord(input, "transfer package");

  const format = assertString(record.format, "format");
  if (format !== TRANSFER_PACKAGE_FORMAT) {
    throw new Error(`transfer package format must be ${TRANSFER_PACKAGE_FORMAT}`);
  }

  const packageVersion = assertInteger(record.packageVersion, "packageVersion");
  if (packageVersion !== TRANSFER_PACKAGE_VERSION) {
    throw new Error(`transfer package version must be ${TRANSFER_PACKAGE_VERSION}`);
  }

  const protocol = assertString(record.protocol, "protocol");
  if (protocol !== PROTOCOL_NAME) {
    throw new Error(`transfer package protocol must be ${PROTOCOL_NAME}`);
  }

  const exportedAt = assertString(record.exportedAt, "exportedAt");
  if (Number.isNaN(Date.parse(exportedAt))) {
    throw new Error("exportedAt must be a valid ISO timestamp");
  }

  const name = normalizeName(assertString(record.name, "name"));
  const currentStatus = assertTransferPackageStatus(record.currentStatus, "currentStatus");
  const currentOwnerPubkey = assertHexBytes(assertString(record.currentOwnerPubkey, "currentOwnerPubkey"), 32, "currentOwnerPubkey");
  const newOwnerPubkey = assertHexBytes(assertString(record.newOwnerPubkey, "newOwnerPubkey"), 32, "newOwnerPubkey");
  const lastStateTxid = assertHexBytes(assertString(record.lastStateTxid, "lastStateTxid"), 32, "lastStateTxid");
  const currentBondTxid = assertHexBytes(assertString(record.currentBondTxid, "currentBondTxid"), 32, "currentBondTxid");
  const currentBondVout = assertByteInteger(record.currentBondVout, "currentBondVout");
  const currentBondValueSats = assertBigIntString(record.currentBondValueSats, "currentBondValueSats");
  const requiredBondSats = assertBigIntString(record.requiredBondSats, "requiredBondSats");
  const recommendedMode = assertTransferPackageModeKey(record.recommendedMode, "recommendedMode");
  const sellerPayoutAddress = assertOptionalString(record.sellerPayoutAddress, "sellerPayoutAddress");
  const successorBondAddress = assertOptionalString(record.successorBondAddress, "successorBondAddress");
  const modes = assertTransferPackageModes(record.modes);

  if (!modes.some((mode) => mode.key === recommendedMode)) {
    throw new Error("recommendedMode must match one of the included modes");
  }

  return {
    format,
    packageVersion,
    protocol,
    exportedAt,
    name,
    currentStatus,
    currentOwnerPubkey,
    newOwnerPubkey,
    lastStateTxid,
    currentBondTxid,
    currentBondVout,
    currentBondValueSats,
    requiredBondSats,
    recommendedMode,
    sellerPayoutAddress,
    successorBondAddress,
    modes
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

function assertInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }

  return value;
}

function assertByteInteger(value: unknown, label: string): number {
  const parsed = assertInteger(value, label);
  if (parsed < 0 || parsed > 0xff) {
    throw new Error(`${label} must be between 0 and 255`);
  }

  return parsed;
}

function assertHexBytes(value: string, bytes: number, label: string): string {
  if (!/^[0-9a-f]+$/i.test(value) || value.length !== bytes * 2) {
    throw new Error(`${label} must be ${bytes} bytes of hex`);
  }

  return value.toLowerCase();
}

function assertBigIntString(value: unknown, label: string): string {
  const parsed = assertString(value, label);
  const numeric = BigInt(parsed);
  if (numeric < 0n) {
    throw new Error(`${label} must be non-negative`);
  }

  return numeric.toString();
}

function assertTransferPackageStatus(value: unknown, label: string): TransferPackageStatus {
  const parsed = assertString(value, label);
  if (parsed === "immature" || parsed === "mature") {
    return parsed;
  }

  throw new Error(`${label} must be immature or mature`);
}

function assertTransferPackageModeKey(value: unknown, label: string): TransferPackageModeKey {
  const parsed = assertString(value, label);
  if (parsed === "gift" || parsed === "immature-sale" || parsed === "sale") {
    return parsed;
  }

  throw new Error(`${label} must be gift, immature-sale, or sale`);
}

function assertTransferPackageModes(value: unknown): readonly TransferPackageMode[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("modes must be a non-empty array");
  }

  return value.map((entry, index) => {
    const record = assertRecord(entry, `mode[${index}]`);
    return {
      key: assertTransferPackageModeKey(record.key, `mode[${index}].key`),
      title: assertString(record.title, `mode[${index}].title`),
      suitability: assertString(record.suitability, `mode[${index}].suitability`),
      summary: assertString(record.summary, `mode[${index}].summary`),
      command: assertString(record.command, `mode[${index}].command`)
    };
  });
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
