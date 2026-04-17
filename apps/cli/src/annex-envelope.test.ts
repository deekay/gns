import { describe, expect, it } from "vitest";
import ECPairFactory from "ecpair";
import { initEccLib, networks, payments } from "bitcoinjs-lib";
import * as tinysecp from "tiny-secp256k1";

import {
  CLAIM_PACKAGE_FORMAT,
  CLAIM_PACKAGE_VERSION,
  computeCommitHash,
  decodeBatchRevealPayload,
  encodeCommitPayload,
  parseClaimPackage,
  PROTOCOL_NAME
} from "@ont/protocol";

import {
  buildExperimentalAnnexRevealEnvelope,
  buildExperimentalAnnexRevealEnvelopeFromBatchClaimPackage,
  parseExperimentalAnnexRevealEnvelope,
  parseSignedExperimentalAnnexRevealEnvelope,
  signExperimentalAnnexRevealEnvelope,
  verifyExperimentalAnnexRevealEnvelope
} from "./annex-envelope.js";
import { buildBatchCommitArtifacts } from "./builder.js";

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
    bondDestination:
      payments.p2wpkh({
        hash: Buffer.alloc(20, 1),
        network: networks.regtest
      }).address ?? "",
    changeDestination:
      payments.p2wpkh({
        hash: Buffer.alloc(20, 2),
        network: networks.regtest
      }).address ?? "",
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

function createSecondClaimPackage() {
  const name = "alice";
  const ownerPubkey = "22".repeat(32);
  const nonceHex = "1112131415161718";
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
    requiredBondSats: "6250000",
    bondVout: 0,
    bondDestination:
      payments.p2wpkh({
        hash: Buffer.alloc(20, 5),
        network: networks.regtest
      }).address ?? "",
    changeDestination:
      payments.p2wpkh({
        hash: Buffer.alloc(20, 6),
        network: networks.regtest
      }).address ?? "",
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

describe("experimental annex envelope flow", () => {
  it("builds, signs, parses, and verifies an annex reveal envelope round-trip", () => {
    const keyPair = ECPair.fromPrivateKey(Buffer.alloc(32, 71), {
      network: networks.regtest,
      compressed: true
    });
    const unsignedEnvelope = buildExperimentalAnnexRevealEnvelope({
      network: "regtest",
      name: "benchclaim00",
      anchorTxid: "19".repeat(32),
      bondVout: 1,
      carrierPrevout: {
        txid: "31".repeat(32),
        vout: 2,
        valueSats: 75_000n
      },
      feeSats: 500n,
      wif: keyPair.toWIF()
    });
    const reparsedUnsigned = parseExperimentalAnnexRevealEnvelope(
      JSON.parse(JSON.stringify(unsignedEnvelope))
    );
    const signedEnvelope = signExperimentalAnnexRevealEnvelope({
      unsignedEnvelope: reparsedUnsigned,
      wif: keyPair.toWIF()
    });
    const reparsedSigned = parseSignedExperimentalAnnexRevealEnvelope(
      JSON.parse(JSON.stringify(signedEnvelope))
    );
    const verification = verifyExperimentalAnnexRevealEnvelope({
      unsignedEnvelope: reparsedUnsigned,
      signedEnvelope: reparsedSigned
    });

    expect(reparsedUnsigned.kind).toBe("ont-batch-reveal-annex-artifacts");
    expect(reparsedSigned.kind).toBe("ont-signed-batch-reveal-annex-artifacts");
    expect(reparsedSigned.signedTransactionId).toBe(reparsedUnsigned.unsignedBaseTransactionId);
    expect(reparsedSigned.signedTransactionWitnessId).not.toBe(reparsedSigned.signedTransactionId);
    expect(reparsedSigned.signedPsbtBase64).toBeNull();
    expect(Object.values(verification.verification).every(Boolean)).toBe(true);
  });

  it("rejects a signer WIF that does not match the carrier input", () => {
    const keyPair = ECPair.fromPrivateKey(Buffer.alloc(32, 71), {
      network: networks.regtest,
      compressed: true
    });
    const otherKeyPair = ECPair.fromPrivateKey(Buffer.alloc(32, 72), {
      network: networks.regtest,
      compressed: true
    });
    const unsignedEnvelope = buildExperimentalAnnexRevealEnvelope({
      network: "regtest",
      name: "benchclaim00",
      anchorTxid: "19".repeat(32),
      bondVout: 1,
      carrierPrevout: {
        txid: "31".repeat(32),
        vout: 2,
        valueSats: 75_000n
      },
      feeSats: 500n,
      wif: keyPair.toWIF()
    });

    expect(() =>
      signExperimentalAnnexRevealEnvelope({
        unsignedEnvelope,
        wif: otherKeyPair.toWIF()
      })
    ).toThrow("no supplied WIF matched the experimental annex carrier input");
  });

  it("builds an experimental annex envelope from a real reveal-ready batch claim package", () => {
    const keyPair = ECPair.fromPrivateKey(Buffer.alloc(32, 71), {
      network: networks.regtest,
      compressed: true
    });
    const commitArtifacts = buildBatchCommitArtifacts({
      claimPackages: [createClaimPackage(), createSecondClaimPackage()],
      fundingInputs: [
        {
          txid: "aa".repeat(32),
          vout: 0,
          valueSats: 40_000_000n,
          address:
            payments.p2wpkh({
              pubkey: keyPair.publicKey,
              network: networks.regtest
            }).address ?? ""
        }
      ],
      feeSats: 1_500n,
      network: "regtest"
    });
    const batchClaimPackage = commitArtifacts.updatedClaimPackages[0]!;
    const unsignedEnvelope = buildExperimentalAnnexRevealEnvelopeFromBatchClaimPackage({
      network: "regtest",
      claimPackage: batchClaimPackage,
      carrierPrevout: {
        txid: "31".repeat(32),
        vout: 2,
        valueSats: 75_000n
      },
      feeSats: 500n,
      wif: keyPair.toWIF()
    });
    const signedEnvelope = signExperimentalAnnexRevealEnvelope({
      unsignedEnvelope,
      wif: keyPair.toWIF()
    });
    const verification = verifyExperimentalAnnexRevealEnvelope({
      unsignedEnvelope,
      signedEnvelope
    });

    const decodedPayload = decodeBatchRevealPayload(
      Buffer.from(unsignedEnvelope.ontBatchRevealPayloadHex ?? "", "hex")
    );

    expect(unsignedEnvelope.semanticMode).toBe("batch_claim_package");
    expect(unsignedEnvelope.ontBatchRevealPayloadHex).not.toBe(batchClaimPackage.revealPayloadHex);
    expect(decodedPayload.anchorTxid).toBe(batchClaimPackage.batchAnchorTxid);
    expect(decodedPayload.bondVout).toBe(batchClaimPackage.bondVout);
    expect(decodedPayload.proofBytesLength).toBe(batchClaimPackage.batchProofBytes);
    expect(decodedPayload.proofChunkCount).toBe(0);
    expect(decodedPayload.name).toBe(batchClaimPackage.name);
    expect(unsignedEnvelope.annexHex.startsWith("5000")).toBe(true);
    expect(unsignedEnvelope.annexHex.slice(4)).toBe(batchClaimPackage.batchProofHex);
    expect(Object.values(verification.verification).every(Boolean)).toBe(true);
  });
});
