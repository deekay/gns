import { getBondSats, normalizeName } from "@gns/protocol";

export const RESERVED_AUCTION_CLASS_IDS = [
  "top_collision",
  "major_existing_name",
  "public_identity"
] as const;

export type ReservedAuctionClassId = (typeof RESERVED_AUCTION_CLASS_IDS)[number];

export interface ReservedAuctionClassPolicy {
  readonly id: ReservedAuctionClassId;
  readonly label: string;
  readonly floorSats: bigint;
  readonly lockBlocks: number;
}

export interface ReservedAuctionSettings {
  readonly baseWindowBlocks: number;
  readonly softCloseExtensionBlocks: number;
  readonly minimumIncrementAbsoluteSats: bigint;
  readonly minimumIncrementBasisPoints: number;
}

export interface ReservedAuctionPolicy {
  readonly ordinaryLockBlocks: number;
  readonly auction: ReservedAuctionSettings;
  readonly reservedClasses: Readonly<Record<ReservedAuctionClassId, ReservedAuctionClassPolicy>>;
}

export interface SerializedReservedAuctionClassPolicy {
  readonly label: string;
  readonly floorSats: string;
  readonly lockBlocks: number;
}

export interface SerializedReservedAuctionPolicy {
  readonly ordinaryLockBlocks: number;
  readonly auction: {
    readonly baseWindowBlocks: number;
    readonly softCloseExtensionBlocks: number;
    readonly minimumIncrementAbsoluteSats: string;
    readonly minimumIncrementBasisPoints: number;
  };
  readonly reservedClasses: Readonly<Record<ReservedAuctionClassId, SerializedReservedAuctionClassPolicy>>;
}

export interface ReservedAuctionOpeningRequirements {
  readonly normalizedName: string;
  readonly ordinaryMinimumBidSats: bigint;
  readonly classMinimumBidSats: bigint;
  readonly openingMinimumBidSats: bigint;
  readonly reservedLockBlocks: number;
  readonly classLabel: string;
}

export function createDefaultReservedAuctionPolicy(): ReservedAuctionPolicy {
  return {
    ordinaryLockBlocks: 52_560,
    auction: {
      baseWindowBlocks: 4_320,
      softCloseExtensionBlocks: 144,
      minimumIncrementAbsoluteSats: 1_000_000n,
      minimumIncrementBasisPoints: 500
    },
    reservedClasses: {
      top_collision: {
        id: "top_collision",
        label: "Top collision / ultra-scarce",
        floorSats: 1_000_000_000n,
        lockBlocks: 525_600
      },
      major_existing_name: {
        id: "major_existing_name",
        label: "Major existing name",
        floorSats: 200_000_000n,
        lockBlocks: 262_800
      },
      public_identity: {
        id: "public_identity",
        label: "Public identity / operator",
        floorSats: 25_000_000n,
        lockBlocks: 157_680
      }
    }
  };
}

export function getReservedAuctionClass(
  policy: ReservedAuctionPolicy,
  classId: ReservedAuctionClassId
): ReservedAuctionClassPolicy {
  return policy.reservedClasses[classId];
}

export function getReservedAuctionOpeningRequirements(input: {
  readonly policy: ReservedAuctionPolicy;
  readonly name: string;
  readonly reservedClassId: ReservedAuctionClassId;
}): ReservedAuctionOpeningRequirements {
  const normalizedName = normalizeName(input.name);
  const reservedClass = getReservedAuctionClass(input.policy, input.reservedClassId);
  const ordinaryMinimumBidSats = getBondSats(normalizedName.length);
  const classMinimumBidSats = reservedClass.floorSats;

  return {
    normalizedName,
    ordinaryMinimumBidSats,
    classMinimumBidSats,
    openingMinimumBidSats:
      ordinaryMinimumBidSats > classMinimumBidSats ? ordinaryMinimumBidSats : classMinimumBidSats,
    reservedLockBlocks: reservedClass.lockBlocks,
    classLabel: reservedClass.label
  };
}

export function calculateReservedAuctionMinimumIncrementBidSats(input: {
  readonly currentBidSats: bigint;
  readonly policy: ReservedAuctionPolicy;
}): bigint {
  const absoluteMinimum = input.currentBidSats + input.policy.auction.minimumIncrementAbsoluteSats;
  const percentageMinimum = divideCeil(
    input.currentBidSats * BigInt(10_000 + input.policy.auction.minimumIncrementBasisPoints),
    10_000n
  );
  const minimum = absoluteMinimum > percentageMinimum ? absoluteMinimum : percentageMinimum;

  return minimum > input.currentBidSats ? minimum : input.currentBidSats + 1n;
}

export function serializeReservedAuctionPolicy(
  policy: ReservedAuctionPolicy
): SerializedReservedAuctionPolicy {
  return {
    ordinaryLockBlocks: policy.ordinaryLockBlocks,
    auction: {
      baseWindowBlocks: policy.auction.baseWindowBlocks,
      softCloseExtensionBlocks: policy.auction.softCloseExtensionBlocks,
      minimumIncrementAbsoluteSats: policy.auction.minimumIncrementAbsoluteSats.toString(),
      minimumIncrementBasisPoints: policy.auction.minimumIncrementBasisPoints
    },
    reservedClasses: {
      top_collision: serializeReservedAuctionClass(policy.reservedClasses.top_collision),
      major_existing_name: serializeReservedAuctionClass(policy.reservedClasses.major_existing_name),
      public_identity: serializeReservedAuctionClass(policy.reservedClasses.public_identity)
    }
  };
}

export function parseReservedAuctionPolicy(input: unknown): ReservedAuctionPolicy {
  const record = assertRecord(input, "reserved auction policy");
  const reservedClasses = assertRecord(record.reservedClasses, "reserved auction policy reservedClasses");
  const auction = assertRecord(record.auction, "reserved auction policy auction");

  return {
    ordinaryLockBlocks: parseNonNegativeSafeInteger(record.ordinaryLockBlocks, "ordinaryLockBlocks"),
    auction: {
      baseWindowBlocks: parseNonNegativeSafeInteger(auction.baseWindowBlocks, "auction.baseWindowBlocks"),
      softCloseExtensionBlocks: parseNonNegativeSafeInteger(
        auction.softCloseExtensionBlocks,
        "auction.softCloseExtensionBlocks"
      ),
      minimumIncrementAbsoluteSats: parseBigIntLike(
        auction.minimumIncrementAbsoluteSats,
        "auction.minimumIncrementAbsoluteSats"
      ),
      minimumIncrementBasisPoints: parseNonNegativeSafeInteger(
        auction.minimumIncrementBasisPoints,
        "auction.minimumIncrementBasisPoints"
      )
    },
    reservedClasses: {
      top_collision: parseReservedAuctionClassPolicy(
        "top_collision",
        reservedClasses.top_collision
      ),
      major_existing_name: parseReservedAuctionClassPolicy(
        "major_existing_name",
        reservedClasses.major_existing_name
      ),
      public_identity: parseReservedAuctionClassPolicy(
        "public_identity",
        reservedClasses.public_identity
      )
    }
  };
}

function serializeReservedAuctionClass(
  reservedClass: ReservedAuctionClassPolicy
): SerializedReservedAuctionClassPolicy {
  return {
    label: reservedClass.label,
    floorSats: reservedClass.floorSats.toString(),
    lockBlocks: reservedClass.lockBlocks
  };
}

function parseReservedAuctionClassPolicy(
  classId: ReservedAuctionClassId,
  input: unknown
): ReservedAuctionClassPolicy {
  const record = assertRecord(input, `reserved class ${classId}`);

  return {
    id: classId,
    label: parseString(record.label, `${classId}.label`),
    floorSats: parseBigIntLike(record.floorSats, `${classId}.floorSats`),
    lockBlocks: parseNonNegativeSafeInteger(record.lockBlocks, `${classId}.lockBlocks`)
  };
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

function divideCeil(dividend: bigint, divisor: bigint): bigint {
  return (dividend + divisor - 1n) / divisor;
}
