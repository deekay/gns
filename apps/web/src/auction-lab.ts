import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createAuctionBidPackage, type AuctionBidPackage } from "@gns/protocol";
import {
  createDefaultReservedAuctionPolicy,
  parseReservedAuctionScenario,
  serializeReservedAuctionPolicy,
  serializeReservedAuctionStateAtBlock,
  simulateReservedAuctionStateAtBlock,
  type ReservedAuctionPolicy,
  type SerializedReservedAuctionPolicy
} from "@gns/core";

interface AuctionLabFixtureFile {
  readonly title: string;
  readonly description: string;
  readonly currentBlockHeight: number;
  readonly scenario: unknown;
}

export interface AuctionLabCase {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly state: ReturnType<typeof serializeReservedAuctionStateAtBlock>;
}

export interface ReservedAuctionLabPayload {
  readonly kind: "reserved_auction_lab";
  readonly policy: SerializedReservedAuctionPolicy;
  readonly cases: ReadonlyArray<AuctionLabCase>;
}

export interface ReservedAuctionLabPolicyOverrides {
  readonly noBidReleaseBlocks?: number;
}

interface WebsiteAuctionBidPackageStateInput {
  readonly auctionId: string;
  readonly normalizedName: string;
  readonly reservedClassId: string;
  readonly classLabel: string;
  readonly currentBlockHeight: number;
  readonly phase: string;
  readonly unlockBlock: number;
  readonly auctionCloseBlockAfter: number | null;
  readonly openingMinimumBidSats: string;
  readonly currentLeaderBidderId?: string | null;
  readonly currentLeaderBidderCommitment?: string | null;
  readonly currentHighestBidSats: string | null;
  readonly currentRequiredMinimumBidSats: string | null;
  readonly reservedLockBlocks: number;
  readonly blocksUntilUnlock: number;
  readonly blocksUntilClose: number | null;
  readonly ordinaryMinimumBidSats?: string;
}

const AUCTION_LAB_FIXTURE_DIR =
  process.env.GNS_EXPERIMENTAL_AUCTION_FIXTURE_DIR?.trim()
  || fileURLToPath(new URL("../../../fixtures/auction/lab", import.meta.url));

export async function loadReservedAuctionLab(input?: {
  readonly policyOverrides?: ReservedAuctionLabPolicyOverrides;
}): Promise<ReservedAuctionLabPayload> {
  const policy = applyReservedAuctionLabPolicyOverrides(
    createDefaultReservedAuctionPolicy(),
    input?.policyOverrides
  );
  const policyPayload = serializeReservedAuctionPolicy(policy);
  const fixtureFileNames = (await readdir(AUCTION_LAB_FIXTURE_DIR))
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  const cases = await Promise.all(
    fixtureFileNames.map(async (fileName) => {
      const raw = await readFile(`${AUCTION_LAB_FIXTURE_DIR}/${fileName}`, "utf8");
      const fixture = JSON.parse(raw) as AuctionLabFixtureFile;
      const scenario = parseReservedAuctionScenario(fixture.scenario);
      const state = simulateReservedAuctionStateAtBlock({
        policy,
        scenario,
        currentBlockHeight: fixture.currentBlockHeight
      });

      return {
        id: fileName.replace(/\.json$/u, ""),
        title: fixture.title,
        description: fixture.description,
        state: serializeReservedAuctionStateAtBlock(state)
      } satisfies AuctionLabCase;
    })
  );

  return {
    kind: "reserved_auction_lab",
    policy: policyPayload,
    cases
  };
}

export async function createReservedAuctionLabBidPackage(input: {
  readonly caseId: string;
  readonly bidderId: string;
  readonly bidAmountSats: bigint | number | string;
  readonly policyOverrides?: ReservedAuctionLabPolicyOverrides;
}): Promise<AuctionBidPackage> {
  const payload = await loadReservedAuctionLab(
    input.policyOverrides === undefined
      ? undefined
      : {
          policyOverrides: input.policyOverrides
        }
  );
  const auctionCase = payload.cases.find((entry) => entry.id === input.caseId);

  if (!auctionCase) {
    throw new Error(`Unknown auction lab case: ${input.caseId}`);
  }

  return createWebsiteAuctionBidPackage({
    auctionState: {
      auctionId: auctionCase.id,
      normalizedName: auctionCase.state.normalizedName,
      reservedClassId: auctionCase.state.reservedClassId,
      classLabel: auctionCase.state.classLabel,
      currentBlockHeight: auctionCase.state.currentBlockHeight,
      phase: auctionCase.state.phase,
      unlockBlock: auctionCase.state.unlockBlock,
      auctionCloseBlockAfter: auctionCase.state.auctionCloseBlockAfter,
      openingMinimumBidSats: auctionCase.state.openingMinimumBidSats,
      currentLeaderBidderId: auctionCase.state.currentLeaderBidderId,
      currentHighestBidSats: auctionCase.state.currentHighestBidSats,
      currentRequiredMinimumBidSats: auctionCase.state.currentRequiredMinimumBidSats,
      reservedLockBlocks: auctionCase.state.reservedLockBlocks,
      blocksUntilUnlock: auctionCase.state.blocksUntilUnlock,
      blocksUntilClose: auctionCase.state.blocksUntilClose,
      ordinaryMinimumBidSats: auctionCase.state.ordinaryMinimumBidSats
    },
    bidderId: input.bidderId,
    bidAmountSats: input.bidAmountSats,
    sourceLabel: `auction lab case ${auctionCase.id}`
  });
}

export function createExperimentalAuctionFeedBidPackage(input: {
  readonly auction: WebsiteAuctionBidPackageStateInput;
  readonly bidderId: string;
  readonly bidAmountSats: bigint | number | string;
}): AuctionBidPackage {
  return createWebsiteAuctionBidPackage({
    auctionState: input.auction,
    bidderId: input.bidderId,
    bidAmountSats: input.bidAmountSats,
    sourceLabel: `experimental auction ${input.auction.auctionId}`
  });
}

function applyReservedAuctionLabPolicyOverrides(
  policy: ReservedAuctionPolicy,
  overrides: ReservedAuctionLabPolicyOverrides | undefined
): ReservedAuctionPolicy {
  if (!overrides || overrides.noBidReleaseBlocks === undefined) {
    return policy;
  }

  return {
    ...policy,
    auction: {
      ...policy.auction,
      noBidReleaseBlocks: overrides.noBidReleaseBlocks
    }
  };
}

function createWebsiteAuctionBidPackage(input: {
  readonly auctionState: WebsiteAuctionBidPackageStateInput;
  readonly bidderId: string;
  readonly bidAmountSats: bigint | number | string;
  readonly sourceLabel: string;
}): AuctionBidPackage {
  assertAuctionStateAllowsWebsiteBidPackage(input.auctionState, input.sourceLabel);

  return createAuctionBidPackage({
    auctionId: input.auctionState.auctionId,
    name: input.auctionState.normalizedName,
    reservedClassId: input.auctionState.reservedClassId,
    classLabel: input.auctionState.classLabel,
    currentBlockHeight: input.auctionState.currentBlockHeight,
    phase: input.auctionState.phase as
      | "pending_unlock"
      | "awaiting_opening_bid"
      | "live_bidding"
      | "soft_close",
    unlockBlock: input.auctionState.unlockBlock,
    auctionCloseBlockAfter: input.auctionState.auctionCloseBlockAfter,
    openingMinimumBidSats: input.auctionState.openingMinimumBidSats,
    ...(input.auctionState.currentLeaderBidderId === undefined
      ? {}
      : { currentLeaderBidderId: input.auctionState.currentLeaderBidderId }),
    ...(input.auctionState.currentLeaderBidderCommitment === undefined
      ? {}
      : { currentLeaderBidderCommitment: input.auctionState.currentLeaderBidderCommitment }),
    currentHighestBidSats: input.auctionState.currentHighestBidSats,
    currentRequiredMinimumBidSats: input.auctionState.currentRequiredMinimumBidSats,
    reservedLockBlocks: input.auctionState.reservedLockBlocks,
    blocksUntilUnlock: input.auctionState.blocksUntilUnlock,
    blocksUntilClose: input.auctionState.blocksUntilClose,
    bidderId: input.bidderId,
    bidAmountSats: input.bidAmountSats
  });
}

function assertAuctionStateAllowsWebsiteBidPackage(
  auctionState: WebsiteAuctionBidPackageStateInput,
  sourceLabel: string
): void {
  if (auctionState.phase === "released_to_ordinary_lane") {
    throw new Error(
      `Auction lot ${auctionState.normalizedName} from ${sourceLabel} has already fallen back to the ordinary lane. Use the ordinary claim flow instead.`
    );
  }

  if (auctionState.phase === "settled") {
    throw new Error(
      `Auction lot ${auctionState.normalizedName} from ${sourceLabel} is already settled and no longer accepts new bids.`
    );
  }
}
