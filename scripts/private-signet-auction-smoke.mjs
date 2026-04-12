#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createAuctionBidPackage } from "@gns/protocol";

import {
  cliJson,
  fetchJson,
  formatDescriptor,
  fundAddress,
  getBlockCount,
  localRpcUrl,
  mineBlocks,
  publishScenarioSummary,
  resolverUrl,
  rpcCall,
  satsToBtcString,
  scenarioArtifactsDir,
  waitForResolverHeight,
  withPrivateSignetSession,
  writeScenarioSummary
} from "./private-signet-smoke-lib.mjs";

const BID_FEE_SATS = 1_000n;
const EARLY_SPEND_FEE_SATS = 1_000n;
const FUNDING_PADDING_SATS = 20_000n;
const REMOTE_STATUS_PATH =
  process.env.GNS_PRIVATE_SIGNET_AUCTION_SMOKE_REMOTE_STATUS_PATH
  ?? "/var/lib/gns/private-auction-smoke-summary.json";
const PUBLISH_REMOTE_STATUS =
  (process.env.GNS_PRIVATE_SIGNET_AUCTION_SMOKE_PUBLISH_REMOTE_STATUS ?? "1") !== "0";
const SMOKE_AUCTION_ID_PREFIXES = ["10-", "11-", "12-"];

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});

async function main() {
  const summary = {
    kind: "gns-private-signet-auction-smoke-summary",
    status: "running",
    message: "Starting private signet experimental reserved-auction smoke flow.",
    startedAt: new Date().toISOString()
  };

  await withPrivateSignetSession(async ({
    owner,
    recipient,
    rpcPassword,
    resolverUrl: privateResolverUrl,
    rpcUrl
  }) => {
    const outDir = scenarioArtifactsDir("auction-smoke");
    await mkdir(outDir, { recursive: true });

    try {
      const beforeFeed = await fetchExperimentalAuctionFeed();
      const targetAuction = selectAvailableSmokeAuction(beforeFeed.auctions);

      logStep(targetAuction.auctionId, "building and broadcasting the opening bid");
      const alphaBidderId = `${targetAuction.normalizedName}-alpha`;
      const alphaBidAmountSats = BigInt(targetAuction.currentRequiredMinimumBidSats ?? targetAuction.openingMinimumBidSats);
      const alphaBid = await buildAndBroadcastAuctionBid({
        outDir,
        fileStem: "alpha",
        auctionState: targetAuction,
        bidderId: alphaBidderId,
        bidAmountSats: alphaBidAmountSats,
        fundingAddress: owner.fundingAddress,
        fundingWif: owner.fundingWif,
        rpcPassword
      });

      const afterAlphaBlock = await getBlockCount();
      await mineBlocks(1);
      await waitForResolverHeight(afterAlphaBlock + 1);

      const alphaState = await fetchExperimentalAuctionById(targetAuction.auctionId);
      if (!alphaState || alphaState.acceptedBidCount < 1) {
        throw new Error(`expected ${targetAuction.auctionId} to record the opening bid`);
      }

      logStep(targetAuction.auctionId, "building and broadcasting the higher bid");
      const betaBidderId = `${targetAuction.normalizedName}-beta`;
      const betaBidAmountSats = BigInt(alphaState.currentRequiredMinimumBidSats ?? alphaState.openingMinimumBidSats);
      const betaBid = await buildAndBroadcastAuctionBid({
        outDir,
        fileStem: "beta",
        auctionState: alphaState,
        bidderId: betaBidderId,
        bidAmountSats: betaBidAmountSats,
        fundingAddress: recipient.fundingAddress,
        fundingWif: recipient.fundingWif,
        rpcPassword
      });

      const afterBetaBlock = await getBlockCount();
      await mineBlocks(1);
      await waitForResolverHeight(afterBetaBlock + 1);

      const betaState = await fetchExperimentalAuctionById(targetAuction.auctionId);
      if (!betaState || betaState.acceptedBidCount < 2) {
        throw new Error(`expected ${targetAuction.auctionId} to record the higher bid`);
      }

      logStep(targetAuction.auctionId, "spending the losing bond early to verify enforcement reporting");
      const earlySpendTxid = await spendBidBondWithRpc({
        bidTxid: alphaBid.bidTxid,
        bidBondVout: alphaBid.bondVout,
        bidBondValueSats: alphaBidAmountSats,
        destinationAddress: owner.fundingAddress,
        signingWif: owner.fundingWif
      });

      const afterSpendBlock = await getBlockCount();
      await mineBlocks(1);
      await waitForResolverHeight(afterSpendBlock + 1);

      const finalState = await fetchExperimentalAuctionById(targetAuction.auctionId);
      if (!finalState) {
        throw new Error(`missing final state for ${targetAuction.auctionId}`);
      }

      const alphaOutcome = finalState.visibleBidOutcomes.find((outcome) => outcome.txid === alphaBid.bidTxid) ?? null;
      const betaOutcome = finalState.visibleBidOutcomes.find((outcome) => outcome.txid === betaBid.bidTxid) ?? null;

      if (!alphaOutcome || alphaOutcome.bondSpendStatus !== "spent_before_allowed_release") {
        throw new Error(`expected ${targetAuction.auctionId} to flag the first bid bond as spent_before_allowed_release`);
      }

      if (!betaOutcome || betaOutcome.status !== "accepted") {
        throw new Error(`expected ${targetAuction.auctionId} to keep the higher bid accepted`);
      }

      summary.status = "complete";
      summary.message =
        "Private signet experimental auction smoke succeeded with one opening bid, one higher bid, and one early losing-bond spend.";
      summary.completedAt = new Date().toISOString();
      summary.resolverUrl = privateResolverUrl;
      summary.rpcUrl = rpcUrl;
      summary.auction = {
        auctionId: targetAuction.auctionId,
        title: targetAuction.title,
        normalizedName: targetAuction.normalizedName,
        reservedClassId: targetAuction.reservedClassId,
        unlockBlock: targetAuction.unlockBlock
      };
      summary.alphaBid = alphaBid;
      summary.betaBid = betaBid;
      summary.earlySpendTxid = earlySpendTxid;
      summary.finalState = finalState;
      summary.highlight = {
        alphaBondSpendStatus: alphaOutcome.bondSpendStatus,
        alphaBondSpentTxid: alphaOutcome.bondSpentTxid,
        betaBondStatus: betaOutcome.bondStatus,
        betaBondSpendStatus: betaOutcome.bondSpendStatus
      };
    } catch (error) {
      summary.status = "error";
      summary.message = error instanceof Error ? error.message : String(error);
      summary.completedAt = new Date().toISOString();
      throw error;
    } finally {
      await writeScenarioSummary("auction-smoke", summary);
      if (PUBLISH_REMOTE_STATUS) {
        try {
          await publishScenarioSummary("auction-smoke", REMOTE_STATUS_PATH);
        } catch (error) {
          console.warn(
            error instanceof Error
              ? `warning: unable to publish private auction smoke summary to ${REMOTE_STATUS_PATH}: ${error.message}`
              : `warning: unable to publish private auction smoke summary to ${REMOTE_STATUS_PATH}`
          );
        }
      }
      console.log(JSON.stringify(summary, null, 2));
    }
  });
}

async function fetchExperimentalAuctionFeed() {
  return await fetchJson(`${resolverUrl()}/experimental-auctions`);
}

async function fetchExperimentalAuctionById(auctionId) {
  const feed = await fetchExperimentalAuctionFeed();
  return feed.auctions.find((entry) => entry.auctionId === auctionId) ?? null;
}

function selectAvailableSmokeAuction(auctions) {
  if (!Array.isArray(auctions)) {
    throw new Error("experimental auction feed is missing auctions");
  }

  const candidate = auctions.find((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    if (!SMOKE_AUCTION_ID_PREFIXES.some((prefix) => String(entry.auctionId ?? "").startsWith(prefix))) {
      return false;
    }

    if (entry.phase !== "awaiting_opening_bid") {
      return false;
    }

    return Number(entry.totalObservedBidCount ?? 0) === 0;
  });

  if (!candidate) {
    throw new Error(
      "no empty private auction smoke lot is available; reset or reseed private signet to free one of the dedicated smoke lots"
    );
  }

  return candidate;
}

async function buildAndBroadcastAuctionBid({
  outDir,
  fileStem,
  auctionState,
  bidderId,
  bidAmountSats,
  fundingAddress,
  fundingWif,
  rpcPassword
}) {
  const packagePath = join(outDir, `${fileStem}-auction-bid-package.json`);
  const artifactsPath = join(outDir, `${fileStem}-auction-bid-artifacts.json`);
  const signedPath = join(outDir, `${fileStem}-signed-auction-bid-artifacts.json`);
  const bidPackage = createAuctionBidPackage({
    auctionId: auctionState.auctionId,
    name: auctionState.normalizedName,
    reservedClassId: auctionState.reservedClassId,
    classLabel: auctionState.classLabel,
    currentBlockHeight: auctionState.currentBlockHeight,
    phase: auctionState.phase,
    unlockBlock: auctionState.unlockBlock,
    auctionCloseBlockAfter: auctionState.auctionCloseBlockAfter,
    openingMinimumBidSats: auctionState.openingMinimumBidSats,
    currentLeaderBidderCommitment: auctionState.currentLeaderBidderCommitment,
    currentHighestBidSats: auctionState.currentHighestBidSats,
    currentRequiredMinimumBidSats: auctionState.currentRequiredMinimumBidSats,
    reservedLockBlocks: auctionState.reservedLockBlocks,
    blocksUntilUnlock: auctionState.blocksUntilUnlock,
    blocksUntilClose: auctionState.blocksUntilClose,
    bidderId,
    bidAmountSats
  });
  await writeJsonFile(packagePath, bidPackage);

  const fundingInput = await fundAddress(
    fundingAddress,
    bidAmountSats + BID_FEE_SATS + FUNDING_PADDING_SATS
  );
  const artifacts = await cliJson([
    "build-auction-bid-artifacts",
    packagePath,
    "--input",
    formatDescriptor(fundingInput),
    "--fee-sats",
    BID_FEE_SATS.toString(),
    "--network",
    "signet",
    "--bond-address",
    fundingAddress,
    "--change-address",
    fundingAddress,
    "--write",
    artifactsPath
  ]);
  const signed = await cliJson([
    "sign-artifacts",
    artifactsPath,
    "--wif",
    fundingWif,
    "--write",
    signedPath
  ]);

  if (signed.signedTransactionId !== artifacts.bidTxid) {
    throw new Error(`signed auction bid txid mismatch for ${auctionState.auctionId}`);
  }

  const broadcast = await cliJson([
    "broadcast-transaction",
    signedPath,
    "--rpc-url",
    localRpcUrl(),
    "--rpc-username",
    "gnsrpcprivate",
    "--rpc-password",
    rpcPassword,
    "--expected-chain",
    "signet"
  ]);

  if (broadcast.broadcastedTxid !== artifacts.bidTxid) {
    throw new Error(`broadcast auction bid txid mismatch for ${auctionState.auctionId}`);
  }

  return {
    bidderId,
    bidAmountSats: bidAmountSats.toString(),
    bidTxid: artifacts.bidTxid,
    bondVout: artifacts.bondVout,
    auctionStateCommitment: bidPackage.auctionStateCommitment,
    bidderCommitment: bidPackage.bidderCommitment,
    packagePath,
    artifactsPath,
    signedPath
  };
}

async function spendBidBondWithRpc({
  bidTxid,
  bidBondVout,
  bidBondValueSats,
  destinationAddress,
  signingWif
}) {
  if (bidBondValueSats <= EARLY_SPEND_FEE_SATS) {
    throw new Error("bid bond value is too small to spend after fee");
  }

  const transaction = await rpcCall("getrawtransaction", [bidTxid, true]);
  const output = Array.isArray(transaction?.vout)
    ? transaction.vout.find((entry) => entry?.n === bidBondVout)
    : null;

  if (!output?.scriptPubKey?.hex) {
    throw new Error(`missing scriptPubKey for bid bond ${bidTxid}:${bidBondVout}`);
  }

  const rawTransactionHex = await rpcCall("createrawtransaction", [
    [
      {
        txid: bidTxid,
        vout: bidBondVout
      }
    ],
    {
      [destinationAddress]: Number(satsToBtcString(bidBondValueSats - EARLY_SPEND_FEE_SATS))
    }
  ]);

  const signed = await rpcCall("signrawtransactionwithkey", [
    rawTransactionHex,
    [signingWif],
    [
      {
        txid: bidTxid,
        vout: bidBondVout,
        scriptPubKey: output.scriptPubKey.hex,
        amount: Number(satsToBtcString(bidBondValueSats))
      }
    ]
  ]);

  if (signed.complete !== true || typeof signed.hex !== "string" || signed.hex.length === 0) {
    throw new Error(`unable to sign early-spend transaction for ${bidTxid}:${bidBondVout}`);
  }

  return await rpcCall("sendrawtransaction", [signed.hex]);
}

async function writeJsonFile(path, value) {
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function logStep(auctionId, message) {
  console.error(`[private-auction-smoke:${auctionId}] ${message}`);
}
