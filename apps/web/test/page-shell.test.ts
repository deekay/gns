import { describe, expect, it } from "vitest";

import { renderPageHtml } from "../src/page-shell";

const baseOptions = {
  basePath: "",
  faviconDataUrl: "data:image/svg+xml;base64,AA==",
  includeLiveSmoke: true,
  includePrivateBatchSmoke: true,
  networkLabel: "private signet",
  privateSignetElectrumEndpoint: "globalnamesystem.org:50001:t",
  privateSignetFundingAmountSats: 50_000n,
  privateSignetFundingEnabled: true
} as const;

describe("renderPageHtml", () => {
  it("surfaces the payment-first framing and current docs on the home page", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "home"
    });

    expect(html).toContain("Human-Readable Names For Bitcoin Counterparties");
    expect(html).toContain("payment-first naming layer");
    expect(html).toContain("Open offline architect");
    expect(html).toContain("GNS_FROM_ZERO.md");
    expect(html).toContain("GNS_IMPLEMENTATION_AND_VALIDATION.md");
    expect(html).toContain("MERKLE_BATCHING_STATUS.md");
    expect(html).toContain("LAUNCH_SPEC_V0.md");
    expect(html).toContain("Private Signet Batch Smoke");
    expect(html).toContain("best live-chain proof for the current ordinary-lane Merkle batching path");
  });

  it("clarifies that live signet smoke is still the single-name path", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "explore"
    });

    expect(html).toContain("single-name public signet path today");
    expect(html).toContain("batched ordinary-claim path is validated in fixture mode and controlled-chain regtest");
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

  it("adds the overview nav entry", () => {
    const html = renderPageHtml({
      ...baseOptions,
      pageKind: "explainer"
    });

    expect(html).toContain(">Overview<");
    expect(html).toContain("Use The Current Prototype");
    expect(html).toContain("Implementation status");
  });
});
