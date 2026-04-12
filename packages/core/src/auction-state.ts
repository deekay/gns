import {
  calculateReservedAuctionMinimumIncrementBidSats,
  getReservedAuctionNoBidReleaseBlock,
  isReservedAuctionSoftCloseWindow,
  type ReservedAuctionPolicy
} from "./auction-policy.js";
import {
  simulateReservedAuction,
  type ReservedAuctionBidOutcome,
  type ReservedAuctionScenario
} from "./auction-sim.js";

export type ReservedAuctionPhase =
  | "pending_unlock"
  | "awaiting_opening_bid"
  | "released_to_ordinary_lane"
  | "live_bidding"
  | "soft_close"
  | "settled";

export interface ReservedAuctionStateAtBlock {
  readonly currentBlockHeight: number;
  readonly phase: ReservedAuctionPhase;
  readonly phaseLabel: string;
  readonly normalizedName: string;
  readonly reservedClassId: ReservedAuctionScenario["reservedClassId"];
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
  readonly currentLeaderBidderId: string | null;
  readonly currentHighestBidSats: bigint | null;
  readonly currentRequiredMinimumBidSats: bigint | null;
  readonly acceptedBidCount: number;
  readonly rejectedBidCount: number;
  readonly visibleBidOutcomes: ReadonlyArray<ReservedAuctionBidOutcome>;
}

export interface SerializedReservedAuctionStateAtBlock {
  readonly currentBlockHeight: number;
  readonly phase: ReservedAuctionPhase;
  readonly phaseLabel: string;
  readonly normalizedName: string;
  readonly reservedClassId: ReservedAuctionScenario["reservedClassId"];
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
  readonly currentLeaderBidderId: string | null;
  readonly currentHighestBidSats: string | null;
  readonly currentRequiredMinimumBidSats: string | null;
  readonly acceptedBidCount: number;
  readonly rejectedBidCount: number;
  readonly visibleBidOutcomes: ReadonlyArray<{
    readonly index: number;
    readonly bidderId: string;
    readonly blockHeight: number;
    readonly amountSats: string;
    readonly status: "accepted" | "rejected";
    readonly reason: ReservedAuctionBidOutcome["reason"];
    readonly requiredMinimumBidSats: string;
    readonly auctionCloseBlockAfter: number | null;
    readonly highestBidSatsAfter: string | null;
  }>;
}

export function simulateReservedAuctionStateAtBlock(input: {
  readonly policy: ReservedAuctionPolicy;
  readonly scenario: ReservedAuctionScenario;
  readonly currentBlockHeight: number;
}): ReservedAuctionStateAtBlock {
  const visibleScenario: ReservedAuctionScenario = {
    ...input.scenario,
    bidAttempts: input.scenario.bidAttempts.filter((attempt) => attempt.blockHeight <= input.currentBlockHeight)
  };
  const partialResult = simulateReservedAuction({
    policy: input.policy,
    scenario: visibleScenario
  });
  const acceptedBidCount = partialResult.bidOutcomes.filter((outcome) => outcome.status === "accepted").length;
  const rejectedBidCount = partialResult.bidOutcomes.length - acceptedBidCount;
  const noBidReleaseBlock =
    partialResult.winner === null
      ? getReservedAuctionNoBidReleaseBlock({
          unlockBlock: partialResult.unlockBlock,
          policy: input.policy
        })
      : null;

  const phase = deriveReservedAuctionPhase({
    currentBlockHeight: input.currentBlockHeight,
    unlockBlock: input.scenario.unlockBlock,
    noBidReleaseBlock,
    auctionCloseBlockAfter: partialResult.finalAuctionCloseBlock,
    softCloseExtensionBlocks: partialResult.softCloseExtensionBlocks,
    winnerPresent: partialResult.winner !== null
  });
  const auctionCloseBlockAfter =
    phase === "live_bidding" || phase === "soft_close" || phase === "settled"
      ? partialResult.finalAuctionCloseBlock
      : null;
  const currentRequiredMinimumBidSats =
    phase === "settled" || phase === "released_to_ordinary_lane"
      ? null
      : partialResult.winner === null
        ? partialResult.openingMinimumBidSats
        : calculateReservedAuctionMinimumIncrementBidSats({
            currentBidSats: partialResult.winner.amountSats,
            policy: input.policy,
            useSoftCloseIncrement: isReservedAuctionSoftCloseWindow({
              currentBlockHeight: input.currentBlockHeight,
              auctionCloseBlockAfter: partialResult.finalAuctionCloseBlock,
              policy: input.policy
            })
          });

  return {
    currentBlockHeight: input.currentBlockHeight,
    phase,
    phaseLabel: formatReservedAuctionPhaseLabel(phase),
    normalizedName: partialResult.normalizedName,
    reservedClassId: partialResult.reservedClassId,
    classLabel: partialResult.classLabel,
    unlockBlock: partialResult.unlockBlock,
    ordinaryMinimumBidSats: partialResult.ordinaryMinimumBidSats,
    openingMinimumBidSats: partialResult.openingMinimumBidSats,
    reservedLockBlocks: partialResult.reservedLockBlocks,
    noBidReleaseBlock,
    auctionStartBlock: partialResult.auctionStartBlock,
    auctionCloseBlockAfter,
    blocksUntilUnlock: Math.max(0, input.scenario.unlockBlock - input.currentBlockHeight),
    blocksUntilNoBidRelease:
      noBidReleaseBlock === null ? null : Math.max(0, noBidReleaseBlock - input.currentBlockHeight),
    blocksUntilClose:
      auctionCloseBlockAfter === null ? null : Math.max(0, auctionCloseBlockAfter - input.currentBlockHeight),
    currentLeaderBidderId: partialResult.winner?.bidderId ?? null,
    currentHighestBidSats: partialResult.winner?.amountSats ?? null,
    currentRequiredMinimumBidSats,
    acceptedBidCount,
    rejectedBidCount,
    visibleBidOutcomes: partialResult.bidOutcomes
  };
}

export function serializeReservedAuctionStateAtBlock(
  state: ReservedAuctionStateAtBlock
): SerializedReservedAuctionStateAtBlock {
  return {
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
    currentLeaderBidderId: state.currentLeaderBidderId,
    currentHighestBidSats: state.currentHighestBidSats?.toString() ?? null,
    currentRequiredMinimumBidSats: state.currentRequiredMinimumBidSats?.toString() ?? null,
    acceptedBidCount: state.acceptedBidCount,
    rejectedBidCount: state.rejectedBidCount,
    visibleBidOutcomes: state.visibleBidOutcomes.map((outcome) => ({
      index: outcome.index,
      bidderId: outcome.bidderId,
      blockHeight: outcome.blockHeight,
      amountSats: outcome.amountSats.toString(),
      status: outcome.status,
      reason: outcome.reason,
      requiredMinimumBidSats: outcome.requiredMinimumBidSats.toString(),
      auctionCloseBlockAfter: outcome.auctionCloseBlockAfter,
      highestBidSatsAfter: outcome.highestBidSatsAfter?.toString() ?? null
    }))
  };
}

function deriveReservedAuctionPhase(input: {
  readonly currentBlockHeight: number;
  readonly unlockBlock: number;
  readonly noBidReleaseBlock: number | null;
  readonly auctionCloseBlockAfter: number | null;
  readonly softCloseExtensionBlocks: number;
  readonly winnerPresent: boolean;
}): ReservedAuctionPhase {
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

export function formatReservedAuctionPhaseLabel(phase: ReservedAuctionPhase): string {
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
