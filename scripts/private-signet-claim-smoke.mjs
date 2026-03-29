#!/usr/bin/env node

import {
  claimName,
  createScenarioName,
  scenarioArtifactsDir,
  withPrivateSignetSession,
  writeScenarioSummary
} from "./private-signet-smoke-lib.mjs";

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});

async function main() {
  await withPrivateSignetSession(async ({ owner, rpcPassword }) => {
    const name = createScenarioName("pclm");
    logStep(name, "claiming name");
    const summary = {
      kind: "gns-private-signet-claim-smoke-summary",
      startedAt: new Date().toISOString(),
      name,
      steps: []
    };

    const claimResult = await claimName({
      name,
      account: owner,
      rpcPassword,
      outDir: scenarioArtifactsDir(name)
    });
    summary.steps.push({ step: "claim_name", result: claimResult });

    if (claimResult.record.status !== "immature" && claimResult.record.status !== "mature") {
      throw new Error(`expected ${name} to be claimed after reveal, got ${claimResult.record.status}`);
    }

    summary.steps.push({
      step: "claim_confirmed",
      record: claimResult.record
    });
    summary.completedAt = new Date().toISOString();

    await writeScenarioSummary("claim-smoke", summary);
    logStep(name, "complete");
    console.log(JSON.stringify(summary, null, 2));
  });
}

function logStep(name, message) {
  console.error(`[claim-smoke:${name}] ${message}`);
}
