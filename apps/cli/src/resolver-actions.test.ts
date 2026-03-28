import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchClaimPlan,
  fetchNameActivity,
  fetchRecentActivity,
  fetchNameRecord,
  fetchTransactionProvenance,
  fetchNameValueRecord,
  ResolverHttpError
} from "./resolver-actions.js";

const ORIGINAL_FETCH = globalThis.fetch;

describe("resolver actions", () => {
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it("fetches claim plans from the resolver", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          name: "example123456",
          appearsAvailable: true,
          availabilityNote: "No revealed claim is visible right now.",
          currentResolverHeight: 123,
          launchHeight: 0,
          plannedCommitHeight: 124,
          recommendedBondVout: 0,
          revealWindowBlocks: 6,
          revealDeadlineHeight: 130,
          epochIndex: 4,
          maturityBlocks: 4000,
          maturityHeight: 4124,
          requiredBondSats: "50000",
          existingClaim: null,
          nextSteps: []
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    const result = await fetchClaimPlan({
      name: "Example123456",
      resolverUrl: "http://127.0.0.1:8787"
    });

    expect(result.name).toBe("example123456");
    expect(result.appearsAvailable).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith("http://127.0.0.1:8787/claim-plan/example123456");
  });

  it("fetches name records from the resolver", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          name: "example123456",
          status: "immature",
          currentOwnerPubkey: "11".repeat(32),
          claimCommitTxid: "aa".repeat(32),
          claimRevealTxid: "bb".repeat(32),
          claimHeight: 100,
          maturityHeight: 4100,
          requiredBondSats: "50000",
          currentBondTxid: "cc".repeat(32),
          currentBondVout: 0,
          currentBondValueSats: "50000",
          lastStateTxid: "bb".repeat(32),
          lastStateHeight: 100,
          winningCommitBlockHeight: 100,
          winningCommitTxIndex: 1
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    const result = await fetchNameRecord({
      name: "Example123456",
      resolverUrl: "http://127.0.0.1:8787/"
    });

    expect(result.status).toBe("immature");
    expect(globalThis.fetch).toHaveBeenCalledWith("http://127.0.0.1:8787/name/example123456");
  });

  it("surfaces resolver HTTP errors with structured payloads", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: "value_not_found",
          message: "No value record yet."
        }),
        {
          status: 404,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(
      fetchNameValueRecord({
        name: "example123456",
        resolverUrl: "http://127.0.0.1:8787"
      })
    ).rejects.toMatchObject({
      status: 404,
      code: "value_not_found",
      message: "No value record yet."
    } satisfies Partial<ResolverHttpError>);
  });

  it("fetches transaction provenance from the resolver", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          txid: "aa".repeat(32),
          blockHeight: 100,
          txIndex: 0,
          inputs: [],
          outputs: [
            {
              valueSats: "6250000",
              scriptType: "payment"
            }
          ],
          events: [
            {
              vout: 1,
              type: 1,
              typeName: "COMMIT",
              payload: {
                bondVout: 0,
                ownerPubkey: "11".repeat(32),
                commitHash: "22".repeat(32)
              },
              validationStatus: "applied",
              reason: "commit_registered",
              affectedName: null
            }
          ],
          invalidatedNames: []
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    const result = await fetchTransactionProvenance({
      txid: "AA".repeat(32),
      resolverUrl: "http://127.0.0.1:8787"
    });

    expect(result.txid).toBe("aa".repeat(32));
    expect(result.events[0]?.typeName).toBe("COMMIT");
    expect(globalThis.fetch).toHaveBeenCalledWith(`http://127.0.0.1:8787/tx/${"aa".repeat(32)}`);
  });

  it("fetches recent activity from the resolver", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          activity: [
            {
              txid: "bb".repeat(32),
              blockHeight: 101,
              txIndex: 0,
              inputs: [],
              outputs: [],
              events: [],
              invalidatedNames: []
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    const result = await fetchRecentActivity({
      resolverUrl: "http://127.0.0.1:8787",
      limit: 5
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.txid).toBe("bb".repeat(32));
    expect(globalThis.fetch).toHaveBeenCalledWith("http://127.0.0.1:8787/activity?limit=5");
  });

  it("fetches name-specific activity from the resolver", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          name: "example123456",
          activity: [
            {
              txid: "cc".repeat(32),
              blockHeight: 102,
              txIndex: 0,
              inputs: [],
              outputs: [],
              events: [],
              invalidatedNames: []
            }
          ]
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    const result = await fetchNameActivity({
      name: "Example123456",
      resolverUrl: "http://127.0.0.1:8787",
      limit: 4
    });

    expect(result.name).toBe("example123456");
    expect(result.activity[0]?.txid).toBe("cc".repeat(32));
    expect(globalThis.fetch).toHaveBeenCalledWith("http://127.0.0.1:8787/name/example123456/activity?limit=4");
  });
});
