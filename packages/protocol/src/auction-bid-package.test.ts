import { describe, expect, it } from "vitest";

import {
  AUCTION_BID_PACKAGE_FORMAT,
  AUCTION_BID_PACKAGE_VERSION,
  computeAuctionBidderCommitment,
  computeAuctionLotCommitment,
  createAuctionBidPackage,
  parseAuctionBidPackage,
  PROTOCOL_NAME
} from "./index.js";

describe("auction bid packages", () => {
  it("builds a preview for pending unlock states", () => {
    const pkg = createAuctionBidPackage({
      auctionId: "01-pending-unlock-google",
      name: "google",
      reservedClassId: "top_collision",
      classLabel: "Top collision / ultra-scarce",
      currentBlockHeight: 95_000,
      phase: "pending_unlock",
      unlockBlock: 95_144,
      auctionCloseBlockAfter: null,
      openingMinimumBidSats: 1_000_000_000n,
      currentLeaderBidderId: null,
      currentHighestBidSats: null,
      currentRequiredMinimumBidSats: 1_000_000_000n,
      reservedLockBlocks: 525_600,
      bidderId: "operator_a",
      bidAmountSats: 1_000_000_000n,
      exportedAt: "2026-04-11T19:00:00.000Z"
    });

    expect(pkg.format).toBe(AUCTION_BID_PACKAGE_FORMAT);
    expect(pkg.packageVersion).toBe(AUCTION_BID_PACKAGE_VERSION);
    expect(pkg.protocol).toBe(PROTOCOL_NAME);
    expect(pkg.previewStatus).toBe("too_early");
    expect(pkg.previewRequiredMinimumBidSats).toBe("1000000000");
    expect(pkg.wouldBecomeLeader).toBe(false);
    expect(pkg.previewSummary).toContain("pending unlock");
    expect(pkg.bidderCommitment).toBe(computeAuctionBidderCommitment("operator_a"));
    expect(pkg.currentLeaderBidderCommitment).toBeNull();
    expect(pkg.auctionLotCommitment).toBe(
      computeAuctionLotCommitment({
        auctionId: "01-pending-unlock-google",
        name: "google",
        reservedClassId: "top_collision",
        unlockBlock: 95_144
      })
    );
    expect(pkg.auctionStateCommitment).toHaveLength(64);
  });

  it("builds a valid soft-close preview when the amount clears the next minimum", () => {
    const pkg = createAuctionBidPackage({
      auctionId: "04-soft-close-google",
      name: "google",
      reservedClassId: "top_collision",
      classLabel: "Top collision / ultra-scarce",
      currentBlockHeight: 100_288,
      phase: "soft_close",
      unlockBlock: 96_000,
      auctionCloseBlockAfter: 100_432,
      openingMinimumBidSats: 1_000_000_000n,
      currentLeaderBidderId: "speculator_d",
      currentHighestBidSats: 1_600_000_000n,
      currentRequiredMinimumBidSats: 1_680_000_000n,
      reservedLockBlocks: 525_600,
      bidderId: "operator_b",
      bidAmountSats: 1_700_000_000n,
      exportedAt: "2026-04-11T19:00:00.000Z"
    });

    expect(pkg.previewStatus).toBe("currently_valid");
    expect(pkg.previewRequiredMinimumBidSats).toBe("1680000000");
    expect(pkg.wouldBecomeLeader).toBe(true);
    expect(pkg.wouldExtendSoftClose).toBe(true);
    expect(pkg.currentLeaderBidderCommitment).toBe(
      computeAuctionBidderCommitment("speculator_d")
    );

    expect(parseAuctionBidPackage(pkg)).toEqual(pkg);
  });

  it("rejects packages whose preview fields no longer match the observed state", () => {
    const pkg = createAuctionBidPackage({
      auctionId: "02-awaiting-opening",
      name: "sequoia",
      reservedClassId: "major_existing_name",
      classLabel: "Major existing name",
      currentBlockHeight: 99_000,
      phase: "awaiting_opening_bid",
      unlockBlock: 99_000,
      auctionCloseBlockAfter: null,
      openingMinimumBidSats: 200_000_000n,
      currentLeaderBidderId: null,
      currentHighestBidSats: null,
      currentRequiredMinimumBidSats: 200_000_000n,
      reservedLockBlocks: 262_800,
      bidderId: "operator_c",
      bidAmountSats: 150_000_000n,
      exportedAt: "2026-04-11T19:00:00.000Z"
    });

    expect(() =>
      parseAuctionBidPackage({
        ...pkg,
        previewStatus: "currently_valid"
      })
    ).toThrow(/previewStatus/);
  });
});
