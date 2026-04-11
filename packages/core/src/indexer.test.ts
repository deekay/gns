import { describe, expect, it } from "vitest";

import { type BitcoinBlock } from "@gns/bitcoin";
import {
  computeAuctionBidStateCommitment,
  computeAuctionBidderCommitment,
  computeAuctionLotCommitment,
  computeBatchCommitLeafHash,
  computeCommitHash,
  encodeAuctionBidPayload,
  encodeBatchAnchorPayload,
  encodeBatchRevealPayload,
  encodeCommitPayload,
  encodeRevealPayload
} from "@gns/protocol";

import { createDefaultReservedAuctionPolicy } from "./auction-policy.js";
import { createExperimentalReservedAuctionCatalogEntry } from "./experimental-auction.js";
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

  it("indexes a batched anchor/reveal flow", () => {
    const ownerPubkey = "11".repeat(32);
    const anchorTxid = "aa".repeat(32);
    const commitHash = computeCommitHash({
      name: "alice",
      nonce: 42n,
      ownerPubkey
    });
    const leafHash = computeBatchCommitLeafHash({
      bondVout: 1,
      ownerPubkey,
      commitHash
    });
    const indexer = new InMemoryGnsIndexer({ launchHeight: 100 });

    indexer.ingestBlocks([
      makeBlock(100, [
        {
          txid: anchorTxid,
          paymentOutputs: [6_250_000n],
          payloadsFirst: true,
          payloads: [
            encodeBatchAnchorPayload({
              flags: 0,
              leafCount: 1,
              merkleRoot: leafHash
            })
          ]
        }
      ]),
      makeBlock(101, [
        {
          txid: "bb".repeat(32),
          payloads: [
            encodeBatchRevealPayload({
              anchorTxid,
              ownerPubkey,
              nonce: 42n,
              bondVout: 1,
              proofBytesLength: 0,
              proofChunkCount: 0,
              name: "alice"
            })
          ]
        }
      ])
    ]);

    expect(indexer.getName("alice")?.currentOwnerPubkey).toBe(ownerPubkey);
    expect(indexer.getName("alice")?.claimCommitTxid).toBe(anchorTxid);
    expect(indexer.getName("alice")?.currentBondVout).toBe(1);
    expect(indexer.getStats().pendingCommits).toBe(0);
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

  it("stores transaction provenance for applied batch anchor and batch reveal events", () => {
    const ownerPubkey = "11".repeat(32);
    const anchorTxid = "aa".repeat(32);
    const commitHash = computeCommitHash({
      name: "alice",
      nonce: 42n,
      ownerPubkey
    });
    const leafHash = computeBatchCommitLeafHash({
      bondVout: 1,
      ownerPubkey,
      commitHash
    });
    const indexer = new InMemoryGnsIndexer({ launchHeight: 100 });

    indexer.ingestBlocks([
      makeBlock(100, [
        {
          txid: anchorTxid,
          paymentOutputs: [6_250_000n],
          payloadsFirst: true,
          payloads: [
            encodeBatchAnchorPayload({
              flags: 0,
              leafCount: 1,
              merkleRoot: leafHash
            })
          ]
        }
      ]),
      makeBlock(101, [
        {
          txid: "bb".repeat(32),
          payloads: [
            encodeBatchRevealPayload({
              anchorTxid,
              ownerPubkey,
              nonce: 42n,
              bondVout: 1,
              proofBytesLength: 0,
              proofChunkCount: 0,
              name: "alice"
            })
          ]
        }
      ])
    ]);

    expect(indexer.getTransactionProvenance(anchorTxid)).toMatchObject({
      txid: anchorTxid,
      blockHeight: 100,
      events: [
        {
          typeName: "BATCH_ANCHOR",
          validationStatus: "applied",
          reason: "batch_anchor_registered"
        }
      ]
    });

    expect(indexer.getTransactionProvenance("bb".repeat(32))).toMatchObject({
      txid: "bb".repeat(32),
      blockHeight: 101,
      events: [
        {
          typeName: "BATCH_REVEAL",
          validationStatus: "applied",
          reason: "batch_reveal_applied",
          affectedName: "alice",
          payload: {
            anchorTxid,
            ownerPubkey,
            nonce: "42",
            bondVout: 1,
            proofBytesLength: 0,
            proofChunkCount: 0,
            name: "alice"
          }
        }
      ]
    });
  });

  it("derives experimental reserved auction state from applied auction bid transactions", () => {
    const policy = createDefaultReservedAuctionPolicy();
    const catalogEntry = createExperimentalReservedAuctionCatalogEntry(
      {
        auctionId: "04-soft-close-google",
        title: "Soft close · google",
        description: "Experimental live test lot.",
        name: "google",
        reservedClassId: "top_collision",
        unlockBlock: 840_000
      },
      policy
    );
    const indexer = new InMemoryGnsIndexer({
      launchHeight: 100,
      experimentalReservedAuctionPolicy: policy,
      experimentalReservedAuctionCatalog: [catalogEntry]
    });

    indexer.ingestBlocks([
      makeBlock(840_010, [
        {
          txid: "11".repeat(32),
          paymentOutputs: [1_000_000_000n],
          payloads: [
            encodeAuctionBidPayload({
              flags: 0,
              bondVout: 0,
              reservedLockBlocks: catalogEntry.reservedLockBlocks,
              bidAmountSats: 1_000_000_000n,
              auctionLotCommitment: computeAuctionLotCommitment({
                auctionId: catalogEntry.auctionId,
                name: catalogEntry.normalizedName,
                reservedClassId: catalogEntry.reservedClassId,
                unlockBlock: catalogEntry.unlockBlock
              }),
              auctionCommitment: computeAuctionBidStateCommitment({
                auctionId: catalogEntry.auctionId,
                name: catalogEntry.normalizedName,
                reservedClassId: catalogEntry.reservedClassId,
                currentBlockHeight: 840_010,
                phase: "awaiting_opening_bid",
                unlockBlock: catalogEntry.unlockBlock,
                auctionCloseBlockAfter: null,
                openingMinimumBidSats: catalogEntry.openingMinimumBidSats,
                currentLeaderBidderCommitment: null,
                currentHighestBidSats: null,
                currentRequiredMinimumBidSats: catalogEntry.openingMinimumBidSats,
                reservedLockBlocks: catalogEntry.reservedLockBlocks
              }),
              bidderCommitment: computeAuctionBidderCommitment("alpha")
            })
          ]
        }
      ]),
      makeBlock(844_210, [
        {
          txid: "22".repeat(32),
          paymentOutputs: [1_100_000_000n],
          payloads: [
            encodeAuctionBidPayload({
              flags: 0,
              bondVout: 0,
              reservedLockBlocks: catalogEntry.reservedLockBlocks,
              bidAmountSats: 1_100_000_000n,
              auctionLotCommitment: catalogEntry.auctionLotCommitment,
              auctionCommitment: computeAuctionBidStateCommitment({
                auctionId: catalogEntry.auctionId,
                name: catalogEntry.normalizedName,
                reservedClassId: catalogEntry.reservedClassId,
                currentBlockHeight: 844_210,
                phase: "soft_close",
                unlockBlock: catalogEntry.unlockBlock,
                auctionCloseBlockAfter: 844_330,
                openingMinimumBidSats: catalogEntry.openingMinimumBidSats,
                currentLeaderBidderCommitment: computeAuctionBidderCommitment("alpha"),
                currentHighestBidSats: 1_000_000_000n,
                currentRequiredMinimumBidSats: 1_050_000_000n,
                reservedLockBlocks: catalogEntry.reservedLockBlocks
              }),
              bidderCommitment: computeAuctionBidderCommitment("beta")
            })
          ]
        }
      ]),
      makeBlock(844_250, [
        {
          txid: "33".repeat(32),
          payloads: []
        }
      ])
    ]);

    expect(indexer.getTransactionProvenance("11".repeat(32))).toMatchObject({
      events: [
        {
          typeName: "AUCTION_BID",
          validationStatus: "applied",
          reason: "auction_bid_recorded"
        }
      ]
    });

    expect(indexer.listExperimentalAuctions()).toMatchObject([
      {
        auctionId: "04-soft-close-google",
        phase: "soft_close",
        currentLeaderBidderCommitment: computeAuctionBidderCommitment("beta"),
        currentHighestBidSats: "1100000000",
        currentRequiredMinimumBidSats: "1155000000",
        acceptedBidCount: 2,
        rejectedBidCount: 0,
        totalObservedBidCount: 2
      }
    ]);
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
    paymentOutputs?: ReadonlyArray<bigint>;
    payloadsFirst?: boolean;
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
        ...(
          transaction.payloadsFirst
            ? transaction.payloads.map((payload) => ({
                valueSats: 0n,
                scriptType: "op_return" as const,
                dataHex: Buffer.from(payload).toString("hex")
              }))
            : transaction.paymentOutputs !== undefined
              ? transaction.paymentOutputs.map((valueSats) => ({
                  valueSats,
                  scriptType: "payment" as const
                }))
              : transaction.bondOutputValueSats === undefined
                ? []
                : [
                    {
                      valueSats: transaction.bondOutputValueSats,
                      scriptType: "payment" as const
                    }
                  ]
        ),
        ...(
          transaction.payloadsFirst
            ? transaction.paymentOutputs !== undefined
              ? transaction.paymentOutputs.map((valueSats) => ({
                  valueSats,
                  scriptType: "payment" as const
                }))
              : transaction.bondOutputValueSats === undefined
                ? []
                : [
                    {
                      valueSats: transaction.bondOutputValueSats,
                      scriptType: "payment" as const
                    }
                  ]
            : transaction.payloads.map((payload) => ({
                valueSats: 0n,
                scriptType: "op_return" as const,
                dataHex: Buffer.from(payload).toString("hex")
              }))
        )
      ]
    }))
  };
}
