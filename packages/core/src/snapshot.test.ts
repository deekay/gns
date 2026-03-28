import { describe, expect, it } from "vitest";

import { computeCommitHash, encodeCommitPayload, encodeRevealPayload } from "@gns/protocol";

import { InMemoryGnsIndexer } from "./indexer.js";

describe("InMemoryGnsIndexer snapshotting", () => {
  it("round-trips indexed state through a snapshot", () => {
    const ownerPubkey = "11".repeat(32);
    const indexer = new InMemoryGnsIndexer({ launchHeight: 100 });

    indexer.ingestBlocks([
      {
        hash: "hash100",
        height: 100,
        transactions: [
          {
            txid: "aa".repeat(32),
            inputs: [],
            outputs: [
              {
                valueSats: 6_250_000n,
                scriptType: "payment"
              },
              {
                valueSats: 0n,
                scriptType: "op_return",
                dataHex: Buffer.from(
                  encodeCommitPayload({
                    bondVout: 0,
                    ownerPubkey,
                    commitHash: computeCommitHash({
                      name: "alice",
                      nonce: 42n,
                      ownerPubkey
                    })
                  })
                ).toString("hex")
              }
            ]
          }
        ]
      },
      {
        hash: "hash101",
        height: 101,
        transactions: [
          {
            txid: "bb".repeat(32),
            inputs: [],
            outputs: [
              {
                valueSats: 0n,
                scriptType: "op_return",
                dataHex: Buffer.from(
                  encodeRevealPayload({
                    commitTxid: "aa".repeat(32),
                    nonce: 42n,
                    name: "alice"
                  })
                ).toString("hex")
              }
            ]
          }
        ]
      }
    ]);

    const snapshot = indexer.exportSnapshot();
    const restored = InMemoryGnsIndexer.fromSnapshot(snapshot);

    expect(restored.getLaunchHeight()).toBe(100);
    expect(restored.getStats()).toEqual(indexer.getStats());
    expect(restored.getName("alice")).toEqual(indexer.getName("alice"));
    expect(restored.getTransactionProvenance("aa".repeat(32))).toEqual(
      indexer.getTransactionProvenance("aa".repeat(32))
    );
    expect(restored.getTransactionProvenance("bb".repeat(32))).toEqual(
      indexer.getTransactionProvenance("bb".repeat(32))
    );
    expect(snapshot.currentBlockHash).toBe("hash101");
  });
});
