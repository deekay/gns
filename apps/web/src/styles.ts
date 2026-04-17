export const STYLESHEET = `
:root {
  --bg: #f3ede2;
  --bg-strong: #eadfcd;
  --panel: rgba(255, 252, 246, 0.88);
  --panel-solid: #fffaf1;
  --ink: #1f1d1a;
  --muted: #635b50;
  --accent: #b05a2b;
  --accent-strong: #7f3514;
  --line: rgba(31, 29, 26, 0.12);
  --shadow: 0 20px 55px rgba(77, 53, 23, 0.14);
  --shadow-soft: 0 12px 34px rgba(77, 53, 23, 0.1);
  --shadow-card: 0 8px 22px rgba(77, 53, 23, 0.08);
  --radius-lg: 28px;
  --radius-md: 18px;
}

* {
  box-sizing: border-box;
}

[hidden] {
  display: none !important;
}

html,
body {
  margin: 0;
  min-height: 100%;
}

body {
  color: var(--ink);
  background:
    radial-gradient(circle at top left, rgba(176, 90, 43, 0.22), transparent 28%),
    radial-gradient(circle at bottom right, rgba(127, 53, 20, 0.18), transparent 32%),
    linear-gradient(180deg, var(--bg) 0%, #f8f3ea 52%, var(--bg-strong) 100%);
  font-family: "IBM Plex Sans", "Avenir Next", "Segoe UI", sans-serif;
}

.page-shell {
  width: min(1180px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 32px 0 48px;
}

.site-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
  padding: 12px 14px;
  border: 1px solid rgba(31, 29, 26, 0.1);
  border-radius: 999px;
  background: rgba(255, 252, 246, 0.72);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(14px);
}

.site-nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--ink);
  text-decoration: none;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.site-nav-brand-mark {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: block;
  flex: 0 0 auto;
}

.site-nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  align-items: center;
}

.site-nav-link {
  color: var(--muted);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
}

.site-nav-link:hover,
.site-nav-brand:hover {
  color: var(--accent-strong);
}

.site-nav-link:hover {
  background: rgba(176, 90, 43, 0.06);
}

.site-nav-link.is-active {
  color: var(--accent-strong);
  border-color: rgba(176, 90, 43, 0.16);
  background: rgba(176, 90, 43, 0.08);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.75fr);
  gap: 18px;
  align-items: stretch;
  margin-bottom: 22px;
}

.hero-single {
  grid-template-columns: minmax(0, 1fr);
}

.hero-single .hero-copy {
  max-width: 780px;
}

.hero-page {
  max-width: 760px;
  margin-left: auto;
  margin-right: auto;
}

.hero-page .hero-copy {
  max-width: 760px;
  margin: 0 auto;
  min-height: 0;
  padding: 28px 32px;
  text-align: center;
}

.hero-page .eyebrow {
  margin-bottom: 10px;
}

.hero-page h1 {
  max-width: none;
  font-size: clamp(2rem, 5vw, 3.3rem);
}

.hero-page .lede {
  margin: 14px auto 0;
  max-width: 42ch;
}

.hero-page .hero-status {
  margin-top: 16px;
}

.hero-home {
  max-width: 1080px;
  margin-left: auto;
  margin-right: auto;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.hero-home-banner {
  max-width: none;
  min-height: 0;
  padding: 18px 32px 22px;
  text-align: center;
  background:
    radial-gradient(circle at 16% 0%, rgba(176, 90, 43, 0.12), transparent 30%),
    linear-gradient(180deg, rgba(176, 90, 43, 0.07), rgba(255, 252, 246, 0.94)),
    var(--panel);
}

.hero-home-banner .eyebrow {
  margin-bottom: 10px;
}

.hero-home-banner h1 {
  max-width: none;
  font-size: clamp(2.15rem, 4.9vw, 3.95rem);
  line-height: 0.98;
  letter-spacing: -0.035em;
  text-wrap: balance;
}

.hero-home-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0;
}

.hero-home-intro {
  max-width: none;
  min-height: 0;
  padding: 24px 28px 28px;
  display: grid;
  gap: 18px;
  align-items: start;
  background:
    radial-gradient(circle at top left, rgba(176, 90, 43, 0.1), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 252, 246, 0.96)),
    var(--panel);
}

.hero-home-intro-copy {
  display: grid;
  gap: 10px;
  align-content: start;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(31, 29, 26, 0.08);
}

.hero-home-intro .hero-card-label {
  margin: 0;
  color: var(--accent-strong);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;
  font-weight: 800;
}

.hero-home-intro .lede {
  margin: 0;
  max-width: 30ch;
  font-size: clamp(1.18rem, 1.7vw, 1.52rem);
  line-height: 1.14;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.hero-home-principles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.hero-home-principle {
  min-height: 0;
  padding: 18px 18px 17px;
  border-radius: 22px;
  border: 1px solid rgba(31, 29, 26, 0.09);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(252, 247, 240, 0.9)),
    rgba(255, 255, 255, 0.86);
  box-shadow: 0 10px 26px rgba(77, 53, 23, 0.07);
  display: grid;
  gap: 10px;
  align-content: start;
}

.hero-home-principle-head {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 34px;
}

.hero-home-principle-kicker {
  margin: 0;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(127, 53, 20, 0.12);
  background: rgba(176, 90, 43, 0.08);
  color: var(--accent-strong);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  flex: 0 0 auto;
}

.hero-home-principle h3 {
  margin: 0;
  font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
  font-size: 1.14rem;
  line-height: 1.02;
  letter-spacing: -0.015em;
}

.hero-home-principle p:last-child {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
  font-size: 0.98rem;
}

.hero-copy,
.hero-card,
.panel {
  background: var(--panel);
  backdrop-filter: blur(12px);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-soft);
}

.hero-copy {
  border-radius: var(--radius-lg);
  padding: 32px;
}

.hero-card {
  border-radius: var(--radius-lg);
  padding: 28px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background:
    linear-gradient(145deg, rgba(176, 90, 43, 0.1), rgba(255, 252, 246, 0.92)),
    var(--panel);
}

.hero-actions {
  align-items: stretch;
}

.eyebrow {
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.74rem;
  color: var(--accent-strong);
}

.eyebrow-link {
  color: inherit;
  text-decoration: none;
}

.eyebrow-link:hover {
  text-decoration: underline;
}

h1,
h2 {
  font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
  line-height: 1.04;
  margin: 0;
}

h1 {
  font-size: clamp(2.5rem, 6vw, 4.3rem);
  max-width: 12ch;
}

h2 {
  font-size: 1.85rem;
}

.lede,
.panel-head p,
.hero-card-meta,
.stat-label,
.field-label,
.list-status,
.result-meta,
.name-meta {
  color: var(--muted);
}

.lede {
  margin: 18px 0 0;
  max-width: 56ch;
  font-size: 1.02rem;
  line-height: 1.65;
}

.hero-status {
  margin: 18px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(176, 90, 43, 0.08);
  color: var(--ink);
  font-size: 0.94rem;
  font-weight: 600;
  line-height: 1.3;
}

.hero-card-label {
  margin: 0;
  color: var(--muted);
  font-size: 0.92rem;
}

.hero-card-value {
  margin: 8px 0;
  font-size: 1.9rem;
  font-weight: 700;
}

.hero-card-meta {
  margin: 0;
  line-height: 1.5;
}

.hero-action-list {
  display: grid;
  gap: 12px;
  margin-top: 10px;
}

.hero-home-card .hero-action-list {
  margin-top: 0;
  gap: 10px;
}

.hero-action-item {
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.64);
  padding: 14px;
  display: grid;
  gap: 6px;
}

.hero-action-item strong {
  font-size: 0.98rem;
}

.hero-action-item p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
  max-width: 34ch;
}

.hero-home-card .hero-action-item {
  padding: 13px 14px;
  gap: 6px;
}

.hero-home-card .hero-card-meta {
  margin-top: 0;
  padding-top: 4px;
}

.hero-cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.section-cta-row {
  margin-top: 18px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 24px;
}

.jump-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 24px;
}

.jump-bar a {
  display: inline-flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255, 252, 246, 0.76);
  color: var(--accent-strong);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 700;
  box-shadow: var(--shadow);
}

.jump-bar a:hover {
  background: rgba(255, 255, 255, 0.92);
}

.hero-cta-row .action-link,
.detail-actions-row .action-link {
  flex: 0 0 auto;
}

.panel {
  border-radius: var(--radius-md);
  padding: 26px;
  display: grid;
  gap: 20px;
  align-content: start;
}

.panel-compose-minimal {
  gap: 0;
}

.panel-support-strip {
  gap: 12px;
  padding-top: 18px;
  padding-bottom: 18px;
}

.support-strip-label {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 600;
}

.support-strip-actions {
  margin-top: 0;
}

.tool-handoff-note {
  margin: 0;
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.tool-handoff-note a {
  color: var(--accent-strong);
}

.tool-callout-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  margin-bottom: 18px;
}

.command-block {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: rgba(26, 17, 8, 0.92);
  color: #f5f0eb;
  font-size: 0.95rem;
  line-height: 1.45;
  overflow-x: auto;
}

.command-block code {
  font-family: "SFMono-Regular", SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
}

.panel-home {
  max-width: 1080px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
}

.panel-home + .panel-home {
  margin-top: 2px;
}

.panel-search,
.panel-overview,
.panel-activity,
.panel-compose,
.panel-live-smoke,
.panel-pending,
.panel-guide,
.panel-network,
.panel-list {
  grid-column: 1 / -1;
}

.panel-search {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 252, 246, 0.72)),
    radial-gradient(circle at top right, rgba(176, 90, 43, 0.12), transparent 34%),
    var(--panel-solid);
  border-color: rgba(127, 53, 20, 0.14);
}

.panel-collapsible {
  overflow: hidden;
}

.panel-summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0;
}

.panel-summary::-webkit-details-marker {
  display: none;
}

.panel-summary-copy {
  display: grid;
  gap: 8px;
}

.panel-summary-copy p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
}

.summary-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  background: rgba(176, 90, 43, 0.08);
  color: var(--accent-strong);
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.summary-chip.is-waiting {
  background: rgba(255, 255, 255, 0.72);
  color: var(--muted);
}

.summary-chip.is-current,
.summary-chip.is-ready {
  background: rgba(176, 90, 43, 0.12);
  color: var(--accent-strong);
}

.summary-chip.is-complete {
  background: rgba(80, 150, 90, 0.14);
  color: #265f2e;
}

.detail-overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}

.detail-summary-card {
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  padding: 16px;
  display: grid;
  gap: 8px;
}

.detail-summary-card label {
  color: var(--muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.detail-summary-value {
  font-size: 1.05rem;
  font-weight: 700;
}

.detail-summary-copy {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
}

.detail-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px 0 20px;
}

.detail-meta-row {
  margin: 8px 0 0;
}

.detail-technical details,
.detail-technical {
  margin-top: 18px;
}

.detail-technical summary {
  cursor: pointer;
  font-weight: 700;
  color: var(--accent-strong);
}

.detail-technical summary::-webkit-details-marker {
  display: none;
}

.detail-technical-body {
  margin-top: 16px;
}

.collapsible-panel-body {
  margin-top: 0;
  display: grid;
  gap: 18px;
}

.panel-head {
  margin-bottom: 0;
}

.panel-head-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.panel-head-copy {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.panel-head-copy p,
.panel-head p {
  margin: 0;
  line-height: 1.6;
  max-width: 62ch;
}

.info-popover {
  position: relative;
  flex: 0 0 auto;
}

.info-popover[open] {
  z-index: 20;
}

.info-popover-toggle {
  list-style: none;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.9);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--accent-strong);
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(77, 53, 23, 0.1);
}

.info-popover-toggle::-webkit-details-marker {
  display: none;
}

.info-popover-card {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: min(300px, calc(100vw - 64px));
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 252, 246, 0.98);
  border: 1px solid var(--line);
  box-shadow: 0 20px 48px rgba(77, 53, 23, 0.18);
}

.info-popover-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
}

.search-form,
.claim-draft-form,
.compose-form,
.transfer-form,
.claim-funding-form,
.claim-psbt-form {
  display: grid;
  gap: 16px;
}

.search-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: stretch;
}

.search-row button {
  min-width: 144px;
}

.inline-input-row button {
  min-width: 136px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.draft-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.draft-field {
  display: grid;
  gap: 10px;
}

.draft-field-full {
  grid-column: 1 / -1;
}

.value-bundle-editor {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.54);
}

.value-bundle-rows {
  display: grid;
  gap: 18px;
}

.value-bundle-row {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.6fr) auto;
  gap: 14px;
  align-items: end;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(31, 29, 26, 0.08);
  background: rgba(244, 239, 232, 0.56);
}

.value-bundle-row-actions {
  display: flex;
  align-items: end;
}

.value-bundle-remove-button {
  white-space: nowrap;
}

.value-bundle-preview {
  display: grid;
  gap: 12px;
}

.value-bundle-preview-row {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(31, 29, 26, 0.08);
  background: rgba(244, 239, 232, 0.72);
}

.value-bundle-preview-row label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.value-bundle-preview-row .field-value {
  margin: 0;
  line-height: 1.55;
  word-break: break-word;
}

.value-history-card {
  display: grid;
  gap: 12px;
  margin-top: 18px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(31, 29, 26, 0.08);
  background: rgba(244, 239, 232, 0.58);
}

.value-history-head {
  display: grid;
  gap: 4px;
}

.value-history-rows {
  display: grid;
  gap: 8px;
}

.resolver-compare-card {
  display: grid;
  gap: 12px;
  margin-top: 18px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(31, 29, 26, 0.08);
  background: rgba(176, 90, 43, 0.06);
}

.resolver-compare-list {
  display: grid;
  gap: 6px;
}

.resolver-compare-list p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
}

.value-history-row {
  display: grid;
  grid-template-columns: 0.6fr 1.4fr 1fr;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.62);
  color: var(--text);
  font-size: 0.9rem;
}

.draft-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 8px;
}

.inline-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: end;
}

.field-hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.45;
}

.claim-flow {
  display: grid;
  gap: 24px;
  max-width: 980px;
  margin: 0 auto;
}

.claim-flow-step {
  display: grid;
  gap: 0;
  padding: 0;
  border-radius: 22px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.66);
  overflow: hidden;
}

.claim-flow-step-emphasis {
  background:
    linear-gradient(145deg, rgba(176, 90, 43, 0.08), rgba(255, 255, 255, 0.78)),
    rgba(255, 255, 255, 0.72);
}

.wizard-step summary::-webkit-details-marker {
  display: none;
}

.wizard-step-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  cursor: pointer;
  list-style: none;
  padding: 24px 26px;
}

.wizard-step-body {
  display: grid;
  gap: 18px;
  padding: 0 26px 26px;
}

.wizard-step-heading {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.wizard-step-copy {
  display: grid;
  gap: 6px;
}

.wizard-step-copy h3 {
  margin: 0;
}

.wizard-step-copy p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
}

.claim-step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 78px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(127, 53, 20, 0.14);
  background: rgba(176, 90, 43, 0.08);
  color: var(--accent-strong);
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.claim-step-actions {
  padding-top: 2px;
}

.field {
  display: grid;
  gap: 10px;
}

.field-label {
  font-size: 0.9rem;
  font-weight: 700;
}

.field-note {
  margin: 0;
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.45;
}

input,
textarea,
button,
select {
  font: inherit;
}

input,
textarea,
select {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(31, 29, 26, 0.16);
  background: rgba(255, 255, 255, 0.92);
  padding: 12px 14px;
  color: var(--ink);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
  min-height: 48px;
}

input[readonly] {
  background: rgba(244, 239, 232, 0.92);
  color: var(--muted);
}

textarea {
  min-height: 112px;
  resize: vertical;
}

input:focus,
textarea:focus,
select:focus {
  outline: 2px solid rgba(176, 90, 43, 0.25);
  outline-offset: 1px;
  border-color: rgba(176, 90, 43, 0.52);
}

.field-actions,
.claim-key-actions,
.claim-package-actions,
.psbt-actions,
.transfer-package-actions,
.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.field-actions > *,
.claim-key-actions > *,
.claim-package-actions > *,
.psbt-actions > *,
.transfer-package-actions > *,
.result-actions > *,
.draft-actions > *,
.detail-actions-row > * {
  flex: 0 0 auto;
}

button,
.action-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgba(127, 53, 20, 0.12);
  background: linear-gradient(135deg, var(--accent), #cf7b47);
  color: #fff;
  padding: 12px 18px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease;
  box-shadow: 0 10px 24px rgba(127, 53, 20, 0.2);
  min-height: 48px;
}

button:hover,
.action-link:hover {
  transform: translateY(-1px);
  filter: brightness(1.03);
}

button.secondary,
.secondary-button,
.action-link.secondary {
  background: rgba(255, 255, 255, 0.92);
  color: var(--accent-strong);
  border-color: rgba(127, 53, 20, 0.12);
  box-shadow: 0 10px 24px rgba(77, 53, 23, 0.12);
}

button.ghost,
.action-link.ghost {
  background: rgba(255, 255, 255, 0.72);
  color: var(--ink);
  border-color: rgba(31, 29, 26, 0.1);
  box-shadow: none;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
  filter: none;
  transform: none;
  box-shadow: none;
}

.inline-button {
  padding: 8px 12px;
  font-size: 0.88rem;
  box-shadow: none;
}

.status-card,
.summary-card,
.activity-card,
.pending-card,
.name-card,
.recent-name-row,
.claim-step-card,
.claim-support-card,
.value-card,
.transfer-card,
.timeline-card,
.name-activity-card,
.live-smoke-card,
.result-card,
.claim-mode-card,
.highlight-card,
.claim-essentials-card,
.transfer-essentials-card,
.claim-owner-key-card,
.claim-funding-card,
.claim-psbt-card {
  border-radius: 18px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.7);
  padding: 20px;
  box-shadow: var(--shadow-card);
}

.claim-owner-key-card {
  background: rgba(176, 90, 43, 0.06);
}

.claim-owner-key-body {
  display: grid;
  gap: 12px;
}

.claim-owner-key-warning {
  margin: 0;
  color: var(--accent-strong);
  font-weight: 600;
  line-height: 1.55;
}

.claim-owner-key-summary {
  display: grid;
  gap: 10px;
}

.claim-owner-key-actions {
  margin-top: 4px;
}

.claim-funding-card {
  background: rgba(176, 90, 43, 0.05);
}

.value-json-preview {
  margin: 0;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: rgba(26, 17, 8, 0.92);
  color: #f5f0eb;
  font-size: 0.92rem;
  line-height: 1.55;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.claim-funding-result {
  display: grid;
  gap: 12px;
}

.stats-grid,
.activity-list,
.pending-list,
.names-list,
.name-groups,
.name-group-list,
.compact-name-list {
  display: grid;
  gap: 16px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.stats-grid {
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.stat-card {
  border-radius: 16px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.72);
  padding: 16px;
  display: grid;
  gap: 8px;
  box-shadow: var(--shadow-card);
}

.name-group {
  display: grid;
  gap: 14px;
}

.name-group-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.name-group-copy {
  display: grid;
  gap: 6px;
}

.name-group-copy h3,
.name-group-copy p {
  margin: 0;
}

.name-group-copy p {
  color: var(--muted);
  line-height: 1.55;
  max-width: 62ch;
}

.name-group-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(176, 90, 43, 0.08);
  color: var(--accent-strong);
  font-weight: 700;
}

.claim-psbt-card {
  background: rgba(127, 53, 20, 0.05);
}

.claim-psbt-result {
  display: grid;
  gap: 12px;
}

.claim-package-summary,
.transfer-package-summary,
.claim-psbt-summary,
.timeline-entry-grid,
.name-activity-grid,
.live-smoke-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.summary-grid,
.result-grid,
.name-grid,
.value-grid,
.transfer-grid,
.highlights-grid,
.activity-grid,
.name-list-grid,
.guide-grid,
.claim-guide-grid,
.claim-support-grid,
.claim-modes-grid,
.transfer-mode-grid {
  display: grid;
  gap: 16px;
}

.transfer-mode-secondary {
  margin-top: 16px;
}

.transfer-mode-secondary summary {
  cursor: pointer;
  font-weight: 700;
  color: var(--accent-strong);
}

.transfer-mode-secondary summary::-webkit-details-marker {
  display: none;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.highlights-grid {
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
}

.claim-guide-grid,
.claim-support-grid,
.claim-modes-grid,
.transfer-mode-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.guide-grid {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.result-grid,
.name-grid,
.value-grid,
.transfer-grid,
.claim-package-summary {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.status-card,
.summary-card {
  display: grid;
  gap: 8px;
}

.stat-label {
  font-size: 0.84rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
}

.summary-meta {
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.5;
}

.highlight-card {
  display: grid;
  gap: 10px;
}

.guide-card {
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.68));
  display: grid;
  gap: 12px;
  align-content: start;
  box-shadow: var(--shadow-card);
}

.guide-card h3 {
  margin: 0;
  font-size: 1rem;
}

.guide-card p,
.guide-card ul,
.guide-card ol {
  margin: 0;
  line-height: 1.55;
}

.guide-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}

.path-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
}

.path-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(31, 29, 26, 0.1);
  border-radius: 20px;
  padding: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.68));
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 168px;
  box-shadow: var(--shadow-card);
}

.path-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: linear-gradient(180deg, rgba(176, 90, 43, 0.46), rgba(176, 90, 43, 0.08));
}

.path-card h3,
.path-card p {
  margin: 0;
}

.path-card p {
  color: var(--muted);
  line-height: 1.5;
  max-width: 30ch;
}

.path-card-actions {
  margin-top: auto;
  padding-top: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.path-support-row {
  margin-top: 4px;
}

.path-card-actions .action-link {
  align-self: center;
}

.guide-list {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
  line-height: 1.55;
}

.highlight-kicker {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--accent-strong);
  font-weight: 700;
}

.highlight-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
}

.activity-card,
.pending-card,
.name-card,
.recent-name-row,
.live-smoke-card,
.name-activity-card,
.timeline-card,
.result-card,
.claim-mode-card,
.transfer-card {
  display: grid;
  gap: 14px;
}

.name-card.compact {
  padding: 14px 16px;
  gap: 8px;
}

.recent-names-list {
  display: grid;
  gap: 16px;
}

.recent-name-row {
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}

.recent-name-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 14px 24px;
}

.recent-name-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.recent-name-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  justify-content: flex-end;
  align-items: center;
  margin: 0;
  text-align: right;
}

.recent-name-links a {
  color: var(--accent-strong);
  font-weight: 600;
  text-decoration: none;
}

.recent-name-links a:hover {
  text-decoration: underline;
}

.recent-name-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  color: var(--muted);
  font-size: 0.92rem;
  line-height: 1.5;
  margin: 0;
}

.tx-chip-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 10px;
}

.tx-link-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tx-inspect-button {
  min-height: 36px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.84);
  color: var(--accent-strong);
  border-color: rgba(127, 53, 20, 0.1);
  box-shadow: none;
  font-size: 0.84rem;
}

.tx-inspect-button:hover {
  background: rgba(255, 255, 255, 0.96);
  filter: none;
}

.result-title,
.name-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 10px 12px;
}

.name-summary,
.compact-name-summary {
  display: grid;
  gap: 8px;
}

.name-summary-meta,
.compact-name-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.name-list-group {
  display: grid;
  gap: 14px;
}

.name-list-group[hidden] {
  display: none;
}

.name-list-group .panel-head {
  margin-bottom: 4px;
}

.name-list-group-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.state-chip,
.status-chip,
.status-pill,
.filter-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 7px 14px;
  border: 1px solid rgba(127, 53, 20, 0.16);
  background: rgba(176, 90, 43, 0.1);
  color: var(--accent-strong);
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.2;
  box-shadow: none;
}

.status-chip.available {
  background: rgba(80, 150, 90, 0.14);
  color: #265f2e;
}

.status-pill.available {
  background: rgba(80, 150, 90, 0.14);
  color: #265f2e;
}

.status-chip.pending {
  background: rgba(111, 111, 167, 0.14);
  color: #404896;
}

.status-pill.pending {
  background: rgba(111, 111, 167, 0.14);
  color: #404896;
}

.status-chip.immature {
  background: rgba(210, 137, 48, 0.15);
  color: #7a4a0f;
}

.status-pill.immature {
  background: rgba(210, 137, 48, 0.15);
  color: #7a4a0f;
}

.status-chip.mature {
  background: rgba(41, 108, 157, 0.14);
  color: #1e4f73;
}

.status-pill.mature {
  background: rgba(41, 108, 157, 0.14);
  color: #1e4f73;
}

.status-chip.invalid {
  background: rgba(178, 73, 78, 0.14);
  color: #7d1f25;
}

.status-pill.invalid {
  background: rgba(178, 73, 78, 0.14);
  color: #7d1f25;
}

.status-chip.value,
.status-chip.transfer,
.status-chip.claim,
.status-chip.reveal {
  background: rgba(111, 111, 167, 0.14);
  color: #404896;
}

.status-pill.value,
.status-pill.transfer,
.status-pill.claim,
.status-pill.reveal {
  background: rgba(111, 111, 167, 0.14);
  color: #404896;
}

.status-chip.invalidation {
  background: rgba(178, 73, 78, 0.14);
  color: #7d1f25;
}

.status-pill.invalidation {
  background: rgba(178, 73, 78, 0.14);
  color: #7d1f25;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 14px;
}

.filter-chip {
  background: rgba(255, 255, 255, 0.72);
  color: var(--ink);
  cursor: pointer;
}

.filter-chip.is-active {
  background: linear-gradient(135deg, rgba(176, 90, 43, 0.12), rgba(255, 255, 255, 0.94));
  color: var(--accent-strong);
}

.activity-meta,
.pending-meta,
.name-meta,
.timeline-meta,
.name-activity-meta,
.live-smoke-meta,
.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  font-size: 0.9rem;
  align-items: center;
  line-height: 1.5;
  margin: 0;
}

.name-card-main {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.name-card-copy {
  display: grid;
  gap: 8px;
}

.name-card h3,
.result-card h3,
.claim-step-card h3,
.claim-support-card h3,
.claim-mode-card h3,
.transfer-card h3,
.timeline-card h3,
.name-activity-card h3,
.live-smoke-card h3 {
  margin: 0;
  font-size: 1.2rem;
  font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
}

.name-card-header {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.name-card p,
.activity-card p,
.pending-card p,
.timeline-card p,
.name-activity-card p,
.claim-step-card p,
.claim-support-card p,
.claim-mode-card p,
.transfer-card p,
.live-smoke-card p,
.result-card p {
  margin: 0;
  line-height: 1.6;
}

.name-card details {
  border-top: 1px solid var(--line);
  padding-top: 12px;
}

.name-card summary {
  cursor: pointer;
  font-weight: 700;
  color: var(--accent-strong);
}

.name-card summary::-webkit-details-marker {
  display: none;
}

.result-shell {
  display: grid;
  gap: 16px;
}

.lookup-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.lookup-fact {
  border-radius: 14px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.68);
  padding: 14px 16px;
  display: grid;
  gap: 6px;
}

.lookup-fact-label {
  color: var(--muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.lookup-fact-value {
  font-size: 1rem;
  line-height: 1.35;
}

.lookup-note {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
}

.lookup-note-warning {
  color: var(--accent-strong);
}

.lookup-result-actions {
  margin-top: 4px;
}

.lookup-technical {
  margin-top: 0;
}

.result-empty {
  color: var(--muted);
  font-style: italic;
}

.result-banner {
  display: grid;
  gap: 8px;
  padding: 18px 20px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.76);
}

.result-banner strong {
  font-size: 1.1rem;
}

.result-banner.available {
  background: rgba(80, 150, 90, 0.12);
}

.result-banner.pending {
  background: rgba(111, 111, 167, 0.12);
}

.result-banner.immature {
  background: rgba(210, 137, 48, 0.12);
}

.result-banner.mature {
  background: rgba(41, 108, 157, 0.12);
}

.result-banner.invalid {
  background: rgba(178, 73, 78, 0.12);
}

.search-state-banner {
  display: grid;
  gap: 6px;
  padding: 18px 20px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.82);
}

.search-state-banner.available {
  background: rgba(80, 150, 90, 0.12);
}

.search-state-banner.pending {
  background: rgba(111, 111, 167, 0.12);
}

.search-state-banner.immature {
  background: rgba(210, 137, 48, 0.12);
}

.search-state-banner.mature {
  background: rgba(41, 108, 157, 0.12);
}

.search-state-banner.invalid {
  background: rgba(178, 73, 78, 0.12);
}

.search-state-label {
  margin: 0;
  color: var(--muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.search-state-title {
  margin: 0;
  font-size: 1.12rem;
}

.search-state-copy {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
}

.detail-timeline,
.detail-activity,
.claim-step-list,
.claim-support-list,
.transfer-mode-list {
  display: grid;
  gap: 12px;
}

.timeline-entry,
.name-activity-entry,
.claim-step-entry,
.claim-support-entry,
.transfer-mode-entry {
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.72);
}

.timeline-entry-grid,
.name-activity-grid {
  margin-top: 10px;
}

.timeline-entry-grid div,
.name-activity-grid div,
.claim-package-summary div,
.transfer-package-summary div,
.claim-psbt-summary div,
.live-smoke-grid div {
  display: grid;
  gap: 6px;
}

.timeline-entry-grid label,
.name-activity-grid label,
.claim-package-summary label,
.transfer-package-summary label,
.claim-psbt-summary label,
.live-smoke-grid label {
  color: var(--muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.mono {
  font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
  font-size: 0.92rem;
  overflow-wrap: anywhere;
}

.claim-key-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
}

.claim-package-actions,
.transfer-package-actions,
.psbt-actions {
  margin-top: 6px;
}

.mode-list {
  display: grid;
  gap: 12px;
}

.mode-card {
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.72);
  display: grid;
  gap: 10px;
}

.mode-card.recommended {
  background: rgba(176, 90, 43, 0.08);
}

.mode-card h4 {
  margin: 0;
  font-size: 1rem;
}

.mode-card p,
.mode-card ol,
.mode-card ul {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}

.mode-card ol,
.mode-card ul {
  padding-left: 18px;
}

.live-smoke-shell {
  display: grid;
  gap: 12px;
}

.message {
  margin-top: 8px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(31, 29, 26, 0.08);
  background: rgba(255, 255, 255, 0.84);
}

.message.error {
  background: rgba(178, 73, 78, 0.12);
}

.message.success {
  background: rgba(80, 150, 90, 0.12);
}

.message p {
  margin: 0;
}

.compact-name-card {
  border: 1px solid var(--line);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  padding: 14px 16px;
}

.compact-name-card summary {
  cursor: pointer;
  list-style: none;
}

.compact-name-card summary::-webkit-details-marker {
  display: none;
}

.resume-callout {
  border: 1px solid rgba(127, 53, 20, 0.14);
  background: linear-gradient(145deg, rgba(176, 90, 43, 0.1), rgba(255, 255, 255, 0.86));
}

.hidden {
  display: none !important;
}

@media (max-width: 980px) {
  .site-nav {
    flex-direction: column;
    align-items: flex-start;
    border-radius: 24px;
  }

  .site-nav-links {
    gap: 6px;
  }

  .hero,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .hero-home-grid {
    grid-template-columns: 1fr;
  }

  .hero-home-intro {
    gap: 20px;
  }

  .hero-home-principles {
    grid-template-columns: 1fr;
  }

  .summary-grid,
  .stats-grid,
  .result-grid,
  .name-grid,
  .value-grid,
  .transfer-grid,
  .claim-package-summary,
  .transfer-package-summary,
  .claim-psbt-summary,
  .live-smoke-grid,
  .detail-overview-grid,
  .claim-guide-grid,
  .claim-support-grid,
  .claim-modes-grid,
  .guide-grid,
  .transfer-mode-grid,
  .field-grid,
  .timeline-entry-grid,
  .name-activity-grid,
  .path-grid {
    grid-template-columns: 1fr;
  }

  .name-card-main,
  .name-group-head,
  .panel-head-main,
  .panel-summary,
  .wizard-step-summary,
  .wizard-step-heading {
    flex-direction: column;
    align-items: flex-start;
  }

  .recent-name-row {
    grid-template-columns: 1fr;
  }

  .recent-name-header {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .recent-name-links,
  .tx-chip-row {
    justify-content: flex-start;
    text-align: left;
  }

  .claim-key-grid {
    grid-template-columns: 1fr;
  }

  .tool-callout-row {
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .page-shell {
    width: min(100vw, calc(100vw - 24px));
    padding: 18px 0 32px;
  }

  .site-nav {
    margin-bottom: 14px;
    padding: 12px;
  }

  .site-nav-links {
    gap: 8px 12px;
  }

  .hero-copy,
  .hero-card,
  .panel {
    padding: 20px;
  }

  .hero-home-banner {
    padding: 18px 18px 20px;
  }

  .hero-home-banner h1 {
    font-size: clamp(1.9rem, 8.8vw, 2.75rem);
  }

  .hero-home-intro,
  .hero-home-card {
    padding: 20px;
  }

  .hero-home-principle {
    padding: 16px;
  }

  .hero-home-intro .lede {
    max-width: 24ch;
    font-size: clamp(1.12rem, 5.4vw, 1.3rem);
  }

  .hero-home-principle h3 {
    font-size: 1.06rem;
  }

  .hero-page .hero-copy {
    padding: 22px 20px;
  }

  .wizard-step-summary {
    padding: 18px 20px;
  }

  .wizard-step-body {
    padding: 0 20px 20px;
  }

  h1 {
    max-width: unset;
    font-size: clamp(2rem, 9vw, 2.8rem);
  }

  .field-actions,
  .claim-key-actions,
  .claim-package-actions,
  .psbt-actions,
  .transfer-package-actions,
  .draft-actions,
  .detail-actions-row {
    width: 100%;
  }

  .search-row,
  .inline-input-row,
  .draft-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .value-bundle-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .value-history-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .search-row > button,
  .inline-input-row > button,
  .field-actions > *,
  .claim-key-actions > *,
  .claim-package-actions > *,
  .psbt-actions > *,
  .transfer-package-actions > *,
  .draft-actions > *,
  .detail-actions-row > * {
    width: 100%;
  }

  .hero-cta-row {
    gap: 8px;
  }

  .hero-cta-row .action-link {
    flex: 1 1 100%;
    width: 100%;
  }

  .jump-bar {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
    margin-bottom: 20px;
    scrollbar-width: none;
  }

  .jump-bar::-webkit-scrollbar {
    display: none;
  }

  .jump-bar a {
    flex: 0 0 auto;
    width: auto;
    white-space: nowrap;
    justify-content: center;
    box-shadow: none;
  }

  .summary-chip,
  .state-chip,
  .status-chip,
  .filter-chip {
    width: auto;
    max-width: 100%;
  }

  .filter-row,
  .tx-link-list {
    gap: 8px;
  }

  .tx-inspect-button {
    min-height: 38px;
    padding: 9px 12px;
    font-size: 0.88rem;
    box-shadow: none;
  }

  .recent-name-row,
  .activity-card,
  .pending-card,
  .name-card,
  .live-smoke-card,
  .timeline-card,
  .name-activity-card,
  .result-card,
  .claim-mode-card,
  .transfer-card,
  .claim-step-card,
  .claim-support-card,
  .claim-owner-key-card,
  .claim-funding-card,
  .claim-psbt-card,
  .guide-card,
  .highlight-card {
    padding: 18px;
  }
}
`;
