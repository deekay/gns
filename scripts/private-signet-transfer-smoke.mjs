#!/usr/bin/env node

import {
  claimName,
  cliJson,
  createScenarioName,
  giftTransferName,
  immatureSaleTransferName,
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
    const giftName = createScenarioName("pgft");
    const saleName = createScenarioName("psal");
    logStep(giftName, "claiming gift-flow name");
    const summary = {
      kind: "gns-private-signet-transfer-smoke-summary",
      startedAt: new Date().toISOString(),
      names: {
        gift: giftName,
        immatureSale: saleName
      },
      steps: []
    };

    const giftClaim = await claimName({
      name: giftName,
      account: owner,
      rpcPassword,
      outDir: scenarioArtifactsDir(giftName)
    });
    summary.steps.push({ step: "claim_gift_name", result: giftClaim });

    logStep(giftName, "submitting gift transfer");
    const giftTransfer = await giftTransferName({
      nameRecord: giftClaim.record,
      currentOwnerAccount: owner,
      newOwnerAccount: recipient,
      rpcPassword,
      outDir: scenarioArtifactsDir(`${giftName}-transfer`)
    });
    if (giftTransfer.record.currentOwnerPubkey !== recipient.ownerPubkey) {
      throw new Error(`expected ${giftName} owner to change after gift transfer`);
    }
    summary.steps.push({ step: "gift_transfer", result: giftTransfer });

    logStep(saleName, "claiming immature-sale name");
    const saleClaim = await claimName({
      name: saleName,
      account: owner,
      rpcPassword,
      outDir: scenarioArtifactsDir(saleName)
    });
    summary.steps.push({ step: "claim_sale_name", result: saleClaim });

    logStep(saleName, "submitting immature sale transfer");
    const immatureSale = await immatureSaleTransferName({
      nameRecord: saleClaim.record,
      sellerAccount: owner,
      buyerAccount: recipient,
      rpcPassword,
      outDir: scenarioArtifactsDir(`${saleName}-sale`)
    });
    if (immatureSale.record.currentOwnerPubkey !== recipient.ownerPubkey) {
      throw new Error(`expected ${saleName} owner to change after immature sale transfer`);
    }
    summary.steps.push({ step: "immature_sale_transfer", result: immatureSale });

    summary.finalGift = await cliJson(["get-name", giftName, "--resolver-url", resolverUrl]);
    summary.finalImmatureSale = await cliJson(["get-name", saleName, "--resolver-url", resolverUrl]);
    summary.completedAt = new Date().toISOString();

    await writeScenarioSummary("transfer-smoke", summary);
    logStep(`${giftName}/${saleName}`, "complete");
    console.log(JSON.stringify(summary, null, 2));
  });
}

function logStep(name, message) {
  console.error(`[transfer-smoke:${name}] ${message}`);
}
