import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const scriptPath = join(root, "scripts/private-signet-auto-mine.sh");

await runCase("mines when mempool has transactions", {
  mempoolSize: 1,
  heartbeatSeconds: 60,
  timeoutMs: 5000
});

await runCase("mines a heartbeat block when idle", {
  mempoolSize: 0,
  heartbeatSeconds: 2,
  timeoutMs: 7000
});

console.log("private signet auto-miner tests passed");

async function runCase(label, { mempoolSize, heartbeatSeconds, timeoutMs }) {
  const dir = await mkdtemp(join(tmpdir(), "ont-auto-mine-test-"));
  const fakeCli = join(dir, "bitcoin-cli");
  const fakeMine = join(dir, "mine");
  const mineLog = join(dir, "mine.log");

  await writeFile(
    fakeCli,
    `#!/usr/bin/env bash
set -euo pipefail
case "$*" in
  *getblockchaininfo*) echo '{"chain":"signet"}' ;;
  *getmempoolinfo*) echo '{"size":${mempoolSize}}' ;;
  *) echo "unexpected bitcoin-cli call: $*" >&2; exit 1 ;;
esac
`,
    { mode: 0o755 }
  );

  await writeFile(
    fakeMine,
    `#!/usr/bin/env bash
set -euo pipefail
echo "$*" >>"${mineLog}"
`,
    { mode: 0o755 }
  );

  const child = spawn("bash", [scriptPath], {
    env: {
      ...process.env,
      ONT_PRIVATE_SIGNET_BITCOIN_CLI: fakeCli,
      ONT_PRIVATE_SIGNET_MINE_COMMAND: fakeMine,
      ONT_PRIVATE_SIGNET_AUTO_MINE_INTERVAL_SECONDS: "1",
      ONT_PRIVATE_SIGNET_AUTO_MINE_HEARTBEAT_SECONDS: String(heartbeatSeconds)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitForMineLog(mineLog, timeoutMs);
  } catch (error) {
    const stderr = await streamText(child.stderr);
    throw new Error(`${label} failed: ${error instanceof Error ? error.message : String(error)}\n${stderr}`);
  } finally {
    child.kill("SIGTERM");
  }
}

async function waitForMineLog(path, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const content = await readFile(path, "utf8").catch(() => "");
    if (content.trim() === "1") {
      return;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`timed out waiting for ${path}`);
}

async function streamText(stream) {
  const chunks = [];
  stream.on("data", (chunk) => chunks.push(chunk));
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  return Buffer.concat(chunks).toString("utf8");
}
