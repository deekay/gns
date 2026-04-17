import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { resolve } from "node:path";

const resolverPort = 8801;
const webPort = 3013;
const resolverUrl = `http://127.0.0.1:${resolverPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const batchFixturePath = resolve(process.cwd(), "fixtures/demo-chain-batch.json");

const resolver = startProcess("resolver", ["run", "dev:resolver"], {
  ONT_SOURCE_MODE: "fixture",
  ONT_FIXTURE_PATH: batchFixturePath,
  ONT_RESOLVER_PORT: String(resolverPort)
});
const web = startProcess("web", ["run", "dev:web"], {
  ONT_SOURCE_MODE: "fixture",
  ONT_FIXTURE_PATH: batchFixturePath,
  ONT_WEB_PORT: String(webPort),
  ONT_RESOLVER_PORT: String(resolverPort),
  ONT_WEB_RESOLVER_URL: resolverUrl
});

try {
  const resolverHealth = await waitForJson(
    `${resolverUrl}/health`,
    (payload) => payload?.ok === true
  );
  const webHealth = await waitForJson(
    `${webUrl}/api/health`,
    (payload) => payload?.ok === true
  );
  const names = await fetchJson(`${webUrl}/api/names`);
  const batchAlpha = await fetchJson(`${webUrl}/api/name/batchalpha`);
  const batchBravo = await fetchJson(`${webUrl}/api/name/batchbravo`);
  const batchAlphaActivity = await fetchJson(`${webUrl}/api/name/batchalpha/activity`);
  const anchorTx = await fetchJson(
    `${webUrl}/api/tx/${"c".repeat(64)}`
  );
  const revealTx = await fetchJson(
    `${webUrl}/api/tx/${"d".repeat(64)}`
  );
  const offlineArchitect = await fetchText(`${webUrl}/claim/offline/download`);

  assert(Array.isArray(names.names), "names payload must include an array");
  assert(names.names.some((record) => record.name === "batchalpha"), "names payload should include batchalpha");
  assert(names.names.some((record) => record.name === "batchbravo"), "names payload should include batchbravo");

  assert(batchAlpha.name === "batchalpha", "batchalpha lookup should resolve");
  assert(batchBravo.name === "batchbravo", "batchbravo lookup should resolve");
  assert(batchAlpha.claimCommitTxid === "c".repeat(64), "batchalpha should point back to the batch anchor txid");
  assert(batchAlpha.claimRevealTxid === "d".repeat(64), "batchalpha should point at its batch reveal txid");
  assert(batchAlpha.currentBondVout === 1, "batchalpha should retain its assigned bond vout");
  assert(batchBravo.currentBondVout === 2, "batchbravo should retain its assigned bond vout");

  const activityTypes = new Set(
    (batchAlphaActivity.activity ?? [])
      .flatMap((record) => record.events ?? [])
      .map((event) => String(event.typeName ?? ""))
  );
  assert(activityTypes.has("BATCH_ANCHOR"), "batchalpha activity should include the batch anchor");
  assert(activityTypes.has("BATCH_REVEAL"), "batchalpha activity should include the batch reveal");

  const anchorEvents = anchorTx.events ?? [];
  assert(anchorEvents.length === 1, "batch anchor tx should contain one parsed event");
  assert(anchorEvents[0]?.typeName === "BATCH_ANCHOR", "anchor tx should parse as BATCH_ANCHOR");
  assert(anchorEvents[0]?.validationStatus === "applied", "anchor tx should be applied");
  assert(anchorEvents[0]?.payload?.leafCount === 2, "anchor tx should expose the batch leaf count");

  const revealEvents = revealTx.events ?? [];
  assert(revealEvents.some((event) => event.typeName === "BATCH_REVEAL"), "reveal tx should include BATCH_REVEAL");
  assert(
    revealEvents.some(
      (event) =>
        event.typeName === "REVEAL_PROOF_CHUNK" &&
        event.validationStatus === "ignored"
    ),
    "reveal tx should retain the explicit proof chunk provenance"
  );

  assert(
    offlineArchitect.includes("Batch Commit Builder"),
    "offline architect should expose the batch commit builder"
  );
  assert(
    offlineArchitect.includes("offlineBuildBatchButton"),
    "offline architect batch control should be present"
  );
  assert(
    offlineArchitect.includes("Batch Reveal Builder"),
    "offline architect should expose the batch reveal builder"
  );
  assert(
    offlineArchitect.includes("offlineBuildBatchRevealButton"),
    "offline architect batch reveal control should be present"
  );

  console.log(
    JSON.stringify(
      {
        kind: "ont-batch-fixture-smoke-result",
        ok: true,
        fixturePath: batchFixturePath,
        resolverUrl,
        webUrl,
        resolverMode: resolverHealth.syncMode,
        trackedNames: webHealth.stats?.trackedNames ?? null,
        namesVisible: names.names.length,
        batchAlphaStatus: batchAlpha.status,
        batchBravoStatus: batchBravo.status,
        anchorEventTypes: anchorEvents.map((event) => event.typeName),
        revealEventTypes: revealEvents.map((event) => event.typeName)
      },
      null,
      2
    )
  );
} finally {
  await Promise.allSettled([stopProcess(resolver), stopProcess(web)]);
}

function startProcess(name, args, extraEnv) {
  const child = spawn(npmExecutable, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...extraEnv
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  const stdout = [];
  const stderr = [];
  child.stdout?.on("data", (chunk) => {
    stdout.push(Buffer.from(chunk).toString("utf8"));
  });
  child.stderr?.on("data", (chunk) => {
    stderr.push(Buffer.from(chunk).toString("utf8"));
  });

  child.on("exit", (code, signal) => {
    if (signal === "SIGTERM" || signal === "SIGKILL" || code === 143) {
      return;
    }

    if (code !== 0 && code !== null) {
      const output = [...stdout, ...stderr].join("");
      console.error(`[${name}] exited with code ${code}\n${output}`);
    }
  });

  return {
    name,
    child,
    stdout,
    stderr
  };
}

async function stopProcess(handle) {
  if (handle.child.exitCode !== null) {
    return;
  }

  handle.child.kill("SIGTERM");
  await sleep(300);

  if (handle.child.exitCode === null) {
    handle.child.kill("SIGKILL");
  }
}

async function waitForJson(url, isReady, timeoutMs = 30_000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const payload = await fetchJson(url);
      if (isReady(payload)) {
        return payload;
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(250);
  }

  throw new Error(
    `timed out waiting for ${url}${lastError instanceof Error ? `: ${lastError.message}` : ""}`
  );
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error ?? `request failed for ${url}`);
  }

  return payload;
}

async function fetchText(url) {
  const response = await fetch(url);
  const payload = await response.text();

  if (!response.ok) {
    throw new Error(payload || `request failed for ${url}`);
  }

  return payload;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
