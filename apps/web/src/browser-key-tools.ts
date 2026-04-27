import { schnorr, secp256k1 } from "@noble/curves/secp256k1.js";

export interface BrowserGeneratedOwnerKey {
  readonly ownerPubkey: string;
  readonly privateKeyHex: string;
}

export function generateBrowserOwnerKey(): BrowserGeneratedOwnerKey {
  const privateKey = secp256k1.utils.randomSecretKey();

  return {
    ownerPubkey: bytesToHex(schnorr.getPublicKey(privateKey)),
    privateKeyHex: bytesToHex(privateKey)
  };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
