import { normalizeName } from "@ont/protocol";

import {
  calculateLaunchAuctionMinimumIncrementBidSats,
  getDefaultLaunchAuctionClassIdForName,
  getLaunchAuctionOpeningRequirements,
  isLaunchAuctionSoftCloseWindow,
  parseLaunchAuctionPolicy,
  type LaunchAuctionClassId,
  type LaunchAuctionPolicy
} from "./auction-policy.js";

export interface LaunchAuctionBidAttempt {
  readonly bidderId: string;
  readonly blockHeight: number;
  readonly amountSats: bigint;
}

export interface SerializedLaunchAuctionBidAttempt {
  readonly bidderId: string;
  readonly blockHeight: number;
  readonly amountSats: string;
}

export interface LaunchAuctionScenario {
  readonly name: string;
  readonly auctionClassId: LaunchAuctionClassId;
  readonly unlockBlock: number;
  readonly bidAttempts: ReadonlyArray<LaunchAuctionBidAttempt>;
}

export interface SerializedLaunchAuctionScenario {
  readonly name: string;
  readonly auctionClassId: LaunchAuctionClassId;
  readonly unlockBlock: number;
  readonly bidAttempts: ReadonlyArray<SerializedLaunchAuctionBidAttempt>;
}

export type LaunchAuctionBidAcceptanceReason =
  | "opening_bid"
  | "higher_bid"
  | "higher_bid_soft_close_extended";

export type LaunchAuctionBidRejectionReason =
  | "before_unlock"
  | "below_opening_minimum"
  | "auction_closed"
  | "below_minimum_increment"
  | "insufficient_bidder_budget";

export type LaunchAuctionBidOutcomeReason =
  | LaunchAuctionBidAcceptanceReason
  | LaunchAuctionBidRejectionReason;

export interface LaunchAuctionBidOutcome {
  readonly index: number;
  readonly bidderId: string;
  readonly blockHeight: number;
  readonly amountSats: bigint;
  readonly status: "accepted" | "rejected";
  readonly reason: LaunchAuctionBidOutcomeReason;
  readonly requiredMinimumBidSats: bigint;
  readonly auctionCloseBlockAfter: number | null;
  readonly highestBidSatsAfter: bigint | null;
}

export interface SerializedLaunchAuctionBidOutcome {
  readonly index: number;
  readonly bidderId: string;
  readonly blockHeight: number;
  readonly amountSats: string;
  readonly status: "accepted" | "rejected";
  readonly reason: LaunchAuctionBidOutcomeReason;
  readonly requiredMinimumBidSats: string;
  readonly auctionCloseBlockAfter: number | null;
  readonly highestBidSatsAfter: string | null;
}

export interface LaunchAuctionWinningBid {
  readonly bidderId: string;
  readonly blockHeight: number;
  readonly amountSats: bigint;
}

export interface SerializedLaunchAuctionWinningBid {
  readonly bidderId: string;
  readonly blockHeight: number;
  readonly amountSats: string;
}

export interface LaunchAuctionSimulationResult {
  readonly normalizedName: string;
  readonly auctionClassId: LaunchAuctionClassId;
  readonly classLabel: string;
  readonly unlockBlock: number;
  readonly baseMinimumBidSats: bigint;
  readonly classMinimumBidSats: bigint;
  readonly openingMinimumBidSats: bigint;
  readonly settlementLockBlocks: number;
  readonly defaultSettlementLockBlocks: number;
  readonly auctionWindowBlocks: number;
  readonly softCloseExtensionBlocks: number;
  readonly minimumIncrementAbsoluteSats: bigint;
  readonly minimumIncrementBasisPoints: number;
  readonly status: "unopened" | "settled";
  readonly auctionStartBlock: number | null;
  readonly initialAuctionCloseBlock: number | null;
  readonly finalAuctionCloseBlock: number | null;
  readonly winner: LaunchAuctionWinningBid | null;
  readonly bidOutcomes: ReadonlyArray<LaunchAuctionBidOutcome>;
}

export interface SerializedLaunchAuctionSimulationResult {
  readonly normalizedName: string;
  readonly auctionClassId: LaunchAuctionClassId;
  readonly classLabel: string;
  readonly unlockBlock: number;
  readonly baseMinimumBidSats: string;
  readonly classMinimumBidSats: string;
  readonly openingMinimumBidSats: string;
  readonly settlementLockBlocks: number;
  readonly defaultSettlementLockBlocks: number;
  readonly auctionWindowBlocks: number;
  readonly softCloseExtensionBlocks: number;
  readonly minimumIncrementAbsoluteSats: string;
  readonly minimumIncrementBasisPoints: number;
  readonly status: "unopened" | "settled";
  readonly auctionStartBlock: number | null;
  readonly initialAuctionCloseBlock: number | null;
  readonly finalAuctionCloseBlock: number | null;
  readonly winner: SerializedLaunchAuctionWinningBid | null;
  readonly bidOutcomes: ReadonlyArray<SerializedLaunchAuctionBidOutcome>;
}

export function simulateLaunchAuction(input: {
  readonly policy: LaunchAuctionPolicy;
  readonly scenario: LaunchAuctionScenario;
}): LaunchAuctionSimulationResult {
  const normalizedName = normalizeName(input.scenario.name);
  const openingRequirements = getLaunchAuctionOpeningRequirements({
    policy: input.policy,
    name: normalizedName,
    auctionClassId: input.scenario.auctionClassId
  });

  let auctionStartBlock: number | null = null;
  let initialAuctionCloseBlock: number | null = null;
  let finalAuctionCloseBlock: number | null = null;
  let winningBid: LaunchAuctionWinningBid | null = null;

  const bidOutcomes = input.scenario.bidAttempts.map((attempt, index) => {
    if (attempt.blockHeight < input.scenario.unlockBlock) {
      return {
        index,
        bidderId: attempt.bidderId,
        blockHeight: attempt.blockHeight,
        amountSats: attempt.amountSats,
        status: "rejected" as const,
        reason: "before_unlock" as const,
        requiredMinimumBidSats: openingRequirements.openingMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: winningBid?.amountSats ?? null
      };
    }

    if (winningBid === null) {
      if (attempt.amountSats < openingRequirements.openingMinimumBidSats) {
        return {
          index,
          bidderId: attempt.bidderId,
          blockHeight: attempt.blockHeight,
          amountSats: attempt.amountSats,
          status: "rejected" as const,
          reason: "below_opening_minimum" as const,
          requiredMinimumBidSats: openingRequirements.openingMinimumBidSats,
          auctionCloseBlockAfter: finalAuctionCloseBlock,
          highestBidSatsAfter: null
        };
      }

      auctionStartBlock = attempt.blockHeight;
      initialAuctionCloseBlock = attempt.blockHeight + input.policy.auction.baseWindowBlocks;
      finalAuctionCloseBlock = initialAuctionCloseBlock;
      winningBid = {
        bidderId: attempt.bidderId,
        blockHeight: attempt.blockHeight,
        amountSats: attempt.amountSats
      };

      return {
        index,
        bidderId: attempt.bidderId,
        blockHeight: attempt.blockHeight,
        amountSats: attempt.amountSats,
        status: "accepted" as const,
        reason: "opening_bid" as const,
        requiredMinimumBidSats: openingRequirements.openingMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: winningBid.amountSats
      };
    }

    if (finalAuctionCloseBlock !== null && attempt.blockHeight > finalAuctionCloseBlock) {
      return {
        index,
        bidderId: attempt.bidderId,
        blockHeight: attempt.blockHeight,
        amountSats: attempt.amountSats,
        status: "rejected" as const,
        reason: "auction_closed" as const,
        requiredMinimumBidSats: calculateLaunchAuctionMinimumIncrementBidSats({
          currentBidSats: winningBid.amountSats,
          policy: input.policy
        }),
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: winningBid.amountSats
      };
    }

    const extendsSoftClose = isLaunchAuctionSoftCloseWindow({
      currentBlockHeight: attempt.blockHeight,
      auctionCloseBlockAfter: finalAuctionCloseBlock,
      policy: input.policy
    });
    const requiredMinimumBidSats = calculateLaunchAuctionMinimumIncrementBidSats({
      currentBidSats: winningBid.amountSats,
      policy: input.policy,
      useSoftCloseIncrement: extendsSoftClose
    });

    if (attempt.amountSats < requiredMinimumBidSats) {
      return {
        index,
        bidderId: attempt.bidderId,
        blockHeight: attempt.blockHeight,
        amountSats: attempt.amountSats,
        status: "rejected" as const,
        reason: "below_minimum_increment" as const,
        requiredMinimumBidSats,
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: winningBid.amountSats
      };
    }

    winningBid = {
      bidderId: attempt.bidderId,
      blockHeight: attempt.blockHeight,
      amountSats: attempt.amountSats
    };

    const acceptanceReason: LaunchAuctionBidAcceptanceReason = extendsSoftClose
      ? "higher_bid_soft_close_extended"
      : "higher_bid";

    if (extendsSoftClose) {
      finalAuctionCloseBlock = Math.max(
        finalAuctionCloseBlock ?? 0,
        attempt.blockHeight + input.policy.auction.softCloseExtensionBlocks
      );
    }

    return {
      index,
      bidderId: attempt.bidderId,
      blockHeight: attempt.blockHeight,
      amountSats: attempt.amountSats,
      status: "accepted" as const,
      reason: acceptanceReason,
      requiredMinimumBidSats,
      auctionCloseBlockAfter: finalAuctionCloseBlock,
      highestBidSatsAfter: winningBid.amountSats
    };
  });

  return {
    normalizedName,
    auctionClassId: input.scenario.auctionClassId,
    classLabel: openingRequirements.classLabel,
    unlockBlock: input.scenario.unlockBlock,
    baseMinimumBidSats: openingRequirements.baseMinimumBidSats,
    classMinimumBidSats: openingRequirements.classMinimumBidSats,
    openingMinimumBidSats: openingRequirements.openingMinimumBidSats,
    settlementLockBlocks: openingRequirements.settlementLockBlocks,
    defaultSettlementLockBlocks: input.policy.defaultSettlementLockBlocks,
    auctionWindowBlocks: input.policy.auction.baseWindowBlocks,
    softCloseExtensionBlocks: input.policy.auction.softCloseExtensionBlocks,
    minimumIncrementAbsoluteSats: input.policy.auction.minimumIncrementAbsoluteSats,
    minimumIncrementBasisPoints: input.policy.auction.minimumIncrementBasisPoints,
    status: winningBid === null ? "unopened" : "settled",
    auctionStartBlock,
    initialAuctionCloseBlock,
    finalAuctionCloseBlock,
    winner: winningBid,
    bidOutcomes
  };
}

export function parseLaunchAuctionScenario(input: unknown): LaunchAuctionScenario {
  const record = assertRecord(input, "auction scenario");
  const bidAttemptsValue = record.bidAttempts;

  if (!Array.isArray(bidAttemptsValue)) {
    throw new Error("auction scenario bidAttempts must be an array");
  }

  return {
    name: parseString(record.name, "name"),
    auctionClassId:
      record.auctionClassId === undefined
        ? getDefaultLaunchAuctionClassIdForName(parseString(record.name, "name"))
        : parseLaunchAuctionClassId(record.auctionClassId, "auctionClassId"),
    unlockBlock: parseNonNegativeSafeInteger(record.unlockBlock, "unlockBlock"),
    bidAttempts: bidAttemptsValue.map((attempt, index) => parseLaunchAuctionBidAttempt(attempt, index))
  };
}

export function serializeLaunchAuctionScenario(
  scenario: LaunchAuctionScenario
): SerializedLaunchAuctionScenario {
  return {
    name: scenario.name,
    auctionClassId: scenario.auctionClassId,
    unlockBlock: scenario.unlockBlock,
    bidAttempts: scenario.bidAttempts.map((attempt) => ({
      bidderId: attempt.bidderId,
      blockHeight: attempt.blockHeight,
      amountSats: attempt.amountSats.toString()
    }))
  };
}

export function serializeLaunchAuctionSimulationResult(
  result: LaunchAuctionSimulationResult
): SerializedLaunchAuctionSimulationResult {
  return {
    normalizedName: result.normalizedName,
    auctionClassId: result.auctionClassId,
    classLabel: result.classLabel,
    unlockBlock: result.unlockBlock,
    baseMinimumBidSats: result.baseMinimumBidSats.toString(),
    classMinimumBidSats: result.classMinimumBidSats.toString(),
    openingMinimumBidSats: result.openingMinimumBidSats.toString(),
    settlementLockBlocks: result.settlementLockBlocks,
    defaultSettlementLockBlocks: result.defaultSettlementLockBlocks,
    auctionWindowBlocks: result.auctionWindowBlocks,
    softCloseExtensionBlocks: result.softCloseExtensionBlocks,
    minimumIncrementAbsoluteSats: result.minimumIncrementAbsoluteSats.toString(),
    minimumIncrementBasisPoints: result.minimumIncrementBasisPoints,
    status: result.status,
    auctionStartBlock: result.auctionStartBlock,
    initialAuctionCloseBlock: result.initialAuctionCloseBlock,
    finalAuctionCloseBlock: result.finalAuctionCloseBlock,
    winner:
      result.winner === null
        ? null
        : {
            bidderId: result.winner.bidderId,
            blockHeight: result.winner.blockHeight,
            amountSats: result.winner.amountSats.toString()
          },
    bidOutcomes: result.bidOutcomes.map((outcome) => ({
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

export function parseLaunchAuctionPolicyAndScenario(input: {
  readonly policy: unknown;
  readonly scenario: unknown;
}): {
  readonly policy: LaunchAuctionPolicy;
  readonly scenario: LaunchAuctionScenario;
} {
  return {
    policy: parseLaunchAuctionPolicy(input.policy),
    scenario: parseLaunchAuctionScenario(input.scenario)
  };
}

function parseLaunchAuctionBidAttempt(
  input: unknown,
  index: number
): LaunchAuctionBidAttempt {
  const record = assertRecord(input, `bidAttempts[${index}]`);

  return {
    bidderId: parseString(record.bidderId, `bidAttempts[${index}].bidderId`),
    blockHeight: parseNonNegativeSafeInteger(record.blockHeight, `bidAttempts[${index}].blockHeight`),
    amountSats: parseBigIntLike(record.amountSats, `bidAttempts[${index}].amountSats`)
  };
}

function parseLaunchAuctionClassId(value: unknown, label: string): LaunchAuctionClassId {
  if (value === "launch_name" || value === "short_name_wave") {
    return value;
  }

  throw new Error(`${label} must be one of launch_name, short_name_wave`);
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }

  return value;
}

function parseBigIntLike(value: unknown, label: string): bigint {
  if (typeof value === "bigint") {
    if (value < 0n) {
      throw new Error(`${label} must be non-negative`);
    }

    return value;
  }

  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`${label} must be a non-negative safe integer when provided as a number`);
    }

    return BigInt(value);
  }

  if (typeof value === "string" && /^[0-9]+$/.test(value)) {
    return BigInt(value);
  }

  throw new Error(`${label} must be a non-negative integer string`);
}

function parseNonNegativeSafeInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer`);
  }

  return value;
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value as Record<string, unknown>;
}
