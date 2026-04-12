import { describe, expect, it } from "vitest";

import { createReservedAuctionLabBidPackage, loadReservedAuctionLab } from "../src/auction-lab.js";

describe("loadReservedAuctionLab", () => {
  it("loads curated auction fixtures with visible phase coverage", async () => {
    const payload = await loadReservedAuctionLab();

    expect(payload.kind).toBe("reserved_auction_lab");
    expect(payload.cases.length).toBeGreaterThanOrEqual(6);
    expect(payload.cases.map((entry) => entry.state.phase)).toEqual([
      "pending_unlock",
      "awaiting_opening_bid",
      "live_bidding",
      "soft_close",
      "settled",
      "released_to_ordinary_lane"
    ]);
    expect(payload.cases[0]?.state.currentRequiredMinimumBidSats).toBe("1000000000");
    expect(payload.cases[4]?.state.currentLeaderBidderId).toBe("speculator_d");
    expect(payload.cases[5]?.state.currentRequiredMinimumBidSats).toBeNull();
    expect(payload.cases[5]?.state.noBidReleaseBlock).toBe(884320);
  });

  it("can derive a shared auction bid package from a website-facing case", async () => {
    const pkg = await createReservedAuctionLabBidPackage({
      caseId: "04-soft-close-google",
      bidderId: "operator_alpha",
      bidAmountSats: "1340000000"
    });

    expect(pkg.auctionId).toBe("04-soft-close-google");
    expect(pkg.name).toBe("google");
    expect(pkg.previewStatus).toBe("currently_valid");
    expect(pkg.wouldExtendSoftClose).toBe(true);
    expect(pkg.previewRequiredMinimumBidSats).toBe("1331000000");
  });

  it("refuses to create auction bid packages once a lot falls back to the ordinary lane", async () => {
    await expect(
      createReservedAuctionLabBidPackage({
        caseId: "06-released-sequoia",
        bidderId: "operator_alpha",
        bidAmountSats: "250000000"
      })
    ).rejects.toThrow(/fallen back to the ordinary lane/i);
  });
});
