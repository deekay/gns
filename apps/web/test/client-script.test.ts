import { describe, expect, it } from "vitest";

import { renderClientScript } from "../src/client-script";

describe("renderClientScript", () => {
  it("emits syntactically valid browser javascript", () => {
    const script = renderClientScript("");

    expect(script).toContain('elements.searchForm?.addEventListener("submit"');
    expect(script).toContain('window.addEventListener("popstate"');
    expect(() => new Function(script)).not.toThrow();
  });

  it("keeps claim inputs open when only a generated owner key is present", () => {
    const script = renderClientScript("");

    expect(script).toContain("if (hasGeneratedOwnerKey) {");
    expect(script).toContain('setDetailsOpen(elements.claimStepInputs, true);');
    expect(script).toContain('setDetailsOpen(elements.claimStepBackups, true);');
  });

  it("includes batched claim activity and provenance handling", () => {
    const script = renderClientScript("");

    expect(script).toContain('eventTypes.includes("BATCH_REVEAL")');
    expect(script).toContain('eventTypes.includes("BATCH_ANCHOR")');
    expect(script).toContain("Anchor Txid");
    expect(script).toContain("Merkle Root");
    expect(script).toContain("Proof Chunks");
  });

  it("includes private signet batch smoke status handling", () => {
    const script = renderClientScript("");

    expect(script).toContain('/api/private-batch-smoke-status');
    expect(script).toContain("privateBatchSmokeStatus");
    expect(script).toContain("renderPrivateBatchSmokeStatus");
    expect(script).toContain("Batch Commit Txid");
  });
});
