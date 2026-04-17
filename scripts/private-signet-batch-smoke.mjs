#!/usr/bin/env node

import {
  claimBatchNames,
  createClaimPackage,
  createScenarioName,
  giftTransferName,
  publishScenarioSummary,
  scenarioArtifactsDir,
  withPrivateSignetSession,
  writeScenarioSummary
} from "./private-signet-smoke-lib.mjs";

const REMOTE_STATUS_PATH =
  process.env.ONT_PRIVATE_SIGNET_BATCH_SMOKE_REMOTE_STATUS_PATH
  ?? "/var/lib/ont/private-batch-smoke-summary.json";
const PUBLISH_REMOTE_STATUS =
  (process.env.ONT_PRIVATE_SIGNET_BATCH_SMOKE_PUBLISH_REMOTE_STATUS ?? "1") !== "0";
const CONFIGURED_ALPHA_NAME =
  normalizeOptionalName(process.env.ONT_PRIVATE_SIGNET_BATCH_SMOKE_ALPHA_NAME);
const CONFIGURED_BETA_NAME =
  normalizeOptionalName(process.env.ONT_PRIVATE_SIGNET_BATCH_SMOKE_BETA_NAME);

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});

async function main() {
  const summary = {
    kind: "ont-private-signet-batch-smoke-summary",
    status: "running",
    message: "Starting private signet batched ordinary-claim smoke flow.",
    startedAt: new Date().toISOString()
  };

  await withPrivateSignetSession(async ({
    owner,
    recipient,
    pendingOwner,
    rpcPassword,
    resolverUrl,
    rpcUrl
  }) => {
    const alphaName = CONFIGURED_ALPHA_NAME ?? createScenarioName("pbta");
    const betaName = CONFIGURED_BETA_NAME ?? createScenarioName("pbtb");
    const outDir = scenarioArtifactsDir(`${alphaName}-batch-smoke`);
    const alphaClaimPath = `${outDir}/${alphaName}-claim.json`;
    const betaClaimPath = `${outDir}/${betaName}-claim.json`;

    try {
      logStep(alphaName, "building reveal-ready claim packages");
      const alphaClaim = await createClaimPackage({
        name: alphaName,
        account: owner,
        ownerPubkey: owner.ownerPubkey,
        bondDestination: owner.fundingAddress,
        changeDestination: owner.fundingAddress,
        writePath: alphaClaimPath
      });
      const betaClaim = await createClaimPackage({
        name: betaName,
        account: owner,
        ownerPubkey: recipient.ownerPubkey,
        bondDestination: owner.fundingAddress,
        changeDestination: owner.fundingAddress,
        writePath: betaClaimPath
      });

      logStep(alphaName, "claiming two names through one batch anchor");
      const batchClaimResult = await claimBatchNames({
        payerAccount: owner,
        claimPackagePaths: [alphaClaim.path, betaClaim.path],
        claimNames: [alphaName, betaName],
        rpcPassword,
        outDir
      });

      if (batchClaimResult.records[alphaName].status !== "immature" && batchClaimResult.records[alphaName].status !== "mature") {
        throw new Error(`expected ${alphaName} to be claimed after batch reveal`);
      }
      if (batchClaimResult.records[betaName].status !== "immature" && batchClaimResult.records[betaName].status !== "mature") {
        throw new Error(`expected ${betaName} to be claimed after batch reveal`);
      }

      logStep(alphaName, "transferring one batch-claimed name");
      const giftTransfer = await giftTransferName({
        nameRecord: batchClaimResult.records[alphaName],
        currentOwnerAccount: owner,
        newOwnerAccount: pendingOwner,
        rpcPassword,
        outDir: `${outDir}/${alphaName}-gift-transfer`
      });

      if (giftTransfer.record.currentOwnerPubkey !== pendingOwner.ownerPubkey) {
        throw new Error(`expected ${alphaName} to transfer to the pending owner`);
      }

      summary.status = "complete";
      summary.message =
        "Private signet batched ordinary-claim smoke succeeded with one batch anchor, two reveals, and one later gift transfer.";
      summary.completedAt = new Date().toISOString();
      summary.resolverUrl = resolverUrl;
      summary.rpcUrl = rpcUrl;
      summary.payerFundingAddress = owner.fundingAddress;
      summary.names = {
        alpha: alphaName,
        beta: betaName,
        transferredAlpha: alphaName
      };
      summary.batchCommitTxid = batchClaimResult.commitTxid;
      summary.revealTxids = batchClaimResult.revealTxids;
      summary.batchRecords = batchClaimResult.records;
      summary.transfer = {
        name: alphaName,
        transferTxid: giftTransfer.transferResult.transferTxid,
        newOwnerPubkey: pendingOwner.ownerPubkey,
        record: giftTransfer.record
      };
      summary.artifacts = {
        outDir,
        queuePath: batchClaimResult.queuePath,
        batchPackagesDir: batchClaimResult.batchPackagesDir,
        batchCommitArtifactsPath: batchClaimResult.batchCommitArtifactsPath,
        signedBatchCommitPath: batchClaimResult.signedBatchCommitPath,
        batchRevealArtifactPaths: batchClaimResult.batchRevealArtifactPaths
      };
    } catch (error) {
      summary.status = "error";
      summary.message = error instanceof Error ? error.message : String(error);
      summary.completedAt = new Date().toISOString();
      throw error;
    } finally {
      await writeScenarioSummary("batch-smoke", summary);
      if (PUBLISH_REMOTE_STATUS) {
        try {
          await publishScenarioSummary("batch-smoke", REMOTE_STATUS_PATH);
        } catch (error) {
          console.warn(
            error instanceof Error
              ? `warning: unable to publish private batch smoke summary to ${REMOTE_STATUS_PATH}: ${error.message}`
              : `warning: unable to publish private batch smoke summary to ${REMOTE_STATUS_PATH}`
          );
        }
      }
      console.log(JSON.stringify(summary, null, 2));
    }
  });
}

function logStep(name, message) {
  console.error(`[private-batch-smoke:${name}] ${message}`);
}

function normalizeOptionalName(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length === 0 ? null : normalized;
}
