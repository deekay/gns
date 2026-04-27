import { describe, expect, it } from "vitest";

import { renderPageHtml } from "../src/page-shell";

const baseOptions = {
  basePath: "",
  faviconDataUrl: "data:image/svg+xml;base64,AA==",
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

    expect(html).toContain("Human-readable names you can actually own");
    expect(html).toContain("Open an auction when a name is eligible.");
    expect(html).toContain("Single auction flow");
    expect(html).toContain("Self-custodied bond");
    expect(html).toContain("Owner-signed destinations");
    expect(html).toContain("Check a name");
    expect(html).toContain("Resolve ownership or see whether the next step is the auction flow.");
    expect(html).toContain("Before a bid");
    expect(html).toContain("Eligible or not eligible");
    expect(html).toContain("After a bonded opening bid");
    expect(html).toContain("Auction clock starts");
    expect(html).toContain("1-4 character names wait for the later short-name wave.");
    expect(html).toContain("Choose A Path");
    expect(html).toContain("Understand ONT");
    expect(html).toContain("Try The Prototype");
    expect(html).toContain("Explore The Registry");
    expect(html).toContain("Walk Through");
    expect(html).toContain("From Zero");
    expect(html).toContain("site-footer");
    expect(html).toContain(">Learn<");
    expect(html).toContain(">Try<");
    expect(html).not.toContain("Offline architect");
    expect(html).toContain("Advanced");
    expect(html).not.toContain("More links");
    expect(html).not.toContain("Anchored To Bitcoin");
    expect(html).not.toContain("Bonded, Not Rented");
    expect(html).not.toContain("Costly To Hoard");
    expect(html).not.toContain("Maps To Destinations");
    expect(html).not.toContain("Two ideas shape ONT.");
    expect(html).not.toContain("Eligible names use one auction lane.");
    expect(html).not.toContain("One Name, Many Destinations");
    expect(html).not.toContain("Small Bitcoin footprint");
    expect(html).not.toContain("Resolvers store the current owner-signed bundle for <span class=\"mono\">alice</span>");
    expect(html).not.toContain("Current Status");
  });

  it("keeps explore focused on the current private-signet demo surfaces", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "explore"
    });

    expect(html).toContain("explore-cluster");
    expect(html).toContain("explore-empty-state");
    expect(html).toContain("Resolver Empty Right Now?");
    expect(html).not.toContain("Legacy Public Signet Smoke");
  });

  it("adds the overview nav entry and keeps overview as the main explanatory page", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "explainer"
    });

    expect(html).toContain(">Overview<");
    expect(html).toContain(">Advanced<");
    expect(html).toContain('href="#how-ont-works"');
    expect(html).toContain("Overview sections");
    expect(html).toContain("How it works");
    expect(html).toContain("How It Works");
    expect(html).toContain("Follow one name from Bitcoin ownership to the destinations apps can use.");
    expect(html).toContain("protocol-flow");
    expect(html).toContain("Win At Auction");
    expect(html).toContain("Bitcoin establishes that <span class=\"mono\">alice</span> is controlled by an owner key");
    expect(html).toContain("Publish Off-Chain");
    expect(html).toContain("Resolvers store that signed record.");
    expect(html).toContain("<strong class=\"mono\">bc1qxy...0wlh</strong>");
    expect(html).toContain("<strong class=\"mono\">alice@example.com</strong>");
    expect(html).toContain("Resolve And Verify");
    expect(html).toContain("website -&gt; alice.example");
    expect(html).toContain("One Name, Many Destinations");
    expect(html).toContain("The chain owns the name. The signed record says what it points to right now.");
    expect(html).toContain("destination-map");
    expect(html).toContain("Bitcoin anchor");
    expect(html).toContain("Latest owner-signed bundle");
    expect(html).toContain("bc1qxy...0wlh");
    expect(html).toContain("Small on-chain footprint, flexible off-chain records");
    expect(html).not.toContain("For example, an on-chain claim can establish:");
    expect(html).not.toContain("One owner-signed bundle can carry entries like:");
    expect(html).toContain("Use The Website");
    expect(html).toContain("Current Status");
    expect(html).toContain("Works Today");
    expect(html).toContain("Read Next");
    expect(html).toContain("Read from zero");
    expect(html).toContain("Launch Spec v0");
    expect(html).not.toContain("What ONT Is");
  });

  it("renders the advanced page as the hub for expert surfaces", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "advanced"
    });

    expect(html).toContain("Advanced Tools");
    expect(html).toContain("When To Use This Area");
    expect(html).toContain("Most People Can Ignore This");
    expect(html).toContain("Open auctions");
    expect(html).toContain("Testing guide");
    expect(html).toContain("Launch spec");
    expect(html).toContain(">Advanced<");
    expect(html).not.toContain("policy controls");
  });

  it("renders the auctions page", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "auctions"
    });

    expect(html).toContain("Auctions");
    expect(html).toContain(">Auctions<");
    expect(html).toContain(">Advanced<");
    expect(html).toContain("Auction Flow Examples");
    expect(html).toContain("auctionLabList");
    expect(html).toContain("Auction bid prep and flow examples");
    expect(html).toContain("Auction flow surface");
    expect(html).toContain("Current website defaults");
    expect(html).toContain("read-only on purpose");
    expect(html).toContain("use the CLI instead of the website");
    expect(html).toContain("Observed Auction Activity");
    expect(html).toContain("experimentalAuctionList");
    expect(html).toContain("privateAuctionSmokeResult");
    expect(html).toContain("Launch Status");
    expect(html).toContain("Auction bid-package handoffs");
    expect(html).toContain("Same-bidder replacement");
    expect(html).toContain("valid bonded opening bid");
    expect(html).not.toContain("no-winner close");
    expect(html).toContain("single-lane launch model");
    expect(html).toContain("stronger soft-close increment rule");
    expect(html).toContain("bond spend/release summaries");
    expect(html).toContain("working defaults");
  });

  it("renders the simplified values page", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "values"
    });

    expect(html).toContain("value-intake-grid");
    expect(html).toContain("What You Need");
    expect(html).toContain("Update A Name's Destinations");
    expect(html).toContain("Edit Destinations And Sign");
    expect(html).toContain("Sign Destination Update");
    expect(html).toContain("Publish Destinations");
    expect(html).toContain("valuePublishModeNote");
    expect(html).not.toContain("publishValueFanoutButton");
    expect(html).toContain("Use the CLI for raw payloads, custom formats, or multi-resolver fanout.");
    expect(html).toContain("cashapp -&gt; $alice1234");
    expect(html).not.toContain("Value Format");
    expect(html).not.toContain("Derived Owner Pubkey");
    expect(html).not.toContain("Owner Private Key (32-byte hex)");
    expect(html).toContain("Find A Live Name First");
    expect(html).toContain("Related tools");
  });

  it("renders the transfer page with atomic sale framing", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "transfer"
    });

    expect(html).toContain("transfer-role-workflow");
    expect(html).toContain("transfer-package-review-tool");
    expect(html).toContain("Transfer A Name");
    expect(html).toContain("Send or receive a name by moving control to a new owner key.");
    expect(html).toContain("The CLI and your signer finish the transaction.");
    expect(html).toContain("For Sales");
    expect(html).toContain("Do not treat payment and transfer as separate promises.");
    expect(html).toContain("The current implementation is not yet a full two-party PSBT wizard for buyer and seller.");
    expect(html).toContain("Start With Your Role");
    expect(html).toContain("Create Recipient Key");
    expect(html).toContain("Build The Transfer Handoff");
    expect(html).not.toContain("Use Demo Key From Server");
    expect(html).toContain("Recipient Pubkey (new control key)");
    expect(html).toContain("I am receiving a name");
    expect(html).toContain("I am sending a name");
    expect(html).toContain("inspect-transfer-package --role buyer");
    expect(html).toContain("Download Seller Package");
    expect(html).toContain("Download Buyer Package");
    expect(html).not.toContain("Download Shared Package");
    expect(html).toContain("Download Seller Notes");
    expect(html).toContain("Download Buyer Notes");
    expect(html).toContain("Seller Handoff");
    expect(html).toContain("Buyer Handoff");
    expect(html).not.toContain("Shared Transfer Plan");
    expect(html).toContain("Review A Transfer Package");
    expect(html).toContain("Package JSON");
    expect(html).toContain("Review Package");
    expect(html).toContain("transferPackageReviewResult");
    expect(html).toContain("Related tools");
  });

});
