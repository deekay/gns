import { getBondSats } from "./bond.js";
import { assertHexBytes, bytesToHex } from "./bytes.js";
import { PROTOCOL_NAME } from "./constants.js";
import { computeCommitHash, createBatchAnchorPayload, createBatchRevealPayload, createRevealProofChunkPayload } from "./events.js";
import {
  computeBatchCommitLeafHash,
  decodeMerkleProof,
  encodeMerkleProof,
  MERKLE_PROOF_STEP_LENGTH,
  parseMerkleProofHex,
  verifyMerkleProof
} from "./merkle.js";
import { normalizeName } from "./names.js";
import {
  decodeRevealProofChunkPayload,
  encodeBatchAnchorPayload,
  encodeBatchRevealPayload,
  encodeRevealProofChunkPayload
} from "./wire.js";

export const BATCH_CLAIM_PACKAGE_FORMAT = "gns-batch-claim-package";
export const BATCH_CLAIM_PACKAGE_VERSION = 1;
export const DEFAULT_BATCH_PROOF_CHUNK_BYTES = MERKLE_PROOF_STEP_LENGTH * 2;

export interface BatchClaimPackage {
  readonly format: typeof BATCH_CLAIM_PACKAGE_FORMAT;
  readonly packageVersion: typeof BATCH_CLAIM_PACKAGE_VERSION;
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
  readonly batchLeafHash: string;
  readonly batchMerkleRoot: string;
  readonly batchLeafCount: number;
  readonly batchAnchorPayloadHex: string;
  readonly batchAnchorPayloadBytes: number;
  readonly batchProofHex: string;
  readonly batchProofBytes: number;
  readonly batchAnchorTxid: string;
  readonly revealReady: true;
  readonly revealPayloadHex: string;
  readonly revealPayloadBytes: number;
  readonly revealProofChunkPayloadsHex: readonly string[];
}

export interface CreateBatchClaimPackageInput {
  readonly name: string;
  readonly ownerPubkey: string;
  readonly nonceHex: string;
  readonly bondVout: number;
  readonly bondDestination?: string | null;
  readonly changeDestination?: string | null;
  readonly batchMerkleRoot: string;
  readonly batchLeafCount: number;
  readonly batchProofHex: string;
  readonly batchAnchorTxid: string;
  readonly proofChunkBytes?: number;
  readonly exportedAt?: string;
}

export function createBatchClaimPackage(input: CreateBatchClaimPackageInput): BatchClaimPackage {
  const name = normalizeName(input.name);
  const ownerPubkey = assertHexBytes(input.ownerPubkey, 32, "ownerPubkey");
  const nonceHex = assertHexBytes(input.nonceHex, 8, "nonceHex");
  const nonce = BigInt(`0x${nonceHex}`);
  const bondVout = assertByteInteger(input.bondVout, "bondVout");
  const batchMerkleRoot = assertHexBytes(input.batchMerkleRoot, 32, "batchMerkleRoot");
  const batchLeafCount = assertByteInteger(input.batchLeafCount, "batchLeafCount");
  const batchProofHex = assertEvenLengthHex(input.batchProofHex, "batchProofHex");
  const batchAnchorTxid = assertHexBytes(input.batchAnchorTxid, 32, "batchAnchorTxid");
  const proofChunkBytes =
    input.proofChunkBytes === undefined
      ? DEFAULT_BATCH_PROOF_CHUNK_BYTES
      : assertPositiveInteger(input.proofChunkBytes, "proofChunkBytes");

  const commitHash = computeCommitHash({
    name,
    nonce,
    ownerPubkey
  });
  const batchLeafHash = computeBatchCommitLeafHash({
    bondVout,
    ownerPubkey,
    commitHash
  });
  const proof = parseMerkleProofHex(batchProofHex);

  if (!verifyMerkleProof({ leafHash: batchLeafHash, proof, expectedRoot: batchMerkleRoot })) {
    throw new Error("batchProofHex does not resolve to batchMerkleRoot for the provided claim");
  }

  const batchAnchorPayloadHex = bytesToHex(
    encodeBatchAnchorPayload(
      createBatchAnchorPayload({
        flags: 0,
        leafCount: batchLeafCount,
        merkleRoot: batchMerkleRoot
      })
    )
  );

  const revealProofChunkPayloadsHex = splitProofHexIntoChunkPayloads(batchProofHex, proofChunkBytes);
  const revealPayloadHex = bytesToHex(
    encodeBatchRevealPayload(
      createBatchRevealPayload({
        anchorTxid: batchAnchorTxid,
        ownerPubkey,
        nonce,
        bondVout,
        proofBytesLength: batchProofHex.length / 2,
        proofChunkCount: revealProofChunkPayloadsHex.length,
        name
      })
    )
  );

  return parseBatchClaimPackage({
    format: BATCH_CLAIM_PACKAGE_FORMAT,
    packageVersion: BATCH_CLAIM_PACKAGE_VERSION,
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
    batchLeafHash,
    batchMerkleRoot,
    batchLeafCount,
    batchAnchorPayloadHex,
    batchAnchorPayloadBytes: batchAnchorPayloadHex.length / 2,
    batchProofHex,
    batchProofBytes: batchProofHex.length / 2,
    batchAnchorTxid,
    revealReady: true,
    revealPayloadHex,
    revealPayloadBytes: revealPayloadHex.length / 2,
    revealProofChunkPayloadsHex
  });
}

export function parseBatchClaimPackage(input: unknown): BatchClaimPackage {
  const record = assertRecord(input, "batch claim package");

  const format = assertString(record.format, "format");
  if (format !== BATCH_CLAIM_PACKAGE_FORMAT) {
    throw new Error(`batch claim package format must be ${BATCH_CLAIM_PACKAGE_FORMAT}`);
  }

  const packageVersion = assertInteger(record.packageVersion, "packageVersion");
  if (packageVersion !== BATCH_CLAIM_PACKAGE_VERSION) {
    throw new Error(`batch claim package version must be ${BATCH_CLAIM_PACKAGE_VERSION}`);
  }

  const protocol = assertString(record.protocol, "protocol");
  if (protocol !== PROTOCOL_NAME) {
    throw new Error(`batch claim package protocol must be ${PROTOCOL_NAME}`);
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

  const requiredBondSats = assertString(record.requiredBondSats, "requiredBondSats");
  if (requiredBondSats !== getBondSats(name.length).toString()) {
    throw new Error("requiredBondSats does not match the current protocol bond schedule");
  }

  const bondVout = assertByteInteger(record.bondVout, "bondVout");
  const bondDestination = assertOptionalString(record.bondDestination, "bondDestination");
  const changeDestination = assertOptionalString(record.changeDestination, "changeDestination");

  const commitHash = assertHexBytes(assertString(record.commitHash, "commitHash"), 32, "commitHash");
  const expectedCommitHash = computeCommitHash({
    name,
    nonce,
    ownerPubkey
  });
  if (commitHash !== expectedCommitHash) {
    throw new Error("commitHash does not match the provided name, nonce, and ownerPubkey");
  }

  const batchLeafHash = assertHexBytes(assertString(record.batchLeafHash, "batchLeafHash"), 32, "batchLeafHash");
  const expectedLeafHash = computeBatchCommitLeafHash({
    bondVout,
    ownerPubkey,
    commitHash
  });
  if (batchLeafHash !== expectedLeafHash) {
    throw new Error("batchLeafHash does not match the provided claim fields");
  }

  const batchMerkleRoot = assertHexBytes(
    assertString(record.batchMerkleRoot, "batchMerkleRoot"),
    32,
    "batchMerkleRoot"
  );
  const batchLeafCount = assertByteInteger(record.batchLeafCount, "batchLeafCount");

  const batchAnchorPayloadHex = assertEvenLengthHex(
    assertString(record.batchAnchorPayloadHex, "batchAnchorPayloadHex"),
    "batchAnchorPayloadHex"
  );
  const expectedBatchAnchorPayloadHex = bytesToHex(
    encodeBatchAnchorPayload(
      createBatchAnchorPayload({
        flags: 0,
        leafCount: batchLeafCount,
        merkleRoot: batchMerkleRoot
      })
    )
  );
  if (batchAnchorPayloadHex !== expectedBatchAnchorPayloadHex) {
    throw new Error("batchAnchorPayloadHex does not match batchMerkleRoot and batchLeafCount");
  }

  const batchAnchorPayloadBytes = assertInteger(record.batchAnchorPayloadBytes, "batchAnchorPayloadBytes");
  if (batchAnchorPayloadBytes !== batchAnchorPayloadHex.length / 2) {
    throw new Error("batchAnchorPayloadBytes does not match batchAnchorPayloadHex");
  }

  const batchProofHex = assertEvenLengthHex(assertString(record.batchProofHex, "batchProofHex"), "batchProofHex");
  const batchProofBytes = assertInteger(record.batchProofBytes, "batchProofBytes");
  if (batchProofBytes !== batchProofHex.length / 2) {
    throw new Error("batchProofBytes does not match batchProofHex");
  }

  const proof = parseMerkleProofHex(batchProofHex);
  if (!verifyMerkleProof({ leafHash: batchLeafHash, proof, expectedRoot: batchMerkleRoot })) {
    throw new Error("batchProofHex does not resolve to batchMerkleRoot for the provided claim");
  }

  const batchAnchorTxid = assertHexBytes(assertString(record.batchAnchorTxid, "batchAnchorTxid"), 32, "batchAnchorTxid");
  const revealReady = assertBoolean(record.revealReady, "revealReady");
  if (revealReady !== true) {
    throw new Error("batch claim packages must be revealReady");
  }

  const revealProofChunkPayloadsHex = assertStringArray(
    record.revealProofChunkPayloadsHex,
    "revealProofChunkPayloadsHex"
  ).map((value, index) => assertEvenLengthHex(value, `revealProofChunkPayloadsHex[${index}]`));

  const concatenatedProofHex = validateRevealProofChunkPayloadsHex(revealProofChunkPayloadsHex);
  if (concatenatedProofHex !== batchProofHex) {
    throw new Error("revealProofChunkPayloadsHex does not reconstruct batchProofHex");
  }

  const revealPayloadHex = assertEvenLengthHex(
    assertString(record.revealPayloadHex, "revealPayloadHex"),
    "revealPayloadHex"
  );
  const expectedRevealPayloadHex = bytesToHex(
    encodeBatchRevealPayload(
      createBatchRevealPayload({
        anchorTxid: batchAnchorTxid,
        ownerPubkey,
        nonce,
        bondVout,
        proofBytesLength: batchProofBytes,
        proofChunkCount: revealProofChunkPayloadsHex.length,
        name
      })
    )
  );
  if (revealPayloadHex !== expectedRevealPayloadHex) {
    throw new Error("revealPayloadHex does not match the provided batch claim fields");
  }

  const revealPayloadBytes = assertInteger(record.revealPayloadBytes, "revealPayloadBytes");
  if (revealPayloadBytes !== revealPayloadHex.length / 2) {
    throw new Error("revealPayloadBytes does not match revealPayloadHex");
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
    batchLeafHash,
    batchMerkleRoot,
    batchLeafCount,
    batchAnchorPayloadHex,
    batchAnchorPayloadBytes,
    batchProofHex,
    batchProofBytes,
    batchAnchorTxid,
    revealReady: true,
    revealPayloadHex,
    revealPayloadBytes,
    revealProofChunkPayloadsHex
  };
}

export function splitProofHexIntoChunkPayloads(
  proofHex: string,
  maxChunkBytes = DEFAULT_BATCH_PROOF_CHUNK_BYTES
): readonly string[] {
  const normalizedProofHex = assertEvenLengthHex(proofHex, "proofHex");
  const normalizedMaxChunkBytes = assertPositiveInteger(maxChunkBytes, "maxChunkBytes");

  if (normalizedProofHex === "") {
    return [];
  }

  const chunkPayloadsHex: string[] = [];

  for (
    let chunkIndex = 0, offset = 0;
    offset < normalizedProofHex.length;
    chunkIndex += 1, offset += normalizedMaxChunkBytes * 2
  ) {
    const proofBytesHex = normalizedProofHex.slice(offset, offset + normalizedMaxChunkBytes * 2);
    chunkPayloadsHex.push(
      bytesToHex(
        encodeRevealProofChunkPayload(
          createRevealProofChunkPayload({
            chunkIndex,
            proofBytesHex
          })
        )
      )
    );
  }

  return chunkPayloadsHex;
}

function validateRevealProofChunkPayloadsHex(payloadsHex: readonly string[]): string {
  let expectedChunkIndex = 0;
  let concatenatedProofHex = "";

  for (const [index, payloadHex] of payloadsHex.entries()) {
    const decoded = decodeRevealProofChunkPayload(
      Buffer.from(assertEvenLengthHex(payloadHex, `revealProofChunkPayloadsHex[${index}]`), "hex")
    );

    if (decoded.chunkIndex !== expectedChunkIndex) {
      throw new Error("revealProofChunkPayloadsHex must use contiguous chunkIndex values starting at 0");
    }

    concatenatedProofHex += decoded.proofBytesHex;
    expectedChunkIndex += 1;
  }

  const decodedProof = decodeMerkleProof(Buffer.from(concatenatedProofHex, "hex"));
  const reencodedProof = bytesToHex(encodeMerkleProof(decodedProof));

  if (reencodedProof !== concatenatedProofHex) {
    throw new Error("revealProofChunkPayloadsHex does not encode a canonical merkle proof");
  }

  return concatenatedProofHex;
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

function assertPositiveInteger(value: unknown, label: string): number {
  const parsed = assertInteger(value, label);

  if (parsed <= 0) {
    throw new Error(`${label} must be positive`);
  }

  return parsed;
}

function assertByteInteger(value: unknown, label: string): number {
  const parsed = assertInteger(value, label);

  if (parsed < 0 || parsed > 0xff) {
    throw new Error(`${label} must fit in one byte`);
  }

  return parsed;
}

function assertStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  return value.map((entry, index) => assertString(entry, `${label}[${index}]`));
}

function assertEvenLengthHex(value: string, label: string): string {
  const normalized = value.toLowerCase();

  if (!/^[0-9a-f]*$/i.test(normalized)) {
    throw new Error(`${label} must be hex`);
  }

  if (normalized.length % 2 !== 0) {
    throw new Error(`${label} must have an even number of hex characters`);
  }

  return normalized;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
