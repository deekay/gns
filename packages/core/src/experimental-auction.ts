import { computeAuctionLotCommitment } from "@gns/protocol";

import {
  calculateReservedAuctionMinimumIncrementBidSats,
  getReservedAuctionOpeningRequirements,
  type ReservedAuctionClassId,
  type ReservedAuctionPolicy
} from "./auction-policy.js";

export type ExperimentalReservedAuctionBidRejectionReason =
  | "before_unlock"
  | "below_opening_minimum"
  | "auction_closed"
  | "below_minimum_increment"
  | "reserved_lock_mismatch";

export type ExperimentalReservedAuctionBidAcceptanceReason =
  | "opening_bid"
  | "higher_bid"
  | "higher_bid_soft_close_extended";

export type ExperimentalReservedAuctionBidOutcomeReason =
  | ExperimentalReservedAuctionBidAcceptanceReason
  | ExperimentalReservedAuctionBidRejectionReason;

export type ExperimentalReservedAuctionPhase =
  | "pending_unlock"
  | "awaiting_opening_bid"
  | "live_bidding"
  | "soft_close"
  | "settled";

export interface ExperimentalReservedAuctionCatalogEntryInput {
  readonly auctionId: string;
  readonly title: string;
  readonly description: string;
  readonly name: string;
  readonly reservedClassId: ReservedAuctionClassId;
  readonly unlockBlock: number;
}

export interface ExperimentalReservedAuctionCatalogEntry {
  readonly auctionId: string;
  readonly title: string;
  readonly description: string;
  readonly normalizedName: string;
  readonly reservedClassId: ReservedAuctionClassId;
  readonly classLabel: string;
  readonly unlockBlock: number;
  readonly openingMinimumBidSats: bigint;
  readonly reservedLockBlocks: number;
  readonly auctionLotCommitment: string;
}

export interface ExperimentalReservedAuctionBidObservation {
  readonly txid: string;
  readonly blockHeight: number;
  readonly txIndex: number;
  readonly vout: number;
  readonly bidderCommitment: string;
  readonly bidAmountSats: bigint;
  readonly reservedLockBlocks: number;
  readonly auctionLotCommitment: string;
  readonly auctionCommitment: string;
}

export interface ExperimentalReservedAuctionBidOutcome {
  readonly index: number;
  readonly txid: string;
  readonly blockHeight: number;
  readonly txIndex: number;
  readonly vout: number;
  readonly bidderCommitment: string;
  readonly amountSats: bigint;
  readonly status: "accepted" | "rejected";
  readonly reason: ExperimentalReservedAuctionBidOutcomeReason;
  readonly requiredMinimumBidSats: bigint;
  readonly auctionCloseBlockAfter: number | null;
  readonly highestBidSatsAfter: bigint | null;
}

export interface ExperimentalReservedAuctionState {
  readonly auctionId: string;
  readonly title: string;
  readonly description: string;
  readonly auctionLotCommitment: string;
  readonly currentBlockHeight: number;
  readonly phase: ExperimentalReservedAuctionPhase;
  readonly phaseLabel: string;
  readonly normalizedName: string;
  readonly reservedClassId: ReservedAuctionClassId;
  readonly classLabel: string;
  readonly unlockBlock: number;
  readonly openingMinimumBidSats: bigint;
  readonly reservedLockBlocks: number;
  readonly auctionStartBlock: number | null;
  readonly auctionCloseBlockAfter: number | null;
  readonly blocksUntilUnlock: number;
  readonly blocksUntilClose: number | null;
  readonly currentLeaderBidderCommitment: string | null;
  readonly currentHighestBidSats: bigint | null;
  readonly currentRequiredMinimumBidSats: bigint | null;
  readonly acceptedBidCount: number;
  readonly rejectedBidCount: number;
  readonly totalObservedBidCount: number;
  readonly visibleBidOutcomes: ReadonlyArray<ExperimentalReservedAuctionBidOutcome>;
}

export interface SerializedExperimentalReservedAuctionBidOutcome {
  readonly index: number;
  readonly txid: string;
  readonly blockHeight: number;
  readonly txIndex: number;
  readonly vout: number;
  readonly bidderCommitment: string;
  readonly amountSats: string;
  readonly status: "accepted" | "rejected";
  readonly reason: ExperimentalReservedAuctionBidOutcomeReason;
  readonly requiredMinimumBidSats: string;
  readonly auctionCloseBlockAfter: number | null;
  readonly highestBidSatsAfter: string | null;
}

export interface SerializedExperimentalReservedAuctionState {
  readonly auctionId: string;
  readonly title: string;
  readonly description: string;
  readonly auctionLotCommitment: string;
  readonly currentBlockHeight: number;
  readonly phase: ExperimentalReservedAuctionPhase;
  readonly phaseLabel: string;
  readonly normalizedName: string;
  readonly reservedClassId: ReservedAuctionClassId;
  readonly classLabel: string;
  readonly unlockBlock: number;
  readonly openingMinimumBidSats: string;
  readonly reservedLockBlocks: number;
  readonly auctionStartBlock: number | null;
  readonly auctionCloseBlockAfter: number | null;
  readonly blocksUntilUnlock: number;
  readonly blocksUntilClose: number | null;
  readonly currentLeaderBidderCommitment: string | null;
  readonly currentHighestBidSats: string | null;
  readonly currentRequiredMinimumBidSats: string | null;
  readonly acceptedBidCount: number;
  readonly rejectedBidCount: number;
  readonly totalObservedBidCount: number;
  readonly visibleBidOutcomes: ReadonlyArray<SerializedExperimentalReservedAuctionBidOutcome>;
}

export function createExperimentalReservedAuctionCatalogEntry(
  input: ExperimentalReservedAuctionCatalogEntryInput,
  policy: ReservedAuctionPolicy
): ExperimentalReservedAuctionCatalogEntry {
  const openingRequirements = getReservedAuctionOpeningRequirements({
    policy,
    name: input.name,
    reservedClassId: input.reservedClassId
  });

  return {
    auctionId: input.auctionId,
    title: input.title,
    description: input.description,
    normalizedName: openingRequirements.normalizedName,
    reservedClassId: input.reservedClassId,
    classLabel: openingRequirements.classLabel,
    unlockBlock: input.unlockBlock,
    openingMinimumBidSats: openingRequirements.openingMinimumBidSats,
    reservedLockBlocks: openingRequirements.reservedLockBlocks,
    auctionLotCommitment: computeAuctionLotCommitment({
      auctionId: input.auctionId,
      name: input.name,
      reservedClassId: input.reservedClassId,
      unlockBlock: input.unlockBlock
    })
  };
}

export function deriveExperimentalReservedAuctionStates(input: {
  readonly policy: ReservedAuctionPolicy;
  readonly currentBlockHeight: number;
  readonly catalog: readonly ExperimentalReservedAuctionCatalogEntry[];
  readonly bidObservations: readonly ExperimentalReservedAuctionBidObservation[];
}): ExperimentalReservedAuctionState[] {
  return input.catalog.map((entry) =>
    deriveExperimentalReservedAuctionState({
      policy: input.policy,
      currentBlockHeight: input.currentBlockHeight,
      catalogEntry: entry,
      bidObservations: input.bidObservations
    })
  );
}

export function deriveExperimentalReservedAuctionState(input: {
  readonly policy: ReservedAuctionPolicy;
  readonly currentBlockHeight: number;
  readonly catalogEntry: ExperimentalReservedAuctionCatalogEntry;
  readonly bidObservations: readonly ExperimentalReservedAuctionBidObservation[];
}): ExperimentalReservedAuctionState {
  const observations = input.bidObservations
    .filter((observation) => observation.auctionLotCommitment === input.catalogEntry.auctionLotCommitment)
    .sort(compareBidObservations);

  let auctionStartBlock: number | null = null;
  let finalAuctionCloseBlock: number | null = null;
  let currentLeader:
    | {
        readonly bidderCommitment: string;
        readonly amountSats: bigint;
      }
    | null = null;

  const visibleBidOutcomes = observations.map((observation, index) => {
    if (observation.reservedLockBlocks !== input.catalogEntry.reservedLockBlocks) {
      return {
        index,
        txid: observation.txid,
        blockHeight: observation.blockHeight,
        txIndex: observation.txIndex,
        vout: observation.vout,
        bidderCommitment: observation.bidderCommitment,
        amountSats: observation.bidAmountSats,
        status: "rejected" as const,
        reason: "reserved_lock_mismatch" as const,
        requiredMinimumBidSats:
          currentLeader?.amountSats ?? input.catalogEntry.openingMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: currentLeader?.amountSats ?? null
      };
    }

    if (observation.blockHeight < input.catalogEntry.unlockBlock) {
      return {
        index,
        txid: observation.txid,
        blockHeight: observation.blockHeight,
        txIndex: observation.txIndex,
        vout: observation.vout,
        bidderCommitment: observation.bidderCommitment,
        amountSats: observation.bidAmountSats,
        status: "rejected" as const,
        reason: "before_unlock" as const,
        requiredMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: currentLeader?.amountSats ?? null
      };
    }

    if (currentLeader === null) {
      if (observation.bidAmountSats < input.catalogEntry.openingMinimumBidSats) {
        return {
          index,
          txid: observation.txid,
          blockHeight: observation.blockHeight,
          txIndex: observation.txIndex,
          vout: observation.vout,
          bidderCommitment: observation.bidderCommitment,
          amountSats: observation.bidAmountSats,
          status: "rejected" as const,
          reason: "below_opening_minimum" as const,
          requiredMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
          auctionCloseBlockAfter: finalAuctionCloseBlock,
          highestBidSatsAfter: null
        };
      }

      auctionStartBlock = observation.blockHeight;
      finalAuctionCloseBlock = observation.blockHeight + input.policy.auction.baseWindowBlocks;
      currentLeader = {
        bidderCommitment: observation.bidderCommitment,
        amountSats: observation.bidAmountSats
      };

      return {
        index,
        txid: observation.txid,
        blockHeight: observation.blockHeight,
        txIndex: observation.txIndex,
        vout: observation.vout,
        bidderCommitment: observation.bidderCommitment,
        amountSats: observation.bidAmountSats,
        status: "accepted" as const,
        reason: "opening_bid" as const,
        requiredMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: currentLeader.amountSats
      };
    }

    const requiredMinimumBidSats = calculateReservedAuctionMinimumIncrementBidSats({
      currentBidSats: currentLeader.amountSats,
      policy: input.policy
    });

    if (finalAuctionCloseBlock !== null && observation.blockHeight > finalAuctionCloseBlock) {
      return {
        index,
        txid: observation.txid,
        blockHeight: observation.blockHeight,
        txIndex: observation.txIndex,
        vout: observation.vout,
        bidderCommitment: observation.bidderCommitment,
        amountSats: observation.bidAmountSats,
        status: "rejected" as const,
        reason: "auction_closed" as const,
        requiredMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: currentLeader.amountSats
      };
    }

    if (observation.bidAmountSats < requiredMinimumBidSats) {
      return {
        index,
        txid: observation.txid,
        blockHeight: observation.blockHeight,
        txIndex: observation.txIndex,
        vout: observation.vout,
        bidderCommitment: observation.bidderCommitment,
        amountSats: observation.bidAmountSats,
        status: "rejected" as const,
        reason: "below_minimum_increment" as const,
        requiredMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: currentLeader.amountSats
      };
    }

    const extendsSoftClose =
      finalAuctionCloseBlock !== null &&
      input.policy.auction.softCloseExtensionBlocks > 0 &&
      observation.blockHeight >= finalAuctionCloseBlock - input.policy.auction.softCloseExtensionBlocks;

    if (extendsSoftClose) {
      finalAuctionCloseBlock = Math.max(
        finalAuctionCloseBlock ?? 0,
        observation.blockHeight + input.policy.auction.softCloseExtensionBlocks
      );
    }

    currentLeader = {
      bidderCommitment: observation.bidderCommitment,
      amountSats: observation.bidAmountSats
    };

    return {
      index,
      txid: observation.txid,
      blockHeight: observation.blockHeight,
      txIndex: observation.txIndex,
      vout: observation.vout,
      bidderCommitment: observation.bidderCommitment,
      amountSats: observation.bidAmountSats,
      status: "accepted" as const,
      reason: extendsSoftClose ? "higher_bid_soft_close_extended" as const : "higher_bid" as const,
      requiredMinimumBidSats,
      auctionCloseBlockAfter: finalAuctionCloseBlock,
      highestBidSatsAfter: currentLeader.amountSats
    };
  });

  const phase = deriveExperimentalReservedAuctionPhase({
    currentBlockHeight: input.currentBlockHeight,
    unlockBlock: input.catalogEntry.unlockBlock,
    auctionCloseBlockAfter: finalAuctionCloseBlock,
    softCloseExtensionBlocks: input.policy.auction.softCloseExtensionBlocks,
    winnerPresent: currentLeader !== null
  });

  const auctionCloseBlockAfter =
    phase === "live_bidding" || phase === "soft_close" || phase === "settled"
      ? finalAuctionCloseBlock
      : null;
  const lastAcceptedOutcome = [...visibleBidOutcomes]
    .reverse()
    .find((outcome) => outcome.status === "accepted") ?? null;
  const currentLeaderBidderCommitment = lastAcceptedOutcome?.bidderCommitment ?? null;
  const currentHighestBidSats = lastAcceptedOutcome?.highestBidSatsAfter ?? null;
  const currentRequiredMinimumBidSats =
    phase === "settled"
      ? null
      : currentHighestBidSats === null
        ? input.catalogEntry.openingMinimumBidSats
        : calculateReservedAuctionMinimumIncrementBidSats({
            currentBidSats: currentHighestBidSats,
            policy: input.policy
          });

  return {
    auctionId: input.catalogEntry.auctionId,
    title: input.catalogEntry.title,
    description: input.catalogEntry.description,
    auctionLotCommitment: input.catalogEntry.auctionLotCommitment,
    currentBlockHeight: input.currentBlockHeight,
    phase,
    phaseLabel: formatExperimentalReservedAuctionPhaseLabel(phase),
    normalizedName: input.catalogEntry.normalizedName,
    reservedClassId: input.catalogEntry.reservedClassId,
    classLabel: input.catalogEntry.classLabel,
    unlockBlock: input.catalogEntry.unlockBlock,
    openingMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
    reservedLockBlocks: input.catalogEntry.reservedLockBlocks,
    auctionStartBlock,
    auctionCloseBlockAfter,
    blocksUntilUnlock: Math.max(0, input.catalogEntry.unlockBlock - input.currentBlockHeight),
    blocksUntilClose:
      auctionCloseBlockAfter === null ? null : Math.max(0, auctionCloseBlockAfter - input.currentBlockHeight),
    currentLeaderBidderCommitment,
    currentHighestBidSats,
    currentRequiredMinimumBidSats,
    acceptedBidCount: visibleBidOutcomes.filter((outcome) => outcome.status === "accepted").length,
    rejectedBidCount: visibleBidOutcomes.filter((outcome) => outcome.status === "rejected").length,
    totalObservedBidCount: visibleBidOutcomes.length,
    visibleBidOutcomes
  };
}

export function serializeExperimentalReservedAuctionState(
  state: ExperimentalReservedAuctionState
): SerializedExperimentalReservedAuctionState {
  return {
    auctionId: state.auctionId,
    title: state.title,
    description: state.description,
    auctionLotCommitment: state.auctionLotCommitment,
    currentBlockHeight: state.currentBlockHeight,
    phase: state.phase,
    phaseLabel: state.phaseLabel,
    normalizedName: state.normalizedName,
    reservedClassId: state.reservedClassId,
    classLabel: state.classLabel,
    unlockBlock: state.unlockBlock,
    openingMinimumBidSats: state.openingMinimumBidSats.toString(),
    reservedLockBlocks: state.reservedLockBlocks,
    auctionStartBlock: state.auctionStartBlock,
    auctionCloseBlockAfter: state.auctionCloseBlockAfter,
    blocksUntilUnlock: state.blocksUntilUnlock,
    blocksUntilClose: state.blocksUntilClose,
    currentLeaderBidderCommitment: state.currentLeaderBidderCommitment,
    currentHighestBidSats: state.currentHighestBidSats?.toString() ?? null,
    currentRequiredMinimumBidSats: state.currentRequiredMinimumBidSats?.toString() ?? null,
    acceptedBidCount: state.acceptedBidCount,
    rejectedBidCount: state.rejectedBidCount,
    totalObservedBidCount: state.totalObservedBidCount,
    visibleBidOutcomes: state.visibleBidOutcomes.map((outcome) => ({
      index: outcome.index,
      txid: outcome.txid,
      blockHeight: outcome.blockHeight,
      txIndex: outcome.txIndex,
      vout: outcome.vout,
      bidderCommitment: outcome.bidderCommitment,
      amountSats: outcome.amountSats.toString(),
      status: outcome.status,
      reason: outcome.reason,
      requiredMinimumBidSats: outcome.requiredMinimumBidSats.toString(),
      auctionCloseBlockAfter: outcome.auctionCloseBlockAfter,
      highestBidSatsAfter: outcome.highestBidSatsAfter?.toString() ?? null
    }))
  };
}

export function formatExperimentalReservedAuctionPhaseLabel(
  phase: ExperimentalReservedAuctionPhase
): string {
  switch (phase) {
    case "pending_unlock":
      return "Pending unlock";
    case "awaiting_opening_bid":
      return "Awaiting opening bid";
    case "live_bidding":
      return "Live bidding";
    case "soft_close":
      return "Soft close";
    case "settled":
      return "Settled";
  }
}

function deriveExperimentalReservedAuctionPhase(input: {
  readonly currentBlockHeight: number;
  readonly unlockBlock: number;
  readonly auctionCloseBlockAfter: number | null;
  readonly softCloseExtensionBlocks: number;
  readonly winnerPresent: boolean;
}): ExperimentalReservedAuctionPhase {
  if (input.currentBlockHeight < input.unlockBlock) {
    return "pending_unlock";
  }

  if (!input.winnerPresent) {
    return "awaiting_opening_bid";
  }

  if (input.auctionCloseBlockAfter === null) {
    return "live_bidding";
  }

  if (input.currentBlockHeight > input.auctionCloseBlockAfter) {
    return "settled";
  }

  const softCloseStartBlock =
    input.softCloseExtensionBlocks <= 0
      ? Number.MAX_SAFE_INTEGER
      : input.auctionCloseBlockAfter - input.softCloseExtensionBlocks;

  if (input.currentBlockHeight >= softCloseStartBlock) {
    return "soft_close";
  }

  return "live_bidding";
}

function compareBidObservations(
  left: ExperimentalReservedAuctionBidObservation,
  right: ExperimentalReservedAuctionBidObservation
): number {
  if (left.blockHeight !== right.blockHeight) {
    return left.blockHeight - right.blockHeight;
  }

  if (left.txIndex !== right.txIndex) {
    return left.txIndex - right.txIndex;
  }

  if (left.vout !== right.vout) {
    return left.vout - right.vout;
  }

  if (left.txid !== right.txid) {
    return left.txid.localeCompare(right.txid);
  }

  return left.bidderCommitment.localeCompare(right.bidderCommitment);
}
