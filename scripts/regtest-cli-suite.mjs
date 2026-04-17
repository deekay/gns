#!/usr/bin/env node

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import os from "node:os";
import { Psbt, networks } from "bitcoinjs-lib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SSH_TARGET = process.env.ONT_REGTEST_SSH_TARGET ?? process.env.ONT_SSH_TARGET ?? "";
const SSH_KEY = process.env.ONT_REGTEST_SSH_KEY ?? process.env.ONT_SSH_KEY ?? "";
const RPC_USER = process.env.ONT_REGTEST_RPC_USERNAME ?? "gnsregtest";
const RPC_PASSWORD = process.env.ONT_REGTEST_RPC_PASSWORD ?? "gnsregtestpass";
const LOCAL_RPC_PORT = Number.parseInt(process.env.ONT_REGTEST_LOCAL_RPC_PORT ?? "38443", 10);
const REMOTE_RPC_PORT = Number.parseInt(process.env.ONT_REGTEST_REMOTE_RPC_PORT ?? "18443", 10);
const RESOLVER_PORT = Number.parseInt(process.env.ONT_REGTEST_RESOLVER_PORT ?? "8793", 10);
const POLL_INTERVAL_MS = 250;
const TUNNEL_SOCKET = process.env.ONT_REGTEST_TUNNEL_SOCKET ?? "/tmp/ont-regtest-vps-rpc.sock";
const REMOTE_CONF = "/etc/bitcoin-regtest-ont.conf";
const REMOTE_DATADIR = "/var/lib/bitcoind-regtest-ont";
const REMOTE_WALLET = "ont-e2e";
const BASE_REGTEST_BLOCKS = 110;
const TEST_INITIAL_MATURITY_BLOCKS = Number.parseInt(
  process.env.ONT_REGTEST_TEST_INITIAL_MATURITY_BLOCKS ?? "32",
  10
);
const MATURITY_BLOCKS = TEST_INITIAL_MATURITY_BLOCKS;
const COMMIT_FEE_SATS = 1_000n;
const REVEAL_FEE_SATS = 500n;
const TRANSFER_FEE_SATS = 1_000n;
const VALUE_TYPE_HTTPS = 0x02;
const TSX_BIN = resolve(ROOT, "node_modules/.bin/tsx");
const CLI_ENTRY = "apps/cli/src/index.ts";
const RESOLVER_ENTRY = "apps/resolver/src/index.ts";
const MINE_BATCH_SIZE = 1_000;
const AUCTION_FIXTURE_DIR = resolve(ROOT, "fixtures/auction/regtest-lab");
const REGTEST_AUCTION_ID = "10-regtest-openai-major";
const REGTEST_AUCTION_BASE_WINDOW_BLOCKS = 6;
const REGTEST_AUCTION_SOFT_CLOSE_EXTENSION_BLOCKS = 2;
const REGTEST_AUCTION_NO_BID_RELEASE_BLOCKS = 5;
const REGTEST_AUCTION_MAJOR_LOCK_BLOCKS = 6;
const AUCTION_BID_FEE_SATS = 1_000n;
const AUCTION_BID_FUNDING_PADDING_SATS = 20_000n;

const suiteState = {
  artifactDir: "",
  resolverProcess: null
};

void main().catch(async (error) => {
  console.error("");
  console.error("Regtest CLI suite failed.");
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  await cleanup();
  process.exit(1);
});

async function main() {
  ensureSshConfig();
  suiteState.artifactDir = await mkdtemp(join(tmpdir(), "ont-regtest-suite-"));
  log(`Artifacts: ${suiteState.artifactDir}`);

  await ensureBuild();
  await resetRemoteRegtestNode();
  await openTunnel();

  try {
    await checkRpc();
    await bootstrapWallet();
    await startResolver();

    const summary = {
      rpc: {},
      names: {},
      auctions: {},
      failures: {},
      values: {}
    };

    const missingName = "suitefresh0001";
    const claimedName = "suiteclaim0001";
    const batchAlphaName = "suitebatcha01";
    const batchBetaName = "suitebatchb01";
    const invalidBatchRevealName = "suitebatchbad01";
    const invalidBatchCompanionName = "suitebatchpad01";
    const staleRevealName = "suitestale0001";
    const invalidTransferName = "suitebreak0001";
    const immatureSaleName = "suiteimmsale01";
    const matureSaleName = "suitesale0001";

    await expectFreshAvailability(missingName);
    await expectInvalidNameFeedback();
    await expectMissingNameFeedback(missingName);

    const auctionLifecycle = await runAuctionLifecycleScenario();
    summary.auctions[REGTEST_AUCTION_ID] = auctionLifecycle;

    const insufficientAccount = await createLiveAccount("insufficient-account");
    const insufficientClaim = await createClaimPackage({
      account: insufficientAccount,
      name: "suiteinsufficient1",
      fileLabel: "insufficient-claim"
    });
    const insufficientUtxo = await fundAddress(insufficientAccount.fundingAddress, 40_000n);
    const insufficientClaimResult = await runCli(
      [
        "submit-claim",
        insufficientClaim.path,
        "--commit-input",
        formatDescriptor(insufficientUtxo),
        "--commit-fee-sats",
        COMMIT_FEE_SATS.toString(),
        "--reveal-fee-sats",
        REVEAL_FEE_SATS.toString(),
        "--wif",
        insufficientAccount.fundingWif,
        "--network",
        "regtest",
        "--expected-chain",
        "regtest",
        "--bond-address",
        insufficientAccount.fundingAddress,
        "--commit-change-address",
        insufficientAccount.fundingAddress,
        "--reveal-change-address",
        insufficientAccount.fundingAddress,
        "--out-dir",
        join(suiteState.artifactDir, "insufficient-attempt")
      ],
      {
        expectExitCode: 1
      }
    );
    assertContains(
      `${insufficientClaimResult.stdout}\n${insufficientClaimResult.stderr}`,
      "funding inputs do not cover the required bond and fee",
      "insufficient-funds feedback"
    );
    summary.failures.insufficientBond = "ok";

    const primaryOwner = await createLiveAccount("primary-owner");
    const primaryClaim = await createClaimPackage({
      account: primaryOwner,
      name: claimedName,
      fileLabel: "primary-claim"
    });
    const primaryClaimResult = await claimName({
      label: "primary-claim",
      account: primaryOwner,
      claimPackagePath: primaryClaim.path
    });
    summary.names[claimedName] = {
      commitTxid: primaryClaimResult.commitTxid,
      revealTxid: primaryClaimResult.revealTxid
    };

    const claimPlanAfterClaim = await cliJson([
      "claim-plan",
      claimedName,
      "--resolver-url",
      resolverUrl()
    ]);
    assertEqual(claimPlanAfterClaim.appearsAvailable, false, "claimed-name availability");
    assertContains(claimPlanAfterClaim.availabilityNote, "already visible", "claimed-name note");

    const duplicateOwner = await createLiveAccount("duplicate-owner");
    const duplicateClaim = await createClaimPackage({
      account: duplicateOwner,
      name: claimedName,
      fileLabel: "duplicate-claim"
    });
    const duplicateClaimResult = await claimName({
      label: "duplicate-claim",
      account: duplicateOwner,
      claimPackagePath: duplicateClaim.path
    });
    const claimedRecordAfterDuplicate = await cliJson([
      "get-name",
      claimedName,
      "--resolver-url",
      resolverUrl()
    ]);
    assertEqual(
      claimedRecordAfterDuplicate.currentOwnerPubkey,
      primaryOwner.ownerPubkey,
      "duplicate claim does not overtake winner"
    );
    summary.names[`${claimedName}-duplicateAttempt`] = {
      commitTxid: duplicateClaimResult.commitTxid,
      revealTxid: duplicateClaimResult.revealTxid
    };

    const batchPayer = await createLiveAccount("batch-payer");
    const batchOwnerAlpha = await createLiveAccount("batch-owner-alpha");
    const batchOwnerBeta = await createLiveAccount("batch-owner-beta");
    const batchGiftRecipient = await createLiveAccount("batch-gift-recipient");
    const batchAlphaClaim = await createClaimPackage({
      account: batchPayer,
      ownerPubkey: batchOwnerAlpha.ownerPubkey,
      bondDestination: batchPayer.fundingAddress,
      changeDestination: batchPayer.fundingAddress,
      name: batchAlphaName,
      fileLabel: "batch-alpha-claim"
    });
    const batchBetaClaim = await createClaimPackage({
      account: batchPayer,
      ownerPubkey: batchOwnerBeta.ownerPubkey,
      bondDestination: batchPayer.fundingAddress,
      changeDestination: batchPayer.fundingAddress,
      name: batchBetaName,
      fileLabel: "batch-beta-claim"
    });
    const batchClaimResult = await claimBatchNames({
      label: "batch-claim",
      payer: batchPayer,
      claimPackagePaths: [batchAlphaClaim.path, batchBetaClaim.path],
      claimNames: [batchAlphaName, batchBetaName]
    });
    summary.names[batchAlphaName] = {
      commitTxid: batchClaimResult.commitTxid,
      revealTxid: batchClaimResult.revealTxids[batchAlphaName]
    };
    summary.names[batchBetaName] = {
      commitTxid: batchClaimResult.commitTxid,
      revealTxid: batchClaimResult.revealTxids[batchBetaName]
    };
    const batchTransferFeeUtxo = await fundAddress(batchPayer.fundingAddress, 10_000n);
    const batchGiftTransfer = await cliJson([
      "submit-transfer",
      "--prev-state-txid",
      batchClaimResult.revealTxids[batchAlphaName],
      "--new-owner-pubkey",
      batchGiftRecipient.ownerPubkey,
      "--owner-private-key-hex",
      batchOwnerAlpha.ownerPrivateKeyHex,
      "--bond-input",
      formatDescriptor({
        txid: batchClaimResult.commitTxid,
        vout: 1,
        valueSats: 50_000n,
        address: batchPayer.fundingAddress
      }),
      "--input",
      formatDescriptor(batchTransferFeeUtxo),
      "--successor-bond-vout",
      "0",
      "--successor-bond-sats",
      "50000",
      "--fee-sats",
      TRANSFER_FEE_SATS.toString(),
      "--bond-address",
      batchGiftRecipient.fundingAddress,
      "--change-address",
      batchPayer.fundingAddress,
      "--wif",
      batchPayer.fundingWif,
      "--network",
      "regtest",
      "--expected-chain",
      "regtest",
      "--out-dir",
      join(suiteState.artifactDir, "batch-gift-transfer")
    ]);
    await mineBlocks(1, "confirm-batch-gift-transfer");
    await waitForResolverHeight(await rpcCall("getblockcount"));
    const batchGiftedRecord = await cliJson([
      "get-name",
      batchAlphaName,
      "--resolver-url",
      resolverUrl()
    ]);
    assertEqual(
      batchGiftedRecord.currentOwnerPubkey,
      batchGiftRecipient.ownerPubkey,
      "batch-claimed name gift transfer owner"
    );
    assertEqual(
      batchGiftedRecord.currentBondTxid,
      batchGiftTransfer.transferTxid,
      "batch-claimed name gift transfer bond txid"
    );
    summary.names[`${batchAlphaName}-giftTransfer`] = {
      prevRevealTxid: batchClaimResult.revealTxids[batchAlphaName],
      transferTxid: batchGiftTransfer.transferTxid
    };

    const batchInvalidPayer = await createLiveAccount("batch-invalid-payer");
    const batchInvalidOwner = await createLiveAccount("batch-invalid-owner");
    const batchInvalidClaim = await createClaimPackage({
      account: batchInvalidPayer,
      ownerPubkey: batchInvalidOwner.ownerPubkey,
      bondDestination: batchInvalidPayer.fundingAddress,
      changeDestination: batchInvalidPayer.fundingAddress,
      name: invalidBatchRevealName,
      fileLabel: "batch-invalid-claim"
    });
    const batchInvalidCompanionClaim = await createClaimPackage({
      account: batchInvalidPayer,
      ownerPubkey: batchInvalidOwner.ownerPubkey,
      bondDestination: batchInvalidPayer.fundingAddress,
      changeDestination: batchInvalidPayer.fundingAddress,
      name: invalidBatchCompanionName,
      fileLabel: "batch-invalid-companion-claim"
    });
    const invalidBatchRevealResult = await claimNameWithInvalidBatchReveal({
      label: "batch-invalid-reveal",
      payer: batchInvalidPayer,
      claimPackagePaths: [batchInvalidClaim.path, batchInvalidCompanionClaim.path],
      claimName: invalidBatchRevealName
    });
    summary.failures[invalidBatchRevealName] = invalidBatchRevealResult;

    const staleOwner = await createLiveAccount("stale-owner");
    const staleClaim = await createClaimPackage({
      account: staleOwner,
      name: staleRevealName,
      fileLabel: "stale-claim"
    });
    const staleCommitFunding = await fundAddress(staleOwner.fundingAddress, 80_000n);
    const staleResult = await cliJson(
      [
        "submit-claim",
        staleClaim.path,
        "--commit-input",
        formatDescriptor(staleCommitFunding),
        "--commit-fee-sats",
        COMMIT_FEE_SATS.toString(),
        "--reveal-fee-sats",
        REVEAL_FEE_SATS.toString(),
        "--wif",
        staleOwner.fundingWif,
        "--network",
        "regtest",
        "--expected-chain",
        "regtest",
        "--bond-address",
        staleOwner.fundingAddress,
        "--commit-change-address",
        staleOwner.fundingAddress,
        "--reveal-change-address",
        staleOwner.fundingAddress,
        "--queue",
        join(suiteState.artifactDir, "stale-queue.json"),
        "--out-dir",
        join(suiteState.artifactDir, "stale-attempt")
      ]
    );
    await mineBlocks(7, "force-reveal-expiry");
    await waitForResolverHeight(await rpcCall("getblockcount"));
    const staleWatcher = await cliJson([
      "run-reveal-watcher",
      "--queue",
      join(suiteState.artifactDir, "stale-queue.json"),
      "--expected-chain",
      "regtest",
      "--once"
    ]);
    assertEqual(staleWatcher.broadcastedCount, 1, "late reveal still broadcasts from watcher");
    await mineBlocks(1, "confirm-late-reveal");
    await waitForResolverHeight(await rpcCall("getblockcount"));
    const staleNameLookup = await runCli(
      [
        "get-name",
        staleRevealName,
        "--resolver-url",
        resolverUrl()
      ],
      {
        expectExitCode: 1
      }
    );
    assertContains(staleNameLookup.stdout, "\"name_not_found\"", "late reveal ignored by resolver");
    summary.failures.staleReveal = {
      commitTxid: staleResult.commitTxid,
      revealTxid: staleResult.revealTxid
    };

    const giftRecipient = await createLiveAccount("gift-recipient");
    const giftFeeUtxo = await fundAddress(primaryOwner.fundingAddress, 10_000n);
    const giftTransfer = await cliJson([
      "submit-transfer",
      "--prev-state-txid",
      primaryClaimResult.revealTxid,
      "--new-owner-pubkey",
      giftRecipient.ownerPubkey,
      "--owner-private-key-hex",
      primaryOwner.ownerPrivateKeyHex,
      "--bond-input",
      formatDescriptor({
        txid: primaryClaimResult.commitTxid,
        vout: 0,
        valueSats: 50_000n,
        address: primaryOwner.fundingAddress
      }),
      "--input",
      formatDescriptor(giftFeeUtxo),
      "--successor-bond-vout",
      "0",
      "--successor-bond-sats",
      "50000",
      "--fee-sats",
      TRANSFER_FEE_SATS.toString(),
      "--bond-address",
      giftRecipient.fundingAddress,
      "--change-address",
      primaryOwner.fundingAddress,
      "--wif",
      primaryOwner.fundingWif,
      "--network",
      "regtest",
      "--expected-chain",
      "regtest",
      "--out-dir",
      join(suiteState.artifactDir, "gift-transfer")
    ]);
    await mineBlocks(1, "confirm-gift-transfer");
    await waitForResolverHeight(await rpcCall("getblockcount"));
    const giftedRecord = await cliJson([
      "get-name",
      claimedName,
      "--resolver-url",
      resolverUrl()
    ]);
    assertEqual(giftedRecord.currentOwnerPubkey, giftRecipient.ownerPubkey, "gift transfer owner");
    assertEqual(giftedRecord.currentBondTxid, giftTransfer.transferTxid, "gift transfer bond txid");

    const signedValue = await cliJson([
      "sign-value-record",
      "--name",
      claimedName,
      "--owner-private-key-hex",
      giftRecipient.ownerPrivateKeyHex,
      "--resolver-url",
      resolverUrl(),
      "--sequence",
      "1",
      "--value-type",
      String(VALUE_TYPE_HTTPS),
      "--payload-utf8",
      "https://example.com/ont/" + claimedName,
      "--write",
      join(suiteState.artifactDir, "gifted-value.json")
    ]);
    const publishedValue = await cliJson([
      "publish-value-record",
      join(suiteState.artifactDir, "gifted-value.json"),
      "--resolver-url",
      resolverUrl()
    ]);
    assertEqual(publishedValue.ok, true, "publish value result");
    const fetchedValue = await cliJson([
      "get-value",
      claimedName,
      "--resolver-url",
      resolverUrl()
    ]);
    assertEqual(fetchedValue.sequence, 1, "published value sequence");
    const transferValueHistory = await cliJson([
      "get-value-history",
      claimedName,
      "--resolver-url",
      resolverUrl()
    ]);
    assertEqual(transferValueHistory.ownershipRef, giftTransfer.transferTxid, "gift transfer value ownership ref");
    assertEqual(transferValueHistory.records.length, 1, "gift transfer value history resets to one record");
    assertEqual(transferValueHistory.records[0].sequence, 1, "gift transfer first value sequence");

    await cliJson([
      "sign-value-record",
      "--name",
      claimedName,
      "--owner-private-key-hex",
      giftRecipient.ownerPrivateKeyHex,
      "--resolver-url",
      resolverUrl(),
      "--value-type",
      String(VALUE_TYPE_HTTPS),
      "--payload-utf8",
      "https://example.com/ont/" + claimedName + "/updated",
      "--write",
      join(suiteState.artifactDir, "gifted-value-updated.json")
    ]);
    const updatedValuePublish = await cliJson([
      "publish-value-record",
      join(suiteState.artifactDir, "gifted-value-updated.json"),
      "--resolver-url",
      resolverUrl()
    ]);
    assertEqual(updatedValuePublish.ok, true, "publish updated value result");
    const valueHistory = await cliJson([
      "get-value-history",
      claimedName,
      "--resolver-url",
      resolverUrl()
    ]);
    assertEqual(valueHistory.records.length, 2, "value history record count");
    assertEqual(valueHistory.records[1].previousRecordHash, valueHistory.records[0].recordHash, "value history predecessor hash");
    const updatedFetchedValue = await cliJson([
      "get-value",
      claimedName,
      "--resolver-url",
      resolverUrl()
    ]);
    assertEqual(updatedFetchedValue.sequence, 2, "updated value sequence");
    summary.values[claimedName] = updatedFetchedValue;

    const staleValueAttempt = await runCli(
      [
        "sign-value-record",
        "--name",
        claimedName,
        "--owner-private-key-hex",
        giftRecipient.ownerPrivateKeyHex,
        "--resolver-url",
        resolverUrl(),
        "--sequence",
        "2",
        "--value-type",
        String(VALUE_TYPE_HTTPS),
        "--payload-utf8",
        "https://example.com/stale",
        "--write",
        join(suiteState.artifactDir, "gifted-value-stale.json")
      ],
      { expectExitCode: 0 }
    );
    void staleValueAttempt;
    const staleValuePublish = await runCli(
      [
        "publish-value-record",
        join(suiteState.artifactDir, "gifted-value-stale.json"),
        "--resolver-url",
        resolverUrl()
      ],
      { expectExitCode: 1 }
    );
    assertContains(staleValuePublish.stderr, "exact next sequence", "stale sequence feedback");

    await cliJson([
      "sign-value-record",
      "--name",
      claimedName,
      "--owner-private-key-hex",
      primaryOwner.ownerPrivateKeyHex,
      "--resolver-url",
      resolverUrl(),
      "--sequence",
      "3",
      "--value-type",
      String(VALUE_TYPE_HTTPS),
      "--payload-utf8",
      "https://example.com/wrong-owner",
      "--write",
      join(suiteState.artifactDir, "gifted-value-wrong-owner.json")
    ]);
    const wrongOwnerPublish = await runCli(
      [
        "publish-value-record",
        join(suiteState.artifactDir, "gifted-value-wrong-owner.json"),
        "--resolver-url",
        resolverUrl()
      ],
      { expectExitCode: 1 }
    );
    assertContains(wrongOwnerPublish.stderr, "owner pubkey does not match", "wrong-owner value feedback");

    const breakOwner = await createLiveAccount("break-owner");
    const breakClaim = await createClaimPackage({
      account: breakOwner,
      name: invalidTransferName,
      fileLabel: "break-claim"
    });
    const breakClaimResult = await claimName({
      label: "break-claim",
      account: breakOwner,
      claimPackagePath: breakClaim.path
    });
    const breakFeeUtxo = await fundAddress(breakOwner.fundingAddress, 10_000n);
    await cliJson([
      "submit-transfer",
      "--prev-state-txid",
      breakClaimResult.revealTxid,
      "--new-owner-pubkey",
      giftRecipient.ownerPubkey,
      "--owner-private-key-hex",
      breakOwner.ownerPrivateKeyHex,
      "--bond-input",
      formatDescriptor({
        txid: breakClaimResult.commitTxid,
        vout: 0,
        valueSats: 50_000n,
        address: breakOwner.fundingAddress
      }),
      "--input",
      formatDescriptor(breakFeeUtxo),
      "--successor-bond-vout",
      "0",
      "--successor-bond-sats",
      "49000",
      "--fee-sats",
      TRANSFER_FEE_SATS.toString(),
      "--bond-address",
      giftRecipient.fundingAddress,
      "--change-address",
      breakOwner.fundingAddress,
      "--wif",
      breakOwner.fundingWif,
      "--network",
      "regtest",
      "--expected-chain",
      "regtest",
      "--out-dir",
      join(suiteState.artifactDir, "break-transfer")
    ]);
    await mineBlocks(1, "confirm-invalid-transfer");
    await waitForResolverHeight(await rpcCall("getblockcount"));
    const brokenRecord = await cliJson([
      "get-name",
      invalidTransferName,
      "--resolver-url",
      resolverUrl()
    ]);
    assertEqual(brokenRecord.status, "invalid", "broken bond continuity invalidates name");

    const immatureSeller = await createLiveAccount("immature-sale-seller");
    const immatureBuyer = await createLiveAccount("immature-sale-buyer");
    const immatureSellerClaim = await createClaimPackage({
      account: immatureSeller,
      name: immatureSaleName,
      fileLabel: "immature-sale-claim"
    });
    const immatureSellerClaimResult = await claimName({
      label: "immature-sale-claim",
      account: immatureSeller,
      claimPackagePath: immatureSellerClaim.path
    });
    const immatureBuyerInput = await fundAddress(immatureBuyer.fundingAddress, 80_000n);
    const immatureSaleTransfer = await cliJson([
      "submit-immature-sale-transfer",
      "--prev-state-txid",
      immatureSellerClaimResult.revealTxid,
      "--new-owner-pubkey",
      immatureBuyer.ownerPubkey,
      "--owner-private-key-hex",
      immatureSeller.ownerPrivateKeyHex,
      "--bond-input",
      formatDescriptor({
        txid: immatureSellerClaimResult.commitTxid,
        vout: 0,
        valueSats: 50_000n,
        address: immatureSeller.fundingAddress
      }),
      "--buyer-input",
      formatDescriptor(immatureBuyerInput),
      "--successor-bond-vout",
      "0",
      "--successor-bond-sats",
      "50000",
      "--sale-price-sats",
      "20000",
      "--seller-payout-address",
      immatureSeller.fundingAddress,
      "--buyer-change-address",
      immatureBuyer.fundingAddress,
      "--fee-sats",
      TRANSFER_FEE_SATS.toString(),
      "--bond-address",
      immatureBuyer.fundingAddress,
      "--wif",
      immatureSeller.fundingWif,
      "--wif",
      immatureBuyer.fundingWif,
      "--network",
      "regtest",
      "--expected-chain",
      "regtest",
      "--out-dir",
      join(suiteState.artifactDir, "immature-sale-transfer")
    ]);
    await mineBlocks(1, "confirm-immature-sale-transfer");
    await waitForResolverHeight(await rpcCall("getblockcount"));
    const immatureAfterSale = await cliJson([
      "get-name",
      immatureSaleName,
      "--resolver-url",
      resolverUrl()
    ]);
    assertEqual(immatureAfterSale.status, "immature", "immature sale preserves immature status");
    assertEqual(
      immatureAfterSale.currentOwnerPubkey,
      immatureBuyer.ownerPubkey,
      "immature sale owner"
    );
    assertEqual(
      immatureAfterSale.currentBondTxid,
      immatureSaleTransfer.transferTxid,
      "immature sale successor bond txid"
    );
    summary.names[immatureSaleName] = {
      claimRevealTxid: immatureSellerClaimResult.revealTxid,
      saleTransferTxid: immatureSaleTransfer.transferTxid
    };

    const seller = await createLiveAccount("mature-seller");
    const buyer = await createLiveAccount("mature-buyer");
    const sellerClaim = await createClaimPackage({
      account: seller,
      name: matureSaleName,
      fileLabel: "mature-sale-claim"
    });
    const sellerClaimResult = await claimName({
      label: "mature-sale-claim",
      account: seller,
      claimPackagePath: sellerClaim.path
    });
    await mineBlocks(MATURITY_BLOCKS + 1, "advance-to-maturity");
    await waitForResolverHeight(await rpcCall("getblockcount"), 300_000);
    const matureBeforeSale = await cliJson([
      "get-name",
      matureSaleName,
      "--resolver-url",
      resolverUrl()
    ]);
    assertEqual(matureBeforeSale.status, "mature", "name reached maturity");

    const sellerInput = await fundAddress(seller.fundingAddress, 20_000n);
    const buyerInput = await fundAddress(buyer.fundingAddress, 80_000n);
    const saleTransfer = await cliJson([
      "submit-sale-transfer",
      "--prev-state-txid",
      sellerClaimResult.revealTxid,
      "--new-owner-pubkey",
      buyer.ownerPubkey,
      "--owner-private-key-hex",
      seller.ownerPrivateKeyHex,
      "--seller-input",
      formatDescriptor(sellerInput),
      "--buyer-input",
      formatDescriptor(buyerInput),
      "--seller-payment-sats",
      "60000",
      "--seller-payment-address",
      seller.fundingAddress,
      "--fee-sats",
      TRANSFER_FEE_SATS.toString(),
      "--wif",
      seller.fundingWif,
      "--wif",
      buyer.fundingWif,
      "--seller-change-address",
      seller.fundingAddress,
      "--buyer-change-address",
      buyer.fundingAddress,
      "--network",
      "regtest",
      "--expected-chain",
      "regtest",
      "--out-dir",
      join(suiteState.artifactDir, "mature-sale-transfer")
    ]);
    await mineBlocks(1, "confirm-sale-transfer");
    await waitForResolverHeight(await rpcCall("getblockcount"));
    const matureAfterSale = await cliJson([
      "get-name",
      matureSaleName,
      "--resolver-url",
      resolverUrl()
    ]);
    assertEqual(matureAfterSale.status, "mature", "mature sale preserves mature status");
    assertEqual(matureAfterSale.currentOwnerPubkey, buyer.ownerPubkey, "mature sale owner");
    summary.names[matureSaleName] = {
      claimRevealTxid: sellerClaimResult.revealTxid,
      saleTransferTxid: saleTransfer.transferTxid
    };

    await writeFile(
      join(suiteState.artifactDir, "summary.json"),
      JSON.stringify(
        {
          kind: "ont-regtest-cli-suite-summary",
          artifactDir: suiteState.artifactDir,
          resolverUrl: resolverUrl(),
          rpcUrl: rpcUrl(),
          summary
        },
        null,
        2
      ) + "\n",
      "utf8"
    );
    await mkdir(resolve(ROOT, ".data"), { recursive: true });
    await writeFile(
      resolve(ROOT, ".data/last-regtest-suite-summary.json"),
      JSON.stringify(
        {
          kind: "ont-regtest-cli-suite-summary",
          artifactDir: suiteState.artifactDir,
          resolverUrl: resolverUrl(),
          rpcUrl: rpcUrl(),
          summary
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    console.log("");
    console.log("Regtest CLI suite passed.");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await cleanup();
  }
}

async function ensureBuild() {
  logStep("Building workspace");
  await runChecked("npm", ["run", "build"], { cwd: ROOT });
}

async function resetRemoteRegtestNode() {
  logStep("Resetting remote regtest node");
  const script = `
set -euo pipefail
CONF=${shellLiteral(REMOTE_CONF)}
DATADIR=${shellLiteral(REMOTE_DATADIR)}
RPCPORT=${REMOTE_RPC_PORT}
mkdir -p "$DATADIR"
if bitcoin-cli -conf="$CONF" -datadir="$DATADIR" getblockchaininfo >/dev/null 2>&1; then
  bitcoin-cli -conf="$CONF" -datadir="$DATADIR" stop >/dev/null 2>&1 || true
fi
pkill -f "bitcoind -conf=$CONF" >/dev/null 2>&1 || true
for _ in $(seq 1 30); do
  if ! pgrep -f "bitcoind -conf=$CONF" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if pgrep -f "bitcoind -conf=$CONF" >/dev/null 2>&1; then
  pkill -9 -f "bitcoind -conf=$CONF" >/dev/null 2>&1 || true
  sleep 1
fi
rm -rf "$DATADIR"
mkdir -p "$DATADIR"
cat > "$CONF" <<'EOF'
regtest=1
server=1
daemon=1
txindex=1
printtoconsole=0
fallbackfee=0.0002
rpcworkqueue=64

[regtest]
rpcbind=127.0.0.1
rpcallowip=127.0.0.1
rpcport=${REMOTE_RPC_PORT}
rpcuser=${RPC_USER}
rpcpassword=${RPC_PASSWORD}
EOF
bitcoind -conf="$CONF" -datadir="$DATADIR" -daemonwait
`;
  await sshScript(script);
}

async function openTunnel() {
  logStep("Opening SSH tunnel to remote regtest RPC");
  await run("ssh", ["-S", TUNNEL_SOCKET, "-O", "exit", SSH_TARGET], { allowFailure: true });
  await runChecked("ssh", [
    ...sshIdentityArgs(),
    "-f",
    "-N",
    "-M",
    "-S",
    TUNNEL_SOCKET,
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    "ExitOnForwardFailure=yes",
    "-L",
    `${LOCAL_RPC_PORT}:127.0.0.1:${REMOTE_RPC_PORT}`,
    SSH_TARGET
  ]);
}

async function bootstrapWallet() {
  logStep("Bootstrapping regtest wallet and base blocks");
  try {
    await rpcCall("unloadwallet", [REMOTE_WALLET]);
  } catch {
    // ignore
  }

  try {
    await rpcCall("createwallet", [REMOTE_WALLET, false, false, "", false, true, true]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Database already exists")) {
      throw error;
    }

    await rpcCall("loadwallet", [REMOTE_WALLET]);
  }

  const miningAddress = await walletRpcCall("getnewaddress", ["mining", "bech32"]);
  await rpcCall("generatetoaddress", [BASE_REGTEST_BLOCKS, miningAddress]);
}

async function checkRpc() {
  logStep("Checking CLI connectivity to regtest RPC");
  const result = await cliJson([
    "check-rpc",
    "--expected-chain",
    "regtest"
  ]);
  assertEqual(result.chain, "regtest", "RPC chain");
}

async function startResolver() {
  logStep("Starting local resolver against regtest RPC");
  const snapshotPath = join(suiteState.artifactDir, "resolver-snapshot.json");
  const valueStorePath = join(suiteState.artifactDir, "resolver-values.json");
  await mkdir(suiteState.artifactDir, { recursive: true });

  const child = spawn(TSX_BIN, [RESOLVER_ENTRY], {
    cwd: ROOT,
    env: {
      ...process.env,
      ONT_SOURCE_MODE: "rpc",
      ONT_BITCOIN_RPC_URL: rpcUrl(),
      ONT_BITCOIN_RPC_USERNAME: RPC_USER,
      ONT_BITCOIN_RPC_PASSWORD: RPC_PASSWORD,
      ONT_EXPECT_CHAIN: "regtest",
      ONT_LAUNCH_HEIGHT: "0",
      ONT_RPC_POLL_INTERVAL_MS: String(POLL_INTERVAL_MS),
      ONT_TEST_OVERRIDE_INITIAL_MATURITY_BLOCKS: String(TEST_INITIAL_MATURITY_BLOCKS),
      ONT_TEST_OVERRIDE_MIN_MATURITY_BLOCKS: String(TEST_INITIAL_MATURITY_BLOCKS),
      ONT_RESOLVER_PORT: String(RESOLVER_PORT),
      ONT_SNAPSHOT_PATH: snapshotPath,
      ONT_VALUE_STORE_PATH: valueStorePath,
      ONT_EXPERIMENTAL_AUCTION_FIXTURE_DIR: AUCTION_FIXTURE_DIR,
      ONT_EXPERIMENTAL_AUCTION_BASE_WINDOW_BLOCKS: String(REGTEST_AUCTION_BASE_WINDOW_BLOCKS),
      ONT_EXPERIMENTAL_AUCTION_SOFT_CLOSE_EXTENSION_BLOCKS: String(
        REGTEST_AUCTION_SOFT_CLOSE_EXTENSION_BLOCKS
      ),
      ONT_EXPERIMENTAL_AUCTION_NO_BID_RELEASE_BLOCKS: String(
        REGTEST_AUCTION_NO_BID_RELEASE_BLOCKS
      ),
      ONT_EXPERIMENTAL_AUCTION_MAJOR_EXISTING_NAME_LOCK_BLOCKS: String(
        REGTEST_AUCTION_MAJOR_LOCK_BLOCKS
      )
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  suiteState.resolverProcess = child;
  let exitCode = null;

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[resolver] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[resolver] ${chunk}`);
  });

  child.on("exit", (code) => {
    exitCode = code ?? 1;
    if (code !== 0) {
      process.stderr.write(`[resolver] exited with code ${code}\n`);
    }
  });

  await waitFor(async () => {
    if (exitCode !== null) {
      throw new Error(`resolver exited before health became ready (code ${exitCode})`);
    }

    const response = await fetch(`${resolverUrl()}/health`);
    return response.ok;
  }, 120_000, "resolver health");
}

async function expectFreshAvailability(name) {
  logStep("Checking fresh-name resolver feedback");
  const claimPlan = await cliJson([
    "claim-plan",
    name,
    "--resolver-url",
    resolverUrl()
  ]);
  assertEqual(claimPlan.appearsAvailable, true, "fresh claim-plan availability");
  assertContains(claimPlan.availabilityNote, "No revealed claim is visible", "fresh claim-plan note");
}

async function expectInvalidNameFeedback() {
  logStep("Checking invalid-name feedback");
  const result = await runCli(
    [
      "claim-plan",
      "Bad_Name",
      "--resolver-url",
      resolverUrl()
    ],
    {
      expectExitCode: 1
    }
  );
  assertContains(result.stderr, "must be lowercase alphanumeric", "invalid-name feedback");
}

async function expectMissingNameFeedback(name) {
  logStep("Checking missing-name feedback");
  const result = await runCli(
    [
      "get-name",
      name,
      "--resolver-url",
      resolverUrl()
    ],
    {
      expectExitCode: 1
    }
  );
  assertContains(result.stdout, "\"name_not_found\"", "missing-name response");
}

async function runAuctionLifecycleScenario() {
  logStep("Auction flow: settlement, value publishing, mature transfer, and bond release");

  const alphaBidder = await createLiveAccount("auction-alpha");
  const betaBidder = await createLiveAccount("auction-beta");
  const initialState = await waitForExperimentalAuction(REGTEST_AUCTION_ID, (auction) => auction !== null, 120_000);
  assertEqual(initialState.phase, "pending_unlock", "auction initial phase");

  await mineBlocks(1, "auction-unlock");
  await waitForResolverHeight(await rpcCall("getblockcount"));

  const unlockedState = await waitForExperimentalAuction(
    REGTEST_AUCTION_ID,
    (auction) => auction?.phase === "awaiting_opening_bid"
  );
  const openingBidAmountSats = BigInt(unlockedState.currentRequiredMinimumBidSats ?? unlockedState.openingMinimumBidSats);
  const openingBid = await submitAuctionBid({
    label: "auction-opening",
    auctionState: unlockedState,
    bidderId: "auction-alpha",
    bidderAccount: alphaBidder,
    bidAmountSats: openingBidAmountSats
  });

  await mineBlocks(1, "confirm-auction-opening-bid");
  await waitForResolverHeight(await rpcCall("getblockcount"));

  const liveState = await waitForExperimentalAuction(
    REGTEST_AUCTION_ID,
    (auction) => auction?.acceptedBidCount === 1 && auction.phase === "live_bidding"
  );
  assertEqual(liveState.currentHighestBidSats, openingBidAmountSats.toString(), "auction live highest bid");

  const blocksUntilSoftClose = Math.max(
    0,
    Number(liveState.auctionCloseBlockAfter ?? 0) - REGTEST_AUCTION_SOFT_CLOSE_EXTENSION_BLOCKS - liveState.currentBlockHeight
  );
  if (blocksUntilSoftClose > 0) {
    await mineBlocks(blocksUntilSoftClose, "auction-enter-soft-close");
    await waitForResolverHeight(await rpcCall("getblockcount"));
  }

  const softCloseState = await waitForExperimentalAuction(
    REGTEST_AUCTION_ID,
    (auction) => auction?.phase === "soft_close"
  );
  const softCloseBidAmountSats = BigInt(
    softCloseState.currentRequiredMinimumBidSats ?? softCloseState.openingMinimumBidSats
  );
  const softCloseBid = await submitAuctionBid({
    label: "auction-soft-close-rebid",
    auctionState: softCloseState,
    bidderId: "auction-beta",
    bidderAccount: betaBidder,
    bidAmountSats: softCloseBidAmountSats
  });

  await mineBlocks(1, "confirm-auction-soft-close-bid");
  await waitForResolverHeight(await rpcCall("getblockcount"));

  const afterSoftCloseBidState = await waitForExperimentalAuction(
    REGTEST_AUCTION_ID,
    (auction) => auction?.acceptedBidCount === 2 && auction.phase === "soft_close"
  );
  const softCloseOutcome = afterSoftCloseBidState.visibleBidOutcomes.find(
    (outcome) => outcome.txid === softCloseBid.bidTxid
  );
  assertEqual(
    softCloseOutcome?.reason,
    "higher_bid_soft_close_extended",
    "soft-close bid extension reason"
  );

  const blocksUntilSettled = Math.max(
    0,
    Number(afterSoftCloseBidState.auctionCloseBlockAfter ?? 0) - afterSoftCloseBidState.currentBlockHeight + 1
  );
  if (blocksUntilSettled > 0) {
    await mineBlocks(blocksUntilSettled, "auction-settle");
    await waitForResolverHeight(await rpcCall("getblockcount"));
  }

  const settledState = await waitForExperimentalAuction(
    REGTEST_AUCTION_ID,
    (auction) => auction?.phase === "settled"
  );
  const settledOpeningOutcome = getAuctionOutcome(settledState, openingBid.bidTxid);
  const settledWinningOutcome = getAuctionOutcome(settledState, softCloseBid.bidTxid);
  assertEqual(settledOpeningOutcome.bondStatus, "losing_bid_releasable", "losing bond releasable after settlement");
  assertEqual(settledWinningOutcome.bondStatus, "winner_locked", "winner bond locked after settlement");
  const settledNameRecord = await waitForName(settledState.normalizedName, 120_000);
  assertEqual(settledNameRecord.currentOwnerPubkey, betaBidder.ownerPubkey, "auction winner owner");
  assertEqual(String(settledNameRecord.acquisitionKind ?? ""), "auction", "auction acquisition kind");
  assertEqual(settledNameRecord.currentBondTxid, softCloseBid.bidTxid, "auction winner bond txid");
  assertEqual(settledNameRecord.currentBondVout, softCloseBid.bondVout, "auction winner bond vout");
  await cliJson([
    "sign-value-record",
    "--name",
    settledState.normalizedName,
    "--owner-private-key-hex",
    betaBidder.ownerPrivateKeyHex,
    "--resolver-url",
    resolverUrl(),
    "--sequence",
    "1",
    "--value-type",
    String(VALUE_TYPE_HTTPS),
    "--payload-utf8",
    `https://example.com/auction/${settledState.normalizedName}/winner`,
    "--write",
    join(suiteState.artifactDir, "auction-winner-value.json")
  ]);
  const winnerValuePublish = await cliJson([
    "publish-value-record",
    join(suiteState.artifactDir, "auction-winner-value.json"),
    "--resolver-url",
    resolverUrl()
  ]);
  assertEqual(winnerValuePublish.ok, true, "auction winner value publish result");
  const winnerValueRecord = await cliJson([
    "get-value",
    settledState.normalizedName,
    "--resolver-url",
    resolverUrl()
  ]);
  assertEqual(winnerValueRecord.sequence, 1, "auction winner value sequence");

  const losingSpendTxid = await spendAuctionBondWithRpc({
    bidTxid: openingBid.bidTxid,
    bidBondVout: openingBid.bondVout,
    bidBondValueSats: openingBidAmountSats,
    destinationAddress: alphaBidder.fundingAddress,
    signingWif: alphaBidder.fundingWif
  });

  await mineBlocks(1, "confirm-losing-auction-bond-release");
  await waitForResolverHeight(await rpcCall("getblockcount"));

  const afterLosingSpendState = await waitForExperimentalAuction(
    REGTEST_AUCTION_ID,
    (auction) =>
      getAuctionOutcome(auction, openingBid.bidTxid).bondSpendStatus === "spent_after_allowed_release"
  );
  const losingSpentOutcome = getAuctionOutcome(afterLosingSpendState, openingBid.bidTxid);
  const winnerStillLockedOutcome = getAuctionOutcome(afterLosingSpendState, softCloseBid.bidTxid);
  assertEqual(losingSpentOutcome.bondSpentTxid, losingSpendTxid, "losing bond spend txid");
  assertEqual(winnerStillLockedOutcome.bondStatus, "winner_locked", "winner bond still locked after loser release");

  const winnerReleaseBlock = Number(afterLosingSpendState.winnerBondReleaseBlock ?? 0);
  const blocksUntilWinnerRelease = Math.max(0, winnerReleaseBlock - afterLosingSpendState.currentBlockHeight);
  if (blocksUntilWinnerRelease > 0) {
    await mineBlocks(blocksUntilWinnerRelease, "auction-winner-release-height");
    await waitForResolverHeight(await rpcCall("getblockcount"));
  }

  const releasableWinnerState = await waitForExperimentalAuction(
    REGTEST_AUCTION_ID,
    (auction) => getAuctionOutcome(auction, softCloseBid.bidTxid).bondStatus === "winner_releasable"
  );
  const releasableWinnerNameRecord = await waitForName(settledState.normalizedName, 120_000);
  assertEqual(releasableWinnerNameRecord.status, "mature", "auction-owned name reaches maturity");
  const auctionTransferRecipient = await createLiveAccount("auction-transfer-recipient");
  const auctionWinnerSellerInput = await fundAddress(betaBidder.fundingAddress, 20_000n);
  const auctionTransferBuyerInput = await fundAddress(auctionTransferRecipient.fundingAddress, 20_000n);
  const matureAuctionTransfer = await cliJson([
    "submit-sale-transfer",
    "--prev-state-txid",
    releasableWinnerNameRecord.lastStateTxid,
    "--new-owner-pubkey",
    auctionTransferRecipient.ownerPubkey,
    "--owner-private-key-hex",
    betaBidder.ownerPrivateKeyHex,
    "--seller-input",
    formatDescriptor(auctionWinnerSellerInput),
    "--buyer-input",
    formatDescriptor(auctionTransferBuyerInput),
    "--seller-payment-sats",
    "1000",
    "--seller-payment-address",
    betaBidder.fundingAddress,
    "--fee-sats",
    TRANSFER_FEE_SATS.toString(),
    "--wif",
    betaBidder.fundingWif,
    "--wif",
    auctionTransferRecipient.fundingWif,
    "--seller-change-address",
    betaBidder.fundingAddress,
    "--buyer-change-address",
    auctionTransferRecipient.fundingAddress,
    "--network",
    "regtest",
    "--expected-chain",
    "regtest",
    "--out-dir",
    join(suiteState.artifactDir, "auction-mature-transfer")
  ]);

  await mineBlocks(1, "confirm-auction-mature-transfer");
  await waitForResolverHeight(await rpcCall("getblockcount"));

  const transferredAuctionNameRecord = await waitForName(settledState.normalizedName, 120_000);
  assertEqual(transferredAuctionNameRecord.status, "mature", "auction mature transfer preserves maturity");
  assertEqual(
    transferredAuctionNameRecord.currentOwnerPubkey,
    auctionTransferRecipient.ownerPubkey,
    "auction mature transfer owner"
  );
  assertEqual(
    transferredAuctionNameRecord.lastStateTxid,
    matureAuctionTransfer.transferTxid,
    "auction mature transfer last state txid"
  );
  const winningSpendTxid = await spendAuctionBondWithRpc({
    bidTxid: softCloseBid.bidTxid,
    bidBondVout: softCloseBid.bondVout,
    bidBondValueSats: softCloseBidAmountSats,
    destinationAddress: betaBidder.fundingAddress,
    signingWif: betaBidder.fundingWif
  });

  await mineBlocks(1, "confirm-winning-auction-bond-release");
  await waitForResolverHeight(await rpcCall("getblockcount"));

  const finalAuctionState = await waitForExperimentalAuction(
    REGTEST_AUCTION_ID,
    (auction) =>
      getAuctionOutcome(auction, softCloseBid.bidTxid).bondSpendStatus === "spent_after_allowed_release"
  );
  const finalWinningOutcome = getAuctionOutcome(finalAuctionState, softCloseBid.bidTxid);
  assertEqual(finalWinningOutcome.bondSpentTxid, winningSpendTxid, "winner bond spend txid");
  const finalTransferredAuctionNameRecord = await waitForName(settledState.normalizedName, 120_000);
  assertEqual(
    finalTransferredAuctionNameRecord.currentOwnerPubkey,
    auctionTransferRecipient.ownerPubkey,
    "auction transfer owner persists after winner bond release spend"
  );
  assertEqual(
    finalTransferredAuctionNameRecord.lastStateTxid,
    matureAuctionTransfer.transferTxid,
    "auction transfer last state persists after winner bond release spend"
  );
  await cliJson([
    "sign-value-record",
    "--name",
    settledState.normalizedName,
    "--owner-private-key-hex",
    auctionTransferRecipient.ownerPrivateKeyHex,
    "--resolver-url",
    resolverUrl(),
    "--sequence",
    "1",
    "--value-type",
    String(VALUE_TYPE_HTTPS),
    "--payload-utf8",
    `https://example.com/auction/${settledState.normalizedName}/recipient`,
    "--write",
    join(suiteState.artifactDir, "auction-transfer-recipient-value.json")
  ]);
  const transferredValuePublish = await cliJson([
    "publish-value-record",
    join(suiteState.artifactDir, "auction-transfer-recipient-value.json"),
    "--resolver-url",
    resolverUrl()
  ]);
  assertEqual(transferredValuePublish.ok, true, "auction transfer recipient value publish result");
  const transferredValueRecord = await cliJson([
    "get-value",
    settledState.normalizedName,
    "--resolver-url",
    resolverUrl()
  ]);
  assertEqual(transferredValueRecord.sequence, 1, "auction transfer recipient value sequence");
  const transferredValueHistory = await cliJson([
    "get-value-history",
    settledState.normalizedName,
    "--resolver-url",
    resolverUrl()
  ]);
  assertEqual(
    transferredValueHistory.ownershipRef,
    matureAuctionTransfer.transferTxid,
    "auction transfer value ownership ref"
  );
  assertEqual(
    transferredValueHistory.records.length,
    1,
    "auction transfer value history resets to one record"
  );
  assertEqual(transferredValueHistory.records[0].sequence, 1, "auction transfer first value sequence");

  return {
    name: settledState.normalizedName,
    openingBidTxid: openingBid.bidTxid,
    openingSpendTxid: losingSpendTxid,
    softCloseBidTxid: softCloseBid.bidTxid,
    transferTxid: matureAuctionTransfer.transferTxid,
    winnerSpendTxid: winningSpendTxid,
    winnerValueSequence: winnerValueRecord.sequence,
    transferredValueSequence: transferredValueRecord.sequence,
    transferredOwnerPubkey: auctionTransferRecipient.ownerPubkey,
    finalPhase: finalAuctionState.phase,
    finalWinnerBondStatus: finalWinningOutcome.bondStatus,
    finalWinnerBondSpendStatus: finalWinningOutcome.bondSpendStatus,
    loserBondSpendStatus: getAuctionOutcome(finalAuctionState, openingBid.bidTxid).bondSpendStatus
  };
}

async function submitAuctionBid(input) {
  const bidPackagePath = join(suiteState.artifactDir, `${input.label}-bid-package.json`);
  const artifactsPath = join(suiteState.artifactDir, `${input.label}-bid-artifacts.json`);
  const signedPath = join(suiteState.artifactDir, `${input.label}-signed-bid-artifacts.json`);
  const fundingInput = await fundAddress(
    input.bidderAccount.fundingAddress,
    input.bidAmountSats + AUCTION_BID_FEE_SATS + AUCTION_BID_FUNDING_PADDING_SATS
  );
  const { createAuctionBidPackage } = await import("@ont/protocol");
  const bidPackage = createAuctionBidPackage({
    auctionId: input.auctionState.auctionId,
    name: input.auctionState.normalizedName,
    reservedClassId: input.auctionState.reservedClassId,
    classLabel: input.auctionState.classLabel,
    currentBlockHeight: input.auctionState.currentBlockHeight,
    phase: input.auctionState.phase,
    unlockBlock: input.auctionState.unlockBlock,
    auctionCloseBlockAfter: input.auctionState.auctionCloseBlockAfter,
    openingMinimumBidSats: input.auctionState.openingMinimumBidSats,
    currentLeaderBidderCommitment: input.auctionState.currentLeaderBidderCommitment,
    currentHighestBidSats: input.auctionState.currentHighestBidSats,
    currentRequiredMinimumBidSats: input.auctionState.currentRequiredMinimumBidSats,
    reservedLockBlocks: input.auctionState.reservedLockBlocks,
    blocksUntilUnlock: input.auctionState.blocksUntilUnlock,
    blocksUntilClose: input.auctionState.blocksUntilClose,
    bidderId: input.bidderId,
    ownerPubkey: input.bidderAccount.ownerPubkey,
    bidAmountSats: input.bidAmountSats
  });
  await writeFile(bidPackagePath, JSON.stringify(bidPackage, null, 2) + "\n", "utf8");

  const artifacts = await cliJson([
    "build-auction-bid-artifacts",
    bidPackagePath,
    "--input",
    formatDescriptor(fundingInput),
    "--fee-sats",
    AUCTION_BID_FEE_SATS.toString(),
    "--network",
    "regtest",
    "--bond-address",
    input.bidderAccount.fundingAddress,
    "--change-address",
    input.bidderAccount.fundingAddress,
    "--write",
    artifactsPath
  ]);
  const signed = await cliJson([
    "sign-artifacts",
    artifactsPath,
    "--wif",
    input.bidderAccount.fundingWif,
    "--write",
    signedPath
  ]);
  assertEqual(signed.signedTransactionId, artifacts.bidTxid, `${input.label} signed txid`);

  const broadcast = await cliJson([
    "broadcast-transaction",
    signedPath,
    "--expected-chain",
    "regtest"
  ]);
  assertEqual(broadcast.broadcastedTxid, artifacts.bidTxid, `${input.label} broadcast txid`);

  return {
    bidTxid: artifacts.bidTxid,
    bondVout: artifacts.bondVout,
    bidAmountSats: input.bidAmountSats.toString()
  };
}

async function fetchExperimentalAuction(auctionId) {
  const feed = await resolverJson("/experimental-auctions");
  const auctions = Array.isArray(feed.auctions) ? feed.auctions : [];
  return auctions.find((auction) => auction.auctionId === auctionId) ?? null;
}

async function waitForExperimentalAuction(auctionId, predicate, timeoutMs = 120_000) {
  return await waitFor(async () => {
    const auction = await fetchExperimentalAuction(auctionId);
    if (auction === null) {
      return false;
    }

    return predicate(auction) ? auction : false;
  }, timeoutMs, `experimental auction ${auctionId}`);
}

function getAuctionOutcome(auction, txid) {
  const outcome = (auction.visibleBidOutcomes ?? []).find((candidate) => candidate.txid === txid);

  if (!outcome) {
    throw new Error(`missing auction outcome for ${txid}`);
  }

  return outcome;
}

async function spendAuctionBondWithRpc(input) {
  if (input.bidBondValueSats <= TRANSFER_FEE_SATS) {
    throw new Error("auction bond value is too small to spend after fee");
  }

  const transaction = await rpcCall("getrawtransaction", [input.bidTxid, true]);
  const output = Array.isArray(transaction?.vout)
    ? transaction.vout.find((candidate) => candidate?.n === input.bidBondVout)
    : null;

  if (!output?.scriptPubKey?.hex) {
    throw new Error(`missing scriptPubKey for auction bond ${input.bidTxid}:${input.bidBondVout}`);
  }

  const spendAmountSats = input.bidBondValueSats - TRANSFER_FEE_SATS;
  const rawTransactionHex = await rpcCall("createrawtransaction", [
    [
      {
        txid: input.bidTxid,
        vout: input.bidBondVout
      }
    ],
    {
      [input.destinationAddress]: satsToBtcString(spendAmountSats)
    }
  ]);

  const signed = await rpcCall("signrawtransactionwithkey", [
    rawTransactionHex,
    [input.signingWif],
    [
      {
        txid: input.bidTxid,
        vout: input.bidBondVout,
        scriptPubKey: output.scriptPubKey.hex,
        amount: satsToBtcString(input.bidBondValueSats)
      }
    ]
  ]);

  if (signed.complete !== true || typeof signed.hex !== "string" || signed.hex.length === 0) {
    throw new Error(`unable to sign auction bond spend for ${input.bidTxid}:${input.bidBondVout}`);
  }

  return await rpcCall("sendrawtransaction", [signed.hex]);
}

async function createLiveAccount(label) {
  const outputPath = join(suiteState.artifactDir, `${label}.json`);
  return await cliJson([
    "generate-live-account",
    "--network",
    "regtest",
    "--write",
    outputPath
  ]);
}

async function createClaimPackage(input) {
  const outputPath = join(suiteState.artifactDir, `${input.fileLabel}.json`);
  const result = await cliJson([
    "create-claim-package",
    input.name,
    "--owner-pubkey",
    input.ownerPubkey ?? input.account.ownerPubkey,
    "--bond-destination",
    input.bondDestination ?? input.account.fundingAddress,
    "--change-destination",
    input.changeDestination ?? input.account.fundingAddress,
    "--write",
    outputPath
  ]);

  return {
    path: outputPath,
    claimPackage: result
  };
}

async function claimName(input) {
  logStep(`Claim flow: ${input.label}`);
  const commitFunding = await fundAddress(input.account.fundingAddress, 80_000n);
  const outDir = join(suiteState.artifactDir, `${input.label}-artifacts`);
  const queuePath = join(suiteState.artifactDir, `${input.label}-queue.json`);
  const submitResult = await cliJson([
    "submit-claim",
    input.claimPackagePath,
    "--commit-input",
    formatDescriptor(commitFunding),
    "--commit-fee-sats",
    COMMIT_FEE_SATS.toString(),
    "--reveal-fee-sats",
    REVEAL_FEE_SATS.toString(),
    "--wif",
    input.account.fundingWif,
    "--network",
    "regtest",
    "--expected-chain",
    "regtest",
    "--bond-address",
    input.account.fundingAddress,
    "--commit-change-address",
    input.account.fundingAddress,
    "--reveal-change-address",
    input.account.fundingAddress,
    "--queue",
    queuePath,
    "--out-dir",
    outDir
  ]);

  const preConfirmWatcher = await cliJson([
    "run-reveal-watcher",
    "--queue",
    queuePath,
    "--expected-chain",
    "regtest",
    "--once"
  ]);
  assertEqual(preConfirmWatcher.broadcastedCount, 0, "pre-confirm reveal broadcast count");

  await mineBlocks(1, `confirm-${input.label}-commit`);
  await waitForResolverHeight(await rpcCall("getblockcount"));

  const postConfirmWatcher = await cliJson([
    "run-reveal-watcher",
    "--queue",
    queuePath,
    "--expected-chain",
    "regtest",
    "--once"
  ]);
  assertEqual(postConfirmWatcher.broadcastedCount, 1, "post-confirm reveal broadcast count");

  await mineBlocks(1, `confirm-${input.label}-reveal`);
  await waitForResolverHeight(await rpcCall("getblockcount"));

  const name = JSON.parse(await readFile(input.claimPackagePath, "utf8")).name;
  const claimedRecord = await waitForName(name, 120_000);
  assertEqual(claimedRecord.status, "immature", `${input.label} claimed status`);

  return submitResult;
}

async function claimBatchNames(input) {
  logStep(`Batch claim flow: ${input.label}`);
  const outDir = join(suiteState.artifactDir, `${input.label}-artifacts`);
  const queuePath = join(suiteState.artifactDir, `${input.label}-queue.json`);
  const batchPackagesDir = join(suiteState.artifactDir, `${input.label}-packages`);
  const batchCommitArtifactsPath = join(outDir, "batch-commit-artifacts.json");
  const signedBatchCommitPath = join(outDir, "signed-batch-commit-artifacts.json");
  await mkdir(outDir, { recursive: true });
  await mkdir(batchPackagesDir, { recursive: true });
  const commitFunding = await fundAddress(input.payer.fundingAddress, 140_000n);

  const batchCommitArtifacts = await cliJson([
    "build-batch-commit-artifacts",
    ...input.claimPackagePaths,
    "--input",
    formatDescriptor(commitFunding),
    "--fee-sats",
    COMMIT_FEE_SATS.toString(),
    "--network",
    "regtest",
    "--change-address",
    input.payer.fundingAddress,
    "--write",
    batchCommitArtifactsPath,
    "--write-packages-dir",
    batchPackagesDir
  ]);
  const signedBatchCommit = await cliJson([
    "sign-artifacts",
    batchCommitArtifactsPath,
    "--wif",
    input.payer.fundingWif,
    "--write",
    signedBatchCommitPath
  ]);
  assertEqual(
    signedBatchCommit.signedTransactionId,
    batchCommitArtifacts.commitTxid,
    "batch commit signed txid"
  );

  const revealTxids = {};

  for (let index = 0; index < input.claimNames.length; index += 1) {
    const name = input.claimNames[index];
    const sequence = String(index + 1).padStart(2, "0");
    const batchClaimPackagePath = join(batchPackagesDir, `${sequence}-${name}.json`);
    const batchRevealArtifactsPath = join(outDir, `${sequence}-${name}-batch-reveal-artifacts.json`);
    const signedBatchRevealPath = join(outDir, `${sequence}-${name}-signed-batch-reveal-artifacts.json`);
    const revealFunding = await fundAddress(input.payer.fundingAddress, 10_000n);

    const batchRevealArtifacts = await cliJson([
      "build-batch-reveal-artifacts",
      batchClaimPackagePath,
      "--input",
      formatDescriptor(revealFunding),
      "--fee-sats",
      REVEAL_FEE_SATS.toString(),
      "--network",
      "regtest",
      "--change-address",
      input.payer.fundingAddress,
      "--write",
      batchRevealArtifactsPath
    ]);
    const signedBatchReveal = await cliJson([
      "sign-artifacts",
      batchRevealArtifactsPath,
      "--wif",
      input.payer.fundingWif,
      "--write",
      signedBatchRevealPath
    ]);
    assertEqual(
      signedBatchReveal.signedTransactionId,
      batchRevealArtifacts.revealTxid,
      `batch reveal signed txid ${name}`
    );

    await cliJson([
      "enqueue-reveal",
      signedBatchRevealPath,
      "--commit-txid",
      batchCommitArtifacts.commitTxid,
      "--queue",
      queuePath,
      "--expected-chain",
      "regtest"
    ]);
    revealTxids[name] = signedBatchReveal.signedTransactionId;
  }

  const preConfirmWatcher = await cliJson([
    "run-reveal-watcher",
    "--queue",
    queuePath,
    "--expected-chain",
    "regtest",
    "--once"
  ]);
  assertEqual(preConfirmWatcher.broadcastedCount, 0, "batch pre-confirm reveal broadcast count");

  const batchCommitBroadcast = await cliJson([
    "broadcast-transaction",
    signedBatchCommitPath,
    "--expected-chain",
    "regtest"
  ]);
  assertEqual(
    batchCommitBroadcast.broadcastedTxid,
    batchCommitArtifacts.commitTxid,
    "batch commit broadcast txid"
  );

  await mineBlocks(1, `confirm-${input.label}-commit`);
  await waitForResolverHeight(await rpcCall("getblockcount"));

  const postConfirmWatcher = await cliJson([
    "run-reveal-watcher",
    "--queue",
    queuePath,
    "--expected-chain",
    "regtest",
    "--once"
  ]);
  assertEqual(
    postConfirmWatcher.broadcastedCount,
    input.claimNames.length,
    "batch post-confirm reveal broadcast count"
  );

  await mineBlocks(1, `confirm-${input.label}-reveals`);
  await waitForResolverHeight(await rpcCall("getblockcount"));

  for (const name of input.claimNames) {
    const claimedRecord = await waitForName(name, 120_000);
    assertEqual(claimedRecord.status, "immature", `${input.label} ${name} claimed status`);
    assertEqual(
      claimedRecord.currentBondTxid,
      batchCommitArtifacts.commitTxid,
      `${input.label} ${name} bond txid`
    );
  }

  return {
    commitTxid: batchCommitArtifacts.commitTxid,
    revealTxids
  };
}

async function claimNameWithInvalidBatchReveal(input) {
  logStep(`Invalid batch reveal flow: ${input.label}`);
  const outDir = join(suiteState.artifactDir, `${input.label}-artifacts`);
  const batchPackagesDir = join(suiteState.artifactDir, `${input.label}-packages`);
  const batchCommitArtifactsPath = join(outDir, "batch-commit-artifacts.json");
  const signedBatchCommitPath = join(outDir, "signed-batch-commit-artifacts.json");
  const validBatchRevealArtifactsPath = join(outDir, "valid-batch-reveal-artifacts.json");
  const tamperedBatchRevealArtifactsPath = join(outDir, "tampered-batch-reveal-artifacts.json");
  const signedTamperedBatchRevealPath = join(outDir, "signed-tampered-batch-reveal-artifacts.json");
  await mkdir(outDir, { recursive: true });
  await mkdir(batchPackagesDir, { recursive: true });

  const commitFunding = await fundAddress(input.payer.fundingAddress, 140_000n);
  const batchCommitArtifacts = await cliJson([
    "build-batch-commit-artifacts",
    ...input.claimPackagePaths,
    "--input",
    formatDescriptor(commitFunding),
    "--fee-sats",
    COMMIT_FEE_SATS.toString(),
    "--network",
    "regtest",
    "--change-address",
    input.payer.fundingAddress,
    "--write",
    batchCommitArtifactsPath,
    "--write-packages-dir",
    batchPackagesDir
  ]);
  await cliJson([
    "sign-artifacts",
    batchCommitArtifactsPath,
    "--wif",
    input.payer.fundingWif,
    "--write",
    signedBatchCommitPath
  ]);
  const batchCommitBroadcast = await cliJson([
    "broadcast-transaction",
    signedBatchCommitPath,
    "--expected-chain",
    "regtest"
  ]);
  assertEqual(
    batchCommitBroadcast.broadcastedTxid,
    batchCommitArtifacts.commitTxid,
    "invalid-batch-reveal commit broadcast txid"
  );

  await mineBlocks(1, `confirm-${input.label}-commit`);
  await waitForResolverHeight(await rpcCall("getblockcount"));

  const batchClaimPackagePath = join(batchPackagesDir, `01-${input.claimName}.json`);
  const revealFunding = await fundAddress(input.payer.fundingAddress, 10_000n);
  await cliJson([
    "build-batch-reveal-artifacts",
    batchClaimPackagePath,
    "--input",
    formatDescriptor(revealFunding),
    "--fee-sats",
    REVEAL_FEE_SATS.toString(),
    "--network",
    "regtest",
    "--change-address",
    input.payer.fundingAddress,
    "--write",
    validBatchRevealArtifactsPath
  ]);
  await writeTamperedBatchRevealArtifacts({
    sourcePath: validBatchRevealArtifactsPath,
    destinationPath: tamperedBatchRevealArtifactsPath
  });
  const signedTamperedReveal = await cliJson([
    "sign-artifacts",
    tamperedBatchRevealArtifactsPath,
    "--wif",
    input.payer.fundingWif,
    "--write",
    signedTamperedBatchRevealPath
  ]);
  const invalidRevealBroadcast = await cliJson([
    "broadcast-transaction",
    signedTamperedBatchRevealPath,
    "--expected-chain",
    "regtest"
  ]);
  assertEqual(
    invalidRevealBroadcast.broadcastedTxid,
    signedTamperedReveal.signedTransactionId,
    "invalid-batch-reveal broadcast txid"
  );

  await mineBlocks(1, `confirm-${input.label}-reveal`);
  await waitForResolverHeight(await rpcCall("getblockcount"));
  await expectMissingNameFeedback(input.claimName);

  const provenance = await cliJson([
    "get-tx",
    invalidRevealBroadcast.broadcastedTxid,
    "--resolver-url",
    resolverUrl()
  ]);
  const batchRevealEvent = provenance.events.find((candidate) => candidate.typeName === "BATCH_REVEAL");

  if (!batchRevealEvent) {
    throw new Error(`missing BATCH_REVEAL provenance event for ${invalidRevealBroadcast.broadcastedTxid}`);
  }

  assertEqual(
    batchRevealEvent.validationStatus,
    "ignored",
    "invalid-batch-reveal validation status"
  );
  assertEqual(
    batchRevealEvent.reason,
    "batch_reveal_invalid_merkle_proof",
    "invalid-batch-reveal provenance reason"
  );

  return {
    commitTxid: batchCommitArtifacts.commitTxid,
    invalidRevealTxid: invalidRevealBroadcast.broadcastedTxid,
    provenanceReason: batchRevealEvent.reason
  };
}

async function writeTamperedBatchRevealArtifacts(input) {
  const builtArtifacts = JSON.parse(await readFile(input.sourcePath, "utf8"));
  const proofOutputIndex = builtArtifacts.outputs.findIndex(
    (candidate) => candidate.role === "ont_reveal_proof_chunk"
  );

  if (proofOutputIndex < 0) {
    throw new Error("expected at least one proof chunk output in batch reveal artifacts");
  }

  const psbt = Psbt.fromBase64(builtArtifacts.psbtBase64, { network: networks.regtest });
  const unsignedOutput = psbt.data.globalMap.unsignedTx.tx.outs[proofOutputIndex];

  if (!unsignedOutput) {
    throw new Error(`missing unsigned output ${proofOutputIndex} for tampered batch reveal`);
  }

  const tamperedScript = Uint8Array.from(unsignedOutput.script);

  if (tamperedScript.length === 0) {
    throw new Error("cannot tamper an empty proof chunk script");
  }

  tamperedScript[tamperedScript.length - 1] ^= 0x01;
  unsignedOutput.script = tamperedScript;

  await writeFile(
    input.destinationPath,
    JSON.stringify(
      {
        kind: builtArtifacts.kind,
        network: builtArtifacts.network,
        psbtBase64: psbt.toBase64()
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
}

async function fundAddress(address, sats) {
  const txid = await walletRpcCall("sendtoaddress", [address, satsToBtcString(sats)]);
  const blockHeight = await mineBlocks(1, `fund-${address}`);
  const transaction = await rpcCall("getrawtransaction", [txid, true]);
  const matchingOutput = (transaction.vout ?? []).find((candidate) => {
    const scriptPubKey = candidate.scriptPubKey ?? {};
    const candidateAddresses = [];

    if (typeof scriptPubKey.address === "string") {
      candidateAddresses.push(scriptPubKey.address);
    }

    if (Array.isArray(scriptPubKey.addresses)) {
      for (const candidateAddress of scriptPubKey.addresses) {
        if (typeof candidateAddress === "string") {
          candidateAddresses.push(candidateAddress);
        }
      }
    }

    return candidateAddresses.includes(address);
  });

  if (!matchingOutput) {
    throw new Error(`could not find funded UTXO for ${address} after tx ${txid}`);
  }

  return {
    txid,
    vout: matchingOutput.n,
    valueSats: btcStringToSats(matchingOutput.value),
    address,
    blockHeight
  };
}

async function mineBlocks(count, label) {
  log(`Mining ${count.toLocaleString("en-US")} block(s) for ${label}`);
  const minerAddress = await walletRpcCall("getnewaddress", [label, "bech32"]);
  let remaining = count;

  while (remaining > 0) {
    const batchSize = Math.min(remaining, MINE_BATCH_SIZE);
    await rpcCall("generatetoaddress", [batchSize, minerAddress]);
    remaining -= batchSize;
  }

  return await rpcCall("getblockcount");
}

async function waitForResolverHeight(targetHeight, timeoutMs = 120_000) {
  await waitFor(async () => {
    const health = await resolverJson("/health");
    return Number(health.stats?.currentHeight ?? -1) >= targetHeight;
  }, timeoutMs, `resolver height ${targetHeight}`);
}

async function waitForName(name, timeoutMs = 120_000) {
  return await waitFor(async () => {
    const result = await runCli(
      [
        "get-name",
        name,
        "--resolver-url",
        resolverUrl()
      ],
      {
        expectExitCode: [0, 1]
      }
    );

    if (result.exitCode !== 0) {
      return false;
    }

    return JSON.parse(result.stdout);
  }, timeoutMs, `resolver name ${name}`);
}

async function cliJson(args) {
  const result = await runCli(args, { expectExitCode: 0 });
  return JSON.parse(result.stdout);
}

async function runCli(args, input = {}) {
  const expected = input.expectExitCode ?? 0;
  const expectedCodes = Array.isArray(expected) ? expected : [expected];
  const result = await run(TSX_BIN, [CLI_ENTRY, ...args], {
    cwd: ROOT,
    env: {
      ...process.env,
      ONT_BITCOIN_RPC_URL: rpcUrl(),
      ONT_BITCOIN_RPC_USERNAME: RPC_USER,
      ONT_BITCOIN_RPC_PASSWORD: RPC_PASSWORD,
      ONT_RESOLVER_URL: resolverUrl(),
      ONT_TEST_OVERRIDE_INITIAL_MATURITY_BLOCKS: String(TEST_INITIAL_MATURITY_BLOCKS),
      ONT_TEST_OVERRIDE_MIN_MATURITY_BLOCKS: String(TEST_INITIAL_MATURITY_BLOCKS)
    },
    allowFailure: true
  });

  if (!expectedCodes.includes(result.exitCode)) {
    throw new Error(
      `CLI command failed unexpectedly (${result.exitCode}): ${TSX_BIN} ${CLI_ENTRY} ${args.join(" ")}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }

  return result;
}

async function resolverJson(pathname) {
  const response = await fetch(`${resolverUrl()}${pathname}`);
  return await response.json();
}

async function rpcCall(method, params = [], wallet = null) {
  const endpoint = wallet === null ? rpcUrl() : `${rpcUrl()}/wallet/${encodeURIComponent(wallet)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${RPC_USER}:${RPC_PASSWORD}`).toString("base64")}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "1.0",
      id: "ont-regtest-suite",
      method,
      params
    })
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`RPC ${method} failed with HTTP ${response.status}: ${JSON.stringify(body)}`);
  }

  if (body.error) {
    throw new Error(`RPC ${method} returned error: ${JSON.stringify(body.error)}`);
  }

  return body.result;
}

async function walletRpcCall(method, params = []) {
  return await rpcCall(method, params, REMOTE_WALLET);
}

async function sshScript(script) {
  await runChecked("ssh", [
    ...sshIdentityArgs(),
    "-o",
    "StrictHostKeyChecking=accept-new",
    SSH_TARGET,
    "bash -s"
  ], {
    cwd: ROOT,
    input: script
  });
}

async function cleanup() {
  if (suiteState.resolverProcess !== null && !suiteState.resolverProcess.killed) {
    suiteState.resolverProcess.kill("SIGTERM");
    await new Promise((resolve) => {
      suiteState.resolverProcess.once("exit", resolve);
      setTimeout(resolve, 3_000);
    });
  }

  await run("ssh", ["-S", TUNNEL_SOCKET, "-O", "exit", SSH_TARGET], { allowFailure: true });
}

function ensureSshConfig() {
  if (!SSH_TARGET) {
    throw new Error("Set ONT_REGTEST_SSH_TARGET or ONT_SSH_TARGET before running regtest-cli-suite.");
  }

  if (SSH_KEY && !existsSync(SSH_KEY)) {
    throw new Error(`SSH key not found: ${SSH_KEY}`);
  }
}

function sshIdentityArgs() {
  return SSH_KEY ? ["-i", SSH_KEY, "-o", "IdentitiesOnly=yes"] : [];
}

async function waitFor(probe, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const result = await probe();
      if (result !== false) {
        return result;
      }
    } catch {
      // ignore and retry
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for ${label}`);
}

async function run(command, args, options = {}) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? ROOT,
      env: options.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    if (options.input) {
      child.stdin.write(options.input);
    }
    child.stdin.end();

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      const exitCode = code ?? 1;

      if (!options.allowFailure && exitCode !== 0) {
        rejectPromise(
          new Error(
            `Command failed (${exitCode}): ${command} ${args.join(" ")}\nstdout:\n${stdout}\nstderr:\n${stderr}`
          )
        );
        return;
      }

      resolvePromise({
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

async function runChecked(command, args, options = {}) {
  return await run(command, args, options);
}

function rpcUrl() {
  return `http://127.0.0.1:${LOCAL_RPC_PORT}`;
}

function resolverUrl() {
  return `http://127.0.0.1:${RESOLVER_PORT}`;
}

function formatDescriptor(input) {
  return `${input.txid}:${input.vout}:${input.valueSats.toString()}:${input.address}`;
}

function satsToBtcString(sats) {
  const whole = sats / 100_000_000n;
  const fractional = sats % 100_000_000n;
  return `${whole}.${fractional.toString().padStart(8, "0")}`;
}

function btcStringToSats(value) {
  const [whole, fractional = ""] = String(value).split(".");
  return BigInt(whole) * 100_000_000n + BigInt((fractional + "00000000").slice(0, 8));
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertContains(text, expectedSubstring, label) {
  if (!String(text).includes(expectedSubstring)) {
    throw new Error(`${label}: expected to find ${JSON.stringify(expectedSubstring)} in ${JSON.stringify(text)}`);
  }
}

function logStep(message) {
  console.log("");
  console.log(`== ${message} ==`);
}

function log(message) {
  console.log(`[suite] ${message}`);
}

function sleep(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

function shellLiteral(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}
