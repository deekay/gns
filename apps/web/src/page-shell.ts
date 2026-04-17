import { PRODUCT_NAME, REVEAL_WINDOW_BLOCKS } from "@ont/protocol";

export type PageKind = "home" | "explore" | "auctions" | "claim" | "values" | "transfer" | "setup" | "explainer";
const GITHUB_REPO_URL = "https://github.com/deekay/ont";
const GITHUB_BLOB_BASE_URL = `${GITHUB_REPO_URL}/blob/main`;
const DOC_URLS = {
  readme: `${GITHUB_BLOB_BASE_URL}/README.md`,
  fromZero: `${GITHUB_BLOB_BASE_URL}/docs/core/ONT_FROM_ZERO.md`,
  implementation: `${GITHUB_BLOB_BASE_URL}/docs/research/ONT_IMPLEMENTATION_AND_VALIDATION.md`,
  merkleStatus: `${GITHUB_BLOB_BASE_URL}/docs/research/MERKLE_BATCHING_STATUS.md`,
  launchSpec: `${GITHUB_BLOB_BASE_URL}/docs/research/LAUNCH_SPEC_V0.md`,
  testing: `${GITHUB_BLOB_BASE_URL}/docs/core/TESTING.md`
} as const;
const PRIVATE_DEMO_NAMES = {
  claim: "claimdemo",
  value: "valuedemo",
  transfer: "transferdemo"
} as const;

export interface PageShellOptions {
  basePath: string,
  faviconDataUrl: string,
  includeLiveSmoke: boolean,
  includePrivateBatchSmoke: boolean,
  includePrivateAuctionSmoke: boolean,
  networkLabel: string,
  pageKind: PageKind,
  privateSignetElectrumEndpoint: string | null,
  privateSignetFundingAmountSats: bigint,
  privateSignetFundingEnabled: boolean,
}

export function renderPageHtml(options: PageShellOptions): string {
  const {
    basePath,
    faviconDataUrl,
    includeLiveSmoke,
    includePrivateBatchSmoke,
    includePrivateAuctionSmoke,
    networkLabel,
    pageKind,
    privateSignetElectrumEndpoint,
    privateSignetFundingAmountSats,
    privateSignetFundingEnabled
  } = options;
  const title =
    pageKind === "home"
      ? PRODUCT_NAME
      : pageKind === "claim"
      ? `${PRODUCT_NAME} Claim Prep`
      : pageKind === "auctions"
      ? `${PRODUCT_NAME} Auctions`
      : pageKind === "values"
        ? `${PRODUCT_NAME} Value Publishing`
      : pageKind === "transfer"
        ? `${PRODUCT_NAME} Transfer Prep`
        : pageKind === "setup"
          ? `${PRODUCT_NAME} Setup`
        : pageKind === "explainer"
          ? `${PRODUCT_NAME} Overview`
          : `${PRODUCT_NAME} Explorer`;
  const description =
    pageKind === "home"
      ? "Search a name, inspect ownership, and choose whether to explore, claim, or review the current Open Name Tags prototype."
      : pageKind === "claim"
      ? "Prepare an Open Name Tags claim package, then finish the commit and reveal flow in Sparrow or another external signer."
      : pageKind === "auctions"
      ? "Current interface for the reserved-name auction flow, including policy controls, live states, and chain-derived bid activity."
      : pageKind === "values"
        ? "Sign an Open Name Tags value record locally in the browser, then publish the signed record to the resolver."
      : pageKind === "transfer"
        ? "Prepare an Open Name Tags transfer handoff, then finish the gift or sale flow in the CLI and your signer."
      : pageKind === "setup"
          ? "Set up Sparrow, connect to the hosted demo wallet endpoint, request demo coins, and complete the private signet walkthrough."
        : pageKind === "explainer"
          ? "Quick orientation for using the hosted Open Name Tags tools."
        : "Explorer for browsing claimed names and resolver status in Open Name Tags.";

  const pageScripts = [
    `<script type="module" src="${withBasePath("/app.js", basePath)}"></script>`,
    pageKind === "values"
      ? `<script type="module" src="${withBasePath("/value-tools.js", basePath)}"></script>`
      : ""
  ]
    .filter(Boolean)
    .join("\n    ");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta
      name="description"
      content="${escapeHtml(description)}"
    />
    <link rel="icon" href="${faviconDataUrl}" />
    <link rel="apple-touch-icon" href="${faviconDataUrl}" />
    <link rel="stylesheet" href="${withBasePath("/styles.css", basePath)}" />
  </head>
  <body data-base-path="${escapeHtml(basePath)}" data-page-kind="${escapeHtml(pageKind)}">
    <div class="page-shell">
      ${renderPrimaryNav(basePath, pageKind, faviconDataUrl)}
      ${renderHeroSection(basePath, networkLabel, pageKind)}
      <main class="content-grid">
        ${
          pageKind === "home"
            ? renderHomePageSections(basePath)
            : pageKind === "auctions"
            ? renderAuctionsPageSections(includePrivateAuctionSmoke)
            : pageKind === "claim"
            ? renderClaimPageSections(basePath, privateSignetFundingEnabled, privateSignetFundingAmountSats)
            : pageKind === "values"
              ? renderValuesPageSections(basePath)
            : pageKind === "transfer"
              ? renderTransferPageSections(basePath)
              : pageKind === "setup"
                ? renderSetupPageSections(basePath, privateSignetElectrumEndpoint, privateSignetFundingEnabled, privateSignetFundingAmountSats)
              : pageKind === "explainer"
                ? renderExplainerPageSections(basePath)
              : renderExplorePageSections(basePath, includeLiveSmoke, includePrivateBatchSmoke)
        }
      </main>
    </div>
    ${pageScripts}
  </body>
</html>`;
}

function renderHeroSection(
  _configuredBasePath: string,
  configuredNetworkLabel: string,
  pageKind: PageKind
): string {
  if (pageKind === "claim") {
    return `<header class="hero hero-single hero-page">
      <div class="hero-copy">
        <h1>Prepare A Claim</h1>
        <p class="lede">
          Claim details, backups, and signer files.
        </p>
        <p id="chainSummary" class="hero-status">
          ${escapeHtml(configuredNetworkLabel)} · Height - · 0 names · 0 pending
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "transfer") {
    return `<header class="hero hero-single hero-page">
      <div class="hero-copy">
        <h1>Prepare A Transfer</h1>
        <p class="lede">
          Move owner authority to a new pubkey, then finish the handoff in your signer and CLI flow.
        </p>
        <p id="chainSummary" class="hero-status">
          ${escapeHtml(configuredNetworkLabel)} · Height - · 0 names · 0 pending
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "values") {
    return `<header class="hero hero-single hero-page">
      <div class="hero-copy">
        <h1>Publish An Off-Chain Value</h1>
        <p class="lede">
          Load the current name state, sign a value record locally in the browser, then publish only the signed record. The website targets the hosted resolver; the CLI can fan the same signed JSON out to several resolvers.
        </p>
        <p id="chainSummary" class="hero-status">
          ${escapeHtml(configuredNetworkLabel)} · Height - · 0 names · 0 pending
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "explainer") {
    return `<header class="hero hero-single hero-page">
      <div class="hero-copy">
        <h1>Quick Overview</h1>
        <p class="lede">
          How the current prototype works, what is live today, and where to go next.
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "setup") {
    return `<header class="hero hero-single hero-page">
      <div class="hero-copy">
        <h1>Set Up Your Wallet</h1>
        <p class="lede">
          Sparrow, the hosted demo wallet endpoint, demo coins, and automatic confirmations for the private signet flow.
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "explore") {
    return `<header class="hero hero-single hero-page">
      <div class="hero-copy">
        <h1>Explore The Live Registry</h1>
        <p class="lede">
          Recent names, current activity, and the tracked registry.
        </p>
        <p id="chainSummary" class="hero-status">
          ${escapeHtml(configuredNetworkLabel)} · Height - · 0 names · 0 awaiting reveal
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "auctions") {
    return `<header class="hero hero-single hero-page">
      <div class="hero-copy">
        <h1>Auctions</h1>
        <p class="lede">
          Current interface for the reserved-name auction flow, including policy controls, simulated market states, and observed bid activity.
        </p>
        <p class="hero-status">
          Reserved-name flow · curated simulator states plus a chain-derived AUCTION_BID feed.
        </p>
      </div>
    </header>`;
  }

  return `<header class="hero hero-home">
    <div class="hero-copy hero-home-banner">
      <h1>Human-Readable Names You Can Actually Own</h1>
    </div>
    <div class="hero-home-grid">
      <article class="hero-copy hero-home-intro">
        <div class="hero-home-intro-copy">
          <p class="hero-card-label">What that means</p>
          <p class="lede">
            An ONT name is a human-readable name with verifiable ownership.
          </p>
        </div>
        <div class="hero-home-principles" aria-label="Name ownership summary">
          <article class="hero-home-principle">
            <div class="hero-home-principle-head">
              <p class="hero-home-principle-kicker">01</p>
              <h3>Anchored To Bitcoin</h3>
            </div>
            <p>Ownership is anchored to Bitcoin and publicly auditable.</p>
          </article>
          <article class="hero-home-principle">
            <div class="hero-home-principle-head">
              <p class="hero-home-principle-kicker">02</p>
              <h3>Bonded, Not Rented</h3>
            </div>
            <p>It is bonded, not rented.</p>
          </article>
          <article class="hero-home-principle">
            <div class="hero-home-principle-head">
              <p class="hero-home-principle-kicker">03</p>
              <h3>Costly To Hoard</h3>
            </div>
            <p>Claiming names requires bonded bitcoin, which makes large-scale hoarding costly.</p>
          </article>
          <article class="hero-home-principle">
            <div class="hero-home-principle-head">
              <p class="hero-home-principle-kicker">04</p>
              <h3>Maps To Destinations</h3>
            </div>
            <p>It can point to payment, web, professional, messaging, and other owner-signed destinations.</p>
          </article>
        </div>
      </article>
    </div>
  </header>`;
}

function renderPrimaryNav(configuredBasePath: string, pageKind: PageKind, faviconDataUrl: string): string {
  const links = [
    { href: withBasePath("/", configuredBasePath), label: "Home", active: pageKind === "home" },
    { href: withBasePath("/explainer", configuredBasePath), label: "Overview", active: pageKind === "explainer" },
    { href: withBasePath("/explore", configuredBasePath), label: "Explore", active: pageKind === "explore" },
    { href: withBasePath("/auctions", configuredBasePath), label: "Auctions", active: pageKind === "auctions" },
    { href: withBasePath("/claim", configuredBasePath), label: "Claim", active: pageKind === "claim" },
    { href: withBasePath("/values", configuredBasePath), label: "Values", active: pageKind === "values" },
    { href: withBasePath("/transfer", configuredBasePath), label: "Transfer", active: pageKind === "transfer" },
    { href: withBasePath("/setup", configuredBasePath), label: "Setup", active: pageKind === "setup" }
  ];

  return `<nav class="site-nav" aria-label="Primary">
    <a class="site-nav-brand" href="${withBasePath("/", configuredBasePath)}">
      <img class="site-nav-brand-mark" src="${faviconDataUrl}" alt="" aria-hidden="true" />
      <span>Open Name Tags</span>
    </a>
    <div class="site-nav-links">
      ${links
        .map(
          (link) =>
            `<a class="site-nav-link${link.active ? " is-active" : ""}" href="${link.href}">${escapeHtml(link.label)}</a>`
        )
        .join("")}
      <a class="site-nav-link site-nav-link-external" href="${GITHUB_REPO_URL}" target="_blank" rel="noreferrer noopener">GitHub</a>
    </div>
  </nav>`;
}

function renderInfoPopover(ariaLabel: string, body: string): string {
  return `<details class="info-popover">
    <summary class="info-popover-toggle" aria-label="${escapeHtml(ariaLabel)}" title="${escapeHtml(ariaLabel)}">i</summary>
    <div class="info-popover-card">${body}</div>
  </details>`;
}

function renderPanelHead(title: string, summary: string, infoBody?: string): string {
  return `<div class="panel-head">
    <div class="panel-head-main">
      <div class="panel-head-copy">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(summary)}</p>
      </div>
      ${infoBody ? renderInfoPopover(`More about ${title}`, infoBody) : ""}
    </div>
  </div>`;
}

function renderHomePageSections(configuredBasePath: string): string {
  return `${renderSearchSection()}
    ${renderHomeActionsSection(configuredBasePath)}
    ${renderHomeDestinationDiagramSection()}`;
}

function renderExplorePageSections(
  configuredBasePath: string,
  includeLiveSmoke: boolean,
  includePrivateBatchSmoke: boolean
): string {
  return `${renderOverviewSection()}
    ${renderRecentNamesSection()}
    ${renderActivitySection(true)}
    ${renderPendingSection(true)}
    ${renderNamesSection(true)}
    ${includeLiveSmoke ? renderLiveSmokeSection(true) : ""}
    ${includePrivateBatchSmoke ? renderPrivateBatchSmokeSection(true) : ""}
    ${renderNetworkDetailsSection(true)}`;
}

function renderAuctionsPageSections(includePrivateAuctionSmoke: boolean): string {
  return `${renderAuctionLabSection()}
    ${renderExperimentalAuctionFeedSection()}
    ${includePrivateAuctionSmoke ? renderPrivateAuctionSmokeSection(false) : ""}
    ${renderAuctionLabNotesSection()}`;
}

function renderClaimPageSections(
  configuredBasePath: string,
  _privateSignetFundingEnabled: boolean,
  _privateSignetFundingAmountSats: bigint
): string {
  return `${renderClaimPrepSection(configuredBasePath)}
    ${renderClaimSupportStrip(configuredBasePath)}`;
}

function renderTransferPageSections(configuredBasePath: string): string {
  return `${renderTransferPrepSection()}
    ${renderTransferGuideSection()}
    ${renderTransferSupportStrip(configuredBasePath)}`;
}

function renderValuesPageSections(configuredBasePath: string): string {
  return `${renderValuesToolSection()}
    ${renderValuesGuideSection(configuredBasePath)}
    ${renderValuesSupportStrip(configuredBasePath)}`;
}

function renderSetupPageSections(
  configuredBasePath: string,
  privateSignetElectrumEndpoint: string | null,
  privateSignetFundingEnabled: boolean,
  privateSignetFundingAmountSats: bigint
): string {
  return `${renderSetupQuickstartSection(configuredBasePath, privateSignetElectrumEndpoint)}
    ${privateSignetFundingEnabled ? renderSetupFundingSection(privateSignetFundingAmountSats) : ""}
    ${renderSetupSupportStrip(configuredBasePath)}`;
}

function renderExplainerPageSections(configuredBasePath: string): string {
  return `${renderHomeModelSection()}
    ${renderHomeDestinationDiagramSection()}
    ${renderUsingOntSection(configuredBasePath)}
    ${renderHomeDocsSection()}`;
}

function renderAuctionLabSection(): string {
  return `<section id="auction-lab" class="panel panel-list">
    ${renderPanelHead(
      "Reserved Name Auction States",
      "Current simulator-backed view of the reserved-name auction flow and policy controls.",
      `<p>This page shows the current auction surface in the prototype.</p>
      <ul>
        <li>The policy values are temporary and intentionally easy to change.</li>
        <li>The states come from the same simulator and fixtures used in automated tests.</li>
        <li>This is where we can review pending unlock, opening floor, no-bid release, live bidding, soft close, and settled outcomes in one place.</li>
      </ul>`
    )}
    <form id="auctionPolicyControls" class="draft-grid" autocomplete="off">
      <div class="field">
        <label class="field-label" for="auctionNoBidReleaseBlocksInput">No-bid release blocks</label>
        <input id="auctionNoBidReleaseBlocksInput" type="text" inputmode="numeric" placeholder="Use current default" />
      </div>
      <div class="draft-field-full">
        <div class="field-actions">
          <button type="submit">Apply simulator override</button>
          <button id="auctionPolicyResetButton" type="button">Reset defaults</button>
        </div>
        <p id="auctionPolicyControlsResult" class="tx-panel-note">This only changes the simulator-backed auction view and bid-package previews on this page.</p>
      </div>
    </form>
    <p id="auctionLabMeta" class="helper-text">Loading the current reserved-auction policy and state fixtures.</p>
    <div id="auctionPolicySummary" class="guide-grid"></div>
    <div id="auctionLabList" class="activity-list"></div>
  </section>`;
}

function renderExperimentalAuctionFeedSection(): string {
  return `<section id="experimental-auction-feed" class="panel panel-list">
    ${renderPanelHead(
      "Chain-Derived Bid Feed",
      "Resolver-backed auction state derived from observed AUCTION_BID transactions.",
      `<p>This sits one step closer to protocol behavior than the curated simulator view above.</p>
      <ul>
        <li>Lots still come from the current reserved-name auction catalog.</li>
        <li>Leaders, minimum next bids, stale-state rejection, and bond spend/release summaries are derived from observed AUCTION_BID transactions.</li>
        <li>Lots that attract no valid opening bid through the release window are marked as released back to the ordinary lane.</li>
        <li>Bids that merely clear the normal increment are not enough during soft close if they would extend the auction. Late extension bids use the stronger soft-close increment rule.</li>
        <li>Same-bidder replacement is only recognized when the later bid spends the prior bid bond outpoint.</li>
        <li>This feed is still derived and classified, not yet settled by a full reserved-auction engine.</li>
      </ul>`
    )}
    <p id="experimentalAuctionMeta" class="helper-text">Loading chain-derived auction state.</p>
    <div id="experimentalAuctionList" class="activity-list"></div>
  </section>`;
}

function renderAuctionLabNotesSection(): string {
  return `<section class="panel panel-guide">
    ${renderPanelHead(
      "Current Scope",
      "The auction surface is becoming part of the core story, but some pieces are still prototype-stage."
    )}
    <div class="guide-grid">
      <article class="guide-card">
        <h3>Implemented</h3>
        <ul class="guide-list">
          <li>Configurable reserved classes, opening floors, soft close, and minimum increments.</li>
          <li>An explicit no-bid release valve so lots can fall back to the ordinary lane instead of staying open forever.</li>
          <li>A stronger soft-close increment rule so bids that extend the clock must escalate more than ordinary mid-auction bids.</li>
          <li>Single-auction and market-level simulators with bidder budget pressure.</li>
          <li>CLI commands, fixture scenarios, and this website-facing auction state view.</li>
          <li>Auction bid-package handoffs from the CLI and directly from the auctions page.</li>
          <li>Chain-derived auction state from observed <code>AUCTION_BID</code> transactions, including stale bid rejection and derived bond spend/release summaries.</li>
          <li>Replacement-style rebids are now recognized only when the later bid spends the earlier bid bond.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Still In Progress</h3>
        <ul class="guide-list">
          <li>No full reserved-auction settlement engine yet.</li>
          <li>The chain-derived feed is still a prototype, not the final launch market.</li>
          <li>The values here are the current prototype defaults, not locked protocol parameters.</li>
        </ul>
      </article>
    </div>
  </section>`;
}

function renderHomeActionsSection(configuredBasePath: string): string {
  return `<section id="start-here" class="panel panel-guide panel-home">
    ${renderPanelHead(
      "Choose A Path",
      "Use the home page to do one thing quickly: understand the model, try the prototype, or inspect the live registry."
    )}
    <div class="path-grid">
      <article class="path-card">
        <h3>Understand ONT</h3>
        <p>Read the overview when you want how the current prototype works, what is live today, and where to go next.</p>
        <div class="path-card-actions">
          <a class="action-link secondary" href="${withBasePath("/explainer", configuredBasePath)}">Open overview</a>
        </div>
      </article>
      <article class="path-card">
        <h3>Try The Prototype</h3>
        <p>Set up Sparrow, prepare a claim, and walk through the hosted signet flow with the same wallet you will use to sign.</p>
        <div class="path-card-actions">
          <a class="action-link secondary" href="${withBasePath("/setup", configuredBasePath)}">Open setup</a>
        </div>
      </article>
      <article class="path-card">
        <h3>Explore The Registry</h3>
        <p>Resolve a name, browse recent activity, and inspect the current visible registry without working through the full claim flow.</p>
        <div class="path-card-actions">
          <a class="action-link secondary" href="${withBasePath("/explore", configuredBasePath)}">Open explorer</a>
        </div>
      </article>
    </div>
    <p class="tool-handoff-note">More links: <a href="${DOC_URLS.fromZero}" target="_blank" rel="noreferrer noopener">Read From Zero</a>, <a href="${withBasePath("/claim", configuredBasePath)}">Claim prep</a>, <a href="${withBasePath("/values", configuredBasePath)}">Values</a>, <a href="${withBasePath("/transfer", configuredBasePath)}">Transfer</a>, <a href="${withBasePath("/claim/offline", configuredBasePath)}">Offline architect</a>, and <a href="${withBasePath("/auctions", configuredBasePath)}">Auctions</a>.</p>
  </section>`;
}

function renderHomeModelSection(): string {
  return `<section id="how-ont-works" class="panel panel-guide">
    ${renderPanelHead(
      "How It Works",
      "Claim the name on-chain, publish the current destination off-chain, and let clients resolve both together."
    )}
    <div class="guide-grid">
      <article class="guide-card">
        <h3>Claim On-Chain</h3>
        <p>Bitcoin transactions establish the owner of the name. The current prototype uses commit and reveal for ordinary claims.</p>
      </article>
      <article class="guide-card">
        <h3>Publish A Destination</h3>
        <p>After a claim succeeds, the owner can publish the current destination for the name. One owner-signed bundle can carry entries like <span class="mono">btc -&gt; bc1qxy...0wlh</span>, <span class="mono">lightning -&gt; lno1q...9sa</span>, <span class="mono">email -&gt; alice@example.com</span>, <span class="mono">website -&gt; alice.example</span>, or <span class="mono">cashapp -&gt; $alice1234</span>.</p>
      </article>
      <article class="guide-card">
        <h3>Resolve And Verify</h3>
        <p>Clients combine public ownership data with the latest owner-authorized record to decide what the name means right now.</p>
      </article>
    </div>
  </section>`;
}

function renderHomeDestinationDiagramSection(): string {
  return `<section id="one-name-many-destinations" class="panel panel-guide">
    ${renderPanelHead(
      "One Name, Many Destinations",
      "A single ONT name can point to several owner-signed destinations at once."
    )}
    <div class="destination-architecture">
      <div class="destination-stage destination-stage-onchain">
        <div class="destination-stage-header">
          <p class="destination-stage-kicker">On-chain</p>
          <p class="destination-stage-meta">Small Bitcoin footprint</p>
        </div>
        <article class="guide-card destination-stage-card destination-stage-card-onchain">
          <p class="destination-example-name mono">alice</p>
          <h3>Claim establishes owner</h3>
          <p>Bitcoin anchors ownership and transfers, so control of the name stays public and auditable.</p>
        </article>
      </div>
      <div class="destination-stage-connector" aria-hidden="true"></div>
      <div class="destination-stage destination-stage-offchain">
        <div class="destination-stage-header">
          <p class="destination-stage-kicker">Resolvers</p>
          <p class="destination-stage-meta">Store current off-chain data</p>
        </div>
        <article class="guide-card destination-stage-card destination-stage-card-offchain">
          <h3>Resolvers store the current owner-signed bundle for <span class="mono">alice</span></h3>
          <p>The current owner can update this off-chain bundle over time, while resolvers keep the latest owner-authorized destinations lightweight and easy to query.</p>
        </article>
        <div class="destination-branch-grid" aria-label="Example destinations for alice">
          ${renderDestinationServiceCard("Bitcoin", "bc1qxy...0wlh")}
          ${renderDestinationServiceCard("Lightning (BOLT12)", "lno1q...9sa")}
          ${renderDestinationServiceCard("Email", "alice@example.com")}
          ${renderDestinationServiceCard("Phone", "+1 415 555 0123")}
          ${renderDestinationServiceCard("Website", "alice.example")}
          ${renderDestinationServiceCard("LinkedIn", "linkedin.com/in/alice")}
          ${renderDestinationServiceCard("Signal", "alice_12")}
          ${renderDestinationServiceCard("Cash App", "$alice1234")}
        </div>
      </div>
      <div class="destination-stage-connector" aria-hidden="true"></div>
      <div class="destination-stage destination-stage-client">
        <div class="destination-stage-header">
          <p class="destination-stage-kicker">Clients</p>
          <p class="destination-stage-meta">Resolve and act</p>
        </div>
        <article class="guide-card destination-stage-card destination-stage-card-client">
          <h3>Clients combine Bitcoin ownership with resolver data</h3>
          <p>Wallets and apps check who controls <span class="mono">alice</span>, fetch the latest resolver record, and then use the destinations they understand.</p>
        </article>
      </div>
    </div>
    <p class="tool-handoff-note">Bitcoin anchors ownership. Resolvers serve the mutable destination layer off-chain. Clients combine both when they decide what <span class="mono">alice</span> means right now.</p>
  </section>`;
}

function renderDestinationServiceCard(serviceName: string, serviceValue: string): string {
  return `<article class="guide-card destination-branch-card">
    <p class="destination-service-label">${escapeHtml(serviceName)}</p>
    <p class="mono destination-service-value">${escapeHtml(serviceValue)}</p>
  </article>`;
}

function renderHomeDocsSection(): string {
  return `<section id="current-docs" class="panel panel-guide">
    ${renderPanelHead(
      "Current Status",
      "The hosted demo is real, but it is still a prototype. Use this page to separate what works now from what is still under active design."
    )}
    <div class="guide-grid">
      <article class="guide-card">
        <h3>Works Today</h3>
        <ul class="guide-list">
          <li>Hosted signet setup and claim prep</li>
          <li>Self-hosted website and resolver</li>
          <li>Browser value publishing</li>
          <li>Ordinary-lane Merkle batching through batch anchor, reveal, and later transfer semantics</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Still Prototype</h3>
        <ul class="guide-list">
          <li>Transfers still rely on external signer and CLI steps.</li>
          <li>Resolver availability is only partly decentralized in v1.</li>
          <li>The reserved-name auction lane is still in progress.</li>
          <li>Mainnet-ready usage is not the current claim.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Read Next</h3>
        <ul class="guide-list">
          <li><a class="detail-link" href="${DOC_URLS.fromZero}" target="_blank" rel="noreferrer noopener">ONT From Zero</a></li>
          <li><a class="detail-link" href="${DOC_URLS.implementation}" target="_blank" rel="noreferrer noopener">Implementation &amp; Validation</a></li>
          <li><a class="detail-link" href="${DOC_URLS.launchSpec}" target="_blank" rel="noreferrer noopener">Launch Spec v0</a></li>
        </ul>
      </article>
    </div>
  </section>`;
}

function renderUsingOntSection(configuredBasePath: string): string {
  return `<section id="using-ont" class="panel panel-guide">
    ${renderPanelHead(
      "Use The Current Prototype",
      "The website is organized around a few clear surfaces instead of one giant walkthrough."
    )}
    <div class="guide-grid">
      <article class="guide-card">
        <h3>Setup And Claim</h3>
        <p>Use setup to connect Sparrow to the hosted demo wallet server, then use claim prep to generate the signer files and backups.</p>
      </article>
      <article class="guide-card">
        <h3>Explore</h3>
        <p>Use Explore when you want live registry data: name lookups, recent activity, pending claims, and the tracked namespace.</p>
      </article>
      <article class="guide-card">
        <h3>Values And Transfer</h3>
        <p>Use the values and transfer surfaces after a name exists and you want to manage what it points to or hand off control.</p>
      </article>
      <article class="guide-card">
        <h3>Advanced Paths</h3>
        <p>Use the offline architect for local artifact generation and the Auctions page for the reserved-name flow.</p>
      </article>
    </div>
    <div class="hero-cta-row section-cta-row">
      <a class="action-link" href="${withBasePath("/setup", configuredBasePath)}">Open setup</a>
      <a class="action-link" href="${withBasePath("/claim", configuredBasePath)}">Open claim prep</a>
      <a class="action-link secondary" href="${withBasePath("/explore", configuredBasePath)}">Open explorer</a>
      <a class="action-link secondary" href="${withBasePath("/values", configuredBasePath)}">Open values</a>
      <a class="action-link secondary" href="${withBasePath("/transfer", configuredBasePath)}">Open transfer</a>
    </div>
  </section>`;
}

function renderSearchSection(): string {
  return `<section id="lookup" class="panel panel-search panel-home">
    ${renderPanelHead(
      "Check A Name",
      "Resolve a name, inspect ownership, or see whether it is available to claim."
    )}
    <form id="searchForm" class="search-form">
      <label class="field-label" for="nameInput">Name</label>
      <div class="search-row">
        <input id="nameInput" name="name" type="text" maxlength="32" placeholder="alice" autocomplete="off" />
        <button type="submit">Resolve</button>
      </div>
    </form>
    <div id="searchResult" class="result-card empty" hidden></div>
  </section>`;
}

function renderOverviewSection(collapsible = false): string {
  const body = `<div class="stats-grid">
      <article class="stat-card">
        <span class="stat-label">Tracked Names</span>
        <strong id="trackedNames">0</strong>
      </article>
      <article class="stat-card">
        <span class="stat-label">Settling</span>
        <strong id="immatureNames">0</strong>
      </article>
      <article class="stat-card">
        <span class="stat-label">Active</span>
        <strong id="matureNames">0</strong>
      </article>
      <article class="stat-card">
        <span class="stat-label">Released</span>
        <strong id="invalidNames">0</strong>
      </article>
      <article class="stat-card">
        <span class="stat-label">Awaiting Reveal</span>
        <strong id="pendingCommits">0</strong>
      </article>
      <article class="stat-card">
        <span class="stat-label">Current Height</span>
        <strong id="currentHeight">-</strong>
      </article>
    </div>`;

  if (!collapsible) {
    return `<section id="overview" class="panel panel-overview">
    ${renderPanelHead(
      "Explorer Stats",
      "Quick snapshot of the currently visible namespace.",
      `<p>Current tracked names, awaiting reveals, and chain height.</p>
      <ul>
        <li><strong>Tracked Names</strong> are names the resolver currently recognizes.</li>
        <li><strong>Awaiting Reveal</strong> are commit-stage names waiting to reveal.</li>
        <li><strong>Current Height</strong> tells you which block the snapshot is based on.</li>
      </ul>`
    )}
    ${body}
  </section>`;
  }

  return `<details id="overview" class="panel panel-overview panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>Explorer Stats</h2>
        <p>Quick snapshot of the currently visible namespace.</p>
      </div>
      <span class="summary-chip">Open stats</span>
    </summary>
    <div class="collapsible-panel-body">${body}</div>
  </details>`;
}

function renderActivitySection(collapsible = false): string {
  const body = `<div id="activityFilters" class="filter-bar" role="toolbar" aria-label="Recent activity filters"></div>
    <div id="activityHighlights" class="guide-grid"></div>
    <div id="activityState" class="list-status">Loading recent activity...</div>
    <div id="activityList" class="activity-list"></div>`;

  if (!collapsible) {
    return `<section id="activity" class="panel panel-activity">
    ${renderPanelHead(
      "Recent Activity",
      "Latest changes, with the most interesting items surfaced first.",
      `<p>Lifecycle transitions across claims, transfers, value updates, and releases.</p>
      <ul>
        <li>Claims becoming visible after reveal</li>
        <li>Transfers between owners</li>
        <li>Value publications</li>
        <li>Invalidations when bond continuity fails</li>
      </ul>`
    )}
    ${body}
  </section>`;
  }

  return `<details id="activity" class="panel panel-activity panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>Recent Activity</h2>
        <p>Latest lifecycle changes and notable events in the namespace.</p>
      </div>
      <span class="summary-chip">Open activity</span>
    </summary>
    <div class="collapsible-panel-body">${body}</div>
  </details>`;
}

function renderRecentNamesSection(): string {
  return `<section id="recent-names" class="panel panel-list">
    ${renderPanelHead(
      "Recent Names",
      "Most recently recorded names, ordered by the latest visible state change.",
      `<p>Quick view of the newest names and state changes.</p>
      <ul>
        <li><strong>Claimed</strong> means the latest visible state is the original reveal.</li>
        <li><strong>Transferred</strong> means ownership moved after the claim.</li>
        <li><strong>Invalidated</strong> means the name later failed continuity.</li>
      </ul>`
    )}
    <div id="recentNamesState" class="list-status">Loading recent names...</div>
    <div id="recentNamesList" class="recent-names-list"></div>
  </section>`;
}

function renderPendingSection(collapsible = false): string {
  const body = `<div id="pendingState" class="list-status">Loading pending commits...</div>
    <div id="pendingList" class="pending-list"></div>`;

  if (!collapsible) {
    return `<section id="pending" class="panel panel-pending">
    ${renderPanelHead(
      "Awaiting Reveal",
      "Names currently between commit and reveal.",
      `<p>Commit transactions hide the target name until reveal.</p>
      <ul>
        <li>The name itself is not public yet.</li>
        <li>The reveal must happen within the allowed window.</li>
        <li>Once revealed, the name moves into the claimed set.</li>
      </ul>`
    )}
    ${body}
  </section>`;
  }

  return `<details id="pending" class="panel panel-pending panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>Awaiting Reveal</h2>
        <p>Names currently between commit and reveal.</p>
      </div>
      <span class="summary-chip">Open commits</span>
    </summary>
    <div class="collapsible-panel-body">${body}</div>
  </details>`;
}

function renderLiveSmokeSection(collapsible = false): string {
  const body = `<p id="liveSmokeMeta" class="helper-text">Checking the optional legacy public-signet smoke summary.</p>
    <div id="liveSmokeResult" class="result-card empty">Loading the legacy public signet smoke status...</div>`;

  if (!collapsible) {
    return `<section class="panel panel-live-smoke">
    ${renderPanelHead(
      "Legacy Public Signet Smoke",
      "Optional status from the older shared public signet smoke runner.",
      `<p>This is no longer part of the main hosted demo or the primary validation story.</p>
      <ul>
        <li>It only matters if you intentionally want to check the older shared public signet path.</li>
        <li>It still exercises a single-name claim flow and usually stalls on faucet funding.</li>
        <li>The active live demo and live proof paths now run on the hosted private signet stack instead.</li>
      </ul>`
    )}
    ${body}
  </section>`;
  }

  return `<details class="panel panel-live-smoke panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>Legacy Public Signet Smoke</h2>
        <p>Optional status from the older shared public signet smoke runner. The hosted private signet stack is the active live path today.</p>
      </div>
      <span class="summary-chip">Open smoke</span>
    </summary>
    <div class="collapsible-panel-body">${body}</div>
  </details>`;
}

function renderPrivateBatchSmokeSection(collapsible = false): string {
  const body = `<p id="privateBatchSmokeMeta" class="helper-text">Checking the latest private signet batched ordinary-claim smoke run.</p>
    <div id="privateBatchSmokeResult" class="result-card empty">Loading the latest private signet batch smoke status...</div>`;

  if (!collapsible) {
    return `<section class="panel panel-live-smoke">
    ${renderPanelHead(
      "Private Signet Batch Smoke",
      "Latest status from the batched ordinary-claim flow on the hosted private signet demo.",
      `<p>This is the best live-chain proof for the current ordinary-lane Merkle batching path.</p>
      <ul>
        <li>It uses one batch anchor and later one-by-one reveals against that root.</li>
        <li>It currently checks two batched claims plus a later transfer on one of those names.</li>
        <li>Unlike the public live smoke, it runs on the private signet deployment we control.</li>
      </ul>`
    )}
    ${body}
  </section>`;
  }

  return `<details class="panel panel-live-smoke panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>Private Signet Batch Smoke</h2>
        <p>Latest status from the hosted private signet batched ordinary-claim flow: one batch anchor, later per-name reveals, and a post-claim transfer check.</p>
      </div>
      <span class="summary-chip">Open batch smoke</span>
    </summary>
    <div class="collapsible-panel-body">${body}</div>
  </details>`;
}

function renderPrivateAuctionSmokeSection(collapsible = false): string {
  const body = `<p id="privateAuctionSmokeMeta" class="helper-text">Checking the latest private signet auction smoke run.</p>
    <div id="privateAuctionSmokeResult" class="result-card empty">Loading the latest private signet auction smoke status...</div>`;

  if (!collapsible) {
    return `<section class="panel panel-live-smoke">
    ${renderPanelHead(
      "Private Signet Auction Smoke",
      "Latest status from the hosted private signet auction flow.",
      `<p>This is the current live-chain proof for the reserved-name auction slice.</p>
      <ul>
        <li>It starts with an empty dedicated smoke lot from the private auction catalog.</li>
        <li>It submits an opening bid, then a higher bid, settles the lot into a live owned name, publishes a winner value record, and later transfers that name after the winner lock clears.</li>
        <li>It still spends the losing bond early to prove the chain-derived feed flags that violation, and it separately proves the no-bid release valve on a dedicated release lot.</li>
        <li>The resulting website feed shows accepted bid history, settlement state, post-settlement handoff, and bond spend / release consequences.</li>
      </ul>`
    )}
    ${body}
  </section>`;
  }

  return `<details class="panel panel-live-smoke panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>Private Signet Auction Smoke</h2>
        <p>Latest status from the hosted private signet auction flow: bidding, settlement, winner handoff, post-release transfer, and release-valve checks.</p>
      </div>
      <span class="summary-chip">Open auction smoke</span>
    </summary>
    <div class="collapsible-panel-body">${body}</div>
  </details>`;
}

function renderClaimGuideSection(collapsible: boolean): string {
  const body = `<div class="guide-grid">
      <article class="guide-card">
        <h3>What Gets Generated</h3>
        <ul class="guide-list">
          <li>The claim draft data needed for the signer flow.</li>
          <li>The exact commit and reveal payloads required by the protocol.</li>
          <li>Sparrow-native commit and reveal PSBTs when you provide wallet metadata.</li>
          <li>A claim package for a CLI or wallet-assisted workflow.</li>
          <li>A reveal backup for resuming the flow later.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>What You Do Next</h3>
        <ol class="guide-list">
          <li>Choose an available name and prepare the claim package here.</li>
          <li>Build and sign the commit and reveal PSBTs in Sparrow or another external signer.</li>
          <li>Broadcast the commit, wait for confirmation, then reveal within ${REVEAL_WINDOW_BLOCKS} blocks.</li>
          <li>Return to the explorer to watch the name move from awaiting reveal to settling and later active.</li>
        </ol>
      </article>
    </div>`;

  if (!collapsible) {
    return `<section id="claim-guide" class="panel panel-guide">
      ${renderPanelHead(
        "How To Claim",
        "Prepare the claim package here, then commit and reveal in your signer.",
        `<p>The protocol bytes come from ONT. Signatures and broadcast still come from your signer.</p>`
      )}
      ${body}
    </section>`;
  }

  return `<details id="claim-guide" class="panel panel-guide panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>How To Claim</h2>
        <p>Prepare the claim here, then finish the commit and reveal in Sparrow or another external signer.</p>
      </div>
      <span class="summary-chip">Open guide</span>
    </summary>
    <div class="collapsible-panel-body">${body}</div>
  </details>`;
}

function renderClaimPrepSection(configuredBasePath: string): string {
  const body = `<div class="claim-flow">
      <details id="claim-step-inputs" class="claim-flow-step wizard-step" open>
        <summary class="wizard-step-summary">
          <div class="wizard-step-heading">
            <span class="claim-step-badge">Step 1</span>
            <div class="wizard-step-copy">
              <h3>Enter Claim Details</h3>
              <p>Use the same funded Sparrow wallet from setup, choose the name, paste or generate the owner key, and prepare the draft. The advanced fields only matter if you want to override the default bond flow.</p>
            </div>
          </div>
          <span id="claimStepInputsState" class="summary-chip wizard-step-state">Start here</span>
        </summary>
        <div class="wizard-step-body">
        <div class="tool-callout-row">
          <p class="field-note">Need wallet setup or funding first? Finish setup, fund the same Sparrow wallet you will spend from, then come back here to prepare the draft.</p>
          <a class="action-link secondary" href="${withBasePath("/setup", configuredBasePath)}">Open setup</a>
        </div>
        <form id="claimDraftForm" class="claim-draft-form">
          <div class="draft-grid">
            <label class="draft-field">
              <span class="field-label">Desired Name</span>
              <input id="claimNameInput" name="claimName" type="text" maxlength="32" placeholder="bob" autocomplete="off" />
            </label>
            <label class="draft-field">
              <span class="field-label">Owner Pubkey</span>
              <div class="inline-input-row">
                <input
                  id="ownerPubkeyInput"
                  name="ownerPubkey"
                  type="text"
                  maxlength="64"
                  placeholder="32-byte x-only pubkey in hex"
                  autocomplete="off"
                />
                <button id="generateOwnerKeyButton" type="button" class="secondary-button">Generate Test Key</button>
              </div>
            </label>
            <label class="draft-field">
              <span class="field-label">Nonce (8-byte hex)</span>
              <div class="inline-input-row">
                <input id="nonceInput" name="nonceHex" type="text" maxlength="16" placeholder="generated automatically" autocomplete="off" />
                <button id="regenNonceButton" type="button" class="secondary-button">New Nonce</button>
              </div>
            </label>
          </div>
          <details class="detail-technical">
            <summary>Advanced claim settings</summary>
            <div class="detail-technical-body draft-grid">
              <label class="draft-field">
                <span class="field-label">Bond Output Vout</span>
                <input id="bondVoutInput" name="bondVout" type="number" min="0" max="255" step="1" value="0" />
                <span class="field-hint">Use <code>0</code> unless you intentionally need a different output order.</span>
              </label>
              <label class="draft-field">
                <span class="field-label">Bond Destination (optional)</span>
                <input
                  id="bondDestinationInput"
                  name="bondDestination"
                  type="text"
                  placeholder="Self-custody address or script label"
                  autocomplete="off"
                />
              </label>
              <label class="draft-field">
                <span class="field-label">Change Destination (optional)</span>
                <input
                  id="changeDestinationInput"
                  name="changeDestination"
                  type="text"
                  placeholder="Wallet-controlled change address"
                  autocomplete="off"
                />
              </label>
            </div>
          </details>
          <details class="detail-technical">
            <summary>Resume reveal later</summary>
            <div class="detail-technical-body draft-grid">
              <label class="draft-field">
                <span class="field-label">Commit Txid (optional)</span>
                <input
                  id="commitTxidInput"
                  name="commitTxid"
                  type="text"
                  maxlength="64"
                  placeholder="Paste after commit broadcast to derive the reveal payload"
                  autocomplete="off"
                />
                <span class="field-hint">Use this when you return after the commit confirms and need reveal-ready artifacts.</span>
              </label>
            </div>
          </details>
          <div class="draft-actions">
            <button type="submit">Prepare Draft</button>
          </div>
        </form>
        </div>
      </details>
      <details id="claim-step-backups" class="claim-flow-step wizard-step">
        <summary class="wizard-step-summary">
          <div class="wizard-step-heading">
            <span class="claim-step-badge">Step 2</span>
            <div class="wizard-step-copy">
              <h3>Save Recovery Files Now</h3>
              <p>If you generated a demo owner key, save it now. These files help you resume later and do not belong in Sparrow.</p>
            </div>
          </div>
          <span id="claimStepBackupsState" class="summary-chip wizard-step-state">After step 1</span>
        </summary>
        <div class="wizard-step-body">
        <p class="field-note">Do not leave this flow without saving the owner key and the reveal backup if you plan to finish later.</p>
        <div id="testKeyResult" class="result-card empty">
          No generated test key yet. Use <strong>Generate Test Key</strong> for local prototype work only.
        </div>
        <div class="draft-actions claim-step-actions">
          <button id="downloadClaimPackageButton" type="button" class="secondary-button" disabled>Download Backup Package (.json)</button>
          <button id="downloadSignerNotesButton" type="button" class="secondary-button" disabled>Optional Signer Notes (.txt)</button>
        </div>
        <div id="claimDraftResult" class="result-card empty">
          Enter a name and owner pubkey to generate the claim draft inputs.
        </div>
        </div>
      </details>
      <details id="claim-step-psbts" class="claim-flow-step claim-flow-step-emphasis wizard-step">
        <summary class="wizard-step-summary">
          <div class="wizard-step-heading">
            <span class="claim-step-badge">Step 3</span>
            <div class="wizard-step-copy">
              <h3>Build The Signer Files</h3>
              <p>Use the same funded Sparrow account from setup. Only the <code>.psbt</code> files from this step belong in Sparrow, and the hosted demo confirms pending claim transactions automatically after broadcast.</p>
            </div>
          </div>
          <span id="claimStepPsbtsState" class="summary-chip wizard-step-state">After step 2</span>
        </summary>
        <div class="wizard-step-body">
        <p class="field-note">Paste three values from Sparrow: the master fingerprint, the account xpub, and the account derivation path. Then the site will generate ready-to-sign commit and reveal PSBTs. Import those through Sparrow’s transaction flow, not by dropping backup files onto the app window.</p>
        <div class="draft-grid">
          <label class="draft-field">
            <span class="field-label">Master Fingerprint</span>
            <input
              id="walletMasterFingerprintInput"
              name="walletMasterFingerprint"
              type="text"
              maxlength="8"
              placeholder="8 hex chars, for example 57fb49c0"
              autocomplete="off"
            />
          </label>
          <label class="draft-field">
            <span class="field-label">Account XPUB / TPUB / VPUB</span>
            <input
              id="walletAccountXpubInput"
              name="walletAccountXpub"
              type="text"
              placeholder="Paste the account xpub from Sparrow Settings"
              autocomplete="off"
            />
          </label>
          <label class="draft-field">
            <span class="field-label">Account Derivation Path</span>
            <input
              id="walletAccountPathInput"
              name="walletAccountPath"
              type="text"
              value="m/84'/1'/0'"
              placeholder="m/84'/1'/0'"
              autocomplete="off"
            />
          </label>
          <label class="draft-field">
            <span class="field-label">Wallet Scan Limit</span>
            <input id="walletScanLimitInput" name="walletScanLimit" type="number" min="1" max="500" step="1" value="50" />
            <span class="field-hint">How many receive/change addresses to scan from the Sparrow account.</span>
          </label>
          <label class="draft-field">
            <span class="field-label">Commit Fee (₿)</span>
            <input id="commitFeeSatsInput" name="commitFeeSats" type="number" min="1" step="1" value="1000" />
          </label>
          <label class="draft-field">
            <span class="field-label">Reveal Fee (₿)</span>
            <input id="revealFeeSatsInput" name="revealFeeSats" type="number" min="1" step="1" value="500" />
          </label>
        </div>
        <div class="draft-actions claim-step-actions">
          <button id="buildClaimPsbtsButton" type="button" disabled>Build Sparrow PSBTs</button>
          <button id="downloadRevealReadyPackageButton" type="button" disabled>Download Reveal Backup (.json)</button>
          <button id="downloadClaimCommitPsbtButton" type="button" class="secondary-button" disabled>Download Commit PSBT (.psbt)</button>
          <button id="downloadClaimRevealPsbtButton" type="button" class="secondary-button" disabled>Download Reveal PSBT (.psbt)</button>
        </div>
        <div id="claimPsbtResult" class="result-card empty">
          Prepare a claim draft first. Then this step will generate the actual <code>.psbt</code> files for Sparrow.
        </div>
        </div>
      </details>
    </div>`;

  return `<section id="claim-prep" class="panel panel-compose panel-compose-minimal">
    ${body}
  </section>`;
}

function renderSignerWorkflowSection(collapsible: boolean): string {
  const body = `<div class="guide-grid">
      <article class="guide-card">
        <h3>Commit</h3>
        <ol class="guide-list">
          <li>Open the commit PSBT in Sparrow.</li>
          <li>Preserve the bond output and add the exact commit payload.</li>
          <li>Sign and broadcast the commit.</li>
        </ol>
      </article>
      <article class="guide-card">
        <h3>Reveal</h3>
        <ol class="guide-list">
          <li>Wait for commit confirmation.</li>
          <li>Download the reveal backup if you may leave the page.</li>
          <li>Open the reveal PSBT in Sparrow and broadcast within ${REVEAL_WINDOW_BLOCKS} blocks.</li>
        </ol>
      </article>
    </div>`;

  if (!collapsible) {
    return `<section id="signer-flow" class="panel panel-guide">
      ${renderPanelHead(
        "Sparrow Workflow",
        "Commit first, confirm it, then reveal.",
        `<p>Claim bytes and PSBTs come from ONT. Signatures and broadcast still happen in Sparrow.</p>`
      )}
      ${body}
    </section>`;
  }

  return `<details id="signer-flow" class="panel panel-guide panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>Sparrow Workflow</h2>
        <p>Commit first, confirm it, then reveal.</p>
      </div>
      <span class="summary-chip">Open guide</span>
    </summary>
    <div class="collapsible-panel-body">${body}</div>
  </details>`;
}

function renderSetupQuickstartSection(configuredBasePath: string, privateSignetElectrumEndpoint: string | null): string {
  const endpoint = parseElectrumEndpoint(privateSignetElectrumEndpoint ?? "opennametags.org:50001:t");
  const transportNote = endpoint.transport === "s" ? "SSL on" : "SSL off";
  return `<section id="setup-start" class="panel panel-guide">
    ${renderPanelHead(
      "Private Demo Setup",
      "Open Sparrow in signet mode, point it at the hosted demo wallet endpoint, then return to claim."
    )}
    <p class="tool-handoff-note">No SSH access is required for this hosted path. Sparrow talks to the demo chain through a public wallet endpoint while the underlying Bitcoin Core RPC stays private on the server.</p>
    <div class="guide-grid">
      <article class="guide-card">
        <h3>1. Open Sparrow In Signet Mode</h3>
        <ul class="guide-list">
          <li>Use Sparrow for this hosted walkthrough.</li>
          <li>Launch Sparrow in <code>signet</code> mode.</li>
          <li>Use the same wallet you plan to spend from when you claim.</li>
          <li>Keep that wallet open for funding, signing, and broadcast.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>2. Point Sparrow At The Demo Wallet Server</h3>
        <ul class="guide-list">
          <li>Open <code>Settings</code> then <code>Server</code>.</li>
          <li>Turn <code>Public Server</code> off.</li>
          <li>Choose Sparrow's private server connection option.</li>
          <li>Use server string <code>${escapeHtml(endpoint.serverString)}</code>.</li>
          <li>If Sparrow asks for separate fields, use host <code>${escapeHtml(endpoint.host)}</code>, port <code>${escapeHtml(endpoint.port)}</code>, and ${escapeHtml(transportNote)}.</li>
          <li>Once connected, stay on that same wallet for the rest of the walkthrough.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>3. Confirm Balance, Then Go To Claim</h3>
        <ul class="guide-list">
          <li>Use the funding form below to request demo coins.</li>
          <li>Refresh Sparrow and confirm the balance appears in the same wallet.</li>
          <li>Then return to claim prep and build the signer handoff.</li>
        </ul>
      </article>
    </div>
    <div class="hero-cta-row section-cta-row">
      <a class="action-link" href="${withBasePath("/claim", configuredBasePath)}">Open claim prep</a>
      <a class="action-link secondary" href="https://sparrowwallet.com/download/" target="_blank" rel="noreferrer">Download Sparrow</a>
    </div>
  </section>`;
}

function renderSetupFundingSection(privateSignetFundingAmountSats: bigint): string {
  return `<section id="setup-funding" class="panel panel-guide">
    ${renderPanelHead(
      "Get Demo Coins",
      "Paste a signet receive address from the same Sparrow wallet you plan to spend from."
    )}
    <p class="tool-handoff-note">${formatBitcoinDisplay(privateSignetFundingAmountSats)} per request, with one block mined immediately so Sparrow sees a confirmed balance. Later claim transactions on this hosted demo also confirm automatically after broadcast.</p>
    <form id="privateFundingForm" class="claim-draft-form">
      <div class="draft-grid">
        <label class="draft-field">
          <span class="field-label">Sparrow Receive Address</span>
          <input
            id="privateFundingAddressInput"
            name="fundingAddress"
            type="text"
            placeholder="Paste a signet receive address from Sparrow"
            autocomplete="off"
          />
          <span class="field-hint">Use the same wallet you plan to spend from when you build the claim transaction. If Sparrow cannot see the funds afterward, the hosted demo server settings are usually the missing step.</span>
        </label>
      </div>
      <div class="draft-actions">
        <button type="submit">Fund this wallet</button>
      </div>
    </form>
    <div id="privateFundingResult" class="result-card empty">
      Paste a Sparrow receive address above to get demo coins on this private signet network.
    </div>
  </section>`;
}

function formatBitcoinDisplay(value: bigint | string | number): string {
  const sats = BigInt(value);
  return `₿${sats.toLocaleString("en-US")} (${formatBtcDecimal(sats)} BTC)`;
}

function formatBtcDecimal(sats: bigint): string {
  const whole = sats / 100_000_000n;
  const fractional = (sats % 100_000_000n).toString().padStart(8, "0").replace(/0+$/g, "");
  return fractional === "" ? whole.toString() : `${whole}.${fractional}`;
}

function renderClaimSupportStrip(configuredBasePath: string): string {
  return `<section id="claim-support" class="panel panel-support-strip">
    <p class="support-strip-label">Utility links</p>
    <div class="hero-cta-row support-strip-actions">
      <a class="action-link secondary" href="${withBasePath("/setup", configuredBasePath)}">Open setup</a>
      <a class="action-link secondary" href="${withBasePath("/values", configuredBasePath)}">Publish value</a>
      <a class="action-link secondary" href="${withBasePath("/claim/offline", configuredBasePath)}">Open offline architect</a>
      <a class="action-link secondary" href="${DOC_URLS.merkleStatus}" target="_blank" rel="noreferrer noopener">Merkle status</a>
      <a class="action-link secondary" href="${DOC_URLS.testing}" target="_blank" rel="noreferrer noopener">Testing guide</a>
    </div>
  </section>`;
}

function renderSetupSupportStrip(configuredBasePath: string): string {
  return `<section id="setup-support" class="panel panel-support-strip">
    <p class="support-strip-label">Utility links</p>
    <div class="hero-cta-row support-strip-actions">
      <a class="action-link secondary" href="${withBasePath("/claim", configuredBasePath)}">Open claim prep</a>
      <a class="action-link secondary" href="${withBasePath("/claim/offline", configuredBasePath)}">Offline architect</a>
      <a class="action-link secondary" href="${DOC_URLS.fromZero}" target="_blank" rel="noreferrer noopener">From Zero</a>
    </div>
  </section>`;
}

function renderValuesToolSection(): string {
  return `<section id="value-publish" class="panel panel-compose panel-compose-minimal">
    <div class="claim-flow value-flow">
      <details id="value-step-inspect" class="claim-flow-step wizard-step" open>
        <summary class="wizard-step-summary">
          <div class="wizard-step-heading">
            <span class="claim-step-badge">Step 1</span>
            <div class="wizard-step-copy">
              <h3>Load The Current Name State</h3>
              <p>Start with the claimed name you control. The site will pull the current owner, ownership interval, latest value, and predecessor hash so the next signed update is clear.</p>
            </div>
          </div>
          <span id="valueStepInspectState" class="summary-chip wizard-step-state">Start here</span>
        </summary>
        <div class="wizard-step-body">
          <form id="valueLookupForm" class="claim-draft-form">
            <div class="draft-grid">
              <label class="draft-field">
                <span class="field-label">Name</span>
                <input id="valueNameInput" name="valueName" type="text" maxlength="32" placeholder="alice" autocomplete="off" />
                <span class="field-hint">This tool only publishes off-chain values for names the resolver already recognizes as claimed.</span>
              </label>
            </div>
            <div class="draft-actions">
              <button id="valueInspectButton" type="submit">Load name</button>
            </div>
          </form>
          <div id="valueLookupResult" class="result-card empty">
            Enter a claimed name to load the current owner and any published value record.
          </div>
        </div>
      </details>
      <details id="value-step-sign" class="claim-flow-step wizard-step">
        <summary class="wizard-step-summary">
          <div class="wizard-step-heading">
            <span class="claim-step-badge">Step 2</span>
            <div class="wizard-step-copy">
              <h3>Sign The Value Record Locally</h3>
              <p>Your owner private key stays in this browser. Only the signed record will be sent to the resolver later.</p>
            </div>
          </div>
          <span id="valueStepSignState" class="summary-chip wizard-step-state">After step 1</span>
        </summary>
        <div class="wizard-step-body">
          <p class="field-note">Use the same owner key that controls the name. This is not the funding wallet key unless you intentionally made them the same. For most names, keep the value format on key/value pairs. Raw hex is only for custom app-defined data.</p>
          <form id="valueSignForm" class="claim-draft-form">
            <div class="draft-grid">
              <label class="draft-field">
                <span class="field-label">Owner Private Key (32-byte hex)</span>
                <input
                  id="valueOwnerPrivateKeyInput"
                  name="valueOwnerPrivateKey"
                  type="password"
                  maxlength="64"
                  placeholder="32-byte secp256k1 private key in hex"
                  autocomplete="off"
                  spellcheck="false"
                />
              </label>
              <label class="draft-field">
                <span class="field-label">Derived Owner Pubkey</span>
                <input
                  id="valueOwnerPubkeyPreview"
                  name="valueOwnerPubkeyPreview"
                  type="text"
                  readonly
                  placeholder="Derived locally after you paste a private key"
                />
                <span id="valueOwnerMatchNote" class="field-hint">The derived owner will be compared against the resolver’s current owner.</span>
              </label>
              <label class="draft-field">
                <span class="field-label">Sequence</span>
                <input id="valueSequenceInput" name="valueSequence" type="number" min="1" step="1" value="1" />
                <span id="valueSequenceHint" class="field-hint">Load the current name first to confirm the next sequence.</span>
              </label>
              <label class="draft-field">
                <span class="field-label">Value Format</span>
                <select id="valueTypeInput" name="valueType">
                  <option value="255:bundle" selected>0xff (key/value pairs)</option>
                  <option value="2">0x02 (single https target)</option>
                  <option value="1">0x01 (bitcoin payment target)</option>
                  <option value="255:raw">0xff (raw / app-defined hex)</option>
                </select>
              </label>
              <label id="valuePayloadField" class="draft-field draft-field-full">
                <span class="field-label">Payload</span>
                <textarea
                  id="valuePayloadInput"
                  name="valuePayload"
                  placeholder="https://example.com"
                  spellcheck="false"
                ></textarea>
                <span id="valuePayloadHint" class="field-hint">HTTPS and payment targets are encoded as UTF-8 text. Raw/app-defined values expect hex.</span>
              </label>
              <div id="valueBundleEditor" class="value-bundle-editor draft-field-full" hidden>
                <div id="valueBundleRows" class="value-bundle-rows"></div>
                <div class="draft-actions">
                  <button id="addValueBundleEntryButton" type="button" class="secondary-button">Add pair</button>
                </div>
                <span class="field-hint">List as many ordered key/value pairs as you want. For example: <span class="mono">btc -&gt; bc1qxy...0wlh</span>, <span class="mono">lightning -&gt; lno1q...9sa</span>, <span class="mono">email -&gt; alice@example.com</span>, <span class="mono">website -&gt; alice.example</span>, <span class="mono">cashapp -&gt; $alice1234</span>. Keys are app-defined and repeatable.</span>
              </div>
            </div>
            <div class="draft-actions claim-step-actions">
              <button id="valueSignButton" type="submit">Sign locally</button>
              <button id="downloadSignedValueButton" type="button" class="secondary-button" disabled>Download signed record (.json)</button>
            </div>
          </form>
          <div id="valueSignResult" class="result-card empty">
            Load a claimed name, then sign the next value record locally in this browser.
          </div>
        </div>
      </details>
      <details id="value-step-publish" class="claim-flow-step claim-flow-step-emphasis wizard-step">
        <summary class="wizard-step-summary">
          <div class="wizard-step-heading">
            <span class="claim-step-badge">Step 3</span>
            <div class="wizard-step-copy">
              <h3>Publish The Signed Record</h3>
              <p>Upload the signed record to the resolver. Ownership stays on-chain; the resolver only stores the latest owner-authorized value.</p>
            </div>
          </div>
          <span id="valueStepPublishState" class="summary-chip wizard-step-state">After step 2</span>
        </summary>
        <div class="wizard-step-body">
          <p id="valuePublishModeNote" class="field-note">The publish request only sends the signed JSON record. The owner private key never leaves the page.</p>
          <div class="draft-actions claim-step-actions">
            <button id="publishValueButton" type="button" disabled>Publish signed record</button>
            <button id="publishValueFanoutButton" type="button" class="secondary-button" hidden disabled>Publish to configured resolver set</button>
          </div>
          <div id="valuePublishResult" class="result-card empty">
            Sign a value record first. Then this step will publish it to the resolver and reload the current visible value.
          </div>
        </div>
      </details>
    </div>
  </section>`;
}

function renderValuesGuideSection(configuredBasePath: string): string {
  return `<section id="values-guide" class="panel panel-guide">
    ${renderPanelHead(
      "How Value Publishing Fits Together",
      "Load the claimed name, sign locally with the owner key, then publish only the signed record.",
      `<p>The resolver stores the latest owner-authorized value, but ownership itself still comes from the chain.</p>`
    )}
    <div class="guide-grid">
      <article class="guide-card">
        <h3>What This Page Actually Does</h3>
        <ul class="guide-list">
          <li>Reads the current name state from the resolver.</li>
          <li>Signs the next value record locally in your browser.</li>
          <li>Uploads only the signed JSON record.</li>
          <li>The same signed JSON can be republished to multiple resolvers through the CLI prototype.</li>
          <li>Deployments that configure more than one resolver can fan the same signed JSON out from this page too.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Which Key You Need</h3>
        <ul class="guide-list">
          <li>Use the <strong>owner key</strong>, not the funding wallet key.</li>
          <li>If the owner key no longer matches the current owner, publish will fail.</li>
          <li>After a transfer, only the new owner can publish fresh values.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>What A Value Can Carry</h3>
        <ul class="guide-list">
          <li>A single HTTPS target</li>
          <li>A single Bitcoin payment target</li>
          <li>A bundled list of repeatable key/value entries like <span class="mono">btc -&gt; bc1qxy...0wlh</span>, <span class="mono">lightning -&gt; lno1q...9sa</span>, <span class="mono">website -&gt; alice.example</span>, and <span class="mono">cashapp -&gt; $alice1234</span></li>
        </ul>
        <div class="guide-card-actions">
          <a class="action-link secondary" href="${withBasePath("/values", configuredBasePath)}">Open values tool</a>
        </div>
      </article>
      <article class="guide-card">
        <h3>Good Names To Inspect</h3>
        <ul class="guide-list">
          <li><strong><a class="detail-link" href="${withBasePath(`/names/${PRIVATE_DEMO_NAMES.claim}`, configuredBasePath)}">${PRIVATE_DEMO_NAMES.claim}</a></strong> shows a claimed name before any value is published.</li>
          <li><strong><a class="detail-link" href="${withBasePath(`/names/${PRIVATE_DEMO_NAMES.value}`, configuredBasePath)}">${PRIVATE_DEMO_NAMES.value}</a></strong> shows a populated key/value bundle.</li>
          <li><strong><a class="detail-link" href="${withBasePath(`/names/${PRIVATE_DEMO_NAMES.transfer}`, configuredBasePath)}">${PRIVATE_DEMO_NAMES.transfer}</a></strong> shows a transferred name with new owner authority.</li>
        </ul>
      </article>
    </div>
  </section>`;
}

function renderValuesSupportStrip(configuredBasePath: string): string {
  return `<section id="values-support" class="panel panel-support-strip">
    <p class="support-strip-label">Utility links</p>
    <div class="hero-cta-row support-strip-actions">
      <a class="action-link secondary" href="${withBasePath("/claim", configuredBasePath)}">Open claim prep</a>
      <a class="action-link secondary" href="${withBasePath("/transfer", configuredBasePath)}">Open transfer prep</a>
      <a class="action-link secondary" href="${DOC_URLS.implementation}" target="_blank" rel="noreferrer noopener">Implementation status</a>
      <a class="action-link secondary" href="${DOC_URLS.fromZero}" target="_blank" rel="noreferrer noopener">From Zero</a>
    </div>
  </section>`;
}

function renderWalletCompatibilityFaqSection(configuredBasePath: string, collapsible = true): string {
  const body = `<div class="guide-grid">
      <article class="guide-card">
        <h3>Do I have to use Sparrow?</h3>
        <p>No, but the hosted private demo is only fully supported and tested end to end with Sparrow right now.</p>
      </article>
      <article class="guide-card">
        <h3>Does Electrum work?</h3>
        <p>Not for this hosted private demo. The official Electrum app reaches the endpoint, but then rejects the chain because this small private signet sits below Electrum’s built-in public signet checkpoint height. Sparrow is still the supported path.</p>
      </article>
      <article class="guide-card">
        <h3>Why doesn’t a normal public signet server show my demo coins?</h3>
        <p>Because this is a private signet, not the shared public signet. Public servers will never see this demo chain.</p>
      </article>
      <article class="guide-card">
        <h3>What about other wallets later?</h3>
        <p>Broader wallet support should still be easier now that the hosted demo exposes a public wallet endpoint instead of requiring SSH access to Bitcoin Core RPC. But official Electrum still needs a different answer for this private signet design.</p>
        <div class="hero-cta-row">
          <a class="action-link secondary" href="${withBasePath("/claim/offline", configuredBasePath)}">Offline architect</a>
        </div>
      </article>
    </div>`;

  if (!collapsible) {
    return `<section id="wallet-compatibility" class="panel panel-guide">
      ${renderPanelHead(
        "Wallet Compatibility",
        "Sparrow is the supported path today. Official Electrum still does not work against this hosted private signet."
      )}
      ${body}
    </section>`;
  }

  return `<details id="wallet-compatibility" class="panel panel-guide panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>Wallet Compatibility</h2>
        <p>Sparrow is the supported path today. Official Electrum still does not work against this hosted private signet.</p>
      </div>
      <span class="summary-chip">FAQ</span>
    </summary>
    <div class="collapsible-panel-body">${body}</div>
  </details>`;
}

function parseElectrumEndpoint(endpoint: string): { host: string, port: string, serverString: string, transport: string } {
  const trimmed = endpoint.trim();
  const hostPortModeMatch = /^(.*):([0-9]+):([a-z])$/i.exec(trimmed);
  if (hostPortModeMatch) {
    const [, host = trimmed, port = "50001", transport = "t"] = hostPortModeMatch;
    return {
      host,
      port,
      transport: transport.toLowerCase(),
      serverString: trimmed
    };
  }

  const tcpMatch = /^tcp:\/\/([^:]+):([0-9]+)$/i.exec(trimmed);
  if (tcpMatch) {
    const [, host = trimmed, port = "50001"] = tcpMatch;
    return {
      host,
      port,
      transport: "t",
      serverString: trimmed
    };
  }

  const sslMatch = /^ssl:\/\/([^:]+):([0-9]+)$/i.exec(trimmed);
  if (sslMatch) {
    const [, host = trimmed, port = "50001"] = sslMatch;
    return {
      host,
      port,
      transport: "s",
      serverString: trimmed
    };
  }

  return {
    host: trimmed,
    port: "50001",
    transport: "t",
    serverString: trimmed
  };
}

function renderTransferGuideSection(): string {
  return `<section id="transfer-guide" class="panel panel-guide">
    ${renderPanelHead(
      "How Transfer Fits Together",
      "A transfer moves owner authority to a new pubkey. The current name state determines the handoff path.",
      `<p>After a transfer, the old owner can no longer publish new values for that name.</p>`
    )}
    <div class="guide-grid">
      <article class="guide-card">
        <h3>What Actually Changes</h3>
        <ul class="guide-list">
          <li>The name keeps the same string.</li>
          <li>The <strong>new owner pubkey</strong> becomes the future authority.</li>
          <li>The <strong>old owner key</strong> stops being able to publish new value records.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Settling Names</h3>
        <ul class="guide-list">
          <li>Transfers still need bond continuity.</li>
          <li>Use a gift handoff or buyer-funded settling sale.</li>
          <li>The transfer plan includes the known state txids and bond details.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Active Names</h3>
        <ul class="guide-list">
          <li>The name is already settled.</li>
          <li>Use a gift handoff or cooperative active sale.</li>
          <li>The transfer plan focuses on ownership change and optional seller payment.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Current Prototype Status</h3>
        <ul class="guide-list">
          <li>The site prepares the handoff and exports the package.</li>
          <li>Signing and broadcast still happen in the CLI and your signer flow.</li>
          <li>This works in the prototype, but it is not yet mainnet-ready.</li>
        </ul>
      </article>
    </div>
  </section>`;
}

function renderTransferPrepSection(): string {
  return `<section id="transfer-prep" class="panel panel-compose panel-compose-minimal">
    <div class="claim-flow transfer-flow">
      <details id="transfer-step-inputs" class="claim-flow-step wizard-step" open>
        <summary class="wizard-step-summary">
          <div class="wizard-step-heading">
            <span class="claim-step-badge">Step 1</span>
            <div class="wizard-step-copy">
              <h3>Enter Transfer Details</h3>
              <p>Provide the claimed name and the new owner. Leave mode selection on automatic unless you need to override it.</p>
            </div>
          </div>
          <span id="transferStepInputsState" class="summary-chip wizard-step-state">Start here</span>
        </summary>
        <div class="wizard-step-body">
    <form id="transferDraftForm" class="claim-draft-form">
      <div class="draft-grid">
        <label class="draft-field">
          <span class="field-label">Name</span>
          <input id="transferNameInput" name="transferName" type="text" maxlength="32" placeholder="alice" autocomplete="off" />
        </label>
        <label class="draft-field">
          <span class="field-label">New Owner Pubkey</span>
          <input
            id="transferNewOwnerPubkeyInput"
            name="transferNewOwnerPubkey"
            type="text"
            maxlength="64"
            placeholder="32-byte x-only pubkey in hex"
            autocomplete="off"
          />
        </label>
        <label class="draft-field">
          <span class="field-label">Seller Payout Address (optional)</span>
          <input
            id="transferSellerPayoutAddressInput"
            name="transferSellerPayoutAddress"
            type="text"
            placeholder="Only needed if seller payment should happen in the same transaction"
            autocomplete="off"
          />
        </label>
      </div>
      <details class="detail-technical">
        <summary>Advanced transfer options</summary>
        <div class="detail-technical-body draft-grid">
          <label class="draft-field">
            <span class="field-label">Mode Override</span>
            <select id="transferModeInput" name="transferMode">
              <option value="auto">Auto (recommend from current state)</option>
              <option value="gift">Gift / pre-arranged transfer</option>
              <option value="immature-sale">Buyer-funded settling sale</option>
              <option value="sale">Cooperative active sale</option>
            </select>
            <span class="field-hint">Leave this on <code>Auto</code> unless you intentionally want to override the recommended path.</span>
          </label>
          <label class="draft-field">
            <span class="field-label">Successor Bond Address (optional)</span>
            <input
              id="transferBondAddressInput"
              name="transferBondAddress"
              type="text"
              placeholder="Only needed when the transfer still carries a live bond"
              autocomplete="off"
            />
          </label>
        </div>
      </details>
      <div class="draft-actions">
        <button type="submit">Build Transfer Plan</button>
      </div>
    </form>
        </div>
      </details>
      <details id="transfer-step-review" class="claim-flow-step wizard-step">
        <summary class="wizard-step-summary">
          <div class="wizard-step-heading">
            <span class="claim-step-badge">Step 2</span>
            <div class="wizard-step-copy">
              <h3>Review And Export The Handoff</h3>
              <p>Review the recommended mode, then export the package or notes for your CLI and signer flow.</p>
            </div>
          </div>
          <span id="transferStepReviewState" class="summary-chip wizard-step-state">After step 1</span>
        </summary>
        <div class="wizard-step-body">
          <div class="draft-actions claim-step-actions">
            <button id="downloadTransferPackageButton" type="button" class="secondary-button">Download Transfer Package</button>
            <button id="downloadTransferNotesButton" type="button" class="secondary-button">Download Transfer Notes</button>
          </div>
    <div id="transferDraftResult" class="result-card empty">
      Enter a claimed name and the new owner pubkey to build a transfer-ready handoff.
    </div>
        </div>
      </details>
    </div>
  </section>`;
}

function renderTransferSupportStrip(configuredBasePath: string): string {
  return `<section id="transfer-support" class="panel panel-support-strip">
    <p class="support-strip-label">Utility links</p>
    <div class="hero-cta-row support-strip-actions">
      <a class="action-link secondary" href="${withBasePath("/claim", configuredBasePath)}">Open claim prep</a>
      <a class="action-link secondary" href="${withBasePath("/values", configuredBasePath)}">Publish value</a>
      <a class="action-link secondary" href="${withBasePath("/explore", configuredBasePath)}">Open explorer</a>
      <a class="action-link secondary" href="${DOC_URLS.implementation}" target="_blank" rel="noreferrer noopener">Implementation status</a>
    </div>
  </section>`;
}

function renderNetworkDetailsSection(collapsible: boolean): string {
  const body = `<div class="result-grid">
      <div class="result-item">
        <label>Network</label>
        <p id="networkLabel" class="field-value">Loading...</p>
      </div>
      <div class="result-item">
        <label>Resolver Mode</label>
        <p id="syncMode" class="field-value">Loading...</p>
      </div>
      <div class="result-item">
        <label>Source</label>
        <p id="networkSource" class="field-value">-</p>
      </div>
      <div class="result-item">
        <label>Chain</label>
        <p id="networkChain" class="field-value">-</p>
      </div>
      <div class="result-item">
        <label>Resolver Target</label>
        <p id="networkResolver" class="field-value">Connecting to resolver</p>
      </div>
      <div class="result-item">
        <label>Current Block Hash</label>
        <strong id="currentBlockHash" class="hash-value">-</strong>
      </div>
    </div>`;

  if (!collapsible) {
    return `<section id="network-details" class="panel panel-network">
      ${renderPanelHead("Network Details", "Network, chain source, and resolver target.", `<p>The current resolver snapshot, chain source, and active network.</p>`)}
      ${body}
    </section>`;
  }

  return `<details id="network-details" class="panel panel-network panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>Network Details</h2>
        <p>Resolver mode, chain source, and other lower-level debugging information for people who want it.</p>
      </div>
      <span class="summary-chip">Technical info</span>
    </summary>
    <div class="collapsible-panel-body">${body}</div>
  </details>`;
}

function renderNamesSection(collapsible = false): string {
  const body = `<div id="namesFilters" class="filter-bar" role="toolbar" aria-label="Registry name filters"></div>
    <div id="namesState" class="list-status">Loading tracked names...</div>
    <div id="namesList" class="names-list"></div>`;

  if (!collapsible) {
    return `<section id="claimed" class="panel panel-list">
    ${renderPanelHead(
      "All Registry Names",
      "Grouped by lifecycle state for faster browsing.",
      `<p>Names are grouped so you can focus on what is interesting first.</p>
      <ul>
        <li><strong>Awaiting Reveal</strong> lives in its own section above.</li>
        <li><strong>Settling</strong> names are still bond-sensitive.</li>
        <li><strong>Active</strong> names are settled.</li>
        <li><strong>Released</strong> names lost continuity and should be treated as historical first.</li>
      </ul>`
    )}
    ${body}
  </section>`;
  }

  return `<details id="claimed" class="panel panel-list panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>All Registry Names</h2>
        <p>Grouped by lifecycle state for deeper browsing.</p>
      </div>
      <span class="summary-chip">Open registry</span>
    </summary>
    <div class="collapsible-panel-body">${body}</div>
  </details>`;
}

function withBasePath(pathname: string, basePath: string): string {
  if (!basePath || basePath === "/") {
    return pathname;
  }

  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return normalizedPath === "/" ? basePath : `${basePath}${normalizedPath}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
