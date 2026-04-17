import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { chromium } from "playwright";

const fixtureName = "fixturevalue";
const fixtureNonce = 42n;
const ownerPrivateKeyHex = "0000000000000000000000000000000000000000000000000000000000000001";
const ownerPubkey = "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";
const primaryResolverPort = 8803;
const secondaryResolverPort = 8804;
const webPort = 3015;
const primaryResolverUrl = `http://127.0.0.1:${primaryResolverPort}`;
const secondaryResolverUrl = `http://127.0.0.1:${secondaryResolverPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";

let browser;
let tempDir;

try {
  browser = await chromium.launch({
    headless: true
  });
} catch (error) {
  throw new Error(
    `Unable to launch Chromium for website E2E smoke. Run "npm run playwright:install" first.${error instanceof Error ? ` ${error.message}` : ""}`
  );
}

tempDir = await mkdtemp(join(tmpdir(), "ont-e2e-fixture-web-"));
const fixturePath = join(tempDir, "custom-fixture-chain.json");
await writeFile(fixturePath, JSON.stringify(buildFixtureChain(), null, 2) + "\n", "utf8");

const primaryResolver = startProcess("resolver-primary", ["run", "dev:resolver"], {
  ONT_SOURCE_MODE: "fixture",
  ONT_FIXTURE_PATH: fixturePath,
  ONT_VALUE_STORE_PATH: join(tempDir, "resolver-primary-values.json"),
  ONT_RESOLVER_PORT: String(primaryResolverPort)
});
const secondaryResolver = startProcess("resolver-secondary", ["run", "dev:resolver"], {
  ONT_SOURCE_MODE: "fixture",
  ONT_FIXTURE_PATH: fixturePath,
  ONT_VALUE_STORE_PATH: join(tempDir, "resolver-secondary-values.json"),
  ONT_RESOLVER_PORT: String(secondaryResolverPort)
});
const web = startProcess("web", ["run", "dev:web"], {
  ONT_SOURCE_MODE: "fixture",
  ONT_WEB_PORT: String(webPort),
  ONT_WEB_RESOLVER_URL: primaryResolverUrl,
  ONT_WEB_RESOLVER_URLS: `${primaryResolverUrl},${secondaryResolverUrl}`
});

try {
  await waitForJson(`${primaryResolverUrl}/health`, (payload) => payload?.ok === true);
  await waitForJson(`${secondaryResolverUrl}/health`, (payload) => payload?.ok === true);
  await waitForJson(`${webUrl}/api/health`, (payload) => payload?.ok === true);

  const context = await browser.newContext();
  const page = await context.newPage();

  await assertHomePage(page);
  await assertClaimPage(page);
  await assertValuesPage(page);
  await assertAuctionsPage(page);
  await assertOfflineArchitect(page);

  await context.close();

  const primaryHistory = await fetchJson(`${primaryResolverUrl}/name/${fixtureName}/value/history`);
  const secondaryHistory = await fetchJson(`${secondaryResolverUrl}/name/${fixtureName}/value/history`);

  assert(
    primaryHistory.completeToSequence === 2,
    "primary resolver should retain the later single-resolver update"
  );
  assert(
    secondaryHistory.completeToSequence === 1,
    "secondary resolver should remain one update behind after the primary-only publish"
  );

  console.log(
    JSON.stringify(
      {
        kind: "ont-web-e2e-fixture-result",
        ok: true,
        primaryResolverUrl,
        secondaryResolverUrl,
        webUrl,
        checkedFlows: [
          "home-docs-surface",
          "claim-draft-browser-flow",
          "multi-resolver-value-fanout-browser-flow",
          "auction-lab-browser-flow",
          "offline-batch-architect"
        ],
        fixtureName
      },
      null,
      2
    )
  );
} finally {
  await Promise.allSettled([
    browser?.close(),
    stopProcess(primaryResolver),
    stopProcess(secondaryResolver),
    stopProcess(web)
  ]);
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function assertHomePage(page) {
  await page.goto(`${webUrl}/`, {
    waitUntil: "domcontentloaded"
  });

  await waitForVisibleText(page, "Human-Readable Names You Can Actually Own");
  await waitForVisibleText(page, "Choose A Path");
  await waitForVisibleText(page, "Understand ONT");
  await waitForVisibleText(page, "Try The Prototype");
  await waitForVisibleText(page, "Explore The Registry");
  const html = await page.content();
  assert(
    html.includes("/claim/offline") && html.includes("/auctions"),
    "home page should keep the advanced-tool links visible"
  );
}

async function assertClaimPage(page) {
  await page.goto(`${webUrl}/claim`, {
    waitUntil: "domcontentloaded"
  });

  await page.locator("#claimNameInput").waitFor({
    state: "visible",
    timeout: 15_000
  });
  await page.getByRole("button", { name: "Generate Test Key" }).click();
  await page.waitForFunction(() => {
    const input = document.querySelector("#ownerPubkeyInput");
    return input instanceof HTMLInputElement && input.value.length === 64;
  });

  await page.locator("#claimNameInput").fill("browsere2e");
  await page.getByRole("button", { name: "Prepare Draft" }).click();
  await waitForVisibleText(page, "The claim draft is ready.");
  await waitForVisibleText(page, "Commit Payload");

  const backupDisabled = await page.locator("#downloadClaimPackageButton").isDisabled();
  if (backupDisabled) {
    throw new Error("claim draft flow did not enable the backup package download button");
  }
}

async function assertValuesPage(page) {
  await page.goto(`${webUrl}/values?name=${fixtureName}`, {
    waitUntil: "domcontentloaded"
  });

  await page.locator("#valueNameInput").waitFor({
    state: "attached",
    timeout: 15_000
  });
  await page.waitForFunction(() => {
    const result = document.querySelector("#valueLookupResult");
    return result instanceof HTMLElement && (result.textContent ?? "").toLowerCase().includes("fixturevalue");
  });
  await page.waitForFunction(() => {
    const button = document.querySelector("#publishValueFanoutButton");
    return button instanceof HTMLButtonElement && button.hidden === false;
  });
  await page.waitForFunction(() => {
    const note = document.querySelector("#valuePublishModeNote");
    return note instanceof HTMLElement && (note.textContent ?? "").toLowerCase().includes("configured");
  });

  const resultText = (await page.locator("#valueLookupResult").textContent()) ?? "";
  const sequenceHint = (await page.locator("#valueSequenceHint").textContent()) ?? "";
  const modeNote = (await page.locator("#valuePublishModeNote").textContent()) ?? "";
  assert(
    resultText.includes(fixtureName),
    "values page should render the requested claimed name"
  );
  assert(
    sequenceHint.includes("Resolver-visible next sequence:"),
    "values page should expose the resolver-derived next-sequence hint"
  );
  assert(
    resultText.includes("Ownership Ref"),
    "values page should expose the current ownership interval"
  );
  assert(
    resultText.includes("Resolver Comparison") && resultText.includes("No visible value"),
    "values page should show the empty multi-resolver comparison state"
  );
  assert(
    modeNote.toLowerCase().includes("configured"),
    "values page should explain the primary publish versus resolver-set fanout modes"
  );

  await openValueWorkflowSteps(page);
  await page.locator("#valueOwnerPrivateKeyInput").fill(ownerPrivateKeyHex);
  await page.selectOption("#valueTypeInput", "2");
  await page.locator("#valuePayloadInput").fill("https://example.com/fixturevalue/first");
  await page.locator("#valueSignButton").click();
  await page.waitForFunction(() => {
    const result = document.querySelector("#valueSignResult");
    return result instanceof HTMLElement && (result.textContent ?? "").includes("Signed Record Ready");
  });
  await page.locator("#publishValueFanoutButton").click();
  await page.waitForFunction(() => {
    const result = document.querySelector("#valuePublishResult");
    return result instanceof HTMLElement
      && (result.textContent ?? "").includes("Value Published To Resolver Set")
      && (result.textContent ?? "").includes("2/2 accepted");
  });
  await page.waitForFunction(() => {
    const result = document.querySelector("#valueLookupResult");
    return result instanceof HTMLElement
      && (result.textContent ?? "").includes("Consistent")
      && (result.textContent ?? "").includes("Current sequence:")
      && (result.textContent ?? "").includes("1");
  });

  const consistentSequenceHint = (await page.locator("#valueSequenceHint").textContent()) ?? "";
  assert(
    consistentSequenceHint.includes("Resolver-visible next sequence: 2."),
    "values page should suggest the second sequence after the fanout publish"
  );

  await openValueWorkflowSteps(page);
  await page.locator("#valuePayloadInput").fill("https://example.com/fixturevalue/second");
  await page.locator("#valueSignButton").click();
  await page.waitForFunction(() => {
    const result = document.querySelector("#valueSignResult");
    return result instanceof HTMLElement && (result.textContent ?? "").includes("Signed Record Ready");
  });
  await page.locator("#publishValueButton").click();
  await page.waitForFunction(() => {
    const result = document.querySelector("#valuePublishResult");
    return result instanceof HTMLElement && (result.textContent ?? "").includes("Value Published");
  });
  await page.waitForFunction(() => {
    const result = document.querySelector("#valueLookupResult");
    return result instanceof HTMLElement
      && (result.textContent ?? "").includes("Lagging")
      && (result.textContent ?? "").includes("Current sequence:")
      && (result.textContent ?? "").includes("2")
      && (result.textContent ?? "").includes("http://127.0.0.1:8804");
  });
}

async function assertAuctionsPage(page) {
  await page.goto(`${webUrl}/auctions`, {
    waitUntil: "domcontentloaded"
  });

  await page.locator("#auctionLabList").waitFor({
    state: "attached",
    timeout: 15_000
  });
  const bodyText = await page.locator("body").textContent();
  assert(
    (bodyText ?? "").includes("Current interface for the reserved-name auction flow"),
    "auction page should expose the current reserved-auction framing"
  );
  assert(
    (bodyText ?? "").includes("Resolver-backed auction state derived from observed AUCTION_BID transactions."),
    "auction page should expose the chain-derived experimental bid feed"
  );
  assert(
    (bodyText ?? "").includes("Loading the current reserved-auction policy and state fixtures."),
    "auction page should render the simulator-backed state surface"
  );
}

async function assertOfflineArchitect(page) {
  await page.goto(`${webUrl}/claim/offline`, {
    waitUntil: "domcontentloaded"
  });

  await waitForVisibleText(page, "Batch Commit Builder");
  await waitForVisibleText(page, "Batch Reveal Builder");
}

async function waitForVisibleText(page, text, timeout = 15_000) {
  await page.getByText(text, { exact: false }).first().waitFor({
    state: "visible",
    timeout
  });
}

async function openValueWorkflowSteps(page) {
  await page.evaluate(() => {
    for (const id of ["value-step-sign", "value-step-publish"]) {
      const details = document.getElementById(id);
      if (details instanceof HTMLDetailsElement) {
        details.open = true;
      }
    }
  });
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
  if (!handle || handle.child.exitCode !== null) {
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

function buildFixtureChain() {
  const commitTxid = "aa".repeat(32);
  const revealTxid = "bb".repeat(32);
  const commitHash = computeCommitHash({
    name: fixtureName,
    nonce: fixtureNonce,
    ownerPubkey
  });

  return {
    blocks: [
      {
        hash: "0".repeat(63) + "1",
        height: 100,
        transactions: [
          {
            txid: commitTxid,
            outputs: [
              {
                valueSats: "6250000",
                scriptType: "payment"
              },
              {
                valueSats: "0",
                scriptType: "op_return",
                dataHex: encodeCommitPayload({
                  bondVout: 0,
                  ownerPubkey,
                  commitHash
                })
              }
            ]
          }
        ]
      },
      {
        hash: "0".repeat(63) + "2",
        height: 101,
        transactions: [
          {
            txid: revealTxid,
            outputs: [
              {
                valueSats: "0",
                scriptType: "op_return",
                dataHex: encodeRevealPayload({
                  commitTxid,
                  nonce: fixtureNonce,
                  name: fixtureName
                })
              }
            ]
          }
        ]
      }
    ]
  };
}

function computeCommitHash(options) {
  const nameBytes = Buffer.from(options.name.trim().toLowerCase(), "utf8");
  const hasher = createHash("sha256");
  hasher.update(Buffer.from([nameBytes.length]));
  hasher.update(nameBytes);
  hasher.update(Buffer.from(options.ownerPubkey, "hex"));
  hasher.update(bigIntToUint64Bytes(options.nonce));
  return hasher.digest("hex");
}

function encodeCommitPayload(options) {
  return Buffer.concat([
    Buffer.from("ONT", "utf8"),
    Buffer.from([1, 1, options.bondVout]),
    Buffer.from(options.ownerPubkey, "hex"),
    Buffer.from(options.commitHash, "hex")
  ]).toString("hex");
}

function encodeRevealPayload(options) {
  const nameBytes = Buffer.from(options.name.trim().toLowerCase(), "utf8");
  return Buffer.concat([
    Buffer.from("ONT", "utf8"),
    Buffer.from([1, 2]),
    Buffer.from(options.commitTxid, "hex"),
    bigIntToUint64Bytes(options.nonce),
    Buffer.from([nameBytes.length]),
    nameBytes
  ]).toString("hex");
}

function bigIntToUint64Bytes(value) {
  const bytes = Buffer.alloc(8);
  let remaining = value;

  for (let index = 7; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }

  return bytes;
}
