#!/usr/bin/env node

import {
  claimName,
  cliJson,
  giftTransferName,
  postValueRecord,
  scenarioArtifactsDir,
  withPrivateSignetSession,
  writeScenarioSummary
} from "./private-signet-smoke-lib.mjs";

const DEMO_NAMES = {
  plain: "simpledemo",
  bundle: "bundledemo",
  transfer: "transferdemo"
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});

async function main() {
  await withPrivateSignetSession(async ({ owner, recipient, rpcPassword, resolverUrl }) => {
    const summary = {
      kind: "gns-private-signet-reseed-summary",
      startedAt: new Date().toISOString(),
      names: DEMO_NAMES,
      steps: []
    };

    logStep(DEMO_NAMES.plain, "claiming plain name");
    const plainClaim = await claimName({
      name: DEMO_NAMES.plain,
      account: owner,
      rpcPassword,
      outDir: scenarioArtifactsDir(DEMO_NAMES.plain)
    });
    summary.steps.push({ step: "claim_plain_name", result: plainClaim });

    logStep(DEMO_NAMES.bundle, "claiming bundle example");
    const bundleClaim = await claimName({
      name: DEMO_NAMES.bundle,
      account: owner,
      rpcPassword,
      outDir: scenarioArtifactsDir(DEMO_NAMES.bundle)
    });
    summary.steps.push({ step: "claim_bundle_name", result: bundleClaim });

    logStep(DEMO_NAMES.bundle, "publishing key/value pairs");
    const bundleValueRecord = await cliJson([
      "sign-value-record",
      "--name",
      DEMO_NAMES.bundle,
      "--owner-private-key-hex",
      owner.ownerPrivateKeyHex,
      "--sequence",
      "0",
      "--value-type",
      "255",
      "--payload-hex",
      encodeBundlePayloadHex([
        { key: "site", value: "https://example.com/bundledemo" },
        { key: "profile", value: "https://example.com/profiles/bundledemo" },
        { key: "profile", value: "https://example.net/bundledemo" },
        { key: "notes", value: "Example repeatable key/value pairs on the GNS demo network." }
      ]),
      "--write",
      `${scenarioArtifactsDir(DEMO_NAMES.bundle)}/${DEMO_NAMES.bundle}-bundle-value.json`
    ]);
    const bundlePublish = await postValueRecord(bundleValueRecord);
    if (bundlePublish.status !== 201 || bundlePublish.payload?.ok !== true) {
      throw new Error(`expected bundle value publish for ${DEMO_NAMES.bundle} to succeed`);
    }
    const bundleCurrentValue = await cliJson(["get-value", DEMO_NAMES.bundle, "--resolver-url", resolverUrl]);
    summary.steps.push({
      step: "publish_bundle_value",
      result: {
        publish: bundlePublish,
        currentValue: bundleCurrentValue
      }
    });

    logStep(DEMO_NAMES.transfer, "claiming transfer example");
    const transferClaim = await claimName({
      name: DEMO_NAMES.transfer,
      account: owner,
      rpcPassword,
      outDir: scenarioArtifactsDir(DEMO_NAMES.transfer)
    });
    summary.steps.push({ step: "claim_transfer_name", result: transferClaim });

    logStep(DEMO_NAMES.transfer, "transferring owner authority");
    const transferResult = await giftTransferName({
      nameRecord: transferClaim.record,
      currentOwnerAccount: owner,
      newOwnerAccount: recipient,
      rpcPassword,
      outDir: scenarioArtifactsDir(`${DEMO_NAMES.transfer}-transfer`)
    });
    summary.steps.push({ step: "gift_transfer", result: transferResult });

    logStep(DEMO_NAMES.transfer, "verifying old owner cannot publish");
    const staleTransferValue = await cliJson([
      "sign-value-record",
      "--name",
      DEMO_NAMES.transfer,
      "--owner-private-key-hex",
      owner.ownerPrivateKeyHex,
      "--sequence",
      "0",
      "--value-type",
      "255",
      "--payload-hex",
      encodeBundlePayloadHex([
        { key: "notes", value: "This publish should be rejected because the owner changed." }
      ]),
      "--write",
      `${scenarioArtifactsDir(DEMO_NAMES.transfer)}/${DEMO_NAMES.transfer}-old-owner-value.json`
    ]);
    const staleTransferPublish = await postValueRecord(staleTransferValue);
    if (staleTransferPublish.status !== 409 || staleTransferPublish.payload?.error !== "owner_mismatch") {
      throw new Error(`expected old owner value publish for ${DEMO_NAMES.transfer} to fail with owner_mismatch`);
    }
    summary.steps.push({ step: "old_owner_rejected", result: staleTransferPublish });

    logStep(DEMO_NAMES.transfer, "publishing new owner bundle");
    const transferRecipientValue = await cliJson([
      "sign-value-record",
      "--name",
      DEMO_NAMES.transfer,
      "--owner-private-key-hex",
      recipient.ownerPrivateKeyHex,
      "--sequence",
      "0",
      "--value-type",
      "255",
      "--payload-hex",
      encodeBundlePayloadHex([
        { key: "site", value: "https://example.com/transferdemo" },
        { key: "notes", value: "Ownership moved to the recipient key." }
      ]),
      "--write",
      `${scenarioArtifactsDir(DEMO_NAMES.transfer)}/${DEMO_NAMES.transfer}-new-owner-value.json`
    ]);
    const transferRecipientPublish = await postValueRecord(transferRecipientValue);
    if (transferRecipientPublish.status !== 201 || transferRecipientPublish.payload?.ok !== true) {
      throw new Error(`expected recipient value publish for ${DEMO_NAMES.transfer} to succeed`);
    }
    const transferCurrentValue = await cliJson(["get-value", DEMO_NAMES.transfer, "--resolver-url", resolverUrl]);
    summary.steps.push({
      step: "new_owner_published",
      result: {
        publish: transferRecipientPublish,
        currentValue: transferCurrentValue
      }
    });

    summary.finalRecords = {
      plain: await cliJson(["get-name", DEMO_NAMES.plain, "--resolver-url", resolverUrl]),
      bundle: await cliJson(["get-name", DEMO_NAMES.bundle, "--resolver-url", resolverUrl]),
      transfer: await cliJson(["get-name", DEMO_NAMES.transfer, "--resolver-url", resolverUrl]),
      bundleValue: bundleCurrentValue,
      transferValue: transferCurrentValue
    };
    summary.completedAt = new Date().toISOString();

    await writeScenarioSummary("reseed-demo", summary);
    logStep("demo", "complete");
    console.log(JSON.stringify(summary, null, 2));
  });
}

function encodeBundlePayloadHex(entries) {
  const payload = {
    kind: "gns-key-value-bundle",
    version: 1,
    entries
  };
  return Buffer.from(JSON.stringify(payload, null, 2), "utf8").toString("hex");
}

function logStep(name, message) {
  console.error(`[reseed:${name}] ${message}`);
}
