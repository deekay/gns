import { describe, expect, it } from "vitest";

import { renderClientScript } from "../src/client-script";

describe("renderClientScript", () => {
  it("emits syntactically valid browser javascript", () => {
    const script = renderClientScript("");

    expect(script).toContain('elements.searchForm?.addEventListener("submit"');
    expect(script).toContain('window.addEventListener("popstate"');
    expect(() => new Function(script)).not.toThrow();
  });

  it("keeps claim inputs open when only a generated owner key is present", () => {
    const script = renderClientScript("");

    expect(script).toContain("if (hasGeneratedOwnerKey) {");
    expect(script).toContain('setDetailsOpen(elements.claimStepInputs, true);');
    expect(script).toContain('setDetailsOpen(elements.claimStepBackups, true);');
  });

  it("includes batched claim activity and provenance handling", () => {
    const script = renderClientScript("");

    expect(script).toContain('eventTypes.includes("BATCH_REVEAL")');
    expect(script).toContain('eventTypes.includes("BATCH_ANCHOR")');
    expect(script).toContain("Anchor Txid");
    expect(script).toContain("Merkle Root");
    expect(script).toContain("Proof Chunks");
  });

  it("includes private signet batch smoke status handling", () => {
    const script = renderClientScript("");

    expect(script).toContain('/api/private-batch-smoke-status');
    expect(script).toContain("privateBatchSmokeStatus");
    expect(script).toContain("renderPrivateBatchSmokeStatus");
    expect(script).toContain("Batch Commit Txid");
    expect(script).toContain("Open alpha detail");
    expect(script).toContain("privateDemoBasePath");
    expect(script).toContain('withBasePath("/claim/offline", privateDemoBasePath)');
  });

  it("includes private signet auction smoke status handling", () => {
    const script = renderClientScript("");

    expect(script).toContain('/api/private-auction-smoke-status');
    expect(script).toContain("privateAuctionSmokeStatus");
    expect(script).toContain("renderPrivateAuctionSmokeStatus");
    expect(script).toContain("Opening Bid Txid");
    expect(script).toContain("Higher Bid Txid");
    expect(script).toContain("Open private auction lab");
    expect(script).toContain("getPrivateDemoBasePath");
  });

  it("includes auction lab handling", () => {
    const script = renderClientScript("");

    expect(script).toContain('/api/auctions');
    expect(script).toContain('/api/experimental-auctions');
    expect(script).toContain('/api/auction-bid-package');
    expect(script).toContain("renderAuctionLab");
    expect(script).toContain("renderExperimentalAuctionFeed");
    expect(script).toContain("renderAuctionPolicySummary");
    expect(script).toContain("renderExperimentalAuctionCard");
    expect(script).toContain("formatAuctionBondStatus");
    expect(script).toContain("formatAuctionBondSpendStatus");
    expect(script).toContain("renderAuctionBidPackageComposer");
    expect(script).toContain("setAuctionBidPackageMessage");
    expect(script).toContain("Soft-close increment");
    expect(script).toContain("Next valid bid (extends close)");
    expect(script).toContain("Accepted capital locked");
    expect(script).toContain("State commitment");
    expect(script).toContain("Bond spend");
    expect(script).toContain("isAuctionsPage");
  });
});
