import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ECPairFactory from "ecpair";
import { initEccLib, networks, payments, Transaction } from "bitcoinjs-lib";
import * as tinysecp from "tiny-secp256k1";

import {
  CLAIM_PACKAGE_FORMAT,
  CLAIM_PACKAGE_VERSION,
  computeCommitHash,
  encodeCommitPayload,
  parseClaimPackage,
  PROTOCOL_NAME
} from "@gns/protocol";
import { createBitcoinRpcConfig } from "@gns/bitcoin";

import { loadRevealQueueFile } from "./reveal-queue.js";
import { submitClaim } from "./submit-claim.js";

initEccLib(tinysecp);
const ECPair = ECPairFactory(tinysecp);
const ORIGINAL_FETCH = globalThis.fetch;

function createTestAddress(seed: number): string {
  const key = ECPair.fromPrivateKey(Buffer.alloc(32, seed), {
    network: networks.testnet,
    compressed: true
  });
  const address = payments.p2wpkh({
    pubkey: key.publicKey,
    network: networks.testnet
  }).address;

  if (!address) {
    throw new Error("unable to derive test address");
  }

  return address;
}

function createClaimPackage() {
  const name = "bob";
  const ownerPubkey = "11".repeat(32);
  const nonceHex = "0102030405060708";
  const commitHash = computeCommitHash({
    name,
    nonce: BigInt(`0x${nonceHex}`),
    ownerPubkey
  });

  return parseClaimPackage({
    format: CLAIM_PACKAGE_FORMAT,
    packageVersion: CLAIM_PACKAGE_VERSION,
    protocol: PROTOCOL_NAME,
    exportedAt: "2026-03-19T00:00:00.000Z",
    name,
    ownerPubkey,
    nonceHex,
    nonceDecimal: BigInt(`0x${nonceHex}`).toString(),
    requiredBondSats: "25000000",
    bondVout: 0,
    bondDestination: createTestAddress(1),
    changeDestination: createTestAddress(2),
    commitHash,
    commitPayloadHex: Buffer.from(
      encodeCommitPayload({
        bondVout: 0,
        ownerPubkey,
        commitHash
      })
    ).toString("hex"),
    commitPayloadBytes: 70,
    commitTxid: null,
    revealReady: false,
    revealPayloadHex: null,
    revealPayloadBytes: null
  });
}

describe("submitClaim", () => {
  let sandboxDir: string;

  beforeEach(async () => {
    sandboxDir = await mkdtemp(join(tmpdir(), "gns-submit-claim-"));
  });

  afterEach(async () => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
    await rm(sandboxDir, { recursive: true, force: true });
  });

  it("builds, signs, broadcasts the commit, and persists the signed reveal queue entry", async () => {
    const claimPackage = createClaimPackage();
    const fundingKey = ECPair.fromPrivateKey(Buffer.alloc(32, 7), {
      network: networks.testnet,
      compressed: true
    });
    const fundingAddress = payments.p2wpkh({
      pubkey: fundingKey.publicKey,
      network: networks.testnet
    }).address;

    if (!fundingAddress) {
      throw new Error("unable to derive funding address");
    }

    globalThis.fetch = vi.fn(async (_input, init) => {
      const request = JSON.parse(String(init?.body)) as {
        method: string;
        params: unknown[];
      };

      if (request.method === "getblockchaininfo") {
        return new Response(
          JSON.stringify({
            result: {
              chain: "signet",
              blocks: 100,
              headers: 100,
              bestblockhash: "hash100"
            },
            error: null,
            id: "gns"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (request.method === "sendrawtransaction") {
        const transactionHex = String(request.params[0] ?? "");
        const txid = Transaction.fromHex(transactionHex).getId();

        return new Response(
          JSON.stringify({
            result: txid,
            error: null,
            id: "gns"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      throw new Error(`unexpected rpc method ${request.method}`);
    }) as typeof fetch;

    const queuePath = join(sandboxDir, "queue.json");
    const outDir = join(sandboxDir, "artifacts");
    const result = await submitClaim({
      claimPackage,
      network: "signet",
      expectedChain: "signet",
      rpc: createBitcoinRpcConfig("http://127.0.0.1:38332"),
      esplora: undefined,
      commitInputs: [
        {
          txid: "aa".repeat(32),
          vout: 0,
          valueSats: 30_000_000n,
          address: fundingAddress
        }
      ],
      commitFeeSats: 1_000n,
      revealInputs: [
        {
          txid: "bb".repeat(32),
          vout: 1,
          valueSats: 15_000n,
          address: fundingAddress
        }
      ],
      revealFeeSats: 500n,
      wifs: [fundingKey.toWIF()],
      queuePath,
      outDir
    });

    expect(result.kind).toBe("gns-submit-claim-result");
    expect(result.queuePath).toBe(queuePath);
    expect(result.outDir).toBe(outDir);
    expect(result.commitTxid).toHaveLength(64);
    expect(result.revealTxid).toHaveLength(64);

    await access(join(outDir, "commit-artifacts.json"));
    await access(join(outDir, "signed-commit-artifacts.json"));
    await access(join(outDir, "reveal-ready-claim-package.json"));
    await access(join(outDir, "reveal-artifacts.json"));
    await access(join(outDir, "signed-reveal-artifacts.json"));

    const queue = await loadRevealQueueFile(queuePath);
    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]).toMatchObject({
      expectedChain: "signet",
      commitTxid: result.commitTxid,
      revealTxid: result.revealTxid,
      status: "pending"
    });

    const signedRevealArtifacts = JSON.parse(
      await readFile(join(outDir, "signed-reveal-artifacts.json"), "utf8")
    ) as { signedTransactionId: string };
    expect(signedRevealArtifacts.signedTransactionId).toBe(result.revealTxid);
  });

  it("can fund the reveal from the signed commit change output when no reveal input is supplied", async () => {
    const claimPackage = createClaimPackage();
    const fundingKey = ECPair.fromPrivateKey(Buffer.alloc(32, 9), {
      network: networks.testnet,
      compressed: true
    });
    const fundingAddress = payments.p2wpkh({
      pubkey: fundingKey.publicKey,
      network: networks.testnet
    }).address;

    if (!fundingAddress) {
      throw new Error("unable to derive funding address");
    }

    globalThis.fetch = vi.fn(async (_input, init) => {
      const request = JSON.parse(String(init?.body)) as {
        method: string;
        params: unknown[];
      };

      if (request.method === "getblockchaininfo") {
        return new Response(
          JSON.stringify({
            result: {
              chain: "signet",
              blocks: 100,
              headers: 100,
              bestblockhash: "hash100"
            },
            error: null,
            id: "gns"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (request.method === "sendrawtransaction") {
        const transactionHex = String(request.params[0] ?? "");
        const txid = Transaction.fromHex(transactionHex).getId();

        return new Response(
          JSON.stringify({
            result: txid,
            error: null,
            id: "gns"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      throw new Error(`unexpected rpc method ${request.method}`);
    }) as typeof fetch;

    const queuePath = join(sandboxDir, "queue-auto.json");
    const result = await submitClaim({
      claimPackage,
      network: "signet",
      expectedChain: "signet",
      rpc: createBitcoinRpcConfig("http://127.0.0.1:38332"),
      esplora: undefined,
      commitInputs: [
        {
          txid: "cc".repeat(32),
          vout: 0,
          valueSats: 30_000_000n,
          address: fundingAddress
        }
      ],
      commitFeeSats: 1_000n,
      revealInputs: [],
      revealFeeSats: 500n,
      wifs: [fundingKey.toWIF()],
      commitChangeAddress: fundingAddress,
      revealChangeAddress: fundingAddress,
      queuePath
    });

    expect(result.commitTxid).toHaveLength(64);
    expect(result.revealTxid).toHaveLength(64);

    const queue = await loadRevealQueueFile(queuePath);
    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]?.commitTxid).toBe(result.commitTxid);
  });
});
