import { Buffer } from "node:buffer";

import { Transaction, script as btcScript, crypto as btcCrypto } from "bitcoinjs-lib";

import {
  BATCH_REVEAL_MIN_PAYLOAD_LENGTH,
  type BatchRevealEventPayload,
  computeBatchCommitLeafHash,
  computeCommitHash,
  decodeBatchRevealPayload,
  decodeGnsPayload,
  decodeMerkleProof,
  GnsEventType,
  verifyMerkleProof
} from "@gns/protocol";

const EXPERIMENTAL_ANNEX_PREFIX_HEX = "5000";
const EXPERIMENTAL_BATCH_REVEAL_EXTENSION_TYPE = 0xf0;

export interface ExperimentalAnnexBatchRevealRecord {
  readonly txid: string;
  readonly wtxid: string;
  readonly payload: BatchRevealEventPayload;
  readonly batchRevealPayloadHex: string;
  readonly explicitHeaderHex: string;
  readonly explicitHeaderSha256: string;
  readonly carrierInputIndex: number;
  readonly annexHex: string;
  readonly annexProofHex: string;
  readonly annexSha256: string;
  readonly annexBytesLength: number;
  readonly visibleProofChunkCount: number;
  readonly visibleProofHex: string;
}

export interface ExperimentalAnnexBatchRevealVerification {
  readonly record: ExperimentalAnnexBatchRevealRecord;
  readonly verification: {
    readonly annexPresent: boolean;
    readonly annexPrefixValid: boolean;
    readonly headerCommitsToAnnex: boolean;
    readonly payloadProofBytesMatchAnnexProofBytes: boolean;
    readonly payloadProofChunkCountIsZero: boolean;
    readonly explicitChunkModelWouldAccept: boolean;
    readonly annexAwareMerkleProofValid: boolean;
    readonly annexAwareModelWouldAccept: boolean;
  };
}

export function extractExperimentalAnnexBatchRevealRecord(input: {
  readonly signedTransactionHex: string;
}): ExperimentalAnnexBatchRevealRecord {
  const transaction = Transaction.fromHex(input.signedTransactionHex);
  const { payloadHex, payload, carrierInputIndex, annexSha256, annexBytesLength } =
    findExperimentalBatchRevealHeader(transaction);
  const witness = transaction.ins[carrierInputIndex]?.witness ?? [];
  const annex = Buffer.from(witness.at(-1) ?? []);
  const visibleProofHex = collectExplicitProofChunkHex(transaction);

  return {
    txid: transaction.getId(),
    wtxid: displayHash(transaction.getHash(true)),
    payload,
    batchRevealPayloadHex: payloadHex,
    explicitHeaderHex: extractOpReturnPayloadHex(transaction),
    explicitHeaderSha256: bytesToHex(
      btcCrypto.sha256(Buffer.from(extractOpReturnPayloadHex(transaction), "hex"))
    ),
    carrierInputIndex,
    annexHex: bytesToHex(annex),
    annexProofHex:
      annex.length >= 2 && annex.subarray(0, 2).toString("hex") === EXPERIMENTAL_ANNEX_PREFIX_HEX
        ? annex.subarray(2).toString("hex")
        : "",
    annexSha256,
    annexBytesLength,
    visibleProofChunkCount: countExplicitProofChunkOutputs(transaction),
    visibleProofHex
  };
}

export function verifyExperimentalAnnexBatchReveal(input: {
  readonly signedTransactionHex: string;
  readonly expectedMerkleRoot: string;
}): ExperimentalAnnexBatchRevealVerification {
  const record = extractExperimentalAnnexBatchRevealRecord({
    signedTransactionHex: input.signedTransactionHex
  });
  const annexPresent = record.annexHex.length / 2 === record.annexBytesLength;
  const annexPrefixValid = record.annexHex.startsWith(EXPERIMENTAL_ANNEX_PREFIX_HEX);
  const headerCommitsToAnnex =
    annexPresent &&
    bytesToHex(btcCrypto.sha256(Buffer.from(record.annexHex, "hex"))) === record.annexSha256;
  const payloadProofBytesMatchAnnexProofBytes =
    record.payload.proofBytesLength === record.annexProofHex.length / 2;
  const payloadProofChunkCountIsZero = record.payload.proofChunkCount === 0;
  const explicitChunkModelWouldAccept =
    record.visibleProofChunkCount === record.payload.proofChunkCount &&
    record.visibleProofHex.length / 2 === record.payload.proofBytesLength;
  const commitHash = computeCommitHash({
    name: record.payload.name,
    nonce: record.payload.nonce,
    ownerPubkey: record.payload.ownerPubkey
  });
  const leafHash = computeBatchCommitLeafHash({
    bondVout: record.payload.bondVout,
    ownerPubkey: record.payload.ownerPubkey,
    commitHash
  });

  let annexAwareMerkleProofValid = false;
  try {
    annexAwareMerkleProofValid =
      annexPrefixValid &&
      verifyMerkleProof({
        leafHash,
        proof: decodeMerkleProof(Buffer.from(record.annexProofHex, "hex")),
        expectedRoot: input.expectedMerkleRoot
      });
  } catch {
    annexAwareMerkleProofValid = false;
  }

  return {
    record,
    verification: {
      annexPresent,
      annexPrefixValid,
      headerCommitsToAnnex,
      payloadProofBytesMatchAnnexProofBytes,
      payloadProofChunkCountIsZero,
      explicitChunkModelWouldAccept,
      annexAwareMerkleProofValid,
      annexAwareModelWouldAccept:
        annexPresent &&
        annexPrefixValid &&
        headerCommitsToAnnex &&
        payloadProofBytesMatchAnnexProofBytes &&
        payloadProofChunkCountIsZero &&
        annexAwareMerkleProofValid
    }
  };
}

function extractOpReturnPayloadHex(transaction: Transaction): string {
  for (const output of transaction.outs) {
    const decompiled = btcScript.decompile(output.script);

    if (!decompiled || decompiled[0] !== btcScript.OPS.OP_RETURN) {
      continue;
    }

    const payload = decompiled[1];
    if (!payload || typeof payload === "number") {
      continue;
    }

    return Buffer.from(payload).toString("hex");
  }

  throw new Error("experimental annex transaction is missing an OP_RETURN payload");
}

function findExperimentalBatchRevealHeader(transaction: Transaction): {
  readonly payloadHex: string;
  readonly payload: BatchRevealEventPayload;
  readonly carrierInputIndex: number;
  readonly annexSha256: string;
  readonly annexBytesLength: number;
} {
  const headerHex = extractOpReturnPayloadHex(transaction);
  const header = Buffer.from(headerHex, "hex");

  if (header.length < BATCH_REVEAL_MIN_PAYLOAD_LENGTH + 36) {
    throw new Error("experimental annex batch reveal header is too short");
  }

  if (header[4] !== GnsEventType.BatchReveal) {
    throw new Error("experimental annex header does not begin with a batch reveal payload");
  }

  const nameLength = header[81];
  if (nameLength === undefined) {
    throw new Error("experimental annex batch reveal header is missing name length");
  }

  const payloadLength = BATCH_REVEAL_MIN_PAYLOAD_LENGTH + nameLength;
  if (header.length !== payloadLength + 36) {
    throw new Error("experimental annex batch reveal header length mismatch");
  }

  if (header[payloadLength] !== EXPERIMENTAL_BATCH_REVEAL_EXTENSION_TYPE) {
    throw new Error("experimental annex batch reveal extension type mismatch");
  }

  const payloadBytes = header.subarray(0, payloadLength);

  return {
    payloadHex: payloadBytes.toString("hex"),
    payload: decodeBatchRevealPayload(payloadBytes),
    carrierInputIndex: header[payloadLength + 1] ?? 0,
    annexSha256: header.subarray(payloadLength + 2, payloadLength + 34).toString("hex"),
    annexBytesLength: header.readUInt16BE(payloadLength + 34)
  };
}

function countExplicitProofChunkOutputs(transaction: Transaction): number {
  let count = 0;
  for (const output of transaction.outs) {
    const event = decodeGnsPayloadFromOutput(output.script);
    if (event?.type === GnsEventType.RevealProofChunk) {
      count += 1;
    }
  }

  return count;
}

function collectExplicitProofChunkHex(transaction: Transaction): string {
  const chunks: Array<{ chunkIndex: number; proofBytesHex: string }> = [];

  for (const output of transaction.outs) {
    const event = decodeGnsPayloadFromOutput(output.script);
    if (event?.type !== GnsEventType.RevealProofChunk) {
      continue;
    }

    chunks.push(event.payload);
  }

  return chunks
    .sort((left, right) => left.chunkIndex - right.chunkIndex)
    .map((chunk) => chunk.proofBytesHex)
    .join("");
}

function decodeGnsPayloadFromOutput(script: Uint8Array) {
  const decompiled = btcScript.decompile(script);
  if (!decompiled || decompiled[0] !== btcScript.OPS.OP_RETURN) {
    return null;
  }

  const payload = decompiled[1];
  if (!payload || typeof payload === "number") {
    return null;
  }

  try {
    return decodeGnsPayload(Buffer.from(payload));
  } catch {
    return null;
  }
}

function bytesToHex(value: Uint8Array): string {
  return Buffer.from(value).toString("hex");
}

function displayHash(hash: Uint8Array): string {
  return Buffer.from(hash).reverse().toString("hex");
}
