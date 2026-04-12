import {
  computeAuctionBidStateCommitment,
  computeAuctionLotCommitment
} from "@gns/protocol";

import {
  calculateReservedAuctionMinimumIncrementBidSats,
  getReservedAuctionNoBidReleaseBlock,
  getReservedAuctionOpeningRequirements,
  isReservedAuctionSoftCloseWindow,
  type ReservedAuctionClassId,
  type ReservedAuctionPolicy
} from "./auction-policy.js";

export type ExperimentalReservedAuctionBidRejectionReason =
  | "before_unlock"
  | "released_to_ordinary_lane"
  | "below_opening_minimum"
  | "auction_closed"
  | "below_minimum_increment"
  | "reserved_lock_mismatch"
  | "stale_state_commitment"
  | "prior_bid_not_replaced";

export type ExperimentalReservedAuctionBidAcceptanceReason =
  | "opening_bid"
  | "higher_bid"
  | "higher_bid_soft_close_extended"
  | "replacement_bid"
  | "replacement_bid_soft_close_extended";

export type ExperimentalReservedAuctionBidOutcomeReason =
  | ExperimentalReservedAuctionBidAcceptanceReason
  | ExperimentalReservedAuctionBidRejectionReason;

export type ExperimentalReservedAuctionBidBondStatus =
  | "rejected_not_tracked"
  | "replaced_by_self_rebid"
  | "leading_locked"
  | "superseded_locked_until_settlement"
  | "losing_bid_releasable"
  | "winner_locked"
  | "winner_releasable";

export type ExperimentalReservedAuctionBidSpendStatus =
  | "not_applicable"
  | "unspent"
  | "replacement_spend"
  | "spent_after_allowed_release"
  | "spent_before_allowed_release";

export type ExperimentalReservedAuctionPhase =
  | "pending_unlock"
  | "awaiting_opening_bid"
  | "released_to_ordinary_lane"
  | "live_bidding"
  | "soft_close"
  | "settled";

type ExperimentalAuctionCommitmentPhase = Exclude<
  ExperimentalReservedAuctionPhase,
  "released_to_ordinary_lane"
>;

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
  readonly ordinaryMinimumBidSats: bigint;
  readonly openingMinimumBidSats: bigint;
  readonly reservedLockBlocks: number;
  readonly auctionLotCommitment: string;
}

export interface ExperimentalReservedAuctionBidObservation {
  readonly txid: string;
  readonly blockHeight: number;
  readonly txIndex: number;
  readonly vout: number;
  readonly bondVout: number;
  readonly bidderCommitment: string;
  readonly bidAmountSats: bigint;
  readonly reservedLockBlocks: number;
  readonly auctionLotCommitment: string;
  readonly auctionCommitment: string;
  readonly spentOutpoints: ReadonlyArray<{
    readonly txid: string;
    readonly vout: number;
  }>;
}

export interface ExperimentalSpentOutpointObservation {
  readonly outpointTxid: string;
  readonly outpointVout: number;
  readonly spentTxid: string;
  readonly spentBlockHeight: number;
  readonly spentTxIndex: number;
  readonly spendingInputIndex: number;
}

export interface ExperimentalReservedAuctionBidOutcome {
  readonly index: number;
  readonly txid: string;
  readonly blockHeight: number;
  readonly txIndex: number;
  readonly vout: number;
  readonly bondVout: number;
  readonly bidderCommitment: string;
  readonly amountSats: bigint;
  readonly status: "accepted" | "rejected";
  readonly reason: ExperimentalReservedAuctionBidOutcomeReason;
  readonly requiredMinimumBidSats: bigint;
  readonly auctionCloseBlockAfter: number | null;
  readonly highestBidSatsAfter: bigint | null;
  readonly stateCommitmentMatched: boolean;
  readonly bondStatus: ExperimentalReservedAuctionBidBondStatus;
  readonly bondReleaseBlock: number | null;
  readonly bondSpendStatus: ExperimentalReservedAuctionBidSpendStatus;
  readonly bondSpentTxid: string | null;
  readonly bondSpentBlockHeight: number | null;
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
  readonly ordinaryMinimumBidSats: bigint;
  readonly openingMinimumBidSats: bigint;
  readonly reservedLockBlocks: number;
  readonly noBidReleaseBlock: number | null;
  readonly auctionStartBlock: number | null;
  readonly auctionCloseBlockAfter: number | null;
  readonly blocksUntilUnlock: number;
  readonly blocksUntilNoBidRelease: number | null;
  readonly blocksUntilClose: number | null;
  readonly currentLeaderBidderCommitment: string | null;
  readonly currentHighestBidSats: bigint | null;
  readonly currentRequiredMinimumBidSats: bigint | null;
  readonly winnerBidTxid: string | null;
  readonly winnerBidderCommitment: string | null;
  readonly winnerBondReleaseBlock: number | null;
  readonly currentlyLockedAcceptedBidCount: number;
  readonly currentlyLockedAcceptedBidAmountSats: bigint;
  readonly releasableAcceptedBidCount: number;
  readonly releasableAcceptedBidAmountSats: bigint;
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
  readonly bondVout: number;
  readonly bidderCommitment: string;
  readonly amountSats: string;
  readonly status: "accepted" | "rejected";
  readonly reason: ExperimentalReservedAuctionBidOutcomeReason;
  readonly requiredMinimumBidSats: string;
  readonly auctionCloseBlockAfter: number | null;
  readonly highestBidSatsAfter: string | null;
  readonly stateCommitmentMatched: boolean;
  readonly bondStatus: ExperimentalReservedAuctionBidBondStatus;
  readonly bondReleaseBlock: number | null;
  readonly bondSpendStatus: ExperimentalReservedAuctionBidSpendStatus;
  readonly bondSpentTxid: string | null;
  readonly bondSpentBlockHeight: number | null;
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
  readonly ordinaryMinimumBidSats: string;
  readonly openingMinimumBidSats: string;
  readonly reservedLockBlocks: number;
  readonly noBidReleaseBlock: number | null;
  readonly auctionStartBlock: number | null;
  readonly auctionCloseBlockAfter: number | null;
  readonly blocksUntilUnlock: number;
  readonly blocksUntilNoBidRelease: number | null;
  readonly blocksUntilClose: number | null;
  readonly currentLeaderBidderCommitment: string | null;
  readonly currentHighestBidSats: string | null;
  readonly currentRequiredMinimumBidSats: string | null;
  readonly winnerBidTxid: string | null;
  readonly winnerBidderCommitment: string | null;
  readonly winnerBondReleaseBlock: number | null;
  readonly currentlyLockedAcceptedBidCount: number;
  readonly currentlyLockedAcceptedBidAmountSats: string;
  readonly releasableAcceptedBidCount: number;
  readonly releasableAcceptedBidAmountSats: string;
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
    ordinaryMinimumBidSats: openingRequirements.ordinaryMinimumBidSats,
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
  readonly spentOutpoints?: readonly ExperimentalSpentOutpointObservation[];
}): ExperimentalReservedAuctionState[] {
  return input.catalog.map((entry) =>
    deriveExperimentalReservedAuctionState({
      policy: input.policy,
      currentBlockHeight: input.currentBlockHeight,
      catalogEntry: entry,
      bidObservations: input.bidObservations,
      spentOutpoints: input.spentOutpoints ?? []
    })
  );
}

export function deriveExperimentalReservedAuctionState(input: {
  readonly policy: ReservedAuctionPolicy;
  readonly currentBlockHeight: number;
  readonly catalogEntry: ExperimentalReservedAuctionCatalogEntry;
  readonly bidObservations: readonly ExperimentalReservedAuctionBidObservation[];
  readonly spentOutpoints?: readonly ExperimentalSpentOutpointObservation[];
}): ExperimentalReservedAuctionState {
  const observations = input.bidObservations
    .filter((observation) => observation.auctionLotCommitment === input.catalogEntry.auctionLotCommitment)
    .sort(compareBidObservations);
  const noBidReleaseBlock =
    getReservedAuctionNoBidReleaseBlock({
      unlockBlock: input.catalogEntry.unlockBlock,
      policy: input.policy
    });
  const spentOutpointMap = new Map(
    (input.spentOutpoints ?? []).map((observation) => [toOutpointKey(observation.outpointTxid, observation.outpointVout), observation])
  );

  let auctionStartBlock: number | null = null;
  let finalAuctionCloseBlock: number | null = null;
  let currentStateObservedFromBlock = input.catalogEntry.unlockBlock;
  let currentLeader:
    | {
        readonly bidderCommitment: string;
        readonly amountSats: bigint;
        readonly txid: string;
        readonly blockHeight: number;
        readonly bondVout: number;
      }
    | null = null;

  const visibleBidOutcomes: ExperimentalReservedAuctionBidOutcome[] = [];
  const standingAcceptedOutcomeIndexByBidder = new Map<string, number>();

  for (const [index, observation] of observations.entries()) {
    const preBidState = createPreBidAuctionState({
      catalogEntry: input.catalogEntry,
      policy: input.policy,
      observationBlockHeight: observation.blockHeight,
      currentStateObservedFromBlock,
      finalAuctionCloseBlock,
      currentLeader,
      observedAuctionCommitment: observation.auctionCommitment
    });
    const standingOutcomeIndex = standingAcceptedOutcomeIndexByBidder.get(observation.bidderCommitment) ?? null;
    const standingOutcome =
      standingOutcomeIndex === null ? null : visibleBidOutcomes[standingOutcomeIndex] ?? null;

    if (observation.reservedLockBlocks !== input.catalogEntry.reservedLockBlocks) {
      visibleBidOutcomes.push({
        index,
        txid: observation.txid,
        blockHeight: observation.blockHeight,
        txIndex: observation.txIndex,
        vout: observation.vout,
        bondVout: observation.bondVout,
        bidderCommitment: observation.bidderCommitment,
        amountSats: observation.bidAmountSats,
        status: "rejected" as const,
        reason: "reserved_lock_mismatch" as const,
        requiredMinimumBidSats: preBidState.requiredMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: currentLeader?.amountSats ?? null,
        stateCommitmentMatched: false,
        bondStatus: "rejected_not_tracked" as const,
        bondReleaseBlock: null,
        bondSpendStatus: "not_applicable" as const,
        bondSpentTxid: null,
        bondSpentBlockHeight: null
      });
      continue;
    }

    if (observation.blockHeight < input.catalogEntry.unlockBlock) {
      visibleBidOutcomes.push({
        index,
        txid: observation.txid,
        blockHeight: observation.blockHeight,
        txIndex: observation.txIndex,
        vout: observation.vout,
        bondVout: observation.bondVout,
        bidderCommitment: observation.bidderCommitment,
        amountSats: observation.bidAmountSats,
        status: "rejected" as const,
        reason: "before_unlock" as const,
        requiredMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: currentLeader?.amountSats ?? null,
        stateCommitmentMatched: preBidState.stateCommitmentMatched,
        bondStatus: "rejected_not_tracked" as const,
        bondReleaseBlock: null,
        bondSpendStatus: "not_applicable" as const,
        bondSpentTxid: null,
        bondSpentBlockHeight: null
      });
      continue;
    }

    if (preBidState.phase === "released_to_ordinary_lane") {
      visibleBidOutcomes.push({
        index,
        txid: observation.txid,
        blockHeight: observation.blockHeight,
        txIndex: observation.txIndex,
        vout: observation.vout,
        bondVout: observation.bondVout,
        bidderCommitment: observation.bidderCommitment,
        amountSats: observation.bidAmountSats,
        status: "rejected" as const,
        reason: "released_to_ordinary_lane" as const,
        requiredMinimumBidSats: input.catalogEntry.ordinaryMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: currentLeader?.amountSats ?? null,
        stateCommitmentMatched: false,
        bondStatus: "rejected_not_tracked" as const,
        bondReleaseBlock: null,
        bondSpendStatus: "not_applicable" as const,
        bondSpentTxid: null,
        bondSpentBlockHeight: null
      });
      continue;
    }

    if (preBidState.phase === "settled") {
      visibleBidOutcomes.push({
        index,
        txid: observation.txid,
        blockHeight: observation.blockHeight,
        txIndex: observation.txIndex,
        vout: observation.vout,
        bondVout: observation.bondVout,
        bidderCommitment: observation.bidderCommitment,
        amountSats: observation.bidAmountSats,
        status: "rejected" as const,
        reason: "auction_closed" as const,
        requiredMinimumBidSats: preBidState.requiredMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: currentLeader?.amountSats ?? null,
        stateCommitmentMatched: preBidState.stateCommitmentMatched,
        bondStatus: "rejected_not_tracked" as const,
        bondReleaseBlock: null,
        bondSpendStatus: "not_applicable" as const,
        bondSpentTxid: null,
        bondSpentBlockHeight: null
      });
      continue;
    }

    if (!preBidState.stateCommitmentMatched) {
      visibleBidOutcomes.push({
        index,
        txid: observation.txid,
        blockHeight: observation.blockHeight,
        txIndex: observation.txIndex,
        vout: observation.vout,
        bondVout: observation.bondVout,
        bidderCommitment: observation.bidderCommitment,
        amountSats: observation.bidAmountSats,
        status: "rejected" as const,
        reason: "stale_state_commitment" as const,
        requiredMinimumBidSats: preBidState.requiredMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: currentLeader?.amountSats ?? null,
        stateCommitmentMatched: false,
        bondStatus: "rejected_not_tracked" as const,
        bondReleaseBlock: null,
        bondSpendStatus: "not_applicable" as const,
        bondSpentTxid: null,
        bondSpentBlockHeight: null
      });
      continue;
    }

    if (standingOutcome !== null && !didObservationSpendStandingBond(observation, standingOutcome)) {
      visibleBidOutcomes.push({
        index,
        txid: observation.txid,
        blockHeight: observation.blockHeight,
        txIndex: observation.txIndex,
        vout: observation.vout,
        bondVout: observation.bondVout,
        bidderCommitment: observation.bidderCommitment,
        amountSats: observation.bidAmountSats,
        status: "rejected" as const,
        reason: "prior_bid_not_replaced" as const,
        requiredMinimumBidSats: preBidState.requiredMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: currentLeader?.amountSats ?? null,
        stateCommitmentMatched: true,
        bondStatus: "rejected_not_tracked" as const,
        bondReleaseBlock: null,
        bondSpendStatus: "not_applicable" as const,
        bondSpentTxid: null,
        bondSpentBlockHeight: null
      });
      continue;
    }

    if (currentLeader === null) {
      if (observation.bidAmountSats < input.catalogEntry.openingMinimumBidSats) {
        visibleBidOutcomes.push({
          index,
          txid: observation.txid,
          blockHeight: observation.blockHeight,
          txIndex: observation.txIndex,
          vout: observation.vout,
          bondVout: observation.bondVout,
          bidderCommitment: observation.bidderCommitment,
          amountSats: observation.bidAmountSats,
          status: "rejected" as const,
          reason: "below_opening_minimum" as const,
          requiredMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
          auctionCloseBlockAfter: finalAuctionCloseBlock,
          highestBidSatsAfter: null,
          stateCommitmentMatched: true,
          bondStatus: "rejected_not_tracked" as const,
          bondReleaseBlock: null,
          bondSpendStatus: "not_applicable" as const,
          bondSpentTxid: null,
          bondSpentBlockHeight: null
        });
        continue;
      }

      auctionStartBlock = observation.blockHeight;
      finalAuctionCloseBlock = observation.blockHeight + input.policy.auction.baseWindowBlocks;
      currentStateObservedFromBlock = observation.blockHeight;
      currentLeader = {
        bidderCommitment: observation.bidderCommitment,
        amountSats: observation.bidAmountSats,
        txid: observation.txid,
        blockHeight: observation.blockHeight,
        bondVout: observation.bondVout
      };

      visibleBidOutcomes.push({
        index,
        txid: observation.txid,
        blockHeight: observation.blockHeight,
        txIndex: observation.txIndex,
        vout: observation.vout,
        bondVout: observation.bondVout,
        bidderCommitment: observation.bidderCommitment,
        amountSats: observation.bidAmountSats,
        status: "accepted" as const,
        reason: "opening_bid" as const,
        requiredMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: currentLeader.amountSats,
        stateCommitmentMatched: true,
        bondStatus: "leading_locked" as const,
        bondReleaseBlock: null,
        bondSpendStatus: "unspent" as const,
        bondSpentTxid: null,
        bondSpentBlockHeight: null
      });
      standingAcceptedOutcomeIndexByBidder.set(observation.bidderCommitment, visibleBidOutcomes.length - 1);
      continue;
    }

    const extendsSoftClose = isReservedAuctionSoftCloseWindow({
      currentBlockHeight: observation.blockHeight,
      auctionCloseBlockAfter: finalAuctionCloseBlock,
      policy: input.policy
    });
    const requiredMinimumBidSats = calculateReservedAuctionMinimumIncrementBidSats({
      currentBidSats: currentLeader.amountSats,
      policy: input.policy,
      useSoftCloseIncrement: extendsSoftClose
    });

    if (observation.bidAmountSats < requiredMinimumBidSats) {
      visibleBidOutcomes.push({
        index,
        txid: observation.txid,
        blockHeight: observation.blockHeight,
        txIndex: observation.txIndex,
        vout: observation.vout,
        bondVout: observation.bondVout,
        bidderCommitment: observation.bidderCommitment,
        amountSats: observation.bidAmountSats,
        status: "rejected" as const,
        reason: "below_minimum_increment" as const,
        requiredMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: currentLeader.amountSats,
        stateCommitmentMatched: true,
        bondStatus: "rejected_not_tracked" as const,
        bondReleaseBlock: null,
        bondSpendStatus: "not_applicable" as const,
        bondSpentTxid: null,
        bondSpentBlockHeight: null
      });
      continue;
    }

    if (extendsSoftClose) {
      finalAuctionCloseBlock = Math.max(
        finalAuctionCloseBlock ?? 0,
        observation.blockHeight + input.policy.auction.softCloseExtensionBlocks
      );
    }

    if (standingOutcomeIndex !== null && standingOutcome !== null) {
      visibleBidOutcomes[standingOutcomeIndex] = {
        ...standingOutcome,
        bondStatus: "replaced_by_self_rebid" as const,
        bondReleaseBlock: observation.blockHeight,
        bondSpendStatus: "replacement_spend" as const,
        bondSpentTxid: observation.txid,
        bondSpentBlockHeight: observation.blockHeight
      };
    }

    currentLeader = {
      bidderCommitment: observation.bidderCommitment,
      amountSats: observation.bidAmountSats,
      txid: observation.txid,
      blockHeight: observation.blockHeight,
      bondVout: observation.bondVout
    };
    currentStateObservedFromBlock = observation.blockHeight;

    visibleBidOutcomes.push({
      index,
      txid: observation.txid,
      blockHeight: observation.blockHeight,
      txIndex: observation.txIndex,
      vout: observation.vout,
      bondVout: observation.bondVout,
      bidderCommitment: observation.bidderCommitment,
      amountSats: observation.bidAmountSats,
      status: "accepted" as const,
      reason:
        standingOutcome !== null
          ? (extendsSoftClose ? "replacement_bid_soft_close_extended" as const : "replacement_bid" as const)
          : (extendsSoftClose ? "higher_bid_soft_close_extended" as const : "higher_bid" as const),
      requiredMinimumBidSats,
      auctionCloseBlockAfter: finalAuctionCloseBlock,
      highestBidSatsAfter: currentLeader.amountSats,
      stateCommitmentMatched: true,
      bondStatus: "leading_locked" as const,
      bondReleaseBlock: null,
      bondSpendStatus: "unspent" as const,
      bondSpentTxid: null,
      bondSpentBlockHeight: null
    });
    standingAcceptedOutcomeIndexByBidder.set(observation.bidderCommitment, visibleBidOutcomes.length - 1);
  }

  const phase = deriveExperimentalReservedAuctionPhase({
    currentBlockHeight: input.currentBlockHeight,
    unlockBlock: input.catalogEntry.unlockBlock,
    noBidReleaseBlock,
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
    phase === "settled" || phase === "released_to_ordinary_lane"
      ? null
      : currentHighestBidSats === null
        ? input.catalogEntry.openingMinimumBidSats
        : calculateReservedAuctionMinimumIncrementBidSats({
            currentBidSats: currentHighestBidSats,
            policy: input.policy,
            useSoftCloseIncrement: isReservedAuctionSoftCloseWindow({
              currentBlockHeight: input.currentBlockHeight,
              auctionCloseBlockAfter: finalAuctionCloseBlock,
              policy: input.policy
            })
          });
  const winningAcceptedOutcome =
    phase === "settled"
      ? [...visibleBidOutcomes].reverse().find((outcome) => outcome.status === "accepted") ?? null
      : null;
  const winnerBidTxid = winningAcceptedOutcome?.txid ?? null;
  const winnerBidderCommitment = phase === "settled" ? currentLeaderBidderCommitment : null;
  const winnerBondReleaseBlock =
    winningAcceptedOutcome !== null
      ? winningAcceptedOutcome.blockHeight + input.catalogEntry.reservedLockBlocks
      : null;
  const settledReleaseBlock = finalAuctionCloseBlock === null ? null : finalAuctionCloseBlock + 1;
  const hydratedVisibleBidOutcomes = visibleBidOutcomes.map((outcome) => {
    if (outcome.status === "rejected") {
      return outcome;
    }

    if (outcome.bondStatus === "replaced_by_self_rebid") {
      return outcome;
    }

    const spendObservation = spentOutpointMap.get(toOutpointKey(outcome.txid, outcome.bondVout)) ?? null;
    const isWinningBid = currentLeader !== null && outcome.txid === currentLeader.txid;
    if (phase !== "settled") {
      const nextBondStatus = isWinningBid ? "leading_locked" as const : "superseded_locked_until_settlement" as const;
      const nextReleaseBlock = isWinningBid ? null : settledReleaseBlock;
      return {
        ...outcome,
        bondStatus: nextBondStatus,
        bondReleaseBlock: nextReleaseBlock,
        bondSpendStatus:
          spendObservation === null
            ? "unspent" as const
            : "spent_before_allowed_release" as const,
        bondSpentTxid: spendObservation?.spentTxid ?? null,
        bondSpentBlockHeight: spendObservation?.spentBlockHeight ?? null
      };
    }

    if (isWinningBid) {
      const winnerRelease = winnerBondReleaseBlock;
      return {
        ...outcome,
        bondStatus:
          winnerRelease !== null && input.currentBlockHeight >= winnerRelease
            ? "winner_releasable" as const
            : "winner_locked" as const,
        bondReleaseBlock: winnerRelease,
        bondSpendStatus:
          spendObservation === null
            ? "unspent" as const
            : winnerRelease !== null && spendObservation.spentBlockHeight >= winnerRelease
              ? "spent_after_allowed_release" as const
              : "spent_before_allowed_release" as const,
        bondSpentTxid: spendObservation?.spentTxid ?? null,
        bondSpentBlockHeight: spendObservation?.spentBlockHeight ?? null
      };
    }

    return {
      ...outcome,
      bondStatus: "losing_bid_releasable" as const,
      bondReleaseBlock: settledReleaseBlock,
      bondSpendStatus:
        spendObservation === null
          ? "unspent" as const
          : settledReleaseBlock !== null && spendObservation.spentBlockHeight >= settledReleaseBlock
            ? "spent_after_allowed_release" as const
            : "spent_before_allowed_release" as const,
      bondSpentTxid: spendObservation?.spentTxid ?? null,
      bondSpentBlockHeight: spendObservation?.spentBlockHeight ?? null
    };
  });
  const currentlyLockedAcceptedOutcomes = hydratedVisibleBidOutcomes.filter(
    (outcome) =>
      outcome.status === "accepted"
      && (
        outcome.bondStatus === "leading_locked"
        || outcome.bondStatus === "superseded_locked_until_settlement"
        || outcome.bondStatus === "winner_locked"
      )
  );
  const releasableAcceptedOutcomes = hydratedVisibleBidOutcomes.filter(
    (outcome) =>
      outcome.status === "accepted"
      && (
        outcome.bondStatus === "losing_bid_releasable"
        || outcome.bondStatus === "winner_releasable"
      )
  );

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
    ordinaryMinimumBidSats: input.catalogEntry.ordinaryMinimumBidSats,
    openingMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
    reservedLockBlocks: input.catalogEntry.reservedLockBlocks,
    noBidReleaseBlock: currentLeader === null ? noBidReleaseBlock : null,
    auctionStartBlock,
    auctionCloseBlockAfter,
    blocksUntilUnlock: Math.max(0, input.catalogEntry.unlockBlock - input.currentBlockHeight),
    blocksUntilNoBidRelease:
      currentLeader === null ? Math.max(0, noBidReleaseBlock - input.currentBlockHeight) : null,
    blocksUntilClose:
      auctionCloseBlockAfter === null ? null : Math.max(0, auctionCloseBlockAfter - input.currentBlockHeight),
    currentLeaderBidderCommitment,
    currentHighestBidSats,
    currentRequiredMinimumBidSats,
    winnerBidTxid,
    winnerBidderCommitment,
    winnerBondReleaseBlock,
    currentlyLockedAcceptedBidCount: currentlyLockedAcceptedOutcomes.length,
    currentlyLockedAcceptedBidAmountSats: sumOutcomeAmounts(currentlyLockedAcceptedOutcomes),
    releasableAcceptedBidCount: releasableAcceptedOutcomes.length,
    releasableAcceptedBidAmountSats: sumOutcomeAmounts(releasableAcceptedOutcomes),
    acceptedBidCount: visibleBidOutcomes.filter((outcome) => outcome.status === "accepted").length,
    rejectedBidCount: visibleBidOutcomes.filter((outcome) => outcome.status === "rejected").length,
    totalObservedBidCount: visibleBidOutcomes.length,
    visibleBidOutcomes: hydratedVisibleBidOutcomes
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
    ordinaryMinimumBidSats: state.ordinaryMinimumBidSats.toString(),
    openingMinimumBidSats: state.openingMinimumBidSats.toString(),
    reservedLockBlocks: state.reservedLockBlocks,
    noBidReleaseBlock: state.noBidReleaseBlock,
    auctionStartBlock: state.auctionStartBlock,
    auctionCloseBlockAfter: state.auctionCloseBlockAfter,
    blocksUntilUnlock: state.blocksUntilUnlock,
    blocksUntilNoBidRelease: state.blocksUntilNoBidRelease,
    blocksUntilClose: state.blocksUntilClose,
    currentLeaderBidderCommitment: state.currentLeaderBidderCommitment,
    currentHighestBidSats: state.currentHighestBidSats?.toString() ?? null,
    currentRequiredMinimumBidSats: state.currentRequiredMinimumBidSats?.toString() ?? null,
    winnerBidTxid: state.winnerBidTxid,
    winnerBidderCommitment: state.winnerBidderCommitment,
    winnerBondReleaseBlock: state.winnerBondReleaseBlock,
    currentlyLockedAcceptedBidCount: state.currentlyLockedAcceptedBidCount,
    currentlyLockedAcceptedBidAmountSats: state.currentlyLockedAcceptedBidAmountSats.toString(),
    releasableAcceptedBidCount: state.releasableAcceptedBidCount,
    releasableAcceptedBidAmountSats: state.releasableAcceptedBidAmountSats.toString(),
    acceptedBidCount: state.acceptedBidCount,
    rejectedBidCount: state.rejectedBidCount,
    totalObservedBidCount: state.totalObservedBidCount,
    visibleBidOutcomes: state.visibleBidOutcomes.map((outcome) => ({
      index: outcome.index,
      txid: outcome.txid,
      blockHeight: outcome.blockHeight,
      txIndex: outcome.txIndex,
      vout: outcome.vout,
      bondVout: outcome.bondVout,
      bidderCommitment: outcome.bidderCommitment,
      amountSats: outcome.amountSats.toString(),
      status: outcome.status,
      reason: outcome.reason,
      requiredMinimumBidSats: outcome.requiredMinimumBidSats.toString(),
      auctionCloseBlockAfter: outcome.auctionCloseBlockAfter,
      highestBidSatsAfter: outcome.highestBidSatsAfter?.toString() ?? null,
      stateCommitmentMatched: outcome.stateCommitmentMatched,
      bondStatus: outcome.bondStatus,
      bondReleaseBlock: outcome.bondReleaseBlock,
      bondSpendStatus: outcome.bondSpendStatus,
      bondSpentTxid: outcome.bondSpentTxid,
      bondSpentBlockHeight: outcome.bondSpentBlockHeight
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
    case "released_to_ordinary_lane":
      return "Released to ordinary lane";
    case "live_bidding":
      return "Live bidding";
    case "soft_close":
      return "Soft close";
    case "settled":
      return "Settled";
  }
}

interface ExperimentalPreBidAuctionState {
  readonly phase: ExperimentalReservedAuctionPhase;
  readonly requiredMinimumBidSats: bigint;
  readonly stateCommitmentMatched: boolean;
}

function createPreBidAuctionState(input: {
  readonly catalogEntry: ExperimentalReservedAuctionCatalogEntry;
  readonly policy: ReservedAuctionPolicy;
  readonly observationBlockHeight: number;
  readonly currentStateObservedFromBlock: number;
  readonly finalAuctionCloseBlock: number | null;
  readonly currentLeader:
    | {
        readonly bidderCommitment: string;
        readonly amountSats: bigint;
        readonly txid: string;
        readonly blockHeight: number;
        readonly bondVout: number;
      }
    | null;
  readonly observedAuctionCommitment: string;
}): ExperimentalPreBidAuctionState {
  if (input.observationBlockHeight < input.catalogEntry.unlockBlock) {
    return {
      phase: "pending_unlock",
      requiredMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
      stateCommitmentMatched: matchAuctionStateCommitmentWithinWindow({
        observationAuctionCommitment: input.observedAuctionCommitment,
        auctionId: input.catalogEntry.auctionId,
        name: input.catalogEntry.normalizedName,
        reservedClassId: input.catalogEntry.reservedClassId,
        unlockBlock: input.catalogEntry.unlockBlock,
        reservedLockBlocks: input.catalogEntry.reservedLockBlocks,
        openingMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
        currentLeaderBidderCommitment: null,
        currentHighestBidSats: null,
        currentRequiredMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
        phase: "pending_unlock",
        auctionCloseBlockAfter: null,
        minObservedBlockHeight: 0,
        maxObservedBlockHeight: input.observationBlockHeight
      })
    };
  }

  if (input.currentLeader === null) {
    if (
      input.observationBlockHeight
      > getReservedAuctionNoBidReleaseBlock({
        unlockBlock: input.catalogEntry.unlockBlock,
        policy: input.policy
      })
    ) {
      return {
        phase: "released_to_ordinary_lane",
        requiredMinimumBidSats: input.catalogEntry.ordinaryMinimumBidSats,
        stateCommitmentMatched: false
      };
    }

    return {
      phase: "awaiting_opening_bid",
      requiredMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
      stateCommitmentMatched: matchAuctionStateCommitmentWithinWindow({
        observationAuctionCommitment: input.observedAuctionCommitment,
        auctionId: input.catalogEntry.auctionId,
        name: input.catalogEntry.normalizedName,
        reservedClassId: input.catalogEntry.reservedClassId,
        unlockBlock: input.catalogEntry.unlockBlock,
        reservedLockBlocks: input.catalogEntry.reservedLockBlocks,
        openingMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
        currentLeaderBidderCommitment: null,
        currentHighestBidSats: null,
        currentRequiredMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
        phase: "awaiting_opening_bid",
        auctionCloseBlockAfter: null,
        minObservedBlockHeight: input.catalogEntry.unlockBlock,
        maxObservedBlockHeight: input.observationBlockHeight
      })
    };
  }

  if (input.finalAuctionCloseBlock !== null && input.observationBlockHeight > input.finalAuctionCloseBlock) {
    return {
      phase: "settled",
      requiredMinimumBidSats: calculateReservedAuctionMinimumIncrementBidSats({
        currentBidSats: input.currentLeader.amountSats,
        policy: input.policy
      }),
      stateCommitmentMatched: matchAuctionStateCommitmentWithinWindow({
        observationAuctionCommitment: input.observedAuctionCommitment,
        auctionId: input.catalogEntry.auctionId,
        name: input.catalogEntry.normalizedName,
        reservedClassId: input.catalogEntry.reservedClassId,
        unlockBlock: input.catalogEntry.unlockBlock,
        reservedLockBlocks: input.catalogEntry.reservedLockBlocks,
        openingMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
        currentLeaderBidderCommitment: input.currentLeader.bidderCommitment,
        currentHighestBidSats: input.currentLeader.amountSats,
        currentRequiredMinimumBidSats: null,
        phase: "settled",
        auctionCloseBlockAfter: input.finalAuctionCloseBlock,
        minObservedBlockHeight: input.finalAuctionCloseBlock + 1,
        maxObservedBlockHeight: input.observationBlockHeight
      })
    };
  }

  const softCloseStartBlock =
    input.finalAuctionCloseBlock === null || input.policy.auction.softCloseExtensionBlocks <= 0
      ? Number.MAX_SAFE_INTEGER
      : input.finalAuctionCloseBlock - input.policy.auction.softCloseExtensionBlocks;
  const phase: ExperimentalReservedAuctionPhase =
    input.observationBlockHeight >= softCloseStartBlock ? "soft_close" : "live_bidding";
  const requiredMinimumBidSats = calculateReservedAuctionMinimumIncrementBidSats({
    currentBidSats: input.currentLeader.amountSats,
    policy: input.policy,
    useSoftCloseIncrement: phase === "soft_close"
  });
  const phaseStartBlock = phase === "soft_close"
    ? Math.max(input.currentStateObservedFromBlock, softCloseStartBlock)
    : input.currentStateObservedFromBlock;

  return {
    phase,
    requiredMinimumBidSats,
    stateCommitmentMatched: matchAuctionStateCommitmentWithinWindow({
      observationAuctionCommitment: input.observedAuctionCommitment,
      auctionId: input.catalogEntry.auctionId,
      name: input.catalogEntry.normalizedName,
      reservedClassId: input.catalogEntry.reservedClassId,
      unlockBlock: input.catalogEntry.unlockBlock,
      reservedLockBlocks: input.catalogEntry.reservedLockBlocks,
      openingMinimumBidSats: input.catalogEntry.openingMinimumBidSats,
      currentLeaderBidderCommitment: input.currentLeader.bidderCommitment,
      currentHighestBidSats: input.currentLeader.amountSats,
      currentRequiredMinimumBidSats: requiredMinimumBidSats,
      phase,
      auctionCloseBlockAfter: input.finalAuctionCloseBlock,
      minObservedBlockHeight: phaseStartBlock,
      maxObservedBlockHeight: input.observationBlockHeight
    })
  };
}

function matchAuctionStateCommitmentWithinWindow(input: {
  readonly observationAuctionCommitment: string;
  readonly auctionId: string;
  readonly name: string;
  readonly reservedClassId: ReservedAuctionClassId;
  readonly unlockBlock: number;
  readonly reservedLockBlocks: number;
  readonly openingMinimumBidSats: bigint;
  readonly currentLeaderBidderCommitment: string | null;
  readonly currentHighestBidSats: bigint | null;
  readonly currentRequiredMinimumBidSats: bigint | null;
  readonly phase: ExperimentalAuctionCommitmentPhase;
  readonly auctionCloseBlockAfter: number | null;
  readonly minObservedBlockHeight: number;
  readonly maxObservedBlockHeight: number;
}): boolean {
  for (
    let candidateHeight = Math.max(0, input.minObservedBlockHeight);
    candidateHeight <= input.maxObservedBlockHeight;
    candidateHeight += 1
  ) {
    const expectedCommitment = computeAuctionBidStateCommitment({
      auctionId: input.auctionId,
      name: input.name,
      reservedClassId: input.reservedClassId,
      currentBlockHeight: candidateHeight,
      phase: input.phase,
      unlockBlock: input.unlockBlock,
      auctionCloseBlockAfter: input.auctionCloseBlockAfter,
      openingMinimumBidSats: input.openingMinimumBidSats,
      currentLeaderBidderCommitment: input.currentLeaderBidderCommitment,
      currentHighestBidSats: input.currentHighestBidSats,
      currentRequiredMinimumBidSats: input.currentRequiredMinimumBidSats,
      reservedLockBlocks: input.reservedLockBlocks
    });

    if (expectedCommitment === input.observationAuctionCommitment) {
      return true;
    }
  }

  return false;
}

function sumOutcomeAmounts(outcomes: readonly ExperimentalReservedAuctionBidOutcome[]): bigint {
  return outcomes.reduce((sum, outcome) => sum + outcome.amountSats, 0n);
}

function didObservationSpendStandingBond(
  observation: ExperimentalReservedAuctionBidObservation,
  standingOutcome: ExperimentalReservedAuctionBidOutcome
): boolean {
  return observation.spentOutpoints.some(
    (input) => input.txid === standingOutcome.txid && input.vout === standingOutcome.bondVout
  );
}

function toOutpointKey(txid: string, vout: number): string {
  return `${txid}:${vout}`;
}

function deriveExperimentalReservedAuctionPhase(input: {
  readonly currentBlockHeight: number;
  readonly unlockBlock: number;
  readonly noBidReleaseBlock: number | null;
  readonly auctionCloseBlockAfter: number | null;
  readonly softCloseExtensionBlocks: number;
  readonly winnerPresent: boolean;
}): ExperimentalReservedAuctionPhase {
  if (input.currentBlockHeight < input.unlockBlock) {
    return "pending_unlock";
  }

  if (!input.winnerPresent) {
    if (input.noBidReleaseBlock !== null && input.currentBlockHeight > input.noBidReleaseBlock) {
      return "released_to_ordinary_lane";
    }

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
