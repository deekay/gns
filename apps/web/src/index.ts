import { execFile as execFileCallback } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  assertHexBytes,
  bytesToHex,
  CLAIM_PACKAGE_FORMAT,
  CLAIM_PACKAGE_VERSION,
  createClaimPackage,
  encodeCommitPayload,
  getBondSats,
  normalizeName,
  PRODUCT_NAME,
  PROTOCOL_NAME,
  REVEAL_WINDOW_BLOCKS
} from "@gns/protocol";
import { createReservedAuctionLabBidPackage, loadReservedAuctionLab } from "./auction-lab.js";
import { renderClientScript } from "./client-script.js";
import { getOfflineClaimClientBundle } from "./offline-claim-bundle.js";
import { renderOfflineClaimPageHtml } from "./offline-claim-page.js";
import { renderPageHtml } from "./page-shell.js";
import { buildPrivateSignetClaimPsbtBundle } from "./private-signet-claim.js";
import { STYLESHEET } from "./styles.js";
import { getValuePublishClientBundle } from "./value-publish-bundle.js";

const execFile = promisify(execFileCallback);

const resolverPort = parsePort(
  process.env.GNS_RESOLVER_PORT ?? "8787",
  "GNS_RESOLVER_PORT"
);
const port = parsePort(
  process.env.GNS_WEB_PORT ?? process.env.PORT ?? "3000",
  "GNS_WEB_PORT"
);
const resolverUrl =
  process.env.GNS_WEB_RESOLVER_URL
  ?? `http://127.0.0.1:${resolverPort}`;
const basePath = normalizeBasePath(process.env.GNS_WEB_BASE_PATH ?? "");
const networkLabel =
  normalizeOptionalText(process.env.GNS_WEB_NETWORK_LABEL)
  ?? "Public Signet";
const showLiveSmoke = parseBoolean(
  process.env.GNS_WEB_SHOW_LIVE_SMOKE,
  false
);
const showPrivateBatchSmoke = parseBoolean(
  process.env.GNS_WEB_SHOW_PRIVATE_BATCH_SMOKE,
  networkLabel.toLowerCase().includes("private signet")
);
const showPrivateAuctionSmoke = parseBoolean(
  process.env.GNS_WEB_SHOW_PRIVATE_AUCTION_SMOKE,
  networkLabel.toLowerCase().includes("private signet")
);
const privateSignetFundingCommand =
  normalizeOptionalText(process.env.GNS_WEB_PRIVATE_SIGNET_FUNDING_COMMAND) ??
  "/usr/local/bin/gns-private-signet-fund";
const privateSignetBitcoinCliPath =
  normalizeOptionalText(process.env.GNS_WEB_PRIVATE_SIGNET_BITCOIN_CLI) ??
  "/usr/local/bin/bitcoin-cli";
const privateSignetBitcoinConfPath =
  normalizeOptionalText(process.env.GNS_WEB_PRIVATE_SIGNET_BITCOIN_CONF) ??
  "/etc/bitcoin-private-signet.conf";
const privateSignetBitcoinDataDir =
  normalizeOptionalText(process.env.GNS_WEB_PRIVATE_SIGNET_BITCOIN_DATADIR) ??
  "/var/lib/bitcoind-private-signet";
const privateSignetFundingAmountSats = parseSatsValue(
  process.env.GNS_WEB_PRIVATE_SIGNET_FUNDING_AMOUNT_SATS
    ?? "1000000",
  "GNS_WEB_PRIVATE_SIGNET_FUNDING_AMOUNT_SATS"
);
const privateSignetFundingAmountBtc = satsToBitcoinString(privateSignetFundingAmountSats);
const privateSignetFundingCooldownMs = parseNonNegativeInteger(
  process.env.GNS_WEB_PRIVATE_SIGNET_FUNDING_COOLDOWN_MS
    ?? "30000",
  "GNS_WEB_PRIVATE_SIGNET_FUNDING_COOLDOWN_MS"
);
const privateSignetFundingEnabled =
  parseBoolean(
    process.env.GNS_WEB_PRIVATE_SIGNET_FUNDING_ENABLED,
    networkLabel.toLowerCase().includes("private signet")
  ) && existsSync(privateSignetFundingCommand);
const privateSignetElectrumEndpoint =
  normalizeOptionalText(process.env.GNS_WEB_PRIVATE_SIGNET_ELECTRUM_ENDPOINT)
  ?? (networkLabel.toLowerCase().includes("private signet") ? "globalnamesystem.org:50001:t" : null);
const privateDemoBasePath = normalizeBasePath(
  process.env.GNS_WEB_PRIVATE_DEMO_BASE_PATH
    ?? (networkLabel.toLowerCase().includes("private signet") ? basePath : "/gns-private")
);
const privateSignetClaimPsbtBuilderEnabled =
  networkLabel.toLowerCase().includes("private signet") && existsSync(privateSignetBitcoinCliPath);
const privateSignetFundingRequestTimes = new Map<string, number>();
const faviconDataUrl =
  "data:image/svg+xml," +
  encodeURIComponent(
    readFileSync(
      fileURLToPath(new URL("../../../icon.svg", import.meta.url)),
      "utf8"
    )
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
const liveSmokeStatusPath =
  normalizeOptionalText(process.env.GNS_WEB_LIVE_SMOKE_STATUS_PATH) ??
  fileURLToPath(new URL("../../../.data/live-smoke-summary.json", import.meta.url));
const privateBatchSmokeStatusPath =
  normalizeOptionalText(process.env.GNS_WEB_PRIVATE_BATCH_SMOKE_STATUS_PATH) ??
  fileURLToPath(new URL("../../../.data/private-signet-demo/batch-smoke-summary.json", import.meta.url));
const privateAuctionSmokeStatusPath =
  normalizeOptionalText(process.env.GNS_WEB_PRIVATE_AUCTION_SMOKE_STATUS_PATH) ??
  fileURLToPath(new URL("../../../.data/private-signet-demo/auction-smoke-summary.json", import.meta.url));

const server = createServer(async (request, response) => {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const pathname = stripBasePath(url.pathname, basePath);

  if (pathname === "/api/private-signet-fund") {
    if (method !== "POST") {
      return writeJson(response, 405, {
        error: "method_not_allowed",
        message: "Use POST for private signet funding requests."
      });
    }

    if (!privateSignetFundingEnabled) {
      return writeJson(response, 404, {
        error: "not_found",
        message: "Private signet funding is not enabled for this deployment."
      });
    }

    try {
      const body = await readJsonBody(request);
      const address =
        body &&
        typeof body === "object" &&
        "address" in body &&
        typeof body.address === "string"
          ? normalizeOptionalText(body.address)
          : null;

      if (!address) {
        return writeJson(response, 400, {
          error: "invalid_address",
          message: "Paste a signet receive address from Sparrow first."
        });
      }

      const fundingResult = await fundPrivateSignetAddress(address);
      return writeJson(response, 200, fundingResult);
    } catch (error) {
      if (error instanceof HttpRequestError) {
        return writeJson(response, error.statusCode, {
          error: error.code,
          message: error.message
        });
      }

      return writeJson(response, 502, {
        error: "private_signet_funding_failed",
        message: error instanceof Error ? error.message : "Unable to fund the requested address."
      });
    }
  }

  if (pathname === "/api/private-signet-claim-psbts") {
    if (method !== "POST") {
      return writeJson(response, 405, {
        error: "method_not_allowed",
        message: "Use POST for private signet claim PSBT generation."
      });
    }

    if (!privateSignetClaimPsbtBuilderEnabled) {
      return writeJson(response, 404, {
        error: "not_found",
        message: "Private signet claim PSBT generation is not enabled for this deployment."
      });
    }

    try {
      const body = await readJsonBody(request);

      if (!body || typeof body !== "object") {
        return writeJson(response, 400, {
          error: "invalid_body",
          message: "Claim PSBT generation requires a JSON body."
        });
      }

      const record = body as Record<string, unknown>;
      const name = getRequiredWebBodyString(record, "name");
      const ownerPubkey = getRequiredWebBodyString(record, "ownerPubkey");
      const nonceHex = getRequiredWebBodyString(record, "nonceHex");
      const bondVout = getRequiredWebBodyInteger(record, "bondVout");
      const bondDestination = getRequiredWebBodyString(record, "bondDestination");
      const walletMasterFingerprint = getRequiredWebBodyString(record, "walletMasterFingerprint");
      const walletAccountXpub = getRequiredWebBodyString(record, "walletAccountXpub");
      const walletAccountPath = getRequiredWebBodyString(record, "walletAccountPath");
      const walletScanLimit = getOptionalWebBodyInteger(record, "walletScanLimit");
      const commitFeeSats = getOptionalWebBodySats(record, "commitFeeSats");
      const revealFeeSats = getOptionalWebBodySats(record, "revealFeeSats");
      const changeDestination = getOptionalWebBodyString(record, "changeDestination");

      const bundle = await buildPrivateSignetClaimPsbtBundle(
        {
          name,
          ownerPubkey,
          nonceHex,
          bondVout,
          bondDestination,
          ...(changeDestination === undefined ? {} : { changeDestination }),
          walletMasterFingerprint,
          walletAccountXpub,
          walletAccountPath,
          ...(walletScanLimit === undefined ? {} : { walletScanLimit }),
          ...(commitFeeSats === undefined ? {} : { commitFeeSats }),
          ...(revealFeeSats === undefined ? {} : { revealFeeSats })
        },
        {
          bitcoinCliPath: privateSignetBitcoinCliPath,
          bitcoinConfPath: privateSignetBitcoinConfPath,
          bitcoinDataDir: privateSignetBitcoinDataDir
        }
      );

      return writeJson(response, 200, bundle);
    } catch (error) {
      return writeJson(response, 400, {
        error: "private_signet_claim_psbt_failed",
        message:
          error instanceof Error ? error.message : "Unable to build Sparrow-native claim PSBTs."
      });
    }
  }

  if (pathname === "/api/values") {
    if (method !== "POST") {
      return writeJson(response, 405, {
        error: "method_not_allowed",
        message: "Use POST for signed value record publishing."
      });
    }

    try {
      const body = await readJsonBody(request);
      return proxyJson(response, `${resolverUrl}/values`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(body)
      });
    } catch (error) {
      if (error instanceof HttpRequestError) {
        return writeJson(response, error.statusCode, {
          error: error.code,
          message: error.message
        });
      }

      return writeJson(response, 400, {
        error: "invalid_value_record",
        message: error instanceof Error ? error.message : "Unable to publish the signed value record."
      });
    }
  }

  if (pathname === "/api/auction-bid-package") {
    if (method !== "POST") {
      return writeJson(response, 405, {
        error: "method_not_allowed",
        message: "Use POST for auction bid package generation."
      });
    }

    try {
      const body = await readJsonBody(request);

      if (!body || typeof body !== "object") {
        return writeJson(response, 400, {
          error: "invalid_body",
          message: "Auction bid package generation requires a JSON body."
        });
      }

      const record = body as Record<string, unknown>;
      const caseId = getRequiredWebBodyString(record, "caseId");
      const bidderId = getRequiredWebBodyString(record, "bidderId");
      const bidAmountSats = getRequiredWebBodySats(record, "bidAmountSats");
      const pkg = await createReservedAuctionLabBidPackage({
        caseId,
        bidderId,
        bidAmountSats
      });

      return writeJson(response, 200, pkg);
    } catch (error) {
      return writeJson(response, 400, {
        error: "auction_bid_package_failed",
        message:
          error instanceof Error
            ? error.message
            : "Unable to build the auction bid package."
      });
    }
  }

  if (method !== "GET") {
    return writeJson(response, 405, {
      error: "method_not_allowed",
      message: "Only GET is supported in the prototype web app."
    });
  }

  if (pathname === null) {
    return writeJson(response, 404, {
      error: "not_found",
      message: `Path is outside configured base path ${basePath}.`
    });
  }

  if (pathname === "/claim/offline" || pathname === "/claim/offline/" || pathname === "/claim/offline/download") {
    try {
      const offlineHtml = renderOfflineClaimPageHtml(await getOfflineClaimClientBundle());

      if (pathname === "/claim/offline/download") {
        return writeHtmlAttachment(
          response,
          offlineHtml,
          "gns-offline-claim-architect.html"
        );
      }

      return writeHtml(response, offlineHtml);
    } catch (error) {
      return writeJson(response, 500, {
        error: "offline_claim_unavailable",
        message:
          error instanceof Error
            ? error.message
            : "Unable to generate the offline claim architect."
      });
    }
  }

  if (
    pathname === "/"
    || isExplorePath(pathname)
    || isAuctionsPath(pathname)
    || isNameDetailPath(pathname)
    || isClaimPath(pathname)
    || isValuesPath(pathname)
    || isTransferPath(pathname)
    || isSetupPath(pathname)
    || isExplainerPath(pathname)
  ) {
    return writeHtml(
      response,
      renderPageHtml({
        basePath,
        faviconDataUrl,
        includeLiveSmoke: showLiveSmoke,
        includePrivateBatchSmoke: showPrivateBatchSmoke,
        includePrivateAuctionSmoke: showPrivateAuctionSmoke,
        networkLabel,
        pageKind: pathname === "/"
          ? "home"
          : isAuctionsPath(pathname)
          ? "auctions"
          : isClaimPath(pathname)
          ? "claim"
          : isValuesPath(pathname)
            ? "values"
          : isTransferPath(pathname)
            ? "transfer"
            : isSetupPath(pathname)
              ? "setup"
            : isExplainerPath(pathname)
              ? "explainer"
              : "explore",
        privateSignetElectrumEndpoint,
        privateSignetFundingAmountSats,
        privateSignetFundingEnabled
      })
    );
  }

  if (pathname === "/styles.css") {
    return writeText(response, 200, STYLESHEET, "text/css; charset=utf-8");
  }

  if (pathname === "/app.js") {
    return writeText(response, 200, renderClientScript(basePath), "application/javascript; charset=utf-8");
  }

  if (pathname === "/value-tools.js") {
    try {
      return writeText(
        response,
        200,
        await getValuePublishClientBundle(),
        "application/javascript; charset=utf-8"
      );
    } catch (error) {
      return writeJson(response, 500, {
        error: "value_tools_unavailable",
        message:
          error instanceof Error
            ? error.message
            : "Unable to generate the value publishing client bundle."
      });
    }
  }

  if (pathname === "/api/config") {
    return writeJson(response, 200, {
      product: PRODUCT_NAME,
      protocol: PROTOCOL_NAME,
      resolverUrl,
      basePath,
      networkLabel,
      showLiveSmoke,
      showPrivateBatchSmoke,
      showPrivateAuctionSmoke,
      showAuctionLab: true,
      privateDemoBasePath,
      privateFunding: {
        enabled: privateSignetFundingEnabled,
        amountSats: privateSignetFundingAmountSats.toString(),
        amountBtc: privateSignetFundingAmountBtc,
        electrumEndpoint: privateSignetElectrumEndpoint,
        claimPsbtBuilderEnabled: privateSignetClaimPsbtBuilderEnabled
      }
    });
  }

  if (pathname === "/api/health") {
    return proxyJson(response, `${resolverUrl}/health`);
  }

  if (pathname === "/api/live-smoke-status") {
    return writeJson(response, 200, await readLiveSmokeStatus());
  }

  if (pathname === "/api/private-batch-smoke-status") {
    return writeJson(response, 200, await readPrivateBatchSmokeStatus());
  }

  if (pathname === "/api/private-auction-smoke-status") {
    return writeJson(response, 200, await readPrivateAuctionSmokeStatus());
  }

  if (pathname === "/api/auctions") {
    return writeJson(response, 200, await loadReservedAuctionLab());
  }

  if (pathname === "/api/experimental-auctions") {
    return proxyJson(response, `${resolverUrl}/experimental-auctions`);
  }

  if (pathname === "/api/names") {
    return proxyJson(response, `${resolverUrl}/names`);
  }

  if (pathname === "/api/pending-commits") {
    return proxyJson(response, `${resolverUrl}/pending-commits`);
  }

  if (pathname === "/api/activity") {
    const query = url.searchParams.toString();
    return proxyJson(response, `${resolverUrl}/activity${query === "" ? "" : `?${query}`}`);
  }

  if (pathname.startsWith("/api/tx/")) {
    const txid = pathname.slice("/api/tx/".length);
    return proxyJson(response, `${resolverUrl}/tx/${txid}`);
  }

  if (pathname === "/api/dev-owner-key") {
    return writeJson(response, 200, generatePrototypeOwnerKey());
  }

  if (pathname.startsWith("/api/claim-draft/")) {
    const rawName = decodeURIComponent(pathname.slice("/api/claim-draft/".length));

    try {
      return writeJson(
        response,
        200,
        buildClaimDraft({
          name: rawName,
          ownerPubkey: url.searchParams.get("ownerPubkey") ?? "",
          nonceHex: url.searchParams.get("nonceHex") ?? "",
          ...(url.searchParams.get("bondVout") === null ? {} : { bondVout: url.searchParams.get("bondVout") ?? "" }),
          ...(url.searchParams.get("bondDestination") === null
            ? {}
            : { bondDestination: url.searchParams.get("bondDestination") ?? "" }),
          ...(url.searchParams.get("changeDestination") === null
            ? {}
            : { changeDestination: url.searchParams.get("changeDestination") ?? "" }),
          ...(url.searchParams.get("commitTxid") === null
            ? {}
            : { commitTxid: url.searchParams.get("commitTxid") ?? "" })
        })
      );
    } catch (error) {
      return writeJson(response, 400, {
        error: "invalid_claim_draft",
        message: error instanceof Error ? error.message : "Invalid claim draft input"
      });
    }
  }

  if (pathname.startsWith("/api/claim-plan/")) {
    const name = pathname.slice("/api/claim-plan/".length);
    return proxyJson(response, `${resolverUrl}/claim-plan/${name}`);
  }

  if (pathname.startsWith("/api/name/")) {
    const activityPathMatch = pathname.match(/^\/api\/name\/(.+)\/activity$/);

    if (activityPathMatch) {
      const name = activityPathMatch[1] ?? "";
      const query = url.searchParams.toString();
      return proxyJson(response, `${resolverUrl}/name/${name}/activity${query === "" ? "" : `?${query}`}`);
    }

    const valuePathMatch = pathname.match(/^\/api\/name\/(.+)\/value$/);

    if (valuePathMatch) {
      const name = valuePathMatch[1] ?? "";
      return proxyJson(response, `${resolverUrl}/name/${name}/value`);
    }

    const name = pathname.slice("/api/name/".length);
    return proxyJson(response, `${resolverUrl}/name/${name}`);
  }

  return writeJson(response, 404, {
    error: "not_found",
    message:
      "Supported paths: /, /explore, /auctions, /claim, /values, /transfer, /setup, /explainer, /api/config, /api/health, /api/names, /api/pending-commits, /api/activity, /api/tx/{txid}, /api/dev-owner-key, /api/private-signet-fund, /api/claim-draft/{name}, /api/claim-plan/{name}, /api/name/{name}, /api/name/{name}/activity, /api/name/{name}/value, /api/live-smoke-status, /api/private-batch-smoke-status, /api/auctions"
      + ", /api/private-auction-smoke-status, /api/experimental-auctions, /api/private-signet-claim-psbts, /api/values, /claim/offline, /claim/offline/download"
  });
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      [
        `${PRODUCT_NAME} web could not start because port ${port} is already in use.`,
        `Try: GNS_WEB_PORT=3001 npm run dev:web`,
        `Or run both together with: GNS_WEB_PORT=3001 GNS_RESOLVER_PORT=${resolverPort} npm run dev:all`
      ].join("\n")
    );
    process.exit(1);
  }

  throw error;
});

server.listen(port, () => {
  console.log(
    `${PRODUCT_NAME} web listening on http://127.0.0.1:${port}${basePath || ""} (basePath=${basePath || "/"})`
  );
});

function isNameDetailPath(pathname: string): boolean {
  return /^\/names\/[^/]+\/?$/.test(pathname);
}

function isExplorePath(pathname: string): boolean {
  return pathname === "/explore" || pathname === "/explore/";
}

function isAuctionsPath(pathname: string): boolean {
  return pathname === "/auctions" || pathname === "/auctions/";
}

function isClaimPath(pathname: string): boolean {
  return pathname === "/claim" || pathname === "/claim/";
}

function isValuesPath(pathname: string): boolean {
  return pathname === "/values" || pathname === "/values/";
}

function isTransferPath(pathname: string): boolean {
  return pathname === "/transfer" || pathname === "/transfer/";
}

function isSetupPath(pathname: string): boolean {
  return pathname === "/setup" || pathname === "/setup/";
}

function isExplainerPath(pathname: string): boolean {
  return pathname === "/explainer" || pathname === "/explainer/";
}

async function proxyJson(
  response: import("node:http").ServerResponse,
  targetUrl: string,
  init?: RequestInit
): Promise<void> {
  try {
    const upstream = await fetch(targetUrl, init);
    const body = await upstream.text();

    response.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8"
    });
    response.end(body);
  } catch (error) {
    writeJson(response, 502, {
      error: "resolver_unavailable",
      message: error instanceof Error ? error.message : "Resolver request failed"
    });
  }
}

async function readLiveSmokeStatus(): Promise<unknown> {
  try {
    return JSON.parse(await readFile(liveSmokeStatusPath, "utf8"));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return {
        status: "unavailable",
        message: "No legacy public signet smoke summary has been published yet."
      };
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to read legacy public signet smoke summary."
    };
  }
}

async function readPrivateBatchSmokeStatus(): Promise<unknown> {
  try {
    return JSON.parse(await readFile(privateBatchSmokeStatusPath, "utf8"));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return {
        status: "unavailable",
        message: "No private signet batch smoke summary has been published yet."
      };
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to read private signet batch smoke summary."
    };
  }
}

async function readPrivateAuctionSmokeStatus(): Promise<unknown> {
  try {
    return JSON.parse(await readFile(privateAuctionSmokeStatusPath, "utf8"));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return {
        status: "unavailable",
        message: "No private signet auction smoke summary has been published yet."
      };
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to read private signet auction smoke summary."
    };
  }
}

function writeHtml(response: import("node:http").ServerResponse, html: string): void {
  writeText(response, 200, html, "text/html; charset=utf-8");
}

function writeHtmlAttachment(
  response: import("node:http").ServerResponse,
  html: string,
  filename: string
): void {
  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "content-disposition": `attachment; filename="${filename}"`
  });
  response.end(html);
}

function writeText(
  response: import("node:http").ServerResponse,
  statusCode: number,
  body: string,
  contentType: string
): void {
  response.writeHead(statusCode, {
    "content-type": contentType
  });
  response.end(body);
}

function writeJson(
  response: import("node:http").ServerResponse,
  statusCode: number,
  body: unknown
): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(body));
}

function parsePort(value: string, envName: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`invalid ${envName} value: ${value}`);
  }

  return parsed;
}

function parseNonNegativeInteger(value: string, envName: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`invalid ${envName} value: ${value}`);
  }

  return parsed;
}

function parseSatsValue(value: string, envName: string): bigint {
  try {
    const parsed = BigInt(value);
    if (parsed <= 0n) {
      throw new Error("must be positive");
    }
    return parsed;
  } catch {
    throw new Error(`invalid ${envName} value: ${value}`);
  }
}

function parseBondVout(value: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 0xff) {
    throw new Error(`invalid bondVout value: ${value}`);
  }

  return parsed;
}

function getRequiredWebBodyString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

function getOptionalWebBodyString(
  record: Record<string, unknown>,
  key: string
): string | undefined {
  const value = record[key];
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${key} must be a string`);
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function getRequiredWebBodyInteger(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${key} must be a non-negative integer`);
  }

  return value;
}

function getOptionalWebBodyInteger(
  record: Record<string, unknown>,
  key: string
): number | undefined {
  const value = record[key];
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${key} must be a non-negative integer`);
  }

  return value;
}

function getOptionalWebBodySats(
  record: Record<string, unknown>,
  key: string
): bigint | undefined {
  const value = record[key];
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`${key} must be a sats string or integer`);
  }

  const normalized = String(value).trim();
  if (normalized === "") {
    return undefined;
  }

  try {
    const parsed = BigInt(normalized);
    if (parsed <= 0n) {
      throw new Error("must be positive");
    }
    return parsed;
  } catch {
    throw new Error(`${key} must be a positive sats amount`);
  }
}

function getRequiredWebBodySats(
  record: Record<string, unknown>,
  key: string
): bigint {
  const parsed = getOptionalWebBodySats(record, key);
  if (parsed === undefined) {
    throw new Error(`${key} is required`);
  }

  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
    return true;
  }

  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false;
  }

  throw new Error(`invalid boolean value: ${value}`);
}

async function readJsonBody(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > 8 * 1024) {
      throw new HttpRequestError(413, "payload_too_large", "Request body is too large.");
    }

    chunks.push(buffer);
  }

  const body = Buffer.concat(chunks).toString("utf8").trim();
  if (body === "") {
    throw new HttpRequestError(400, "invalid_request_body", "Request body is required.");
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new HttpRequestError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

async function fundPrivateSignetAddress(
  address: string
): Promise<{
  readonly status: "funded";
  readonly address: string;
  readonly fundedSats: string;
  readonly fundedBtc: string;
  readonly txid: string;
  readonly minedBlocks: number;
  readonly cooldownMs: number;
}> {
  const now = Date.now();
  const lastRequestAt = privateSignetFundingRequestTimes.get(address);

  if (
    lastRequestAt !== undefined &&
    privateSignetFundingCooldownMs > 0 &&
    now - lastRequestAt < privateSignetFundingCooldownMs
  ) {
    const retryAfterMs = privateSignetFundingCooldownMs - (now - lastRequestAt);
    throw new HttpRequestError(
      429,
      "rate_limited",
      `Please wait ${Math.ceil(retryAfterMs / 1000)}s before requesting more private signet coins.`
    );
  }

  try {
    const { stdout, stderr } = await execFile(privateSignetFundingCommand, [address, privateSignetFundingAmountBtc], {
      timeout: 60_000
    });
    const txidMatches = `${stdout}\n${stderr}`.match(/[a-f0-9]{64}/gi) ?? [];
    const txid = txidMatches[txidMatches.length - 1]?.trim() ?? "";

    if (!/^[a-f0-9]{64}$/i.test(txid)) {
      throw new Error("Funding command did not return a transaction id.");
    }

    privateSignetFundingRequestTimes.set(address, now);

    return {
      status: "funded",
      address,
      fundedSats: privateSignetFundingAmountSats.toString(),
      fundedBtc: privateSignetFundingAmountBtc,
      txid,
      minedBlocks: 1,
      cooldownMs: privateSignetFundingCooldownMs
    };
  } catch (error) {
    const message =
      error instanceof Error && "stderr" in error && typeof error.stderr === "string" && error.stderr.trim() !== ""
        ? error.stderr.trim()
        : error instanceof Error
          ? error.message
          : "Unable to fund the requested address.";

    throw new HttpRequestError(400, "private_signet_funding_failed", message);
  }
}

function satsToBitcoinString(sats: bigint): string {
  const whole = sats / 100_000_000n;
  const fractional = (sats % 100_000_000n).toString().padStart(8, "0").replace(/0+$/g, "");
  return fractional === "" ? `${whole}.0` : `${whole}.${fractional}`;
}

function formatBitcoinUnits(value: bigint | string | number): string {
  return `₿${BigInt(value).toLocaleString("en-US")}`;
}

class HttpRequestError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();

  if (trimmed === "" || trimmed === "/") {
    return "";
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

function stripBasePath(pathname: string, configuredBasePath: string): string | null {
  if (configuredBasePath === "") {
    return pathname;
  }

  if (pathname === configuredBasePath) {
    return "/";
  }

  if (pathname.startsWith(`${configuredBasePath}/`)) {
    return pathname.slice(configuredBasePath.length);
  }

  return null;
}

function withBasePath(pathname: string, configuredBasePath: string): string {
  if (configuredBasePath === "") {
    return pathname;
  }

  if (pathname === "/") {
    return configuredBasePath;
  }

  return `${configuredBasePath}${pathname}`;
}

function buildClaimDraft(input: {
  name: string;
  ownerPubkey: string;
  nonceHex: string;
  bondVout?: string;
  bondDestination?: string;
  changeDestination?: string;
  commitTxid?: string;
}) {
  const name = normalizeName(input.name);
  const ownerPubkey = assertHexBytes(input.ownerPubkey, 32, "ownerPubkey");
  const nonceHex = assertHexBytes(input.nonceHex, 8, "nonceHex");
  const bondVout = parseBondVout(input.bondVout ?? "0");
  const bondDestination = normalizeOptionalText(input.bondDestination);
  const changeDestination = normalizeOptionalText(input.changeDestination);
  const claimPackage = createClaimPackage({
    name,
    ownerPubkey,
    nonceHex,
    bondVout,
    bondDestination,
    changeDestination,
    commitTxid: normalizeOptionalText(input.commitTxid)
  });
  const commitPayload = encodeCommitPayload({
    bondVout: claimPackage.bondVout,
    ownerPubkey: claimPackage.ownerPubkey,
    commitHash: claimPackage.commitHash
  });
  const suggestedOpReturnVout = bondVout === 0 ? 1 : bondVout === 1 ? 0 : null;

  const result: {
    readonly format: typeof CLAIM_PACKAGE_FORMAT;
    readonly packageVersion: typeof CLAIM_PACKAGE_VERSION;
    readonly protocol: typeof PROTOCOL_NAME;
    readonly exportedAt: string;
    readonly name: string;
    readonly ownerPubkey: string;
    readonly nonceHex: string;
    readonly nonceDecimal: string;
    readonly requiredBondSats: string;
    readonly bondVout: number;
    readonly bondDestination: string | null;
    readonly changeDestination: string | null;
    readonly commitHash: string;
    readonly commitPayloadHex: string;
    readonly commitPayloadBytes: number;
    readonly commitTemplate: {
      readonly bondVout: number;
      readonly suggestedOpReturnVout: number | null;
      readonly outputs: ReadonlyArray<{
        readonly vout: number | null;
        readonly role: string;
        readonly scriptType: "payment" | "op_return";
        readonly valueSats: string;
        readonly dataHex?: string;
        readonly destinationHint?: string;
      }>;
      readonly notes: readonly string[];
    };
    readonly walletHandoff: {
      readonly commit: {
        readonly summary: string;
        readonly unsignedTransactionSkeleton: {
          readonly fundingInputs: string;
          readonly outputs: ReadonlyArray<{
            readonly role: string;
            readonly required: boolean;
            readonly fixedVout: number | null;
            readonly scriptType: "payment" | "op_return";
            readonly valueSats: string;
            readonly destination: string | null;
            readonly dataHex: string | null;
          }>;
        };
        readonly signerChecklist: readonly string[];
      };
      readonly reveal: {
        readonly ready: boolean;
        readonly summary: string;
        readonly unsignedTransactionSkeleton: {
          readonly fundingInputs: string;
          readonly outputs: ReadonlyArray<{
            readonly role: string;
            readonly required: boolean;
            readonly fixedVout: number | null;
            readonly scriptType: "payment" | "op_return";
            readonly valueSats: string;
            readonly destination: string | null;
            readonly dataHex: string | null;
          }>;
        };
        readonly signerChecklist: readonly string[];
      };
    };
    readonly revealPlan: {
      readonly commitTxidKnown: boolean;
      readonly canPreSignReveal: boolean;
      readonly autoBroadcastConcept: readonly string[];
    };
    readonly revealReady: boolean;
    readonly commitTxid: string | null;
    readonly revealPayloadHex: string | null;
    readonly revealPayloadBytes: number | null;
  } = {
    format: CLAIM_PACKAGE_FORMAT,
    packageVersion: CLAIM_PACKAGE_VERSION,
    protocol: PROTOCOL_NAME,
    exportedAt: claimPackage.exportedAt,
    name: claimPackage.name,
    ownerPubkey: claimPackage.ownerPubkey,
    nonceHex: claimPackage.nonceHex,
    nonceDecimal: claimPackage.nonceDecimal,
    requiredBondSats: claimPackage.requiredBondSats,
    bondVout: claimPackage.bondVout,
    bondDestination: claimPackage.bondDestination,
    changeDestination: claimPackage.changeDestination,
    commitHash: claimPackage.commitHash,
    commitPayloadHex: claimPackage.commitPayloadHex,
    commitPayloadBytes: claimPackage.commitPayloadBytes,
    commitTemplate: {
      bondVout,
      suggestedOpReturnVout,
      outputs: [
        {
          vout: bondVout,
          role: "bond",
          scriptType: "payment",
          valueSats: claimPackage.requiredBondSats,
          destinationHint: bondDestination ?? "Send to a self-custody address or script you control."
        },
        {
          vout: suggestedOpReturnVout,
          role: "gns_commit",
          scriptType: "op_return",
          valueSats: "0",
          dataHex: bytesToHex(commitPayload)
        }
      ],
      notes: [
        "Do not let fees reduce the bond output below the required amount.",
        "Keep the bond output at the declared vout index so indexers can pair it with the claim.",
        "If your wallet adds a change output, place it after the bond and OP_RETURN outputs whenever possible."
      ]
    },
    walletHandoff: {
      commit: {
        summary:
          "Build one commit transaction with a dedicated bond output plus one OP_RETURN output carrying the commit payload.",
        unsignedTransactionSkeleton: {
          fundingInputs: "Wallet-selected funding inputs and separate fee/change handling.",
          outputs: [
            {
              role: "bond",
              required: true,
              fixedVout: bondVout,
              scriptType: "payment",
              valueSats: claimPackage.requiredBondSats,
              destination: bondDestination,
              dataHex: null
            },
            {
              role: "gns_commit",
              required: true,
              fixedVout: suggestedOpReturnVout,
              scriptType: "op_return",
              valueSats: "0",
              destination: null,
              dataHex: bytesToHex(commitPayload)
            },
            {
              role: "change",
              required: false,
              fixedVout: null,
              scriptType: "payment",
              valueSats: "wallet-calculated",
              destination: changeDestination,
              dataHex: null
            }
          ]
        },
        signerChecklist: [
          `Preserve the bond at vout ${bondVout} with at least ${formatBitcoinUnits(claimPackage.requiredBondSats)}.`,
          "Fund miner fees from separate inputs or change rather than shrinking the bond output.",
          "Include the OP_RETURN output with the exact commit payload bytes shown below.",
          "Record the final commit txid so the reveal payload can be derived and broadcast on time."
        ]
      },
      reveal: {
        ready: false,
        summary:
          "Build a separate reveal transaction after the commit exists. It carries one OP_RETURN reveal payload and can use ordinary wallet funding for fees.",
        unsignedTransactionSkeleton: {
          fundingInputs: "Wallet-selected funding input for the reveal fee.",
          outputs: [
            {
              role: "gns_reveal",
              required: true,
              fixedVout: 0,
              scriptType: "op_return",
              valueSats: "0",
              destination: null,
              dataHex: null
            },
            {
              role: "change",
              required: false,
              fixedVout: null,
              scriptType: "payment",
              valueSats: "wallet-calculated",
              destination: changeDestination,
              dataHex: null
            }
          ]
        },
        signerChecklist: [
          "Wait until the commit txid is known, then derive the reveal payload.",
          `Broadcast only after the commit confirms and before the ${REVEAL_WINDOW_BLOCKS}-block reveal window closes.`,
          "Keep a local copy of the signed reveal so an auto-broadcast service is not your only path."
        ]
      }
    },
    revealPlan: {
      commitTxidKnown: false,
      canPreSignReveal: false,
      autoBroadcastConcept: [
        "The website can prepare the reveal transaction as soon as the commit txid is known.",
        "A future signer flow can have the user sign the reveal up front and hand only the signed transaction to a watcher service.",
        "That watcher can wait for the commit confirmation and broadcast the reveal automatically within the allowed window."
      ]
    },
    revealReady: claimPackage.revealReady,
    commitTxid: claimPackage.commitTxid,
    revealPayloadHex: claimPackage.revealPayloadHex,
    revealPayloadBytes: claimPackage.revealPayloadBytes
  };

  if (claimPackage.revealReady && claimPackage.commitTxid && claimPackage.revealPayloadHex) {
    return {
      ...result,
      walletHandoff: {
        ...result.walletHandoff,
        reveal: {
          ...result.walletHandoff.reveal,
          ready: true,
          unsignedTransactionSkeleton: {
            ...result.walletHandoff.reveal.unsignedTransactionSkeleton,
            outputs: result.walletHandoff.reveal.unsignedTransactionSkeleton.outputs.map((output) =>
              output.role === "gns_reveal"
                ? {
                    ...output,
                    dataHex: claimPackage.revealPayloadHex
                  }
                : output
            )
          },
          signerChecklist: [
            `Use the reveal payload tied to commit txid ${claimPackage.commitTxid}.`,
            "Broadcast after the commit confirms and before the reveal deadline.",
            "If you pre-sign the reveal, keep a backup copy in case the watcher service fails."
          ]
        }
      },
      revealPlan: {
        commitTxidKnown: true,
        canPreSignReveal: true,
        autoBroadcastConcept: [
          `Commit txid ${claimPackage.commitTxid} is now known, so the reveal can be fully assembled and pre-signed.`,
          "A watcher service can hold only the signed reveal transaction and broadcast it after the commit confirms.",
          `If the service fails, you can still broadcast the same signed reveal yourself before the ${REVEAL_WINDOW_BLOCKS}-block window closes.`
        ]
      },
      revealReady: true,
      commitTxid: claimPackage.commitTxid,
      revealPayloadHex: claimPackage.revealPayloadHex,
      revealPayloadBytes: claimPackage.revealPayloadBytes
    };
  }

  return result;
}

function generatePrototypeOwnerKey() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "secp256k1"
  });

  const publicJwk = publicKey.export({ format: "jwk" });
  const privateJwk = privateKey.export({ format: "jwk" });

  if (typeof publicJwk.x !== "string" || typeof privateJwk.d !== "string") {
    throw new Error("unable to export secp256k1 key material");
  }

  return {
    ownerPubkey: base64UrlToHex(publicJwk.x),
    privateKeyHex: base64UrlToHex(privateJwk.d),
    warning:
      "Prototype helper only. This key is generated by the local web server for testing and should not be used for real value."
  };
}

function normalizeOptionalText(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function base64UrlToHex(input: string): string {
  const padded = input.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("hex");
}
