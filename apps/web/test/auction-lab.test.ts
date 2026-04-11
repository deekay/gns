import { describe, expect, it } from "vitest";

import { loadReservedAuctionLab } from "../src/auction-lab.js";

describe("loadReservedAuctionLab", () => {
  it("loads curated auction fixtures with visible phase coverage", async () => {
    const payload = await loadReservedAuctionLab();

    expect(payload.kind).toBe("reserved_auction_lab");
    expect(payload.cases.length).toBeGreaterThanOrEqual(5);
    expect(payload.cases.map((entry) => entry.state.phase)).toEqual([
      "pending_unlock",
      "awaiting_opening_bid",
      "live_bidding",
      "soft_close",
      "settled"
    ]);
    expect(payload.cases[0]?.state.currentRequiredMinimumBidSats).toBe("1000000000");
    expect(payload.cases[4]?.state.currentLeaderBidderId).toBe("speculator_d");
  });
});
