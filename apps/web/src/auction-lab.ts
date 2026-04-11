import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

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

const AUCTION_LAB_FIXTURE_DIR = fileURLToPath(new URL("../../../fixtures/auction/lab", import.meta.url));

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
