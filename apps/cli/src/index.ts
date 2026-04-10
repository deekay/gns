import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  parseBatchClaimPackage,
  createClaimPackage,
  parseClaimPackage,
  parseTransferPackage,
  PRODUCT_NAME,
  PROTOCOL_NAME
} from "@gns/protocol";

import {
  buildBatchCommitArtifacts,
  buildBatchRevealArtifacts,
  buildCommitArtifacts,
  buildImmatureSaleTransferArtifacts,
  buildRevealArtifacts,
  buildSaleTransferArtifacts,
  buildTransferArtifacts,
  maybeWriteJsonFile,
  parseFundingInputDescriptor,
  type GnsCliNetwork,
  type WalletDerivationDescriptor
} from "./builder.js";
import {
  createDefaultReservedAuctionPolicy,
  parseReservedAuctionPolicy,
  parseReservedAuctionScenario,
  serializeReservedAuctionPolicy,
  serializeReservedAuctionSimulationResult,
  simulateReservedAuction,
  type SerializedReservedAuctionPolicy
} from "@gns/core";
import {
  buildExperimentalAnnexRevealEnvelope,
  buildExperimentalAnnexRevealEnvelopeFromBatchClaimPackage,
  parseExperimentalAnnexRevealEnvelope,
  parseExperimentalCarrierPrevoutDescriptor,
  parseSignedExperimentalAnnexRevealEnvelope,
  signExperimentalAnnexRevealEnvelope,
  verifyExperimentalAnnexRevealEnvelope
} from "./annex-envelope.js";
import {
  broadcastSignedArtifacts,
  checkEsploraAddress,
  checkEsploraConnection,
  checkRpcConnection,
  parseSignedArtifactsFile,
  resolveEsploraConfig,
  resolveRemoteChainTarget,
  resolveRpcConfig,
  waitForCommitAndBroadcastReveal
} from "./rpc-actions.js";
import {
  fetchClaimPlan,
  fetchNameActivity,
  fetchRecentActivity,
  fetchNameRecord,
  fetchTransactionProvenance,
  fetchNameValueRecord,
  ResolverHttpError
} from "./resolver-actions.js";
import {
  createRevealQueueItem,
  DEFAULT_REVEAL_QUEUE_PATH,
  enqueueRevealQueueItem,
  processRevealQueueOnce
} from "./reveal-queue.js";
import { createRandomNonceHex, generateLiveAccount } from "./keygen.js";
import { parseBuiltArtifactsEnvelope, signArtifacts } from "./signer.js";
import { submitClaim } from "./submit-claim.js";
import { submitImmatureSaleTransfer } from "./submit-immature-sale-transfer.js";
import { submitSaleTransfer } from "./submit-sale-transfer.js";
import { submitTransfer } from "./submit-transfer.js";
import { createSignedValueRecord, loadSignedValueRecord, publishValueRecord } from "./value-records.js";

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv;

  switch (command) {
    case undefined:
      printUsage();
      return;
    case "inspect-claim-package":
      await inspectClaimPackage(args[0]);
      return;
    case "inspect-batch-claim-package":
      await inspectBatchClaimPackage(args[0]);
      return;
    case "inspect-transfer-package":
      await inspectTransferPackage(args[0]);
      return;
    case "create-claim-package":
      await createClaimPackageCommand(args);
      return;
    case "generate-live-account":
      await generateLiveAccountCommand(args);
      return;
    case "build-commit-artifacts":
      await buildCommitArtifactsCommand(args);
      return;
    case "build-batch-commit-artifacts":
      await buildBatchCommitArtifactsCommand(args);
      return;
    case "build-reveal-artifacts":
      await buildRevealArtifactsCommand(args);
      return;
    case "build-batch-reveal-artifacts":
      await buildBatchRevealArtifactsCommand(args);
      return;
    case "print-reserved-auction-policy":
      await printReservedAuctionPolicyCommand(args);
      return;
    case "simulate-reserved-auction":
      await simulateReservedAuctionCommand(args);
      return;
    case "build-experimental-annex-reveal-envelope":
      await buildExperimentalAnnexRevealEnvelopeCommand(args);
      return;
    case "build-experimental-annex-reveal-envelope-from-batch-claim-package":
      await buildExperimentalAnnexRevealEnvelopeFromBatchClaimPackageCommand(args);
      return;
    case "sign-experimental-annex-reveal-envelope":
      await signExperimentalAnnexRevealEnvelopeCommand(args);
      return;
    case "verify-experimental-annex-reveal-envelope":
      await verifyExperimentalAnnexRevealEnvelopeCommand(args);
      return;
    case "build-transfer-artifacts":
      await buildTransferArtifactsCommand(args);
      return;
    case "build-immature-sale-transfer-artifacts":
      await buildImmatureSaleTransferArtifactsCommand(args);
      return;
    case "build-sale-transfer-artifacts":
      await buildSaleTransferArtifactsCommand(args);
      return;
    case "sign-artifacts":
      await signArtifactsCommand(args);
      return;
    case "broadcast-transaction":
      await broadcastTransactionCommand(args);
      return;
    case "check-rpc":
      await checkRpcCommand(args);
      return;
    case "check-esplora":
      await checkEsploraCommand(args);
      return;
    case "check-address":
      await checkAddressCommand(args);
      return;
    case "watch-and-broadcast-reveal":
      await watchAndBroadcastRevealCommand(args);
      return;
    case "enqueue-reveal":
      await enqueueRevealCommand(args);
      return;
    case "run-reveal-watcher":
      await runRevealWatcherCommand(args);
      return;
    case "submit-claim":
      await submitClaimCommand(args);
      return;
    case "submit-transfer":
      await submitTransferCommand(args);
      return;
    case "submit-immature-sale-transfer":
      await submitImmatureSaleTransferCommand(args);
      return;
    case "submit-sale-transfer":
      await submitSaleTransferCommand(args);
      return;
    case "sign-value-record":
      await signValueRecordCommand(args);
      return;
    case "publish-value-record":
      await publishValueRecordCommand(args);
      return;
    case "claim-plan":
      await claimPlanCommand(args);
      return;
    case "get-name":
      await getNameCommand(args);
      return;
    case "get-name-activity":
      await getNameActivityCommand(args);
      return;
    case "get-value":
      await getValueCommand(args);
      return;
    case "list-activity":
      await listActivityCommand(args);
      return;
    case "get-tx":
      await getTxCommand(args);
      return;
    default:
      console.error(`Unknown ${PRODUCT_NAME} CLI command: ${command}`);
      console.error("");
      printUsage();
      process.exitCode = 1;
  }
}

async function inspectClaimPackage(filePath: string | undefined): Promise<void> {
  if (!filePath) {
    throw new Error("inspect-claim-package requires a path to a claim package JSON file");
  }

  const resolvedPath = resolve(process.cwd(), filePath);
  const raw = await readFile(resolvedPath, "utf8");
  const parsed = parseClaimPackage(JSON.parse(raw));

  console.log(`${PRODUCT_NAME} claim package is valid.`);
  console.log(`File: ${resolvedPath}`);
  console.log(`Exported: ${parsed.exportedAt}`);
  console.log("");
  console.log(`Name: ${parsed.name}`);
  console.log(`Owner pubkey: ${parsed.ownerPubkey}`);
  console.log(`Required bond: ${formatSats(parsed.requiredBondSats)}`);
  console.log(`Bond output: vout ${parsed.bondVout}`);
  console.log(`Bond destination: ${parsed.bondDestination ?? "(choose in wallet)"}`);
  console.log(`Change destination: ${parsed.changeDestination ?? "(wallet-selected)"}`);
  console.log("");
  console.log(`Commit hash: ${parsed.commitHash}`);
  console.log(`Commit payload: ${parsed.commitPayloadHex}`);
  console.log(`Commit payload bytes: ${parsed.commitPayloadBytes}`);
  console.log("");

  if (parsed.revealReady) {
    console.log(`Commit txid: ${parsed.commitTxid}`);
    console.log(`Reveal payload: ${parsed.revealPayloadHex}`);
    console.log(`Reveal payload bytes: ${parsed.revealPayloadBytes}`);
    console.log("");
    console.log("Next step: hand both the commit and reveal skeletons to the signer flow.");
  } else {
    console.log("Reveal payload: not ready yet");
    console.log(
      "Next step: build and sign the commit transaction, then regenerate or re-export the package with the commit txid."
    );
  }
}

async function inspectBatchClaimPackage(filePath: string | undefined): Promise<void> {
  if (!filePath) {
    throw new Error("inspect-batch-claim-package requires a path to a batch claim package JSON file");
  }

  const resolvedPath = resolve(process.cwd(), filePath);
  const raw = await readFile(resolvedPath, "utf8");
  const parsed = parseBatchClaimPackage(JSON.parse(raw));

  console.log(`${PRODUCT_NAME} batch claim package is valid.`);
  console.log(`File: ${resolvedPath}`);
  console.log(`Exported: ${parsed.exportedAt}`);
  console.log("");
  console.log(`Name: ${parsed.name}`);
  console.log(`Owner pubkey: ${parsed.ownerPubkey}`);
  console.log(`Required bond: ${formatSats(parsed.requiredBondSats)}`);
  console.log(`Bond output: vout ${parsed.bondVout}`);
  console.log(`Bond destination: ${parsed.bondDestination ?? "(choose in wallet)"}`);
  console.log(`Change destination: ${parsed.changeDestination ?? "(wallet-selected)"}`);
  console.log("");
  console.log(`Batch anchor txid: ${parsed.batchAnchorTxid}`);
  console.log(`Batch leaf count: ${parsed.batchLeafCount}`);
  console.log(`Batch merkle root: ${parsed.batchMerkleRoot}`);
  console.log(`Batch proof bytes: ${parsed.batchProofBytes}`);
  console.log(`Reveal proof chunks: ${parsed.revealProofChunkPayloadsHex.length}`);
  console.log("");
  console.log(`Reveal payload bytes: ${parsed.revealPayloadBytes}`);
  console.log("Next step: build and sign the batch reveal transaction for this claim.");
}

async function inspectTransferPackage(filePath: string | undefined): Promise<void> {
  if (!filePath) {
    throw new Error("inspect-transfer-package requires a path to a transfer package JSON file");
  }

  const resolvedPath = resolve(process.cwd(), filePath);
  const raw = await readFile(resolvedPath, "utf8");
  const parsed = parseTransferPackage(JSON.parse(raw));

  console.log(`${PRODUCT_NAME} transfer package is valid.`);
  console.log(`File: ${resolvedPath}`);
  console.log(`Exported: ${parsed.exportedAt}`);
  console.log("");
  console.log(`Name: ${parsed.name}`);
  console.log(`Current status: ${parsed.currentStatus}`);
  console.log(`Current owner pubkey: ${parsed.currentOwnerPubkey}`);
  console.log(`New owner pubkey: ${parsed.newOwnerPubkey}`);
  console.log(`Last state txid: ${parsed.lastStateTxid}`);
  console.log(`Current bond outpoint: ${parsed.currentBondTxid}:${parsed.currentBondVout}`);
  console.log(`Current bond amount: ${formatSats(parsed.currentBondValueSats)}`);
  console.log(`Required bond: ${formatSats(parsed.requiredBondSats)}`);
  console.log(`Recommended mode: ${parsed.recommendedMode}`);
  console.log(`Seller payout address: ${parsed.sellerPayoutAddress ?? "(set before signing)"}`);
  console.log(`Successor bond address: ${parsed.successorBondAddress ?? "(set before signing)"}`);
  console.log("");

  for (const mode of parsed.modes) {
    console.log(`${mode.title}: ${mode.suitability}`);
    console.log(mode.summary);
    console.log(mode.command);
    console.log("");
  }
}

async function printReservedAuctionPolicyCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const serializedPolicy = serializeReservedAuctionPolicy(createDefaultReservedAuctionPolicy());

  await maybeWriteJsonFile(parsed.options.get("write"), serializedPolicy);
  console.log(JSON.stringify(serializedPolicy, null, 2));
}

async function simulateReservedAuctionCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const scenarioPath = parsed.positionals[0];

  if (!scenarioPath) {
    throw new Error("simulate-reserved-auction requires a path to an auction scenario JSON file");
  }

  const scenario = parseReservedAuctionScenario(
    extractReservedAuctionScenarioInput(await loadJsonFile(scenarioPath))
  );
  const serializedPolicy = parsed.options.has("policy")
    ? await loadReservedAuctionPolicy(parsed.options.get("policy"))
    : serializeReservedAuctionPolicy(createDefaultReservedAuctionPolicy());
  const policy = parseReservedAuctionPolicy(serializedPolicy);
  const result = simulateReservedAuction({
    policy,
    scenario
  });
  const serializedResult = serializeReservedAuctionSimulationResult(result);

  await maybeWriteJsonFile(parsed.options.get("write"), serializedResult);
  console.log(JSON.stringify(serializedResult, null, 2));
}

async function createClaimPackageCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const name = parsed.positionals[0];

  if (!name) {
    throw new Error("create-claim-package requires a normalized or normalizable name");
  }

  const ownerPubkey = parsed.options.get("owner-pubkey");
  if (!ownerPubkey) {
    throw new Error("--owner-pubkey is required");
  }

  const claimPackage = createClaimPackage({
    name,
    ownerPubkey,
    nonceHex: parsed.options.get("nonce-hex") ?? createRandomNonceHex(),
    ...(parsed.options.has("bond-vout")
      ? { bondVout: parseRequiredByte(parsed.options.get("bond-vout"), "bond-vout") }
      : {}),
    ...(parsed.options.has("bond-destination")
      ? { bondDestination: parsed.options.get("bond-destination") as string }
      : {}),
    ...(parsed.options.has("change-destination")
      ? { changeDestination: parsed.options.get("change-destination") as string }
      : {}),
    ...(parsed.options.has("commit-txid")
      ? { commitTxid: parsed.options.get("commit-txid") as string }
      : {})
  });

  await maybeWriteJsonFile(parsed.options.get("write"), claimPackage);
  console.log(JSON.stringify(claimPackage, null, 2));
}

async function generateLiveAccountCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const generated = generateLiveAccount(parseNetwork(parsed.options.get("network")));

  await maybeWriteJsonFile(parsed.options.get("write"), generated);
  console.log(JSON.stringify(generated, null, 2));
}

async function buildCommitArtifactsCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const claimPackagePath = parsed.positionals[0];

  if (!claimPackagePath) {
    throw new Error("build-commit-artifacts requires a path to a claim package JSON file");
  }

  const claimPackage = await loadClaimPackage(claimPackagePath);
  const network = parseNetwork(parsed.options.get("network"));
  const feeSats = parseRequiredBigInt(parsed.options.get("fee-sats"), "fee-sats");
  const inputSpecs = parsed.multiOptions.get("input") ?? [];
  const walletDerivation = parseWalletDerivationOptions(parsed);

  const artifacts = buildCommitArtifacts({
    claimPackage,
    fundingInputs: inputSpecs.map(parseFundingInputDescriptor),
    feeSats,
    network,
    ...(walletDerivation !== null ? { walletDerivation } : {}),
    ...(parsed.options.has("bond-address")
      ? { bondAddress: parsed.options.get("bond-address") as string }
      : {}),
    ...(parsed.options.has("change-address")
      ? { changeAddress: parsed.options.get("change-address") as string }
      : {})
  });

  await maybeWriteJsonFile(parsed.options.get("write"), artifacts);
  await maybeWriteJsonFile(parsed.options.get("write-package"), artifacts.updatedClaimPackage);
  console.log(JSON.stringify(artifacts, null, 2));
}

async function buildBatchCommitArtifactsCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);

  if (parsed.positionals.length === 0) {
    throw new Error(
      "build-batch-commit-artifacts requires one or more claim package JSON file paths"
    );
  }

  const claimPackages = await Promise.all(parsed.positionals.map((filePath) => loadClaimPackage(filePath)));
  const network = parseNetwork(parsed.options.get("network"));
  const feeSats = parseRequiredBigInt(parsed.options.get("fee-sats"), "fee-sats");
  const inputSpecs = parsed.multiOptions.get("input") ?? [];
  const walletDerivation = parseWalletDerivationOptions(parsed);

  const artifacts = buildBatchCommitArtifacts({
    claimPackages,
    fundingInputs: inputSpecs.map(parseFundingInputDescriptor),
    feeSats,
    network,
    ...(walletDerivation !== null ? { walletDerivation } : {}),
    ...(parsed.options.has("change-address")
      ? { changeAddress: parsed.options.get("change-address") as string }
      : {}),
    ...(parsed.options.has("proof-chunk-bytes")
      ? {
          proofChunkBytes: parseRequiredInteger(
            parsed.options.get("proof-chunk-bytes"),
            "proof-chunk-bytes"
          )
        }
      : {})
  });

  await maybeWriteJsonFile(parsed.options.get("write"), artifacts);
  await writeBatchClaimPackagesDir(
    parsed.options.get("write-packages-dir"),
    artifacts.updatedClaimPackages
  );
  console.log(JSON.stringify(artifacts, null, 2));
}

async function buildRevealArtifactsCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const claimPackagePath = parsed.positionals[0];

  if (!claimPackagePath) {
    throw new Error("build-reveal-artifacts requires a path to a reveal-ready claim package JSON file");
  }

  const claimPackage = await loadClaimPackage(claimPackagePath);
  const network = parseNetwork(parsed.options.get("network"));
  const feeSats = parseRequiredBigInt(parsed.options.get("fee-sats"), "fee-sats");
  const inputSpecs = parsed.multiOptions.get("input") ?? [];
  const walletDerivation = parseWalletDerivationOptions(parsed);

  const artifacts = buildRevealArtifacts({
    claimPackage,
    fundingInputs: inputSpecs.map(parseFundingInputDescriptor),
    feeSats,
    network,
    ...(walletDerivation !== null ? { walletDerivation } : {}),
    ...(parsed.options.has("change-address")
      ? { changeAddress: parsed.options.get("change-address") as string }
      : {})
  });

  await maybeWriteJsonFile(parsed.options.get("write"), artifacts);
  console.log(JSON.stringify(artifacts, null, 2));
}

async function buildBatchRevealArtifactsCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const claimPackagePath = parsed.positionals[0];

  if (!claimPackagePath) {
    throw new Error(
      "build-batch-reveal-artifacts requires a path to a reveal-ready batch claim package JSON file"
    );
  }

  const claimPackage = await loadBatchClaimPackage(claimPackagePath);
  const network = parseNetwork(parsed.options.get("network"));
  const feeSats = parseRequiredBigInt(parsed.options.get("fee-sats"), "fee-sats");
  const inputSpecs = parsed.multiOptions.get("input") ?? [];
  const walletDerivation = parseWalletDerivationOptions(parsed);

  const artifacts = buildBatchRevealArtifacts({
    claimPackage,
    fundingInputs: inputSpecs.map(parseFundingInputDescriptor),
    feeSats,
    network,
    ...(walletDerivation !== null ? { walletDerivation } : {}),
    ...(parsed.options.has("change-address")
      ? { changeAddress: parsed.options.get("change-address") as string }
      : {})
  });

  await maybeWriteJsonFile(parsed.options.get("write"), artifacts);
  console.log(JSON.stringify(artifacts, null, 2));
}

async function buildExperimentalAnnexRevealEnvelopeCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const name = parsed.options.get("name");
  const anchorTxid = parsed.options.get("anchor-txid");
  const carrierPrevout = parsed.options.get("carrier-prevout");
  const wif = parsed.multiOptions.get("wif")?.[0];

  if (!name) {
    throw new Error("build-experimental-annex-reveal-envelope requires --name");
  }

  if (!anchorTxid) {
    throw new Error("build-experimental-annex-reveal-envelope requires --anchor-txid");
  }

  if (!carrierPrevout) {
    throw new Error("build-experimental-annex-reveal-envelope requires --carrier-prevout");
  }

  if (!wif) {
    throw new Error("build-experimental-annex-reveal-envelope requires --wif");
  }

  const envelope = buildExperimentalAnnexRevealEnvelope({
    network: parseNetwork(parsed.options.get("network")),
    name,
    anchorTxid,
    bondVout: parseRequiredByte(parsed.options.get("bond-vout"), "bond-vout"),
    carrierPrevout: parseExperimentalCarrierPrevoutDescriptor(carrierPrevout),
    wif,
    ...(parsed.options.has("carrier-input-index")
      ? {
          carrierInputIndex: parseRequiredInteger(
            parsed.options.get("carrier-input-index"),
            "carrier-input-index"
          )
        }
      : {}),
    ...(parsed.options.has("fee-sats")
      ? { feeSats: parseRequiredBigInt(parsed.options.get("fee-sats"), "fee-sats") }
      : {}),
    ...(parsed.options.has("change-address")
      ? { changeAddress: parsed.options.get("change-address") as string }
      : {}),
    ...(parsed.options.has("annex-proof-hex")
      ? { annexProofHex: parsed.options.get("annex-proof-hex") as string }
      : {}),
    ...(parsed.options.has("annex-proof-bytes")
      ? {
          annexProofBytes: parseRequiredInteger(
            parsed.options.get("annex-proof-bytes"),
            "annex-proof-bytes"
          )
        }
      : {}),
    ...(parsed.options.has("annex-proof-fill-byte")
      ? {
          annexProofFillByte: parseRequiredByte(
            parsed.options.get("annex-proof-fill-byte"),
            "annex-proof-fill-byte"
          )
        }
      : {})
  });

  await maybeWriteJsonFile(parsed.options.get("write"), envelope);
  console.log(JSON.stringify(envelope, null, 2));
}

async function buildExperimentalAnnexRevealEnvelopeFromBatchClaimPackageCommand(
  args: readonly string[]
): Promise<void> {
  const parsed = parseOptions(args);
  const claimPackagePath = parsed.positionals[0];
  const carrierPrevout = parsed.options.get("carrier-prevout");
  const wif = parsed.multiOptions.get("wif")?.[0];

  if (!claimPackagePath) {
    throw new Error(
      "build-experimental-annex-reveal-envelope-from-batch-claim-package requires a batch claim package JSON path"
    );
  }

  if (!carrierPrevout) {
    throw new Error(
      "build-experimental-annex-reveal-envelope-from-batch-claim-package requires --carrier-prevout"
    );
  }

  if (!wif) {
    throw new Error(
      "build-experimental-annex-reveal-envelope-from-batch-claim-package requires --wif"
    );
  }

  const claimPackage = await loadBatchClaimPackage(claimPackagePath);
  const envelope = buildExperimentalAnnexRevealEnvelopeFromBatchClaimPackage({
    network: parseNetwork(parsed.options.get("network")),
    claimPackage,
    carrierPrevout: parseExperimentalCarrierPrevoutDescriptor(carrierPrevout),
    wif,
    ...(parsed.options.has("carrier-input-index")
      ? {
          carrierInputIndex: parseRequiredInteger(
            parsed.options.get("carrier-input-index"),
            "carrier-input-index"
          )
        }
      : {}),
    ...(parsed.options.has("fee-sats")
      ? { feeSats: parseRequiredBigInt(parsed.options.get("fee-sats"), "fee-sats") }
      : {}),
    ...(parsed.options.has("change-address")
      ? { changeAddress: parsed.options.get("change-address") as string }
      : {})
  });

  await maybeWriteJsonFile(parsed.options.get("write"), envelope);
  console.log(JSON.stringify(envelope, null, 2));
}

async function signExperimentalAnnexRevealEnvelopeCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const envelopePath = parsed.positionals[0];
  const wif = parsed.multiOptions.get("wif")?.[0];

  if (!envelopePath) {
    throw new Error(
      "sign-experimental-annex-reveal-envelope requires a path to an unsigned envelope JSON file"
    );
  }

  if (!wif) {
    throw new Error("sign-experimental-annex-reveal-envelope requires --wif");
  }

  const unsignedEnvelope = await loadExperimentalAnnexRevealEnvelope(envelopePath);
  const signedEnvelope = signExperimentalAnnexRevealEnvelope({
    unsignedEnvelope,
    wif
  });

  await maybeWriteJsonFile(parsed.options.get("write"), signedEnvelope);
  console.log(JSON.stringify(signedEnvelope, null, 2));
}

async function verifyExperimentalAnnexRevealEnvelopeCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const unsignedEnvelopePath = parsed.positionals[0];
  const signedEnvelopePath = parsed.positionals[1];

  if (!unsignedEnvelopePath || !signedEnvelopePath) {
    throw new Error(
      "verify-experimental-annex-reveal-envelope requires unsigned and signed envelope JSON paths"
    );
  }

  const unsignedEnvelope = await loadExperimentalAnnexRevealEnvelope(unsignedEnvelopePath);
  const signedEnvelope = await loadSignedExperimentalAnnexRevealEnvelope(signedEnvelopePath);
  const report = verifyExperimentalAnnexRevealEnvelope({
    unsignedEnvelope,
    signedEnvelope
  });
  const allChecksPass = Object.values(report.verification).every(Boolean);

  if (!allChecksPass) {
    process.exitCode = 1;
  }

  console.log(JSON.stringify(report, null, 2));
}

async function buildTransferArtifactsCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const bondInputSpec = parsed.options.get("bond-input");

  if (!bondInputSpec) {
    throw new Error("--bond-input is required");
  }

  const prevStateTxid = parsed.options.get("prev-state-txid");
  if (!prevStateTxid) {
    throw new Error("--prev-state-txid is required");
  }

  const newOwnerPubkey = parsed.options.get("new-owner-pubkey");
  if (!newOwnerPubkey) {
    throw new Error("--new-owner-pubkey is required");
  }

  const ownerPrivateKeyHex = parsed.options.get("owner-private-key-hex");
  if (!ownerPrivateKeyHex) {
    throw new Error("--owner-private-key-hex is required");
  }

  const bondAddress = parsed.options.get("bond-address");
  if (!bondAddress) {
    throw new Error("--bond-address is required");
  }

  const artifacts = buildTransferArtifacts({
    prevStateTxid,
    ownerPrivateKeyHex,
    newOwnerPubkey,
    successorBondVout: parseRequiredByte(
      parsed.options.get("successor-bond-vout"),
      "successor-bond-vout"
    ),
    successorBondSats: parseRequiredBigInt(
      parsed.options.get("successor-bond-sats"),
      "successor-bond-sats"
    ),
    currentBondInput: parseFundingInputDescriptor(bondInputSpec),
    additionalFundingInputs: (parsed.multiOptions.get("input") ?? []).map(parseFundingInputDescriptor),
    feeSats: parseRequiredBigInt(parsed.options.get("fee-sats"), "fee-sats"),
    network: parseNetwork(parsed.options.get("network")),
    bondAddress,
    ...(parsed.options.has("change-address")
      ? { changeAddress: parsed.options.get("change-address") as string }
      : {}),
    ...(parsed.options.has("flags")
      ? { flags: parseRequiredByte(parsed.options.get("flags"), "flags") }
      : {})
  });

  await maybeWriteJsonFile(parsed.options.get("write"), artifacts);
  console.log(JSON.stringify(artifacts, null, 2));
}

async function buildSaleTransferArtifactsCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const prevStateTxid = parsed.options.get("prev-state-txid");
  const newOwnerPubkey = parsed.options.get("new-owner-pubkey");
  const ownerPrivateKeyHex = parsed.options.get("owner-private-key-hex");
  const sellerPaymentAddress = parsed.options.get("seller-payment-address");
  const sellerInputs = (parsed.multiOptions.get("seller-input") ?? []).map(parseFundingInputDescriptor);
  const buyerInputs = (parsed.multiOptions.get("buyer-input") ?? []).map(parseFundingInputDescriptor);

  if (!prevStateTxid) {
    throw new Error("--prev-state-txid is required");
  }

  if (!newOwnerPubkey) {
    throw new Error("--new-owner-pubkey is required");
  }

  if (!ownerPrivateKeyHex) {
    throw new Error("--owner-private-key-hex is required");
  }

  if (!sellerPaymentAddress) {
    throw new Error("--seller-payment-address is required");
  }

  if (sellerInputs.length === 0) {
    throw new Error("at least one --seller-input is required");
  }

  if (buyerInputs.length === 0) {
    throw new Error("at least one --buyer-input is required");
  }

  const artifacts = buildSaleTransferArtifacts({
    prevStateTxid,
    ownerPrivateKeyHex,
    newOwnerPubkey,
    sellerInputs,
    buyerInputs,
    sellerPaymentSats: parseRequiredBigInt(
      parsed.options.get("seller-payment-sats"),
      "seller-payment-sats"
    ),
    sellerPaymentAddress,
    feeSats: parseRequiredBigInt(parsed.options.get("fee-sats"), "fee-sats"),
    network: parseNetwork(parsed.options.get("network")),
    ...(parsed.options.has("seller-change-address")
      ? { sellerChangeAddress: parsed.options.get("seller-change-address") as string }
      : {}),
    ...(parsed.options.has("buyer-change-address")
      ? { buyerChangeAddress: parsed.options.get("buyer-change-address") as string }
      : {}),
    ...(parsed.options.has("flags")
      ? { flags: parseRequiredByte(parsed.options.get("flags"), "flags") }
      : {})
  });

  await maybeWriteJsonFile(parsed.options.get("write"), artifacts);
  console.log(JSON.stringify(artifacts, null, 2));
}

async function buildImmatureSaleTransferArtifactsCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const bondInputSpec = parsed.options.get("bond-input");
  const prevStateTxid = parsed.options.get("prev-state-txid");
  const newOwnerPubkey = parsed.options.get("new-owner-pubkey");
  const ownerPrivateKeyHex = parsed.options.get("owner-private-key-hex");
  const sellerPayoutAddress = parsed.options.get("seller-payout-address");
  const bondAddress = parsed.options.get("bond-address");
  const sellerInputs = (parsed.multiOptions.get("seller-input") ?? []).map(parseFundingInputDescriptor);
  const buyerInputs = (parsed.multiOptions.get("buyer-input") ?? []).map(parseFundingInputDescriptor);

  if (!bondInputSpec) {
    throw new Error("--bond-input is required");
  }

  if (!prevStateTxid) {
    throw new Error("--prev-state-txid is required");
  }

  if (!newOwnerPubkey) {
    throw new Error("--new-owner-pubkey is required");
  }

  if (!ownerPrivateKeyHex) {
    throw new Error("--owner-private-key-hex is required");
  }

  if (!sellerPayoutAddress) {
    throw new Error("--seller-payout-address is required");
  }

  if (!bondAddress) {
    throw new Error("--bond-address is required");
  }

  if (buyerInputs.length === 0) {
    throw new Error("at least one --buyer-input is required");
  }

  const artifacts = buildImmatureSaleTransferArtifacts({
    prevStateTxid,
    ownerPrivateKeyHex,
    newOwnerPubkey,
    successorBondVout: parseRequiredByte(
      parsed.options.get("successor-bond-vout"),
      "successor-bond-vout"
    ),
    successorBondSats: parseRequiredBigInt(
      parsed.options.get("successor-bond-sats"),
      "successor-bond-sats"
    ),
    currentBondInput: parseFundingInputDescriptor(bondInputSpec),
    ...(sellerInputs.length === 0 ? {} : { sellerInputs }),
    buyerInputs,
    salePriceSats: parseRequiredBigInt(parsed.options.get("sale-price-sats"), "sale-price-sats"),
    sellerPayoutAddress,
    feeSats: parseRequiredBigInt(parsed.options.get("fee-sats"), "fee-sats"),
    network: parseNetwork(parsed.options.get("network")),
    bondAddress,
    ...(parsed.options.has("buyer-change-address")
      ? { buyerChangeAddress: parsed.options.get("buyer-change-address") as string }
      : {}),
    ...(parsed.options.has("flags")
      ? { flags: parseRequiredByte(parsed.options.get("flags"), "flags") }
      : {})
  });

  await maybeWriteJsonFile(parsed.options.get("write"), artifacts);
  console.log(JSON.stringify(artifacts, null, 2));
}

async function signArtifactsCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const artifactsPath = parsed.positionals[0];

  if (!artifactsPath) {
    throw new Error("sign-artifacts requires a path to a built artifacts JSON file");
  }

  const resolvedPath = resolve(process.cwd(), artifactsPath);
  const raw = await readFile(resolvedPath, "utf8");
  const artifacts = parseBuiltArtifactsEnvelope(JSON.parse(raw));
  const wifs = parsed.multiOptions.get("wif") ?? [];

  const signed = signArtifacts({
    artifacts,
    wifs
  });

  await maybeWriteJsonFile(parsed.options.get("write"), signed);
  console.log(JSON.stringify(signed, null, 2));
}

async function broadcastTransactionCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const artifactsPath = parsed.positionals[0];

  if (!artifactsPath) {
    throw new Error("broadcast-transaction requires a path to a signed artifacts JSON file");
  }

  const signedArtifacts = await loadSignedArtifacts(artifactsPath);
  const expectedChain = parseNetwork(parsed.options.get("expected-chain"));
  const target = resolveRemoteChainTarget({
    rpcUrl: parsed.options.get("rpc-url"),
    rpcUsername: parsed.options.get("rpc-username"),
    rpcPassword: parsed.options.get("rpc-password"),
    esploraBaseUrl: parsed.options.get("base-url"),
    expectedChain
  });

  const result = await broadcastSignedArtifacts({
    rpc: target.rpc,
    esplora: target.esplora,
    expectedChain,
    signedArtifacts
  });

  console.log(JSON.stringify(result, null, 2));
}

async function checkRpcCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const expectedChain = parseNetwork(parsed.options.get("expected-chain"));
  const rpc = resolveRpcConfig({
    url: parsed.options.get("rpc-url"),
    username: parsed.options.get("rpc-username"),
    password: parsed.options.get("rpc-password"),
    expectedChain
  });

  const result = await checkRpcConnection({
    rpc,
    expectedChain
  });

  console.log(JSON.stringify(result, null, 2));
}

async function checkEsploraCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const expectedChain = parseNetwork(parsed.options.get("expected-chain"));
  const esplora = resolveEsploraConfig({
    baseUrl: parsed.options.get("base-url"),
    expectedChain
  });

  const result = await checkEsploraConnection({
    esplora,
    expectedChain
  });

  console.log(JSON.stringify(result, null, 2));
}

async function checkAddressCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const address = parsed.options.get("address");

  if (!address) {
    throw new Error("--address is required");
  }

  const esplora = resolveEsploraConfig({
    baseUrl: parsed.options.get("base-url"),
    expectedChain: "signet"
  });
  const result = await checkEsploraAddress({
    esplora,
    address
  });

  console.log(JSON.stringify(result, null, 2));
}

async function watchAndBroadcastRevealCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const signedArtifactsPath = parsed.positionals[0];

  if (!signedArtifactsPath) {
    throw new Error("watch-and-broadcast-reveal requires a path to a signed reveal artifacts JSON file");
  }

  const commitTxid = parsed.options.get("commit-txid");
  if (!commitTxid) {
    throw new Error("--commit-txid is required");
  }

  const signedRevealArtifacts = await loadSignedArtifacts(signedArtifactsPath);
  if (
    signedRevealArtifacts.kind !== "gns-signed-reveal-artifacts" &&
    signedRevealArtifacts.kind !== "gns-signed-batch-reveal-artifacts"
  ) {
    throw new Error(
      "watch-and-broadcast-reveal requires a signed reveal or signed batch reveal artifacts file"
    );
  }

  const expectedChain = parseNetwork(parsed.options.get("expected-chain"));
  const target = resolveRemoteChainTarget({
    rpcUrl: parsed.options.get("rpc-url"),
    rpcUsername: parsed.options.get("rpc-username"),
    rpcPassword: parsed.options.get("rpc-password"),
    esploraBaseUrl: parsed.options.get("base-url"),
    expectedChain
  });
  const pollIntervalMs = parseOptionalInteger(parsed.options.get("poll-interval-ms")) ?? 10_000;
  const timeoutMs = parseOptionalInteger(parsed.options.get("timeout-ms")) ?? 30 * 60 * 1000;

  const result = await waitForCommitAndBroadcastReveal({
    rpc: target.rpc,
    esplora: target.esplora,
    expectedChain,
    commitTxid,
    signedRevealArtifacts,
    pollIntervalMs,
    timeoutMs
  });

  console.log(JSON.stringify(result, null, 2));
}

async function enqueueRevealCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const signedArtifactsPath = parsed.positionals[0];

  if (!signedArtifactsPath) {
    throw new Error("enqueue-reveal requires a path to a signed reveal artifacts JSON file");
  }

  const commitTxid = parsed.options.get("commit-txid");
  if (!commitTxid) {
    throw new Error("--commit-txid is required");
  }

  const signedArtifacts = await loadSignedArtifacts(signedArtifactsPath);
  if (
    signedArtifacts.kind !== "gns-signed-reveal-artifacts" &&
    signedArtifacts.kind !== "gns-signed-batch-reveal-artifacts"
  ) {
    throw new Error(
      "enqueue-reveal requires a signed reveal or signed batch reveal artifacts file"
    );
  }

  const expectedChain = parseNetwork(parsed.options.get("expected-chain"));
  const queuePath = parsed.options.get("queue") ?? DEFAULT_REVEAL_QUEUE_PATH;
  const updatedQueue = await enqueueRevealQueueItem({
    queuePath,
    item: createRevealQueueItem({
      expectedChain,
      commitTxid,
      signedRevealArtifacts: signedArtifacts
    })
  });

  console.log(
    JSON.stringify(
      {
        kind: "gns-reveal-queue-enqueue-result",
        queuePath: resolve(process.cwd(), queuePath),
        queuedCount: updatedQueue.items.length,
        lastQueuedId: `${commitTxid}:${signedArtifacts.signedTransactionId}`
      },
      null,
      2
    )
  );
}

async function runRevealWatcherCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const expectedChain = parseNetwork(parsed.options.get("expected-chain"));
  const queuePath = parsed.options.get("queue") ?? DEFAULT_REVEAL_QUEUE_PATH;
  const pollIntervalMs = parseOptionalInteger(parsed.options.get("poll-interval-ms")) ?? 10_000;
  const once = parsed.options.get("once") === "true";
  const target = resolveRemoteChainTarget({
    rpcUrl: parsed.options.get("rpc-url"),
    rpcUsername: parsed.options.get("rpc-username"),
    rpcPassword: parsed.options.get("rpc-password"),
    esploraBaseUrl: parsed.options.get("base-url"),
    expectedChain
  });

  do {
    const result = await processRevealQueueOnce({
      queuePath,
      rpc: target.rpc,
      esplora: target.esplora,
      expectedChain
    });
    console.log(JSON.stringify(result, null, 2));

    if (once) {
      return;
    }

    await sleep(pollIntervalMs);
  } while (true);
}

async function submitClaimCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const claimPackagePath = parsed.positionals[0];

  if (!claimPackagePath) {
    throw new Error("submit-claim requires a path to a claim package JSON file");
  }

  const claimPackage = await loadClaimPackage(claimPackagePath);
  const network = parseNetwork(parsed.options.get("network"));
  const expectedChain = parseNetwork(parsed.options.get("expected-chain"));
  const target = resolveRemoteChainTarget({
    rpcUrl: parsed.options.get("rpc-url"),
    rpcUsername: parsed.options.get("rpc-username"),
    rpcPassword: parsed.options.get("rpc-password"),
    esploraBaseUrl: parsed.options.get("base-url"),
    expectedChain
  });
  const commitInputs = (parsed.multiOptions.get("commit-input") ?? []).map(parseFundingInputDescriptor);
  const revealInputs = (parsed.multiOptions.get("reveal-input") ?? []).map(parseFundingInputDescriptor);
  const wifs = parsed.multiOptions.get("wif") ?? [];

  if (commitInputs.length === 0) {
    throw new Error("submit-claim requires at least one --commit-input");
  }

  if (wifs.length === 0) {
    throw new Error("submit-claim requires at least one --wif");
  }

  const result = await submitClaim({
    claimPackage,
    network,
    expectedChain,
    rpc: target.rpc,
    esplora: target.esplora,
    commitInputs,
    commitFeeSats: parseRequiredBigInt(parsed.options.get("commit-fee-sats"), "commit-fee-sats"),
    revealInputs,
    revealFeeSats: parseRequiredBigInt(parsed.options.get("reveal-fee-sats"), "reveal-fee-sats"),
    wifs,
    ...(parsed.options.has("bond-address")
      ? { bondAddress: parsed.options.get("bond-address") as string }
      : {}),
    ...(parsed.options.has("commit-change-address")
      ? { commitChangeAddress: parsed.options.get("commit-change-address") as string }
      : {}),
    ...(parsed.options.has("reveal-change-address")
      ? { revealChangeAddress: parsed.options.get("reveal-change-address") as string }
      : {}),
    ...(parsed.options.has("queue") ? { queuePath: parsed.options.get("queue") as string } : {}),
    ...(parsed.options.has("out-dir") ? { outDir: parsed.options.get("out-dir") as string } : {})
  });

  console.log(JSON.stringify(result, null, 2));
}

async function submitTransferCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const bondInputSpec = parsed.options.get("bond-input");

  if (!bondInputSpec) {
    throw new Error("submit-transfer requires --bond-input");
  }

  const prevStateTxid = parsed.options.get("prev-state-txid");
  if (!prevStateTxid) {
    throw new Error("submit-transfer requires --prev-state-txid");
  }

  const newOwnerPubkey = parsed.options.get("new-owner-pubkey");
  if (!newOwnerPubkey) {
    throw new Error("submit-transfer requires --new-owner-pubkey");
  }

  const ownerPrivateKeyHex = parsed.options.get("owner-private-key-hex");
  if (!ownerPrivateKeyHex) {
    throw new Error("submit-transfer requires --owner-private-key-hex");
  }

  const bondAddress = parsed.options.get("bond-address");
  if (!bondAddress) {
    throw new Error("submit-transfer requires --bond-address");
  }

  const wifs = parsed.multiOptions.get("wif") ?? [];
  if (wifs.length === 0) {
    throw new Error("submit-transfer requires at least one --wif");
  }

  const network = parseNetwork(parsed.options.get("network"));
  const expectedChain = parseNetwork(parsed.options.get("expected-chain"));
  const target = resolveRemoteChainTarget({
    rpcUrl: parsed.options.get("rpc-url"),
    rpcUsername: parsed.options.get("rpc-username"),
    rpcPassword: parsed.options.get("rpc-password"),
    esploraBaseUrl: parsed.options.get("base-url"),
    expectedChain
  });

  const result = await submitTransfer({
    prevStateTxid,
    ownerPrivateKeyHex,
    newOwnerPubkey,
    successorBondVout: parseRequiredByte(
      parsed.options.get("successor-bond-vout"),
      "successor-bond-vout"
    ),
    successorBondSats: parseRequiredBigInt(
      parsed.options.get("successor-bond-sats"),
      "successor-bond-sats"
    ),
    currentBondInput: parseFundingInputDescriptor(bondInputSpec),
    additionalFundingInputs: (parsed.multiOptions.get("input") ?? []).map(parseFundingInputDescriptor),
    feeSats: parseRequiredBigInt(parsed.options.get("fee-sats"), "fee-sats"),
    network,
    expectedChain,
    rpc: target.rpc,
    esplora: target.esplora,
    wifs,
    bondAddress,
    ...(parsed.options.has("change-address")
      ? { changeAddress: parsed.options.get("change-address") as string }
      : {}),
    ...(parsed.options.has("flags")
      ? { flags: parseRequiredByte(parsed.options.get("flags"), "flags") }
      : {}),
    ...(parsed.options.has("out-dir") ? { outDir: parsed.options.get("out-dir") as string } : {})
  });

  console.log(JSON.stringify(result, null, 2));
}

async function submitSaleTransferCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const prevStateTxid = parsed.options.get("prev-state-txid");
  const newOwnerPubkey = parsed.options.get("new-owner-pubkey");
  const ownerPrivateKeyHex = parsed.options.get("owner-private-key-hex");
  const sellerPaymentAddress = parsed.options.get("seller-payment-address");
  const sellerInputs = (parsed.multiOptions.get("seller-input") ?? []).map(parseFundingInputDescriptor);
  const buyerInputs = (parsed.multiOptions.get("buyer-input") ?? []).map(parseFundingInputDescriptor);
  const wifs = parsed.multiOptions.get("wif") ?? [];

  if (!prevStateTxid) {
    throw new Error("submit-sale-transfer requires --prev-state-txid");
  }

  if (!newOwnerPubkey) {
    throw new Error("submit-sale-transfer requires --new-owner-pubkey");
  }

  if (!ownerPrivateKeyHex) {
    throw new Error("submit-sale-transfer requires --owner-private-key-hex");
  }

  if (!sellerPaymentAddress) {
    throw new Error("submit-sale-transfer requires --seller-payment-address");
  }

  if (sellerInputs.length === 0) {
    throw new Error("submit-sale-transfer requires at least one --seller-input");
  }

  if (buyerInputs.length === 0) {
    throw new Error("submit-sale-transfer requires at least one --buyer-input");
  }

  if (wifs.length === 0) {
    throw new Error("submit-sale-transfer requires at least one --wif");
  }

  const network = parseNetwork(parsed.options.get("network"));
  const expectedChain = parseNetwork(parsed.options.get("expected-chain"));
  const target = resolveRemoteChainTarget({
    rpcUrl: parsed.options.get("rpc-url"),
    rpcUsername: parsed.options.get("rpc-username"),
    rpcPassword: parsed.options.get("rpc-password"),
    esploraBaseUrl: parsed.options.get("base-url"),
    expectedChain
  });

  const result = await submitSaleTransfer({
    prevStateTxid,
    ownerPrivateKeyHex,
    newOwnerPubkey,
    sellerInputs,
    buyerInputs,
    sellerPaymentSats: parseRequiredBigInt(
      parsed.options.get("seller-payment-sats"),
      "seller-payment-sats"
    ),
    sellerPaymentAddress,
    feeSats: parseRequiredBigInt(parsed.options.get("fee-sats"), "fee-sats"),
    network,
    expectedChain,
    rpc: target.rpc,
    esplora: target.esplora,
    wifs,
    ...(parsed.options.has("seller-change-address")
      ? { sellerChangeAddress: parsed.options.get("seller-change-address") as string }
      : {}),
    ...(parsed.options.has("buyer-change-address")
      ? { buyerChangeAddress: parsed.options.get("buyer-change-address") as string }
      : {}),
    ...(parsed.options.has("flags")
      ? { flags: parseRequiredByte(parsed.options.get("flags"), "flags") }
      : {}),
    ...(parsed.options.has("out-dir") ? { outDir: parsed.options.get("out-dir") as string } : {})
  });

  console.log(JSON.stringify(result, null, 2));
}

async function submitImmatureSaleTransferCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const bondInputSpec = parsed.options.get("bond-input");
  const prevStateTxid = parsed.options.get("prev-state-txid");
  const newOwnerPubkey = parsed.options.get("new-owner-pubkey");
  const ownerPrivateKeyHex = parsed.options.get("owner-private-key-hex");
  const sellerPayoutAddress = parsed.options.get("seller-payout-address");
  const bondAddress = parsed.options.get("bond-address");
  const sellerInputs = (parsed.multiOptions.get("seller-input") ?? []).map(parseFundingInputDescriptor);
  const buyerInputs = (parsed.multiOptions.get("buyer-input") ?? []).map(parseFundingInputDescriptor);
  const wifs = parsed.multiOptions.get("wif") ?? [];

  if (!bondInputSpec) {
    throw new Error("submit-immature-sale-transfer requires --bond-input");
  }

  if (!prevStateTxid) {
    throw new Error("submit-immature-sale-transfer requires --prev-state-txid");
  }

  if (!newOwnerPubkey) {
    throw new Error("submit-immature-sale-transfer requires --new-owner-pubkey");
  }

  if (!ownerPrivateKeyHex) {
    throw new Error("submit-immature-sale-transfer requires --owner-private-key-hex");
  }

  if (!sellerPayoutAddress) {
    throw new Error("submit-immature-sale-transfer requires --seller-payout-address");
  }

  if (!bondAddress) {
    throw new Error("submit-immature-sale-transfer requires --bond-address");
  }

  if (buyerInputs.length === 0) {
    throw new Error("submit-immature-sale-transfer requires at least one --buyer-input");
  }

  if (wifs.length === 0) {
    throw new Error("submit-immature-sale-transfer requires at least one --wif");
  }

  const network = parseNetwork(parsed.options.get("network"));
  const expectedChain = parseNetwork(parsed.options.get("expected-chain"));
  const target = resolveRemoteChainTarget({
    rpcUrl: parsed.options.get("rpc-url"),
    rpcUsername: parsed.options.get("rpc-username"),
    rpcPassword: parsed.options.get("rpc-password"),
    esploraBaseUrl: parsed.options.get("base-url"),
    expectedChain
  });

  const result = await submitImmatureSaleTransfer({
    prevStateTxid,
    ownerPrivateKeyHex,
    newOwnerPubkey,
    successorBondVout: parseRequiredByte(
      parsed.options.get("successor-bond-vout"),
      "successor-bond-vout"
    ),
    successorBondSats: parseRequiredBigInt(
      parsed.options.get("successor-bond-sats"),
      "successor-bond-sats"
    ),
    currentBondInput: parseFundingInputDescriptor(bondInputSpec),
    ...(sellerInputs.length === 0 ? {} : { sellerInputs }),
    buyerInputs,
    salePriceSats: parseRequiredBigInt(parsed.options.get("sale-price-sats"), "sale-price-sats"),
    sellerPayoutAddress,
    feeSats: parseRequiredBigInt(parsed.options.get("fee-sats"), "fee-sats"),
    network,
    expectedChain,
    rpc: target.rpc,
    esplora: target.esplora,
    wifs,
    bondAddress,
    ...(parsed.options.has("buyer-change-address")
      ? { buyerChangeAddress: parsed.options.get("buyer-change-address") as string }
      : {}),
    ...(parsed.options.has("flags")
      ? { flags: parseRequiredByte(parsed.options.get("flags"), "flags") }
      : {}),
    ...(parsed.options.has("out-dir") ? { outDir: parsed.options.get("out-dir") as string } : {})
  });

  console.log(JSON.stringify(result, null, 2));
}

async function signValueRecordCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const name = parsed.options.get("name");
  const ownerPrivateKeyHex = parsed.options.get("owner-private-key-hex");

  if (!name) {
    throw new Error("sign-value-record requires --name");
  }

  if (!ownerPrivateKeyHex) {
    throw new Error("sign-value-record requires --owner-private-key-hex");
  }

  const record = createSignedValueRecord({
    name,
    ownerPrivateKeyHex,
    sequence: parseRequiredInteger(parsed.options.get("sequence"), "sequence"),
    valueType: parseRequiredByte(parsed.options.get("value-type"), "value-type"),
    ...(parsed.options.has("payload-utf8")
      ? { payloadUtf8: parsed.options.get("payload-utf8") as string }
      : {}),
    ...(parsed.options.has("payload-hex")
      ? { payloadHex: parsed.options.get("payload-hex") as string }
      : {})
  });

  await maybeWriteJsonFile(parsed.options.get("write"), record);
  console.log(JSON.stringify(record, null, 2));
}

async function publishValueRecordCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const recordPath = parsed.positionals[0];

  if (!recordPath) {
    throw new Error("publish-value-record requires a path to a signed value record JSON file");
  }

  const valueRecord = await loadSignedValueRecord(recordPath);
  const result = await publishValueRecord({
    valueRecord,
    ...(parsed.options.has("resolver-url")
      ? { resolverUrl: parsed.options.get("resolver-url") as string }
      : {})
  });

  console.log(JSON.stringify(result, null, 2));
}

async function claimPlanCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const name = parsed.positionals[0] ?? parsed.options.get("name");

  if (!name) {
    throw new Error("claim-plan requires a name");
  }

  try {
    const result = await fetchClaimPlan({
      name,
      ...(parsed.options.has("resolver-url")
        ? { resolverUrl: parsed.options.get("resolver-url") as string }
        : {})
    });

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof ResolverHttpError) {
      console.log(JSON.stringify(error.payload, null, 2));
      process.exitCode = 1;
      return;
    }

    throw error;
  }
}

async function getNameCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const name = parsed.positionals[0] ?? parsed.options.get("name");

  if (!name) {
    throw new Error("get-name requires a name");
  }

  try {
    const result = await fetchNameRecord({
      name,
      ...(parsed.options.has("resolver-url")
        ? { resolverUrl: parsed.options.get("resolver-url") as string }
        : {})
    });

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof ResolverHttpError) {
      console.log(JSON.stringify(error.payload, null, 2));
      process.exitCode = 1;
      return;
    }

    throw error;
  }
}

async function getNameActivityCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const name = parsed.positionals[0] ?? parsed.options.get("name");

  if (!name) {
    throw new Error("get-name-activity requires a name");
  }

  try {
    const result = await fetchNameActivity({
      name,
      ...(parsed.options.has("resolver-url")
        ? { resolverUrl: parsed.options.get("resolver-url") as string }
        : {}),
      ...(parsed.options.has("limit")
        ? { limit: parseRequiredInteger(parsed.options.get("limit"), "limit") }
        : {})
    });

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof ResolverHttpError) {
      console.log(JSON.stringify(error.payload, null, 2));
      process.exitCode = 1;
      return;
    }

    throw error;
  }
}

async function getValueCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const name = parsed.positionals[0] ?? parsed.options.get("name");

  if (!name) {
    throw new Error("get-value requires a name");
  }

  try {
    const result = await fetchNameValueRecord({
      name,
      ...(parsed.options.has("resolver-url")
        ? { resolverUrl: parsed.options.get("resolver-url") as string }
        : {})
    });

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof ResolverHttpError) {
      console.log(JSON.stringify(error.payload, null, 2));
      process.exitCode = 1;
      return;
    }

    throw error;
  }
}

async function getTxCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);
  const txid = parsed.positionals[0] ?? parsed.options.get("txid");

  if (!txid) {
    throw new Error("get-tx requires a txid");
  }

  try {
    const result = await fetchTransactionProvenance({
      txid,
      ...(parsed.options.has("resolver-url")
        ? { resolverUrl: parsed.options.get("resolver-url") as string }
        : {})
    });

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    if (error instanceof ResolverHttpError) {
      console.log(JSON.stringify(error.payload, null, 2));
      process.exitCode = 1;
      return;
    }

    throw error;
  }
}

async function listActivityCommand(args: readonly string[]): Promise<void> {
  const parsed = parseOptions(args);

  try {
    const result = await fetchRecentActivity({
      ...(parsed.options.has("resolver-url")
        ? { resolverUrl: parsed.options.get("resolver-url") as string }
        : {}),
      ...(parsed.options.has("limit")
        ? { limit: parseRequiredInteger(parsed.options.get("limit"), "limit") }
        : {})
    });

    console.log(JSON.stringify({ activity: result }, null, 2));
  } catch (error) {
    if (error instanceof ResolverHttpError) {
      console.log(JSON.stringify(error.payload, null, 2));
      process.exitCode = 1;
      return;
    }

    throw error;
  }
}

async function loadClaimPackage(filePath: string): Promise<ReturnType<typeof parseClaimPackage>> {
  const resolvedPath = resolve(process.cwd(), filePath);
  const raw = await readFile(resolvedPath, "utf8");
  return parseClaimPackage(JSON.parse(raw));
}

async function loadBatchClaimPackage(
  filePath: string
): Promise<ReturnType<typeof parseBatchClaimPackage>> {
  const resolvedPath = resolve(process.cwd(), filePath);
  const raw = await readFile(resolvedPath, "utf8");
  return parseBatchClaimPackage(JSON.parse(raw));
}

async function loadSignedArtifacts(filePath: string) {
  const resolvedPath = resolve(process.cwd(), filePath);
  const raw = await readFile(resolvedPath, "utf8");
  return parseSignedArtifactsFile(JSON.parse(raw));
}

async function loadJsonFile(filePath: string): Promise<unknown> {
  const primaryPath = resolve(process.cwd(), filePath);

  try {
    const raw = await readFile(primaryPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    const initCwd = process.env.INIT_CWD;

    if (
      !(error instanceof Error && "code" in error && error.code === "ENOENT") ||
      !initCwd ||
      resolve(initCwd) === process.cwd()
    ) {
      throw error;
    }

    const fallbackPath = resolve(initCwd, filePath);
    const raw = await readFile(fallbackPath, "utf8");
    return JSON.parse(raw);
  }
}

async function loadReservedAuctionPolicy(filePath: string | undefined): Promise<SerializedReservedAuctionPolicy> {
  if (!filePath) {
    throw new Error("--policy requires a path to a reserved auction policy JSON file");
  }

  return loadJsonFile(filePath) as Promise<SerializedReservedAuctionPolicy>;
}

function extractReservedAuctionScenarioInput(input: unknown): unknown {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return input;
  }

  const record = input as Record<string, unknown>;
  return "scenario" in record ? record.scenario : input;
}

async function loadExperimentalAnnexRevealEnvelope(filePath: string) {
  const resolvedPath = resolve(process.cwd(), filePath);
  const raw = await readFile(resolvedPath, "utf8");
  return parseExperimentalAnnexRevealEnvelope(JSON.parse(raw));
}

async function loadSignedExperimentalAnnexRevealEnvelope(filePath: string) {
  const resolvedPath = resolve(process.cwd(), filePath);
  const raw = await readFile(resolvedPath, "utf8");
  return parseSignedExperimentalAnnexRevealEnvelope(JSON.parse(raw));
}

async function writeBatchClaimPackagesDir(
  directoryPath: string | undefined,
  claimPackages: ReadonlyArray<ReturnType<typeof parseBatchClaimPackage>>
): Promise<void> {
  if (!directoryPath) {
    return;
  }

  const resolvedDirectory = resolve(process.cwd(), directoryPath);
  await mkdir(resolvedDirectory, { recursive: true });

  await Promise.all(
    claimPackages.map(async (claimPackage, index) => {
      const filePath = join(
        resolvedDirectory,
        `${String(index + 1).padStart(2, "0")}-${claimPackage.name}.json`
      );
      await writeFile(filePath, JSON.stringify(claimPackage, null, 2) + "\n", "utf8");
    })
  );
}

function parseOptions(args: readonly string[]): {
  readonly positionals: string[];
  readonly options: Map<string, string>;
  readonly multiOptions: Map<string, string[]>;
} {
  const positionals: string[] = [];
  const options = new Map<string, string>();
  const multiOptions = new Map<string, string[]>();

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (!current?.startsWith("--")) {
      positionals.push(current ?? "");
      continue;
    }

    const key = current.slice(2);
    const value = args[index + 1];

    if (!value || value.startsWith("--")) {
      if (key === "once") {
        options.set(key, "true");
        continue;
      }

      throw new Error(`missing value for --${key}`);
    }

    if (
      key === "input" ||
      key === "wif" ||
      key === "commit-input" ||
      key === "reveal-input" ||
      key === "seller-input" ||
      key === "buyer-input"
    ) {
      multiOptions.set(key, [...(multiOptions.get(key) ?? []), value]);
    } else {
      options.set(key, value);
    }

    index += 1;
  }

  return {
    positionals,
    options,
    multiOptions
  };
}

function parseRequiredBigInt(value: string | undefined, label: string): bigint {
  if (!value) {
    throw new Error(`--${label} is required`);
  }

  const parsed = BigInt(value);
  if (parsed < 0n) {
    throw new Error(`--${label} must be non-negative`);
  }

  return parsed;
}

function parseRequiredByte(value: string | undefined, label: string): number {
  if (!value) {
    throw new Error(`--${label} is required`);
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 0xff) {
    throw new Error(`--${label} must be an integer between 0 and 255`);
  }

  return parsed;
}

function parseRequiredInteger(value: string | undefined, label: string): number {
  if (value === undefined) {
    throw new Error(`--${label} is required`);
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`--${label} must be a non-negative safe integer`);
  }

  return parsed;
}

function parseOptionalInteger(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`invalid integer value: ${value}`);
  }

  return parsed;
}

function parseNetwork(value: string | undefined): GnsCliNetwork {
  if (value === undefined) {
    return "signet";
  }

  if (value === "main" || value === "signet" || value === "testnet" || value === "regtest") {
    return value;
  }

  throw new Error("--network must be one of main, signet, testnet, regtest");
}

function parseWalletDerivationOptions(parsed: {
  readonly options: Map<string, string>;
}): WalletDerivationDescriptor | null {
  const masterFingerprint = parsed.options.get("wallet-master-fingerprint");
  const accountXpub = parsed.options.get("wallet-account-xpub");
  const accountDerivationPath = parsed.options.get("wallet-account-path");

  if (!masterFingerprint && !accountXpub && !accountDerivationPath) {
    return null;
  }

  if (!masterFingerprint || !accountXpub || !accountDerivationPath) {
    throw new Error(
      "--wallet-master-fingerprint, --wallet-account-xpub, and --wallet-account-path must be provided together"
    );
  }

  if (!/^[0-9a-fA-F]{8}$/.test(masterFingerprint)) {
    throw new Error("--wallet-master-fingerprint must be 4-byte hex");
  }

  return {
    masterFingerprint: masterFingerprint.toLowerCase(),
    accountXpub,
    accountDerivationPath,
    ...(parsed.options.has("wallet-scan-limit")
      ? { scanLimit: parseRequiredInteger(parsed.options.get("wallet-scan-limit"), "wallet-scan-limit") }
      : {})
  };
}

function formatSats(value: string): string {
  const sats = BigInt(value);
  return `₿${sats.toLocaleString("en-US")} (${formatBtcDecimal(sats)} BTC)`;
}

function formatBtcDecimal(sats: bigint): string {
  const whole = sats / 100_000_000n;
  const fractional = (sats % 100_000_000n).toString().padStart(8, "0").replace(/0+$/g, "");
  return fractional === "" ? whole.toString() : `${whole}.${fractional}`;
}

function printUsage(): void {
  console.log(`${PRODUCT_NAME} CLI`);
  console.log("");
  console.log("Human-facing amounts use integer bitcoin notation alongside the conventional BTC equivalent here; for example, ₿50,000 (0.0005 BTC).");
  console.log("Legacy amount flags keep their *-sats names for compatibility.");
  console.log("");
  console.log("Commands:");
  console.log("  inspect-claim-package <path>");
  console.log("    Validate and summarize a downloaded claim package JSON file");
  console.log("");
  console.log("  inspect-batch-claim-package <path>");
  console.log("    Validate and summarize a downloaded reveal-ready batch claim package JSON file");
  console.log("");
  console.log("  inspect-transfer-package <path>");
  console.log("    Validate and summarize a downloaded transfer package JSON file");
  console.log("");
  console.log("  create-claim-package <name> --owner-pubkey <hex32> [--nonce-hex <hex8>] [--bond-vout <0-255>] [--bond-destination <addr>] [--change-destination <addr>] [--commit-txid <txid>] [--write <path>]");
  console.log("    Create a claim package directly from the CLI for terminal-only claim flows");
  console.log("");
  console.log("  generate-live-account [--network signet|testnet|regtest|main] [--write <path>]");
  console.log("    Generate a fresh owner key plus a witnesspubkeyhash funding address for live prototype testing");
  console.log("");
  console.log("  build-commit-artifacts <claim-package> --input <txid:vout:valueSats:address[:derivationPath]> [--input ...] --fee-sats <amount> [--network signet|testnet|regtest|main] [--bond-address <addr>] [--change-address <addr>] [--wallet-master-fingerprint <hex8> --wallet-account-xpub <xpub> --wallet-account-path <path> [--wallet-scan-limit <n>]] [--write <path>] [--write-package <path>]");
  console.log("    Build unsigned commit transaction artifacts and emit a reveal-ready claim package");
  console.log("");
  console.log("  build-batch-commit-artifacts <claim-package> [<claim-package> ...] --input <txid:vout:valueSats:address[:derivationPath]> [--input ...] --fee-sats <amount> [--proof-chunk-bytes <n>] [--network signet|testnet|regtest|main] [--change-address <addr>] [--wallet-master-fingerprint <hex8> --wallet-account-xpub <xpub> --wallet-account-path <path> [--wallet-scan-limit <n>]] [--write <path>] [--write-packages-dir <dir>]");
  console.log("    Build one batched ordinary-lane anchor transaction from multiple claim packages and emit reveal-ready batch claim packages");
  console.log("");
  console.log("  build-reveal-artifacts <claim-package> --input <txid:vout:valueSats:address[:derivationPath]> [--input ...] --fee-sats <amount> [--network signet|testnet|regtest|main] [--change-address <addr>] [--wallet-master-fingerprint <hex8> --wallet-account-xpub <xpub> --wallet-account-path <path> [--wallet-scan-limit <n>]] [--write <path>]");
  console.log("    Build unsigned reveal transaction artifacts from a reveal-ready claim package");
  console.log("");
  console.log("  build-batch-reveal-artifacts <batch-claim-package> --input <txid:vout:valueSats:address[:derivationPath]> [--input ...] --fee-sats <amount> [--network signet|testnet|regtest|main] [--change-address <addr>] [--wallet-master-fingerprint <hex8> --wallet-account-xpub <xpub> --wallet-account-path <path> [--wallet-scan-limit <n>]] [--write <path>]");
  console.log("    Build unsigned reveal transaction artifacts from a reveal-ready batch claim package");
  console.log("");
  console.log("  print-reserved-auction-policy [--write <path>]");
  console.log("    Emit the current temporary reserved-lane policy JSON so floors, durations, and timing can be edited outside the code");
  console.log("");
  console.log("  simulate-reserved-auction <scenario-json> [--policy <policy-json>] [--write <path>]");
  console.log("    Run one reserved-lane auction scenario against the temporary policy defaults or a supplied override file");
  console.log("");
  console.log("  build-experimental-annex-reveal-envelope --name <name> --anchor-txid <txid> --bond-vout <0-255> --carrier-prevout <txid:vout:valueSats> --wif <wif> [--network signet|testnet|regtest|main] [--fee-sats <amount>] [--carrier-input-index <n>] [--change-address <addr>] [--annex-proof-hex <hex> | --annex-proof-bytes <n> [--annex-proof-fill-byte <0-255>]] [--write <path>]");
  console.log("    Experimental: build one unsigned Taproot-annex batch reveal envelope from a single carrier input");
  console.log("");
  console.log("  build-experimental-annex-reveal-envelope-from-batch-claim-package <batch-claim-package> --carrier-prevout <txid:vout:valueSats> --wif <wif> [--network signet|testnet|regtest|main] [--fee-sats <amount>] [--carrier-input-index <n>] [--change-address <addr>] [--write <path>]");
  console.log("    Experimental: reuse a real reveal-ready batch claim package so the explicit header carries actual GNS batch reveal semantics and the annex carries the real Merkle proof bytes");
  console.log("");
  console.log("  sign-experimental-annex-reveal-envelope <unsigned-envelope-json> --wif <wif> [--write <path>]");
  console.log("    Experimental: attach an annex-aware Taproot key-path witness and emit a signed annex envelope");
  console.log("");
  console.log("  verify-experimental-annex-reveal-envelope <unsigned-envelope-json> <signed-envelope-json>");
  console.log("    Experimental: re-parse the signed transaction, recover the annex, and verify the envelope commitments");
  console.log("");
  console.log("  build-transfer-artifacts --prev-state-txid <txid> --new-owner-pubkey <hex32> --owner-private-key-hex <hex32> --bond-input <txid:vout:valueSats:address> [--input ...] --successor-bond-vout <0-255> --successor-bond-sats <amount> --fee-sats <amount> --bond-address <addr> [--change-address <addr>] [--flags <0-255>] [--network signet|testnet|regtest|main] [--write <path>]");
  console.log("    Build unsigned gift-transfer artifacts with embedded owner authorization and successor bond output");
  console.log("");
  console.log("  build-immature-sale-transfer-artifacts --prev-state-txid <txid> --new-owner-pubkey <hex32> --owner-private-key-hex <hex32> --bond-input <txid:vout:valueSats:address> [--seller-input <txid:vout:valueSats:address> ...] --buyer-input <txid:vout:valueSats:address> [--buyer-input ...] --successor-bond-vout <0-255> --successor-bond-sats <amount> --sale-price-sats <amount> --seller-payout-address <addr> --fee-sats <amount> --bond-address <addr> [--buyer-change-address <addr>] [--flags <0-255>] [--network signet|testnet|regtest|main] [--write <path>]");
  console.log("    Build unsigned immature-sale transfer artifacts where the buyer funds the successor bond, seller payout, and fee");
  console.log("");
  console.log("  build-sale-transfer-artifacts --prev-state-txid <txid> --new-owner-pubkey <hex32> --owner-private-key-hex <hex32> --seller-input <txid:vout:valueSats:address> [--seller-input ...] --buyer-input <txid:vout:valueSats:address> [--buyer-input ...] --seller-payment-sats <amount> --seller-payment-address <addr> --fee-sats <amount> [--seller-change-address <addr>] [--buyer-change-address <addr>] [--flags <0-255>] [--network signet|testnet|regtest|main] [--write <path>]");
  console.log("    Build unsigned cooperative mature-sale transfer artifacts with explicit seller payment output");
  console.log("");
  console.log("  sign-artifacts <artifacts-json> --wif <wif> [--wif ...] [--write <path>]");
  console.log("    Sign witnesspubkeyhash artifact PSBTs and emit a signed transaction hex payload");
  console.log("");
  console.log("  check-rpc [--rpc-url <url>] [--rpc-username <user>] [--rpc-password <pass>] [--expected-chain signet|testnet|regtest|main]");
  console.log("    Verify that a Bitcoin Core RPC endpoint is reachable and on the expected chain");
  console.log("");
  console.log("  check-esplora [--base-url <url>] [--expected-chain signet]");
  console.log("    Verify that a public Esplora endpoint is reachable and report the current tip");
  console.log("");
  console.log("  check-address --address <addr> [--base-url <url>]");
  console.log("    Inspect one signet address through Esplora and list any visible UTXOs");
  console.log("");
  console.log("  broadcast-transaction <signed-artifacts-json> [--rpc-url <url> --rpc-username <user> --rpc-password <pass> | --base-url <url>] [--expected-chain signet|testnet|regtest|main]");
  console.log("    Broadcast a signed transaction through Bitcoin Core RPC or a compatible Esplora backend");
  console.log("");
  console.log("  watch-and-broadcast-reveal <signed-reveal-artifacts-json> --commit-txid <txid> [--rpc-url <url> --rpc-username <user> --rpc-password <pass> | --base-url <url>] [--expected-chain signet|testnet|regtest|main] [--poll-interval-ms <ms>] [--timeout-ms <ms>]");
  console.log("    Wait for the commit tx to confirm, then broadcast a signed reveal or signed batch reveal automatically via the selected backend");
  console.log("");
  console.log("  enqueue-reveal <signed-reveal-artifacts-json> --commit-txid <txid> [--queue <path>] [--expected-chain signet|testnet|regtest|main]");
  console.log("    Store a signed reveal or signed batch reveal on disk so the watcher can resume it after restarts");
  console.log("");
  console.log("  run-reveal-watcher [--queue <path>] [--rpc-url <url> --rpc-username <user> --rpc-password <pass> | --base-url <url>] [--expected-chain signet|testnet|regtest|main] [--poll-interval-ms <ms>] [--once]");
  console.log("    Process the persisted reveal queue once or continuously using RPC or Esplora");
  console.log("");
  console.log("  submit-claim <claim-package> --commit-input <txid:vout:valueSats:address> [--commit-input ...] --commit-fee-sats <amount> [--reveal-input <txid:vout:valueSats:address> ...] --reveal-fee-sats <amount> --wif <wif> [--wif ...] [--network signet|testnet|regtest|main] [--expected-chain signet|testnet|regtest|main] [--rpc-url <url> --rpc-username <user> --rpc-password <pass> | --base-url <url>] [--bond-address <addr>] [--commit-change-address <addr>] [--reveal-change-address <addr>] [--queue <path>] [--out-dir <dir>]");
  console.log("    Build, sign, broadcast the commit, then queue the signed reveal. If no --reveal-input is supplied, the prototype reuses the commit change output.");
  console.log("");
  console.log("  submit-transfer --prev-state-txid <txid> --new-owner-pubkey <hex32> --owner-private-key-hex <hex32> --bond-input <txid:vout:valueSats:address> [--input ...] --successor-bond-vout <0-255> --successor-bond-sats <amount> --fee-sats <amount> --bond-address <addr> --wif <wif> [--wif ...] [--change-address <addr>] [--flags <0-255>] [--network signet|testnet|regtest|main] [--expected-chain signet|testnet|regtest|main] [--rpc-url <url> --rpc-username <user> --rpc-password <pass> | --base-url <url>] [--out-dir <dir>]");
  console.log("    Build, sign, and broadcast a prototype gift/pre-arranged transfer transaction with a successor bond output");
  console.log("");
  console.log("  submit-immature-sale-transfer --prev-state-txid <txid> --new-owner-pubkey <hex32> --owner-private-key-hex <hex32> --bond-input <txid:vout:valueSats:address> [--seller-input <txid:vout:valueSats:address> ...] --buyer-input <txid:vout:valueSats:address> [--buyer-input ...] --successor-bond-vout <0-255> --successor-bond-sats <amount> --sale-price-sats <amount> --seller-payout-address <addr> --fee-sats <amount> --bond-address <addr> --wif <wif> [--wif ...] [--buyer-change-address <addr>] [--flags <0-255>] [--network signet|testnet|regtest|main] [--expected-chain signet|testnet|regtest|main] [--rpc-url <url> --rpc-username <user> --rpc-password <pass> | --base-url <url>] [--out-dir <dir>]");
  console.log("    Build, sign, and broadcast an immature sale where the buyer funds the successor bond and the seller receives their bond value plus sale price atomically");
  console.log("");
  console.log("  submit-sale-transfer --prev-state-txid <txid> --new-owner-pubkey <hex32> --owner-private-key-hex <hex32> --seller-input <txid:vout:valueSats:address> [--seller-input ...] --buyer-input <txid:vout:valueSats:address> [--buyer-input ...] --seller-payment-sats <amount> --seller-payment-address <addr> --fee-sats <amount> --wif <wif> [--wif ...] [--seller-change-address <addr>] [--buyer-change-address <addr>] [--flags <0-255>] [--network signet|testnet|regtest|main] [--expected-chain signet|testnet|regtest|main] [--rpc-url <url> --rpc-username <user> --rpc-password <pass> | --base-url <url>] [--out-dir <dir>]");
  console.log("    Build, sign, and broadcast a prototype cooperative mature-sale transfer with explicit seller payment output");
  console.log("");
  console.log("  sign-value-record --name <name> --owner-private-key-hex <hex32> --sequence <n> --value-type <0-255> [--payload-utf8 <text> | --payload-hex <hex>] [--write <path>]");
  console.log("    Sign an off-chain value record using the current owner key");
  console.log("");
  console.log("  publish-value-record <value-record-json> [--resolver-url <url>]");
  console.log("    Publish a signed value record to the prototype resolver");
  console.log("");
  console.log("  claim-plan <name> [--resolver-url <url>]");
  console.log("    Fetch the resolver's availability view and claim guidance for one name");
  console.log("");
  console.log("  get-name <name> [--resolver-url <url>]");
  console.log("    Fetch the resolver's current ownership record for one name");
  console.log("");
  console.log("  get-name-activity <name> [--resolver-url <url>] [--limit <n>]");
  console.log("    Fetch recent resolver activity related to one name");
  console.log("");
  console.log("  get-value <name> [--resolver-url <url>]");
  console.log("    Fetch the resolver's current signed off-chain value record for one name");
  console.log("");
  console.log("  list-activity [--resolver-url <url>] [--limit <n>]");
  console.log("    Fetch recent chain activity with parsed Global Name System events and invalidation outcomes");
  console.log("");
  console.log("  get-tx <txid> [--resolver-url <url>]");
  console.log("    Fetch the resolver's stored provenance record for one transaction");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
