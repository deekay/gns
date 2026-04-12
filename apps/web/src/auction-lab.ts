import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createAuctionBidPackage, type AuctionBidPackage } from "@gns/protocol";
import {
  createDefaultReservedAuctionPolicy,
  parseReservedAuctionScenario,
  serializeReservedAuctionPolicy,
  serializeReservedAuctionStateAtBlock,
  simulateReservedAuctionStateAtBlock,
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

const AUCTION_LAB_FIXTURE_DIR =
  process.env.GNS_EXPERIMENTAL_AUCTION_FIXTURE_DIR?.trim()
  || fileURLToPath(new URL("../../../fixtures/auction/lab", import.meta.url));

export async function loadReservedAuctionLab(): Promise<ReservedAuctionLabPayload> {
  const policy = createDefaultReservedAuctionPolicy();
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
}): Promise<AuctionBidPackage> {
  const payload = await loadReservedAuctionLab();
  const auctionCase = payload.cases.find((entry) => entry.id === input.caseId);

  if (!auctionCase) {
    throw new Error(`Unknown auction lab case: ${input.caseId}`);
  }

  if (auctionCase.state.phase === "released_to_ordinary_lane") {
    throw new Error(
      `Auction lot ${auctionCase.state.normalizedName} has already fallen back to the ordinary lane. Use the ordinary claim flow instead.`
    );
  }

  return createAuctionBidPackage({
    auctionId: auctionCase.id,
    name: auctionCase.state.normalizedName,
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
    bidderId: input.bidderId,
    bidAmountSats: input.bidAmountSats
  });
}
