import { describe, expect, it } from "vitest";

import { type BitcoinBlock } from "@gns/bitcoin";
import { computeCommitHash, encodeCommitPayload, encodeRevealPayload } from "@gns/protocol";

import { InMemoryGnsIndexer } from "./indexer.js";

describe("InMemoryGnsIndexer", () => {
  it("indexes a name from commit/reveal flow", () => {
    const ownerPubkey = "11".repeat(32);
    const indexer = new InMemoryGnsIndexer({ launchHeight: 100 });

    indexer.ingestBlocks([
      makeBlock(100, [
        {
          txid: "aa".repeat(32),
          bondOutputValueSats: 6_250_000n,
          payloads: [
            encodeCommitPayload({
              bondVout: 0,
              ownerPubkey,
              commitHash: computeCommitHash({
                name: "alice",
                nonce: 42n,
                ownerPubkey
              })
            })
          ]
        }
      ]),
      makeBlock(101, [
        {
          txid: "bb".repeat(32),
          payloads: [
            encodeRevealPayload({
              commitTxid: "aa".repeat(32),
              nonce: 42n,
              name: "alice"
            })
          ]
        }
      ])
    ]);

    expect(indexer.getName("alice")?.currentOwnerPubkey).toBe(ownerPubkey);
    expect(indexer.getName("alice")?.status).toBe("immature");
    expect(indexer.getName("alice")?.currentBondVout).toBe(0);
    expect(indexer.getStats()).toEqual({
      currentHeight: 101,
      currentBlockHash: "0000000000000000000000000000000000000000000000000000000000000101",
      processedBlocks: 2,
      trackedNames: 1,
      pendingCommits: 0
    });
  });

  it("advances an indexed name to mature once enough blocks have passed", () => {
    const ownerPubkey = "11".repeat(32);
    const indexer = new InMemoryGnsIndexer({ launchHeight: 100 });

    indexer.ingestBlocks([
      makeBlock(100, [
        {
          txid: "aa".repeat(32),
          bondOutputValueSats: 6_250_000n,
          payloads: [
            encodeCommitPayload({
              bondVout: 0,
              ownerPubkey,
              commitHash: computeCommitHash({
                name: "alice",
                nonce: 42n,
                ownerPubkey
              })
            })
          ]
        }
      ]),
      makeBlock(101, [
        {
          txid: "bb".repeat(32),
          payloads: [
            encodeRevealPayload({
              commitTxid: "aa".repeat(32),
              nonce: 42n,
              name: "alice"
            })
          ]
        }
      ]),
      makeBlock(52_100, [
        {
          txid: "cc".repeat(32),
          payloads: []
        }
      ])
    ]);

    expect(indexer.getName("alice")?.status).toBe("mature");
  });

  it("keeps earlier commits authoritative when later commits reveal first", () => {
    const indexer = new InMemoryGnsIndexer({ launchHeight: 100 });

    indexer.ingestBlocks([
      makeBlock(100, [
        {
          txid: "aa".repeat(32),
          bondOutputValueSats: 6_250_000n,
          payloads: [
            encodeCommitPayload({
              bondVout: 0,
              ownerPubkey: "11".repeat(32),
              commitHash: computeCommitHash({
                name: "alice",
                nonce: 42n,
                ownerPubkey: "11".repeat(32)
              })
            })
          ]
        }
      ]),
      makeBlock(101, [
        {
          txid: "cc".repeat(32),
          bondOutputValueSats: 6_250_000n,
          payloads: [
            encodeCommitPayload({
              bondVout: 0,
              ownerPubkey: "22".repeat(32),
              commitHash: computeCommitHash({
                name: "alice",
                nonce: 7n,
                ownerPubkey: "22".repeat(32)
              })
            })
          ]
        }
      ]),
      makeBlock(102, [
        {
          txid: "dd".repeat(32),
          payloads: [
            encodeRevealPayload({
              commitTxid: "cc".repeat(32),
              nonce: 7n,
              name: "alice"
            })
          ]
        }
      ]),
      makeBlock(103, [
        {
          txid: "ee".repeat(32),
          payloads: [
            encodeRevealPayload({
              commitTxid: "aa".repeat(32),
              nonce: 42n,
              name: "alice"
            })
          ]
        }
      ])
    ]);

    expect(indexer.getName("alice")?.currentOwnerPubkey).toBe("11".repeat(32));
    expect(indexer.getName("alice")?.claimCommitTxid).toBe("aa".repeat(32));
  });

  it("indexes a same-block commit/reveal pair even when reveal is earlier in transaction order", () => {
    const ownerPubkey = "11".repeat(32);
    const indexer = new InMemoryGnsIndexer({ launchHeight: 100 });

    indexer.ingestBlocks([
      makeBlock(100, [
        {
          txid: "bb".repeat(32),
          payloads: [
            encodeRevealPayload({
              commitTxid: "aa".repeat(32),
              nonce: 42n,
              name: "alice"
            })
          ]
        },
        {
          txid: "aa".repeat(32),
          bondOutputValueSats: 6_250_000n,
          payloads: [
            encodeCommitPayload({
              bondVout: 0,
              ownerPubkey,
              commitHash: computeCommitHash({
                name: "alice",
                nonce: 42n,
                ownerPubkey
              })
            })
          ]
        }
      ])
    ]);

    expect(indexer.getName("alice")?.currentOwnerPubkey).toBe(ownerPubkey);
    expect(indexer.getName("alice")?.claimCommitTxid).toBe("aa".repeat(32));
    expect(indexer.getName("alice")?.claimRevealTxid).toBe("bb".repeat(32));
  });

  it("stores transaction provenance for applied GNS events", () => {
    const ownerPubkey = "11".repeat(32);
    const indexer = new InMemoryGnsIndexer({ launchHeight: 100 });

    indexer.ingestBlocks([
      makeBlock(100, [
        {
          txid: "aa".repeat(32),
          bondOutputValueSats: 6_250_000n,
          payloads: [
            encodeCommitPayload({
              bondVout: 0,
              ownerPubkey,
              commitHash: computeCommitHash({
                name: "alice",
                nonce: 42n,
                ownerPubkey
              })
            })
          ]
        }
      ]),
      makeBlock(101, [
        {
          txid: "bb".repeat(32),
          payloads: [
            encodeRevealPayload({
              commitTxid: "aa".repeat(32),
              nonce: 42n,
              name: "alice"
            })
          ]
        }
      ])
    ]);

    expect(indexer.getTransactionProvenance("aa".repeat(32))).toMatchObject({
      txid: "aa".repeat(32),
      blockHeight: 100,
      events: [
        {
          typeName: "COMMIT",
          validationStatus: "applied",
          reason: "commit_registered"
        }
      ]
    });

    expect(indexer.getTransactionProvenance("bb".repeat(32))).toMatchObject({
      txid: "bb".repeat(32),
      blockHeight: 101,
      events: [
        {
          typeName: "REVEAL",
          validationStatus: "applied",
          reason: "reveal_applied",
          affectedName: "alice",
          payload: {
            name: "alice",
            nonce: "42"
          }
        }
      ]
    });
  });

  it("lists recent activity newest first", () => {
    const ownerPubkey = "11".repeat(32);
    const indexer = new InMemoryGnsIndexer({ launchHeight: 100 });

    indexer.ingestBlocks([
      makeBlock(100, [
        {
          txid: "aa".repeat(32),
          bondOutputValueSats: 6_250_000n,
          payloads: [
            encodeCommitPayload({
              bondVout: 0,
              ownerPubkey,
              commitHash: computeCommitHash({
                name: "alice",
                nonce: 42n,
                ownerPubkey
              })
            })
          ]
        }
      ]),
      makeBlock(101, [
        {
          txid: "bb".repeat(32),
          payloads: [
            encodeRevealPayload({
              commitTxid: "aa".repeat(32),
              nonce: 42n,
              name: "alice"
            })
          ]
        }
      ])
    ]);

    expect(indexer.listRecentActivity()).toMatchObject([
      {
        txid: "bb".repeat(32),
        blockHeight: 101
      },
      {
        txid: "aa".repeat(32),
        blockHeight: 100
      }
    ]);
    expect(indexer.listRecentActivity(1)).toHaveLength(1);
    expect(indexer.listRecentActivity(1)[0]?.txid).toBe("bb".repeat(32));
  });

  it("lists recent activity for one name", () => {
    const ownerPubkey = "11".repeat(32);
    const indexer = new InMemoryGnsIndexer({ launchHeight: 100 });

    indexer.ingestBlocks([
      makeBlock(100, [
        {
          txid: "aa".repeat(32),
          bondOutputValueSats: 6_250_000n,
          payloads: [
            encodeCommitPayload({
              bondVout: 0,
              ownerPubkey,
              commitHash: computeCommitHash({
                name: "alice",
                nonce: 42n,
                ownerPubkey
              })
            })
          ]
        },
        {
          txid: "cc".repeat(32),
          bondOutputValueSats: 6_250_000n,
          payloads: [
            encodeCommitPayload({
              bondVout: 0,
              ownerPubkey: "22".repeat(32),
              commitHash: computeCommitHash({
                name: "bob",
                nonce: 7n,
                ownerPubkey: "22".repeat(32)
              })
            })
          ]
        }
      ]),
      makeBlock(101, [
        {
          txid: "bb".repeat(32),
          payloads: [
            encodeRevealPayload({
              commitTxid: "aa".repeat(32),
              nonce: 42n,
              name: "alice"
            })
          ]
        },
        {
          txid: "dd".repeat(32),
          payloads: [
            encodeRevealPayload({
              commitTxid: "cc".repeat(32),
              nonce: 7n,
              name: "bob"
            })
          ]
        }
      ])
    ]);

    expect(indexer.listRecentActivityForName("alice")).toMatchObject([
      {
        txid: "bb".repeat(32),
        blockHeight: 101
      },
      {
        txid: "aa".repeat(32),
        blockHeight: 100
      }
    ]);
    expect(indexer.listRecentActivityForName("alice").map((record) => record.txid)).not.toContain("dd".repeat(32));
  });

  it("exports recent checkpoints and restores a prior checkpoint state", () => {
    const ownerPubkey = "11".repeat(32);
    const indexer = new InMemoryGnsIndexer({ launchHeight: 100, recentCheckpointLimit: 4 });

    indexer.ingestBlocks([
      makeBlock(100, [
        {
          txid: "aa".repeat(32),
          bondOutputValueSats: 6_250_000n,
          payloads: [
            encodeCommitPayload({
              bondVout: 0,
              ownerPubkey,
              commitHash: computeCommitHash({
                name: "alice",
                nonce: 42n,
                ownerPubkey
              })
            })
          ]
        }
      ]),
      makeBlock(101, [
        {
          txid: "bb".repeat(32),
          payloads: [
            encodeRevealPayload({
              commitTxid: "aa".repeat(32),
              nonce: 42n,
              name: "alice"
            })
          ]
        }
      ]),
      makeBlock(102, [
        {
          txid: "cc".repeat(32),
          payloads: []
        }
      ])
    ]);

    expect(indexer.listRecentCheckpoints()[0]).toEqual({
      height: 102,
      hash: "0000000000000000000000000000000000000000000000000000000000000102"
    });
    expect(indexer.exportSnapshot().recentCheckpoints?.length).toBeGreaterThan(0);

    indexer.ingestBlocks([
      makeBlock(103, [
        {
          txid: "dd".repeat(32),
          payloads: []
        }
      ])
    ]);

    expect(indexer.getStats().currentHeight).toBe(103);
    expect(
      indexer.restoreRecentCheckpoint(
        102,
        "0000000000000000000000000000000000000000000000000000000000000102"
      )
    ).toBe(true);
    expect(indexer.getStats().currentHeight).toBe(102);
    expect(indexer.getName("alice")?.claimRevealTxid).toBe("bb".repeat(32));
  });
});

function makeBlock(
  height: number,
  transactions: Array<{
    txid: string;
    bondOutputValueSats?: bigint;
    payloads: Uint8Array[];
  }>
): BitcoinBlock {
  return {
    hash: `${height}`.padStart(64, "0"),
    height,
    transactions: transactions.map((transaction) => ({
      txid: transaction.txid,
      inputs: [],
      outputs: [
        ...(transaction.bondOutputValueSats === undefined
          ? []
          : [
              {
                valueSats: transaction.bondOutputValueSats,
                scriptType: "payment" as const
              }
            ]),
        ...transaction.payloads.map((payload) => ({
          valueSats: 0n,
          scriptType: "op_return" as const,
          dataHex: Buffer.from(payload).toString("hex")
        }))
      ]
    }))
  };
}
