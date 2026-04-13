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
const BIDDING_SMOKE_AUCTION_ID_PREFIXES = ["10-", "11-", "12-", "14-", "15-", "16-", "18-"];
const RELEASE_SMOKE_AUCTION_ID_PREFIXES = ["13-", "17-"];

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
      const targetAuction = await ensureAuctionReadyForOpeningBid(
        selectAvailableBiddingSmokeAuction(beforeFeed.auctions)
      );

      logStep(targetAuction.auctionId, "building and broadcasting the opening bid");
      const alphaBidderId = `${targetAuction.normalizedName}-alpha`;
      const alphaBidAmountSats = BigInt(targetAuction.currentRequiredMinimumBidSats ?? targetAuction.openingMinimumBidSats);
      const alphaBid = await buildAndMaybeBroadcastAuctionBid({
        outDir,
        fileStem: "alpha",
        auctionState: targetAuction,
        bidderId: alphaBidderId,
        ownerPubkey: owner.ownerPubkey,
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
      const betaBid = await buildAndMaybeBroadcastAuctionBid({
        outDir,
        fileStem: "beta",
        auctionState: alphaState,
        bidderId: betaBidderId,
        ownerPubkey: recipient.ownerPubkey,
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

      const settledState = await ensureAuctionSettled(finalState);
      const settledNameRecord = await fetchNameRecordByName(targetAuction.normalizedName);
      if (!settledNameRecord) {
        throw new Error(`expected ${targetAuction.normalizedName} to materialize as a live name after auction settlement`);
      }

      if (settledNameRecord.currentOwnerPubkey !== recipient.ownerPubkey) {
        throw new Error(`expected ${targetAuction.normalizedName} to be owned by the winning bidder pubkey`);
      }

      if (String(settledNameRecord.acquisitionKind ?? "") !== "auction") {
        throw new Error(`expected ${targetAuction.normalizedName} to be marked as auction-acquired`);
      }

      if (settledNameRecord.currentBondTxid !== betaBid.bidTxid) {
        throw new Error(`expected ${targetAuction.normalizedName} to anchor its live bond to the winning bid`);
      }

      const releaseTargetBefore = await ensureAuctionReadyForRelease(
        selectReleaseSmokeAuction(beforeFeed.auctions)
      );

      logStep(releaseTargetBefore.auctionId, "building a late bid before the no-bid release window closes");
      const releaseBidderId = `${releaseTargetBefore.normalizedName}-late`;
      const releaseBidAmountSats = BigInt(
        releaseTargetBefore.currentRequiredMinimumBidSats ?? releaseTargetBefore.openingMinimumBidSats
      );
      const lateBid = await buildAndMaybeBroadcastAuctionBid({
        outDir,
        fileStem: "release-late",
        auctionState: releaseTargetBefore,
        bidderId: releaseBidderId,
        ownerPubkey: owner.ownerPubkey,
        bidAmountSats: releaseBidAmountSats,
        fundingAddress: owner.fundingAddress,
        fundingWif: owner.fundingWif,
        rpcPassword,
        broadcastNow: false
      });

      const releasedState = await ensureAuctionReleasedToOrdinaryLane(releaseTargetBefore);

      logStep(releasedState.auctionId, "broadcasting the prebuilt late bid after the lot has released");
      const lateBidTxid = await broadcastSignedAuctionBid({
        signedPath: lateBid.signedPath,
        rpcPassword,
        expectedTxid: lateBid.bidTxid
      });

      const afterLateBidBlock = await getBlockCount();
      await mineBlocks(1);
      await waitForResolverHeight(afterLateBidBlock + 1);

      const releaseFinalState = await fetchExperimentalAuctionById(releasedState.auctionId);
      if (!releaseFinalState) {
        throw new Error(`missing released final state for ${releasedState.auctionId}`);
      }

      const lateBidOutcome =
        releaseFinalState.visibleBidOutcomes.find((outcome) => outcome.txid === lateBidTxid) ?? null;

      if (!lateBidOutcome || lateBidOutcome.reason !== "released_to_ordinary_lane") {
        throw new Error(`expected ${releasedState.auctionId} to reject the late bid after release`);
      }

      summary.status = "complete";
      summary.message =
        "Private signet experimental auction smoke succeeded with live bidding, early losing-bond enforcement, and no-bid release-valve rejection.";
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
      summary.settledState = settledState;
      summary.settledNameRecord = settledNameRecord;
      summary.highlight = {
        alphaBondSpendStatus: alphaOutcome.bondSpendStatus,
        alphaBondSpentTxid: alphaOutcome.bondSpentTxid,
        betaBondStatus: betaOutcome.bondStatus,
        betaBondSpendStatus: betaOutcome.bondSpendStatus,
        settledOwnerPubkey: settledNameRecord.currentOwnerPubkey
      };
      summary.releaseCheck = {
        auctionId: releaseTargetBefore.auctionId,
        title: releaseTargetBefore.title,
        normalizedName: releaseTargetBefore.normalizedName,
        unlockBlock: releaseTargetBefore.unlockBlock,
        noBidReleaseBlock: releaseTargetBefore.noBidReleaseBlock,
        preparedAtPhase: releaseTargetBefore.phase,
        lateBidAmountSats: releaseBidAmountSats.toString(),
        lateBidTxid,
        finalState: releaseFinalState,
        highlight: {
          releasePhase: releasedState.phase,
          lateBidReason: lateBidOutcome.reason,
          lateBidStatus: lateBidOutcome.status
        }
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

function selectAvailableBiddingSmokeAuction(auctions) {
  if (!Array.isArray(auctions)) {
    throw new Error("experimental auction feed is missing auctions");
  }

  const candidate = auctions.find((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    if (!BIDDING_SMOKE_AUCTION_ID_PREFIXES.some((prefix) => String(entry.auctionId ?? "").startsWith(prefix))) {
      return false;
    }

    if (entry.phase !== "awaiting_opening_bid" && entry.phase !== "pending_unlock") {
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

function selectReleaseSmokeAuction(auctions) {
  if (!Array.isArray(auctions)) {
    throw new Error("experimental auction feed is missing auctions");
  }

  const candidate = auctions.find((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    if (!RELEASE_SMOKE_AUCTION_ID_PREFIXES.some((prefix) => String(entry.auctionId ?? "").startsWith(prefix))) {
      return false;
    }

    if (entry.phase !== "awaiting_opening_bid" && entry.phase !== "pending_unlock") {
      return false;
    }

    return Number(entry.totalObservedBidCount ?? 0) === 0;
  });

  if (!candidate) {
    throw new Error("no dedicated private release smoke lot is available");
  }

  return candidate;
}

async function ensureAuctionReadyForOpeningBid(auctionState) {
  if (auctionState.phase === "awaiting_opening_bid") {
    return auctionState;
  }

  if (auctionState.phase !== "pending_unlock") {
    throw new Error(`expected ${auctionState.auctionId} to be pending unlock or awaiting opening bid`);
  }

  const blocksToMine = Math.max(1, auctionState.unlockBlock - auctionState.currentBlockHeight);
  logStep(auctionState.auctionId, `mining ${blocksToMine} block${blocksToMine === 1 ? "" : "s"} until unlock`);
  const currentHeight = await getBlockCount();
  await mineBlocks(blocksToMine);
  await waitForResolverHeight(currentHeight + blocksToMine);

  const refreshed = await fetchExperimentalAuctionById(auctionState.auctionId);
  if (!refreshed || refreshed.phase !== "awaiting_opening_bid") {
    throw new Error(`expected ${auctionState.auctionId} to reach awaiting_opening_bid after unlock`);
  }

  return refreshed;
}

async function ensureAuctionReadyForRelease(auctionState) {
  if (auctionState.phase === "released_to_ordinary_lane") {
    return auctionState;
  }

  return await ensureAuctionReadyForOpeningBid(auctionState);
}

async function ensureAuctionReleasedToOrdinaryLane(auctionState) {
  if (auctionState.phase === "released_to_ordinary_lane") {
    return auctionState;
  }

  if (auctionState.noBidReleaseBlock === null) {
    throw new Error(`expected ${auctionState.auctionId} to expose a no-bid release block`);
  }

  const blocksToMine = Math.max(1, auctionState.noBidReleaseBlock - auctionState.currentBlockHeight + 1);
  logStep(
    auctionState.auctionId,
    `mining ${blocksToMine} block${blocksToMine === 1 ? "" : "s"} to cross the no-bid release window`
  );
  const currentHeight = await getBlockCount();
  await mineBlocks(blocksToMine);
  await waitForResolverHeight(currentHeight + blocksToMine);

  const refreshed = await fetchExperimentalAuctionById(auctionState.auctionId);
  if (!refreshed || refreshed.phase !== "released_to_ordinary_lane") {
    throw new Error(`expected ${auctionState.auctionId} to release to the ordinary lane`);
  }

  return refreshed;
}

async function ensureAuctionSettled(auctionState) {
  if (auctionState.phase === "settled") {
    return auctionState;
  }

  if (auctionState.auctionCloseBlockAfter === null) {
    throw new Error(`expected ${auctionState.auctionId} to expose an auction close height`);
  }

  const blocksToMine = Math.max(1, auctionState.auctionCloseBlockAfter - auctionState.currentBlockHeight + 1);
  logStep(
    auctionState.auctionId,
    `mining ${blocksToMine} block${blocksToMine === 1 ? "" : "s"} to cross auction settlement`
  );
  const currentHeight = await getBlockCount();
  await mineBlocks(blocksToMine);
  await waitForResolverHeight(currentHeight + blocksToMine);

  const refreshed = await fetchExperimentalAuctionById(auctionState.auctionId);
  if (!refreshed || refreshed.phase !== "settled") {
    throw new Error(`expected ${auctionState.auctionId} to settle after the close window`);
  }

  return refreshed;
}

async function fetchNameRecordByName(name) {
  try {
    return await fetchJson(`${resolverUrl()}/name/${encodeURIComponent(name)}`);
  } catch (error) {
    if (error instanceof Error && /404/.test(error.message)) {
      return null;
    }

    throw error;
  }
}

async function buildAndMaybeBroadcastAuctionBid({
  outDir,
  fileStem,
  auctionState,
  bidderId,
  ownerPubkey,
  bidAmountSats,
  fundingAddress,
  fundingWif,
  rpcPassword,
  broadcastNow = true
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
    ownerPubkey,
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

  if (broadcastNow) {
    await broadcastSignedAuctionBid({
      signedPath,
      rpcPassword,
      expectedTxid: artifacts.bidTxid
    });
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

async function broadcastSignedAuctionBid({
  signedPath,
  rpcPassword,
  expectedTxid
}) {
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

  if (broadcast.broadcastedTxid !== expectedTxid) {
    throw new Error(`broadcast auction bid txid mismatch for ${expectedTxid}`);
  }

  return broadcast.broadcastedTxid;
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
