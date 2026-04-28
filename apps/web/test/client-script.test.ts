import { describe, expect, it } from "vitest";

import { renderClientScript } from "../src/client-script";

describe("renderClientScript", () => {
  it("emits syntactically valid browser javascript", () => {
    const script = renderClientScript("");

    expect(script).toContain('elements.searchForm?.addEventListener("submit"');
    expect(script).toContain('window.addEventListener("popstate"');
    expect(() => new Function(script)).not.toThrow();
  });

  it("carries searched names into the auction page route", () => {
    const script = renderClientScript("");

    expect(script).toContain("const initialAuctionName = getInitialAuctionName();");
    expect(script).toContain("function getInitialAuctionName()");
    expect(script).toContain("return getInitialNameQueryParam();");
    expect(script).toContain("updateLookupHistory(normalizedName)");
    expect(script).toContain("updateAuctionHistory(name)");
    expect(script).toContain('baseAuctionsPath + "?name=" + encodeURIComponent(normalizedName)');
    expect(script).toContain('href="${escapeHtml(buildAuctionsPath(name))}">Open auction for');
    expect(script).toContain('href="#opening-bid-${escapeHtml(name)}">Open auction');
    expect(script).toContain("renderOpeningBidComposer(name)");
    expect(script).toContain('/api/auction-opening-bid-package');
    expect(script).toContain("getInitialDetailName() ?? getInitialAuctionName()");
  });

  it("includes private signet auction smoke status handling", () => {
    const script = renderClientScript("");

    expect(script).toContain('/api/private-auction-smoke-status');
    expect(script).toContain("privateAuctionSmokeStatus");
    expect(script).toContain("renderPrivateAuctionSmokeStatus");
    expect(script).toContain("Opening Bid Txid");
    expect(script).toContain("Higher Bid Txid");
    expect(script).not.toContain("Late Bid Txid");
    expect(script).not.toContain("Late Bid Outcome");
    expect(script).toContain("Winner handoff");
    expect(script).toContain("Workflow proved");
    expect(script).toContain("Winner destination sequence");
    expect(script).toContain("Winner bond release spend");
    expect(script).toContain("Post-release transfer Txid");
    expect(script).toContain("Transferred owner");
    expect(script).toContain("Transferred destination sequence");
    expect(script).toContain("Open settled name");
    expect(script).toContain("renderPrivateAuctionWorkflowSummary");
    expect(script).toContain("renderPrivateAuctionWinnerHandoffCopy");
    expect(script).toContain("Open private auction lab");
    expect(script).toContain("getPrivateDemoBasePath");
  });

  it("includes explicit cooperative sale-transfer guidance", () => {
    const script = renderClientScript("");

    expect(script).toContain("atomic_same_transaction_for_sale");
    expect(script).toContain("coordinated_handoff_pending_two_party_signing_flow");
    expect(script).toContain("Do not split payment and transfer into separate promises.");
    expect(script).toContain("Do not treat payment and name transfer as separate promises.");
    expect(script).toContain("not yet a full two-party signing wizard for buyer and seller");
    expect(script).toContain("Current website boundary: this page exports a coordinated handoff rather than a full two-party signing wizard.");
    expect(script).toContain("Generating a local browser key for the buyer...");
    expect(script).toContain("buildSellerTransferNotesText");
    expect(script).toContain("buildBuyerTransferNotesText");
    expect(script).toContain("buildSellerTransferPackage");
    expect(script).toContain("buildBuyerTransferPackage");
    expect(script).toContain("Generated Recipient Key");
    expect(script).toContain("data-download-transfer-generated-owner-key");
    expect(script).toContain("data-use-transfer-generated-owner-key");
    expect(script).toContain("Current Owner");
    expect(script).toContain("Receiver");
    expect(script).toContain("parseTransferPackageForReview");
    expect(script).toContain("renderTransferPackageReview");
    expect(script).toContain("buildTransferPackageReviewChecklist");
    expect(script).toContain("reviewTransferPackageButton");
  });

  it("includes browser-local key generation and hosted helper fallback", () => {
    const script = renderClientScript("");

    expect(script).toContain('KEY_TOOLS_MODULE_PATH');
    expect(script).toContain('import(KEY_TOOLS_MODULE_PATH)');
    expect(script).toContain("generateLocalBrowserOwnerKey");
    expect(script).toContain("generateHostedDemoOwnerKey");
    expect(script).toContain("Generating a local browser key for the buyer...");
    expect(script).toContain("Creating an owner key in this browser for this bid...");
    expect(script).toContain("sourceLabel: \"local browser\"");
    expect(script).toContain("sourceLabel: \"server test key\"");
    expect(script).not.toContain("claimDraft");
  });

  it("shows a clear empty-state when no activity is visible", () => {
    const script = renderClientScript("");

    expect(script).toContain("renderExploreEmptyState");
    expect(script).toContain("renderExploreResolverEmptyCard");
    expect(script).toContain("exploreEmptyStateMessage");
    expect(script).toContain("resolverHasVisibleState");
    expect(script).toContain("No activity yet");
    expect(script).toContain("No Owned Names Yet");
    expect(script).toContain("after auctions settle or transfers are published");
    expect(script).toContain("No owned names visible yet.");
  });

  it("includes auction lab handling", () => {
    const script = renderClientScript("");

    expect(script).toContain('/api/auctions');
    expect(script).toContain('/api/experimental-auctions');
    expect(script).toContain('/api/auction-bid-package');
    expect(script).toContain('/api/auction-opening-bid-package');
    expect(script).toContain('/api/experimental-auction-bid-package');
    expect(script).toContain("reloadAuctionLab");
    expect(script).not.toContain("getAuctionLabPolicyOverridesFromLocation");
    expect(script).toContain("renderAuctionLab");
    expect(script).toContain("renderExperimentalAuctionFeed");
    expect(script).toContain("renderAuctionPolicySummary");
    expect(script).toContain("renderExperimentalAuctionCard");
    expect(script).toContain("Preview or download bid package");
    expect(script).toContain("Preview bid package");
    expect(script).toContain("Bidder label");
    expect(script).toContain("stable identifier for the bidding entity");
    expect(script).toContain("package derives a bidder commitment from it");
    expect(script).toContain("renderAuctionBidPackagePreview");
    expect(script).toContain("buildAuctionBidPackageForUi");
    expect(script).toContain("resolver-derived state");
    expect(script).toContain("formatAuctionBondStatus");
    expect(script).toContain("formatAuctionBondSpendStatus");
    expect(script).toContain("renderAuctionBidPackageComposer");
    expect(script).toContain("Prepare opening bid package");
    expect(script).toContain("Bond amount (₿)");
    expect(script).toContain("parseBitcoinAmountToSats");
    expect(script).toContain("data-auction-package-preview");
    expect(script).toContain("data-auction-owner-key-action");
    expect(script).toContain("data-auction-owner-key-result");
    expect(script).toContain("setAuctionBidPackageMessage");
    expect(script).toContain("setAuctionOwnerKeyHelperMessage");
    expect(script).toContain("renderAuctionOwnerKeyHelper");
    expect(script).toContain("Generated Auction Owner Key");
    expect(script).toContain("Creating an owner key in this browser for this bid...");
    expect(script).toContain("Requesting a server-generated test owner key for this bid...");
    expect(script).toContain("Create In This Browser");
    expect(script).toContain("Use Server Test Key");
    expect(script).not.toContain("Closed without winner");
    expect(script).toContain("No current owner is recorded for this name.");
    expect(script).toContain("A valid bonded opening bid can start the auction.");
    expect(script).toContain("No auction exists for this name until that opening bid confirms.");
    expect(script).not.toContain("not owned here");
    expect(script).not.toContain("No current owner found in this resolver.");
    expect(script).toContain("Base floor");
    expect(script).toContain('blockText + " (~" + approx + ")"');
    expect(script).toContain('formatApproxDurationUnit(days / 30, "month")');
    expect(script).toContain("Preview or download bid package");
    expect(script).toContain("Late-bid step");
    expect(script).toContain("Next valid bid (extends close)");
    expect(script).toContain("Accepted capital locked");
    expect(script).toContain("State commitment");
    expect(script).toContain("Bond spend");
    expect(script).toContain("After Settlement");
    expect(script).toContain("Open live name detail page");
    expect(script).toContain("Publish or update destinations");
    expect(script).toContain("Prepare transfer (bond maturing)");
    expect(script).toContain("renderSettledAuctionHandoff");
    expect(script).toContain("shouldLoadAuctionRulesOrReference");
  });
});
