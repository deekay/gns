#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const DATA_DIR = resolve(ROOT, ".data");
const OWNER_ACCOUNT_PATH = resolve(DATA_DIR, "live-account-2.json");
const RECIPIENT_ACCOUNT_PATH = resolve(DATA_DIR, "live-smoke-recipient.json");
const CLAIM_PACKAGE_PATH = resolve(DATA_DIR, "live-smoke-claim.json");
const VALUE_RECORD_PATH = resolve(DATA_DIR, "live-smoke-value.json");
const SUMMARY_PATH = resolve(DATA_DIR, "live-smoke-summary.json");
const OUT_DIR = resolve(DATA_DIR, "live-smoke-run");

const TSX_BIN = resolve(ROOT, "node_modules/.bin/tsx");
const CLI_ENTRY = "apps/cli/src/index.ts";

const SSH_TARGET = process.env.GNS_SIGNET_SSH_TARGET ?? process.env.GNS_SSH_TARGET ?? "";
const SSH_KEY = process.env.GNS_SIGNET_SSH_KEY ?? process.env.GNS_SSH_KEY ?? "";
const SSH_SOCKET = process.env.GNS_SIGNET_SSH_SOCKET ?? "/tmp/gns-signet-smoke.sock";
const REMOTE_STATUS_PATH =
  process.env.GNS_SIGNET_REMOTE_STATUS_PATH
  ?? "/var/lib/gns/live-smoke-summary.json";
const PUBLISH_REMOTE_STATUS =
  (process.env.GNS_SIGNET_PUBLISH_REMOTE_STATUS) !== "0";
const REMOTE_RPC_PORT = Number.parseInt(
  process.env.GNS_SIGNET_REMOTE_RPC_PORT ?? "38332",
  10
);
const REMOTE_RESOLVER_PORT = Number.parseInt(
  process.env.GNS_SIGNET_REMOTE_RESOLVER_PORT ?? "8787",
  10
);
const LOCAL_RPC_PORT = Number.parseInt(
  process.env.GNS_SIGNET_LOCAL_RPC_PORT ?? "38343",
  10
);
const LOCAL_RESOLVER_PORT = Number.parseInt(
  process.env.GNS_SIGNET_LOCAL_RESOLVER_PORT ?? "18787",
  10
);
const RPC_USERNAME = process.env.GNS_SIGNET_RPC_USERNAME ?? "gnsrpc";
let cachedRpcPassword = process.env.GNS_SIGNET_RPC_PASSWORD ?? "";
const PUBLIC_API_BASE =
  process.env.GNS_PUBLIC_API_BASE ?? "https://trainhappy.coach/gns/api";
const ESPLORA_BASE =
  process.env.GNS_SIGNET_ESPLORA_BASE ?? "https://mempool.space/signet/api";

const COMMIT_FEE_SATS = 1_000n;
const REVEAL_FEE_SATS = 500n;
const TRANSFER_FEE_SATS = 1_000n;
const REQUIRED_BOND_SATS = 50_000n;
const MIN_CLAIM_FUNDING_SATS = REQUIRED_BOND_SATS + COMMIT_FEE_SATS + REVEAL_FEE_SATS + 5_000n;
const MIN_TRANSFER_FUNDING_SATS = TRANSFER_FEE_SATS + 5_000n;
const WATCH_TIMEOUT_MS = Number.parseInt(
  process.env.GNS_SIGNET_WATCH_TIMEOUT_MS ?? "900000",
  10
);
const WATCH_POLL_MS = Number.parseInt(
  process.env.GNS_SIGNET_WATCH_POLL_MS ?? "15000",
  10
);

void main().catch(async (error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  await closeTunnel();
  process.exit(1);
});

async function main() {
  ensureSshConfig();
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  const owner = await ensureAccount(OWNER_ACCOUNT_PATH);
  const recipient = await ensureAccount(RECIPIENT_ACCOUNT_PATH);
  const requestedName = parseNameArg(process.argv.slice(2));
  const tunnelOpened = await openTunnel();

  try {
    const ownerUtxos = await getAddressUtxos(owner.fundingAddress);
    const ownerAvailableSats = sumUtxos(ownerUtxos);
    const name = requestedName ?? (await pickAvailableName());

    const baseSummary = {
      kind: "gns-live-signet-smoke-summary",
      startedAt: new Date().toISOString(),
      ownerAccountPath: OWNER_ACCOUNT_PATH,
      recipientAccountPath: RECIPIENT_ACCOUNT_PATH,
      ownerFundingAddress: owner.fundingAddress,
      recipientFundingAddress: recipient.fundingAddress,
      publicApiBase: PUBLIC_API_BASE,
      localResolverUrl: localResolverUrl(),
      localRpcUrl: localRpcUrl(),
      sshTarget: SSH_TARGET,
      tunnelOpened,
      name,
      ownerAvailableSats: ownerAvailableSats.toString()
    };

    if (ownerAvailableSats < MIN_CLAIM_FUNDING_SATS) {
      const claimPackage = await createClaimPackage({
        name,
        ownerPubkey: owner.ownerPubkey,
        bondDestination: owner.fundingAddress,
        changeDestination: owner.fundingAddress,
        writePath: CLAIM_PACKAGE_PATH
      });

      const summary = {
        ...baseSummary,
        status: "awaiting_funds",
        message:
          "Live signet smoke flow is ready, but the owner funding address does not yet have enough signet to cover the 50,000 sat bond plus fees.",
        minClaimFundingSats: MIN_CLAIM_FUNDING_SATS.toString(),
        claimPackagePath: CLAIM_PACKAGE_PATH,
        claimPackage
      };
      await saveSummary(summary);
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    const claimPackage = await createClaimPackage({
      name,
      ownerPubkey: owner.ownerPubkey,
      bondDestination: owner.fundingAddress,
      changeDestination: owner.fundingAddress,
      writePath: CLAIM_PACKAGE_PATH
    });

    const claimPlan = await fetchJson(`${localResolverUrl()}/claim-plan/${encodeURIComponent(name)}`);
    if (claimPlan.appearsAvailable !== true) {
      const summary = {
        ...baseSummary,
        status: "name_unavailable",
        message: "Chosen live smoke name is not available on the current resolver view.",
        claimPlan
      };
      await saveSummary(summary);
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    const commitInputs = selectUtxos(ownerUtxos, MIN_CLAIM_FUNDING_SATS);
    const queuePath = resolve(OUT_DIR, "reveal-queue.json");
    const claimResult = await cliJson([
      "submit-claim",
      CLAIM_PACKAGE_PATH,
      ...commitInputs.flatMap((utxo) => ["--commit-input", formatDescriptor(owner.fundingAddress, utxo)]),
      "--commit-fee-sats",
      COMMIT_FEE_SATS.toString(),
      "--reveal-fee-sats",
      REVEAL_FEE_SATS.toString(),
      "--wif",
      owner.fundingWif,
      "--network",
      "signet",
      "--expected-chain",
      "signet",
      "--rpc-url",
      localRpcUrl(),
      "--rpc-username",
      RPC_USERNAME,
      "--rpc-password",
      RPC_PASSWORD,
      "--bond-address",
      owner.fundingAddress,
      "--commit-change-address",
      owner.fundingAddress,
      "--reveal-change-address",
      owner.fundingAddress,
      "--queue",
      queuePath,
      "--out-dir",
      OUT_DIR
    ]);

    let stage = "commit_broadcast";
    let publicNameRecord = await fetchPublicNameMaybe(name);

    const revealWatchResult = await waitForRevealBroadcast(queuePath);
    if (revealWatchResult.broadcastedCount > 0) {
      stage = "reveal_broadcast";
    }

    publicNameRecord = await waitForPublicName(name, WATCH_TIMEOUT_MS);
    stage = "claimed";

    const signedValue = await cliJson([
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
      `https://trainhappy.coach/gns?name=${name}`,
      "--write",
      VALUE_RECORD_PATH
    ]);
    const publishedValue = await cliJson([
      "publish-value-record",
      VALUE_RECORD_PATH,
      "--resolver-url",
      localResolverUrl()
    ]);
    const publicValueRecord = await waitForPublicValue(name, WATCH_TIMEOUT_MS);
    stage = "value_published";

    const refreshedOwnerUtxos = await getAddressUtxos(owner.fundingAddress);
    const bondDescriptor = {
      txid: publicNameRecord.currentBondTxid,
      vout: publicNameRecord.currentBondVout,
      valueSats: BigInt(publicNameRecord.currentBondValueSats)
    };
    const feeUtxo = refreshedOwnerUtxos.find(
      (candidate) =>
        !(candidate.txid === bondDescriptor.txid && candidate.vout === bondDescriptor.vout) &&
        candidate.value >= MIN_TRANSFER_FUNDING_SATS
    );

    if (!feeUtxo) {
      const summary = {
        ...baseSummary,
        status: stage,
        claimResult,
        revealWatchResult,
        publicNameRecord,
        signedValue,
        publishedValue,
        publicValueRecord,
        message:
          "Claim and value publish succeeded, but no extra owner UTXO was available to pay the gift-transfer fee."
      };
      await saveSummary(summary);
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    const transferResult = await cliJson([
      "submit-transfer",
      "--prev-state-txid",
      publicNameRecord.lastStateTxid,
      "--new-owner-pubkey",
      recipient.ownerPubkey,
      "--owner-private-key-hex",
      owner.ownerPrivateKeyHex,
      "--bond-input",
      formatDescriptor(owner.fundingAddress, bondDescriptor),
      "--input",
      formatDescriptor(owner.fundingAddress, feeUtxo),
      "--successor-bond-vout",
      "0",
      "--successor-bond-sats",
      publicNameRecord.currentBondValueSats,
      "--fee-sats",
      TRANSFER_FEE_SATS.toString(),
      "--bond-address",
      recipient.fundingAddress,
      "--change-address",
      owner.fundingAddress,
      "--wif",
      owner.fundingWif,
      "--network",
      "signet",
      "--expected-chain",
      "signet",
      "--rpc-url",
      localRpcUrl(),
      "--rpc-username",
      RPC_USERNAME,
      "--rpc-password",
      RPC_PASSWORD,
      "--out-dir",
      resolve(OUT_DIR, "transfer")
    ]);

    const publicTransferredRecord = await waitForPublicOwner(name, recipient.ownerPubkey, WATCH_TIMEOUT_MS);
    stage = "transferred";

    const summary = {
      ...baseSummary,
      status: stage,
      claimResult,
      revealWatchResult,
      publicNameRecord,
      signedValue,
      publishedValue,
      publicValueRecord,
      transferResult,
      publicTransferredRecord
    };
    await saveSummary(summary);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await closeTunnel();
  }
}

async function ensureAccount(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    const created = await cliJson([
      "generate-live-account",
      "--network",
      "signet",
      "--write",
      filePath
    ]);
    return created;
  }
}

async function createClaimPackage(input) {
  return await cliJson([
    "create-claim-package",
    input.name,
    "--owner-pubkey",
    input.ownerPubkey,
    "--bond-vout",
    "0",
    "--bond-destination",
    input.bondDestination,
    "--change-destination",
    input.changeDestination,
    "--write",
    input.writePath
  ]);
}

async function pickAvailableName() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `live${formatNowCompact()}${randomBytes(2).toString("hex")}`;
    const plan = await fetchJson(`${localResolverUrl()}/claim-plan/${encodeURIComponent(candidate)}`);
    if (plan.appearsAvailable === true) {
      return candidate;
    }
  }

  throw new Error("could not find an available live smoke name after 20 attempts");
}

async function waitForRevealBroadcast(queuePath) {
  const deadline = Date.now() + WATCH_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const result = await cliJson([
      "run-reveal-watcher",
      "--queue",
      queuePath,
      "--expected-chain",
      "signet",
      "--rpc-url",
      localRpcUrl(),
      "--rpc-username",
      RPC_USERNAME,
      "--rpc-password",
      RPC_PASSWORD,
      "--once"
    ]);

    if ((result.broadcastedCount ?? 0) > 0) {
      return result;
    }

    await sleep(WATCH_POLL_MS);
  }

  return {
    kind: "gns-live-signet-reveal-watch-timeout",
    broadcastedCount: 0
  };
}

async function waitForPublicName(name, timeoutMs) {
  return await waitFor(async () => {
    try {
      return await fetchJson(`${PUBLIC_API_BASE}/name/${encodeURIComponent(name)}`);
    } catch (error) {
      if (isNotFound(error)) {
        return false;
      }

      throw error;
    }
  }, timeoutMs, `public name ${name}`);
}

async function waitForPublicOwner(name, ownerPubkey, timeoutMs) {
  return await waitFor(async () => {
    try {
      const record = await fetchJson(`${PUBLIC_API_BASE}/name/${encodeURIComponent(name)}`);
      return record.currentOwnerPubkey === ownerPubkey ? record : false;
    } catch (error) {
      if (isNotFound(error)) {
        return false;
      }

      throw error;
    }
  }, timeoutMs, `public owner update for ${name}`);
}

async function waitForPublicValue(name, timeoutMs) {
  return await waitFor(async () => {
    try {
      return await fetchJson(`${PUBLIC_API_BASE}/name/${encodeURIComponent(name)}/value`);
    } catch (error) {
      if (isNotFound(error)) {
        return false;
      }

      throw error;
    }
  }, timeoutMs, `public value for ${name}`);
}

async function fetchPublicNameMaybe(name) {
  try {
    return await fetchJson(`${PUBLIC_API_BASE}/name/${encodeURIComponent(name)}`);
  } catch (error) {
    if (isNotFound(error)) {
      return null;
    }

    throw error;
  }
}

async function getAddressUtxos(address) {
  const response = await fetch(`${ESPLORA_BASE.replace(/\/$/, "")}/address/${encodeURIComponent(address)}/utxo`);
  if (!response.ok) {
    throw new Error(`failed to fetch signet utxos for ${address}: HTTP ${response.status}`);
  }

  const parsed = await response.json();
  return parsed.map((utxo) => ({
    txid: utxo.txid,
    vout: utxo.vout,
    value: BigInt(utxo.value)
  }));
}

function selectUtxos(utxos, minimum) {
  const sorted = [...utxos].sort((left, right) => Number(right.value - left.value));
  const selected = [];
  let total = 0n;

  for (const utxo of sorted) {
    selected.push(utxo);
    total += utxo.value;
    if (total >= minimum) {
      return selected;
    }
  }

  throw new Error(`address has ${total} sats, but at least ${minimum} sats are required`);
}

function sumUtxos(utxos) {
  return utxos.reduce((sum, utxo) => sum + utxo.value, 0n);
}

function formatDescriptor(address, utxo) {
  return `${utxo.txid}:${utxo.vout}:${utxo.value.toString()}:${address}`;
}

async function openTunnel() {
  await run("ssh", ["-S", SSH_SOCKET, "-O", "exit", SSH_TARGET], { allowFailure: true });
  await run("ssh", [
    ...sshIdentityArgs(),
    "-f",
    "-N",
    "-M",
    "-S",
    SSH_SOCKET,
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    "ExitOnForwardFailure=yes",
    "-L",
    `${LOCAL_RPC_PORT}:127.0.0.1:${REMOTE_RPC_PORT}`,
    "-L",
    `${LOCAL_RESOLVER_PORT}:127.0.0.1:${REMOTE_RESOLVER_PORT}`,
    SSH_TARGET
  ]);
  return true;
}

async function closeTunnel() {
  await run("ssh", ["-S", SSH_SOCKET, "-O", "exit", SSH_TARGET], { allowFailure: true });
}

async function saveSummary(summary) {
  await writeFile(SUMMARY_PATH, JSON.stringify(summary, null, 2) + "\n", "utf8");

  if (!PUBLISH_REMOTE_STATUS) {
    return;
  }

  try {
    await publishRemoteSummary();
  } catch (error) {
    console.warn(
      error instanceof Error
        ? `warning: unable to publish live smoke summary to ${SSH_TARGET}:${REMOTE_STATUS_PATH}: ${error.message}`
        : `warning: unable to publish live smoke summary to ${SSH_TARGET}:${REMOTE_STATUS_PATH}`
    );
  }
}

async function publishRemoteSummary() {
  const remoteDirectory = REMOTE_STATUS_PATH.replace(/\/[^/]+$/, "") || "/";

  await run("ssh", [
    ...sshIdentityArgs(),
    "-S",
    SSH_SOCKET,
    "-o",
    "StrictHostKeyChecking=accept-new",
    SSH_TARGET,
    "mkdir",
    "-p",
    remoteDirectory
  ]);

  await run("scp", [
    ...scpIdentityArgs(),
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    `ControlPath=${SSH_SOCKET}`,
    SUMMARY_PATH,
    `${SSH_TARGET}:${REMOTE_STATUS_PATH}`
  ]);
}

async function cliJson(args) {
  const rpcPassword = await getRpcPassword();
  const result = await run(TSX_BIN, [CLI_ENTRY, ...args], {
    env: {
      ...process.env,
      GNS_BITCOIN_RPC_URL: localRpcUrl(),
      GNS_BITCOIN_RPC_USERNAME: RPC_USERNAME,
      GNS_BITCOIN_RPC_PASSWORD: rpcPassword,
      GNS_RESOLVER_URL: localResolverUrl()
    }
  });
  return JSON.parse(result.stdout);
}

async function fetchJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  const parsed = text.length === 0 ? null : JSON.parse(text);

  if (!response.ok) {
    const error = new Error(
      parsed && typeof parsed.message === "string" ? parsed.message : `HTTP ${response.status}`
    );
    error.status = response.status;
    error.payload = parsed;
    throw error;
  }

  return parsed;
}

function isNotFound(error) {
  return Boolean(error && typeof error === "object" && "status" in error && error.status === 404);
}

async function waitFor(probe, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const value = await probe();
      if (value !== false) {
        return value;
      }
    } catch {
      // keep polling
    }
    await sleep(WATCH_POLL_MS);
  }

  throw new Error(`timed out waiting for ${label}`);
}

function localRpcUrl() {
  return `http://127.0.0.1:${LOCAL_RPC_PORT}`;
}

function localResolverUrl() {
  return `http://127.0.0.1:${LOCAL_RESOLVER_PORT}`;
}

async function getRpcPassword() {
  if (cachedRpcPassword) {
    return cachedRpcPassword;
  }

  const result = await run("ssh", [
    ...sshIdentityArgs(),
    "-o",
    "StrictHostKeyChecking=accept-new",
    SSH_TARGET,
    "awk -F= '/^GNS_BITCOIN_RPC_PASSWORD=/{print $2; exit}' /etc/gns/gns.env"
  ]);
  cachedRpcPassword = result.stdout.trim();
  if (!cachedRpcPassword) {
    throw new Error("unable to read signet RPC password from remote env; set GNS_SIGNET_RPC_PASSWORD if needed");
  }
  return cachedRpcPassword;
}

function ensureSshConfig() {
  if (!SSH_TARGET) {
    throw new Error("Set GNS_SIGNET_SSH_TARGET or GNS_SSH_TARGET before running live-signet-smoke.");
  }

  if (SSH_KEY && !existsSync(SSH_KEY)) {
    throw new Error(`SSH key not found: ${SSH_KEY}`);
  }
}

function sshIdentityArgs() {
  return SSH_KEY ? ["-i", SSH_KEY, "-o", "IdentitiesOnly=yes"] : [];
}

function scpIdentityArgs() {
  return SSH_KEY ? ["-i", SSH_KEY] : [];
}

function formatNowCompact() {
  const now = new Date();
  const parts = [
    String(now.getUTCFullYear()).slice(-2),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0")
  ];
  return parts.join("");
}

function parseNameArg(args) {
  const index = args.indexOf("--name");
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

async function run(command, args, options = {}) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? ROOT,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

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

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
