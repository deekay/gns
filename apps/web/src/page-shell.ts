import { PRODUCT_NAME } from "@ont/protocol";

export type PageKind = "home" | "explore" | "advanced" | "auctions" | "values" | "transfer" | "setup" | "explainer";
const GITHUB_REPO_URL = "https://github.com/deekay/ont";
const GITHUB_BLOB_BASE_URL = `${GITHUB_REPO_URL}/blob/main`;
const ASSET_VERSION = "2026-04-28-ux-audit-7";
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
      ? "Search a name, check ownership, and open the public auction path for Open Name Tags."
      : pageKind === "advanced"
      ? "Open Name Tags reference material for CLI-heavy workflows and protocol review."
    : pageKind === "auctions"
      ? "Check a name, review length-based opening floors, and prepare the auction path."
      : pageKind === "values"
        ? "Update the destinations for an owned Open Name Tags name by signing locally and publishing the signed update."
      : pageKind === "transfer"
        ? "Prepare an Open Name Tags transfer handoff, then finish the gift or sale flow with your signer."
      : pageKind === "setup"
          ? "Set up Sparrow, connect to the hosted private signet endpoint, request private signet coins, and prepare auction transactions."
        : pageKind === "explainer"
          ? "Quick orientation for using the hosted Open Name Tags tools."
        : "Explorer for browsing owned names, recent activity, and current Open Name Tags state.";

  const pageScripts = [
    `<script type="module" src="${withBasePath(`/app.js?v=${ASSET_VERSION}`, basePath)}"></script>`,
    pageKind === "values"
      ? `<script type="module" src="${withBasePath(`/value-tools.js?v=${ASSET_VERSION}`, basePath)}"></script>`
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
    <link rel="stylesheet" href="${withBasePath(`/styles.css?v=${ASSET_VERSION}`, basePath)}" />
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
            ? renderAuctionsPageSections(basePath)
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
  configuredBasePath: string,
  configuredNetworkLabel: string,
  pageKind: PageKind
): string {
  if (pageKind === "transfer") {
    return `<header class="hero hero-single hero-page hero-page-transfer">
      <div class="hero-copy">
        <h1>Transfer A Name</h1>
        <p class="lede">
          Send or receive a name by moving control to a new owner key. The website prepares the handoff; your signer finishes the transaction.
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
        <h1>How ONTs Work</h1>
        <p class="lede">
          Ownership, destinations, and public bonded auctions.
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "setup") {
    return `<header class="hero hero-single hero-page hero-page-setup">
      <div class="hero-copy">
        <h1>Set Up Your Wallet</h1>
        <p class="lede">
          Common Sparrow setup for the hosted private signet environment: connect once, fund the same wallet, then use that wallet for auction signing.
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "explore") {
    return `<header class="hero hero-single hero-page hero-page-explore">
      <div class="hero-copy">
        <h1>Explore The Live Registry</h1>
        <p class="lede">
          Recent names, current activity, and visible ownership state.
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
          Check a name, see its length-based opening floor, and prepare the bid path that starts a public auction.
        </p>
        <p class="hero-status">
          Bonded public auctions · ownership on Bitcoin · destinations off-chain.
        </p>
      </div>
    </header>`;
  }

  return `<header class="hero hero-home hero-home-product">
    <section class="hero-home-copy" aria-labelledby="homeHeroTitle">
      <p class="hero-home-kicker">Bitcoin-bonded names</p>
      <h1 id="homeHeroTitle">Names you can actually own</h1>
      <p class="hero-home-lede">
        ONTs are names you can own, verify, and update. Bitcoin anchors ownership; owner-signed off-chain records keep destinations updateable; bonded auctions price scarce names without rent.
      </p>
      <div class="hero-home-proof-row" aria-label="Core ONT model">
        <span>Bonded public auctions</span>
        <span>Length-based opening bond</span>
        <span>Owner-signed destinations</span>
      </div>
    </section>
    <section id="lookup" class="hero-home-lookup" aria-labelledby="homeLookupTitle">
      <div class="hero-home-lookup-head">
        <p class="hero-home-kicker">Auction status</p>
        <h2 id="homeLookupTitle">Check a name</h2>
        <p>Resolve ownership or see whether the next step is the auction flow.</p>
      </div>
      <form id="searchForm" class="search-form hero-search-form">
        <label class="field-label" for="nameInput">Name</label>
        <div class="search-row">
          <input id="nameInput" name="name" type="text" maxlength="32" placeholder="alice" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" />
          <button type="submit">Check</button>
        </div>
      </form>
      <div id="searchResult" class="result-card empty hero-search-result" hidden></div>
      <div class="hero-lookup-status-grid" aria-label="Auction opening rule">
        <article>
          <span>Unopened</span>
          <strong>Anyone can open the auction</strong>
        </article>
        <article>
          <span>After an opening bid</span>
          <strong>Public auction clock starts</strong>
        </article>
      </div>
      <div class="hero-lookup-actions">
        <a class="action-link secondary" href="${withBasePath("/auctions", configuredBasePath)}">Open auctions</a>
        <a class="action-link secondary" href="${withBasePath("/setup", configuredBasePath)}">Set up signing</a>
      </div>
    </section>
    <section class="hero-home-launch-strip" aria-label="ONT principles">
      <article>
        <span>Ownership</span>
        <strong>Bitcoin anchors who controls the name.</strong>
      </article>
      <article>
        <span>Destinations</span>
        <strong>Owner-signed records stay updateable off-chain.</strong>
      </article>
      <article>
        <span>Bonds</span>
        <strong>Auctions price scarce names without rent.</strong>
      </article>
    </section>
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
  return renderHomeActionsSection(configuredBasePath);
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
      "No Visible Names Yet",
      "No owned names or auction activity are visible yet."
    )}
    <div class="guide-grid guide-grid-balanced">
      <article class="guide-card">
        <h3>What This Usually Means</h3>
        <p id="exploreEmptyStateMessage">No owned names or auction activity are visible yet.</p>
        <p id="exploreEmptyStateDetail" class="field-note">Open an auction from any valid name, or use Setup if you still need a funded wallet.</p>
      </article>
      <article class="guide-card">
        <h3>What You Can Do Next</h3>
        <ul class="guide-list">
          <li>Use Auctions to check a name and prepare the opening bid.</li>
          <li>Use Overview to understand ownership, destination records, and bonded auctions.</li>
          <li>Use Destinations after a name exists and the owner is ready to publish records.</li>
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
    ${renderAuctionLabSection()}
    ${renderExperimentalAuctionFeedSection()}
    ${renderAuctionLabNotesSection(true)}
    ${includePrivateAuctionSmoke ? renderPrivateAuctionSmokeSection(true) : ""}
    ${renderAdvancedReferencesSection(configuredBasePath)}
  `;
}

function renderAuctionsPageSections(configuredBasePath: string): string {
  return `${renderAuctionOpenSection(configuredBasePath)}
    ${renderAuctionRulesSection()}
    ${renderAuctionWorkflowSection(configuredBasePath)}`;
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
          <li>CLI-heavy workflows and custom protocol experiments</li>
          <li>Reviewer-facing docs and implementation notes</li>
          <li>Testing notes, deployment assumptions, and protocol tradeoffs</li>
        </ul>
      </article>
      <article class="guide-card guide-card-wide">
        <h3>Use The CLI For Custom Work</h3>
        <p>If you need custom destination formats, multi-resolver fanout, policy modeling, deeper transfer/sale flows, or protocol research work, the CLI and docs are still the right tools.</p>
        <div class="guide-card-actions">
          <a class="action-link secondary" href="${DOC_URLS.fromZero}" target="_blank" rel="noreferrer noopener">Read from zero</a>
          <a class="action-link secondary" href="${DOC_URLS.launchSpec}" target="_blank" rel="noreferrer noopener">Protocol notes</a>
          <a class="action-link secondary" href="${DOC_URLS.implementation}" target="_blank" rel="noreferrer noopener">Implementation</a>
        </div>
      </article>
    </div>
    <div class="hero-cta-row section-cta-row">
      <a class="action-link secondary" href="${DOC_URLS.implementation}" target="_blank" rel="noreferrer noopener">Implementation notes</a>
      <a class="action-link secondary" href="${withBasePath("/explainer", configuredBasePath)}">Open overview</a>
      <a class="action-link secondary" href="${withBasePath("/setup", configuredBasePath)}">Back to setup</a>
    </div>
  </section>`;
}

function renderAdvancedReferencesSection(_configuredBasePath: string): string {
  return `<section id="advanced-references" class="panel panel-guide">
    ${renderPanelHead(
      "Reference Material",
      "Use these when you want implementation detail, validation notes, or protocol-review material."
    )}
    <div class="guide-grid guide-grid-balanced">
      <article class="guide-card">
        <h3>Implementation Notes</h3>
        <p>Review how the current pieces fit together: resolver state, bid-package handoffs, destination records, transfers, and the remaining validation work.</p>
        <div class="guide-card-actions">
          <a class="action-link secondary" href="${DOC_URLS.implementation}" target="_blank" rel="noreferrer noopener">Implementation</a>
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
        <p>Use the protocol docs when you want the higher-level framing, tradeoffs, and current working assumptions.</p>
        <div class="guide-card-actions">
          <a class="action-link secondary" href="${DOC_URLS.fromZero}" target="_blank" rel="noreferrer noopener">From zero</a>
          <a class="action-link secondary" href="${DOC_URLS.launchSpec}" target="_blank" rel="noreferrer noopener">Protocol notes</a>
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

function renderAuctionOpenSection(configuredBasePath: string): string {
  return `<section id="auction-open" class="panel panel-compose panel-compose-minimal">
    ${renderPanelHead(
      "Open An Auction",
      "A bonded opening bid starts the auction clock. Before that, an unowned name is unopened.",
      `<p>Use this as the common acquisition path. The website checks current ownership and shows the auction rules; signing and broadcast still happen with your wallet.</p>`
    )}
    <div class="value-intake-grid">
      <form id="searchForm" class="tool-draft-form">
        <div class="draft-grid">
          <label class="draft-field">
            <span class="field-label">Name</span>
            <input id="nameInput" name="name" type="text" maxlength="32" placeholder="alice" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" />
            <span class="field-hint">Any valid name can be opened through a public bonded auction. The opening floor is fixed by name length.</span>
          </label>
        </div>
        <div class="draft-actions">
          <button type="submit">Check name</button>
        </div>
      </form>
      <article class="guide-card value-intake-callout">
        <h3>Opening Rule</h3>
        <ul class="guide-list">
          <li>The auction does not exist until a valid opening bid confirms.</li>
          <li>The opening bid must meet the fixed length-based floor.</li>
          <li>If the bid wins, the owner key controls destinations and transfers after settlement.</li>
        </ul>
      </article>
    </div>
    <div id="searchResult" class="result-card empty" hidden></div>
    <div class="hero-cta-row section-cta-row">
      <a class="action-link secondary" href="${withBasePath("/setup", configuredBasePath)}">Open setup</a>
      <a class="action-link secondary" href="${withBasePath("/advanced", configuredBasePath)}">Advanced auction reference</a>
    </div>
  </section>`;
}

function renderAuctionRulesSection(): string {
  return `<section id="auction-rules" class="panel panel-guide">
    ${renderPanelHead(
      "Auction Rules",
      "Length-based opening floors and stronger late-bid increments keep public auctions orderly.",
      `<p>These current rules are surfaced read-only. Use the advanced docs for deeper policy modeling.</p>`
    )}
    <p id="auctionLabMeta" class="helper-text">Loading current auction rules.</p>
    <div id="auctionPolicySummary" class="guide-grid"></div>
  </section>`;
}

function renderAuctionWorkflowSection(configuredBasePath: string): string {
  return `<section id="auction-workflow" class="panel panel-guide">
    ${renderPanelHead(
      "Auction Workflow",
      "The public path is simple: fund the bidding wallet, prepare a package, sign, broadcast, then manage the owned name.",
      `<p>If nobody else bids during the public window, the opener wins at the floor. If others bid, open bidding discovers the final bond.</p>`
    )}
    <div class="guide-grid guide-grid-balanced">
      <article class="guide-card">
        <h3>1. Fund The Bid</h3>
        <p>Use the setup path to connect Sparrow and fund the wallet that will lock the opening bid bond.</p>
      </article>
      <article class="guide-card">
        <h3>2. Save The Owner Key</h3>
        <p>The owner key is the control key for destinations and transfers if the bid wins. Keep the private half yourself.</p>
      </article>
      <article class="guide-card">
        <h3>3. Bid From Current State</h3>
        <p>Build the bid handoff from the latest auction state. If another bid lands first, rebuild before signing.</p>
      </article>
      <article class="guide-card">
        <h3>4. Manage The Name</h3>
        <p>After settlement, use Destinations to publish records or Transfer to hand off control.</p>
      </article>
    </div>
    <div class="hero-cta-row section-cta-row">
      <a class="action-link" href="${withBasePath("/setup", configuredBasePath)}">Open setup</a>
      <a class="action-link secondary" href="${withBasePath("/values", configuredBasePath)}">Open destinations</a>
      <a class="action-link secondary" href="${withBasePath("/transfer", configuredBasePath)}">Open transfer</a>
    </div>
  </section>`;
}

function renderAuctionLabSection(): string {
  return `<section id="auction-lab" class="panel panel-list">
    ${renderPanelHead(
      "Auction Reference Cases",
      "Advanced view for modeled auction states and implementation review.",
      `<p>This reference shows how the current auction model behaves before and after a bidder opens the auction.</p>
      <ul>
        <li>The website shows the current read-only auction rules for the examples below.</li>
        <li>The cards underneath are simulator-backed examples, not live protocol changes.</li>
        <li>A real auction starts with a valid bonded opening bid; before that, a name is only valid, owned, or unavailable.</li>
      </ul>`
    )}
    <details class="detail-technical">
      <summary>Current auction rules</summary>
      <div class="detail-technical-body">
        <p class="field-note">The website keeps this read-only on purpose. If you want to model different auction windows or other policy parameters, use the CLI instead of the website.</p>
        <p id="auctionLabMeta" class="helper-text">Loading current auction rules and reference cases.</p>
        <div id="auctionPolicySummary" class="guide-grid"></div>
      </div>
    </details>
    <div id="auctionLabList" class="activity-list"></div>
  </section>`;
}

function renderExperimentalAuctionFeedSection(): string {
  return `<section id="experimental-auction-feed" class="panel panel-list">
    ${renderPanelHead(
      "Observed Auction Feed",
      "Resolver-backed view derived from observed AUCTION_BID transactions.",
      `<p>This sits closer to observed chain behavior than the reference states above.</p>
      <ul>
        <li>The feed shows observed bid activity from the current environment; low-activity signet periods may be sparse.</li>
        <li>Leaders, minimum next bids, stale-state rejection, and bond spend/release summaries are derived from observed AUCTION_BID transactions.</li>
        <li>A real auction begins when a valid bonded opening bid confirms; names with no opening bid should not be described as failed auctions.</li>
        <li>Bids that merely clear the normal increment are not enough during soft close if they would extend the auction. Late extension bids use the stronger soft-close increment rule.</li>
        <li>Same-bidder replacement is only recognized when the later bid spends the prior bid bond outpoint.</li>
        <li>This feed is an implementation view; final settlement rules are not frozen yet.</li>
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
          <li>The current opening floors, soft close, and minimum increments are modeled here.</li>
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
          <li>Settlement is implemented for the experimental path, but final settlement rules are not frozen yet.</li>
          <li>The chain-derived feed is still an implementation view, not a mainnet commitment.</li>
          <li>The parameters here are working defaults, not yet locked protocol parameters.</li>
          <li>For deeper policy experiments or custom bid flows, use the CLI rather than the website.</li>
        </ul>
      </article>
    </div>`;

  if (!collapsible) {
    return `<section class="panel panel-guide">
      ${renderPanelHead(
        "Implementation Status",
        "What is already working here, what remains provisional, and which parts are still derived rather than final."
      )}
      ${body}
    </section>`;
  }

  return `<details class="panel panel-guide panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>Implementation Status</h2>
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
      "Use the home page to do one thing quickly: understand the model, open an auction, or check visible ownership."
    )}
    <div class="path-grid">
      <article class="path-card">
        <p class="path-card-kicker">Read</p>
        <h3>Understand ONT</h3>
        <p>Read the overview when you want the clean model: Bitcoin ownership, owner-signed destinations, and public auctions.</p>
        <div class="path-card-actions">
          <a class="action-link secondary" href="${withBasePath("/explainer", configuredBasePath)}">Open overview</a>
        </div>
      </article>
      <article class="path-card">
        <p class="path-card-kicker">Walk Through</p>
        <h3>Try It On Signet</h3>
        <p>Set up Sparrow, then open Auctions to prepare a bid package with the same wallet you will use to sign.</p>
        <div class="path-card-actions">
          <a class="action-link secondary" href="${withBasePath("/setup", configuredBasePath)}">Open setup</a>
          <a class="action-link secondary" href="${withBasePath("/auctions", configuredBasePath)}">Open auctions</a>
        </div>
      </article>
      <article class="path-card">
        <p class="path-card-kicker">Check</p>
        <h3>Explore Current State</h3>
        <p>Resolve a name, browse recent activity, and check currently visible ownership without working through the full auction flow.</p>
        <div class="path-card-actions">
          <a class="action-link secondary" href="${withBasePath("/explore", configuredBasePath)}">Open explorer</a>
        </div>
      </article>
    </div>
    <p class="tool-handoff-note">Need a stable place for the full map? Use the footer below for docs and website tools.</p>
  </section>`;
}

function renderHomeModelSection(): string {
  return `<section id="how-ont-works" class="panel panel-guide">
    ${renderPanelHead(
      "How ONTs Work",
      "Follow one ONT from Bitcoin ownership to the destinations apps can use."
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
          <p><span>bond</span><strong>₿0.0625</strong></p>
        </div>
      </article>
      <div class="protocol-flow-arrow" aria-hidden="true"></div>
      <article class="protocol-flow-card protocol-flow-card-record">
        <div class="protocol-flow-card-head">
          <p class="protocol-flow-number">02</p>
          <p class="protocol-flow-place">Resolver</p>
        </div>
        <h3>Publish Destinations</h3>
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
    <a href="#using-ont">Use the website</a>
    <a href="#current-docs">Current status</a>
  </nav>`;
}

function renderHomeDestinationDiagramSection(): string {
  return `<section id="one-name-many-destinations" class="panel panel-guide">
    ${renderPanelHead(
      "One Name, Many Destinations",
      "Bitcoin anchors who owns the name. The signed record says what it points to right now."
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
          <p class="destination-map-kicker">Owner-signed destinations</p>
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
      "The hosted private signet environment is live, but it is not mainnet-ready. Use this page to separate what works now from what is still under active design."
    )}
    <div class="guide-grid guide-grid-balanced">
      <article class="guide-card">
        <h3>Works Today</h3>
        <ul class="guide-list">
          <li>Hosted signet setup and auction opening</li>
          <li>Self-hosted website and resolver</li>
          <li>Browser destination publishing</li>
          <li>Auction bid-package handoffs and live auction smoke checks</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Not Mainnet-Ready Yet</h3>
        <ul class="guide-list">
          <li>Transfers still rely on external signing tools.</li>
          <li>Resolver availability is only partly decentralized in v1.</li>
          <li>The public-auction flow is implemented in the private signet environment and still not mainnet-ready.</li>
          <li>Mainnet-ready usage is not ready yet.</li>
        </ul>
      </article>
      <article class="guide-card guide-card-wide guide-card-links">
        <h3>Read Next</h3>
        <ul class="guide-list">
          <li><a class="detail-link" href="${DOC_URLS.fromZero}" target="_blank" rel="noreferrer noopener">ONT From Zero</a></li>
          <li><a class="detail-link" href="${DOC_URLS.implementation}" target="_blank" rel="noreferrer noopener">Implementation &amp; Validation</a></li>
          <li><a class="detail-link" href="${DOC_URLS.launchSpec}" target="_blank" rel="noreferrer noopener">Protocol Notes v0</a></li>
        </ul>
        <div class="guide-card-actions">
          <a class="action-link secondary" href="${DOC_URLS.fromZero}" target="_blank" rel="noreferrer noopener">Read from zero</a>
          <a class="action-link secondary" href="${DOC_URLS.implementation}" target="_blank" rel="noreferrer noopener">Implementation</a>
          <a class="action-link secondary" href="${DOC_URLS.launchSpec}" target="_blank" rel="noreferrer noopener">Protocol notes</a>
        </div>
      </article>
    </div>
  </section>`;
}

function renderUsingOntSection(configuredBasePath: string): string {
  return `<section id="using-ont" class="panel panel-guide">
    ${renderPanelHead(
      "Use The Website",
      "The website is meant for the common path: open auctions, update destinations, transfer names, and check current state."
    )}
    <div class="guide-grid">
      <article class="guide-card">
        <h3>Setup And Auctions</h3>
        <p>Use Setup to connect Sparrow to the hosted private signet endpoint, then use Auctions to check names and prepare bids.</p>
      </article>
      <article class="guide-card">
        <h3>Explore</h3>
        <p>Use Explore when you want name lookups, recent activity, and currently visible ownership.</p>
      </article>
      <article class="guide-card">
        <h3>Destinations And Transfer</h3>
        <p>Use Destinations and Transfer after a name exists and you want to manage what it points to or hand off control.</p>
      </article>
      <article class="guide-card">
        <h3>Advanced Tools</h3>
        <p>If you want custom outputs, raw destination formats, deeper transfer flows, or protocol experiments, use the Advanced area and docs. Most new users can ignore those paths at first.</p>
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
      "Quick snapshot of currently visible ownership.",
      `<p>Current owned names and chain height.</p>
      <ul>
        <li><strong>Tracked Names</strong> are names currently visible to this website.</li>
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
        <p>Quick snapshot of currently visible ownership.</p>
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
      `<p>Lifecycle transitions across auctions, transfers, destination updates, and releases.</p>
      <ul>
        <li>Auction bids and settlements</li>
        <li>Transfers between owners</li>
        <li>Destination publications</li>
        <li>Releases when the required bond is broken before maturity</li>
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
      "Auction Smoke Check",
      "Latest status from the hosted private-signet auction walkthrough.",
      `<p>This is the current live-chain proof for the auction slice.</p>
      <ul>
        <li>It starts from a dedicated reference entry, then opens the auction with a real bonded bid.</li>
        <li>It submits an opening bid, then a higher bid, settles the auction into a live owned name, publishes winner destinations, and later transfers that name after the winner bond matures.</li>
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
        <h2>Auction Smoke Check</h2>
        <p>Latest status from the hosted private-signet auction walkthrough: bidding, settlement, winner handoff, and release-valve checks.</p>
      </div>
      <span class="summary-chip">Open setup check</span>
    </summary>
    <div class="collapsible-panel-body">${body}</div>
  </details>`;
}

function renderSetupQuickstartSection(configuredBasePath: string, privateSignetElectrumEndpoint: string | null): string {
  const endpoint = parseElectrumEndpoint(privateSignetElectrumEndpoint ?? "opennametags.org:50001:t");
  const transportNote = endpoint.transport === "s" ? "SSL on" : "SSL off";
  return `<section id="setup-start" class="panel panel-guide">
    ${renderPanelHead(
      "Private Signet Setup",
      "Open Sparrow in signet mode, point it at the hosted private signet endpoint, then return to auctions."
    )}
    <p class="tool-handoff-note">No SSH access is required for this hosted path. Sparrow talks to the private signet chain through a public wallet endpoint while the underlying Bitcoin Core RPC stays private on the server.</p>
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
        <h3>2. Point Sparrow At The Private Signet Endpoint</h3>
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
          <li>Use the funding form below to request private signet coins.</li>
          <li>Refresh Sparrow and confirm the balance appears in the same wallet.</li>
          <li>Then return to Auctions and prepare the opening bid.</li>
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
      "Get Private Signet Coins",
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
          <span class="field-hint">Use the same wallet you plan to spend from for private signet auction transactions. If Sparrow cannot see the funds afterward, the server settings are usually the missing step.</span>
        </label>
      </div>
      <div class="draft-actions">
        <button type="submit">Fund this wallet</button>
      </div>
    </form>
    <div id="privateFundingResult" class="result-card empty">
      Paste a Sparrow receive address above to get private signet coins.
    </div>
  </section>`;
}

function formatBitcoinDisplay(value: bigint | string | number): string {
  const amount = BigInt(value);
  return `₿${formatBtcDecimal(amount)}`;
}

function formatBtcDecimal(amount: bigint): string {
  const whole = amount / 100_000_000n;
  const fractional = (amount % 100_000_000n).toString().padStart(8, "0").replace(/0+$/g, "");
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
                <li>Only the signed update is published; your private key never leaves the browser.</li>
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
                <span id="valuePayloadHint" class="field-hint">Website and payment targets are encoded as normal text. Advanced tools cover raw or app-defined binary data.</span>
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
                  <p>Publish the signed update. Ownership stays on Bitcoin; clients can use the latest owner-authorized destinations.</p>
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
            Sign the update first. Then this step will publish it and reload the current destinations.
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
      `<p>The website focuses on normal destination bundles. Advanced tools and docs cover raw payloads, custom formats, and multi-resolver fanout.</p>`
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
          <li>After a transfer, only the new owner can publish fresh destinations.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Common Things A Name Can Point To</h3>
        <ul class="guide-list">
          <li>A single website URL</li>
          <li>A single Bitcoin payment target</li>
          <li>A bundled list of repeatable destination entries like <span class="mono">btc -&gt; bc1qxy...0wlh</span>, <span class="mono">lightning -&gt; lno1q...9sa</span>, <span class="mono">website -&gt; alice.example</span>, and <span class="mono">cashapp -&gt; $alice1234</span></li>
        </ul>
        <div class="guide-card-actions">
          <a class="action-link secondary" href="${withBasePath("/values", configuredBasePath)}">Open destinations tool</a>
        </div>
      </article>
      <article class="guide-card guide-card-wide">
        <h3>Find A Live Name First</h3>
        <p>Destinations are signed by the current owner key. Start in Explore if you need an already-owned name, or Auctions if you want to see how names become owned.</p>
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
        <p>No, but the hosted private signet environment is only fully supported and tested end to end with Sparrow right now.</p>
      </article>
      <article class="guide-card">
        <h3>Does Electrum work?</h3>
        <p>Not for this hosted private signet environment. The official Electrum app reaches the endpoint, but then rejects the chain because this small private signet sits below Electrum’s built-in public signet checkpoint height. Sparrow is still the supported path.</p>
      </article>
      <article class="guide-card">
        <h3>Why do I need the hosted private signet endpoint?</h3>
        <p>The hosted environment runs on a private signet chain. Use the endpoint shown above so Sparrow follows the same chain as the website.</p>
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
      `<p>The site prepares role-specific review packages. Signing and broadcast still happen outside the website.</p>`
    )}
    <div class="guide-grid guide-grid-balanced">
      <article class="guide-card">
        <h3>Receiver</h3>
        <ul class="guide-list">
          <li>Create the new control key.</li>
          <li>Give only the public owner key to the current owner.</li>
          <li>Review the buyer package before signing or funding anything.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Current Owner</h3>
        <ul class="guide-list">
          <li>Paste the receiver's public owner key.</li>
          <li>Add a seller payout address only for sales.</li>
          <li>Add the replacement bond address while the name is still settling.</li>
          <li>Export packages so both sides review the same plan.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>For Sales</h3>
        <ul class="guide-list">
          <li>Buyer payment and ONT ownership change should settle in one Bitcoin transaction.</li>
          <li>Do not treat payment and transfer as separate promises.</li>
          <li>Review the exact shared transaction before either side signs or funds it.</li>
        </ul>
      </article>
      <article class="guide-card">
        <h3>Current Website Boundary</h3>
        <ul class="guide-list">
          <li>The website prepares the handoff packages.</li>
          <li>Your signer finishes the transaction.</li>
          <li>The website is not yet a full two-party signing wizard for buyer and seller.</li>
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
              <p>The receiver creates the new owner key. The current owner uses its public key to build the transfer handoff.</p>
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
              <p class="field-value">Create the key that should control the name after transfer. Share only the public key with the current owner.</p>
              <div class="field-actions">
                <button id="generateTransferOwnerKeyLocalButton" type="button">Create Recipient Key</button>
              </div>
              <div id="transferRecipientKeyResult" class="result-card empty">
                Create the recipient key in this browser, then give only the public owner key to the current owner.
              </div>
              <p class="field-note">After the current owner sends you a buyer package, review it on this page before signing or funding anything.</p>
            </section>
            <section class="transfer-role-panel transfer-role-panel-sender">
              <p class="support-strip-label">I am sending a name</p>
              <div class="result-title">
                <h3>Build The Transfer Handoff</h3>
                <span class="status-pill transfer">current owner</span>
              </div>
              <p class="field-value">Paste the receiver's public owner key, add any payment or replacement-bond details, then build the plan both sides will review.</p>
              <form id="transferDraftForm" class="tool-draft-form">
                <div class="draft-grid">
                  <label class="draft-field">
                    <span class="field-label">Name</span>
                    <input id="transferNameInput" name="transferName" type="text" maxlength="32" placeholder="alice" autocomplete="off" />
                  </label>
                  <label class="draft-field">
                    <span class="field-label">Recipient Owner Key (public)</span>
                    <input
                      id="transferNewOwnerPubkeyInput"
                      name="transferNewOwnerPubkey"
                      type="text"
                      maxlength="64"
                      placeholder="Paste the buyer's 32-byte x-only public owner key in hex"
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
                  <label class="draft-field">
                    <span class="field-label">Transfer Type</span>
                    <select id="transferModeInput" name="transferMode">
                      <option value="auto" selected>Recommended for this name</option>
                      <option value="gift">Gift / pre-arranged transfer</option>
                      <option value="sale">Sale with payment</option>
                    </select>
                    <span class="field-hint">Recommended chooses a buyer-funded replacement bond before maturity and a cooperative sale path after maturity.</span>
                  </label>
                  <label class="draft-field">
                    <span class="field-label">Replacement Bond Address (settling names)</span>
                    <input
                      id="transferBondAddressInput"
                      name="transferBondAddress"
                      type="text"
                      placeholder="Buyer address for the replacement bond output"
                      autocomplete="off"
                    />
                    <span class="field-hint">Required before bond maturity. Leave blank only if your signer will fill it before anyone signs.</span>
                  </label>
                </div>
                <div class="draft-actions">
                  <button id="buildTransferPlanButton" type="button">Build Transfer Plan</button>
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
          <p class="field-note">Both exports come from the same transfer plan. Seller and receiver should each review the role-specific package against the same transaction details.</p>
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
              <p>For the receiver to check the new owner key, sale path, and transaction details before signing or funding anything.</p>
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
            Enter an owned name and the recipient owner key to build a transfer-ready handoff.
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
      <p class="site-footer-copy">Bitcoin-anchored names, owner-signed destinations, and the current website tools.</p>
    </div>
    <div class="site-footer-grid">
      <section class="site-footer-group">
        <h2>Learn</h2>
        <div class="site-footer-links">
          <a href="${withBasePath("/explainer", configuredBasePath)}">Overview</a>
          <a href="${DOC_URLS.fromZero}" target="_blank" rel="noreferrer noopener">From Zero</a>
          <a href="${DOC_URLS.launchSpec}" target="_blank" rel="noreferrer noopener">Protocol Notes</a>
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
      ${renderPanelHead("Network Details", "Network, chain source, and destination endpoint.", `<p>The current endpoint snapshot, chain source, and active network.</p>`)}
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
      <span class="summary-chip">Open names</span>
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
