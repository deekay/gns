import {
  calculateLaunchAuctionMinimumIncrementBidSats,
  getLaunchAuctionNoBidReleaseBlock,
  isLaunchAuctionSoftCloseWindow,
  type LaunchAuctionPolicy
} from "./auction-policy.js";
import {
  simulateLaunchAuction,
  type LaunchAuctionBidOutcome,
  type LaunchAuctionScenario
} from "./auction-sim.js";

export type LaunchAuctionPhase =
  | "pending_unlock"
  | "awaiting_opening_bid"
  | "closed_without_winner"
  | "live_bidding"
  | "soft_close"
  | "settled";

export interface LaunchAuctionStateAtBlock {
  readonly currentBlockHeight: number;
  readonly phase: LaunchAuctionPhase;
  readonly phaseLabel: string;
  readonly normalizedName: string;
  readonly auctionClassId: LaunchAuctionScenario["auctionClassId"];
  readonly classLabel: string;
  readonly unlockBlock: number;
  readonly baseMinimumBidSats: bigint;
  readonly openingMinimumBidSats: bigint;
  readonly settlementLockBlocks: number;
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
  readonly visibleBidOutcomes: ReadonlyArray<LaunchAuctionBidOutcome>;
}

export interface SerializedLaunchAuctionStateAtBlock {
  readonly currentBlockHeight: number;
  readonly phase: LaunchAuctionPhase;
  readonly phaseLabel: string;
  readonly normalizedName: string;
  readonly auctionClassId: LaunchAuctionScenario["auctionClassId"];
  readonly classLabel: string;
  readonly unlockBlock: number;
  readonly baseMinimumBidSats: string;
  readonly openingMinimumBidSats: string;
  readonly settlementLockBlocks: number;
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
    readonly reason: LaunchAuctionBidOutcome["reason"];
    readonly requiredMinimumBidSats: string;
    readonly auctionCloseBlockAfter: number | null;
    readonly highestBidSatsAfter: string | null;
  }>;
}

export function simulateLaunchAuctionStateAtBlock(input: {
  readonly policy: LaunchAuctionPolicy;
  readonly scenario: LaunchAuctionScenario;
  readonly currentBlockHeight: number;
}): LaunchAuctionStateAtBlock {
  const visibleScenario: LaunchAuctionScenario = {
    ...input.scenario,
    bidAttempts: input.scenario.bidAttempts.filter((attempt) => attempt.blockHeight <= input.currentBlockHeight)
  };
  const partialResult = simulateLaunchAuction({
    policy: input.policy,
    scenario: visibleScenario
  });
  const acceptedBidCount = partialResult.bidOutcomes.filter((outcome) => outcome.status === "accepted").length;
  const rejectedBidCount = partialResult.bidOutcomes.length - acceptedBidCount;
  const noBidReleaseBlock =
    partialResult.winner === null
      ? getLaunchAuctionNoBidReleaseBlock({
          unlockBlock: partialResult.unlockBlock,
          policy: input.policy
        })
      : null;

  const phase = deriveLaunchAuctionPhase({
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
    phase === "settled" || phase === "closed_without_winner"
      ? null
      : partialResult.winner === null
        ? partialResult.openingMinimumBidSats
        : calculateLaunchAuctionMinimumIncrementBidSats({
            currentBidSats: partialResult.winner.amountSats,
            policy: input.policy,
            useSoftCloseIncrement: isLaunchAuctionSoftCloseWindow({
              currentBlockHeight: input.currentBlockHeight,
              auctionCloseBlockAfter: partialResult.finalAuctionCloseBlock,
              policy: input.policy
            })
          });

  return {
    currentBlockHeight: input.currentBlockHeight,
    phase,
    phaseLabel: formatLaunchAuctionPhaseLabel(phase),
    normalizedName: partialResult.normalizedName,
    auctionClassId: partialResult.auctionClassId,
    classLabel: partialResult.classLabel,
    unlockBlock: partialResult.unlockBlock,
    baseMinimumBidSats: partialResult.baseMinimumBidSats,
    openingMinimumBidSats: partialResult.openingMinimumBidSats,
    settlementLockBlocks: partialResult.settlementLockBlocks,
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

export function serializeLaunchAuctionStateAtBlock(
  state: LaunchAuctionStateAtBlock
): SerializedLaunchAuctionStateAtBlock {
  return {
    currentBlockHeight: state.currentBlockHeight,
    phase: state.phase,
    phaseLabel: state.phaseLabel,
    normalizedName: state.normalizedName,
    auctionClassId: state.auctionClassId,
    classLabel: state.classLabel,
    unlockBlock: state.unlockBlock,
    baseMinimumBidSats: state.baseMinimumBidSats.toString(),
    openingMinimumBidSats: state.openingMinimumBidSats.toString(),
    settlementLockBlocks: state.settlementLockBlocks,
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

function deriveLaunchAuctionPhase(input: {
  readonly currentBlockHeight: number;
  readonly unlockBlock: number;
  readonly noBidReleaseBlock: number | null;
  readonly auctionCloseBlockAfter: number | null;
  readonly softCloseExtensionBlocks: number;
  readonly winnerPresent: boolean;
}): LaunchAuctionPhase {
  if (input.currentBlockHeight < input.unlockBlock) {
    return "pending_unlock";
  }

  if (!input.winnerPresent) {
    if (input.noBidReleaseBlock !== null && input.currentBlockHeight > input.noBidReleaseBlock) {
      return "closed_without_winner";
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

export function formatLaunchAuctionPhaseLabel(phase: LaunchAuctionPhase): string {
  switch (phase) {
    case "pending_unlock":
      return "Pending opening";
    case "awaiting_opening_bid":
      return "Awaiting opening bid";
    case "closed_without_winner":
      return "Closed without winner";
    case "live_bidding":
      return "Live bidding";
    case "soft_close":
      return "Soft close";
    case "settled":
      return "Settled";
  }
}
