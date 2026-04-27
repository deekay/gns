import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { chromium } from "playwright";

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
  const message = error instanceof Error ? error.message : String(error);
  const hint = message.includes("MachPortRendezvousServer")
    ? "Chromium is installed, but this macOS sandbox is denying its Mach rendezvous registration. Run this E2E smoke in a normal shell or CI environment."
    : 'Run "npm run playwright:install" first if Chromium is missing.';
  throw new Error(
    `Unable to launch Chromium for website E2E smoke. ${hint} ${message}`
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
  await assertAuctionsPage(page);
  await assertRetiredClaimPage(page);

  await context.close();

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
          "auction-lab-browser-flow",
          "retired-claim-page"
        ]
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
    html.includes("/auctions"),
    "home page should link users to auctions"
  );
}

async function assertRetiredClaimPage(page) {
  const response = await page.goto(`${webUrl}/claim`, {
    waitUntil: "domcontentloaded"
  });
  const bodyText = await page.locator("body").textContent();

  assert(response?.status() === 404, "retired claim page should return 404");
  assert(
    (bodyText ?? "").includes("Supported paths"),
    "retired claim page should show the supported-paths error"
  );
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
    (bodyText ?? "").includes("Advanced auction prototype surface"),
    "auction page should expose the current auction framing"
  );
  assert(
    (bodyText ?? "").includes("Advanced resolver-backed view derived from observed AUCTION_BID transactions."),
    "auction page should expose the chain-derived experimental bid feed"
  );
  assert(
    (bodyText ?? "").includes("Auction Reference Cases"),
    "auction page should render the simulator-backed state surface"
  );
}

async function waitForVisibleText(page, text, timeout = 15_000) {
  await page.getByText(text, { exact: false }).first().waitFor({
    state: "visible",
    timeout
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
  return {
    blocks: [
      {
        hash: "0".repeat(63) + "1",
        height: 100,
        transactions: []
      }
    ]
  };
}
