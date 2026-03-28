import { PRODUCT_NAME, PROTOCOL_NAME } from "@gns/protocol";

const HOSTED_SITE_URL = "https://globalnamesystem.org";
const GITHUB_REPO_URL = "https://github.com/deekay/gns";

export function renderOfflineClaimPageHtml(scriptBody: string): string {
  const safeScriptBody = scriptBody.replaceAll("</script>", "<\\/script>");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(PRODUCT_NAME)} Offline Claim Architect</title>
    <meta
      name="description"
      content="Offline claim architect for Global Name System. Paste wallet metadata and UTXOs, then generate claim PSBTs locally."
    />
    <style>
      :root {
        color-scheme: light;
        --bg: #f6efe6;
        --panel: rgba(255, 251, 247, 0.92);
        --panel-border: rgba(94, 52, 23, 0.14);
        --text: #2f2318;
        --muted: #6f5b4b;
        --accent: #8d4b25;
        --accent-soft: rgba(141, 75, 37, 0.12);
        --success: #216245;
        --success-soft: rgba(33, 98, 69, 0.12);
        --danger: #9f3f32;
        --danger-soft: rgba(159, 63, 50, 0.12);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 40px 20px 72px;
        background:
          radial-gradient(circle at top, rgba(176, 90, 43, 0.12), transparent 40%),
          linear-gradient(180deg, #fdf7ef 0%, var(--bg) 100%);
        color: var(--text);
        font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
      }

      .page {
        max-width: 1080px;
        margin: 0 auto;
        display: grid;
        gap: 20px;
      }

      .hero,
      .panel {
        background: var(--panel);
        border: 1px solid var(--panel-border);
        border-radius: 24px;
        box-shadow: 0 30px 80px rgba(77, 42, 18, 0.08);
      }

      .hero {
        padding: 32px;
      }

      .eyebrow {
        margin: 0 0 12px;
        color: var(--accent);
        font-size: 0.92rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .eyebrow a {
        color: inherit;
        text-decoration: none;
      }

      .eyebrow a:hover {
        text-decoration: underline;
      }

      h1 {
        margin: 0;
        font-size: clamp(2.2rem, 4vw, 3.4rem);
        line-height: 1.05;
      }

      .lede {
        margin: 16px 0 0;
        max-width: 62ch;
        color: var(--muted);
        font-size: 1.08rem;
        line-height: 1.7;
      }

      .hero-grid,
      .panel-grid {
        display: grid;
        gap: 16px;
      }

      .hero-grid {
        margin-top: 20px;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }

      .hero-links {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 18px;
      }

      .hero-card,
      .result-card {
        padding: 18px 20px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid rgba(94, 52, 23, 0.09);
      }

      .hero-card h2,
      .panel h2 {
        margin: 0 0 8px;
        font-size: 1.05rem;
      }

      .hero-card p,
      .panel p,
      .panel li {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .panel {
        padding: 28px;
      }

      .panel-grid {
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        margin-top: 20px;
      }

      label {
        display: grid;
        gap: 8px;
        font-size: 0.97rem;
      }

      .field-label {
        font-weight: 700;
        color: var(--text);
      }

      .field-hint {
        font-size: 0.88rem;
        color: var(--muted);
      }

      input,
      textarea {
        width: 100%;
        border: 1px solid rgba(94, 52, 23, 0.18);
        border-radius: 14px;
        padding: 14px 16px;
        background: rgba(255, 255, 255, 0.94);
        color: var(--text);
        font: inherit;
      }

      textarea {
        min-height: 180px;
        resize: vertical;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 20px;
      }

      button,
      .button-link {
        border: 0;
        border-radius: 999px;
        padding: 12px 18px;
        background: var(--accent);
        color: #fff6ef;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
      }

      .text-link {
        color: var(--accent);
        text-decoration: none;
        font-weight: 700;
      }

      .text-link:hover {
        text-decoration: underline;
      }

      button.secondary,
      .button-link.secondary {
        background: rgba(141, 75, 37, 0.1);
        color: var(--accent);
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .result-card {
        margin-top: 20px;
      }

      .result-card.success {
        background: var(--success-soft);
        border-color: rgba(33, 98, 69, 0.18);
      }

      .result-card.error {
        background: var(--danger-soft);
        border-color: rgba(159, 63, 50, 0.18);
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-top: 16px;
      }

      .summary-item {
        padding: 14px 16px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid rgba(94, 52, 23, 0.08);
      }

      .summary-item strong {
        display: block;
        margin-bottom: 6px;
        font-size: 0.84rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }

      .mono,
      code,
      pre {
        font-family: "SFMono-Regular", "Menlo", "Monaco", monospace;
      }

      pre {
        margin: 14px 0 0;
        padding: 16px;
        border-radius: 16px;
        background: rgba(49, 31, 20, 0.92);
        color: #fff1e5;
        overflow: auto;
        font-size: 0.88rem;
        line-height: 1.6;
      }

      ul {
        margin: 12px 0 0;
        padding-left: 20px;
      }

      .footer-note {
        font-size: 0.92rem;
      }

      .faq-grid {
        display: grid;
        gap: 16px;
        margin-top: 20px;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      }

      .faq-card {
        padding: 18px 20px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid rgba(94, 52, 23, 0.09);
      }

      .faq-card h3 {
        margin: 0 0 8px;
        font-size: 1.02rem;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <section class="hero">
        <p class="eyebrow"><a href="${HOSTED_SITE_URL}" target="_blank" rel="noreferrer noopener">${escapeHtml(PROTOCOL_NAME)}</a> · Offline Architect</p>
        <h1>Build Claim PSBTs Offline</h1>
        <p class="lede">
          This single-file tool prepares Global Name System claim artifacts entirely in your browser. Paste the wallet metadata and UTXOs you already trust, then carry the resulting PSBTs into Sparrow for signing.
        </p>
        <div class="hero-links">
          <a class="text-link" href="${HOSTED_SITE_URL}" target="_blank" rel="noreferrer noopener">Return to main site</a>
          <a class="text-link" href="${HOSTED_SITE_URL}/claim" target="_blank" rel="noreferrer noopener">Open hosted claim tool</a>
          <a class="text-link" href="${GITHUB_REPO_URL}" target="_blank" rel="noreferrer noopener">GitHub docs</a>
        </div>
        <div class="hero-grid">
          <article class="hero-card">
            <h2>What This Does</h2>
            <p>Builds the claim package, commit PSBT, reveal PSBT, and reveal-ready package without sending your inputs to a hosted service.</p>
          </article>
          <article class="hero-card">
            <h2>What You Still Need</h2>
            <p>Name availability checks, wallet UTXO discovery, and final signing still happen outside this file. That separation is intentional.</p>
          </article>
          <article class="hero-card">
            <h2>Security Model</h2>
            <p>The website is only the architect. Your wallet stays the key guardian and authorizer.</p>
          </article>
        </div>
      </section>

      <section class="panel">
        <h2>Claim Inputs</h2>
        <p>Paste the exact name, owner pubkey, wallet metadata, and confirmed UTXOs you want this offline architect to use.</p>
        <p class="field-hint">Amounts use integer bitcoin notation alongside the conventional BTC equivalent here. Example: <span class="mono">₿50,000 (0.0005 BTC)</span>.</p>
        <div class="panel-grid">
          <label>
            <span class="field-label">Desired Name</span>
            <input id="offlineNameInput" type="text" maxlength="32" placeholder="moneyball" autocomplete="off" />
          </label>
          <label>
            <span class="field-label">Owner Pubkey</span>
            <input id="offlineOwnerPubkeyInput" type="text" maxlength="64" placeholder="32-byte x-only pubkey in hex" autocomplete="off" />
          </label>
          <label>
            <span class="field-label">Nonce (8-byte hex)</span>
            <input id="offlineNonceInput" type="text" maxlength="16" placeholder="fe57eca56ea8002d" autocomplete="off" />
            <span class="field-hint">Use a fresh random nonce for each claim.</span>
          </label>
          <label>
            <span class="field-label">Bond Destination</span>
            <input id="offlineBondDestinationInput" type="text" placeholder="Wallet address for the bond output" autocomplete="off" />
          </label>
          <label>
            <span class="field-label">Change Destination (optional)</span>
            <input id="offlineChangeDestinationInput" type="text" placeholder="Leave blank to derive a fresh change address" autocomplete="off" />
          </label>
          <label>
            <span class="field-label">Bond Output Vout</span>
            <input id="offlineBondVoutInput" type="number" min="0" max="255" step="1" value="0" />
          </label>
          <label>
            <span class="field-label">Master Fingerprint</span>
            <input id="offlineFingerprintInput" type="text" maxlength="8" placeholder="57fb49c0" autocomplete="off" />
          </label>
          <label>
            <span class="field-label">Account XPUB / TPUB / VPUB</span>
            <input id="offlineAccountXpubInput" type="text" placeholder="Paste the account xpub from Sparrow" autocomplete="off" />
          </label>
          <label>
            <span class="field-label">Account Derivation Path</span>
            <input id="offlineAccountPathInput" type="text" value="m/84'/1'/0'" autocomplete="off" />
          </label>
          <label>
            <span class="field-label">Wallet Scan Limit</span>
            <input id="offlineWalletScanLimitInput" type="number" min="1" max="500" step="1" value="50" />
          </label>
          <label>
            <span class="field-label">Commit Fee (₿)</span>
            <input id="offlineCommitFeeInput" type="number" min="1" step="1" value="1000" />
          </label>
          <label>
            <span class="field-label">Reveal Fee (₿)</span>
            <input id="offlineRevealFeeInput" type="number" min="1" step="1" value="500" />
          </label>
        </div>
        <label style="margin-top:20px;">
          <span class="field-label">Confirmed Funding Inputs</span>
          <textarea id="offlineFundingInputsInput" spellcheck="false" placeholder="One per line:\nTXID:VOUT:VALUE_SATS:ADDRESS[:DERIVATION_PATH]"></textarea>
          <span class="field-hint">Example: <span class="mono">379240...:2:608375:tb1...:m/84'/1'/0'/1/0</span></span>
        </label>
        <div class="actions">
          <button id="offlineGenerateNonceButton" type="button">New Nonce</button>
          <button id="offlineBuildButton" type="button">Build Offline Claim Bundle</button>
          <button id="offlineDownloadClaimPackageButton" type="button" class="secondary" disabled>Download Claim Package</button>
          <button id="offlineDownloadRevealReadyButton" type="button" class="secondary" disabled>Download Reveal-Ready Package</button>
          <button id="offlineDownloadCommitPsbtButton" type="button" class="secondary" disabled>Download Commit PSBT</button>
          <button id="offlineDownloadRevealPsbtButton" type="button" class="secondary" disabled>Download Reveal PSBT</button>
          <button id="offlineDownloadSignerNotesButton" type="button" class="secondary" disabled>Download Signer Notes</button>
        </div>
        <div id="offlineClaimResult" class="result-card">
          Fill in the claim inputs above, then build the bundle locally.
        </div>
      </section>

      <section class="panel">
        <h2>Wallet Compatibility</h2>
        <p>The offline architect builds standard claim artifacts locally, but the current private demo is still Sparrow-first in practice.</p>
        <div class="faq-grid">
          <article class="faq-card">
            <h3>Do I have to use Sparrow?</h3>
            <p>No. The architect itself is wallet-agnostic and only prepares PSBTs and claim artifacts. But the current private-signet demo flow is only fully supported and tested with Sparrow.</p>
          </article>
          <article class="faq-card">
            <h3>Does Electrum work?</h3>
            <p>Not for the hosted private demo flow today. Electrum expects an Electrum server, while our private demo setup exposes Bitcoin Core RPC over an SSH tunnel. We do not currently run an Electrum-compatible server for this demo network.</p>
          </article>
          <article class="faq-card">
            <h3>Why doesn’t a public signet server show my demo coins?</h3>
            <p>Because the hosted demo uses a private signet, not the shared public signet. Public signet servers do not index this chain, so they will never show balances or transactions from the private demo.</p>
          </article>
          <article class="faq-card">
            <h3>What about other wallets later?</h3>
            <p>Other PSBT-capable wallets may be compatible, but they are not validated end to end yet. Broader support would require more wallet-specific testing or an Electrum-compatible server for the private signet flow.</p>
          </article>
        </div>
      </section>

      <section class="panel footer-note">
        <h2>Recommended High-Value Flow</h2>
        <ul>
          <li>Check name availability separately on a live explorer before you disconnect.</li>
          <li>Export or copy the exact wallet metadata and UTXOs you plan to spend.</li>
          <li>Open this single file on an offline computer, build the PSBTs, then carry them into Sparrow for signing.</li>
          <li>Only reconnect when you are ready to broadcast through your own chosen infrastructure.</li>
        </ul>
      </section>
    </div>
    <script>${safeScriptBody}</script>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
