import { describe, expect, it } from "vitest";
import ECPairFactory from "ecpair";
import { initEccLib, networks, payments, Psbt, Transaction } from "bitcoinjs-lib";
import { BIP32Factory } from "bip32";
import * as tinysecp from "tiny-secp256k1";

import {
  CLAIM_PACKAGE_FORMAT,
  CLAIM_PACKAGE_VERSION,
  computeCommitHash,
  encodeCommitPayload,
  parseClaimPackage,
  PROTOCOL_NAME
} from "@gns/protocol";

import {
  buildCommitArtifacts,
  buildImmatureSaleTransferArtifacts,
  buildRevealArtifacts,
  buildSaleTransferArtifacts,
  buildTransferArtifacts,
  parseFundingInputDescriptor
} from "./builder.js";

initEccLib(tinysecp);
const ECPair = ECPairFactory(tinysecp);
const bip32 = BIP32Factory(tinysecp);

function createTestAddress(seed: number): string {
  const hash = Buffer.alloc(20, seed);
  const address = payments.p2wpkh({ hash, network: networks.testnet }).address;

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
    exportedAt: "2026-03-18T20:00:00.000Z",
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

describe("parseFundingInputDescriptor", () => {
  it("parses txid:vout:value:address descriptors", () => {
    const descriptor = parseFundingInputDescriptor(
      `${"aa".repeat(32)}:1:50000:${createTestAddress(7)}`
    );

    expect(descriptor).toEqual({
      txid: "aa".repeat(32),
      vout: 1,
      valueSats: 50000n,
      address: createTestAddress(7)
    });
  });

  it("parses descriptors with derivation paths", () => {
    const descriptor = parseFundingInputDescriptor(
      `${"bb".repeat(32)}:2:75000:${createTestAddress(8)}:m/84'/1'/0'/0/5`
    );

    expect(descriptor).toEqual({
      txid: "bb".repeat(32),
      vout: 2,
      valueSats: 75000n,
      address: createTestAddress(8),
      derivationPath: "m/84'/1'/0'/0/5"
    });
  });
});

describe("buildCommitArtifacts", () => {
  it("builds unsigned commit artifacts and upgrades the claim package to reveal-ready", () => {
    const claimPackage = createClaimPackage();
    const artifacts = buildCommitArtifacts({
      claimPackage,
      fundingInputs: [
        {
          txid: "aa".repeat(32),
          vout: 0,
          valueSats: 30_000_000n,
          address: createTestAddress(3)
        }
      ],
      feeSats: 1_000n,
      network: "signet"
    });

    expect(artifacts.kind).toBe("gns-commit-artifacts");
    expect(artifacts.commitTxid).toHaveLength(64);
    expect(artifacts.updatedClaimPackage.revealReady).toBe(true);
    expect(artifacts.updatedClaimPackage.commitTxid).toBe(artifacts.commitTxid);

    const transaction = Transaction.fromHex(artifacts.unsignedTransactionHex);
    expect(transaction.outs).toHaveLength(3);
    expect(transaction.outs[0]?.value).toBe(25_000_000n);
    expect(transaction.outs[1]?.value).toBe(0n);
  });

  it("includes BIP32 derivation metadata when wallet information is supplied", () => {
    const seed = Buffer.alloc(32, 42);
    const root = bip32.fromSeed(seed, networks.testnet);
    const accountNode = root.deriveHardened(84).deriveHardened(1).deriveHardened(0);
    const fundingNode = accountNode.derive(0).derive(3);
    const fundingAddress = payments.p2wpkh({
      pubkey: Buffer.from(fundingNode.publicKey),
      network: networks.testnet
    }).address;

    if (!fundingAddress) {
      throw new Error("unable to derive funding address");
    }

    const artifacts = buildCommitArtifacts({
      claimPackage: createClaimPackage(),
      fundingInputs: [
        {
          txid: "cc".repeat(32),
          vout: 0,
          valueSats: 30_000_000n,
          address: fundingAddress
        }
      ],
      feeSats: 1_000n,
      network: "signet",
      walletDerivation: {
        masterFingerprint: Buffer.from(root.fingerprint).toString("hex"),
        accountXpub: accountNode.neutered().toBase58(),
        accountDerivationPath: "m/84'/1'/0'",
        scanLimit: 10
      }
    });

    const psbt = Psbt.fromBase64(artifacts.psbtBase64, { network: networks.testnet });
    const derivation = psbt.data.inputs[0]?.bip32Derivation?.[0];

    expect(derivation?.path).toBe("m/84'/1'/0'/0/3");
    expect(Buffer.from(derivation?.masterFingerprint ?? []).toString("hex")).toBe(
      Buffer.from(root.fingerprint).toString("hex")
    );
    expect(Buffer.from(derivation?.pubkey ?? []).toString("hex")).toBe(
      Buffer.from(fundingNode.publicKey).toString("hex")
    );
  });
});

describe("buildRevealArtifacts", () => {
  it("builds unsigned reveal artifacts from a reveal-ready claim package", () => {
    const claimPackage = createClaimPackage();
    const commitArtifacts = buildCommitArtifacts({
      claimPackage,
      fundingInputs: [
        {
          txid: "aa".repeat(32),
          vout: 0,
          valueSats: 30_000_000n,
          address: createTestAddress(3)
        }
      ],
      feeSats: 1_000n,
      network: "signet"
    });

    const revealArtifacts = buildRevealArtifacts({
      claimPackage: commitArtifacts.updatedClaimPackage,
      fundingInputs: [
        {
          txid: "bb".repeat(32),
          vout: 1,
          valueSats: 15_000n,
          address: createTestAddress(4)
        }
      ],
      feeSats: 500n,
      network: "signet"
    });

    expect(revealArtifacts.kind).toBe("gns-reveal-artifacts");
    expect(revealArtifacts.revealTxid).toHaveLength(64);

    const transaction = Transaction.fromHex(revealArtifacts.unsignedTransactionHex);
    expect(transaction.outs[0]?.value).toBe(0n);
  });
});

describe("buildTransferArtifacts", () => {
  it("builds unsigned transfer artifacts with a successor bond and embedded transfer payload", () => {
    const ownerKey = ECPair.fromPrivateKey(Buffer.alloc(32, 7), {
      network: networks.testnet,
      compressed: true
    });
    const fundingAddress = payments.p2wpkh({
      pubkey: ownerKey.publicKey,
      network: networks.testnet
    }).address;

    if (!fundingAddress) {
      throw new Error("unable to derive funding address");
    }

    const artifacts = buildTransferArtifacts({
      prevStateTxid: "44".repeat(32),
      ownerPrivateKeyHex: Buffer.from(ownerKey.privateKey ?? []).toString("hex"),
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
      bondAddress: createTestAddress(9),
      changeAddress: createTestAddress(10)
    });

    expect(artifacts.kind).toBe("gns-transfer-artifacts");
    expect(artifacts.transferTxid).toHaveLength(64);

    const transaction = Transaction.fromHex(artifacts.unsignedTransactionHex);
    expect(transaction.outs[0]?.value).toBe(25_000_000n);
    expect(transaction.outs[1]?.value).toBe(0n);
  });
});

describe("buildSaleTransferArtifacts", () => {
  it("builds unsigned cooperative sale-transfer artifacts with seller payment and buyer/seller change outputs", () => {
    const sellerKey = ECPair.fromPrivateKey(Buffer.alloc(32, 12), {
      network: networks.testnet,
      compressed: true
    });
    const buyerKey = ECPair.fromPrivateKey(Buffer.alloc(32, 13), {
      network: networks.testnet,
      compressed: true
    });
    const sellerAddress = payments.p2wpkh({
      pubkey: sellerKey.publicKey,
      network: networks.testnet
    }).address;
    const buyerAddress = payments.p2wpkh({
      pubkey: buyerKey.publicKey,
      network: networks.testnet
    }).address;
    const sellerPaymentAddress = createTestAddress(14);

    if (!sellerAddress || !buyerAddress) {
      throw new Error("unable to derive sale test addresses");
    }

    const artifacts = buildSaleTransferArtifacts({
      prevStateTxid: "66".repeat(32),
      ownerPrivateKeyHex: Buffer.from(sellerKey.privateKey ?? []).toString("hex"),
      newOwnerPubkey: "77".repeat(32),
      sellerInputs: [
        {
          txid: "aa".repeat(32),
          vout: 0,
          valueSats: 12_000n,
          address: sellerAddress
        }
      ],
      buyerInputs: [
        {
          txid: "bb".repeat(32),
          vout: 1,
          valueSats: 55_000n,
          address: buyerAddress
        }
      ],
      sellerPaymentSats: 40_000n,
      sellerPaymentAddress,
      feeSats: 1_000n,
      network: "signet",
      sellerChangeAddress: sellerAddress,
      buyerChangeAddress: buyerAddress
    });

    expect(artifacts.kind).toBe("gns-transfer-artifacts");
    expect(artifacts.mode).toBe("sale");
    expect(artifacts.transferTxid).toHaveLength(64);

    const transaction = Transaction.fromHex(artifacts.unsignedTransactionHex);
    expect(transaction.outs[0]?.value).toBe(0n);
    expect(transaction.outs[1]?.value).toBe(40_000n);
    expect(transaction.outs[2]?.value).toBe(12_000n);
    expect(transaction.outs[3]?.value).toBe(14_000n);
  });
});

describe("buildImmatureSaleTransferArtifacts", () => {
  it("builds unsigned immature sale-transfer artifacts where the buyer funds the successor bond", () => {
    const sellerKey = ECPair.fromPrivateKey(Buffer.alloc(32, 30), {
      network: networks.testnet,
      compressed: true
    });
    const buyerKey = ECPair.fromPrivateKey(Buffer.alloc(32, 31), {
      network: networks.testnet,
      compressed: true
    });
    const sellerAddress = payments.p2wpkh({
      pubkey: sellerKey.publicKey,
      network: networks.testnet
    }).address;
    const buyerAddress = payments.p2wpkh({
      pubkey: buyerKey.publicKey,
      network: networks.testnet
    }).address;
    const sellerPayoutAddress = createTestAddress(32);

    if (!sellerAddress || !buyerAddress) {
      throw new Error("unable to derive immature sale test addresses");
    }

    const artifacts = buildImmatureSaleTransferArtifacts({
      prevStateTxid: "88".repeat(32),
      ownerPrivateKeyHex: Buffer.from(sellerKey.privateKey ?? []).toString("hex"),
      newOwnerPubkey: "99".repeat(32),
      successorBondVout: 0,
      successorBondSats: 25_000_000n,
      currentBondInput: {
        txid: "aa".repeat(32),
        vout: 0,
        valueSats: 25_000_000n,
        address: sellerAddress
      },
      sellerInputs: [
        {
          txid: "ab".repeat(32),
          vout: 1,
          valueSats: 5_000n,
          address: sellerAddress
        }
      ],
      buyerInputs: [
        {
          txid: "bb".repeat(32),
          vout: 2,
          valueSats: 25_050_000n,
          address: buyerAddress
        }
      ],
      salePriceSats: 40_000n,
      sellerPayoutAddress,
      feeSats: 1_000n,
      network: "signet",
      bondAddress: buyerAddress,
      buyerChangeAddress: buyerAddress
    });

    expect(artifacts.kind).toBe("gns-transfer-artifacts");
    expect(artifacts.mode).toBe("immature-sale");
    expect(artifacts.transferTxid).toHaveLength(64);

    const transaction = Transaction.fromHex(artifacts.unsignedTransactionHex);
    expect(transaction.outs[0]?.value).toBe(25_000_000n);
    expect(transaction.outs[1]?.value).toBe(0n);
    expect(transaction.outs[2]?.value).toBe(25_045_000n);
    expect(transaction.outs[3]?.value).toBe(9_000n);
  });
});
