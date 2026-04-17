import { normalizeName } from "@ont/protocol";

import {
  calculateReservedAuctionMinimumIncrementBidSats,
  getReservedAuctionOpeningRequirements,
  isReservedAuctionSoftCloseWindow,
  parseReservedAuctionPolicy,
  type ReservedAuctionClassId,
  type ReservedAuctionPolicy
} from "./auction-policy.js";

export interface ReservedAuctionBidAttempt {
  readonly bidderId: string;
  readonly blockHeight: number;
  readonly amountSats: bigint;
}

export interface SerializedReservedAuctionBidAttempt {
  readonly bidderId: string;
  readonly blockHeight: number;
  readonly amountSats: string;
}

export interface ReservedAuctionScenario {
  readonly name: string;
  readonly reservedClassId: ReservedAuctionClassId;
  readonly unlockBlock: number;
  readonly bidAttempts: ReadonlyArray<ReservedAuctionBidAttempt>;
}

export interface SerializedReservedAuctionScenario {
  readonly name: string;
  readonly reservedClassId: ReservedAuctionClassId;
  readonly unlockBlock: number;
  readonly bidAttempts: ReadonlyArray<SerializedReservedAuctionBidAttempt>;
}

export type ReservedAuctionBidAcceptanceReason =
  | "opening_bid"
  | "higher_bid"
  | "higher_bid_soft_close_extended";

export type ReservedAuctionBidRejectionReason =
  | "before_unlock"
  | "below_opening_minimum"
  | "auction_closed"
  | "below_minimum_increment"
  | "insufficient_bidder_budget";

export type ReservedAuctionBidOutcomeReason =
  | ReservedAuctionBidAcceptanceReason
  | ReservedAuctionBidRejectionReason;

export interface ReservedAuctionBidOutcome {
  readonly index: number;
  readonly bidderId: string;
  readonly blockHeight: number;
  readonly amountSats: bigint;
  readonly status: "accepted" | "rejected";
  readonly reason: ReservedAuctionBidOutcomeReason;
  readonly requiredMinimumBidSats: bigint;
  readonly auctionCloseBlockAfter: number | null;
  readonly highestBidSatsAfter: bigint | null;
}

export interface SerializedReservedAuctionBidOutcome {
  readonly index: number;
  readonly bidderId: string;
  readonly blockHeight: number;
  readonly amountSats: string;
  readonly status: "accepted" | "rejected";
  readonly reason: ReservedAuctionBidOutcomeReason;
  readonly requiredMinimumBidSats: string;
  readonly auctionCloseBlockAfter: number | null;
  readonly highestBidSatsAfter: string | null;
}

export interface ReservedAuctionWinningBid {
  readonly bidderId: string;
  readonly blockHeight: number;
  readonly amountSats: bigint;
}

export interface SerializedReservedAuctionWinningBid {
  readonly bidderId: string;
  readonly blockHeight: number;
  readonly amountSats: string;
}

export interface ReservedAuctionSimulationResult {
  readonly normalizedName: string;
  readonly reservedClassId: ReservedAuctionClassId;
  readonly classLabel: string;
  readonly unlockBlock: number;
  readonly ordinaryMinimumBidSats: bigint;
  readonly classMinimumBidSats: bigint;
  readonly openingMinimumBidSats: bigint;
  readonly reservedLockBlocks: number;
  readonly ordinaryLockBlocks: number;
  readonly auctionWindowBlocks: number;
  readonly softCloseExtensionBlocks: number;
  readonly minimumIncrementAbsoluteSats: bigint;
  readonly minimumIncrementBasisPoints: number;
  readonly status: "no_valid_bids" | "settled";
  readonly auctionStartBlock: number | null;
  readonly initialAuctionCloseBlock: number | null;
  readonly finalAuctionCloseBlock: number | null;
  readonly winner: ReservedAuctionWinningBid | null;
  readonly bidOutcomes: ReadonlyArray<ReservedAuctionBidOutcome>;
}

export interface SerializedReservedAuctionSimulationResult {
  readonly normalizedName: string;
  readonly reservedClassId: ReservedAuctionClassId;
  readonly classLabel: string;
  readonly unlockBlock: number;
  readonly ordinaryMinimumBidSats: string;
  readonly classMinimumBidSats: string;
  readonly openingMinimumBidSats: string;
  readonly reservedLockBlocks: number;
  readonly ordinaryLockBlocks: number;
  readonly auctionWindowBlocks: number;
  readonly softCloseExtensionBlocks: number;
  readonly minimumIncrementAbsoluteSats: string;
  readonly minimumIncrementBasisPoints: number;
  readonly status: "no_valid_bids" | "settled";
  readonly auctionStartBlock: number | null;
  readonly initialAuctionCloseBlock: number | null;
  readonly finalAuctionCloseBlock: number | null;
  readonly winner: SerializedReservedAuctionWinningBid | null;
  readonly bidOutcomes: ReadonlyArray<SerializedReservedAuctionBidOutcome>;
}

export function simulateReservedAuction(input: {
  readonly policy: ReservedAuctionPolicy;
  readonly scenario: ReservedAuctionScenario;
}): ReservedAuctionSimulationResult {
  const normalizedName = normalizeName(input.scenario.name);
  const openingRequirements = getReservedAuctionOpeningRequirements({
    policy: input.policy,
    name: normalizedName,
    reservedClassId: input.scenario.reservedClassId
  });

  let auctionStartBlock: number | null = null;
  let initialAuctionCloseBlock: number | null = null;
  let finalAuctionCloseBlock: number | null = null;
  let winningBid: ReservedAuctionWinningBid | null = null;

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
        requiredMinimumBidSats: calculateReservedAuctionMinimumIncrementBidSats({
          currentBidSats: winningBid.amountSats,
          policy: input.policy
        }),
        auctionCloseBlockAfter: finalAuctionCloseBlock,
        highestBidSatsAfter: winningBid.amountSats
      };
    }

    const extendsSoftClose = isReservedAuctionSoftCloseWindow({
      currentBlockHeight: attempt.blockHeight,
      auctionCloseBlockAfter: finalAuctionCloseBlock,
      policy: input.policy
    });
    const requiredMinimumBidSats = calculateReservedAuctionMinimumIncrementBidSats({
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

    const acceptanceReason: ReservedAuctionBidAcceptanceReason = extendsSoftClose
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
    reservedClassId: input.scenario.reservedClassId,
    classLabel: openingRequirements.classLabel,
    unlockBlock: input.scenario.unlockBlock,
    ordinaryMinimumBidSats: openingRequirements.ordinaryMinimumBidSats,
    classMinimumBidSats: openingRequirements.classMinimumBidSats,
    openingMinimumBidSats: openingRequirements.openingMinimumBidSats,
    reservedLockBlocks: openingRequirements.reservedLockBlocks,
    ordinaryLockBlocks: input.policy.ordinaryLockBlocks,
    auctionWindowBlocks: input.policy.auction.baseWindowBlocks,
    softCloseExtensionBlocks: input.policy.auction.softCloseExtensionBlocks,
    minimumIncrementAbsoluteSats: input.policy.auction.minimumIncrementAbsoluteSats,
    minimumIncrementBasisPoints: input.policy.auction.minimumIncrementBasisPoints,
    status: winningBid === null ? "no_valid_bids" : "settled",
    auctionStartBlock,
    initialAuctionCloseBlock,
    finalAuctionCloseBlock,
    winner: winningBid,
    bidOutcomes
  };
}

export function parseReservedAuctionScenario(input: unknown): ReservedAuctionScenario {
  const record = assertRecord(input, "reserved auction scenario");
  const bidAttemptsValue = record.bidAttempts;

  if (!Array.isArray(bidAttemptsValue)) {
    throw new Error("reserved auction scenario bidAttempts must be an array");
  }

  return {
    name: parseString(record.name, "name"),
    reservedClassId: parseReservedAuctionClassId(record.reservedClassId, "reservedClassId"),
    unlockBlock: parseNonNegativeSafeInteger(record.unlockBlock, "unlockBlock"),
    bidAttempts: bidAttemptsValue.map((attempt, index) => parseReservedAuctionBidAttempt(attempt, index))
  };
}

export function serializeReservedAuctionScenario(
  scenario: ReservedAuctionScenario
): SerializedReservedAuctionScenario {
  return {
    name: scenario.name,
    reservedClassId: scenario.reservedClassId,
    unlockBlock: scenario.unlockBlock,
    bidAttempts: scenario.bidAttempts.map((attempt) => ({
      bidderId: attempt.bidderId,
      blockHeight: attempt.blockHeight,
      amountSats: attempt.amountSats.toString()
    }))
  };
}

export function serializeReservedAuctionSimulationResult(
  result: ReservedAuctionSimulationResult
): SerializedReservedAuctionSimulationResult {
  return {
    normalizedName: result.normalizedName,
    reservedClassId: result.reservedClassId,
    classLabel: result.classLabel,
    unlockBlock: result.unlockBlock,
    ordinaryMinimumBidSats: result.ordinaryMinimumBidSats.toString(),
    classMinimumBidSats: result.classMinimumBidSats.toString(),
    openingMinimumBidSats: result.openingMinimumBidSats.toString(),
    reservedLockBlocks: result.reservedLockBlocks,
    ordinaryLockBlocks: result.ordinaryLockBlocks,
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

export function parseReservedAuctionPolicyAndScenario(input: {
  readonly policy: unknown;
  readonly scenario: unknown;
}): {
  readonly policy: ReservedAuctionPolicy;
  readonly scenario: ReservedAuctionScenario;
} {
  return {
    policy: parseReservedAuctionPolicy(input.policy),
    scenario: parseReservedAuctionScenario(input.scenario)
  };
}

function parseReservedAuctionBidAttempt(
  input: unknown,
  index: number
): ReservedAuctionBidAttempt {
  const record = assertRecord(input, `bidAttempts[${index}]`);

  return {
    bidderId: parseString(record.bidderId, `bidAttempts[${index}].bidderId`),
    blockHeight: parseNonNegativeSafeInteger(record.blockHeight, `bidAttempts[${index}].blockHeight`),
    amountSats: parseBigIntLike(record.amountSats, `bidAttempts[${index}].amountSats`)
  };
}

function parseReservedAuctionClassId(value: unknown, label: string): ReservedAuctionClassId {
  if (value === "top_collision" || value === "major_existing_name" || value === "public_identity") {
    return value;
  }

  throw new Error(`${label} must be one of top_collision, major_existing_name, public_identity`);
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
