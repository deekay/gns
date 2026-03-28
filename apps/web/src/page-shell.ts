import { PRODUCT_NAME, REVEAL_WINDOW_BLOCKS } from "@gns/protocol";

export type PageKind = "home" | "explore" | "claim" | "transfer" | "setup" | "explainer";
const GITHUB_REPO_URL = "https://github.com/deekay/gns";

export interface PageShellOptions {
  basePath: string,
  faviconDataUrl: string,
  includeLiveSmoke: boolean,
  networkLabel: string,
  pageKind: PageKind,
  privateSignetFundingAmountSats: bigint,
  privateSignetFundingEnabled: boolean,
}

export function renderPageHtml(options: PageShellOptions): string {
  const {
    basePath,
    faviconDataUrl,
    includeLiveSmoke,
    networkLabel,
    pageKind,
    privateSignetFundingAmountSats,
    privateSignetFundingEnabled
  } = options;
  const title =
    pageKind === "home"
      ? PRODUCT_NAME
      : pageKind === "claim"
      ? `${PRODUCT_NAME} Claim Prep`
      : pageKind === "transfer"
        ? `${PRODUCT_NAME} Transfer Prep`
        : pageKind === "setup"
          ? `${PRODUCT_NAME} Setup`
        : pageKind === "explainer"
          ? `${PRODUCT_NAME} Overview`
          : `${PRODUCT_NAME} Explorer`;
  const description =
    pageKind === "home"
      ? "Search a name, understand the model, and choose whether to explore, claim, or learn more about Global Name System."
      : pageKind === "claim"
      ? "Prepare a Global Name System claim package, then finish the commit and reveal flow in Sparrow or another external signer."
      : pageKind === "transfer"
        ? "Prepare a Global Name System transfer handoff, then finish the gift or sale flow in the CLI and your signer."
        : pageKind === "setup"
          ? "Set up Sparrow, the local helper, and demo funding for the Global Name System private signet flow."
        : pageKind === "explainer"
          ? "Quick orientation for using the hosted Global Name System tools."
        : "Explorer for browsing claimed names and resolver status in Global Name System.";

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
    <link rel="stylesheet" href="${withBasePath("/styles.css", basePath)}" />
  </head>
  <body>
    <div class="page-shell">
      ${renderPrimaryNav(basePath, pageKind)}
      ${renderHeroSection(basePath, networkLabel, pageKind)}
      <main class="content-grid">
        ${
          pageKind === "home"
            ? renderHomePageSections(basePath)
            : pageKind === "claim"
            ? renderClaimPageSections(basePath, privateSignetFundingEnabled, privateSignetFundingAmountSats)
            : pageKind === "transfer"
              ? renderTransferPageSections(basePath)
              : pageKind === "setup"
                ? renderSetupPageSections(basePath, privateSignetFundingEnabled, privateSignetFundingAmountSats)
              : pageKind === "explainer"
                ? renderExplainerPageSections(basePath)
              : renderExplorePageSections(basePath, includeLiveSmoke)
        }
      </main>
    </div>
    <script type="module" src="${withBasePath("/app.js", basePath)}"></script>
  </body>
</html>`;
}

function renderHeroSection(
  configuredBasePath: string,
  configuredNetworkLabel: string,
  pageKind: PageKind
): string {
  if (pageKind === "claim") {
    return `<header class="hero hero-single hero-page">
      <div class="hero-copy">
        <p class="eyebrow"><a class="eyebrow-link" href="${withBasePath("/", configuredBasePath)}">Global Name System</a> · ${escapeHtml(configuredNetworkLabel)}</p>
        <h1>Prepare A Global Name System Claim</h1>
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
        <p class="eyebrow"><a class="eyebrow-link" href="${withBasePath("/", configuredBasePath)}">Global Name System</a> · ${escapeHtml(configuredNetworkLabel)}</p>
        <h1>Prepare A Global Name System Transfer</h1>
        <p class="lede">
          Current name, new owner, and transfer handoff.
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
        <p class="eyebrow"><a class="eyebrow-link" href="${withBasePath("/", configuredBasePath)}">Global Name System</a> · ${escapeHtml(configuredNetworkLabel)}</p>
        <h1>Quick Overview</h1>
        <p class="lede">
          What GNS is and how to use the hosted tools. Full project documentation lives in the repo.
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "setup") {
    return `<header class="hero hero-single hero-page">
      <div class="hero-copy">
        <p class="eyebrow"><a class="eyebrow-link" href="${withBasePath("/", configuredBasePath)}">Global Name System</a> · ${escapeHtml(configuredNetworkLabel)}</p>
        <h1>Set Up Your Wallet</h1>
        <p class="lede">
          Sparrow, the local helper, and demo coins for the private signet flow.
        </p>
      </div>
    </header>`;
  }

  if (pageKind === "explore") {
    return `<header class="hero hero-single hero-page">
      <div class="hero-copy">
        <p class="eyebrow"><a class="eyebrow-link" href="${withBasePath("/", configuredBasePath)}">Global Name System</a> · ${escapeHtml(configuredNetworkLabel)}</p>
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

  return `<header class="hero hero-home">
    <div class="hero-copy">
      <p class="eyebrow"><a class="eyebrow-link" href="${withBasePath("/", configuredBasePath)}">Global Name System</a> · ${escapeHtml(configuredNetworkLabel)}</p>
      <h1>A Human-Readable Name You Control</h1>
      <p class="lede">
        Global Name System gives people, agents, and services a human-readable name that is bonded, not rented, and can point to the resources that represent them.
      </p>
    </div>
    <aside class="hero-card hero-home-card">
      <p class="hero-card-label">What it can point to</p>
      <div class="hero-action-list">
        <article class="hero-action-item">
          <strong>Identity</strong>
          <p>Profiles, social handles, and public identity.</p>
        </article>
        <article class="hero-action-item">
          <strong>Payments</strong>
          <p>Bitcoin addresses, payment endpoints, and invoices.</p>
        </article>
        <article class="hero-action-item">
          <strong>Services</strong>
          <p>Apps, APIs, and agent endpoints that can change over time.</p>
        </article>
      </div>
      <p class="hero-card-meta">Bonded, not rented or sold.</p>
    </aside>
  </header>`;
}

function renderPrimaryNav(configuredBasePath: string, pageKind: PageKind): string {
  const links = [
    { href: withBasePath("/", configuredBasePath), label: "Home", active: pageKind === "home" },
    { href: withBasePath("/explore", configuredBasePath), label: "Explore", active: pageKind === "explore" },
    { href: withBasePath("/claim", configuredBasePath), label: "Claim", active: pageKind === "claim" },
    { href: withBasePath("/transfer", configuredBasePath), label: "Transfer", active: pageKind === "transfer" },
    { href: withBasePath("/setup", configuredBasePath), label: "Setup", active: pageKind === "setup" },
    { href: withBasePath("/explainer", configuredBasePath), label: "Overview", active: pageKind === "explainer" }
  ];

  return `<nav class="site-nav" aria-label="Primary">
    <a class="site-nav-brand" href="${withBasePath("/", configuredBasePath)}">Global Name System</a>
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

function renderExplorePageSections(configuredBasePath: string, includeLiveSmoke: boolean): string {
  return `${renderOverviewSection()}
    ${renderRecentNamesSection()}
    ${renderActivitySection(true)}
    ${renderPendingSection(true)}
    ${renderNamesSection(true)}
    ${includeLiveSmoke ? renderLiveSmokeSection(true) : ""}
    ${renderNetworkDetailsSection(true)}`;
}

function renderClaimPageSections(
  configuredBasePath: string,
  _privateSignetFundingEnabled: boolean,
  _privateSignetFundingAmountSats: bigint
): string {
  return `${renderClaimPrepSection()}
    ${renderClaimSupportStrip(configuredBasePath)}`;
}

function renderTransferPageSections(configuredBasePath: string): string {
  return `${renderTransferPrepSection()}
    ${renderTransferSupportStrip(configuredBasePath)}`;
}

function renderSetupPageSections(
  configuredBasePath: string,
  privateSignetFundingEnabled: boolean,
  privateSignetFundingAmountSats: bigint
): string {
  return `${renderSetupStartSection(configuredBasePath)}
    ${privateSignetFundingEnabled ? renderSetupFundingSection(privateSignetFundingAmountSats) : ""}
    ${renderSetupSupportStrip(configuredBasePath)}`;
}

function renderExplainerPageSections(configuredBasePath: string): string {
  return `${renderWhyGnsSection(configuredBasePath)}
    ${renderUsingGnsSection(configuredBasePath)}`;
}

function renderHomeActionsSection(configuredBasePath: string): string {
  return `<section id="start-here" class="panel panel-guide panel-home">
    ${renderPanelHead(
      "Start Here",
      "Set up a wallet, claim a name, or browse the registry."
    )}
    <div class="path-grid">
      <article class="path-card">
        <h3>Setup</h3>
        <p>Get Sparrow ready, open the local helper, and fund a wallet for the private signet demo.</p>
        <div class="path-card-actions">
          <a class="action-link secondary" href="${withBasePath("/setup", configuredBasePath)}">Open setup</a>
        </div>
      </article>
      <article class="path-card">
        <h3>Claim</h3>
        <p>Prepare the claim package, save the backup, and build the signer handoff.</p>
        <div class="path-card-actions">
          <a class="action-link secondary" href="${withBasePath("/claim", configuredBasePath)}">Open claim prep</a>
        </div>
      </article>
      <article class="path-card">
        <h3>Explore</h3>
        <p>Browse recent names, current activity, pending claims, and the full tracked registry.</p>
        <div class="path-card-actions">
          <a class="action-link secondary" href="${withBasePath("/explore", configuredBasePath)}">Open explorer</a>
        </div>
      </article>
    </div>
    <div class="hero-cta-row path-support-row">
      <a class="action-link secondary" href="${withBasePath("/explainer", configuredBasePath)}">Quick overview</a>
    </div>
  </section>`;
}

function renderWhyGnsSection(configuredBasePath: string): string {
  return `<section id="why-gns" class="panel panel-guide">
    ${renderPanelHead(
      "What A GNS Name Is",
      "A human-readable name for people, agents, payments, and services.",
      `<p>Think of GNS as partly a DNS replacement, but not only that.</p>
      <ul>
        <li><strong>Bonded:</strong> you lock bond capital instead of paying rent.</li>
        <li><strong>No suffix:</strong> names are first-class strings.</li>
        <li><strong>On-chain:</strong> claims and transfers are publicly verifiable.</li>
      </ul>`
    )}
    <div class="guide-grid">
      <article class="guide-card">
        <h3>What is a GNS name?</h3>
        <p>A name you can hold directly and point at the resources that represent you, without depending on a registrar or platform handle.</p>
      </article>
      <article class="guide-card">
        <h3>How is it different?</h3>
        <p><strong>Bonded, not rented or sold.</strong> The bond stays yours. The protocol uses locked bond capital, not annual renewal fees, to price scarce names.</p>
      </article>
      <article class="guide-card">
        <h3>What can it point to?</h3>
        <p>A GNS name can point to profiles, payment endpoints, APIs, services, and agent endpoints. The name stays stable while the resources behind it can change, whether a person or an agent is using it.</p>
      </article>
    </div>
  </section>`;
}

function renderUsingGnsSection(configuredBasePath: string): string {
  return `<section id="using-gns" class="panel panel-guide">
    ${renderPanelHead(
      "Use This Site",
      "The site is mainly a tool for setup, browsing, claim prep, and transfer prep."
    )}
    <div class="guide-grid">
      <article class="guide-card">
        <h3>Setup</h3>
        <p>Get Sparrow ready, open the local helper, and fund a wallet for the private signet demo.</p>
      </article>
      <article class="guide-card">
        <h3>Claim</h3>
        <p>Prepare the claim package, save the backup, and build the signer handoff. The actual signing still happens in your wallet.</p>
      </article>
      <article class="guide-card">
        <h3>Transfer</h3>
        <p>Prepare the transfer handoff from the current name state, then finish the ownership change in your external signer flow.</p>
      </article>
      <article class="guide-card">
        <h3>Explore</h3>
        <p>Browse recent names, current state, and the tracked registry. Use the detail pages when you want the deeper provenance view.</p>
      </article>
    </div>
    <div class="hero-cta-row section-cta-row">
      <a class="action-link" href="${withBasePath("/setup", configuredBasePath)}">Open setup</a>
      <a class="action-link" href="${withBasePath("/claim", configuredBasePath)}">Open claim prep</a>
      <a class="action-link secondary" href="${withBasePath("/transfer", configuredBasePath)}">Open transfer prep</a>
      <a class="action-link secondary" href="${withBasePath("/explore", configuredBasePath)}">Open explorer</a>
    </div>
  </section>`;
}

function renderSearchSection(): string {
  return `<section id="lookup" class="panel panel-search panel-home">
    ${renderPanelHead(
      "Check A Name",
      "See the current state and the next move."
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
  const body = `<p id="liveSmokeMeta" class="helper-text">Checking the latest public signet smoke run and funding readiness.</p>
    <div id="liveSmokeResult" class="result-card empty">Loading the latest live signet smoke status...</div>`;

  if (!collapsible) {
    return `<section class="panel panel-live-smoke">
    ${renderPanelHead(
      "Live Signet Smoke",
      "Latest status from the shared public signet smoke flow.",
      `<p>Separate from the private demo network.</p>
      <ul>
        <li>It shows whether the shared signet smoke wallet is funded.</li>
        <li>It helps us track whether public signet is ready for another real-world test.</li>
      </ul>`
    )}
    ${body}
  </section>`;
  }

  return `<details class="panel panel-live-smoke panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>Live Signet Smoke</h2>
        <p>Latest status from the shared public signet smoke flow.</p>
      </div>
      <span class="summary-chip">Open smoke</span>
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
        `<p>The protocol bytes come from GNS. Signatures and broadcast still come from your signer.</p>`
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

function renderClaimPrepSection(): string {
  const body = `<div class="claim-flow">
      <details id="claim-step-inputs" class="claim-flow-step wizard-step" open>
        <summary class="wizard-step-summary">
          <div class="wizard-step-heading">
            <span class="claim-step-badge">Step 1</span>
            <div class="wizard-step-copy">
              <h3>Enter Claim Details</h3>
              <p>Name, owner pubkey, and nonce are the core claim inputs. The advanced fields only matter if you want to override the default bond flow.</p>
            </div>
          </div>
          <span id="claimStepInputsState" class="summary-chip wizard-step-state">Start here</span>
        </summary>
        <div class="wizard-step-body">
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
              <h3>Save Keys And Backups</h3>
              <p>Save the demo owner key first. These files are for backup and resume, not for Sparrow import.</p>
            </div>
          </div>
          <span id="claimStepBackupsState" class="summary-chip wizard-step-state">After step 1</span>
        </summary>
        <div class="wizard-step-body">
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
              <h3>Build Sparrow PSBTs</h3>
              <p>Only the <code>.psbt</code> files from this step belong in Sparrow. Save the Reveal Backup if you may finish the reveal later.</p>
            </div>
          </div>
          <span id="claimStepPsbtsState" class="summary-chip wizard-step-state">After step 2</span>
        </summary>
        <div class="wizard-step-body">
        <p class="field-note">Paste the account metadata from Sparrow and the site will generate ready-to-sign commit and reveal PSBTs for this private signet demo. For higher-value bonds, use the offline architect instead.</p>
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
        `<p>Claim bytes and PSBTs come from GNS. Signatures and broadcast still happen in Sparrow.</p>`
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

function renderSetupStartSection(configuredBasePath: string): string {
  return `<section id="setup-start" class="panel panel-guide">
    ${renderPanelHead(
      "Start Here",
      "Get Sparrow ready first, then come back to claim."
    )}
    <div class="guide-grid">
      <article class="guide-card">
        <h3>Install Sparrow</h3>
        <p>Use Sparrow in <code>signet</code> mode for the supported private demo flow.</p>
      </article>
      <article class="guide-card">
        <h3>Run The Local Helper</h3>
        <p>Start the helper from your clone’s <code>scripts</code> folder. It configures Sparrow, opens the SSH tunnel, and gets the wallet talking to the private demo node.</p>
      </article>
      <article class="guide-card">
        <h3>Then Claim</h3>
        <p>Copy a receive address, get demo coins if you need them, and return to claim prep when the wallet is ready.</p>
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
      "Fund the same Sparrow signet wallet you plan to spend from."
    )}
    <div class="guide-grid">
      <article class="guide-card">
        <h3>Before You Request Funds</h3>
        <p>Make sure Sparrow is already using the local helper and the SSH tunnel. Public signet servers will not show balances from this private demo network.</p>
      </article>
      <article class="guide-card">
        <h3>What You Receive</h3>
        <p>${formatBitcoinDisplay(privateSignetFundingAmountSats)} per request, with one block mined immediately so the wallet sees a confirmed balance.</p>
      </article>
    </div>
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
          <span class="field-hint">Use the same wallet you plan to spend from when you build the claim transaction. If Sparrow cannot see the funds afterward, the local tunnel is usually the missing step.</span>
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
    <p class="support-strip-label">Setup, offline architect, and docs</p>
    <div class="hero-cta-row support-strip-actions">
      <a class="action-link secondary" href="${withBasePath("/setup", configuredBasePath)}">Open setup</a>
      <a class="action-link secondary" href="${withBasePath("/claim/offline", configuredBasePath)}">Open offline architect</a>
      <a class="action-link secondary" href="${withBasePath("/claim/offline/download", configuredBasePath)}">Download offline architect</a>
      <a class="action-link secondary" href="${withBasePath("/explainer", configuredBasePath)}">Open explainer</a>
    </div>
  </section>`;
}

function renderSetupSupportStrip(configuredBasePath: string): string {
  return `<section id="setup-support" class="panel panel-support-strip">
    <p class="support-strip-label">Next steps</p>
    <div class="hero-cta-row support-strip-actions">
      <a class="action-link secondary" href="${withBasePath("/claim", configuredBasePath)}">Open claim prep</a>
      <a class="action-link secondary" href="${withBasePath("/claim/offline", configuredBasePath)}">Open offline architect</a>
      <a class="action-link secondary" href="${withBasePath("/explainer", configuredBasePath)}">Open explainer</a>
    </div>
  </section>`;
}

function renderWalletCompatibilityFaqSection(configuredBasePath: string, collapsible = true): string {
  const body = `<div class="guide-grid">
      <article class="guide-card">
        <h3>Do I have to use Sparrow?</h3>
        <p>No, but the current private demo flow is only fully supported and tested with Sparrow.</p>
      </article>
      <article class="guide-card">
        <h3>Does Electrum work?</h3>
        <p>Not in this hosted private-signet setup. Electrum expects an Electrum server, while this demo exposes Bitcoin Core RPC over SSH.</p>
      </article>
      <article class="guide-card">
        <h3>Why doesn’t a normal public signet server show my demo coins?</h3>
        <p>Because this is a private signet, not the shared public signet. Public servers will never see this demo chain.</p>
      </article>
      <article class="guide-card">
        <h3>What about other wallets later?</h3>
        <p>Broader wallet support is possible, but it requires validating more PSBT workflows or adding an Electrum-compatible server for the private signet flow.</p>
        <div class="hero-cta-row">
          <a class="action-link secondary" href="${withBasePath("/claim/offline", configuredBasePath)}">Offline architect</a>
        </div>
      </article>
    </div>`;

  if (!collapsible) {
    return `<section id="wallet-compatibility" class="panel panel-guide">
      ${renderPanelHead(
        "Wallet Compatibility",
        "Sparrow is the supported path today. Other wallets may work, but are not yet validated end to end."
      )}
      ${body}
    </section>`;
  }

  return `<details id="wallet-compatibility" class="panel panel-guide panel-collapsible">
    <summary class="panel-summary">
      <div class="panel-summary-copy">
        <h2>Wallet Compatibility</h2>
        <p>Sparrow is the supported path today. Other wallets may work, but are not yet validated end to end.</p>
      </div>
      <span class="summary-chip">FAQ</span>
    </summary>
    <div class="collapsible-panel-body">${body}</div>
  </details>`;
}

function renderTransferGuideSection(): string {
  return `<section id="transfer-guide" class="panel panel-guide">
    ${renderPanelHead(
      "How Transfers Work",
      "The current name state determines the right path.",
      `<p>Settling names still depend on bond continuity. Active names are simpler.</p>`
    )}
    <div class="guide-grid">
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
    <p class="support-strip-label">Explorer and docs</p>
    <div class="hero-cta-row support-strip-actions">
      <a class="action-link secondary" href="${withBasePath("/explore", configuredBasePath)}">Open explorer</a>
      <a class="action-link secondary" href="${withBasePath("/explainer", configuredBasePath)}">Open explainer</a>
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
