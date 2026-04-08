import {
  type BitcoinBlock,
  type BitcoinTransactionInBlock,
  type BitcoinTransactionInput,
  type BitcoinTransactionOutput
} from "@gns/bitcoin";
import {
  type BatchAnchorEventPayload,
  type BatchRevealEventPayload,
  GnsEventType,
  normalizeName,
  type CommitEventPayload,
  type RevealEventPayload,
  type RevealProofChunkEventPayload,
  type TransferEventPayload
} from "@gns/protocol";

import {
  applyBlockTransactionsWithProvenance,
  createEmptyState,
  type GnsState,
  type NameRecord,
  type PendingBatchAnchorRecord,
  type PendingCommitRecord,
  type ProvenanceEventRecord,
  refreshDerivedState
} from "./engine.js";

export interface IndexerStats {
  readonly currentHeight: number | null;
  readonly currentBlockHash: string | null;
  readonly processedBlocks: number;
  readonly trackedNames: number;
  readonly pendingCommits: number;
}

export interface InMemoryGnsIndexerPersistedState {
  readonly launchHeight: number;
  readonly currentHeight: number | null;
  readonly currentBlockHash: string | null;
  readonly processedBlocks: number;
  readonly names: readonly NameRecordSnapshot[];
  readonly pendingCommits: ReadonlyArray<
    Omit<PendingCommitRecord, "bondValueSats"> & { readonly bondValueSats: string | null }
  >;
  readonly pendingBatchAnchors: ReadonlyArray<
    Omit<PendingBatchAnchorRecord, "bondOutputs"> & {
      readonly bondOutputs: ReadonlyArray<{
        readonly vout: number;
        readonly bondValueSats: string | null;
      }>;
    }
  >;
  readonly transactionProvenance: readonly TransactionProvenanceSnapshot[];
}

export interface NameRecordSnapshot extends Omit<NameRecord, "requiredBondSats" | "currentBondValueSats" | "lastStateHeight"> {
  readonly requiredBondSats: string;
  readonly currentBondValueSats: string;
  readonly lastStateHeight?: number;
}

export interface InMemoryGnsIndexerSnapshot extends InMemoryGnsIndexerPersistedState {
  readonly recentCheckpoints?: readonly InMemoryGnsIndexerPersistedState[];
}

export interface TransactionOutputSnapshot extends Omit<BitcoinTransactionOutput, "valueSats"> {
  readonly valueSats: string;
}

export type TransactionProvenanceEventPayloadSnapshot =
  | CommitEventPayload
  | {
      readonly commitTxid: string;
      readonly nonce: string;
      readonly name: string;
    }
  | {
      readonly anchorTxid: string;
      readonly ownerPubkey: string;
      readonly nonce: string;
      readonly bondVout: number;
      readonly proofBytesLength: number;
      readonly proofChunkCount: number;
      readonly name: string;
    }
  | TransferEventPayload
  | BatchAnchorEventPayload
  | RevealProofChunkEventPayload;

export interface TransactionProvenanceEventSnapshot {
  readonly vout: number;
  readonly type: GnsEventType;
  readonly typeName:
    | "COMMIT"
    | "REVEAL"
    | "TRANSFER"
    | "BATCH_ANCHOR"
    | "BATCH_REVEAL"
    | "REVEAL_PROOF_CHUNK";
  readonly payload: TransactionProvenanceEventPayloadSnapshot;
  readonly validationStatus: "applied" | "ignored";
  readonly reason: string;
  readonly affectedName: string | null;
}

export interface TransactionProvenanceSnapshot {
  readonly txid: string;
  readonly blockHeight: number;
  readonly txIndex: number;
  readonly inputs: readonly BitcoinTransactionInput[];
  readonly outputs: readonly TransactionOutputSnapshot[];
  readonly events: readonly TransactionProvenanceEventSnapshot[];
  readonly invalidatedNames: readonly string[];
}

export class InMemoryGnsIndexer {
  private readonly launchHeight: number;
  private readonly recentCheckpointLimit: number;
  private readonly state: GnsState;
  private readonly transactionProvenance: Map<string, TransactionProvenanceSnapshot>;
  private recentCheckpoints: InMemoryGnsIndexerPersistedState[];
  private currentHeight: number | null;
  private currentBlockHash: string | null;
  private processedBlocks: number;

  public constructor(input: { launchHeight: number; recentCheckpointLimit?: number }) {
    this.launchHeight = input.launchHeight;
    this.recentCheckpointLimit = Math.max(1, input.recentCheckpointLimit ?? 100);
    this.state = createEmptyState();
    this.transactionProvenance = new Map();
    this.recentCheckpoints = [];
    this.currentHeight = null;
    this.currentBlockHash = null;
    this.processedBlocks = 0;
  }

  public static fromSnapshot(snapshot: InMemoryGnsIndexerSnapshot): InMemoryGnsIndexer {
    const indexer = new InMemoryGnsIndexer({
      launchHeight: snapshot.launchHeight,
      recentCheckpointLimit: Math.max(1, snapshot.recentCheckpoints?.length ?? 100)
    });
    indexer.hydrate(snapshot);

    return indexer;
  }

  public ingestBlock(block: BitcoinBlock): void {
    const transactions = block.transactions.map<BitcoinTransactionInBlock>((tx, txIndex) => ({
      tx,
      blockHeight: block.height,
      txIndex
    }));

    const provenance = applyBlockTransactionsWithProvenance(this.state, transactions, this.launchHeight);
    refreshDerivedState(this.state, block.height);

    for (const transaction of provenance) {
      this.transactionProvenance.set(transaction.txid, serializeTransactionProvenanceRecord(transaction));
    }

    this.currentHeight = block.height;
    this.currentBlockHash = block.hash;
    this.processedBlocks += 1;
    this.pushRecentCheckpoint();
  }

  public ingestBlocks(blocks: readonly BitcoinBlock[]): void {
    for (const block of blocks) {
      this.ingestBlock(block);
    }
  }

  public getName(name: string): NameRecord | null {
    const normalized = normalizeName(name);
    const record = this.state.names.get(normalized);

    return record ?? null;
  }

  public listNames(): NameRecord[] {
    return [...this.state.names.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  public listPendingCommits(): PendingCommitRecord[] {
    return [...this.state.pendingCommits.values()].sort((left, right) => {
      if (left.blockHeight !== right.blockHeight) {
        return left.blockHeight - right.blockHeight;
      }

      if (left.txIndex !== right.txIndex) {
        return left.txIndex - right.txIndex;
      }

      return left.txid.localeCompare(right.txid);
    });
  }

  public getPendingCommit(txid: string): PendingCommitRecord | null {
    const pending = this.state.pendingCommits.get(txid);
    return pending ?? null;
  }

  public getTransactionProvenance(txid: string): TransactionProvenanceSnapshot | null {
    return this.transactionProvenance.get(txid) ?? null;
  }

  public listRecentActivity(limit = 12): TransactionProvenanceSnapshot[] {
    const normalizedLimit = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 12;

    return [...this.transactionProvenance.values()]
      .sort((left, right) => {
        if (left.blockHeight !== right.blockHeight) {
          return right.blockHeight - left.blockHeight;
        }

        if (left.txIndex !== right.txIndex) {
          return right.txIndex - left.txIndex;
        }

        return right.txid.localeCompare(left.txid);
      })
      .slice(0, normalizedLimit);
  }

  public listRecentActivityForName(name: string, limit = 12): TransactionProvenanceSnapshot[] {
    const normalizedName = normalizeName(name);
    const normalizedLimit = Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 12;
    const record = this.state.names.get(normalizedName) ?? null;
    const relatedTxids =
      record === null
        ? new Set<string>()
        : new Set(
            [
              record.claimCommitTxid,
              record.claimRevealTxid,
              record.lastStateTxid,
              record.currentBondTxid
            ].filter((txid) => txid !== "")
          );

    return this.listRecentActivity(Number.MAX_SAFE_INTEGER)
      .filter((transaction) => {
        if (relatedTxids.has(transaction.txid)) {
          return true;
        }

        if (transaction.invalidatedNames.includes(normalizedName)) {
          return true;
        }

        return transaction.events.some((event) => event.affectedName === normalizedName);
      })
      .slice(0, normalizedLimit);
  }

  public listRecentCheckpoints(): ReadonlyArray<{ readonly height: number; readonly hash: string }> {
    return this.recentCheckpoints
      .filter(
        (checkpoint): checkpoint is InMemoryGnsIndexerPersistedState & {
          readonly currentHeight: number;
          readonly currentBlockHash: string;
        } => checkpoint.currentHeight !== null && checkpoint.currentBlockHash !== null
      )
      .map((checkpoint) => ({
        height: checkpoint.currentHeight,
        hash: checkpoint.currentBlockHash
      }))
      .sort((left, right) => right.height - left.height);
  }

  public restoreRecentCheckpoint(height: number, blockHash: string): boolean {
    const checkpointIndex = this.recentCheckpoints.findIndex(
      (checkpoint) => checkpoint.currentHeight === height && checkpoint.currentBlockHash === blockHash
    );

    if (checkpointIndex === -1) {
      return false;
    }

    const checkpoint = this.recentCheckpoints[checkpointIndex];
    if (!checkpoint) {
      return false;
    }

    this.hydrate({
      ...checkpoint,
      recentCheckpoints: this.recentCheckpoints.slice(0, checkpointIndex + 1)
    });
    return true;
  }

  public getStats(): IndexerStats {
    return {
      currentHeight: this.currentHeight,
      currentBlockHash: this.currentBlockHash,
      processedBlocks: this.processedBlocks,
      trackedNames: this.state.names.size,
      pendingCommits:
        this.state.pendingCommits.size +
        [...this.state.pendingBatchAnchors.values()].reduce(
          (sum, anchor) =>
            sum +
            anchor.bondOutputs.filter(
              (output) =>
                output.vout > 0 && !anchor.revealedBondVouts.includes(output.vout)
            ).length,
          0
        )
    };
  }

  public getLaunchHeight(): number {
    return this.launchHeight;
  }

  public exportSnapshot(): InMemoryGnsIndexerSnapshot {
    return {
      ...this.createPersistedStateSnapshot(),
      recentCheckpoints: this.recentCheckpoints.map((checkpoint) => structuredClone(checkpoint))
    };
  }

  private hydrate(snapshot: InMemoryGnsIndexerSnapshot | InMemoryGnsIndexerPersistedState): void {
    this.state.names.clear();
    this.state.pendingCommits.clear();
    this.state.pendingBatchAnchors.clear();
    this.transactionProvenance.clear();

    for (const record of snapshot.names) {
      this.state.names.set(record.name, {
        ...record,
        lastStateHeight:
          typeof record.lastStateHeight === "number" && Number.isFinite(record.lastStateHeight)
            ? record.lastStateHeight
            : record.claimHeight,
        requiredBondSats: BigInt(record.requiredBondSats),
        currentBondValueSats: BigInt(record.currentBondValueSats)
      });
    }

    for (const pending of snapshot.pendingCommits) {
      this.state.pendingCommits.set(pending.txid, {
        ...pending,
        bondValueSats: pending.bondValueSats === null ? null : BigInt(pending.bondValueSats)
      });
    }

    for (const pending of snapshot.pendingBatchAnchors) {
      this.state.pendingBatchAnchors.set(pending.txid, {
        ...pending,
        bondOutputs: pending.bondOutputs.map((output) => ({
          ...output,
          bondValueSats: output.bondValueSats === null ? null : BigInt(output.bondValueSats)
        }))
      });
    }

    for (const transaction of snapshot.transactionProvenance) {
      this.transactionProvenance.set(transaction.txid, transaction);
    }

    this.currentHeight = snapshot.currentHeight;
    this.currentBlockHash = snapshot.currentBlockHash;
    this.processedBlocks = snapshot.processedBlocks;
    this.recentCheckpoints = "recentCheckpoints" in snapshot
      ? (snapshot.recentCheckpoints ?? []).map((checkpoint) => structuredClone(checkpoint))
      : [];

    if (snapshot.currentHeight !== null) {
      refreshDerivedState(this.state, snapshot.currentHeight);
    }
  }

  private createPersistedStateSnapshot(): InMemoryGnsIndexerPersistedState {
    return {
      launchHeight: this.launchHeight,
      currentHeight: this.currentHeight,
      currentBlockHash: this.currentBlockHash,
      processedBlocks: this.processedBlocks,
      names: this.listNames().map((record) => ({
        ...record,
        requiredBondSats: record.requiredBondSats.toString(),
        currentBondValueSats: record.currentBondValueSats.toString()
      })),
      pendingCommits: this.listPendingCommits()
        .map((pending) => ({
          ...pending,
          bondValueSats: pending.bondValueSats === null ? null : pending.bondValueSats.toString()
        })),
      pendingBatchAnchors: [...this.state.pendingBatchAnchors.values()]
        .sort((left, right) => {
          if (left.blockHeight !== right.blockHeight) {
            return left.blockHeight - right.blockHeight;
          }

          if (left.txIndex !== right.txIndex) {
            return left.txIndex - right.txIndex;
          }

          return left.txid.localeCompare(right.txid);
        })
        .map((pending) => ({
          ...pending,
          bondOutputs: pending.bondOutputs.map((output) => ({
            ...output,
            bondValueSats: output.bondValueSats === null ? null : output.bondValueSats.toString()
          }))
        })),
      transactionProvenance: [...this.transactionProvenance.values()].sort((left, right) => {
        if (left.blockHeight !== right.blockHeight) {
          return left.blockHeight - right.blockHeight;
        }

        if (left.txIndex !== right.txIndex) {
          return left.txIndex - right.txIndex;
        }

        return left.txid.localeCompare(right.txid);
      })
    };
  }

  private pushRecentCheckpoint(): void {
    if (this.currentHeight === null || this.currentBlockHash === null) {
      return;
    }

    const snapshot = this.createPersistedStateSnapshot();
    this.recentCheckpoints = [
      snapshot,
      ...this.recentCheckpoints.filter(
        (checkpoint) =>
          checkpoint.currentHeight !== snapshot.currentHeight || checkpoint.currentBlockHash !== snapshot.currentBlockHash
      )
    ].slice(0, this.recentCheckpointLimit);
  }
}

function serializeTransactionProvenanceRecord(input: {
  readonly txid: string;
  readonly blockHeight: number;
  readonly txIndex: number;
  readonly inputs: readonly BitcoinTransactionInput[];
  readonly outputs: readonly BitcoinTransactionOutput[];
  readonly events: readonly ProvenanceEventRecord[];
  readonly invalidatedNames: readonly string[];
}): TransactionProvenanceSnapshot {
  return {
    txid: input.txid,
    blockHeight: input.blockHeight,
    txIndex: input.txIndex,
    inputs: input.inputs,
    outputs: input.outputs.map((output) => ({
      ...output,
      valueSats: output.valueSats.toString()
    })),
    events: input.events.map((event) => ({
      ...event,
      payload: serializeProvenancePayload(event.payload)
    })),
    invalidatedNames: [...input.invalidatedNames]
  };
}

function serializeProvenancePayload(
  payload:
    | CommitEventPayload
    | RevealEventPayload
    | TransferEventPayload
    | BatchAnchorEventPayload
    | BatchRevealEventPayload
    | RevealProofChunkEventPayload
): TransactionProvenanceEventPayloadSnapshot {
  if ("anchorTxid" in payload) {
    return {
      ...payload,
      nonce: payload.nonce.toString()
    };
  }

  if ("commitTxid" in payload) {
    return {
      ...payload,
      nonce: payload.nonce.toString()
    };
  }

  return payload;
}
