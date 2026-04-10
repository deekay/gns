import { describe, expect, it } from "vitest";
import * as secp256k1 from "tiny-secp256k1";

import { type BitcoinTransactionInBlock } from "@gns/bitcoin";
import {
  computeBatchCommitLeafHash,
  computeCommitHash,
  createMerkleProof,
  encodeBatchAnchorPayload,
  encodeBatchRevealPayload,
  encodeCommitPayload,
  encodeMerkleProof,
  encodeRevealPayload,
  encodeRevealProofChunkPayload,
  encodeTransferPayload,
  computeMerkleRoot,
  signTransferAuthorization
} from "@gns/protocol";

import { applyBlockTransactions, createEmptyState, extractGnsEvents } from "./index.js";

describe("extractGnsEvents", () => {
  it("parses GNS commit and reveal payloads from OP_RETURN outputs", () => {
    const commit = makeTransaction({
      txid: "aa".repeat(32),
      blockHeight: 100,
      txIndex: 0,
      payloads: [
        encodeCommitPayload({
          bondVout: 0,
          ownerPubkey: "11".repeat(32),
          commitHash: "22".repeat(32)
        })
      ]
    });

    const reveal = makeTransaction({
      txid: "bb".repeat(32),
      blockHeight: 101,
      txIndex: 0,
      payloads: [
        encodeRevealPayload({
          commitTxid: "aa".repeat(32),
          nonce: 42n,
          name: "alice"
        })
      ]
    });

    expect(extractGnsEvents(commit)).toHaveLength(1);
    expect(extractGnsEvents(reveal)).toHaveLength(1);
  });

  it("parses batch anchor, batch reveal, and proof chunk payloads from OP_RETURN outputs", () => {
    const ownerPubkey = "11".repeat(32);
    const leafHashes = [
      computeBatchCommitLeafHash({
        bondVout: 1,
        ownerPubkey,
        commitHash: computeCommitHash({
          name: "alice",
          nonce: 42n,
          ownerPubkey
        })
      }),
      computeBatchCommitLeafHash({
        bondVout: 2,
        ownerPubkey: "22".repeat(32),
        commitHash: computeCommitHash({
          name: "bob",
          nonce: 7n,
          ownerPubkey: "22".repeat(32)
        })
      })
    ];
    const proofHex = Buffer.from(encodeMerkleProof(createMerkleProof(leafHashes, 0))).toString("hex");

    const batch = makeTransaction({
      txid: "aa".repeat(32),
      blockHeight: 100,
      txIndex: 0,
      paymentOutputs: [6_250_000n, 6_250_000n],
      payloadsFirst: true,
      payloads: [
        encodeBatchAnchorPayload({
          flags: 0,
          leafCount: 2,
          merkleRoot: computeMerkleRoot(leafHashes)
        })
      ]
    });
    const reveal = makeTransaction({
      txid: "bb".repeat(32),
      blockHeight: 101,
      txIndex: 0,
      payloads: [
        encodeBatchRevealPayload({
          anchorTxid: "aa".repeat(32),
          ownerPubkey,
          nonce: 42n,
          bondVout: 1,
          proofBytesLength: proofHex.length / 2,
          proofChunkCount: 1,
          name: "alice"
        }),
        encodeRevealProofChunkPayload({
          chunkIndex: 0,
          proofBytesHex: proofHex
        })
      ]
    });

    expect(extractGnsEvents(batch)).toHaveLength(1);
    expect(extractGnsEvents(reveal)).toHaveLength(2);
  });
});

describe("applyBlockTransactions", () => {
  it("accepts a valid reveal and materializes a claimed name", () => {
    const ownerPubkey = "11".repeat(32);
    const commitTxid = "aa".repeat(32);
    const state = createEmptyState();

    applyBlockTransactions(
      state,
      [
        makeTransaction({
          txid: commitTxid,
          blockHeight: 100,
          txIndex: 0,
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
        }),
        makeTransaction({
          txid: "bb".repeat(32),
          blockHeight: 101,
          txIndex: 0,
          payloads: [
            encodeRevealPayload({
              commitTxid,
              nonce: 42n,
              name: "alice"
            })
          ]
        })
      ],
      100
    );

    const record = state.names.get("alice");
    expect(record).toBeDefined();
    expect(record?.currentOwnerPubkey).toBe(ownerPubkey);
    expect(record?.claimCommitTxid).toBe(commitTxid);
    expect(record?.currentBondTxid).toBe(commitTxid);
    expect(record?.currentBondVout).toBe(0);
    expect(record?.currentBondValueSats).toBe(6_250_000n);
    expect(record?.status).toBe("immature");
  });

  it("lets an earlier commit supersede a later reveal when it eventually reveals in time", () => {
    const state = createEmptyState();

    applyBlockTransactions(
      state,
      [
        makeTransaction({
          txid: "aa".repeat(32),
          blockHeight: 100,
          txIndex: 0,
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
        }),
        makeTransaction({
          txid: "cc".repeat(32),
          blockHeight: 101,
          txIndex: 1,
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
        }),
        makeTransaction({
          txid: "dd".repeat(32),
          blockHeight: 102,
          txIndex: 0,
          payloads: [
            encodeRevealPayload({
              commitTxid: "cc".repeat(32),
              nonce: 7n,
              name: "alice"
            })
          ]
        }),
        makeTransaction({
          txid: "ee".repeat(32),
          blockHeight: 103,
          txIndex: 0,
          payloads: [
            encodeRevealPayload({
              commitTxid: "aa".repeat(32),
              nonce: 42n,
              name: "alice"
            })
          ]
        })
      ],
      100
    );

    const record = state.names.get("alice");
    expect(record?.currentOwnerPubkey).toBe("11".repeat(32));
    expect(record?.claimCommitTxid).toBe("aa".repeat(32));
  });

  it("drops pending commits that miss the reveal window", () => {
    const state = createEmptyState();

    applyBlockTransactions(
      state,
      [
        makeTransaction({
          txid: "aa".repeat(32),
          blockHeight: 100,
          txIndex: 0,
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
        }),
        makeTransaction({
          txid: "ff".repeat(32),
          blockHeight: 107,
          txIndex: 0,
          payloads: []
        })
      ],
      100
    );

    expect(state.pendingCommits.size).toBe(0);
    expect(state.names.size).toBe(0);
  });

  it("accepts a same-block reveal even when the reveal appears earlier than the commit", () => {
    const ownerPubkey = "11".repeat(32);
    const commitTxid = "aa".repeat(32);
    const state = createEmptyState();

    applyBlockTransactions(
      state,
      [
        makeTransaction({
          txid: "bb".repeat(32),
          blockHeight: 100,
          txIndex: 0,
          payloads: [
            encodeRevealPayload({
              commitTxid,
              nonce: 42n,
              name: "alice"
            })
          ]
        }),
        makeTransaction({
          txid: commitTxid,
          blockHeight: 100,
          txIndex: 1,
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
        })
      ],
      100
    );

    const record = state.names.get("alice");
    expect(record?.currentOwnerPubkey).toBe(ownerPubkey);
    expect(record?.claimCommitTxid).toBe(commitTxid);
    expect(record?.claimRevealTxid).toBe("bb".repeat(32));
    expect(record?.status).toBe("immature");
  });

  it("accepts a valid batch reveal and materializes a claimed name", () => {
    const ownerPubkey = "11".repeat(32);
    const anchorTxid = "aa".repeat(32);
    const state = createEmptyState();
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

    applyBlockTransactions(
      state,
      [
        makeTransaction({
          txid: anchorTxid,
          blockHeight: 100,
          txIndex: 0,
          paymentOutputs: [6_250_000n],
          payloadsFirst: true,
          payloads: [
            encodeBatchAnchorPayload({
              flags: 0,
              leafCount: 1,
              merkleRoot: leafHash
            })
          ]
        }),
        makeTransaction({
          txid: "bb".repeat(32),
          blockHeight: 101,
          txIndex: 0,
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
        })
      ],
      100
    );

    const record = state.names.get("alice");
    expect(record).toBeDefined();
    expect(record?.currentOwnerPubkey).toBe(ownerPubkey);
    expect(record?.claimCommitTxid).toBe(anchorTxid);
    expect(record?.currentBondTxid).toBe(anchorTxid);
    expect(record?.currentBondVout).toBe(1);
    expect(record?.currentBondValueSats).toBe(6_250_000n);
    expect(record?.status).toBe("immature");
  });

  it("accepts a same-block batch reveal even when the reveal appears earlier than the anchor", () => {
    const ownerPubkey = "11".repeat(32);
    const anchorTxid = "aa".repeat(32);
    const state = createEmptyState();
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

    applyBlockTransactions(
      state,
      [
        makeTransaction({
          txid: "bb".repeat(32),
          blockHeight: 100,
          txIndex: 0,
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
        }),
        makeTransaction({
          txid: anchorTxid,
          blockHeight: 100,
          txIndex: 1,
          paymentOutputs: [6_250_000n],
          payloadsFirst: true,
          payloads: [
            encodeBatchAnchorPayload({
              flags: 0,
              leafCount: 1,
              merkleRoot: leafHash
            })
          ]
        })
      ],
      100
    );

    const record = state.names.get("alice");
    expect(record?.currentOwnerPubkey).toBe(ownerPubkey);
    expect(record?.claimCommitTxid).toBe(anchorTxid);
    expect(record?.claimRevealTxid).toBe("bb".repeat(32));
    expect(record?.status).toBe("immature");
  });

  it("rejects a batch reveal when proof chunks are malformed for a non-empty proof", () => {
    const ownerPubkey = "11".repeat(32);
    const otherOwnerPubkey = "22".repeat(32);
    const anchorTxid = "aa".repeat(32);
    const state = createEmptyState();
    const leafHashes = [
      computeBatchCommitLeafHash({
        bondVout: 1,
        ownerPubkey,
        commitHash: computeCommitHash({
          name: "alice",
          nonce: 42n,
          ownerPubkey
        })
      }),
      computeBatchCommitLeafHash({
        bondVout: 2,
        ownerPubkey: otherOwnerPubkey,
        commitHash: computeCommitHash({
          name: "bob",
          nonce: 7n,
          ownerPubkey: otherOwnerPubkey
        })
      })
    ];
    const proofHex = Buffer.from(encodeMerkleProof(createMerkleProof(leafHashes, 0))).toString("hex");

    applyBlockTransactions(
      state,
      [
        makeTransaction({
          txid: anchorTxid,
          blockHeight: 100,
          txIndex: 0,
          paymentOutputs: [6_250_000n, 6_250_000n],
          payloadsFirst: true,
          payloads: [
            encodeBatchAnchorPayload({
              flags: 0,
              leafCount: 2,
              merkleRoot: computeMerkleRoot(leafHashes)
            })
          ]
        }),
        makeTransaction({
          txid: "bb".repeat(32),
          blockHeight: 101,
          txIndex: 0,
          payloads: [
            encodeBatchRevealPayload({
              anchorTxid,
              ownerPubkey,
              nonce: 42n,
              bondVout: 1,
              proofBytesLength: proofHex.length / 2,
              proofChunkCount: 2,
              name: "alice"
            }),
            encodeRevealProofChunkPayload({
              chunkIndex: 0,
              proofBytesHex: proofHex
            })
          ]
        })
      ],
      100
    );

    expect(state.names.has("alice")).toBe(false);
    expect(state.pendingBatchAnchors.get(anchorTxid)?.revealedBondVouts).toEqual([]);
  });

  it("rejects a batch reveal when the claimed bond_vout does not match the committed leaf proof", () => {
    const ownerPubkey = "11".repeat(32);
    const otherOwnerPubkey = "22".repeat(32);
    const anchorTxid = "aa".repeat(32);
    const state = createEmptyState();
    const leafHashes = [
      computeBatchCommitLeafHash({
        bondVout: 1,
        ownerPubkey,
        commitHash: computeCommitHash({
          name: "alice",
          nonce: 42n,
          ownerPubkey
        })
      }),
      computeBatchCommitLeafHash({
        bondVout: 2,
        ownerPubkey: otherOwnerPubkey,
        commitHash: computeCommitHash({
          name: "bob",
          nonce: 7n,
          ownerPubkey: otherOwnerPubkey
        })
      })
    ];
    const proofHex = Buffer.from(encodeMerkleProof(createMerkleProof(leafHashes, 0))).toString("hex");

    applyBlockTransactions(
      state,
      [
        makeTransaction({
          txid: anchorTxid,
          blockHeight: 100,
          txIndex: 0,
          paymentOutputs: [6_250_000n, 6_250_000n],
          payloadsFirst: true,
          payloads: [
            encodeBatchAnchorPayload({
              flags: 0,
              leafCount: 2,
              merkleRoot: computeMerkleRoot(leafHashes)
            })
          ]
        }),
        makeTransaction({
          txid: "bb".repeat(32),
          blockHeight: 101,
          txIndex: 0,
          payloads: [
            encodeBatchRevealPayload({
              anchorTxid,
              ownerPubkey,
              nonce: 42n,
              bondVout: 2,
              proofBytesLength: proofHex.length / 2,
              proofChunkCount: 1,
              name: "alice"
            }),
            encodeRevealProofChunkPayload({
              chunkIndex: 0,
              proofBytesHex: proofHex
            })
          ]
        })
      ],
      100
    );

    expect(state.names.has("alice")).toBe(false);
    expect(state.pendingBatchAnchors.get(anchorTxid)?.revealedBondVouts).toEqual([]);
  });

  it("applies a valid immature transfer after a name was claimed through a batch anchor", () => {
    const ownerPrivateKeyHex = "07".repeat(32);
    const ownerPubkey = Buffer.from(
      secp256k1.xOnlyPointFromScalar(Buffer.from(ownerPrivateKeyHex, "hex"))
    ).toString("hex");
    const anchorTxid = "aa".repeat(32);
    const revealTxid = "bb".repeat(32);
    const transferTxid = "cc".repeat(32);
    const newOwnerPubkey = "22".repeat(32);
    const state = createEmptyState();
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

    applyBlockTransactions(
      state,
      [
        makeTransaction({
          txid: anchorTxid,
          blockHeight: 100,
          txIndex: 0,
          paymentOutputs: [6_250_000n],
          payloadsFirst: true,
          payloads: [
            encodeBatchAnchorPayload({
              flags: 0,
              leafCount: 1,
              merkleRoot: leafHash
            })
          ]
        }),
        makeTransaction({
          txid: revealTxid,
          blockHeight: 101,
          txIndex: 0,
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
        }),
        makeTransaction({
          txid: transferTxid,
          blockHeight: 102,
          txIndex: 0,
          inputs: [
            {
              txid: anchorTxid,
              vout: 1
            }
          ],
          bondOutputValueSats: 6_250_000n,
          payloads: [
            encodeTransferPayload({
              prevStateTxid: revealTxid,
              newOwnerPubkey,
              flags: 0x00,
              successorBondVout: 0,
              signature: signTransferAuthorization({
                prevStateTxid: revealTxid,
                newOwnerPubkey,
                flags: 0x00,
                successorBondVout: 0,
                ownerPrivateKeyHex
              })
            })
          ]
        })
      ],
      100
    );

    const record = state.names.get("alice");
    expect(record?.currentOwnerPubkey).toBe(newOwnerPubkey);
    expect(record?.claimCommitTxid).toBe(anchorTxid);
    expect(record?.currentBondTxid).toBe(transferTxid);
    expect(record?.currentBondVout).toBe(0);
    expect(record?.currentBondValueSats).toBe(6_250_000n);
    expect(record?.lastStateTxid).toBe(transferTxid);
    expect(record?.status).toBe("immature");
  });

  it("applies a valid immature transfer and carries bond continuity forward", () => {
    const ownerPrivateKeyHex = "07".repeat(32);
    const ownerPubkey = Buffer.from(
      secp256k1.xOnlyPointFromScalar(Buffer.from(ownerPrivateKeyHex, "hex"))
    ).toString("hex");
    const newOwnerPubkey = "22".repeat(32);
    const commitTxid = "aa".repeat(32);
    const revealTxid = "bb".repeat(32);
    const transferTxid = "cc".repeat(32);
    const state = createEmptyState();

    applyBlockTransactions(
      state,
      [
        makeTransaction({
          txid: commitTxid,
          blockHeight: 100,
          txIndex: 0,
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
        }),
        makeTransaction({
          txid: revealTxid,
          blockHeight: 101,
          txIndex: 0,
          payloads: [
            encodeRevealPayload({
              commitTxid,
              nonce: 42n,
              name: "alice"
            })
          ]
        }),
        makeTransaction({
          txid: transferTxid,
          blockHeight: 102,
          txIndex: 0,
          inputs: [
            {
              txid: commitTxid,
              vout: 0
            }
          ],
          bondOutputValueSats: 6_250_000n,
          payloads: [
            encodeTransferPayload({
              prevStateTxid: revealTxid,
              newOwnerPubkey,
              flags: 0x00,
              successorBondVout: 0,
              signature: signTransferAuthorization({
                prevStateTxid: revealTxid,
                newOwnerPubkey,
                flags: 0x00,
                successorBondVout: 0,
                ownerPrivateKeyHex
              })
            })
          ]
        })
      ],
      100
    );

    const record = state.names.get("alice");
    expect(record?.currentOwnerPubkey).toBe(newOwnerPubkey);
    expect(record?.currentBondTxid).toBe(transferTxid);
    expect(record?.currentBondVout).toBe(0);
    expect(record?.currentBondValueSats).toBe(6_250_000n);
    expect(record?.lastStateTxid).toBe(transferTxid);
    expect(record?.status).toBe("immature");
  });

  it("invalidates an immature name when the live bond outpoint is spent without a valid successor", () => {
    const ownerPrivateKeyHex = "07".repeat(32);
    const ownerPubkey = Buffer.from(
      secp256k1.xOnlyPointFromScalar(Buffer.from(ownerPrivateKeyHex, "hex"))
    ).toString("hex");
    const commitTxid = "aa".repeat(32);
    const state = createEmptyState();

    applyBlockTransactions(
      state,
      [
        makeTransaction({
          txid: commitTxid,
          blockHeight: 100,
          txIndex: 0,
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
        }),
        makeTransaction({
          txid: "bb".repeat(32),
          blockHeight: 101,
          txIndex: 0,
          payloads: [
            encodeRevealPayload({
              commitTxid,
              nonce: 42n,
              name: "alice"
            })
          ]
        }),
        makeTransaction({
          txid: "cc".repeat(32),
          blockHeight: 102,
          txIndex: 0,
          inputs: [
            {
              txid: commitTxid,
              vout: 0
            }
          ],
          payloads: []
        })
      ],
      100
    );

    expect(state.names.get("alice")?.status).toBe("invalid");
  });

  it("applies a valid mature transfer without requiring bond continuity", () => {
    const ownerPrivateKeyHex = "07".repeat(32);
    const ownerPubkey = Buffer.from(
      secp256k1.xOnlyPointFromScalar(Buffer.from(ownerPrivateKeyHex, "hex"))
    ).toString("hex");
    const newOwnerPubkey = "22".repeat(32);
    const revealTxid = "bb".repeat(32);
    const state = createEmptyState();

    applyBlockTransactions(
      state,
      [
        makeTransaction({
          txid: "aa".repeat(32),
          blockHeight: 100,
          txIndex: 0,
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
        }),
        makeTransaction({
          txid: revealTxid,
          blockHeight: 101,
          txIndex: 0,
          payloads: [
            encodeRevealPayload({
              commitTxid: "aa".repeat(32),
              nonce: 42n,
              name: "alice"
            })
          ]
        }),
        makeTransaction({
          txid: "cc".repeat(32),
          blockHeight: 52_100,
          txIndex: 0,
          payloads: [
            encodeTransferPayload({
              prevStateTxid: revealTxid,
              newOwnerPubkey,
              flags: 0x00,
              successorBondVout: 0xff,
              signature: signTransferAuthorization({
                prevStateTxid: revealTxid,
                newOwnerPubkey,
                flags: 0x00,
                successorBondVout: 0xff,
                ownerPrivateKeyHex
              })
            })
          ]
        })
      ],
      100
    );

    const record = state.names.get("alice");
    expect(record?.status).toBe("mature");
    expect(record?.currentOwnerPubkey).toBe(newOwnerPubkey);
    expect(record?.lastStateTxid).toBe("cc".repeat(32));
  });
});

function makeTransaction(input: {
  txid: string;
  blockHeight: number;
  txIndex: number;
  inputs?: ReadonlyArray<{
    txid: string;
    vout: number;
  }>;
  bondOutputValueSats?: bigint;
  paymentOutputs?: ReadonlyArray<bigint>;
  payloadsFirst?: boolean;
  payloads: Uint8Array[];
}): BitcoinTransactionInBlock {
  const paymentOutputs =
    input.paymentOutputs !== undefined
      ? input.paymentOutputs.map((valueSats) => ({
          valueSats,
          scriptType: "payment" as const
        }))
      : input.bondOutputValueSats === undefined
        ? []
        : [
            {
              valueSats: input.bondOutputValueSats,
              scriptType: "payment" as const
            }
          ];
  const payloadOutputs = input.payloads.map((payload) => ({
    valueSats: 0n,
    scriptType: "op_return" as const,
    dataHex: Buffer.from(payload).toString("hex")
  }));

  return {
    blockHeight: input.blockHeight,
    txIndex: input.txIndex,
    tx: {
      txid: input.txid,
      inputs: (input.inputs ?? []).map((current) => ({
        txid: current.txid,
        vout: current.vout,
        coinbase: false as const
      })),
      outputs: [
        ...(input.payloadsFirst ? payloadOutputs : paymentOutputs),
        ...(input.payloadsFirst ? paymentOutputs : payloadOutputs)
      ]
    }
  };
}
