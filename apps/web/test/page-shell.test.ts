import { describe, expect, it } from "vitest";

import { renderPageHtml } from "../src/page-shell";

const baseOptions = {
  basePath: "",
  faviconDataUrl: "data:image/svg+xml;base64,AA==",
  includeLiveSmoke: false,
  includePrivateBatchSmoke: true,
  includePrivateAuctionSmoke: true,
  networkLabel: "private signet",
  privateSignetElectrumEndpoint: "globalnamesystem.org:50001:t",
  privateSignetFundingAmountSats: 50_000n,
  privateSignetFundingEnabled: true
} as const;

describe("renderPageHtml", () => {
  it("surfaces the payment-handle framing and current docs on the home page", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "home"
    });

    expect(html).toContain("Human-Readable Names You Can Actually Own");
    expect(html).toContain("payment handle you control");
    expect(html).toContain("Open offline architect");
    expect(html).toContain("Open auction lab");
    expect(html).toContain("GNS_FROM_ZERO.md");
    expect(html).toContain("GNS_IMPLEMENTATION_AND_VALIDATION.md");
    expect(html).toContain("MERKLE_BATCHING_STATUS.md");
    expect(html).toContain("LAUNCH_SPEC_V0.md");
    expect(html).toContain("Private Signet Batch Smoke");
    expect(html).toContain("Private Signet Auction Smoke");
    expect(html).toContain("best live-chain proof for the current ordinary-lane Merkle batching path");
    expect(html).toContain("current live-chain proof for the experimental reserved-auction slice");
    expect(html).toContain("claimdemo");
    expect(html).toContain("valuedemo");
    expect(html).toContain("transferdemo");
  });

  it("keeps explore focused on the current private-signet demo surfaces", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "explore"
    });

    expect(html).not.toContain("Legacy Public Signet Smoke");
    expect(html).toContain("Private Signet Batch Smoke");
    expect(html).toContain("privateBatchSmokeResult");
  });

  it("surfaces the private signet batch smoke panel when enabled", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "explore"
    });

    expect(html).toContain("Private Signet Batch Smoke");
    expect(html).toContain("one batch anchor, later per-name reveals");
    expect(html).toContain("privateBatchSmokeResult");
  });

  it("adds the overview nav entry", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "explainer"
    });

    expect(html).toContain(">Overview<");
    expect(html).toContain(">Auctions<");
    expect(html).toContain("Use The Current Prototype");
    expect(html).toContain("Implementation status");
  });

  it("renders the auction lab page", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "auctions"
    });

    expect(html).toContain("Experimental Reserved Auction Lab");
    expect(html).toContain("Reserved Auction States");
    expect(html).toContain("auctionLabList");
    expect(html).toContain("auctionPolicyControls");
    expect(html).toContain("No-bid release blocks");
    expect(html).toContain("Apply simulator override");
    expect(html).toContain("Chain-Derived Experimental Bids");
    expect(html).toContain("experimentalAuctionList");
    expect(html).toContain("privateAuctionSmokeResult");
    expect(html).toContain("What This Covers");
    expect(html).toContain("Experimental bid-package handoffs");
    expect(html).toContain("Same-bidder replacement");
    expect(html).toContain("no-bid release");
    expect(html).toContain("ordinary lane");
    expect(html).toContain("stronger soft-close increment rule");
    expect(html).toContain("bond spend/release summaries");
  });
});
