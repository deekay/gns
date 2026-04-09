import { describe, expect, it } from "vitest";

import { renderOfflineClaimPageHtml } from "../src/offline-claim-page";

describe("renderOfflineClaimPageHtml", () => {
  it("includes the batch commit builder controls", () => {
    const html = renderOfflineClaimPageHtml("");

    expect(html).toContain("Batch Commit Builder");
    expect(html).toContain('id="offlineBatchClaimsInput"');
    expect(html).toContain('id="offlineBuildBatchButton"');
    expect(html).toContain('id="offlineDownloadBatchBundleButton"');
    expect(html).toContain('id="offlineBatchDownloads"');
    expect(html).toContain("reveal-ready batch claim package");
  });
});
