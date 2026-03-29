#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const DATA_DIR = resolve(ROOT, ".data/private-signet-demo");
const OUT_DIR = resolve(DATA_DIR, "artifacts");
const OWNER_PATH = resolve(DATA_DIR, "owner.json");
const RECIPIENT_PATH = resolve(DATA_DIR, "recipient.json");
const PENDING_OWNER_PATH = resolve(DATA_DIR, "pending-owner.json");
const SUMMARY_PATH = resolve(DATA_DIR, "summary.json");

const TSX_BIN = resolve(ROOT, "node_modules/.bin/tsx");
const CLI_ENTRY = "apps/cli/src/index.ts";

const SSH_TARGET =
  process.env.GNS_PRIVATE_SIGNET_SSH_TARGET
  ?? process.env.GNS_SSH_TARGET
  ?? "";
const SSH_KEY =
  process.env.GNS_PRIVATE_SIGNET_SSH_KEY
  ?? process.env.GNS_SSH_KEY
  ?? "";
const SSH_SOCKET =
  process.env.GNS_PRIVATE_SIGNET_SSH_SOCKET
  ?? "/tmp/gns-private-signet.sock";
const REMOTE_RPC_PORT = Number.parseInt(
  process.env.GNS_PRIVATE_SIGNET_REMOTE_RPC_PORT
    ?? "39332",
  10
);
const REMOTE_RESOLVER_PORT = Number.parseInt(
  process.env.GNS_PRIVATE_SIGNET_REMOTE_RESOLVER_PORT
    ?? "8788",
  10
);
const LOCAL_RPC_PORT = Number.parseInt(
  process.env.GNS_PRIVATE_SIGNET_LOCAL_RPC_PORT
    ?? "39342",
  10
);
const LOCAL_RESOLVER_PORT = Number.parseInt(
  process.env.GNS_PRIVATE_SIGNET_LOCAL_RESOLVER_PORT
    ?? "18788",
  10
);
const RPC_USERNAME =
  process.env.GNS_PRIVATE_SIGNET_RPC_USERNAME
  ?? "gnsrpcprivate";

const COMMIT_FEE_SATS = 1_000n;
const REVEAL_FEE_SATS = 500n;
const TRANSFER_FEE_SATS = 1_000n;
const REQUIRED_BOND_SATS = 50_000n;
const FUNDING_SATS = 400_000n;
const MATURITY_BLOCKS = Number.parseInt(
  process.env.GNS_PRIVATE_SIGNET_TEST_MATURITY_BLOCKS
    ?? "12",
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

  const owner = await ensureAccount(OWNER_PATH);
  const recipient = await ensureAccount(RECIPIENT_PATH);
  const pendingOwner = await ensureAccount(PENDING_OWNER_PATH);
  const rpcPassword = await getRemotePrivateRpcPassword();

  await openTunnel();

  try {
    await waitForResolver();

    const suffix = Date.now().toString(36).slice(-6);
    const names = {
      mature: `pmat${suffix}`,
      value: `pval${suffix}`,
      gift: `pgft${suffix}`,
      immatureSale: `psal${suffix}`,
      invalid: `pinv${suffix}`,
      fresh: `pimm${suffix}`,
      pending: `ppnd${suffix}`
    };

    const summary = {
      kind: "gns-private-signet-demo-summary",
      startedAt: new Date().toISOString(),
      rpcUrl: localRpcUrl(),
      resolverUrl: resolverUrl(),
      names,
      steps: []
    };

    await fundAddress(owner.fundingAddress, FUNDING_SATS);
    await fundAddress(owner.fundingAddress, FUNDING_SATS);
    await fundAddress(owner.fundingAddress, FUNDING_SATS);
    await fundAddress(pendingOwner.fundingAddress, FUNDING_SATS);

    const matureClaim = await claimName({
      name: names.mature,
      account: owner,
      rpcPassword,
      outDir: join(OUT_DIR, names.mature)
    });
    summary.steps.push({ step: "claim_mature", result: matureClaim });

    const valueClaim = await claimName({
      name: names.value,
      account: owner,
      rpcPassword,
      outDir: join(OUT_DIR, names.value)
    });
    summary.steps.push({ step: "claim_value", result: valueClaim });

    const giftClaim = await claimName({
      name: names.gift,
      account: owner,
      rpcPassword,
      outDir: join(OUT_DIR, names.gift)
    });
    summary.steps.push({ step: "claim_gift", result: giftClaim });

    const immatureSaleClaim = await claimName({
      name: names.immatureSale,
      account: owner,
      rpcPassword,
      outDir: join(OUT_DIR, names.immatureSale)
    });
    summary.steps.push({ step: "claim_immature_sale", result: immatureSaleClaim });

    const signedValue = await cliJson([
      "sign-value-record",
      "--name",
      names.value,
      "--owner-private-key-hex",
      owner.ownerPrivateKeyHex,
      "--sequence",
      "1",
      "--value-type",
      "2",
      "--payload-utf8",
      `https://globalnamesystem.org/names/${names.value}`,
      "--write",
      join(OUT_DIR, `${names.value}-value.json`)
    ]);
    const publishedValue = await cliJson([
      "publish-value-record",
      join(OUT_DIR, `${names.value}-value.json`),
      "--resolver-url",
      resolverUrl()
    ]);
    summary.steps.push({ step: "publish_value", signedValue, publishedValue });

    const giftFeeUtxo = await fundAddress(owner.fundingAddress, 20_000n);
    const giftRecord = await cliJson(["get-name", names.gift, "--resolver-url", resolverUrl()]);
    const transferResult = await cliJson([
      "submit-transfer",
      "--prev-state-txid",
      giftRecord.lastStateTxid,
      "--new-owner-pubkey",
      recipient.ownerPubkey,
      "--owner-private-key-hex",
      owner.ownerPrivateKeyHex,
      "--bond-input",
      formatDescriptor({
        txid: giftRecord.currentBondTxid,
        vout: giftRecord.currentBondVout,
        valueSats: BigInt(giftRecord.currentBondValueSats),
        address: owner.fundingAddress
      }),
      "--input",
      formatDescriptor(giftFeeUtxo),
      "--successor-bond-vout",
      "0",
      "--successor-bond-sats",
      giftRecord.currentBondValueSats,
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
      rpcPassword,
      "--out-dir",
      join(OUT_DIR, `${names.gift}-transfer`)
    ]);
    await mineBlocks(1);
    await waitForResolverHeight(await getBlockCount());
    summary.steps.push({ step: "gift_transfer", result: transferResult });

    const transferredGiftRecord = await cliJson(["get-name", names.gift, "--resolver-url", resolverUrl()]);
    const staleGiftValue = await cliJson([
      "sign-value-record",
      "--name",
      names.gift,
      "--owner-private-key-hex",
      owner.ownerPrivateKeyHex,
      "--sequence",
      "1",
      "--value-type",
      "2",
      "--payload-utf8",
      `https://example.invalid/${names.gift}/stale-owner`,
      "--write",
      join(OUT_DIR, `${names.gift}-old-owner-value.json`)
    ]);
    const staleGiftPublish = await postValueRecord(staleGiftValue);
    if (staleGiftPublish.status !== 409 || staleGiftPublish.payload?.error !== "owner_mismatch") {
      throw new Error(`expected old owner value publish for ${names.gift} to fail with owner_mismatch`);
    }

    const currentGiftValueBeforeRecipient = await fetchJson(`${resolverUrl()}/name/${encodeURIComponent(names.gift)}/value`).catch((error) => {
      if (error?.code === "value_not_found") {
        return null;
      }
      throw error;
    });
    if (currentGiftValueBeforeRecipient !== null) {
      throw new Error(`expected ${names.gift} to have no current value before recipient publish`);
    }

    const recipientGiftValue = await cliJson([
      "sign-value-record",
      "--name",
      names.gift,
      "--owner-private-key-hex",
      recipient.ownerPrivateKeyHex,
      "--sequence",
      "0",
      "--value-type",
      "2",
      "--payload-utf8",
      `https://example.invalid/${names.gift}/recipient-owner`,
      "--write",
      join(OUT_DIR, `${names.gift}-new-owner-value.json`)
    ]);
    const recipientGiftPublish = await postValueRecord(recipientGiftValue);
    if (recipientGiftPublish.status !== 201 || recipientGiftPublish.payload?.ok !== true) {
      throw new Error(`expected recipient value publish for ${names.gift} to succeed`);
    }

    const currentGiftValue = await cliJson(["get-value", names.gift, "--resolver-url", resolverUrl()]);
    if (currentGiftValue.ownerPubkey !== recipient.ownerPubkey) {
      throw new Error(`expected ${names.gift} current value owner to match recipient after transfer`);
    }
    if (currentGiftValue.payloadHex !== Buffer.from(`https://example.invalid/${names.gift}/recipient-owner`, "utf8").toString("hex")) {
      throw new Error(`expected ${names.gift} current value payload to match recipient publish`);
    }
    summary.steps.push({
      step: "gift_transfer_value_handoff",
      result: {
        record: transferredGiftRecord,
        stalePublish: staleGiftPublish.payload,
        recipientPublish: recipientGiftPublish.payload,
        currentValue: currentGiftValue
      }
    });

    const immatureSaleRecord = await cliJson(["get-name", names.immatureSale, "--resolver-url", resolverUrl()]);
    const immatureSaleBuyerFunding = await fundAddress(
      recipient.fundingAddress,
      BigInt(immatureSaleRecord.currentBondValueSats) + 40_000n
    );
    const immatureSaleTransferResult = await cliJson([
      "submit-immature-sale-transfer",
      "--prev-state-txid",
      immatureSaleRecord.lastStateTxid,
      "--new-owner-pubkey",
      recipient.ownerPubkey,
      "--owner-private-key-hex",
      owner.ownerPrivateKeyHex,
      "--bond-input",
      formatDescriptor({
        txid: immatureSaleRecord.currentBondTxid,
        vout: immatureSaleRecord.currentBondVout,
        valueSats: BigInt(immatureSaleRecord.currentBondValueSats),
        address: owner.fundingAddress
      }),
      "--buyer-input",
      formatDescriptor(immatureSaleBuyerFunding),
      "--successor-bond-vout",
      "0",
      "--successor-bond-sats",
      immatureSaleRecord.currentBondValueSats,
      "--sale-price-sats",
      "20000",
      "--seller-payout-address",
      owner.fundingAddress,
      "--buyer-change-address",
      recipient.fundingAddress,
      "--fee-sats",
      TRANSFER_FEE_SATS.toString(),
      "--bond-address",
      recipient.fundingAddress,
      "--wif",
      owner.fundingWif,
      "--wif",
      recipient.fundingWif,
      "--network",
      "signet",
      "--expected-chain",
      "signet",
      "--rpc-url",
      localRpcUrl(),
      "--rpc-username",
      RPC_USERNAME,
      "--rpc-password",
      rpcPassword,
      "--out-dir",
      join(OUT_DIR, `${names.immatureSale}-sale`)
    ]);
    await mineBlocks(1);
    await waitForResolverHeight(await getBlockCount());
    summary.steps.push({ step: "immature_sale_transfer", result: immatureSaleTransferResult });

    const invalidClaim = await claimName({
      name: names.invalid,
      account: owner,
      rpcPassword,
      outDir: join(OUT_DIR, names.invalid)
    });
    summary.steps.push({ step: "claim_invalid", result: invalidClaim });

    const invalidFeeUtxo = await fundAddress(owner.fundingAddress, 20_000n);
    const invalidTransferResult = await cliJson([
      "submit-transfer",
      "--prev-state-txid",
      invalidClaim.record.lastStateTxid,
      "--new-owner-pubkey",
      recipient.ownerPubkey,
      "--owner-private-key-hex",
      owner.ownerPrivateKeyHex,
      "--bond-input",
      formatDescriptor({
        txid: invalidClaim.record.currentBondTxid,
        vout: invalidClaim.record.currentBondVout,
        valueSats: BigInt(invalidClaim.record.currentBondValueSats),
        address: owner.fundingAddress
      }),
      "--input",
      formatDescriptor(invalidFeeUtxo),
      "--successor-bond-vout",
      "0",
      "--successor-bond-sats",
      "49000",
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
      rpcPassword,
      "--out-dir",
      join(OUT_DIR, `${names.invalid}-invalid`)
    ]);
    await mineBlocks(1);
    await waitForResolverHeight(await getBlockCount());
    const invalidRecord = await cliJson(["get-name", names.invalid, "--resolver-url", resolverUrl()]);
    if (invalidRecord.status !== "invalid") {
      throw new Error(`expected ${names.invalid} to become invalid, got ${invalidRecord.status}`);
    }
    summary.steps.push({
      step: "invalidate_bond_continuity",
      result: {
        transferTxid: invalidTransferResult.transferTxid,
        record: invalidRecord
      }
    });

    await mineBlocks(MATURITY_BLOCKS);
    await waitForResolverHeight(await getBlockCount());
    summary.steps.push({ step: "advance_to_maturity", blocks: MATURITY_BLOCKS });

    const freshClaim = await claimName({
      name: names.fresh,
      account: owner,
      rpcPassword,
      outDir: join(OUT_DIR, names.fresh)
    });
    summary.steps.push({ step: "claim_fresh", result: freshClaim });

    await mkdir(join(OUT_DIR, names.pending), { recursive: true });
    const pendingClaimPackage = await createClaimPackage({
      name: names.pending,
      account: pendingOwner,
      writePath: join(OUT_DIR, names.pending, `${names.pending}-claim.json`)
    });
    const pendingFunding = await fundAddress(pendingOwner.fundingAddress, FUNDING_SATS);
    const pendingResult = await cliJson([
      "submit-claim",
      pendingClaimPackage.path,
      "--commit-input",
      formatDescriptor(pendingFunding),
      "--commit-fee-sats",
      COMMIT_FEE_SATS.toString(),
      "--reveal-fee-sats",
      REVEAL_FEE_SATS.toString(),
      "--wif",
      pendingOwner.fundingWif,
      "--network",
      "signet",
      "--expected-chain",
      "signet",
      "--rpc-url",
      localRpcUrl(),
      "--rpc-username",
      RPC_USERNAME,
      "--rpc-password",
      rpcPassword,
      "--bond-address",
      pendingOwner.fundingAddress,
      "--commit-change-address",
      pendingOwner.fundingAddress,
      "--reveal-change-address",
      pendingOwner.fundingAddress,
      "--queue",
      join(OUT_DIR, `${names.pending}-queue.json`),
      "--out-dir",
      join(OUT_DIR, `${names.pending}-pending`)
    ]);
    await mineBlocks(1);
    await waitForResolverHeight(await getBlockCount());
    summary.steps.push({ step: "pending_commit", result: pendingResult });

    summary.finalNames = await cliJson(["claim-plan", names.pending, "--resolver-url", resolverUrl()]).catch(() => null);
    summary.visibleNames = await fetchJson(`${resolverUrl()}/names`);
    summary.completedAt = new Date().toISOString();

    await writeFile(SUMMARY_PATH, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await closeTunnel();
  }
}

async function ensureAccount(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return cliJson(["generate-live-account", "--network", "signet", "--write", path]);
  }
}

async function createClaimPackage({ name, account, writePath }) {
  const result = await cliJson([
    "create-claim-package",
    name,
    "--owner-pubkey",
    account.ownerPubkey,
    "--bond-destination",
    account.fundingAddress,
    "--change-destination",
    account.fundingAddress,
    "--write",
    writePath
  ]);

  return {
    ...result,
    path: writePath
  };
}

async function claimName({ name, account, rpcPassword, outDir }) {
  await mkdir(outDir, { recursive: true });
  const claimPackage = await createClaimPackage({
    name,
    account,
    writePath: join(outDir, `${name}-claim.json`)
  });
  const fundingUtxo = await fundAddress(account.fundingAddress, FUNDING_SATS);
  const queuePath = join(outDir, `${name}-queue.json`);

  const result = await cliJson([
    "submit-claim",
    claimPackage.path,
    "--commit-input",
    formatDescriptor(fundingUtxo),
    "--commit-fee-sats",
    COMMIT_FEE_SATS.toString(),
    "--reveal-fee-sats",
    REVEAL_FEE_SATS.toString(),
    "--wif",
    account.fundingWif,
    "--network",
    "signet",
    "--expected-chain",
    "signet",
    "--rpc-url",
    localRpcUrl(),
    "--rpc-username",
    RPC_USERNAME,
    "--rpc-password",
    rpcPassword,
    "--bond-address",
    account.fundingAddress,
    "--commit-change-address",
    account.fundingAddress,
    "--reveal-change-address",
    account.fundingAddress,
    "--queue",
    queuePath,
    "--out-dir",
    outDir
  ]);

  await mineBlocks(1);
  await waitForResolverHeight(await getBlockCount());

  const watcherResult = await cliJson([
    "run-reveal-watcher",
    "--queue",
    queuePath,
    "--rpc-url",
    localRpcUrl(),
    "--rpc-username",
    RPC_USERNAME,
    "--rpc-password",
    rpcPassword,
    "--expected-chain",
    "signet",
    "--once"
  ]);

  await mineBlocks(1);
  await waitForResolverHeight(await getBlockCount());

  const record = await cliJson(["get-name", name, "--resolver-url", resolverUrl()]);

  return {
    name,
    claimPackagePath: claimPackage.path,
    commitTxid: result.commitTxid,
    revealTxid: result.revealTxid,
    watcherResult,
    record
  };
}

async function fundAddress(address, sats) {
  const amountBtc = satsToBtcString(sats);
  const txid = (await runRemote(`gns-private-signet-fund ${shellEscape(address)} ${shellEscape(amountBtc)}`)).trim();
  if (!txid) {
    throw new Error(`private signet funding did not return a txid for ${address}`);
  }

  await waitForResolverHeight(await getBlockCount());
  return await waitForAddressUtxo(txid, address);
}

async function mineBlocks(blocks) {
  await runRemote(`gns-private-signet-mine ${Number.parseInt(String(blocks), 10)}`);
}

async function waitForAddressUtxo(txid, address, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const tx = await rpcCall("getrawtransaction", [txid, true]).catch(() => null);
    if (tx?.vout) {
      const match = tx.vout.find((output) => {
        return output.scriptPubKey?.address === address || output.scriptPubKey?.addresses?.includes(address);
      });
      if (match) {
        return {
          txid,
          vout: match.n,
          valueSats: btcDecimalToSats(match.value),
          address
        };
      }
    }
    await sleep(500);
  }

  throw new Error(`timed out waiting for funded output ${txid} -> ${address}`);
}

async function getBlockCount() {
  return await rpcCall("getblockcount", []);
}

async function waitForResolver() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const health = await fetchJson(`${resolverUrl()}/health`);
      if (health.ok === true) {
        return health;
      }
    } catch {
      // keep polling
    }
    await sleep(1_000);
  }

  throw new Error("private resolver did not become ready in time");
}

async function waitForResolverHeight(targetHeight, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const health = await fetchJson(`${resolverUrl()}/health`);
    if ((health.stats?.currentHeight ?? -1) >= targetHeight) {
      return health;
    }
    await sleep(1_000);
  }

  throw new Error(`resolver did not reach height ${targetHeight}`);
}

async function rpcCall(method, params) {
  const response = await fetch(localRpcUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${Buffer.from(`${RPC_USERNAME}:${await getRemotePrivateRpcPassword()}`).toString("base64")}`
    },
    body: JSON.stringify({
      jsonrpc: "1.0",
      id: method,
      method,
      params
    })
  });

  if (!response.ok) {
    throw new Error(`rpc ${method} failed with http ${response.status}`);
  }

  const payload = await response.json();
  if (payload.error) {
    throw new Error(`rpc ${method} failed: ${payload.error.message ?? JSON.stringify(payload.error)}`);
  }

  return payload.result;
}

let cachedRpcPassword = null;

async function getRemotePrivateRpcPassword() {
  if (cachedRpcPassword) {
    return cachedRpcPassword;
  }

  cachedRpcPassword = (await runRemote(`awk -F= '/^GNS_BITCOIN_RPC_PASSWORD=/{print $2}' /etc/gns/gns-private.env`)).trim();
  if (!cachedRpcPassword) {
    throw new Error("unable to read private signet RPC password from VPS");
  }

  return cachedRpcPassword;
}

async function openTunnel() {
  await closeTunnel().catch(() => {});
  await runCommand("ssh", [
    ...sshIdentityArgs(),
    "-o",
    "ExitOnForwardFailure=yes",
    "-M",
    "-S",
    SSH_SOCKET,
    "-fnNT",
    "-L",
    `${LOCAL_RPC_PORT}:127.0.0.1:${REMOTE_RPC_PORT}`,
    "-L",
    `${LOCAL_RESOLVER_PORT}:127.0.0.1:${REMOTE_RESOLVER_PORT}`,
    SSH_TARGET
  ]);
}

async function closeTunnel() {
  await runCommand(
    "ssh",
    ["-S", SSH_SOCKET, "-O", "exit", SSH_TARGET],
    { allowFailure: true }
  );
}

async function runRemote(command) {
  const { stdout } = await runCommand("ssh", [...sshIdentityArgs(), SSH_TARGET, command]);
  return stdout;
}

function ensureSshConfig() {
  if (!SSH_TARGET) {
    throw new Error("Set GNS_PRIVATE_SIGNET_SSH_TARGET or GNS_SSH_TARGET before running private-signet-demo.");
  }

  if (SSH_KEY && !existsSync(SSH_KEY)) {
    throw new Error(`SSH key not found: ${SSH_KEY}`);
  }
}

function sshIdentityArgs() {
  return SSH_KEY ? ["-i", SSH_KEY, "-o", "IdentitiesOnly=yes"] : [];
}

async function cliJson(args) {
  const { stdout } = await runCommand(TSX_BIN, [CLI_ENTRY, ...args], {
    cwd: ROOT
  });

  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`unable to parse CLI JSON for ${args[0]}: ${stdout}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.message ?? `request failed: ${response.status}`);
    error.code = payload.error;
    throw error;
  }
  return payload;
}

async function postValueRecord(record) {
  const response = await fetch(`${resolverUrl()}/values`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(record)
  });
  const raw = await response.text();
  return {
    status: response.status,
    payload: raw.length === 0 ? null : JSON.parse(raw)
  };
}

async function runCommand(command, args, options = {}) {
  const { cwd = ROOT, allowFailure = false } = options;

  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code !== 0 && !allowFailure) {
        rejectPromise(
          new Error(`${command} ${args.join(" ")} exited with code ${code}\nstdout:\n${stdout}\nstderr:\n${stderr}`)
        );
        return;
      }

      resolvePromise({ code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

function satsToBtcString(sats) {
  const whole = sats / 100_000_000n;
  const fractional = sats % 100_000_000n;
  return `${whole}.${fractional.toString().padStart(8, "0")}`;
}

function btcDecimalToSats(value) {
  const [whole, fractional = ""] = String(value).split(".");
  const padded = (fractional + "00000000").slice(0, 8);
  return BigInt(whole) * 100_000_000n + BigInt(padded);
}

function formatDescriptor(utxo) {
  return `${utxo.txid}:${utxo.vout}:${utxo.valueSats}:${utxo.address}`;
}

function localRpcUrl() {
  return `http://127.0.0.1:${LOCAL_RPC_PORT}`;
}

function resolverUrl() {
  return `http://127.0.0.1:${LOCAL_RESOLVER_PORT}`;
}

function shellEscape(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
