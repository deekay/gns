import {
  type BitcoinBlock,
  type BitcoinTransactionInBlock,
  type BitcoinTransactionInput,
  type BitcoinTransactionOutput
} from "@gns/bitcoin";
import {
  type AuctionBidEventPayload,
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
import { getClaimedNameStatus } from "./state.js";
import {
  deriveExperimentalReservedAuctionStates,
  type ExperimentalSpentOutpointObservation,
  serializeExperimentalReservedAuctionState,
  type ExperimentalReservedAuctionBidObservation,
  type ExperimentalReservedAuctionCatalogEntry,
  type SerializedExperimentalReservedAuctionState
} from "./experimental-auction.js";
import { createDefaultReservedAuctionPolicy, type ReservedAuctionPolicy } from "./auction-policy.js";

export interface IndexerStats {
  readonly currentHeight: number | null;
  readonly currentBlockHash: string | null;
  readonly processedBlocks: number;
  readonly trackedNames: number;
  readonly pendingCommits: number;
}

export interface ExperimentalAuctionBidPayloadSnapshot {
  readonly flags: number;
  readonly bondVout: number;
  readonly reservedLockBlocks: number;
  readonly bidAmountSats: string;
  readonly ownerPubkey: string;
  readonly auctionLotCommitment: string;
  readonly auctionCommitment: string;
  readonly bidderCommitment: string;
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
  readonly spentOutpoints?: readonly ExperimentalSpentOutpointObservation[];
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
  | RevealProofChunkEventPayload
  | ExperimentalAuctionBidPayloadSnapshot;

export interface TransactionProvenanceEventSnapshot {
  readonly vout: number;
  readonly type: GnsEventType;
  readonly typeName:
    | "COMMIT"
    | "REVEAL"
    | "TRANSFER"
    | "BATCH_ANCHOR"
    | "BATCH_REVEAL"
    | "REVEAL_PROOF_CHUNK"
    | "AUCTION_BID";
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
  private readonly experimentalReservedAuctionCatalog: readonly ExperimentalReservedAuctionCatalogEntry[];
  private readonly experimentalReservedAuctionPolicy: ReservedAuctionPolicy;
  private readonly state: GnsState;
  private readonly spentOutpoints: Map<string, ExperimentalSpentOutpointObservation>;
  private readonly transactionProvenance: Map<string, TransactionProvenanceSnapshot>;
  private recentCheckpoints: InMemoryGnsIndexerPersistedState[];
  private currentHeight: number | null;
  private currentBlockHash: string | null;
  private processedBlocks: number;

  public constructor(input: {
    launchHeight: number;
    recentCheckpointLimit?: number;
    experimentalReservedAuctionCatalog?: readonly ExperimentalReservedAuctionCatalogEntry[];
    experimentalReservedAuctionPolicy?: ReservedAuctionPolicy;
  }) {
    this.launchHeight = input.launchHeight;
    this.recentCheckpointLimit = Math.max(1, input.recentCheckpointLimit ?? 100);
    this.experimentalReservedAuctionCatalog = [...(input.experimentalReservedAuctionCatalog ?? [])];
    this.experimentalReservedAuctionPolicy =
      input.experimentalReservedAuctionPolicy ?? createDefaultReservedAuctionPolicy();
    this.state = createEmptyState();
    this.spentOutpoints = new Map();
    this.transactionProvenance = new Map();
    this.recentCheckpoints = [];
    this.currentHeight = null;
    this.currentBlockHash = null;
    this.processedBlocks = 0;
  }

  public static fromSnapshot(
    snapshot: InMemoryGnsIndexerSnapshot,
    options?: {
      readonly experimentalReservedAuctionCatalog?: readonly ExperimentalReservedAuctionCatalogEntry[];
      readonly experimentalReservedAuctionPolicy?: ReservedAuctionPolicy;
    }
  ): InMemoryGnsIndexer {
    const indexer = new InMemoryGnsIndexer({
      launchHeight: snapshot.launchHeight,
      recentCheckpointLimit: Math.max(1, snapshot.recentCheckpoints?.length ?? 100),
      ...(options?.experimentalReservedAuctionCatalog === undefined
        ? {}
        : { experimentalReservedAuctionCatalog: options.experimentalReservedAuctionCatalog }),
      ...(options?.experimentalReservedAuctionPolicy === undefined
        ? {}
        : { experimentalReservedAuctionPolicy: options.experimentalReservedAuctionPolicy })
    });
    indexer.hydrate(snapshot);

    return indexer;
  }

  public ingestBlock(block: BitcoinBlock): void {
    this.reconcileExperimentalAuctionOwnedNames(block.height);
    const transactions = block.transactions.map<BitcoinTransactionInBlock>((tx, txIndex) => ({
      tx,
      blockHeight: block.height,
      txIndex
    }));

    const provenance = applyBlockTransactionsWithProvenance(this.state, transactions, this.launchHeight);
    refreshDerivedState(this.state, block.height);
    this.recordSpentOutpoints(block);

    for (const transaction of provenance) {
      this.transactionProvenance.set(transaction.txid, serializeTransactionProvenanceRecord(transaction));
    }

    this.currentHeight = block.height;
    this.currentBlockHash = block.hash;
    this.processedBlocks += 1;
    this.reconcileExperimentalAuctionOwnedNames(block.height);
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

  public listExperimentalAuctions(): SerializedExperimentalReservedAuctionState[] {
    const currentBlockHeight = this.currentHeight ?? (this.launchHeight - 1);

    return this.deriveExperimentalAuctionStatesAtHeight(currentBlockHeight)
      .map((state) => serializeExperimentalReservedAuctionState(state));
  }

  public getExperimentalAuction(auctionId: string): SerializedExperimentalReservedAuctionState | null {
    return this.listExperimentalAuctions().find((auction) => auction.auctionId === auctionId) ?? null;
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

        if (
          record?.acquisitionKind === "auction"
          && record.acquisitionAuctionLotCommitment
          && transaction.events.some(
            (event) =>
              event.typeName === "AUCTION_BID"
              && "auctionLotCommitment" in event.payload
              && event.payload.auctionLotCommitment === record.acquisitionAuctionLotCommitment
          )
        ) {
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
    this.spentOutpoints.clear();
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

    for (const spentOutpoint of snapshot.spentOutpoints ?? []) {
      this.spentOutpoints.set(
        `${spentOutpoint.outpointTxid}:${spentOutpoint.outpointVout}`,
        structuredClone(spentOutpoint)
      );
    }

    this.currentHeight = snapshot.currentHeight;
    this.currentBlockHash = snapshot.currentBlockHash;
    this.processedBlocks = snapshot.processedBlocks;
    this.recentCheckpoints = "recentCheckpoints" in snapshot
      ? (snapshot.recentCheckpoints ?? []).map((checkpoint) => structuredClone(checkpoint))
      : [];

    if (snapshot.currentHeight !== null) {
      refreshDerivedState(this.state, snapshot.currentHeight);
      this.reconcileExperimentalAuctionOwnedNames(snapshot.currentHeight);
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
      spentOutpoints: [...this.spentOutpoints.values()].sort((left, right) => {
        if (left.spentBlockHeight !== right.spentBlockHeight) {
          return left.spentBlockHeight - right.spentBlockHeight;
        }

        if (left.spentTxIndex !== right.spentTxIndex) {
          return left.spentTxIndex - right.spentTxIndex;
        }

        if (left.spendingInputIndex !== right.spendingInputIndex) {
          return left.spendingInputIndex - right.spendingInputIndex;
        }

        if (left.outpointTxid !== right.outpointTxid) {
          return left.outpointTxid.localeCompare(right.outpointTxid);
        }

        return left.outpointVout - right.outpointVout;
      }),
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

  private recordSpentOutpoints(block: BitcoinBlock): void {
    for (const [txIndex, transaction] of block.transactions.entries()) {
      for (const [inputIndex, input] of transaction.inputs.entries()) {
        if (input.coinbase || input.txid === null || input.vout === null) {
          continue;
        }

        const key = `${input.txid}:${input.vout}`;
        if (this.spentOutpoints.has(key)) {
          continue;
        }

        this.spentOutpoints.set(key, {
          outpointTxid: input.txid,
          outpointVout: input.vout,
          spentTxid: transaction.txid,
          spentBlockHeight: block.height,
          spentTxIndex: txIndex,
          spendingInputIndex: inputIndex
        });
      }
    }
  }

  private listAppliedAuctionBidObservations(): ExperimentalReservedAuctionBidObservation[] {
    return [...this.transactionProvenance.values()]
      .flatMap((transaction) =>
        transaction.events
          .filter(
            (event): event is TransactionProvenanceSnapshot["events"][number] & {
              readonly typeName: "AUCTION_BID";
              readonly validationStatus: "applied";
              readonly payload: ExperimentalAuctionBidPayloadSnapshot;
            } => event.typeName === "AUCTION_BID" && event.validationStatus === "applied"
          )
          .map((event) => ({
            txid: transaction.txid,
            blockHeight: transaction.blockHeight,
            txIndex: transaction.txIndex,
            vout: event.vout,
            bondVout: event.payload.bondVout,
            bidderCommitment: event.payload.bidderCommitment,
            ownerPubkey: event.payload.ownerPubkey,
            bidAmountSats: BigInt(event.payload.bidAmountSats),
            reservedLockBlocks: event.payload.reservedLockBlocks,
            auctionLotCommitment: event.payload.auctionLotCommitment,
            auctionCommitment: event.payload.auctionCommitment,
            spentOutpoints: transaction.inputs
              .filter(
                (input): input is typeof input & { readonly txid: string; readonly vout: number } =>
                  input.coinbase !== true && input.txid !== null && input.vout !== null
              )
              .map((input) => ({
                txid: input.txid,
                vout: input.vout
              }))
          }))
      )
      .sort((left, right) => {
        if (left.blockHeight !== right.blockHeight) {
          return left.blockHeight - right.blockHeight;
        }

        if (left.txIndex !== right.txIndex) {
          return left.txIndex - right.txIndex;
        }

        if (left.vout !== right.vout) {
          return left.vout - right.vout;
        }

        return left.txid.localeCompare(right.txid);
      });
  }

  private deriveExperimentalAuctionStatesAtHeight(currentBlockHeight: number) {
    return deriveExperimentalReservedAuctionStates({
      policy: this.experimentalReservedAuctionPolicy,
      currentBlockHeight,
      catalog: this.experimentalReservedAuctionCatalog,
      bidObservations: this.listAppliedAuctionBidObservations(),
      spentOutpoints: [...this.spentOutpoints.values()]
    });
  }

  private reconcileExperimentalAuctionOwnedNames(currentBlockHeight: number): void {
    for (const auctionState of this.deriveExperimentalAuctionStatesAtHeight(currentBlockHeight)) {
      if (
        auctionState.phase !== "settled"
        || auctionState.winnerBidTxid === null
        || auctionState.winnerOwnerPubkey === null
        || auctionState.winnerBidderCommitment === null
        || auctionState.winnerBondVout === null
        || auctionState.settlementHeight === null
        || auctionState.winnerBondReleaseBlock === null
        || auctionState.currentHighestBidSats === null
      ) {
        continue;
      }

      if (this.state.names.has(auctionState.normalizedName)) {
        continue;
      }

      const winningOutcome = [...auctionState.visibleBidOutcomes]
        .reverse()
        .find(
          (outcome) =>
            outcome.status === "accepted"
            && outcome.txid === auctionState.winnerBidTxid
            && outcome.bondVout === auctionState.winnerBondVout
        );

      if (!winningOutcome) {
        continue;
      }

      this.state.names.set(auctionState.normalizedName, {
        name: auctionState.normalizedName,
        status: getClaimedNameStatus({
          isRevealConfirmed: true,
          currentHeight: currentBlockHeight,
          maturityHeight: auctionState.winnerBondReleaseBlock,
          continuityIntact: true
        }),
        acquisitionKind: "auction",
        acquisitionAuctionId: auctionState.auctionId,
        acquisitionAuctionLotCommitment: auctionState.auctionLotCommitment,
        acquisitionAuctionBidTxid: auctionState.winnerBidTxid,
        acquisitionAuctionBidderCommitment: auctionState.winnerBidderCommitment,
        acquisitionBondReleaseHeight: auctionState.winnerBondReleaseBlock,
        currentOwnerPubkey: auctionState.winnerOwnerPubkey,
        claimCommitTxid: auctionState.winnerBidTxid,
        claimRevealTxid: auctionState.winnerBidTxid,
        claimHeight: auctionState.settlementHeight,
        maturityHeight: auctionState.winnerBondReleaseBlock,
        requiredBondSats: auctionState.currentHighestBidSats,
        currentBondTxid: auctionState.winnerBidTxid,
        currentBondVout: auctionState.winnerBondVout,
        currentBondValueSats: auctionState.currentHighestBidSats,
        lastStateTxid: auctionState.winnerBidTxid,
        lastStateHeight: auctionState.settlementHeight,
        winningCommitBlockHeight: winningOutcome.blockHeight,
        winningCommitTxIndex: winningOutcome.txIndex
      });
    }
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
    | AuctionBidEventPayload
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

  if ("auctionCommitment" in payload) {
    return {
      ...payload,
      bidAmountSats: payload.bidAmountSats.toString()
    };
  }

  return payload;
}
