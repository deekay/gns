import { describe, expect, it } from "vitest";

import {
  createExperimentalAuctionFeedBidPackage,
  createLaunchAuctionLabBidPackage,
  loadLaunchAuctionLab
} from "../src/auction-lab.js";

describe("loadLaunchAuctionLab", () => {
  it("loads curated auction fixtures with visible phase coverage", async () => {
    const payload = await loadLaunchAuctionLab();

    expect(payload.kind).toBe("auction_lab");
    expect(payload.cases.length).toBeGreaterThanOrEqual(5);
    expect(payload.cases.map((entry) => entry.state.phase)).toEqual([
      "pending_unlock",
      "awaiting_opening_bid",
      "live_bidding",
      "soft_close",
      "settled"
    ]);
    expect(payload.cases[0]?.state.currentRequiredMinimumBidSats).toBe("3125000");
    expect(payload.cases[4]?.state.currentLeaderBidderId).toBe("speculator_d");
    expect(payload.cases.map((entry) => entry.state.phase)).not.toContain("closed_without_winner");
  });

  it("can derive a shared auction bid package from a website-facing case", async () => {
    const pkg = await createLaunchAuctionLabBidPackage({
      caseId: "04-soft-close-nvidia",
      bidderId: "operator_alpha",
      ownerPubkey: "11".repeat(32),
      bidAmountSats: "1340000000"
    });

    expect(pkg.auctionId).toBe("04-soft-close-nvidia");
    expect(pkg.name).toBe("nvidia");
    expect(pkg.previewStatus).toBe("currently_valid");
    expect(pkg.wouldExtendSoftClose).toBe(true);
    expect(pkg.previewRequiredMinimumBidSats).toBe("1331000000");
  });

  it("can derive a bid package from resolver-derived experimental auction state", () => {
    const pkg = createExperimentalAuctionFeedBidPackage({
      auction: {
        auctionId: "private-openai",
        normalizedName: "openai",
        auctionClassId: "launch_name",
        classLabel: "Major Existing Name",
        currentBlockHeight: 123456,
        phase: "soft_close",
        unlockBlock: 123440,
        auctionCloseBlockAfter: 123460,
        openingMinimumBidSats: "250000000",
        currentLeaderBidderCommitment: "11".repeat(16),
        currentHighestBidSats: "300000000",
        currentRequiredMinimumBidSats: "330000000",
        settlementLockBlocks: 1440,
        blocksUntilUnlock: 0,
        blocksUntilClose: 4
      },
      bidderId: "operator_beta",
      ownerPubkey: "22".repeat(32),
      bidAmountSats: "330000000"
    });

    expect(pkg.auctionId).toBe("private-openai");
    expect(pkg.previewStatus).toBe("currently_valid");
    expect(pkg.wouldExtendSoftClose).toBe(true);
    expect(pkg.previewRequiredMinimumBidSats).toBe("330000000");
  });

  it("refuses resolver-derived bid packages after settlement", () => {
    expect(() =>
      createExperimentalAuctionFeedBidPackage({
        auction: {
          auctionId: "private-openai",
          normalizedName: "openai",
          auctionClassId: "launch_name",
          classLabel: "Major Existing Name",
          currentBlockHeight: 123470,
          phase: "settled",
          unlockBlock: 123440,
          auctionCloseBlockAfter: 123460,
          openingMinimumBidSats: "250000000",
          currentLeaderBidderCommitment: "11".repeat(16),
          currentHighestBidSats: "330000000",
          currentRequiredMinimumBidSats: null,
          settlementLockBlocks: 1440,
          blocksUntilUnlock: 0,
          blocksUntilClose: 0
        },
        bidderId: "operator_beta",
        bidAmountSats: "350000000"
      })
    ).toThrow(/already settled/i);
  });

  it("keeps legacy no-bid close states out of the public lab payload", async () => {
    const payload = await loadLaunchAuctionLab({
      policyOverrides: {
        noBidReleaseBlocks: 10_000
      }
    });

    expect(payload.policy.auction.noBidReleaseBlocks).toBe(10_000);
    expect(payload.cases.map((entry) => entry.id)).not.toContain("06-released-nike");
    expect(payload.cases.map((entry) => entry.state.phase)).not.toContain("closed_without_winner");
  });
});
