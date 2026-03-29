#!/usr/bin/env node

import {
  claimName,
  cliJson,
  createScenarioName,
  giftTransferName,
  postValueRecord,
  scenarioArtifactsDir,
  withPrivateSignetSession,
  writeScenarioSummary
} from "./private-signet-smoke-lib.mjs";

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});

async function main() {
  await withPrivateSignetSession(async ({ owner, recipient, rpcPassword, resolverUrl }) => {
    const name = createScenarioName("pval");
    logStep(name, "claiming name");
    const summary = {
      kind: "gns-private-signet-value-handoff-smoke-summary",
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

    logStep(name, "transferring to recipient");
    const transferResult = await giftTransferName({
      nameRecord: claimResult.record,
      currentOwnerAccount: owner,
      newOwnerAccount: recipient,
      rpcPassword,
      outDir: scenarioArtifactsDir(`${name}-transfer`)
    });
    summary.steps.push({ step: "gift_transfer", result: transferResult });

    logStep(name, "verifying old owner is rejected");
    const staleValue = await cliJson([
      "sign-value-record",
      "--name",
      name,
      "--owner-private-key-hex",
      owner.ownerPrivateKeyHex,
      "--sequence",
      "1",
      "--value-type",
      "2",
      "--payload-utf8",
      `https://example.invalid/${name}/stale-owner`,
      "--write",
      `${scenarioArtifactsDir(name)}/${name}-old-owner-value.json`
    ]);
    const stalePublish = await postValueRecord(staleValue);
    if (stalePublish.status !== 409 || stalePublish.payload?.error !== "owner_mismatch") {
      throw new Error(`expected old owner value publish for ${name} to fail with owner_mismatch`);
    }
    summary.steps.push({ step: "old_owner_rejected", result: stalePublish });

    logStep(name, "confirming no current value before recipient publish");
    const currentValueBeforeRecipient = await fetch(`${resolverUrl}/name/${encodeURIComponent(name)}/value`)
      .then(async (response) => {
        const raw = await response.text();
        if (response.status === 404) {
          return null;
        }
        return raw.length === 0 ? null : JSON.parse(raw);
      });
    if (currentValueBeforeRecipient !== null) {
      throw new Error(`expected ${name} to have no current value before recipient publish`);
    }

    logStep(name, "publishing recipient value");
    const recipientValue = await cliJson([
      "sign-value-record",
      "--name",
      name,
      "--owner-private-key-hex",
      recipient.ownerPrivateKeyHex,
      "--sequence",
      "0",
      "--value-type",
      "2",
      "--payload-utf8",
      `https://example.invalid/${name}/recipient-owner`,
      "--write",
      `${scenarioArtifactsDir(name)}/${name}-new-owner-value.json`
    ]);
    const recipientPublish = await postValueRecord(recipientValue);
    if (recipientPublish.status !== 201 || recipientPublish.payload?.ok !== true) {
      throw new Error(`expected recipient value publish for ${name} to succeed`);
    }

    logStep(name, "checking resolver serves recipient value");
    const currentValue = await cliJson(["get-value", name, "--resolver-url", resolverUrl]);
    if (currentValue.ownerPubkey !== recipient.ownerPubkey) {
      throw new Error(`expected ${name} current value owner to match recipient after transfer`);
    }

    summary.steps.push({
      step: "new_owner_published",
      result: {
        publish: recipientPublish,
        currentValue
      }
    });
    summary.completedAt = new Date().toISOString();

    await writeScenarioSummary("value-handoff-smoke", summary);
    logStep(name, "complete");
    console.log(JSON.stringify(summary, null, 2));
  });
}

function logStep(name, message) {
  console.error(`[value-handoff-smoke:${name}] ${message}`);
}
