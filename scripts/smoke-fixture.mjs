import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const resolverPort = 8799;
const webPort = 3011;
const resolverUrl = `http://127.0.0.1:${resolverPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";

const resolver = startProcess("resolver", ["run", "dev:resolver"], {
  ONT_RESOLVER_PORT: String(resolverPort)
});
const web = startProcess("web", ["run", "dev:web"], {
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
  const alice = await fetchJson(`${webUrl}/api/name/alice`);
  const claimPlan = await fetchJson(`${webUrl}/api/claim-plan/bob`);
  const generatedKey = await fetchJson(`${webUrl}/api/dev-owner-key`);
  const claimDraft = await fetchJson(
    `${webUrl}/api/claim-draft/bob?ownerPubkey=${encodeURIComponent(generatedKey.ownerPubkey)}&nonceHex=0102030405060708&bondVout=0`
  );

  assert(Array.isArray(names.names), "names payload must include an array");
  assert(alice.name === "alice", "fixture lookup should resolve alice");
  assert(claimPlan.name === "bob", "claim plan should normalize bob");
  assert(typeof claimDraft.commitPayloadHex === "string", "claim draft must include commit payload");
  assert(claimDraft.commitPayloadBytes > 0, "claim draft commit payload should have bytes");

  console.log(
    JSON.stringify(
      {
        kind: "ont-fixture-smoke-result",
        ok: true,
        resolverUrl,
        webUrl,
        resolverMode: resolverHealth.syncMode,
        trackedNames: webHealth.stats?.trackedNames ?? null,
        namesVisible: names.names.length,
        aliceStatus: alice.status,
        claimPlanName: claimPlan.name,
        generatedOwnerPubkey: generatedKey.ownerPubkey,
        claimDraftBytes: claimDraft.commitPayloadBytes
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
