import { describe, expect, it } from "vitest";
import ECPairFactory from "ecpair";
import { initEccLib, networks } from "bitcoinjs-lib";
import * as tinysecp from "tiny-secp256k1";

import {
  buildExperimentalAnnexRevealEnvelope,
  parseExperimentalAnnexRevealEnvelope,
  parseSignedExperimentalAnnexRevealEnvelope,
  signExperimentalAnnexRevealEnvelope,
  verifyExperimentalAnnexRevealEnvelope
} from "./annex-envelope.js";

initEccLib(tinysecp);

const ECPair = ECPairFactory(tinysecp);

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

    expect(reparsedUnsigned.kind).toBe("gns-batch-reveal-annex-artifacts");
    expect(reparsedSigned.kind).toBe("gns-signed-batch-reveal-annex-artifacts");
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
});
