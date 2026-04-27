import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createAuctionBidPackage, type AuctionBidPackage } from "@ont/protocol";
import {
  createDefaultLaunchAuctionPolicy,
  parseLaunchAuctionScenario,
  serializeLaunchAuctionPolicy,
  serializeLaunchAuctionStateAtBlock,
  simulateLaunchAuctionStateAtBlock,
  type LaunchAuctionPolicy,
  type SerializedLaunchAuctionPolicy
} from "@ont/core";

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
  readonly state: ReturnType<typeof serializeLaunchAuctionStateAtBlock>;
}

export interface LaunchAuctionLabPayload {
  readonly kind: "auction_lab";
  readonly policy: SerializedLaunchAuctionPolicy;
  readonly cases: ReadonlyArray<AuctionLabCase>;
}

export interface LaunchAuctionLabPolicyOverrides {
  readonly noBidReleaseBlocks?: number;
}

interface WebsiteAuctionBidPackageStateInput {
  readonly auctionId: string;
  readonly normalizedName: string;
  readonly auctionClassId: string;
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
  readonly settlementLockBlocks: number;
  readonly blocksUntilUnlock: number;
  readonly blocksUntilClose: number | null;
  readonly baseMinimumBidSats?: string;
}

const AUCTION_LAB_FIXTURE_DIR =
  process.env.ONT_EXPERIMENTAL_AUCTION_FIXTURE_DIR?.trim()
  || fileURLToPath(new URL("../../../fixtures/auction/lab", import.meta.url));

export async function loadLaunchAuctionLab(input?: {
  readonly policyOverrides?: LaunchAuctionLabPolicyOverrides;
}): Promise<LaunchAuctionLabPayload> {
  const policy = applyLaunchAuctionLabPolicyOverrides(
    createDefaultLaunchAuctionPolicy(),
    input?.policyOverrides
  );
  const policyPayload = serializeLaunchAuctionPolicy(policy);
  const fixtureFileNames = (await readdir(AUCTION_LAB_FIXTURE_DIR))
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  const casesWithLegacy = await Promise.all(
    fixtureFileNames.map(async (fileName) => {
      const raw = await readFile(`${AUCTION_LAB_FIXTURE_DIR}/${fileName}`, "utf8");
      const fixture = JSON.parse(raw) as AuctionLabFixtureFile;
      const scenario = parseLaunchAuctionScenario(fixture.scenario);
      const state = simulateLaunchAuctionStateAtBlock({
        policy,
        scenario,
        currentBlockHeight: fixture.currentBlockHeight
      });

      return {
        id: fileName.replace(/\.json$/u, ""),
        title: fixture.title,
        description: fixture.description,
        state: serializeLaunchAuctionStateAtBlock(state)
      } satisfies AuctionLabCase;
    })
  );
  const cases = casesWithLegacy.filter(
    (entry) => entry.id !== "06-released-nike" && entry.state.phase !== "closed_without_winner"
  );

  return {
    kind: "auction_lab",
    policy: policyPayload,
    cases
  };
}

export async function createLaunchAuctionLabBidPackage(input: {
  readonly caseId: string;
  readonly bidderId: string;
  readonly ownerPubkey: string;
  readonly bidAmountSats: bigint | number | string;
  readonly policyOverrides?: LaunchAuctionLabPolicyOverrides;
}): Promise<AuctionBidPackage> {
  const payload = await loadLaunchAuctionLab(
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
      auctionClassId: auctionCase.state.auctionClassId,
      classLabel: auctionCase.state.classLabel,
      currentBlockHeight: auctionCase.state.currentBlockHeight,
      phase: auctionCase.state.phase,
      unlockBlock: auctionCase.state.unlockBlock,
      auctionCloseBlockAfter: auctionCase.state.auctionCloseBlockAfter,
      openingMinimumBidSats: auctionCase.state.openingMinimumBidSats,
      currentLeaderBidderId: auctionCase.state.currentLeaderBidderId,
      currentHighestBidSats: auctionCase.state.currentHighestBidSats,
      currentRequiredMinimumBidSats: auctionCase.state.currentRequiredMinimumBidSats,
      settlementLockBlocks: auctionCase.state.settlementLockBlocks,
      blocksUntilUnlock: auctionCase.state.blocksUntilUnlock,
      blocksUntilClose: auctionCase.state.blocksUntilClose,
      baseMinimumBidSats: auctionCase.state.baseMinimumBidSats
    },
    bidderId: input.bidderId,
    ownerPubkey: input.ownerPubkey,
    bidAmountSats: input.bidAmountSats,
    sourceLabel: `auction lab case ${auctionCase.id}`
  });
}

export function createExperimentalAuctionFeedBidPackage(input: {
  readonly auction: WebsiteAuctionBidPackageStateInput;
  readonly bidderId: string;
  readonly ownerPubkey: string;
  readonly bidAmountSats: bigint | number | string;
}): AuctionBidPackage {
  return createWebsiteAuctionBidPackage({
    auctionState: input.auction,
    bidderId: input.bidderId,
    ownerPubkey: input.ownerPubkey,
    bidAmountSats: input.bidAmountSats,
    sourceLabel: `experimental auction ${input.auction.auctionId}`
  });
}

function applyLaunchAuctionLabPolicyOverrides(
  policy: LaunchAuctionPolicy,
  overrides: LaunchAuctionLabPolicyOverrides | undefined
): LaunchAuctionPolicy {
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
  readonly ownerPubkey: string;
  readonly bidAmountSats: bigint | number | string;
  readonly sourceLabel: string;
}): AuctionBidPackage {
  assertAuctionStateAllowsWebsiteBidPackage(input.auctionState, input.sourceLabel);

  return createAuctionBidPackage({
    auctionId: input.auctionState.auctionId,
    name: input.auctionState.normalizedName,
    auctionClassId: input.auctionState.auctionClassId,
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
    settlementLockBlocks: input.auctionState.settlementLockBlocks,
    blocksUntilUnlock: input.auctionState.blocksUntilUnlock,
    blocksUntilClose: input.auctionState.blocksUntilClose,
    bidderId: input.bidderId,
    ownerPubkey: input.ownerPubkey,
    bidAmountSats: input.bidAmountSats
  });
}

function assertAuctionStateAllowsWebsiteBidPackage(
  auctionState: WebsiteAuctionBidPackageStateInput,
  sourceLabel: string
): void {
  if (auctionState.phase === "closed_without_winner") {
    throw new Error(
      `Prototype scheduled-lot state ${auctionState.normalizedName} from ${sourceLabel} is a legacy no-bid close and no longer accepts auction bids.`
    );
  }

  if (auctionState.phase === "settled") {
    throw new Error(
      `Auction lot ${auctionState.normalizedName} from ${sourceLabel} is already settled and no longer accepts new bids.`
    );
  }
}
