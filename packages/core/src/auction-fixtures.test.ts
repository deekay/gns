import { readdir, readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  createDefaultLaunchAuctionPolicy,
  parseLaunchAuctionScenario,
  simulateLaunchAuction
} from "./index.js";

interface AuctionFixtureExpectation {
  readonly status: "unopened" | "settled";
  readonly winnerBidderId: string | null;
  readonly winnerAmountSats: string | null;
  readonly initialAuctionCloseBlock: number | null;
  readonly finalAuctionCloseBlock: number | null;
  readonly reasons: ReadonlyArray<string>;
}

interface AuctionFixtureFile {
  readonly scenario: unknown;
  readonly expected: AuctionFixtureExpectation;
}

const FIXTURE_FILES = [
  "marble-competitive.json",
  "meadow-moderate.json",
  "silverpine-thin-market.json",
  "unopened-ready.json",
  "underfloor-opening-bid.json",
  "soft-close-tail.json"
] as const;

describe("auction fixture coverage", () => {
  for (const fixtureFile of FIXTURE_FILES) {
    it(`matches expected outcome for ${fixtureFile}`, async () => {
      const fixture = await loadAuctionFixture(fixtureFile);
      const result = simulateLaunchAuction({
        policy: createDefaultLaunchAuctionPolicy(),
        scenario: parseLaunchAuctionScenario(fixture.scenario)
      });

      expect(result.status).toBe(fixture.expected.status);
      expect(result.winner?.bidderId ?? null).toBe(fixture.expected.winnerBidderId);
      expect(result.winner?.amountSats.toString() ?? null).toBe(fixture.expected.winnerAmountSats);
      expect(result.initialAuctionCloseBlock).toBe(fixture.expected.initialAuctionCloseBlock);
      expect(result.finalAuctionCloseBlock).toBe(fixture.expected.finalAuctionCloseBlock);
      expect(result.bidOutcomes.map((outcome) => outcome.reason)).toEqual(fixture.expected.reasons);
    });
  }

  it("does not keep any retired delayed-lane auction class in fixtures", async () => {
    const fixtureRoot = new URL("../../../fixtures/auction/", import.meta.url);
    const retiredClassUsages: string[] = [];

    for (const fixtureUrl of await listJsonFiles(fixtureRoot)) {
      const raw = await readFile(fixtureUrl, "utf8");
      const fixture = JSON.parse(raw) as unknown;

      for (const auctionClassId of collectAuctionClassIds(fixture)) {
        if (auctionClassId === "short_name_wave") {
          retiredClassUsages.push(`${fixtureUrl.pathname}: ${auctionClassId}`);
        }
      }
    }

    expect(retiredClassUsages).toEqual([]);
  });
});

async function loadAuctionFixture(fileName: string): Promise<AuctionFixtureFile> {
  const fixtureUrl = new URL(`../../../fixtures/auction/${fileName}`, import.meta.url);
  const raw = await readFile(fixtureUrl, "utf8");
  return JSON.parse(raw) as AuctionFixtureFile;
}

async function listJsonFiles(directoryUrl: URL): Promise<URL[]> {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryUrl = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directoryUrl);

      if (entry.isDirectory()) {
        return listJsonFiles(entryUrl);
      }

      return Promise.resolve(entry.name.endsWith(".json") ? [entryUrl] : []);
    })
  );

  return files.flat();
}

function collectAuctionClassIds(fixture: unknown): string[] {
  const auctionClassIds: string[] = [];
  collectAuctionClassId(fixture, auctionClassIds);
  return auctionClassIds;
}

function collectAuctionClassId(input: unknown, auctionClassIds: string[]): void {
  if (Array.isArray(input)) {
    for (const item of input) {
      collectAuctionClassId(item, auctionClassIds);
    }
    return;
  }

  if (!isObject(input)) {
    return;
  }

  if (typeof input.auctionClassId === "string") {
    auctionClassIds.push(input.auctionClassId);
  }

  for (const value of Object.values(input)) {
    collectAuctionClassId(value, auctionClassIds);
  }
}

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}
