import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { BitcoinEsploraConfig, BitcoinRpcConfig } from "@gns/bitcoin";

import { broadcastSignedTransactionHex, getTransactionConfirmationInfo } from "./rpc-actions.js";
import type { GnsCliNetwork } from "./builder.js";
import type { SignedArtifactsEnvelope } from "./signer.js";

export const REVEAL_QUEUE_FORMAT = "gns-reveal-queue";
export const REVEAL_QUEUE_VERSION = 1;
export const DEFAULT_REVEAL_QUEUE_PATH = ".data/reveal-queue.json";

export interface RevealQueueItem {
  readonly id: string;
  readonly createdAt: string;
  readonly expectedChain: GnsCliNetwork;
  readonly commitTxid: string;
  readonly revealTxid: string;
  readonly signedRevealTransactionHex: string;
  readonly status: "pending" | "broadcasted";
  readonly lastObservedConfirmations: number;
  readonly lastCheckedAt: string | null;
  readonly broadcastedAt: string | null;
  readonly broadcastedRevealTxid: string | null;
  readonly lastError: string | null;
}

export interface RevealQueueFile {
  readonly format: typeof REVEAL_QUEUE_FORMAT;
  readonly version: typeof REVEAL_QUEUE_VERSION;
  readonly items: ReadonlyArray<RevealQueueItem>;
}

export interface RevealQueueProcessResult {
  readonly kind: "gns-reveal-queue-process-result";
  readonly queuePath: string;
  readonly processedCount: number;
  readonly pendingCount: number;
  readonly broadcastedCount: number;
  readonly items: ReadonlyArray<RevealQueueItem>;
}

export function createRevealQueueItem(input: {
  readonly expectedChain: GnsCliNetwork;
  readonly commitTxid: string;
  readonly signedRevealArtifacts: SignedArtifactsEnvelope;
}): RevealQueueItem {
  if (
    input.signedRevealArtifacts.kind !== "gns-signed-reveal-artifacts" &&
    input.signedRevealArtifacts.kind !== "gns-signed-batch-reveal-artifacts"
  ) {
    throw new Error("queue items require signed reveal or signed batch reveal artifacts");
  }

  const now = new Date().toISOString();

  return {
    id: `${input.commitTxid}:${input.signedRevealArtifacts.signedTransactionId}`,
    createdAt: now,
    expectedChain: input.expectedChain,
    commitTxid: input.commitTxid,
    revealTxid: input.signedRevealArtifacts.signedTransactionId,
    signedRevealTransactionHex: input.signedRevealArtifacts.signedTransactionHex,
    status: "pending",
    lastObservedConfirmations: 0,
    lastCheckedAt: null,
    broadcastedAt: null,
    broadcastedRevealTxid: null,
    lastError: null
  };
}

export async function loadRevealQueueFile(queuePath: string): Promise<RevealQueueFile> {
  const resolvedPath = resolve(process.cwd(), queuePath);

  try {
    const raw = await readFile(resolvedPath, "utf8");
    return parseRevealQueueFile(JSON.parse(raw));
  } catch (error) {
    if (isEnoent(error)) {
      return {
        format: REVEAL_QUEUE_FORMAT,
        version: REVEAL_QUEUE_VERSION,
        items: []
      };
    }

    throw error;
  }
}

export async function saveRevealQueueFile(
  queuePath: string,
  queue: RevealQueueFile
): Promise<void> {
  const resolvedPath = resolve(process.cwd(), queuePath);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, JSON.stringify(queue, null, 2) + "\n", "utf8");
}

export async function enqueueRevealQueueItem(input: {
  readonly queuePath: string;
  readonly item: RevealQueueItem;
}): Promise<RevealQueueFile> {
  const queue = await loadRevealQueueFile(input.queuePath);

  if (queue.items.some((item) => item.id === input.item.id)) {
    throw new Error(`reveal queue item ${input.item.id} already exists`);
  }

  const updated: RevealQueueFile = {
    ...queue,
    items: [...queue.items, input.item]
  };

  await saveRevealQueueFile(input.queuePath, updated);
  return updated;
}

export async function processRevealQueueOnce(input: {
  readonly queuePath: string;
  readonly rpc: BitcoinRpcConfig | undefined;
  readonly esplora: BitcoinEsploraConfig | undefined;
  readonly expectedChain: GnsCliNetwork;
}): Promise<RevealQueueProcessResult> {
  const queue = await loadRevealQueueFile(input.queuePath);
  const nextItems: RevealQueueItem[] = [];
  let processedCount = 0;
  let broadcastedCount = 0;

  for (const item of queue.items) {
    if (item.status !== "pending" || item.expectedChain !== input.expectedChain) {
      nextItems.push(item);
      continue;
    }

    processedCount += 1;
    const checkedAt = new Date().toISOString();

    try {
      const confirmation = await getTransactionConfirmationInfo({
        rpc: input.rpc,
        esplora: input.esplora,
        txid: item.commitTxid
      });

      if (confirmation.confirmations > 0) {
        const { broadcastedTxid } = await broadcastSignedTransactionHex({
          rpc: input.rpc,
          esplora: input.esplora,
          transactionHex: item.signedRevealTransactionHex
        });

        nextItems.push({
          ...item,
          status: "broadcasted",
          lastObservedConfirmations: confirmation.confirmations,
          lastCheckedAt: checkedAt,
          broadcastedAt: checkedAt,
          broadcastedRevealTxid: broadcastedTxid,
          lastError: null
        });
        broadcastedCount += 1;
        continue;
      }

      nextItems.push({
        ...item,
        lastObservedConfirmations: confirmation.confirmations,
        lastCheckedAt: checkedAt,
        lastError: null
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (isAlreadyBroadcastError(message)) {
        nextItems.push({
          ...item,
          status: "broadcasted",
          lastCheckedAt: checkedAt,
          broadcastedAt: checkedAt,
          broadcastedRevealTxid: item.revealTxid,
          lastError: null
        });
        broadcastedCount += 1;
        continue;
      }

      nextItems.push({
        ...item,
        lastCheckedAt: checkedAt,
        lastError: message
      });
    }
  }

  const updated: RevealQueueFile = {
    ...queue,
    items: nextItems
  };
  await saveRevealQueueFile(input.queuePath, updated);

  return {
    kind: "gns-reveal-queue-process-result",
    queuePath: resolve(process.cwd(), input.queuePath),
    processedCount,
    pendingCount: updated.items.filter((item) => item.status === "pending").length,
    broadcastedCount,
    items: updated.items
  };
}

export function parseRevealQueueFile(input: unknown): RevealQueueFile {
  const record = assertRecord(input, "reveal queue file");
  const format = assertString(record.format, "format");
  const version = assertInteger(record.version, "version");
  const items = record.items;

  if (format !== REVEAL_QUEUE_FORMAT) {
    throw new Error(`reveal queue format must be ${REVEAL_QUEUE_FORMAT}`);
  }

  if (version !== REVEAL_QUEUE_VERSION) {
    throw new Error(`reveal queue version must be ${REVEAL_QUEUE_VERSION}`);
  }

  if (!Array.isArray(items)) {
    throw new Error("reveal queue items must be an array");
  }

  return {
    format,
    version,
    items: items.map(parseRevealQueueItem)
  };
}

function parseRevealQueueItem(input: unknown): RevealQueueItem {
  const record = assertRecord(input, "reveal queue item");
  const status = assertString(record.status, "status");

  if (status !== "pending" && status !== "broadcasted") {
    throw new Error("reveal queue item status must be pending or broadcasted");
  }

  return {
    id: assertString(record.id, "id"),
    createdAt: assertString(record.createdAt, "createdAt"),
    expectedChain: parseChain(assertString(record.expectedChain, "expectedChain")),
    commitTxid: assertString(record.commitTxid, "commitTxid"),
    revealTxid: assertString(record.revealTxid, "revealTxid"),
    signedRevealTransactionHex: assertString(record.signedRevealTransactionHex, "signedRevealTransactionHex"),
    status,
    lastObservedConfirmations: assertInteger(record.lastObservedConfirmations, "lastObservedConfirmations"),
    lastCheckedAt: assertNullableString(record.lastCheckedAt, "lastCheckedAt"),
    broadcastedAt: assertNullableString(record.broadcastedAt, "broadcastedAt"),
    broadcastedRevealTxid: assertNullableString(record.broadcastedRevealTxid, "broadcastedRevealTxid"),
    lastError: assertNullableString(record.lastError, "lastError")
  };
}

function parseChain(value: string): GnsCliNetwork {
  if (value === "main" || value === "signet" || value === "testnet" || value === "regtest") {
    return value;
  }

  throw new Error("expectedChain must be one of main, signet, testnet, regtest");
}

function isAlreadyBroadcastError(message: string): boolean {
  return (
    message.includes("txn-already-in-mempool") ||
    message.includes("txn-already-known") ||
    message.includes("already in block chain")
  );
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
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

function assertNullableString(value: unknown, label: string): string | null {
  if (value === null) {
    return null;
  }

  return assertString(value, label);
}

function assertInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }

  return value as number;
}
