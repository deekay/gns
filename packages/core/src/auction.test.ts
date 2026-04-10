import { describe, expect, it } from "vitest";

import {
  calculateReservedAuctionMinimumIncrementBidSats,
  createDefaultReservedAuctionPolicy,
  parseReservedAuctionPolicy,
  parseReservedAuctionScenario,
  serializeReservedAuctionPolicy,
  serializeReservedAuctionScenario,
  serializeReservedAuctionSimulationResult,
  simulateReservedAuction
} from "./index.js";

describe("reserved auction policy", () => {
  it("round-trips the default policy through a JSON-safe representation", () => {
    const policy = createDefaultReservedAuctionPolicy();
    const serialized = serializeReservedAuctionPolicy(policy);
    const reparsed = parseReservedAuctionPolicy(JSON.parse(JSON.stringify(serialized)));

    expect(reparsed).toEqual(policy);
  });

  it("calculates the greater of the absolute and percentage minimum increment", () => {
    const policy = createDefaultReservedAuctionPolicy();

    expect(
      calculateReservedAuctionMinimumIncrementBidSats({
        currentBidSats: 1_000_000_000n,
        policy
      })
    ).toBe(1_050_000_000n);
    expect(
      calculateReservedAuctionMinimumIncrementBidSats({
        currentBidSats: 10_000_000n,
        policy
      })
    ).toBe(11_000_000n);
  });
});

describe("simulateReservedAuction", () => {
  it("uses the class floor when it exceeds the ordinary lane floor", () => {
    const policy = createDefaultReservedAuctionPolicy();
    const result = simulateReservedAuction({
      policy,
      scenario: {
        name: "tylercowen",
        reservedClassId: "public_identity",
        unlockBlock: 840_000,
        bidAttempts: [
          {
            bidderId: "operator_a",
            blockHeight: 840_010,
            amountSats: 25_000_000n
          }
        ]
      }
    });

    expect(result.status).toBe("settled");
    expect(result.openingMinimumBidSats).toBe(25_000_000n);
    expect(result.winner?.amountSats).toBe(25_000_000n);
    expect(result.reservedLockBlocks).toBe(policy.reservedClasses.public_identity.lockBlocks);
  });

  it("rejects bids before unlock, rejects low increments, and extends on soft close", () => {
    const policy = createDefaultReservedAuctionPolicy();
    const result = simulateReservedAuction({
      policy,
      scenario: {
        name: "google",
        reservedClassId: "top_collision",
        unlockBlock: 840_000,
        bidAttempts: [
          {
            bidderId: "early_bidder",
            blockHeight: 839_999,
            amountSats: 1_000_000_000n
          },
          {
            bidderId: "alpha",
            blockHeight: 840_010,
            amountSats: 1_000_000_000n
          },
          {
            bidderId: "beta",
            blockHeight: 844_200,
            amountSats: 1_020_000_000n
          },
          {
            bidderId: "beta",
            blockHeight: 844_210,
            amountSats: 1_100_000_000n
          },
          {
            bidderId: "gamma",
            blockHeight: 844_353,
            amountSats: 1_160_000_000n
          },
          {
            bidderId: "late",
            blockHeight: 844_500,
            amountSats: 1_300_000_000n
          }
        ]
      }
    });

    expect(result.bidOutcomes.map((outcome) => outcome.reason)).toEqual([
      "before_unlock",
      "opening_bid",
      "below_minimum_increment",
      "higher_bid_soft_close_extended",
      "higher_bid_soft_close_extended",
      "auction_closed"
    ]);
    expect(result.initialAuctionCloseBlock).toBe(844_330);
    expect(result.finalAuctionCloseBlock).toBe(844_497);
    expect(result.winner).toEqual({
      bidderId: "gamma",
      blockHeight: 844_353,
      amountSats: 1_160_000_000n
    });
  });

  it("returns no_valid_bids when every attempt stays below the opening minimum", () => {
    const policy = createDefaultReservedAuctionPolicy();
    const result = simulateReservedAuction({
      policy,
      scenario: {
        name: "openai",
        reservedClassId: "major_existing_name",
        unlockBlock: 900_000,
        bidAttempts: [
          {
            bidderId: "speculator_a",
            blockHeight: 900_010,
            amountSats: 150_000_000n
          }
        ]
      }
    });

    expect(result.status).toBe("no_valid_bids");
    expect(result.winner).toBeNull();
    expect(result.bidOutcomes[0]?.reason).toBe("below_opening_minimum");
  });

  it("round-trips scenarios and results through JSON-safe forms", () => {
    const policy = createDefaultReservedAuctionPolicy();
    const scenario = parseReservedAuctionScenario(
      JSON.parse(
        JSON.stringify(
          serializeReservedAuctionScenario({
            name: "markzuckerberg",
            reservedClassId: "public_identity",
            unlockBlock: 910_000,
            bidAttempts: [
              {
                bidderId: "speculator_a",
                blockHeight: 910_100,
                amountSats: 25_000_000n
              },
              {
                bidderId: "speculator_b",
                blockHeight: 910_101,
                amountSats: 30_000_000n
              }
            ]
          })
        )
      )
    );
    const result = simulateReservedAuction({
      policy,
      scenario
    });
    const serializedResult = serializeReservedAuctionSimulationResult(result);

    expect(serializedResult.winner?.amountSats).toBe("30000000");
    expect(serializedResult.bidOutcomes).toHaveLength(2);
    expect(serializedResult.bidOutcomes[1]?.status).toBe("accepted");
  });
});
