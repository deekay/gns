import { describe, expect, it } from "vitest";

import { createDefaultReservedAuctionPolicy } from "./auction-policy.js";
import { simulateReservedAuctionStateAtBlock } from "./auction-state.js";
import { parseReservedAuctionScenario } from "./auction-sim.js";

const policy = createDefaultReservedAuctionPolicy();

describe("simulateReservedAuctionStateAtBlock", () => {
  it("reports pending unlock before the reserved name opens", () => {
    const state = simulateReservedAuctionStateAtBlock({
      policy,
      currentBlockHeight: 839_990,
      scenario: parseReservedAuctionScenario({
        name: "google",
        reservedClassId: "top_collision",
        unlockBlock: 840_000,
        bidAttempts: [
          { bidderId: "alpha", blockHeight: 840_010, amountSats: "1000000000" }
        ]
      })
    });

    expect(state.phase).toBe("pending_unlock");
    expect(state.blocksUntilUnlock).toBe(10);
    expect(state.currentRequiredMinimumBidSats?.toString()).toBe("1000000000");
  });

  it("reports awaiting opening bid when only underfloor bids are visible", () => {
    const state = simulateReservedAuctionStateAtBlock({
      policy,
      currentBlockHeight: 880_030,
      scenario: parseReservedAuctionScenario({
        name: "sequoia",
        reservedClassId: "major_existing_name",
        unlockBlock: 880_000,
        bidAttempts: [
          { bidderId: "speculator_a", blockHeight: 880_015, amountSats: "150000000" },
          { bidderId: "speculator_b", blockHeight: 880_020, amountSats: "180000000" },
          { bidderId: "speculator_c", blockHeight: 880_030, amountSats: "199999999" }
        ]
      })
    });

    expect(state.phase).toBe("awaiting_opening_bid");
    expect(state.acceptedBidCount).toBe(0);
    expect(state.rejectedBidCount).toBe(3);
    expect(state.currentRequiredMinimumBidSats?.toString()).toBe("200000000");
  });

  it("reports live bidding after a valid opening bid before soft close", () => {
    const state = simulateReservedAuctionStateAtBlock({
      policy,
      currentBlockHeight: 851_600,
      scenario: parseReservedAuctionScenario({
        name: "openai",
        reservedClassId: "major_existing_name",
        unlockBlock: 850_000,
        bidAttempts: [
          { bidderId: "speculator_a", blockHeight: 850_010, amountSats: "200000000" },
          { bidderId: "speculator_b", blockHeight: 851_500, amountSats: "220000000" }
        ]
      })
    });

    expect(state.phase).toBe("live_bidding");
    expect(state.currentLeaderBidderId).toBe("speculator_b");
    expect(state.blocksUntilClose).toBeGreaterThan(0);
    expect(state.currentRequiredMinimumBidSats?.toString()).toBe("231000000");
  });

  it("reports soft close after a late extension bid", () => {
    const state = simulateReservedAuctionStateAtBlock({
      policy,
      currentBlockHeight: 844_360,
      scenario: parseReservedAuctionScenario({
        name: "google",
        reservedClassId: "top_collision",
        unlockBlock: 840_000,
        bidAttempts: [
          { bidderId: "alpha", blockHeight: 840_010, amountSats: "1000000000" },
          { bidderId: "beta", blockHeight: 844_210, amountSats: "1100000000" },
          { bidderId: "gamma", blockHeight: 844_353, amountSats: "1160000000" }
        ]
      })
    });

    expect(state.phase).toBe("soft_close");
    expect(state.currentLeaderBidderId).toBe("gamma");
    expect(state.auctionCloseBlockAfter).toBe(844_497);
    expect(state.blocksUntilClose).toBe(137);
  });

  it("reports settled after the closing block passes", () => {
    const state = simulateReservedAuctionStateAtBlock({
      policy,
      currentBlockHeight: 854_700,
      scenario: parseReservedAuctionScenario({
        name: "openai",
        reservedClassId: "major_existing_name",
        unlockBlock: 850_000,
        bidAttempts: [
          { bidderId: "speculator_a", blockHeight: 850_010, amountSats: "200000000" },
          { bidderId: "speculator_b", blockHeight: 851_500, amountSats: "220000000" },
          { bidderId: "speculator_c", blockHeight: 854_320, amountSats: "231000000" },
          { bidderId: "speculator_d", blockHeight: 854_450, amountSats: "250000000" }
        ]
      })
    });

    expect(state.phase).toBe("settled");
    expect(state.currentLeaderBidderId).toBe("speculator_d");
    expect(state.currentRequiredMinimumBidSats).toBeNull();
    expect(state.blocksUntilClose).toBe(0);
  });
});
