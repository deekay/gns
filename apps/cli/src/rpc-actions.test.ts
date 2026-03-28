import { afterEach, describe, expect, it, vi } from "vitest";

import { createBitcoinRpcConfig } from "@gns/bitcoin";

import { checkEsploraAddress, checkEsploraConnection, checkRpcConnection } from "./rpc-actions.js";

const ORIGINAL_FETCH = globalThis.fetch;

describe("checkRpcConnection", () => {
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it("verifies a reachable signet RPC endpoint and reports chain/tip info", async () => {
    globalThis.fetch = vi.fn(async (_input, init) => {
      const request = JSON.parse(String(init?.body)) as {
        method: string;
      };

      if (request.method === "getblockchaininfo") {
        return new Response(
          JSON.stringify({
            result: {
              chain: "signet",
              blocks: 2345,
              headers: 2345,
              bestblockhash: "00".repeat(32),
              initialblockdownload: false
            },
            error: null,
            id: "gns"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (request.method === "getblockcount") {
        return new Response(
          JSON.stringify({
            result: 2345,
            error: null,
            id: "gns"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      throw new Error(`unexpected rpc method ${request.method}`);
    }) as typeof fetch;

    await expect(
      checkRpcConnection({
        rpc: createBitcoinRpcConfig("https://remote-signet.example/rpc", "user", "pass"),
        expectedChain: "signet"
      })
    ).resolves.toMatchObject({
      kind: "gns-rpc-check-result",
      expectedChain: "signet",
      rpcUrl: "https://remote-signet.example/rpc",
      chain: "signet",
      blocks: 2345,
      blockCount: 2345
    });
  });
});

describe("checkEsploraConnection", () => {
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it("verifies a reachable signet esplora endpoint and reports tip info", async () => {
    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);

      if (url.endsWith("/blocks/tip/height")) {
        return new Response("2345", { status: 200 });
      }

      if (url.endsWith("/block-height/2345")) {
        return new Response("00".repeat(32), { status: 200 });
      }

      throw new Error(`unexpected esplora url ${url}`);
    }) as typeof fetch;

    await expect(
      checkEsploraConnection({
        esplora: { baseUrl: "https://mempool.space/signet/api" },
        expectedChain: "signet"
      })
    ).resolves.toMatchObject({
      kind: "gns-esplora-check-result",
      expectedChain: "signet",
      baseUrl: "https://mempool.space/signet/api",
      tipHeight: 2345,
      tipHash: "00".repeat(32)
    });
  });

  it("loads address summaries and utxos from a signet esplora endpoint", async () => {
    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);

      if (url.endsWith("/address/tb1qexample")) {
        return new Response(
          JSON.stringify({
            address: "tb1qexample",
            chain_stats: {
              funded_txo_count: 1,
              funded_txo_sum: 50000,
              spent_txo_count: 0,
              spent_txo_sum: 0,
              tx_count: 1
            },
            mempool_stats: {
              funded_txo_count: 0,
              funded_txo_sum: 0,
              spent_txo_count: 0,
              spent_txo_sum: 0,
              tx_count: 0
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (url.endsWith("/address/tb1qexample/utxo")) {
        return new Response(
          JSON.stringify([
            {
              txid: "11".repeat(32),
              vout: 1,
              value: 50000,
              status: {
                confirmed: true,
                block_height: 123
              }
            }
          ]),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      throw new Error(`unexpected esplora url ${url}`);
    }) as typeof fetch;

    await expect(
      checkEsploraAddress({
        esplora: { baseUrl: "https://mempool.space/signet/api" },
        address: "tb1qexample"
      })
    ).resolves.toMatchObject({
      kind: "gns-esplora-address-check-result",
      address: "tb1qexample",
      chainStats: {
        fundedSats: 50000
      },
      utxos: [
        {
          txid: "11".repeat(32),
          vout: 1,
          value: 50000,
          confirmed: true,
          blockHeight: 123
        }
      ]
    });
  });
});
