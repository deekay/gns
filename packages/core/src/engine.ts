import {
  type BitcoinTransactionInBlock,
  type BitcoinTransactionInput,
  type BitcoinTransactionOutput,
  getOpReturnPayloads
} from "@gns/bitcoin";
import {
  type BatchAnchorEventPayload,
  type BatchRevealEventPayload,
  GnsEventType,
  computeBatchCommitLeafHash,
  computeCommitHash,
  decodeMerkleProof,
  decodeGnsPayload,
  getEventTypeName,
  type CommitEventPayload,
  type RevealEventPayload,
  type RevealProofChunkEventPayload,
  type TransferEventPayload,
  getEpochIndex,
  type MerkleProofStep,
  verifyMerkleProof,
  verifyTransferAuthorization
} from "@gns/protocol";

import { createClaimState, getClaimedNameStatus } from "./state.js";

export interface PendingCommitRecord {
  readonly txid: string;
  readonly bondVout: number;
  readonly bondValueSats: bigint | null;
  readonly ownerPubkey: string;
  readonly commitHash: string;
  readonly blockHeight: number;
  readonly txIndex: number;
  readonly revealDeadlineHeight: number;
}

export interface PendingBatchAnchorRecord {
  readonly txid: string;
  readonly merkleRoot: string;
  readonly leafCount: number;
  readonly bondOutputs: ReadonlyArray<{
    readonly vout: number;
    readonly bondValueSats: bigint | null;
  }>;
  readonly revealedBondVouts: readonly number[];
  readonly blockHeight: number;
  readonly txIndex: number;
  readonly revealDeadlineHeight: number;
}

export interface NameRecord {
  readonly name: string;
  readonly status: "pending" | "immature" | "mature" | "invalid";
  readonly currentOwnerPubkey: string;
  readonly claimCommitTxid: string;
  readonly claimRevealTxid: string;
  readonly claimHeight: number;
  readonly maturityHeight: number;
  readonly requiredBondSats: bigint;
  readonly currentBondTxid: string;
  readonly currentBondVout: number;
  readonly currentBondValueSats: bigint;
  readonly lastStateTxid: string;
  readonly lastStateHeight: number;
  readonly winningCommitBlockHeight: number;
  readonly winningCommitTxIndex: number;
}

export interface ParsedGnsEvent {
  readonly txid: string;
  readonly blockHeight: number;
  readonly txIndex: number;
  readonly vout: number;
  readonly inputs: readonly BitcoinTransactionInput[];
  readonly outputs: readonly BitcoinTransactionOutput[];
  readonly type: GnsEventType;
  readonly payload:
    | CommitEventPayload
    | RevealEventPayload
    | TransferEventPayload
    | BatchAnchorEventPayload
    | BatchRevealEventPayload
    | RevealProofChunkEventPayload;
}

export interface ProvenanceEventRecord {
  vout: number;
  type: GnsEventType;
  typeName:
    | "COMMIT"
    | "REVEAL"
    | "TRANSFER"
    | "BATCH_ANCHOR"
    | "BATCH_REVEAL"
    | "REVEAL_PROOF_CHUNK";
  payload:
    | CommitEventPayload
    | RevealEventPayload
    | TransferEventPayload
    | BatchAnchorEventPayload
    | BatchRevealEventPayload
    | RevealProofChunkEventPayload;
  validationStatus: "applied" | "ignored";
  reason: string;
  affectedName: string | null;
}

export interface TransactionProvenanceRecord {
  readonly txid: string;
  readonly blockHeight: number;
  readonly txIndex: number;
  readonly inputs: readonly BitcoinTransactionInput[];
  readonly outputs: readonly BitcoinTransactionOutput[];
  readonly events: readonly ProvenanceEventRecord[];
  readonly invalidatedNames: readonly string[];
}

export interface GnsState {
  readonly pendingCommits: Map<string, PendingCommitRecord>;
  readonly pendingBatchAnchors: Map<string, PendingBatchAnchorRecord>;
  readonly names: Map<string, NameRecord>;
}

export function createEmptyState(): GnsState {
  return {
    pendingCommits: new Map(),
    pendingBatchAnchors: new Map(),
    names: new Map()
  };
}

export function extractGnsEvents(transaction: BitcoinTransactionInBlock): ParsedGnsEvent[] {
  return getOpReturnPayloads(transaction.tx).flatMap(({ vout, payload }) => {
    try {
      const decoded = decodeGnsPayload(payload);

      return [
        {
          txid: transaction.tx.txid,
          blockHeight: transaction.blockHeight,
          txIndex: transaction.txIndex,
          vout,
          inputs: transaction.tx.inputs,
          outputs: transaction.tx.outputs,
          type: decoded.type,
          payload: decoded.payload
        }
      ];
    } catch {
      return [];
    }
  });
}

export function applyBlockTransactions(
  state: GnsState,
  transactions: readonly BitcoinTransactionInBlock[],
  launchHeight: number
): GnsState {
  applyBlockTransactionsWithProvenance(state, transactions, launchHeight);
  return state;
}

export function applyBlockTransactionsWithProvenance(
  state: GnsState,
  transactions: readonly BitcoinTransactionInBlock[],
  launchHeight: number
): TransactionProvenanceRecord[] {
  let currentBlockHeight: number | null = null;
  let blockTransactions: BitcoinTransactionInBlock[] = [];
  const provenance: TransactionProvenanceRecord[] = [];

  for (const transaction of transactions) {
    if (currentBlockHeight !== null && transaction.blockHeight !== currentBlockHeight) {
      provenance.push(...applySingleBlockTransactions(state, blockTransactions, launchHeight));
      blockTransactions = [];
    }

    currentBlockHeight = transaction.blockHeight;
    blockTransactions.push(transaction);
  }

  if (blockTransactions.length > 0) {
    provenance.push(...applySingleBlockTransactions(state, blockTransactions, launchHeight));
  }

  return provenance;
}

export function refreshDerivedState(state: GnsState, currentHeight: number): GnsState {
  for (const [name, record] of state.names.entries()) {
    const continuityIntact = record.status !== "invalid";

    state.names.set(name, {
      ...record,
      status: getClaimedNameStatus({
        isRevealConfirmed: true,
        currentHeight,
        maturityHeight: record.maturityHeight,
        continuityIntact
      })
    });
  }

  pruneExpiredPendingCommits(state, currentHeight);

  return state;
}

interface EventApplicationResult {
  readonly validationStatus: "applied" | "ignored";
  readonly reason: string;
  readonly affectedName: string | null;
}

interface DeferredRevealApplicationResult {
  readonly deferred: true;
  readonly affectedName: string;
}

type RevealApplicationResult = EventApplicationResult | DeferredRevealApplicationResult;

function applyEvent(
  state: GnsState,
  event: ParsedGnsEvent,
  launchHeight: number
): EventApplicationResult {
  switch (event.type) {
    case GnsEventType.Commit:
      return applyCommit(state, event);
    case GnsEventType.Reveal:
      return normalizeRevealOutcome(applyReveal(state, event, launchHeight), event);
    case GnsEventType.Transfer:
      return applyTransfer(state, event);
    case GnsEventType.BatchAnchor:
      return applyBatchAnchor(state, event);
    case GnsEventType.BatchReveal:
      return normalizeBatchRevealOutcome(applyBatchReveal(state, event, launchHeight), event);
    case GnsEventType.RevealProofChunk:
      return {
        validationStatus: "ignored",
        reason: "proof_chunk_requires_batch_reveal_header",
        affectedName: null
      };
  }
}

function applySingleBlockTransactions(
  state: GnsState,
  transactions: readonly BitcoinTransactionInBlock[],
  launchHeight: number
): TransactionProvenanceRecord[] {
  if (transactions.length === 0) {
    return [];
  }

  const blockHeight = transactions[0]?.blockHeight;

  if (blockHeight === undefined) {
    return [];
  }

  pruneExpiredPendingCommits(state, blockHeight);
  const deferredReveals: Array<{
    readonly event: ParsedGnsEvent;
    readonly provenanceEvent: ProvenanceEventRecord;
    readonly kind: "legacy" | "batch";
  }> = [];
  const provenanceRecords = transactions.map(createTransactionProvenanceRecord);
  const provenanceByTxid = new Map(provenanceRecords.map((record) => [record.txid, record]));

  for (const transaction of transactions) {
    const txProvenance = provenanceByTxid.get(transaction.tx.txid);

    if (txProvenance === undefined) {
      throw new Error(`missing provenance record for transaction ${transaction.tx.txid}`);
    }

    const spentImmatureBonds = collectSpentImmatureBonds(state, transaction);

    for (const event of extractGnsEvents(transaction)) {
      if (event.type === GnsEventType.Reveal || event.type === GnsEventType.BatchReveal) {
        const result =
          event.type === GnsEventType.Reveal
            ? applyReveal(state, event, launchHeight)
            : applyBatchReveal(state, event, launchHeight);
        const provenanceEvent = createProvenanceEventRecord(
          event,
          "deferred" in result
            ? {
                validationStatus: "ignored",
                reason:
                  event.type === GnsEventType.Reveal
                    ? "reveal_waiting_for_same_block_commit"
                    : "batch_reveal_waiting_for_same_block_anchor",
                affectedName: result.affectedName
              }
            : result
        );
        txProvenance.events.push(provenanceEvent);

        if ("deferred" in result) {
          deferredReveals.push({
            event,
            provenanceEvent,
            kind: event.type === GnsEventType.Reveal ? "legacy" : "batch"
          });
        }

        continue;
      }

      txProvenance.events.push(createProvenanceEventRecord(event, applyEvent(state, event, launchHeight)));
    }

    txProvenance.invalidatedNames.push(
      ...invalidateBrokenBondContinuity(state, transaction, spentImmatureBonds)
    );
  }

  for (const deferredReveal of deferredReveals) {
    const result =
      deferredReveal.kind === "legacy"
        ? applyReveal(state, deferredReveal.event, launchHeight)
        : applyBatchReveal(state, deferredReveal.event, launchHeight);
    applyProvenanceOutcome(
      deferredReveal.provenanceEvent,
      "deferred" in result
        ? {
            validationStatus: "ignored",
            reason:
              deferredReveal.kind === "legacy"
                ? "reveal_missing_commit"
                : "batch_reveal_missing_anchor",
            affectedName: result.affectedName
          }
        : result
    );
  }

  return provenanceRecords.filter(
    (record) => record.events.length > 0 || record.invalidatedNames.length > 0
  );
}

function applyCommit(state: GnsState, event: ParsedGnsEvent): EventApplicationResult {
  const payload = event.payload as CommitEventPayload;
  const bondOutput = event.outputs[payload.bondVout];

  state.pendingCommits.set(event.txid, {
    txid: event.txid,
    bondVout: payload.bondVout,
    bondValueSats: bondOutput?.scriptType === "op_return" || bondOutput === undefined ? null : bondOutput.valueSats,
    ownerPubkey: payload.ownerPubkey,
    commitHash: payload.commitHash,
    blockHeight: event.blockHeight,
    txIndex: event.txIndex,
    revealDeadlineHeight: event.blockHeight + 6
  });

  return {
    validationStatus: "applied",
    reason: "commit_registered",
    affectedName: null
  };
}

function applyBatchAnchor(state: GnsState, event: ParsedGnsEvent): EventApplicationResult {
  const payload = event.payload as BatchAnchorEventPayload;
  const bondOutputs = event.outputs.slice(0, payload.leafCount + 1).map((output, index) => ({
    vout: index,
    bondValueSats:
      index === 0 || output?.scriptType === "op_return" || output === undefined
        ? null
        : output.valueSats
  }));

  state.pendingBatchAnchors.set(event.txid, {
    txid: event.txid,
    merkleRoot: payload.merkleRoot,
    leafCount: payload.leafCount,
    bondOutputs,
    revealedBondVouts: [],
    blockHeight: event.blockHeight,
    txIndex: event.txIndex,
    revealDeadlineHeight: event.blockHeight + 6
  });

  return {
    validationStatus: "applied",
    reason: "batch_anchor_registered",
    affectedName: null
  };
}

function applyReveal(
  state: GnsState,
  event: ParsedGnsEvent,
  launchHeight: number
): RevealApplicationResult {
  const payload = event.payload as RevealEventPayload;
  const pending = state.pendingCommits.get(payload.commitTxid);

  if (pending === undefined) {
    return {
      deferred: true,
      affectedName: payload.name
    };
  }

  if (event.blockHeight > pending.revealDeadlineHeight) {
    state.pendingCommits.delete(payload.commitTxid);
    return {
      validationStatus: "ignored",
      reason: "reveal_deadline_missed",
      affectedName: payload.name
    };
  }

  const expectedCommitHash = computeCommitHash({
    name: payload.name,
    nonce: payload.nonce,
    ownerPubkey: pending.ownerPubkey
  });

  if (expectedCommitHash !== pending.commitHash) {
    state.pendingCommits.delete(payload.commitTxid);
    return {
      validationStatus: "ignored",
      reason: "reveal_commit_hash_mismatch",
      affectedName: payload.name
    };
  }

  const existing = state.names.get(payload.name);
  if (existing !== undefined && compareCommitOrder(existing, pending) <= 0) {
    state.pendingCommits.delete(payload.commitTxid);
    return {
      validationStatus: "ignored",
      reason: "reveal_lost_to_earlier_commit",
      affectedName: payload.name
    };
  }

  const claim = createClaimState({
    name: payload.name,
    claimHeight: pending.blockHeight,
    epochIndex: getEpochIndex(pending.blockHeight, launchHeight)
  });

  if (pending.bondValueSats === null || pending.bondValueSats < claim.requiredBondSats) {
    state.pendingCommits.delete(payload.commitTxid);
    return {
      validationStatus: "ignored",
      reason: "reveal_insufficient_bond",
      affectedName: payload.name
    };
  }

  state.names.set(payload.name, {
    name: claim.name,
    status: getClaimedNameStatus({
      isRevealConfirmed: true,
      currentHeight: event.blockHeight,
      maturityHeight: claim.maturityHeight,
      continuityIntact: true
    }),
    currentOwnerPubkey: pending.ownerPubkey,
    claimCommitTxid: pending.txid,
    claimRevealTxid: event.txid,
    claimHeight: claim.claimHeight,
    maturityHeight: claim.maturityHeight,
    requiredBondSats: claim.requiredBondSats,
    currentBondTxid: pending.txid,
    currentBondVout: pending.bondVout,
    currentBondValueSats: pending.bondValueSats,
    lastStateTxid: event.txid,
    lastStateHeight: event.blockHeight,
    winningCommitBlockHeight: pending.blockHeight,
    winningCommitTxIndex: pending.txIndex
  });

  state.pendingCommits.delete(payload.commitTxid);
  return {
    validationStatus: "applied",
    reason: "reveal_applied",
    affectedName: payload.name
  };
}

function applyBatchReveal(
  state: GnsState,
  event: ParsedGnsEvent,
  launchHeight: number
): RevealApplicationResult {
  const payload = event.payload as BatchRevealEventPayload;
  const pendingAnchor = state.pendingBatchAnchors.get(payload.anchorTxid);

  if (pendingAnchor === undefined) {
    return {
      deferred: true,
      affectedName: payload.name
    };
  }

  if (event.blockHeight > pendingAnchor.revealDeadlineHeight) {
    state.pendingBatchAnchors.delete(payload.anchorTxid);
    return {
      validationStatus: "ignored",
      reason: "batch_reveal_deadline_missed",
      affectedName: payload.name
    };
  }

  if (payload.bondVout <= 0 || payload.bondVout > pendingAnchor.leafCount) {
    return {
      validationStatus: "ignored",
      reason: "batch_reveal_invalid_bond_vout",
      affectedName: payload.name
    };
  }

  if (pendingAnchor.revealedBondVouts.includes(payload.bondVout)) {
    return {
      validationStatus: "ignored",
      reason: "batch_reveal_bond_already_revealed",
      affectedName: payload.name
    };
  }

  let proof: MerkleProofStep[];

  try {
    proof = collectBatchRevealProof(event.outputs, payload);
  } catch {
    return {
      validationStatus: "ignored",
      reason: "batch_reveal_invalid_proof_chunks",
      affectedName: payload.name
    };
  }

  const commitHash = computeCommitHash({
    name: payload.name,
    nonce: payload.nonce,
    ownerPubkey: payload.ownerPubkey
  });
  const leafHash = computeBatchCommitLeafHash({
    bondVout: payload.bondVout,
    ownerPubkey: payload.ownerPubkey,
    commitHash
  });

  if (!verifyMerkleProof({ leafHash, proof, expectedRoot: pendingAnchor.merkleRoot })) {
    return {
      validationStatus: "ignored",
      reason: "batch_reveal_invalid_merkle_proof",
      affectedName: payload.name
    };
  }

  const existing = state.names.get(payload.name);
  const pending = resolveBatchPendingCommit(pendingAnchor, payload.bondVout, payload.ownerPubkey, commitHash);

  if (existing !== undefined && compareCommitOrder(existing, pending) <= 0) {
    return {
      validationStatus: "ignored",
      reason: "batch_reveal_lost_to_earlier_commit",
      affectedName: payload.name
    };
  }

  const claim = createClaimState({
    name: payload.name,
    claimHeight: pending.blockHeight,
    epochIndex: getEpochIndex(pending.blockHeight, launchHeight)
  });

  if (pending.bondValueSats === null || pending.bondValueSats < claim.requiredBondSats) {
    return {
      validationStatus: "ignored",
      reason: "batch_reveal_insufficient_bond",
      affectedName: payload.name
    };
  }

  state.names.set(payload.name, {
    name: claim.name,
    status: getClaimedNameStatus({
      isRevealConfirmed: true,
      currentHeight: event.blockHeight,
      maturityHeight: claim.maturityHeight,
      continuityIntact: true
    }),
    currentOwnerPubkey: payload.ownerPubkey,
    claimCommitTxid: pending.txid,
    claimRevealTxid: event.txid,
    claimHeight: claim.claimHeight,
    maturityHeight: claim.maturityHeight,
    requiredBondSats: claim.requiredBondSats,
    currentBondTxid: pending.txid,
    currentBondVout: pending.bondVout,
    currentBondValueSats: pending.bondValueSats,
    lastStateTxid: event.txid,
    lastStateHeight: event.blockHeight,
    winningCommitBlockHeight: pending.blockHeight,
    winningCommitTxIndex: pending.txIndex
  });

  const nextRevealedBondVouts = [...pendingAnchor.revealedBondVouts, payload.bondVout].sort(
    (left, right) => left - right
  );

  if (nextRevealedBondVouts.length >= pendingAnchor.leafCount) {
    state.pendingBatchAnchors.delete(payload.anchorTxid);
  } else {
    state.pendingBatchAnchors.set(payload.anchorTxid, {
      ...pendingAnchor,
      revealedBondVouts: nextRevealedBondVouts
    });
  }

  return {
    validationStatus: "applied",
    reason: "batch_reveal_applied",
    affectedName: payload.name
  };
}

function pruneExpiredPendingCommits(state: GnsState, currentHeight: number): void {
  for (const [txid, pending] of state.pendingCommits.entries()) {
    if (pending.revealDeadlineHeight < currentHeight) {
      state.pendingCommits.delete(txid);
    }
  }

  for (const [txid, pending] of state.pendingBatchAnchors.entries()) {
    if (pending.revealDeadlineHeight < currentHeight) {
      state.pendingBatchAnchors.delete(txid);
    }
  }
}

function applyTransfer(state: GnsState, event: ParsedGnsEvent): EventApplicationResult {
  const payload = event.payload as TransferEventPayload;
  const record = findNameRecordByLastStateTxid(state, payload.prevStateTxid);

  if (record === null || record.status === "invalid") {
    return {
      validationStatus: "ignored",
      reason: "transfer_name_not_found_or_invalid",
      affectedName: null
    };
  }

  if (
    !verifyTransferAuthorization({
      prevStateTxid: payload.prevStateTxid,
      newOwnerPubkey: payload.newOwnerPubkey,
      flags: payload.flags,
      successorBondVout: payload.successorBondVout,
      ownerPubkey: record.currentOwnerPubkey,
      signature: payload.signature
    })
  ) {
    return {
      validationStatus: "ignored",
      reason: "transfer_invalid_signature",
      affectedName: record.name
    };
  }

  const requiresBondContinuity = event.blockHeight < record.maturityHeight;

  if (requiresBondContinuity) {
    if (!spendsOutpoint(event.inputs, record.currentBondTxid, record.currentBondVout)) {
      return {
        validationStatus: "ignored",
        reason: "transfer_missing_bond_spend",
        affectedName: record.name
      };
    }

    const successorBondOutput = event.outputs[payload.successorBondVout];
    if (
      successorBondOutput === undefined ||
      successorBondOutput.scriptType !== "payment" ||
      successorBondOutput.valueSats < record.requiredBondSats
    ) {
      return {
        validationStatus: "ignored",
        reason: "transfer_invalid_successor_bond",
        affectedName: record.name
      };
    }

    state.names.set(record.name, {
      ...record,
      status: getClaimedNameStatus({
        isRevealConfirmed: true,
        currentHeight: event.blockHeight,
        maturityHeight: record.maturityHeight,
        continuityIntact: true
      }),
      currentOwnerPubkey: payload.newOwnerPubkey,
      currentBondTxid: event.txid,
      currentBondVout: payload.successorBondVout,
      currentBondValueSats: successorBondOutput.valueSats,
      lastStateTxid: event.txid,
      lastStateHeight: event.blockHeight
    });
    return {
      validationStatus: "applied",
      reason: "transfer_applied_immature",
      affectedName: record.name
    };
  }

  state.names.set(record.name, {
    ...record,
    status: getClaimedNameStatus({
      isRevealConfirmed: true,
      currentHeight: event.blockHeight,
      maturityHeight: record.maturityHeight,
      continuityIntact: true
    }),
    currentOwnerPubkey: payload.newOwnerPubkey,
    lastStateTxid: event.txid,
    lastStateHeight: event.blockHeight
  });

  return {
    validationStatus: "applied",
    reason: "transfer_applied_mature",
    affectedName: record.name
  };
}

function collectSpentImmatureBonds(
  state: GnsState,
  transaction: BitcoinTransactionInBlock
): NameRecord[] {
  return [...state.names.values()].filter(
    (record) =>
      record.status !== "invalid" &&
      transaction.blockHeight < record.maturityHeight &&
      spendsOutpoint(transaction.tx.inputs, record.currentBondTxid, record.currentBondVout)
  );
}

function invalidateBrokenBondContinuity(
  state: GnsState,
  transaction: BitcoinTransactionInBlock,
  spentRecords: readonly NameRecord[]
): string[] {
  const invalidatedNames: string[] = [];

  for (const spentRecord of spentRecords) {
    const currentRecord = state.names.get(spentRecord.name);

    if (currentRecord === undefined || transaction.blockHeight >= spentRecord.maturityHeight) {
      continue;
    }

    if (currentRecord.currentBondTxid === transaction.tx.txid) {
      const successorOutput = transaction.tx.outputs[currentRecord.currentBondVout];

      if (
        successorOutput !== undefined &&
        successorOutput.scriptType === "payment" &&
        successorOutput.valueSats >= currentRecord.requiredBondSats
      ) {
        continue;
      }
    }

    state.names.set(spentRecord.name, {
      ...currentRecord,
      status: "invalid"
    });
    invalidatedNames.push(spentRecord.name);
  }

  return invalidatedNames;
}

function findNameRecordByLastStateTxid(state: GnsState, txid: string): NameRecord | null {
  for (const record of state.names.values()) {
    if (record.lastStateTxid === txid) {
      return record;
    }
  }

  return null;
}

function spendsOutpoint(
  inputs: readonly BitcoinTransactionInput[],
  txid: string,
  vout: number
): boolean {
  return inputs.some((input) => input.txid === txid && input.vout === vout);
}

function compareCommitOrder(existing: NameRecord, candidate: PendingCommitRecord): number {
  if (existing.winningCommitBlockHeight !== candidate.blockHeight) {
    return existing.winningCommitBlockHeight - candidate.blockHeight;
  }

  return existing.winningCommitTxIndex - candidate.txIndex;
}

function normalizeRevealOutcome(
  outcome: RevealApplicationResult,
  event: ParsedGnsEvent
): EventApplicationResult {
  if ("deferred" in outcome) {
    return {
      validationStatus: "ignored",
      reason: "reveal_missing_commit",
      affectedName: outcome.affectedName
    };
  }

  return outcome;
}

function normalizeBatchRevealOutcome(
  outcome: RevealApplicationResult,
  event: ParsedGnsEvent
): EventApplicationResult {
  if ("deferred" in outcome) {
    return {
      validationStatus: "ignored",
      reason: "batch_reveal_missing_anchor",
      affectedName: outcome.affectedName
    };
  }

  return outcome;
}

function resolveBatchPendingCommit(
  anchor: PendingBatchAnchorRecord,
  bondVout: number,
  ownerPubkey: string,
  commitHash: string
): PendingCommitRecord {
  const bondOutput = anchor.bondOutputs.find((candidate) => candidate.vout === bondVout);

  return {
    txid: anchor.txid,
    bondVout,
    bondValueSats: bondOutput?.bondValueSats ?? null,
    ownerPubkey,
    commitHash,
    blockHeight: anchor.blockHeight,
    txIndex: anchor.txIndex,
    revealDeadlineHeight: anchor.revealDeadlineHeight
  };
}

function collectBatchRevealProof(
  outputs: readonly BitcoinTransactionOutput[],
  payload: BatchRevealEventPayload
): MerkleProofStep[] {
  const chunks: Array<{ chunkIndex: number; proofBytesHex: string }> = [];

  for (const output of outputs) {
    if (output.scriptType !== "op_return" || output.dataHex === undefined) {
      continue;
    }

    try {
      const decoded = decodeGnsPayload(Buffer.from(output.dataHex, "hex"));
      if (decoded.type !== GnsEventType.RevealProofChunk) {
        continue;
      }

      chunks.push(decoded.payload);
    } catch {
      continue;
    }
  }

  if (chunks.length !== payload.proofChunkCount) {
    throw new Error("batch reveal proof chunk count does not match payload");
  }

  const ordered = [...chunks].sort((left, right) => left.chunkIndex - right.chunkIndex);
  let expectedChunkIndex = 0;
  let proofHex = "";

  for (const chunk of ordered) {
    if (chunk.chunkIndex !== expectedChunkIndex) {
      throw new Error("batch reveal proof chunks must be contiguous from chunkIndex 0");
    }

    proofHex += chunk.proofBytesHex;
    expectedChunkIndex += 1;
  }

  if (proofHex.length / 2 !== payload.proofBytesLength) {
    throw new Error("batch reveal proof byte length does not match payload");
  }

  return decodeMerkleProof(Buffer.from(proofHex, "hex"));
}

function createTransactionProvenanceRecord(
  transaction: BitcoinTransactionInBlock
): {
  txid: string;
  blockHeight: number;
  txIndex: number;
  inputs: readonly BitcoinTransactionInput[];
  outputs: readonly BitcoinTransactionOutput[];
  events: ProvenanceEventRecord[];
  invalidatedNames: string[];
} {
  return {
    txid: transaction.tx.txid,
    blockHeight: transaction.blockHeight,
    txIndex: transaction.txIndex,
    inputs: transaction.tx.inputs,
    outputs: transaction.tx.outputs,
    events: [],
    invalidatedNames: []
  };
}

function createProvenanceEventRecord(
  event: ParsedGnsEvent,
  outcome: EventApplicationResult
): ProvenanceEventRecord {
  return {
    vout: event.vout,
    type: event.type,
    typeName: getEventTypeName(event.type),
    payload: event.payload,
    validationStatus: outcome.validationStatus,
    reason: outcome.reason,
    affectedName: outcome.affectedName
  };
}

function applyProvenanceOutcome(
  target: ProvenanceEventRecord,
  outcome: EventApplicationResult
): void {
  target.validationStatus = outcome.validationStatus;
  target.reason = outcome.reason;
  target.affectedName = outcome.affectedName;
}
