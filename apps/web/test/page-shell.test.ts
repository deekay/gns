import { describe, expect, it } from "vitest";

import { renderPageHtml } from "../src/page-shell";

const baseOptions = {
  basePath: "",
  faviconDataUrl: "data:image/svg+xml;base64,AA==",
  includeLiveSmoke: false,
  includePrivateBatchSmoke: true,
  includePrivateAuctionSmoke: true,
  networkLabel: "private signet",
  privateSignetElectrumEndpoint: "opennametags.org:50001:t",
  privateSignetFundingAmountSats: 50_000n,
  privateSignetFundingEnabled: true
} as const;

describe("renderPageHtml", () => {
  it("keeps the homepage focused on the core framing and next paths", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "home"
    });

    expect(html).toContain("Human-Readable Names You Can Actually Own");
    expect(html).toContain("human-readable name with verifiable ownership");
    expect(html).toContain("Ownership is anchored to Bitcoin and publicly auditable.");
    expect(html).toContain("It is bonded, not rented.");
    expect(html).toContain("Maps To Destinations");
    expect(html).toContain("payment, web, professional, messaging, and other owner-signed destinations");
    expect(html).toContain("$alice1234");
    expect(html).toContain("alice.example");
    expect(html).toContain("One Name, Many Destinations");
    expect(html).toContain("On-chain");
    expect(html).toContain("Small Bitcoin footprint");
    expect(html).toContain("destination-example-name mono");
    expect(html).toContain(">alice<");
    expect(html).toContain("Claim establishes owner");
    expect(html).toContain("Resolvers");
    expect(html).toContain("Store current off-chain data");
    expect(html).toContain("Resolvers store the current owner-signed bundle for <span class=\"mono\">alice</span>");
    expect(html).toContain("Clients");
    expect(html).toContain("Clients combine Bitcoin ownership with resolver data");
    expect(html).toContain("Cash App");
    expect(html).toContain("Lightning (BOLT12)");
    expect(html).toContain("lno1q...9sa");
    expect(html).toContain("alice@example.com");
    expect(html).toContain("+1 415 555 0123");
    expect(html).toContain("LinkedIn");
    expect(html).toContain("linkedin.com/in/alice");
    expect(html).toContain("alice_12");
    expect(html).toContain("alice.example");
    expect(html).toContain("Choose A Path");
    expect(html).toContain("Understand ONT");
    expect(html).toContain("Try The Prototype");
    expect(html).toContain("Explore The Registry");
    expect(html).toContain("Offline architect");
    expect(html).toContain("Auctions");
    expect(html).not.toContain("Current Status");
    expect(html).not.toContain("Private Signet Batch Smoke");
    expect(html).not.toContain("claimdemo");
    expect(html.indexOf(">Bitcoin<")).toBeLessThan(html.indexOf(">Cash App<"));
    expect(html.indexOf("bc1qxy...0wlh")).toBeLessThan(html.indexOf("$alice1234"));
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

  it("adds the overview nav entry and keeps overview as the main explanatory page", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "explainer"
    });

    expect(html).toContain(">Overview<");
    expect(html).toContain(">Auctions<");
    expect(html).toContain("How It Works");
    expect(html).toContain("One Name, Many Destinations");
    expect(html).toContain("bc1qxy...0wlh");
    expect(html).toContain("Store current off-chain data");
    expect(html).toContain("Resolve and act");
    expect(html).toContain("Use The Current Prototype");
    expect(html).toContain("Current Status");
    expect(html).toContain("Works Today");
    expect(html).toContain("Launch Spec v0");
    expect(html).not.toContain("What ONT Is");
  });

  it("renders the auctions page", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "auctions"
    });

    expect(html).toContain("Auctions");
    expect(html).toContain("Reserved Name Auction States");
    expect(html).toContain("auctionLabList");
    expect(html).toContain("auctionPolicyControls");
    expect(html).toContain("No-bid release blocks");
    expect(html).toContain("Apply simulator override");
    expect(html).toContain("Chain-Derived Bid Feed");
    expect(html).toContain("experimentalAuctionList");
    expect(html).toContain("privateAuctionSmokeResult");
    expect(html).toContain("Current Scope");
    expect(html).toContain("Auction bid-package handoffs");
    expect(html).toContain("Same-bidder replacement");
    expect(html).toContain("no-bid release");
    expect(html).toContain("ordinary lane");
    expect(html).toContain("stronger soft-close increment rule");
    expect(html).toContain("bond spend/release summaries");
  });

  it("renders the values page fanout controls", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "values"
    });

    expect(html).toContain("Publish An Off-Chain Value");
    expect(html).toContain("valuePublishModeNote");
    expect(html).toContain("publishValueFanoutButton");
    expect(html).toContain("configured resolver set");
    expect(html).toContain("cashapp -&gt; $alice1234");
    expect(html).toContain("Keys are app-defined and repeatable.");
  });
});
