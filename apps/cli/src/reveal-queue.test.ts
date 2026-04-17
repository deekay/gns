import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createBitcoinRpcConfig } from "@ont/bitcoin";

import {
  createRevealQueueItem,
  enqueueRevealQueueItem,
  loadRevealQueueFile,
  processRevealQueueOnce
} from "./reveal-queue.js";

const ORIGINAL_FETCH = globalThis.fetch;

describe("reveal queue", () => {
  let sandboxDir: string;

  beforeEach(async () => {
    sandboxDir = await mkdtemp(join(tmpdir(), "ont-reveal-queue-"));
  });

  afterEach(async () => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
    await rm(sandboxDir, { recursive: true, force: true });
  });

  it("persists queued reveals and broadcasts them once the commit confirms", async () => {
    const queuePath = join(sandboxDir, "queue.json");
    const item = createRevealQueueItem({
      expectedChain: "signet",
      commitTxid: "aa".repeat(32),
      signedRevealArtifacts: {
        kind: "ont-signed-reveal-artifacts",
        network: "signet",
        signedTransactionHex: "deadbeef",
        signedTransactionId: "bb".repeat(32),
        signedPsbtBase64: "psbt",
        signedInputCount: 1
      }
    });

    await enqueueRevealQueueItem({
      queuePath,
      item
    });

    globalThis.fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { method: string; params: unknown[] };

      if (body.method === "getblockchaininfo") {
        return new Response(
          JSON.stringify({
            result: {
              chain: "signet",
              blocks: 100,
              headers: 100,
              bestblockhash: "hash100"
            },
            error: null,
            id: "ont"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (body.method === "getrawtransaction") {
        return new Response(
          JSON.stringify({
            result: {
              txid: "aa".repeat(32),
              confirmations: 1,
              blockhash: "hash100",
              in_active_chain: true
            },
            error: null,
            id: "ont"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (body.method === "sendrawtransaction") {
        return new Response(
          JSON.stringify({
            result: "bb".repeat(32),
            error: null,
            id: "ont"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      throw new Error(`unexpected rpc method ${body.method}`);
    }) as typeof fetch;

    const result = await processRevealQueueOnce({
      queuePath,
      rpc: createBitcoinRpcConfig("http://127.0.0.1:38332"),
      esplora: undefined,
      expectedChain: "signet"
    });

    expect(result.processedCount).toBe(1);
    expect(result.broadcastedCount).toBe(1);
    expect(result.items[0]).toMatchObject({
      status: "broadcasted",
      broadcastedRevealTxid: "bb".repeat(32),
      lastObservedConfirmations: 1
    });

    const reloaded = await loadRevealQueueFile(queuePath);
    expect(reloaded.items[0]?.status).toBe("broadcasted");
  });

  it("accepts signed batch reveal artifacts as queue items", () => {
    const item = createRevealQueueItem({
      expectedChain: "regtest",
      commitTxid: "11".repeat(32),
      signedRevealArtifacts: {
        kind: "ont-signed-batch-reveal-artifacts",
        network: "regtest",
        signedTransactionHex: "cafebabe",
        signedTransactionId: "22".repeat(32),
        signedPsbtBase64: "psbt",
        signedInputCount: 1
      }
    });

    expect(item).toMatchObject({
      expectedChain: "regtest",
      commitTxid: "11".repeat(32),
      revealTxid: "22".repeat(32),
      signedRevealTransactionHex: "cafebabe",
      status: "pending"
    });
    expect(item.id).toBe(`${"11".repeat(32)}:${"22".repeat(32)}`);
  });
});
