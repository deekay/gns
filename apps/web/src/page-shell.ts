import { PRODUCT_NAME } from "@ont/protocol";

export type PageKind = "home" | "explore" | "advanced" | "auctions" | "values" | "transfer" | "setup" | "explainer";
const GITHUB_REPO_URL = "https://github.com/deekay/ont";
const GITHUB_BLOB_BASE_URL = `${GITHUB_REPO_URL}/blob/main`;
const DOC_URLS = {
  readme: `${GITHUB_BLOB_BASE_URL}/README.md`,
  fromZero: `${GITHUB_BLOB_BASE_URL}/docs/core/ONT_FROM_ZERO.md`,
  implementation: `${GITHUB_BLOB_BASE_URL}/docs/research/ONT_IMPLEMENTATION_AND_VALIDATION.md`,
  launchSpec: `${GITHUB_BLOB_BASE_URL}/docs/research/LAUNCH_SPEC_V0.md`,
  testing: `${GITHUB_BLOB_BASE_URL}/docs/core/TESTING.md`
} as const;
export interface PageShellOptions {
  basePath: string,
  faviconDataUrl: string,
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
      : pageKind === "advanced"
      ? `${PRODUCT_NAME} Advanced`
      : pageKind === "auctions"
      ? `${PRODUCT_NAME} Auctions`
      : pageKind === "values"
        ? `${PRODUCT_NAME} Destinations`
      : pageKind === "transfer"
        ? `${PRODUCT_NAME} Transfer Prep`
        : pageKind === "setup"
          ? `${PRODUCT_NAME} Setup`
        : pageKind === "explainer"
          ? `${PRODUCT_NAME} Overview`
          : `${PRODUCT_NAME} Explorer`;
  const description =
    pageKind === "home"
      ? "Search a name, inspect ownership, and choose whether to bid, explore, or review the current Open Name Tags prototype."
      : pageKind === "advanced"
      ? "Advanced Open Name Tags surfaces for CLI-heavy workflows and review docs."
      : pageKind === "auctions"
      ? "Auction bid prep, reference cases, and chain-derived bid activity."
      : pageKind === "values"
        ? "Update the destinations for an owned Open Name Tags name by signing locally and publishing the signed update."
      : pageKind === "transfer"
        ? "Prepare an Open Name Tags transfer handoff, then finish the gift or sale flow in the CLI and your signer."
      : pageKind === "setup"
          ? "Set up Sparrow, connect to the hosted demo wallet endpoint, request demo coins, and complete the private signet walkthrough."
        : pageKind === "explainer"
          ? "Quick orientation for using the hosted Open Name Tags tools."
        : "Explorer for browsing owned names and resolver status in Open Name Tags.";

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
            : pageKind === "advanced"
            ? renderAdvancedPageSections(basePath, includePrivateAuctionSmoke)
            : pageKind === "auctions"
            ? renderAuctionsPageSections(includePrivateAuctionSmoke)
            : pageKind === "values"
              ? renderValuesPageSections(basePath)
            : pageKind === "transfer"
              ? renderTransferPageSections(basePath)
              : pageKind === "setup"
                ? renderSetupPageSections(basePath, privateSignetElectrumEndpoint, privateSignetFundingEnabled, privateSignetFundingAmountSats)
              : pageKind === "explainer"
                ? renderExplainerPageSections(basePath)
              : renderExplorePageSections(basePath)
        }
      </main>
      ${renderSiteFooter(basePath)}
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
  if (pageKind === "transfer") {
    return `<header class="hero hero-single hero-page hero-page-transfer">
      <div class="hero-copy">
        <h1>Transfer A Name</h1>
        <p class="lede">
          Send or receive a name by moving control to a new owner key. The website prepares the handoff; the CLI and signer finish the transaction.
        </p>
        <p id="chainSummary" class="hero-status">
          ${escapeHtml(configuredNetworkLabel)} · Height - · 0 names · 0 pending
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "values") {
    return `<header class="hero hero-single hero-page hero-page-values">
      <div class="hero-copy">
        <h1>Update A Name's Destinations</h1>
        <p class="lede">
          Edit the destinations a name points to, sign the update in this browser, and publish only the signed record.
        </p>
        <p id="chainSummary" class="hero-status">
          ${escapeHtml(configuredNetworkLabel)} · Height - · 0 names · 0 pending
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "explainer") {
    return `<header class="hero hero-single hero-page hero-page-explainer">
      <div class="hero-copy">
        <h1>Quick Overview</h1>
        <p class="lede">
          How the current prototype works, what is live today, and where to go next.
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "setup") {
    return `<header class="hero hero-single hero-page hero-page-setup">
      <div class="hero-copy">
        <h1>Set Up Your Wallet</h1>
        <p class="lede">
          Common Sparrow setup for the hosted private demo: connect once, fund the same wallet, then use that wallet for auction signing.
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "explore") {
    return `<header class="hero hero-single hero-page hero-page-explore">
      <div class="hero-copy">
        <h1>Explore The Live Registry</h1>
        <p class="lede">
          Recent names, current activity, and live registry state.
        </p>
        <p id="chainSummary" class="hero-status">
          ${escapeHtml(configuredNetworkLabel)} · Height - · 0 names
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "advanced") {
    return `<header class="hero hero-single hero-page hero-page-advanced">
      <div class="hero-copy">
        <h1>Advanced Tools</h1>
        <p class="lede">
          CLI-heavy workflows, implementation notes, and protocol review. Most first-time users can stay on Setup, Auctions, Destinations, Transfer, and Explore.
        </p>
        <p class="hero-status">
          Advanced / optional surface · use when you need deeper protocol context or expert tooling.
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "auctions") {
    return `<header class="hero hero-single hero-page hero-page-auctions">
      <div class="hero-copy">
        <h1>Auctions</h1>
        <p class="lede">
          Auction bid prep and reference states for the single-lane launch model. Eligible names auction at launch; 1-4 character names wait for a later short-name wave.
        </p>
        <p class="hero-status">
          Auction flow surface · bid packages, reference cases, and observed AUCTION_BID activity.
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
        <div class="hero-home-intro-top">
          <div class="hero-home-intro-copy">
            <p class="hero-home-section-kicker">Why it works</p>
            <h2 class="hero-home-section-title">Two ideas shape ONT.</h2>
            <p class="hero-home-section-summary">
              Names are scarce because bitcoin is bonded and market-priced, but flexible because records live off-chain.
            </p>
          </div>
          <article class="hero-home-launch-note" aria-label="Launch note">
            <p class="hero-home-launch-note-label">At launch</p>
            <p>Eligible names use one auction lane. Names with 1-4 characters wait for a later short-name wave.</p>
          </article>
        </div>
        <div class="hero-home-insights" aria-label="ONT summary">
          <article class="hero-home-insight">
            <p class="hero-home-insight-number">01</p>
            <div class="hero-home-insight-copy">
              <h3>Scarcity Without Rent</h3>
              <p>Bonded bitcoin creates real cost without paying a platform or registry operator.</p>
            </div>
          </article>
          <article class="hero-home-insight">
            <p class="hero-home-insight-number">02</p>
            <div class="hero-home-insight-copy">
              <h3>Ownership On-Chain, Records Off-Chain</h3>
              <p>Bitcoin anchors who controls the name; the records it points to stay flexible off-chain.</p>
            </div>
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
    { href: withBasePath("/auctions", configuredBasePath), label: "Auctions", active: pageKind === "auctions" },
    { href: withBasePath("/explore", configuredBasePath), label: "Explore", active: pageKind === "explore" },
    { href: withBasePath("/setup", configuredBasePath), label: "Setup", active: pageKind === "setup" },
    { href: withBasePath("/values", configuredBasePath), label: "Destinations", active: pageKind === "values" },
    { href: withBasePath("/transfer", configuredBasePath), label: "Transfer", active: pageKind === "transfer" },
    { href: withBasePath("/advanced", configuredBasePath), label: "Advanced", active: pageKind === "advanced" }
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
    ${renderHomeActionsSection(configuredBasePath)}`;
}

function renderExplorePageSections(configuredBasePath: string): string {
  return `${renderOverviewSection()}
    ${renderExploreEmptyStateSection(configuredBasePath)}
    <div class="explore-cluster">
      <div class="explore-cluster-main">
        ${renderRecentNamesSection()}
        ${renderNamesSection(true)}
      </div>
      <div class="explore-cluster-side">
        ${renderActivitySection(true)}
        ${renderNetworkDetailsSection(true)}
      </div>
    </div>`;
}

function renderExploreEmptyStateSection(configuredBasePath: string): string {
  return `<section id="explore-empty-state" class="panel panel-guide panel-empty-state" hidden>
    ${renderPanelHead(
      "Resolver Empty Right Now?",
      "The resolver is reachable, but it is not showing any seeded names yet."
    )}
    <div class="guide-grid guide-grid-balanced">
      <article class="guide-card">
        <h3>What This Usually Means</h3>
        <p id="exploreEmptyStateMessage">This resolver is not showing any names or activity yet.</p>
        <p id="exploreEmptyStateDetail" class="field-note">That usually means the demo chain was reset or has not been reseeded yet.</p>
      </article>
      <article class="guide-card">
        <h3>What You Can Do Next</h3>
        <ul class="guide-list">
          <li>Use Auctions to inspect the current allocation flow.</li>
          <li>Use Overview to understand the model and current prototype constraints.</li>
          <li>Use Destinations to see which canonical demo names come back once the demo chain is reseeded.</li>
        </ul>
        <div class="guide-card-actions">
          <a class="action-link secondary" href="${withBasePath("/setup", configuredBasePath)}">Open setup</a>
          <a class="action-link secondary" href="${withBasePath("/auctions", configuredBasePath)}">Open auctions</a>
          <a class="action-link secondary" href="${withBasePath("/explainer", configuredBasePath)}">Open overview</a>
        </div>
      </article>
    </div>
  </section>`;
}

function renderAdvancedPageSections(configuredBasePath: string, includePrivateAuctionSmoke: boolean): string {
  return `${renderAdvancedGuideSection(configuredBasePath)}
    ${renderAdvancedReferencesSection(configuredBasePath)}
    ${includePrivateAuctionSmoke ? renderPrivateAuctionSmokeSection(true) : ""}`;
}

function renderAuctionsPageSections(includePrivateAuctionSmoke: boolean): string {
  return `${renderAuctionLabSection()}
    ${renderExperimentalAuctionFeedSection()}
    ${renderAuctionLabNotesSection(true)}
    ${includePrivateAuctionSmoke ? renderPrivateAuctionSmokeSection(true) : ""}`;
}

function renderAdvancedGuideSection(configuredBasePath: string): string {
  return `<section id="advanced-start" class="panel panel-guide">
    ${renderPanelHead(
      "When To Use This Area",
      "This part of the website is for expert/reference work, not the common first-time path."
    )}
    <div class="guide-grid guide-grid-balanced">
      <article class="guide-card">
        <h3>Most People Can Ignore This</h3>
        <ul class="guide-list">
          <li>Use Auctions, Setup, Destinations, Transfer, and Explore for the normal website walkthrough.</li>
          <li>The website already hides most expert knobs from those pages on purpose.</li>
          <li>If you are learning the system for the first time, start there instead.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>What Belongs Here</h3>
        <ul class="guide-list">
          <li>Auction implementation notes and review links</li>
          <li>CLI-heavy workflows and custom protocol experiments</li>
          <li>Reviewer-facing docs and implementation notes</li>
        </ul>
      </article>
      <article class="guide-card guide-card-wide">
        <h3>Use The CLI For Custom Work</h3>
        <p>If you need custom value formats, multi-resolver fanout, policy modeling, deeper transfer/sale flows, or protocol research work, the CLI and docs are still the right tools.</p>
        <div class="guide-card-actions">
          <a class="action-link secondary" href="${DOC_URLS.fromZero}" target="_blank" rel="noreferrer noopener">Read from zero</a>
          <a class="action-link secondary" href="${DOC_URLS.launchSpec}" target="_blank" rel="noreferrer noopener">Launch spec</a>
          <a class="action-link secondary" href="${DOC_URLS.implementation}" target="_blank" rel="noreferrer noopener">Implementation</a>
        </div>
      </article>
    </div>
    <div class="hero-cta-row section-cta-row">
      <a class="action-link secondary" href="${withBasePath("/auctions", configuredBasePath)}">Open auctions</a>
      <a class="action-link secondary" href="${withBasePath("/explainer", configuredBasePath)}">Open overview</a>
      <a class="action-link secondary" href="${withBasePath("/setup", configuredBasePath)}">Back to setup</a>
    </div>
  </section>`;
}

function renderAdvancedReferencesSection(configuredBasePath: string): string {
  return `<section id="advanced-references" class="panel panel-guide">
    ${renderPanelHead(
      "Advanced Surfaces",
      "Use these when you want deeper auction context, implementation detail, or protocol-review material."
    )}
    <div class="guide-grid guide-grid-balanced">
      <article class="guide-card">
        <h3>Auction Implementation</h3>
        <p>Auction reference cases plus observed bid activity. The public auction page is now a primary acquisition surface; this area keeps deeper implementation and review context nearby.</p>
        <div class="guide-card-actions">
          <a class="action-link secondary" href="${withBasePath("/auctions", configuredBasePath)}">Open auctions</a>
        </div>
      </article>
      <article class="guide-card">
        <h3>Testing And Validation</h3>
        <p>Use the testing and implementation notes when you want to review what is actually exercised today versus what is still provisional.</p>
        <div class="guide-card-actions">
          <a class="action-link secondary" href="${DOC_URLS.testing}" target="_blank" rel="noreferrer noopener">Testing guide</a>
          <a class="action-link secondary" href="${DOC_URLS.implementation}" target="_blank" rel="noreferrer noopener">Implementation</a>
        </div>
      </article>
      <article class="guide-card">
        <h3>Protocol Review Docs</h3>
        <p>Use the launch and system docs when you want the higher-level protocol framing, tradeoffs, and current working assumptions.</p>
        <div class="guide-card-actions">
          <a class="action-link secondary" href="${DOC_URLS.fromZero}" target="_blank" rel="noreferrer noopener">From zero</a>
          <a class="action-link secondary" href="${DOC_URLS.launchSpec}" target="_blank" rel="noreferrer noopener">Launch spec</a>
        </div>
      </article>
    </div>
  </section>`;
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
  return `${renderExplainerJumpBar(configuredBasePath)}
    ${renderHomeModelSection()}
    ${renderHomeDestinationDiagramSection()}
    ${renderUsingOntSection(configuredBasePath)}
    ${renderHomeDocsSection()}`;
}

function renderAuctionLabSection(): string {
  return `<section id="auction-lab" class="panel panel-list">
    ${renderPanelHead(
      "Auction Reference Cases",
      "Reference view for eligible names and active auction states.",
      `<p>This page shows how the current auction model behaves once a name is eligible and a bidder opens the auction.</p>
      <ul>
        <li>The website shows the current read-only defaults for the reference cases below.</li>
        <li>The cards underneath are simulator-backed examples, not live protocol changes.</li>
        <li>A real auction starts with a valid bonded opening bid; before that, a name is only eligible or not eligible.</li>
      </ul>`
    )}
    <details class="detail-technical">
      <summary>Current website defaults</summary>
      <div class="detail-technical-body">
        <p class="field-note">The website keeps this read-only on purpose. If you want to model different release windows or other policy parameters, use the CLI instead of the website.</p>
        <p id="auctionLabMeta" class="helper-text">Loading current auction defaults and reference states.</p>
        <div id="auctionPolicySummary" class="guide-grid"></div>
      </div>
    </details>
    <div id="auctionLabList" class="activity-list"></div>
  </section>`;
}

function renderExperimentalAuctionFeedSection(): string {
  return `<section id="experimental-auction-feed" class="panel panel-list">
    ${renderPanelHead(
      "Observed Auction Activity",
      "Resolver-backed view derived from observed AUCTION_BID transactions.",
      `<p>This sits closer to observed chain behavior than the reference states above.</p>
      <ul>
        <li>The feed still uses prototype catalog entries while fully on-demand auction-opening tooling is being built.</li>
        <li>Leaders, minimum next bids, stale-state rejection, and bond spend/release summaries are derived from observed AUCTION_BID transactions.</li>
        <li>A real auction begins when a valid bonded opening bid confirms; names with no opening bid should not be described as failed auctions.</li>
        <li>Bids that merely clear the normal increment are not enough during soft close if they would extend the auction. Late extension bids use the stronger soft-close increment rule.</li>
        <li>Same-bidder replacement is only recognized when the later bid spends the prior bid bond outpoint.</li>
        <li>This feed is a prototype view; final launch settlement rules are not frozen yet.</li>
      </ul>`
    )}
    <p id="experimentalAuctionMeta" class="helper-text">Loading observed bid activity.</p>
    <div id="experimentalAuctionList" class="activity-list"></div>
  </section>`;
}

function renderAuctionLabNotesSection(collapsible = false): string {
  const body = `<div class="guide-grid">
      <article class="guide-card">
        <h3>Implemented</h3>
        <ul class="guide-list">
          <li>The current auction classes, opening floors, soft close, and minimum increments are modeled here.</li>
          <li>Opening-bid packages that bind the name, bidder, owner key, bonded amount, and observed state.</li>
          <li>A stronger soft-close increment rule so bids that extend the clock must escalate more than normal mid-auction bids.</li>
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
          <li>Settlement is implemented for the experimental path, but final launch settlement rules are not frozen yet.</li>
          <li>The chain-derived feed is still a prototype view, not a mainnet launch commitment.</li>
          <li>The values here are working defaults, not yet locked protocol parameters.</li>
          <li>For deeper policy experiments or custom bid flows, use the CLI rather than the website.</li>
        </ul>
      </article>
    </div>`;

  if (!collapsible) {
    return `<section class="panel panel-guide">
      ${renderPanelHead(
        "Launch Status",
        "What is already working here, what remains provisional, and which parts are still derived rather than final."
      )}
      ${body}
    </section>`;
  }

  return `<details class="panel panel-guide panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>Launch Status</h2>
        <p>See what is already implemented, what is still provisional, and where auction settlement is still not final.</p>
      </div>
      <span class="summary-chip">Open summary</span>
    </summary>
    <div class="collapsible-panel-body">${body}</div>
  </details>`;
}

function renderHomeActionsSection(configuredBasePath: string): string {
  return `<section id="start-here" class="panel panel-guide panel-home">
    ${renderPanelHead(
      "Choose A Path",
      "Use the home page to do one thing quickly: understand the model, try the prototype, or inspect the live registry."
    )}
    <div class="path-grid">
      <article class="path-card">
        <p class="path-card-kicker">Read</p>
        <h3>Understand ONT</h3>
        <p>Read the overview when you want how the current prototype works, what is live today, and where to go next.</p>
        <div class="path-card-actions">
          <a class="action-link secondary" href="${withBasePath("/explainer", configuredBasePath)}">Open overview</a>
        </div>
      </article>
      <article class="path-card">
        <p class="path-card-kicker">Walk Through</p>
        <h3>Try The Prototype</h3>
        <p>Set up Sparrow, then open Auctions to prepare a bid package with the same wallet you will use to sign.</p>
        <div class="path-card-actions">
          <a class="action-link secondary" href="${withBasePath("/setup", configuredBasePath)}">Open setup</a>
          <a class="action-link secondary" href="${withBasePath("/auctions", configuredBasePath)}">Open auctions</a>
        </div>
      </article>
      <article class="path-card">
        <p class="path-card-kicker">Inspect</p>
        <h3>Explore The Registry</h3>
        <p>Resolve a name, browse recent activity, and inspect the current visible registry without working through the full auction flow.</p>
        <div class="path-card-actions">
          <a class="action-link secondary" href="${withBasePath("/explore", configuredBasePath)}">Open explorer</a>
        </div>
      </article>
    </div>
    <p class="tool-handoff-note">Need a stable place for the full map? Use the footer below for docs and prototype surfaces.</p>
  </section>`;
}

function renderHomeModelSection(): string {
  return `<section id="how-ont-works" class="panel panel-guide">
    ${renderPanelHead(
      "How It Works",
      "Follow one name from Bitcoin ownership to the destinations apps can use."
    )}
    <div class="protocol-flow" aria-label="ONT lifecycle for alice">
      <article class="protocol-flow-card protocol-flow-card-chain">
        <div class="protocol-flow-card-head">
          <p class="protocol-flow-number">01</p>
          <p class="protocol-flow-place">Bitcoin</p>
        </div>
        <h3>Win At Auction</h3>
        <p>Bitcoin establishes that <span class="mono">alice</span> is controlled by an owner key and backed by bonded bitcoin.</p>
        <div class="protocol-example" aria-label="Auction ownership example">
          <p><span>name</span><strong class="mono">alice</strong></p>
          <p><span>auction</span><strong>won</strong></p>
          <p><span>owner</span><strong class="mono">8f3c...12ab</strong></p>
          <p><span>bond</span><strong>self-custody</strong></p>
        </div>
      </article>
      <div class="protocol-flow-arrow" aria-hidden="true"></div>
      <article class="protocol-flow-card protocol-flow-card-record">
        <div class="protocol-flow-card-head">
          <p class="protocol-flow-number">02</p>
          <p class="protocol-flow-place">Resolver</p>
        </div>
        <h3>Publish Off-Chain</h3>
        <p>The owner signs the current destinations for <span class="mono">alice</span>. Resolvers store that signed record.</p>
        <div class="protocol-example protocol-example-destinations" aria-label="Destination examples">
          <p><span>btc</span><strong class="mono">bc1qxy...0wlh</strong></p>
          <p><span>lightning</span><strong class="mono">lno1q...9sa</strong></p>
          <p><span>email</span><strong class="mono">alice@example.com</strong></p>
          <p><span>website</span><strong class="mono">alice.example</strong></p>
        </div>
      </article>
      <div class="protocol-flow-arrow" aria-hidden="true"></div>
      <article class="protocol-flow-card protocol-flow-card-client">
        <div class="protocol-flow-card-head">
          <p class="protocol-flow-number">03</p>
          <p class="protocol-flow-place">Client</p>
        </div>
        <h3>Resolve And Verify</h3>
        <p>Clients check Bitcoin ownership, verify the owner signature, and use the destination type they understand.</p>
        <div class="protocol-result">
          <p class="mono">alice</p>
          <span>resolves to</span>
          <p class="mono">website -&gt; alice.example</p>
        </div>
      </article>
    </div>
  </section>`;
}

function renderExplainerJumpBar(_configuredBasePath: string): string {
  return `<nav class="jump-bar jump-bar-overview" aria-label="Overview sections">
    <span class="jump-bar-label">Overview sections</span>
    <a href="#how-ont-works">How it works</a>
    <a href="#one-name-many-destinations">One name, many destinations</a>
    <a href="#using-ont">Use the prototype</a>
    <a href="#current-docs">Current status</a>
  </nav>`;
}

function renderHomeDestinationDiagramSection(): string {
  return `<section id="one-name-many-destinations" class="panel panel-guide">
    ${renderPanelHead(
      "One Name, Many Destinations",
      "The chain owns the name. The signed record says what it points to right now."
    )}
    <div class="destination-map" aria-label="How alice maps to destinations">
      <article class="destination-map-anchor">
        <p class="destination-map-kicker">Bitcoin anchor</p>
        <h3 class="mono">alice</h3>
        <p>Ownership and transfers stay public and auditable on Bitcoin.</p>
        <div class="destination-map-mini">
          <span>owner</span>
          <strong class="mono">8f3c...12ab</strong>
        </div>
      </article>
      <div class="destination-map-rail" aria-hidden="true"></div>
      <article class="destination-map-record">
        <div>
          <p class="destination-map-kicker">Resolver record</p>
          <h3>Latest owner-signed bundle</h3>
          <p>Resolvers keep the mutable destination layer off-chain. The current owner can update this bundle without putting every change on Bitcoin.</p>
        </div>
        <div class="destination-token-grid" aria-label="Example destinations for alice">
          ${renderDestinationToken("Bitcoin", "bc1qxy...0wlh")}
          ${renderDestinationToken("Lightning", "lno1q...9sa")}
          ${renderDestinationToken("Email", "alice@example.com")}
          ${renderDestinationToken("Phone", "+1 415 555 0123")}
          ${renderDestinationToken("Website", "alice.example")}
          ${renderDestinationToken("LinkedIn", "linkedin.com/in/alice")}
          ${renderDestinationToken("Signal", "alice_12")}
          ${renderDestinationToken("Cash App", "$alice1234")}
        </div>
      </article>
      <div class="destination-map-rail" aria-hidden="true"></div>
      <article class="destination-map-client">
        <p class="destination-map-kicker">Clients</p>
        <h3>Use what they understand</h3>
        <p>A wallet can use the Bitcoin or Lightning destination. A browser can use the website. A contact app can use email or phone.</p>
      </article>
    </div>
    <p class="tool-handoff-note">Small on-chain footprint, flexible off-chain records, and client-side verification of the latest owner-authorized data.</p>
  </section>`;
}

function renderDestinationToken(serviceName: string, serviceValue: string): string {
  return `<article class="destination-token">
    <p>${escapeHtml(serviceName)}</p>
    <strong class="mono">${escapeHtml(serviceValue)}</strong>
  </article>`;
}

function renderHomeDocsSection(): string {
  return `<section id="current-docs" class="panel panel-guide">
    ${renderPanelHead(
      "Current Status",
      "The hosted demo is real, but it is still a prototype. Use this page to separate what works now from what is still under active design."
    )}
    <div class="guide-grid guide-grid-balanced">
      <article class="guide-card">
        <h3>Works Today</h3>
        <ul class="guide-list">
          <li>Hosted signet setup and auction inspection</li>
          <li>Self-hosted website and resolver</li>
          <li>Browser value publishing</li>
          <li>Auction bid-package handoffs and live auction smoke checks</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Still Prototype</h3>
        <ul class="guide-list">
          <li>Transfers still rely on external signer and CLI steps.</li>
          <li>Resolver availability is only partly decentralized in v1.</li>
          <li>The universal-auction launch flow is implemented as a prototype and still not mainnet-ready.</li>
          <li>Mainnet-ready usage is not ready yet.</li>
        </ul>
      </article>
      <article class="guide-card guide-card-wide guide-card-links">
        <h3>Read Next</h3>
        <ul class="guide-list">
          <li><a class="detail-link" href="${DOC_URLS.fromZero}" target="_blank" rel="noreferrer noopener">ONT From Zero</a></li>
          <li><a class="detail-link" href="${DOC_URLS.implementation}" target="_blank" rel="noreferrer noopener">Implementation &amp; Validation</a></li>
          <li><a class="detail-link" href="${DOC_URLS.launchSpec}" target="_blank" rel="noreferrer noopener">Launch Spec v0</a></li>
        </ul>
        <div class="guide-card-actions">
          <a class="action-link secondary" href="${DOC_URLS.fromZero}" target="_blank" rel="noreferrer noopener">Read from zero</a>
          <a class="action-link secondary" href="${DOC_URLS.implementation}" target="_blank" rel="noreferrer noopener">Implementation</a>
          <a class="action-link secondary" href="${DOC_URLS.launchSpec}" target="_blank" rel="noreferrer noopener">Launch spec</a>
        </div>
      </article>
    </div>
  </section>`;
}

function renderUsingOntSection(configuredBasePath: string): string {
  return `<section id="using-ont" class="panel panel-guide">
    ${renderPanelHead(
      "Use The Website",
      "The website is meant for the common path. Use the CLI when you want custom artifacts, advanced overrides, or deeper protocol experiments."
    )}
    <div class="guide-grid">
      <article class="guide-card">
        <h3>Setup And Auctions</h3>
        <p>Use setup to connect Sparrow to the hosted demo wallet server, then use Auctions to inspect bid packages and current allocation behavior.</p>
      </article>
      <article class="guide-card">
        <h3>Explore</h3>
        <p>Use Explore when you want live registry data: name lookups, recent activity, and the tracked namespace.</p>
      </article>
      <article class="guide-card">
        <h3>Destinations And Transfer</h3>
        <p>Use the values and transfer surfaces after a name exists and you want to manage what it points to or hand off control.</p>
      </article>
      <article class="guide-card">
        <h3>Advanced Tools</h3>
        <p>If you want custom outputs, custom value formats, or deeper auction experimentation, use the Advanced area, CLI, and docs. Most new users can ignore those paths at first.</p>
      </article>
    </div>
    <div class="hero-cta-row section-cta-row">
      <a class="action-link" href="${withBasePath("/setup", configuredBasePath)}">Open setup</a>
      <a class="action-link" href="${withBasePath("/auctions", configuredBasePath)}">Open auctions</a>
      <a class="action-link secondary" href="${withBasePath("/explore", configuredBasePath)}">Open explorer</a>
      <a class="action-link secondary" href="${withBasePath("/values", configuredBasePath)}">Open destinations</a>
      <a class="action-link secondary" href="${withBasePath("/transfer", configuredBasePath)}">Open transfer</a>
      <a class="action-link secondary" href="${withBasePath("/advanced", configuredBasePath)}">Open advanced</a>
    </div>
  </section>`;
}

function renderSearchSection(): string {
  return `<section id="lookup" class="panel panel-search panel-home">
    ${renderPanelHead(
      "Check A Name",
      "Resolve a name, inspect ownership, or continue into the auction flow."
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
        <span class="stat-label">Current Height</span>
        <strong id="currentHeight">-</strong>
      </article>
    </div>`;

  if (!collapsible) {
    return `<section id="overview" class="panel panel-overview">
    ${renderPanelHead(
      "Live Snapshot",
      "Quick snapshot of the currently visible namespace.",
      `<p>Current tracked names and chain height.</p>
      <ul>
        <li><strong>Tracked Names</strong> are names the resolver currently recognizes.</li>
        <li><strong>Current Height</strong> tells you which block the snapshot is based on.</li>
      </ul>`
    )}
    ${body}
  </section>`;
  }

  return `<details id="overview" class="panel panel-overview panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>Live Snapshot</h2>
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
      "Recent Changes",
      "Latest changes, with the most interesting items surfaced first.",
      `<p>Lifecycle transitions across auctions, transfers, value updates, and releases.</p>
      <ul>
        <li>Auction bids and settlements</li>
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
        <h2>Recent Changes</h2>
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
        <li><strong>Owned</strong> means the name currently has a valid owner.</li>
        <li><strong>Transferred</strong> means ownership moved after acquisition.</li>
        <li><strong>Invalidated</strong> means the name later failed continuity.</li>
      </ul>`
    )}
    <div id="recentNamesState" class="list-status">Loading recent names...</div>
    <div id="recentNamesList" class="recent-names-list"></div>
  </section>`;
}

function renderPrivateAuctionSmokeSection(collapsible = false): string {
  const body = `<p id="privateAuctionSmokeMeta" class="helper-text">Checking the latest private signet auction smoke run.</p>
    <div id="privateAuctionSmokeResult" class="result-card empty">Loading the latest private signet auction smoke status...</div>`;

  if (!collapsible) {
    return `<section class="panel panel-live-smoke">
    ${renderPanelHead(
      "Auction Demo Check",
      "Latest status from the hosted private-signet auction walkthrough.",
      `<p>This is the current live-chain proof for the auction slice.</p>
      <ul>
        <li>It starts from a dedicated prototype catalog entry, then opens the auction with a real bonded bid.</li>
        <li>It submits an opening bid, then a higher bid, settles the auction into a live owned name, publishes winner destinations, and later transfers that name after the winner lock clears.</li>
        <li>It still spends the losing bond early to prove the chain-derived feed flags that violation.</li>
        <li>The resulting website feed shows accepted bid history, settlement state, post-settlement handoff, and bond spend / release consequences.</li>
      </ul>`
    )}
    ${body}
  </section>`;
  }

  return `<details class="panel panel-live-smoke panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>Auction Demo Check</h2>
        <p>Latest status from the hosted private-signet auction walkthrough: bidding, settlement, winner handoff, and release-valve checks.</p>
      </div>
      <span class="summary-chip">Open demo check</span>
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
      "Open Sparrow in signet mode, point it at the hosted demo wallet endpoint, then return to auctions."
    )}
    <p class="tool-handoff-note">No SSH access is required for this hosted path. Sparrow talks to the demo chain through a public wallet endpoint while the underlying Bitcoin Core RPC stays private on the server.</p>
    <div class="guide-grid">
      <article class="guide-card">
        <h3>1. Open Sparrow In Signet Mode</h3>
        <ul class="guide-list">
          <li>Use Sparrow for this hosted walkthrough.</li>
          <li>Launch Sparrow in <code>signet</code> mode.</li>
          <li>Use the same wallet you plan to spend from when you bid.</li>
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
        <h3>3. Confirm Balance, Then Open Auctions</h3>
        <ul class="guide-list">
          <li>Use the funding form below to request demo coins.</li>
          <li>Refresh Sparrow and confirm the balance appears in the same wallet.</li>
          <li>Then return to Auctions and inspect the bid handoff.</li>
        </ul>
      </article>
    </div>
    <div class="hero-cta-row section-cta-row">
      <a class="action-link" href="${withBasePath("/auctions", configuredBasePath)}">Open auctions</a>
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
    <p class="tool-handoff-note">${formatBitcoinDisplay(privateSignetFundingAmountSats)} per request, with one block mined immediately so Sparrow sees a confirmed balance.</p>
    <form id="privateFundingForm" class="tool-draft-form">
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
          <span class="field-hint">Use the same wallet you plan to spend from for demo auction transactions. If Sparrow cannot see the funds afterward, the hosted demo server settings are usually the missing step.</span>
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

function renderSetupSupportStrip(configuredBasePath: string): string {
  return `<section id="setup-support" class="panel panel-support-strip">
    ${renderLinkStrip("Related tools", [
      { href: withBasePath("/auctions", configuredBasePath), label: "Open auctions" },
      { href: withBasePath("/explainer", configuredBasePath), label: "Open overview" },
      { href: withBasePath("/explore", configuredBasePath), label: "Open explorer" }
    ])}
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
                  <h3>Load The Name</h3>
                  <p>Start with the owned name you control. The site will load its current owner and any destinations already published.</p>
                </div>
              </div>
              <span id="valueStepInspectState" class="summary-chip wizard-step-state">Start here</span>
        </summary>
        <div class="wizard-step-body">
          <div class="value-intake-grid">
            <form id="valueLookupForm" class="tool-draft-form">
              <div class="draft-grid">
                <label class="draft-field">
                  <span class="field-label">Name</span>
                  <input id="valueNameInput" name="valueName" type="text" maxlength="32" placeholder="alice" autocomplete="off" />
                  <span class="field-hint">Use a name that is already owned and visible in the explorer.</span>
                </label>
              </div>
              <div class="draft-actions">
                <button id="valueInspectButton" type="submit">Load name</button>
              </div>
            </form>
            <article class="guide-card value-intake-callout">
              <h3>What You Need</h3>
              <ul class="guide-list">
                <li>The owner private key saved for this name.</li>
                <li>The destinations you want apps to use now.</li>
                <li>The resolver receives the signed update, not your private key.</li>
              </ul>
            </article>
          </div>
          <div id="valueLookupResult" class="result-card empty">
            Enter an owned name to load its current owner and destinations.
          </div>
        </div>
      </details>
      <details id="value-step-sign" class="claim-flow-step wizard-step">
        <summary class="wizard-step-summary">
              <div class="wizard-step-heading">
                <span class="claim-step-badge">Step 2</span>
                <div class="wizard-step-copy">
                  <h3>Edit Destinations And Sign</h3>
                  <p>Paste the owner private key, update the destination list, and sign the change locally.</p>
                </div>
              </div>
              <span id="valueStepSignState" class="summary-chip wizard-step-state">After step 1</span>
            </summary>
            <div class="wizard-step-body">
          <p class="field-note">Use the owner key for this name. This is the control key you saved when you won the auction or received the name, not the Sparrow funding wallet key unless you intentionally made them the same.</p>
          <form id="valueSignForm" class="tool-draft-form">
            <div class="draft-grid">
              <label class="draft-field">
                <span class="field-label">Owner Private Key</span>
                <input
                  id="valueOwnerPrivateKeyInput"
                  name="valueOwnerPrivateKey"
                  type="password"
                  maxlength="64"
                  placeholder="Paste the 32-byte private key saved for this name"
                  autocomplete="off"
                  spellcheck="false"
                />
                <span id="valueOwnerMatchNote" class="field-hint">After you load a name, this key will be checked against the current owner.</span>
              </label>
              <input id="valueOwnerPubkeyPreview" name="valueOwnerPubkeyPreview" type="hidden" />
              <input id="valueSequenceInput" name="valueSequence" type="hidden" value="1" />
              <input id="valueTypeInput" name="valueType" type="hidden" value="255:bundle" />
              <span id="valueSequenceHint" class="field-hint" hidden>Load the current name first to confirm the next sequence.</span>
              <label id="valuePayloadField" class="draft-field draft-field-full" hidden>
                <span class="field-label">Payload</span>
                <textarea
                  id="valuePayloadInput"
                  name="valuePayload"
                  placeholder="https://example.com"
                  spellcheck="false"
                ></textarea>
                <span id="valuePayloadHint" class="field-hint">Website and payment targets are encoded as normal text. For raw or app-defined binary data, use the CLI.</span>
              </label>
              <div id="valueBundleEditor" class="value-bundle-editor draft-field-full">
                <div class="value-bundle-editor-head">
                  <h4>Destinations</h4>
                  <p>Add the places this name should point right now. Apps can use the entries they understand.</p>
                </div>
                <div id="valueBundleRows" class="value-bundle-rows"></div>
                <div class="draft-actions">
                  <button id="addValueBundleEntryButton" type="button" class="secondary-button">Add Destination</button>
                </div>
                <span class="field-hint">Examples: <span class="mono">btc -&gt; bc1qxy...0wlh</span>, <span class="mono">lightning -&gt; lno1q...9sa</span>, <span class="mono">email -&gt; alice@example.com</span>, <span class="mono">website -&gt; alice.example</span>, <span class="mono">cashapp -&gt; $alice1234</span>.</span>
              </div>
            </div>
            <div class="draft-actions claim-step-actions">
              <button id="valueSignButton" type="submit">Sign Destination Update</button>
              <button id="downloadSignedValueButton" type="button" class="secondary-button" disabled>Download Signed Update (.json)</button>
            </div>
          </form>
          <div id="valueSignResult" class="result-card empty">
            Load an owned name, then sign the destination update locally in this browser.
          </div>
        </div>
      </details>
      <details id="value-step-publish" class="claim-flow-step claim-flow-step-emphasis wizard-step">
        <summary class="wizard-step-summary">
              <div class="wizard-step-heading">
                <span class="claim-step-badge">Step 3</span>
                <div class="wizard-step-copy">
                  <h3>Publish The Update</h3>
                  <p>Send the signed update to the resolver. Ownership stays on-chain; the resolver stores the latest owner-authorized destinations.</p>
                </div>
              </div>
              <span id="valueStepPublishState" class="summary-chip wizard-step-state">After step 2</span>
            </summary>
            <div class="wizard-step-body">
          <p id="valuePublishModeNote" class="field-note">Publishing sends only the signed JSON update. The owner private key never leaves the page.</p>
          <div class="draft-actions claim-step-actions">
            <button id="publishValueButton" type="button" disabled>Publish Destinations</button>
          </div>
          <div id="valuePublishResult" class="result-card empty">
            Sign the update first. Then this step will publish it to the resolver and reload the current destinations.
          </div>
        </div>
      </details>
    </div>
  </section>`;
}

function renderValuesGuideSection(configuredBasePath: string): string {
  return `<section id="values-guide" class="panel panel-guide">
    ${renderPanelHead(
      "How Destination Updates Work",
      "The name owner signs a small off-chain record. Resolvers store that record, while Bitcoin remains the source of ownership.",
      `<p>The website focuses on normal destination bundles. Use the CLI for raw payloads, custom formats, or multi-resolver fanout.</p>`
    )}
    <div class="guide-grid guide-grid-balanced">
      <article class="guide-card">
        <h3>What Gets Published</h3>
        <ul class="guide-list">
          <li>A signed JSON update for the current ownership interval.</li>
          <li>The destination entries you choose, such as bitcoin, lightning, email, or website.</li>
          <li>No private key material.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Which Key You Need</h3>
        <ul class="guide-list">
          <li>Use the <strong>owner key</strong> saved for the name.</li>
          <li>If the owner key no longer matches the current owner, publish will fail.</li>
          <li>After a transfer, only the new owner can publish fresh values.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Common Things A Name Can Point To</h3>
        <ul class="guide-list">
          <li>A single website URL</li>
          <li>A single Bitcoin payment target</li>
          <li>A bundled list of repeatable key/value entries like <span class="mono">btc -&gt; bc1qxy...0wlh</span>, <span class="mono">lightning -&gt; lno1q...9sa</span>, <span class="mono">website -&gt; alice.example</span>, and <span class="mono">cashapp -&gt; $alice1234</span></li>
        </ul>
        <div class="guide-card-actions">
          <a class="action-link secondary" href="${withBasePath("/values", configuredBasePath)}">Open destinations tool</a>
        </div>
      </article>
      <article class="guide-card guide-card-wide">
        <h3>Find A Live Name First</h3>
        <p>Destinations are signed by the current owner key. Start in Explore if you need a live name from the resolver, or Auctions if you want to inspect how names become owned.</p>
        <div class="guide-card-actions">
          <a class="action-link secondary" href="${withBasePath("/explore", configuredBasePath)}">Open explorer</a>
          <a class="action-link secondary" href="${withBasePath("/auctions", configuredBasePath)}">Open auctions</a>
        </div>
      </article>
    </div>
  </section>`;
}

function renderValuesSupportStrip(configuredBasePath: string): string {
  return `<section id="values-support" class="panel panel-support-strip">
    ${renderLinkStrip("Related tools", [
      { href: withBasePath("/auctions", configuredBasePath), label: "Open auctions" },
      { href: withBasePath("/transfer", configuredBasePath), label: "Transfer a name" },
      { href: withBasePath("/explore", configuredBasePath), label: "Open explorer" },
      { href: withBasePath("/explainer", configuredBasePath), label: "Open overview" }
    ])}
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
        <h3>Why do I need the hosted demo endpoint?</h3>
        <p>The hosted demo runs on a private signet chain. Use the endpoint shown above so Sparrow follows the same demo chain as the website.</p>
      </article>
      <article class="guide-card">
        <h3>What about other wallets later?</h3>
        <p>Broader wallet support should still get easier over time, but the website path is intentionally narrowed to Sparrow today. If you want a custom signer workflow, use the CLI and docs.</p>
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
      "What This Page Does",
      "A transfer changes who controls the name. For sales, payment and ownership change should be checked against the same transaction.",
      `<p>The site prepares role-specific packages. Signing and broadcast still happen outside the website.</p>`
    )}
    <div class="guide-grid guide-grid-balanced">
      <article class="guide-card">
        <h3>Receiver</h3>
        <ul class="guide-list">
          <li>Create the new control key.</li>
          <li>Give only the pubkey to the current owner.</li>
          <li>Review the buyer package before signing or funding anything.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Current Owner</h3>
        <ul class="guide-list">
          <li>Paste the receiver's pubkey.</li>
          <li>Add a seller payout address only for sales.</li>
          <li>Export packages so both sides review the same plan.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>For Sales</h3>
        <ul class="guide-list">
          <li>Buyer payment and ONT ownership change should settle in one Bitcoin transaction.</li>
          <li>Do not treat payment and transfer as separate promises.</li>
          <li>Use the CLI package review when checking handoff files outside the website.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Prototype Status</h3>
        <ul class="guide-list">
          <li>The website prepares the handoff packages.</li>
          <li>The CLI and your signer finish the transaction.</li>
          <li>The current implementation is not yet a full two-party PSBT wizard for buyer and seller.</li>
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
              <h3>Start With Your Role</h3>
              <p>The receiver creates the new control key. The current owner uses that pubkey to build the transfer handoff.</p>
            </div>
          </div>
          <span id="transferStepInputsState" class="summary-chip wizard-step-state">Start here</span>
        </summary>
        <div class="wizard-step-body">
          <div class="transfer-role-workflow">
            <section class="transfer-role-panel transfer-role-panel-receiver">
              <p class="support-strip-label">I am receiving a name</p>
              <div class="result-title">
                <h3>Create The Recipient Key</h3>
                <span class="status-pill transfer">receiver</span>
              </div>
              <p class="field-value">Create the key that should control the name after transfer. Share only the pubkey with the current owner.</p>
              <div class="field-actions">
                <button id="generateTransferOwnerKeyLocalButton" type="button">Create Recipient Key</button>
              </div>
              <div id="transferRecipientKeyResult" class="result-card empty">
                Create the recipient key in this browser, then give only the pubkey to the current owner.
              </div>
              <p class="field-note">After the current owner sends you a buyer package, review it on this page or run <code>inspect-transfer-package --role buyer &lt;path&gt;</code>.</p>
            </section>
            <section class="transfer-role-panel transfer-role-panel-sender">
              <p class="support-strip-label">I am sending a name</p>
              <div class="result-title">
                <h3>Build The Transfer Handoff</h3>
                <span class="status-pill transfer">current owner</span>
              </div>
              <p class="field-value">Paste the receiver's pubkey, then build the plan both sides will review.</p>
              <form id="transferDraftForm" class="tool-draft-form">
                <div class="draft-grid">
                  <label class="draft-field">
                    <span class="field-label">Name</span>
                    <input id="transferNameInput" name="transferName" type="text" maxlength="32" placeholder="alice" autocomplete="off" />
                  </label>
                  <label class="draft-field">
                    <span class="field-label">Recipient Pubkey (new control key)</span>
                    <input
                      id="transferNewOwnerPubkeyInput"
                      name="transferNewOwnerPubkey"
                      type="text"
                      maxlength="64"
                      placeholder="Paste the buyer's 32-byte x-only control pubkey in hex"
                      autocomplete="off"
	                    />
	                <span class="field-hint">This becomes the new control key for the name after transfer.</span>
	                  </label>
	                  <label class="draft-field">
	                    <span class="field-label">Seller Payout Address (only for sales)</span>
                    <input
                      id="transferSellerPayoutAddressInput"
                      name="transferSellerPayoutAddress"
                      type="text"
                      placeholder="Only needed if seller payment should happen in the same transaction"
                      autocomplete="off"
                    />
                  </label>
                </div>
                <input id="transferModeInput" name="transferMode" type="hidden" value="auto" />
                <input id="transferBondAddressInput" name="transferBondAddress" type="hidden" value="" />
                <div class="draft-actions">
	                  <button type="submit">Build Transfer Plan</button>
	                </div>
	              </form>
            </section>
          </div>
        </div>
      </details>
      <details id="transfer-step-review" class="claim-flow-step wizard-step">
        <summary class="wizard-step-summary">
          <div class="wizard-step-heading">
            <span class="claim-step-badge">Step 2</span>
            <div class="wizard-step-copy">
              <h3>Export And Review Packages</h3>
              <p>Export role-specific packages, then review any package you receive before signing or funding anything.</p>
            </div>
          </div>
          <span id="transferStepReviewState" class="summary-chip wizard-step-state">After step 1</span>
        </summary>
        <div class="wizard-step-body">
          <p class="field-note">Both exports come from the same transfer plan. Seller and receiver should each review the role-specific package against the same transaction details. The CLI can also validate a package with <code>inspect-transfer-package --role buyer|seller &lt;path&gt;</code>.</p>
          <div class="transfer-export-grid">
            <article class="guide-card transfer-export-card">
              <div class="result-title">
                <h3>Seller Handoff</h3>
                <span class="status-pill transfer">seller</span>
              </div>
	              <p>For the current owner to check recipient details, payout expectations, and the recommended transfer mode.</p>
              <div class="transfer-export-actions">
                <button id="downloadTransferSellerPackageButton" type="button">Download Seller Package</button>
                <button id="downloadTransferSellerNotesButton" type="button" class="secondary-button">Download Seller Notes</button>
              </div>
            </article>
            <article class="guide-card transfer-export-card">
              <div class="result-title">
                <h3>Buyer Handoff</h3>
                <span class="status-pill transfer">buyer</span>
              </div>
	              <p>For the receiver to check the new owner pubkey, sale path, and transaction details before signing or funding anything.</p>
              <div class="transfer-export-actions">
                <button id="downloadTransferBuyerPackageButton" type="button">Download Buyer Package</button>
                <button id="downloadTransferBuyerNotesButton" type="button" class="secondary-button">Download Buyer Notes</button>
              </div>
            </article>
          </div>
          <section class="transfer-package-review-tool">
            <div class="transfer-package-review-head">
              <p class="support-strip-label">Check a package someone sent you</p>
              <h3>Review A Transfer Package</h3>
              <p>Upload or paste a buyer/seller package and choose your role. The page will show the checks that matter for that side of the handoff.</p>
            </div>
            <div class="draft-grid">
              <label class="draft-field">
                <span class="field-label">I Am Reviewing As</span>
                <select id="transferReviewRoleInput" name="transferReviewRole">
                  <option value="buyer" selected>Receiver / buyer</option>
                  <option value="seller">Current owner / seller</option>
                </select>
                <span class="field-hint">This changes the checklist, not the package itself.</span>
              </label>
              <label class="draft-field">
                <span class="field-label">Package File</span>
                <input id="transferReviewFileInput" name="transferReviewFile" type="file" accept="application/json,.json" />
                <span class="field-hint">Upload a downloaded transfer package, or paste the JSON below.</span>
              </label>
              <label class="draft-field draft-field-full">
                <span class="field-label">Package JSON</span>
                <textarea
                  id="transferReviewPackageInput"
                  name="transferReviewPackage"
                  placeholder='Paste the buyer or seller package JSON here'
                  spellcheck="false"
                ></textarea>
              </label>
              <div class="draft-actions claim-step-actions">
                <button id="reviewTransferPackageButton" type="button">Review Package</button>
              </div>
            </div>
          </section>
          <div id="transferDraftResult" class="result-card empty">
            Enter an owned name and the recipient pubkey to build a transfer-ready handoff.
          </div>
          <div id="transferPackageReviewResult" class="result-card empty">
            Paste or upload a transfer package JSON file to review it from the buyer or seller side.
          </div>
        </div>
      </details>
    </div>
  </section>`;
}

function renderTransferSupportStrip(configuredBasePath: string): string {
  return `<section id="transfer-support" class="panel panel-support-strip">
    ${renderLinkStrip("Related tools", [
      { href: withBasePath("/auctions", configuredBasePath), label: "Open auctions" },
      { href: withBasePath("/values", configuredBasePath), label: "Update destinations" },
      { href: withBasePath("/explore", configuredBasePath), label: "Open explorer" },
      { href: withBasePath("/explainer", configuredBasePath), label: "Open overview" }
    ])}
  </section>`;
}

function renderSiteFooter(configuredBasePath: string): string {
  return `<footer class="site-footer">
    <div class="site-footer-brand">
      <p class="site-footer-kicker">${escapeHtml(PRODUCT_NAME)}</p>
      <p class="site-footer-copy">Bitcoin-anchored names, owner-signed destinations, and the current prototype surfaces.</p>
    </div>
    <div class="site-footer-grid">
      <section class="site-footer-group">
        <h2>Learn</h2>
        <div class="site-footer-links">
          <a href="${withBasePath("/explainer", configuredBasePath)}">Overview</a>
          <a href="${DOC_URLS.fromZero}" target="_blank" rel="noreferrer noopener">From Zero</a>
          <a href="${DOC_URLS.launchSpec}" target="_blank" rel="noreferrer noopener">Launch Spec</a>
        </div>
      </section>
      <section class="site-footer-group">
        <h2>Try</h2>
        <div class="site-footer-links">
          <a href="${withBasePath("/setup", configuredBasePath)}">Setup</a>
          <a href="${withBasePath("/auctions", configuredBasePath)}">Auctions</a>
          <a href="${withBasePath("/values", configuredBasePath)}">Destinations</a>
          <a href="${withBasePath("/transfer", configuredBasePath)}">Transfer</a>
          <a href="${withBasePath("/explore", configuredBasePath)}">Explore</a>
          <a href="${withBasePath("/advanced", configuredBasePath)}">Advanced</a>
        </div>
      </section>
    </div>
  </footer>`;
}

function renderLinkStrip(
  label: string,
  links: Array<{ href: string, label: string, external?: boolean }>
): string {
  return `<div class="link-strip">
    <p class="link-strip-label">${escapeHtml(label)}</p>
    <div class="link-strip-actions">
      ${links
        .map((link) => {
          const rel = link.external ? ' target="_blank" rel="noreferrer noopener"' : "";
          return `<a class="link-chip" href="${escapeHtml(link.href)}"${rel}>${escapeHtml(link.label)}</a>`;
        })
        .join("")}
    </div>
  </div>`;
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
      "All Names",
      "Grouped by lifecycle state for faster browsing.",
      `<p>Names are grouped so you can focus on what is interesting first.</p>
      <ul>
        <li><strong>Auctioning</strong> names are still in market discovery.</li>
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
        <h2>All Names</h2>
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
