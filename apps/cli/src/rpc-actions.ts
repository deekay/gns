import {
  assertBitcoinRpcChain,
  createBitcoinEsploraConfig,
  createBitcoinRpcConfig,
  getBitcoinEsploraAddressSummary,
  getBitcoinEsploraAddressUtxos,
  getBitcoinEsploraBlockHash,
  getBitcoinEsploraTipHeight,
  getBitcoinEsploraTransactionStatus,
  getBitcoinRpcBlockCount,
  getBitcoinRpcBlockchainInfo,
  getBitcoinRpcRawTransactionInfo,
  sendBitcoinEsploraRawTransaction,
  sendBitcoinRpcRawTransaction,
  type BitcoinEsploraConfig,
  type BitcoinRpcConfig
} from "@gns/bitcoin";

import { parseSignedArtifactsEnvelope, type SignedArtifactsEnvelope } from "./signer.js";

export interface RpcConnectionOptions {
  readonly url: string | undefined;
  readonly username: string | undefined;
  readonly password: string | undefined;
  readonly expectedChain: "main" | "signet" | "testnet" | "regtest";
}

export interface RevealWatcherResult {
  readonly kind: "gns-reveal-watch-result";
  readonly commitTxid: string;
  readonly commitConfirmations: number;
  readonly revealTxid: string;
  readonly broadcastedRevealTxid: string;
}

export interface TransactionConfirmationInfo {
  readonly confirmations: number;
  readonly found: boolean;
}

export interface RemoteChainTarget {
  readonly kind: "rpc" | "esplora";
  readonly rpc: BitcoinRpcConfig | undefined;
  readonly esplora: BitcoinEsploraConfig | undefined;
}

export interface RpcCheckResult {
  readonly kind: "gns-rpc-check-result";
  readonly expectedChain: RpcConnectionOptions["expectedChain"];
  readonly rpcUrl: string;
  readonly chain: string;
  readonly blocks: number;
  readonly headers: number;
  readonly bestblockhash: string;
  readonly initialblockdownload: boolean | null;
  readonly blockCount: number;
}

export interface EsploraConnectionOptions {
  readonly baseUrl: string | undefined;
  readonly expectedChain: "main" | "signet" | "testnet" | "regtest";
}

export interface EsploraCheckResult {
  readonly kind: "gns-esplora-check-result";
  readonly expectedChain: EsploraConnectionOptions["expectedChain"];
  readonly baseUrl: string;
  readonly tipHeight: number;
  readonly tipHash: string;
}

export interface EsploraAddressCheckResult {
  readonly kind: "gns-esplora-address-check-result";
  readonly baseUrl: string;
  readonly address: string;
  readonly chainStats: {
    readonly fundedTxoCount: number;
    readonly fundedSats: number;
    readonly spentTxoCount: number;
    readonly spentSats: number;
    readonly txCount: number;
  };
  readonly mempoolStats: {
    readonly fundedTxoCount: number;
    readonly fundedSats: number;
    readonly spentTxoCount: number;
    readonly spentSats: number;
    readonly txCount: number;
  };
  readonly utxos: ReadonlyArray<{
    readonly txid: string;
    readonly vout: number;
    readonly value: number;
    readonly confirmed: boolean;
    readonly blockHeight: number | null;
  }>;
}

export function resolveRpcConfig(options: RpcConnectionOptions): BitcoinRpcConfig {
  const url = options.url ?? process.env.GNS_BITCOIN_RPC_URL;
  const username =
    options.username ?? process.env.GNS_BITCOIN_RPC_USERNAME;
  const password =
    options.password ?? process.env.GNS_BITCOIN_RPC_PASSWORD;

  if (!url) {
    throw new Error(
      "bitcoin rpc url is required via --rpc-url or GNS_BITCOIN_RPC_URL"
    );
  }

  return createBitcoinRpcConfig(url, username, password);
}

export function resolveEsploraConfig(options: EsploraConnectionOptions): BitcoinEsploraConfig {
  const baseUrl = options.baseUrl ?? process.env.GNS_ESPLORA_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "bitcoin esplora base url is required via --base-url or GNS_ESPLORA_BASE_URL"
    );
  }

  return createBitcoinEsploraConfig(baseUrl);
}

export function resolveRemoteChainTarget(options: {
  readonly rpcUrl: string | undefined;
  readonly rpcUsername: string | undefined;
  readonly rpcPassword: string | undefined;
  readonly esploraBaseUrl: string | undefined;
  readonly expectedChain: RpcConnectionOptions["expectedChain"];
}): RemoteChainTarget {
  if (options.rpcUrl ?? process.env.GNS_BITCOIN_RPC_URL) {
    return {
      kind: "rpc",
      rpc: resolveRpcConfig({
        url: options.rpcUrl,
        username: options.rpcUsername,
        password: options.rpcPassword,
        expectedChain: options.expectedChain
      }),
      esplora: undefined
    };
  }

  if (options.esploraBaseUrl ?? process.env.GNS_ESPLORA_BASE_URL) {
    return {
      kind: "esplora",
      rpc: undefined,
      esplora: resolveEsploraConfig({
        baseUrl: options.esploraBaseUrl,
        expectedChain: options.expectedChain
      })
    };
  }

  throw new Error(
    "either Bitcoin Core RPC (--rpc-url or GNS_BITCOIN_RPC_URL) or Esplora (--base-url or GNS_ESPLORA_BASE_URL) is required"
  );
}

export async function checkRpcConnection(options: {
  readonly rpc: BitcoinRpcConfig;
  readonly expectedChain: RpcConnectionOptions["expectedChain"];
}): Promise<RpcCheckResult> {
  const info = await assertBitcoinRpcChain(options.rpc, toBitcoinRpcChain(options.expectedChain));
  const blockCount = await getBitcoinRpcBlockCount(options.rpc);

  return {
    kind: "gns-rpc-check-result",
    expectedChain: options.expectedChain,
    rpcUrl: options.rpc.url,
    chain: info.chain,
    blocks: info.blocks,
    headers: info.headers,
    bestblockhash: info.bestblockhash,
    initialblockdownload: info.initialblockdownload ?? null,
    blockCount
  };
}

export async function checkEsploraConnection(options: {
  readonly esplora: BitcoinEsploraConfig;
  readonly expectedChain: EsploraConnectionOptions["expectedChain"];
}): Promise<EsploraCheckResult> {
  if (options.expectedChain !== "signet") {
    throw new Error("prototype esplora validation currently only supports signet");
  }

  const tipHeight = await getBitcoinEsploraTipHeight(options.esplora);
  const tipHash = await getBitcoinEsploraBlockHash(options.esplora, tipHeight);

  return {
    kind: "gns-esplora-check-result",
    expectedChain: options.expectedChain,
    baseUrl: options.esplora.baseUrl,
    tipHeight,
    tipHash
  };
}

export async function checkEsploraAddress(options: {
  readonly esplora: BitcoinEsploraConfig;
  readonly address: string;
}): Promise<EsploraAddressCheckResult> {
  const [summary, utxos] = await Promise.all([
    getBitcoinEsploraAddressSummary(options.esplora, options.address),
    getBitcoinEsploraAddressUtxos(options.esplora, options.address)
  ]);

  return {
    kind: "gns-esplora-address-check-result",
    baseUrl: options.esplora.baseUrl,
    address: summary.address,
    chainStats: summarizeAddressStats(summary.chain_stats),
    mempoolStats: summarizeAddressStats(summary.mempool_stats),
    utxos: utxos.map((utxo) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      value: utxo.value,
      confirmed: utxo.status.confirmed,
      blockHeight: utxo.status.block_height ?? null
    }))
  };
}

export async function broadcastSignedArtifacts(options: {
  readonly rpc: BitcoinRpcConfig | undefined;
  readonly esplora: BitcoinEsploraConfig | undefined;
  readonly expectedChain: RpcConnectionOptions["expectedChain"];
  readonly signedArtifacts: SignedArtifactsEnvelope;
}): Promise<{ readonly broadcastedTxid: string }> {
  const { broadcastedTxid } = await broadcastSignedTransactionHex({
    rpc: options.rpc,
    esplora: options.esplora,
    transactionHex: options.signedArtifacts.signedTransactionHex
  });

  return {
    broadcastedTxid
  };
}

export async function getTransactionConfirmationInfo(options: {
  readonly rpc: BitcoinRpcConfig | undefined;
  readonly esplora: BitcoinEsploraConfig | undefined;
  readonly txid: string;
}): Promise<TransactionConfirmationInfo> {
  if (options.rpc !== undefined) {
    const txInfo = await tryGetRawTransactionInfo(options.rpc, options.txid);

    return {
      confirmations: txInfo?.confirmations ?? 0,
      found: txInfo !== null
    };
  }

  if (options.esplora !== undefined) {
    const txInfo = await tryGetEsploraTransactionStatus(options.esplora, options.txid);

    if (txInfo === null) {
      return {
        confirmations: 0,
        found: false
      };
    }

    if (!txInfo.confirmed || txInfo.block_height === undefined) {
      return {
        confirmations: 0,
        found: true
      };
    }

    const tipHeight = await getBitcoinEsploraTipHeight(options.esplora);

    return {
      confirmations: Math.max(0, tipHeight - txInfo.block_height + 1),
      found: true
    };
  }

  throw new Error("either rpc or esplora config is required");
}

export async function broadcastSignedTransactionHex(options: {
  readonly rpc: BitcoinRpcConfig | undefined;
  readonly esplora: BitcoinEsploraConfig | undefined;
  readonly transactionHex: string;
}): Promise<{ readonly broadcastedTxid: string }> {
  let broadcastedTxid: string;

  if (options.rpc !== undefined) {
    broadcastedTxid = await sendBitcoinRpcRawTransaction(options.rpc, options.transactionHex);
  } else if (options.esplora !== undefined) {
    broadcastedTxid = await sendBitcoinEsploraRawTransaction(options.esplora, options.transactionHex);
  } else {
    throw new Error("either rpc or esplora config is required");
  }

  return {
    broadcastedTxid
  };
}

export async function waitForCommitAndBroadcastReveal(options: {
  readonly rpc: BitcoinRpcConfig | undefined;
  readonly esplora: BitcoinEsploraConfig | undefined;
  readonly expectedChain: RpcConnectionOptions["expectedChain"];
  readonly commitTxid: string;
  readonly signedRevealArtifacts: SignedArtifactsEnvelope;
  readonly pollIntervalMs: number;
  readonly timeoutMs: number;
}): Promise<RevealWatcherResult> {
  await assertRemoteTargetChain(options);

  const deadline = Date.now() + options.timeoutMs;

  while (Date.now() < deadline) {
    const confirmation = await getTransactionConfirmationInfo({
      rpc: options.rpc,
      esplora: options.esplora,
      txid: options.commitTxid
    });
    const confirmations = confirmation.confirmations;

    if (confirmations > 0) {
      const { broadcastedTxid: broadcastedRevealTxid } = await broadcastSignedTransactionHex({
        rpc: options.rpc,
        esplora: options.esplora,
        transactionHex: options.signedRevealArtifacts.signedTransactionHex
      });

      return {
        kind: "gns-reveal-watch-result",
        commitTxid: options.commitTxid,
        commitConfirmations: confirmations,
        revealTxid: options.signedRevealArtifacts.signedTransactionId,
        broadcastedRevealTxid
      };
    }

    await sleep(options.pollIntervalMs);
  }

  throw new Error("timed out waiting for commit confirmation before broadcasting reveal");
}

export function parseSignedArtifactsFile(input: unknown): SignedArtifactsEnvelope {
  return parseSignedArtifactsEnvelope(input);
}

async function tryGetRawTransactionInfo(
  rpc: BitcoinRpcConfig,
  txid: string
) {
  try {
    return await getBitcoinRpcRawTransactionInfo(rpc, txid);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("No such mempool transaction") || message.includes("Invalid or non-wallet transaction id")) {
      return null;
    }

    throw error;
  }
}

async function tryGetEsploraTransactionStatus(
  esplora: BitcoinEsploraConfig,
  txid: string
) {
  try {
    return await getBitcoinEsploraTransactionStatus(esplora, txid);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("HTTP 404")) {
      return null;
    }

    throw error;
  }
}

async function assertRemoteTargetChain(options: {
  readonly rpc: BitcoinRpcConfig | undefined;
  readonly esplora: BitcoinEsploraConfig | undefined;
  readonly expectedChain: RpcConnectionOptions["expectedChain"];
}): Promise<void> {
  if (options.rpc !== undefined) {
    await assertBitcoinRpcChain(options.rpc, toBitcoinRpcChain(options.expectedChain));
    return;
  }

  if (options.esplora !== undefined) {
    if (options.expectedChain !== "signet") {
      throw new Error("prototype esplora mode currently only supports signet");
    }

    return;
  }

  throw new Error("either rpc or esplora config is required");
}

function toBitcoinRpcChain(chain: RpcConnectionOptions["expectedChain"]) {
  switch (chain) {
    case "main":
      return "main";
    case "signet":
      return "signet";
    case "testnet":
      return "test";
    case "regtest":
      return "regtest";
  }
}

function summarizeAddressStats(stats: {
  readonly funded_txo_count: number;
  readonly funded_txo_sum: number;
  readonly spent_txo_count: number;
  readonly spent_txo_sum: number;
  readonly tx_count: number;
}) {
  return {
    fundedTxoCount: stats.funded_txo_count,
    fundedSats: stats.funded_txo_sum,
    spentTxoCount: stats.spent_txo_count,
    spentSats: stats.spent_txo_sum,
    txCount: stats.tx_count
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
