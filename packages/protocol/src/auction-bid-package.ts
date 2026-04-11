import { PROTOCOL_NAME } from "./constants.js";
import { normalizeName } from "./names.js";

export const AUCTION_BID_PACKAGE_FORMAT = "gns-auction-bid-package";
export const AUCTION_BID_PACKAGE_VERSION = 1;

export type AuctionBidPackagePhase =
  | "pending_unlock"
  | "awaiting_opening_bid"
  | "live_bidding"
  | "soft_close"
  | "settled";

export type AuctionBidPackagePreviewStatus =
  | "too_early"
  | "below_minimum"
  | "currently_valid"
  | "auction_closed";

export interface AuctionBidPackage {
  readonly format: typeof AUCTION_BID_PACKAGE_FORMAT;
  readonly packageVersion: typeof AUCTION_BID_PACKAGE_VERSION;
  readonly protocol: typeof PROTOCOL_NAME;
  readonly exportedAt: string;
  readonly auctionId: string;
  readonly name: string;
  readonly reservedClassId: string;
  readonly classLabel: string;
  readonly currentBlockHeight: number;
  readonly phase: AuctionBidPackagePhase;
  readonly unlockBlock: number;
  readonly auctionCloseBlockAfter: number | null;
  readonly openingMinimumBidSats: string;
  readonly currentLeaderBidderId: string | null;
  readonly currentHighestBidSats: string | null;
  readonly currentRequiredMinimumBidSats: string | null;
  readonly reservedLockBlocks: number;
  readonly blocksUntilUnlock: number;
  readonly blocksUntilClose: number | null;
  readonly bidderId: string;
  readonly bidAmountSats: string;
  readonly previewStatus: AuctionBidPackagePreviewStatus;
  readonly previewSummary: string;
  readonly previewRequiredMinimumBidSats: string | null;
  readonly wouldBecomeLeader: boolean;
  readonly wouldExtendSoftClose: boolean;
}

export interface CreateAuctionBidPackageInput {
  readonly auctionId: string;
  readonly name: string;
  readonly reservedClassId: string;
  readonly classLabel: string;
  readonly currentBlockHeight: number;
  readonly phase: AuctionBidPackagePhase;
  readonly unlockBlock: number;
  readonly auctionCloseBlockAfter?: number | null;
  readonly openingMinimumBidSats: bigint | number | string;
  readonly currentLeaderBidderId?: string | null;
  readonly currentHighestBidSats?: bigint | number | string | null;
  readonly currentRequiredMinimumBidSats?: bigint | number | string | null;
  readonly reservedLockBlocks: number;
  readonly blocksUntilUnlock?: number;
  readonly blocksUntilClose?: number | null;
  readonly bidderId: string;
  readonly bidAmountSats: bigint | number | string;
  readonly exportedAt?: string;
}

export function createAuctionBidPackage(input: CreateAuctionBidPackageInput): AuctionBidPackage {
  const auctionId = normalizeRequiredText(input.auctionId, "auctionId");
  const name = normalizeName(input.name);
  const reservedClassId = normalizeRequiredText(input.reservedClassId, "reservedClassId");
  const classLabel = normalizeRequiredText(input.classLabel, "classLabel");
  const currentBlockHeight = parseNonNegativeSafeInteger(input.currentBlockHeight, "currentBlockHeight");
  const phase = parseAuctionBidPackagePhase(input.phase, "phase");
  const unlockBlock = parseNonNegativeSafeInteger(input.unlockBlock, "unlockBlock");
  const auctionCloseBlockAfter = parseOptionalNonNegativeSafeInteger(input.auctionCloseBlockAfter, "auctionCloseBlockAfter");
  const openingMinimumBidSats = parseBigIntLike(input.openingMinimumBidSats, "openingMinimumBidSats");
  const currentLeaderBidderId = normalizeOptionalText(input.currentLeaderBidderId);
  const currentHighestBidSats = parseOptionalBigIntLike(input.currentHighestBidSats, "currentHighestBidSats");
  const currentRequiredMinimumBidSats = parseOptionalBigIntLike(
    input.currentRequiredMinimumBidSats,
    "currentRequiredMinimumBidSats"
  );
  const reservedLockBlocks = parseNonNegativeSafeInteger(input.reservedLockBlocks, "reservedLockBlocks");
  const blocksUntilUnlock = input.blocksUntilUnlock ?? Math.max(0, unlockBlock - currentBlockHeight);
  const blocksUntilClose = input.blocksUntilClose ?? (
    auctionCloseBlockAfter === null ? null : Math.max(0, auctionCloseBlockAfter - currentBlockHeight)
  );
  const bidderId = normalizeRequiredText(input.bidderId, "bidderId");
  const bidAmountSats = parseBigIntLike(input.bidAmountSats, "bidAmountSats");

  assertAuctionStateConsistency({
    phase,
    currentLeaderBidderId,
    currentHighestBidSats,
    currentRequiredMinimumBidSats
  });

  const preview = deriveAuctionBidPreview({
    phase,
    unlockBlock,
    currentBlockHeight,
    openingMinimumBidSats,
    currentRequiredMinimumBidSats,
    bidAmountSats,
    blocksUntilUnlock
  });

  return parseAuctionBidPackage({
    format: AUCTION_BID_PACKAGE_FORMAT,
    packageVersion: AUCTION_BID_PACKAGE_VERSION,
    protocol: PROTOCOL_NAME,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    auctionId,
    name,
    reservedClassId,
    classLabel,
    currentBlockHeight,
    phase,
    unlockBlock,
    auctionCloseBlockAfter,
    openingMinimumBidSats: openingMinimumBidSats.toString(),
    currentLeaderBidderId,
    currentHighestBidSats: currentHighestBidSats?.toString() ?? null,
    currentRequiredMinimumBidSats: currentRequiredMinimumBidSats?.toString() ?? null,
    reservedLockBlocks,
    blocksUntilUnlock,
    blocksUntilClose,
    bidderId,
    bidAmountSats: bidAmountSats.toString(),
    previewStatus: preview.previewStatus,
    previewSummary: preview.previewSummary,
    previewRequiredMinimumBidSats: preview.previewRequiredMinimumBidSats?.toString() ?? null,
    wouldBecomeLeader: preview.wouldBecomeLeader,
    wouldExtendSoftClose: preview.wouldExtendSoftClose
  });
}

export function parseAuctionBidPackage(input: unknown): AuctionBidPackage {
  const record = assertRecord(input, "auction bid package");

  const format = assertString(record.format, "format");
  if (format !== AUCTION_BID_PACKAGE_FORMAT) {
    throw new Error(`auction bid package format must be ${AUCTION_BID_PACKAGE_FORMAT}`);
  }

  const packageVersion = assertInteger(record.packageVersion, "packageVersion");
  if (packageVersion !== AUCTION_BID_PACKAGE_VERSION) {
    throw new Error(`auction bid package version must be ${AUCTION_BID_PACKAGE_VERSION}`);
  }

  const protocol = assertString(record.protocol, "protocol");
  if (protocol !== PROTOCOL_NAME) {
    throw new Error(`auction bid package protocol must be ${PROTOCOL_NAME}`);
  }

  const exportedAt = assertString(record.exportedAt, "exportedAt");
  if (Number.isNaN(Date.parse(exportedAt))) {
    throw new Error("exportedAt must be a valid ISO timestamp");
  }

  const auctionId = normalizeRequiredText(assertString(record.auctionId, "auctionId"), "auctionId");
  const name = normalizeName(assertString(record.name, "name"));
  const reservedClassId = normalizeRequiredText(assertString(record.reservedClassId, "reservedClassId"), "reservedClassId");
  const classLabel = normalizeRequiredText(assertString(record.classLabel, "classLabel"), "classLabel");
  const currentBlockHeight = parseNonNegativeSafeInteger(record.currentBlockHeight, "currentBlockHeight");
  const phase = parseAuctionBidPackagePhase(record.phase, "phase");
  const unlockBlock = parseNonNegativeSafeInteger(record.unlockBlock, "unlockBlock");
  const auctionCloseBlockAfter = parseOptionalNonNegativeSafeInteger(record.auctionCloseBlockAfter, "auctionCloseBlockAfter");
  const openingMinimumBidSats = parseBigIntLike(record.openingMinimumBidSats, "openingMinimumBidSats");
  const currentLeaderBidderId = parseOptionalString(record.currentLeaderBidderId, "currentLeaderBidderId");
  const currentHighestBidSats = parseOptionalBigIntLike(record.currentHighestBidSats, "currentHighestBidSats");
  const currentRequiredMinimumBidSats = parseOptionalBigIntLike(
    record.currentRequiredMinimumBidSats,
    "currentRequiredMinimumBidSats"
  );
  const reservedLockBlocks = parseNonNegativeSafeInteger(record.reservedLockBlocks, "reservedLockBlocks");
  const blocksUntilUnlock = parseNonNegativeSafeInteger(record.blocksUntilUnlock, "blocksUntilUnlock");
  const blocksUntilClose = parseOptionalNonNegativeSafeInteger(record.blocksUntilClose, "blocksUntilClose");
  const bidderId = normalizeRequiredText(assertString(record.bidderId, "bidderId"), "bidderId");
  const bidAmountSats = parseBigIntLike(record.bidAmountSats, "bidAmountSats");
  const previewStatus = parseAuctionBidPackagePreviewStatus(record.previewStatus, "previewStatus");
  const previewSummary = assertString(record.previewSummary, "previewSummary");
  const previewRequiredMinimumBidSats = parseOptionalBigIntLike(
    record.previewRequiredMinimumBidSats,
    "previewRequiredMinimumBidSats"
  );
  const wouldBecomeLeader = assertBoolean(record.wouldBecomeLeader, "wouldBecomeLeader");
  const wouldExtendSoftClose = assertBoolean(record.wouldExtendSoftClose, "wouldExtendSoftClose");

  assertAuctionStateConsistency({
    phase,
    currentLeaderBidderId,
    currentHighestBidSats,
    currentRequiredMinimumBidSats
  });

  const expectedBlocksUntilUnlock = Math.max(0, unlockBlock - currentBlockHeight);
  if (blocksUntilUnlock !== expectedBlocksUntilUnlock) {
    throw new Error("blocksUntilUnlock does not match the observed auction state");
  }

  const expectedBlocksUntilClose =
    auctionCloseBlockAfter === null ? null : Math.max(0, auctionCloseBlockAfter - currentBlockHeight);
  if (blocksUntilClose !== expectedBlocksUntilClose) {
    throw new Error("blocksUntilClose does not match the observed auction state");
  }

  const expectedPreview = deriveAuctionBidPreview({
    phase,
    unlockBlock,
    currentBlockHeight,
    openingMinimumBidSats,
    currentRequiredMinimumBidSats,
    bidAmountSats,
    blocksUntilUnlock
  });

  if (previewStatus !== expectedPreview.previewStatus) {
    throw new Error("previewStatus does not match the observed auction state");
  }

  if (previewSummary !== expectedPreview.previewSummary) {
    throw new Error("previewSummary does not match the observed auction state");
  }

  if ((previewRequiredMinimumBidSats?.toString() ?? null) !== (expectedPreview.previewRequiredMinimumBidSats?.toString() ?? null)) {
    throw new Error("previewRequiredMinimumBidSats does not match the observed auction state");
  }

  if (wouldBecomeLeader !== expectedPreview.wouldBecomeLeader) {
    throw new Error("wouldBecomeLeader does not match the observed auction state");
  }

  if (wouldExtendSoftClose !== expectedPreview.wouldExtendSoftClose) {
    throw new Error("wouldExtendSoftClose does not match the observed auction state");
  }

  return {
    format,
    packageVersion,
    protocol,
    exportedAt,
    auctionId,
    name,
    reservedClassId,
    classLabel,
    currentBlockHeight,
    phase,
    unlockBlock,
    auctionCloseBlockAfter,
    openingMinimumBidSats: openingMinimumBidSats.toString(),
    currentLeaderBidderId,
    currentHighestBidSats: currentHighestBidSats?.toString() ?? null,
    currentRequiredMinimumBidSats: currentRequiredMinimumBidSats?.toString() ?? null,
    reservedLockBlocks,
    blocksUntilUnlock,
    blocksUntilClose,
    bidderId,
    bidAmountSats: bidAmountSats.toString(),
    previewStatus,
    previewSummary,
    previewRequiredMinimumBidSats: previewRequiredMinimumBidSats?.toString() ?? null,
    wouldBecomeLeader,
    wouldExtendSoftClose
  };
}

function deriveAuctionBidPreview(input: {
  readonly phase: AuctionBidPackagePhase;
  readonly unlockBlock: number;
  readonly currentBlockHeight: number;
  readonly openingMinimumBidSats: bigint;
  readonly currentRequiredMinimumBidSats: bigint | null;
  readonly bidAmountSats: bigint;
  readonly blocksUntilUnlock: number;
}): {
  readonly previewStatus: AuctionBidPackagePreviewStatus;
  readonly previewSummary: string;
  readonly previewRequiredMinimumBidSats: bigint | null;
  readonly wouldBecomeLeader: boolean;
  readonly wouldExtendSoftClose: boolean;
} {
  if (input.phase === "pending_unlock" || input.currentBlockHeight < input.unlockBlock) {
    return {
      previewStatus: "too_early",
      previewSummary:
        `Auction is still pending unlock. Wait ${input.blocksUntilUnlock} more block${input.blocksUntilUnlock === 1 ? "" : "s"} before bidding.`,
      previewRequiredMinimumBidSats: input.openingMinimumBidSats,
      wouldBecomeLeader: false,
      wouldExtendSoftClose: false
    };
  }

  if (input.phase === "settled") {
    return {
      previewStatus: "auction_closed",
      previewSummary: "Auction is already settled at this observed block height.",
      previewRequiredMinimumBidSats: null,
      wouldBecomeLeader: false,
      wouldExtendSoftClose: false
    };
  }

  const requiredMinimumBidSats = input.currentRequiredMinimumBidSats ?? input.openingMinimumBidSats;
  if (input.bidAmountSats < requiredMinimumBidSats) {
    return {
      previewStatus: "below_minimum",
      previewSummary:
        `Bid is below the current minimum valid bid of ${requiredMinimumBidSats.toString()} sats for this observed state.`,
      previewRequiredMinimumBidSats: requiredMinimumBidSats,
      wouldBecomeLeader: false,
      wouldExtendSoftClose: false
    };
  }

  if (input.phase === "awaiting_opening_bid") {
    return {
      previewStatus: "currently_valid",
      previewSummary: "Bid clears the opening minimum and would start the auction at this observed state.",
      previewRequiredMinimumBidSats: requiredMinimumBidSats,
      wouldBecomeLeader: true,
      wouldExtendSoftClose: false
    };
  }

  if (input.phase === "soft_close") {
    return {
      previewStatus: "currently_valid",
      previewSummary:
        "Bid clears the current minimum and would become the leader while extending soft close at this observed state.",
      previewRequiredMinimumBidSats: requiredMinimumBidSats,
      wouldBecomeLeader: true,
      wouldExtendSoftClose: true
    };
  }

  return {
    previewStatus: "currently_valid",
    previewSummary: "Bid clears the current minimum and would become the leader at this observed state.",
    previewRequiredMinimumBidSats: requiredMinimumBidSats,
    wouldBecomeLeader: true,
    wouldExtendSoftClose: false
  };
}

function assertAuctionStateConsistency(input: {
  readonly phase: AuctionBidPackagePhase;
  readonly currentLeaderBidderId: string | null;
  readonly currentHighestBidSats: bigint | null;
  readonly currentRequiredMinimumBidSats: bigint | null;
}) {
  if ((input.currentLeaderBidderId === null) !== (input.currentHighestBidSats === null)) {
    throw new Error("currentLeaderBidderId and currentHighestBidSats must either both be present or both be null");
  }

  if (input.phase === "pending_unlock" || input.phase === "awaiting_opening_bid") {
    if (input.currentLeaderBidderId !== null || input.currentHighestBidSats !== null) {
      throw new Error(`${input.phase} auctions must not include a current leader or highest bid`);
    }
  }

  if ((input.phase === "live_bidding" || input.phase === "soft_close" || input.phase === "settled")
    && (input.currentLeaderBidderId === null || input.currentHighestBidSats === null)) {
    throw new Error(`${input.phase} auctions must include a current leader and highest bid`);
  }

  if (input.phase === "settled") {
    if (input.currentRequiredMinimumBidSats !== null) {
      throw new Error("settled auctions must not include currentRequiredMinimumBidSats");
    }
    return;
  }

  if (input.currentRequiredMinimumBidSats === null) {
    throw new Error("active auctions must include currentRequiredMinimumBidSats");
  }
}

function parseAuctionBidPackagePhase(value: unknown, label: string): AuctionBidPackagePhase {
  const parsed = assertString(value, label);
  switch (parsed) {
    case "pending_unlock":
    case "awaiting_opening_bid":
    case "live_bidding":
    case "soft_close":
    case "settled":
      return parsed;
    default:
      throw new Error(`${label} must be a supported auction phase`);
  }
}

function parseAuctionBidPackagePreviewStatus(value: unknown, label: string): AuctionBidPackagePreviewStatus {
  const parsed = assertString(value, label);
  switch (parsed) {
    case "too_early":
    case "below_minimum":
    case "currently_valid":
    case "auction_closed":
      return parsed;
    default:
      throw new Error(`${label} must be a supported preview status`);
  }
}

function normalizeRequiredText(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }

  return trimmed;
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = normalizeRequiredText(value, "value");
  return parsed.length === 0 ? null : parsed;
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value as Record<string, unknown>;
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }

  return value;
}

function parseOptionalString(value: unknown, label: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeRequiredText(assertString(value, label), label);
}

function assertBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }

  return value;
}

function assertInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }

  return value;
}

function parseNonNegativeSafeInteger(value: unknown, label: string): number {
  const parsed = assertInteger(value, label);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative safe integer`);
  }

  return parsed;
}

function parseOptionalNonNegativeSafeInteger(value: unknown, label: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return parseNonNegativeSafeInteger(value, label);
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
      throw new Error(`${label} must be a non-negative safe integer`);
    }

    return BigInt(value);
  }

  if (typeof value === "string" && /^[0-9]+$/u.test(value)) {
    return BigInt(value);
  }

  throw new Error(`${label} must be a non-negative integer string`);
}

function parseOptionalBigIntLike(value: unknown, label: string): bigint | null {
  if (value === null || value === undefined) {
    return null;
  }

  return parseBigIntLike(value, label);
}
