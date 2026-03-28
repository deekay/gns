import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  buildClientConfig,
  loadIndexerSnapshotFile,
  parseIndexerSnapshot,
  saveIndexerSnapshotFile
} from "./index.js";

describe("indexer snapshot persistence", () => {
  it("round-trips a snapshot through disk", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "gns-db-test-"));
    const filePath = join(tempDir, "snapshot.json");

    const snapshot = {
      launchHeight: 100,
      currentHeight: 101,
      currentBlockHash: "blockhash101",
      processedBlocks: 2,
      names: [
        {
          name: "alice",
          status: "immature" as const,
          currentOwnerPubkey: "11".repeat(32),
          claimCommitTxid: "aa".repeat(32),
          claimRevealTxid: "bb".repeat(32),
          claimHeight: 100,
          maturityHeight: 52_100,
          requiredBondSats: "6250000",
          currentBondTxid: "aa".repeat(32),
          currentBondVout: 0,
          currentBondValueSats: "6250000",
          lastStateTxid: "bb".repeat(32),
          winningCommitBlockHeight: 100,
          winningCommitTxIndex: 0
        }
      ],
      pendingCommits: [],
      transactionProvenance: [
        {
          txid: "aa".repeat(32),
          blockHeight: 100,
          txIndex: 0,
          inputs: [],
          outputs: [
            {
              valueSats: "6250000",
              scriptType: "payment" as const
            }
          ],
          events: [
            {
              vout: 1,
              type: 1,
              typeName: "COMMIT" as const,
              payload: {
                bondVout: 0,
                ownerPubkey: "11".repeat(32),
                commitHash: "22".repeat(32)
              },
              validationStatus: "applied" as const,
              reason: "commit_registered",
              affectedName: null
            }
          ],
          invalidatedNames: []
        }
      ],
      recentCheckpoints: [
        {
          launchHeight: 100,
          currentHeight: 100,
          currentBlockHash: "blockhash100",
          processedBlocks: 1,
          names: [],
          pendingCommits: [],
          transactionProvenance: []
        }
      ]
    };

    saveIndexerSnapshotFile(filePath, snapshot);
    expect(loadIndexerSnapshotFile(filePath)).toEqual(snapshot);

    rmSync(tempDir, { recursive: true, force: true });
  });

  it("parses valid in-memory snapshot objects", () => {
    expect(
      parseIndexerSnapshot({
        launchHeight: 100,
        currentHeight: null,
        currentBlockHash: null,
        processedBlocks: 0,
        names: [],
        pendingCommits: [],
        transactionProvenance: [],
        recentCheckpoints: [
          {
            launchHeight: 100,
            currentHeight: 99,
            currentBlockHash: "hash99",
            processedBlocks: 0,
            names: [],
            pendingCommits: [],
            transactionProvenance: []
          }
        ]
      })
    ).toEqual({
      launchHeight: 100,
      currentHeight: null,
      currentBlockHash: null,
      processedBlocks: 0,
      names: [],
      pendingCommits: [],
      transactionProvenance: [],
      recentCheckpoints: [
        {
          launchHeight: 100,
          currentHeight: 99,
          currentBlockHash: "hash99",
          processedBlocks: 0,
          names: [],
          pendingCommits: [],
          transactionProvenance: []
        }
      ]
    });
  });

  it("enables ssl defaults for Supabase-style connection strings", () => {
    expect(
      buildClientConfig(
        "postgresql://postgres.example:secret@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
      )
    ).toMatchObject({
      connectionString:
        "postgresql://postgres.example:secret@aws-0-us-west-2.pooler.supabase.com:5432/postgres",
      ssl: {
        rejectUnauthorized: false
      }
    });
  });
});
