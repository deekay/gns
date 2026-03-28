import { describe, expect, it } from "vitest";
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

import { buildCommitArtifacts, buildTransferArtifacts } from "./builder.js";
import { signArtifacts } from "./signer.js";

initEccLib(tinysecp);
const ECPair = ECPairFactory(tinysecp);

function createClaimPackage() {
  const name = "bob";
  const ownerPubkey = "11".repeat(32);
  const nonceHex = "0102030405060708";
  const commitHash = computeCommitHash({
    name,
    nonce: BigInt(`0x${nonceHex}`),
    ownerPubkey
  });

  const fundingKey = ECPair.fromPrivateKey(Buffer.alloc(32, 7), {
    network: networks.testnet,
    compressed: true
  });
  const fundingAddress = payments.p2wpkh({
    pubkey: fundingKey.publicKey,
    network: networks.testnet
  }).address;
  const bondAddress = payments.p2wpkh({
    hash: Buffer.alloc(20, 1),
    network: networks.testnet
  }).address;
  const changeAddress = payments.p2wpkh({
    hash: Buffer.alloc(20, 2),
    network: networks.testnet
  }).address;

  if (!fundingAddress || !bondAddress || !changeAddress) {
    throw new Error("unable to derive test addresses");
  }

  return {
    claimPackage: parseClaimPackage({
      format: CLAIM_PACKAGE_FORMAT,
      packageVersion: CLAIM_PACKAGE_VERSION,
      protocol: PROTOCOL_NAME,
      exportedAt: "2026-03-18T20:00:00.000Z",
      name,
      ownerPubkey,
      nonceHex,
      nonceDecimal: BigInt(`0x${nonceHex}`).toString(),
      requiredBondSats: "25000000",
      bondVout: 0,
      bondDestination: bondAddress,
      changeDestination: changeAddress,
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
    }),
    fundingKey,
    fundingAddress
  };
}

describe("signArtifacts", () => {
  it("signs witnesspubkeyhash commit artifacts and preserves txid", () => {
    const { claimPackage, fundingKey, fundingAddress } = createClaimPackage();
    const artifacts = buildCommitArtifacts({
      claimPackage,
      fundingInputs: [
        {
          txid: "aa".repeat(32),
          vout: 0,
          valueSats: 30_000_000n,
          address: fundingAddress
        }
      ],
      feeSats: 1_000n,
      network: "signet"
    });

    const signed = signArtifacts({
      artifacts,
      wifs: [fundingKey.toWIF()]
    });

    expect(signed.kind).toBe("gns-signed-commit-artifacts");
    expect(signed.signedTransactionId).toBe(artifacts.commitTxid);

    const transaction = Transaction.fromHex(signed.signedTransactionHex);
    expect(transaction.ins[0]?.witness.length).toBeGreaterThan(0);
  });

  it("signs witnesspubkeyhash transfer artifacts and preserves txid", () => {
    const { fundingKey, fundingAddress } = createClaimPackage();
    const artifacts = buildTransferArtifacts({
      prevStateTxid: "44".repeat(32),
      ownerPrivateKeyHex: Buffer.from(fundingKey.privateKey ?? []).toString("hex"),
      newOwnerPubkey: "55".repeat(32),
      successorBondVout: 0,
      successorBondSats: 25_000_000n,
      currentBondInput: {
        txid: "aa".repeat(32),
        vout: 0,
        valueSats: 25_000_000n,
        address: fundingAddress
      },
      additionalFundingInputs: [
        {
          txid: "bb".repeat(32),
          vout: 1,
          valueSats: 10_000n,
          address: fundingAddress
        }
      ],
      feeSats: 1_000n,
      network: "signet",
      bondAddress: payments.p2wpkh({
        hash: Buffer.alloc(20, 3),
        network: networks.testnet
      }).address ?? "",
      changeAddress: payments.p2wpkh({
        hash: Buffer.alloc(20, 4),
        network: networks.testnet
      }).address ?? ""
    });

    const signed = signArtifacts({
      artifacts,
      wifs: [fundingKey.toWIF()]
    });

    expect(signed.kind).toBe("gns-signed-transfer-artifacts");
    expect(signed.signedTransactionId).toBe(artifacts.transferTxid);

    const transaction = Transaction.fromHex(signed.signedTransactionHex);
    expect(transaction.ins[0]?.witness.length).toBeGreaterThan(0);
  });
});
