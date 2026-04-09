import { Buffer } from "node:buffer";

import ECPairFactory from "ecpair";
import {
  Psbt,
  Transaction,
  crypto as btcCrypto,
  initEccLib,
  networks,
  payments,
  script as btcScript,
  toXOnly
} from "bitcoinjs-lib";
import * as tinysecp from "tiny-secp256k1";

import type { GnsCliNetwork } from "./builder.js";

initEccLib(tinysecp);

const ECPair = ECPairFactory(tinysecp);

const PROTOCOL_MAGIC = Buffer.from("gns", "utf8");
const EXPERIMENTAL_ANNEX_TYPE = 0xf0;
const EXPERIMENTAL_ANNEX_FORMAT = "gns-batch-proof-v0";
const DEFAULT_EXPERIMENTAL_FEE_SATS = 500n;
const DEFAULT_EXPERIMENTAL_PROOF_BYTES = 99;
const DEFAULT_EXPERIMENTAL_PROOF_FILL_BYTE = 0x41;
const ANNEX_PREFIX = Buffer.from([0x50, 0x00]);

export interface ExperimentalAnnexCarrierPrevout {
  readonly txid: string;
  readonly vout: number;
  readonly valueSats: string;
}

export interface ExperimentalAnnexUnsignedEnvelope {
  readonly kind: "gns-batch-reveal-annex-artifacts";
  readonly network: GnsCliNetwork;
  readonly psbtBase64: string;
  readonly unsignedBaseTransactionHex: string;
  readonly unsignedBaseTransactionId: string;
  readonly carrierInputIndex: number;
  readonly carrierPrevout: ExperimentalAnnexCarrierPrevout;
  readonly carrierAddress: string;
  readonly taprootInternalPubkey: string;
  readonly explicitHeaderHex: string;
  readonly explicitHeaderSha256: string;
  readonly annexHex: string;
  readonly annexSha256: string;
  readonly annexBytesLength: number;
  readonly annexFormat: string;
  readonly anchorTxid: string;
  readonly name: string;
  readonly bondVout: number;
  readonly feeSats: string;
}

export interface ExperimentalAnnexSignedEnvelope {
  readonly kind: "gns-signed-batch-reveal-annex-artifacts";
  readonly network: GnsCliNetwork;
  readonly signedTransactionHex: string;
  readonly signedTransactionId: string;
  readonly signedTransactionWitnessId: string;
  readonly signedInputCount: number;
  readonly signedPsbtBase64: null;
  readonly signedPsbtReason: string;
  readonly carrierInputIndex: number;
  readonly annexSha256: string;
  readonly annexBytesLength: number;
  readonly explicitHeaderSha256: string;
  readonly anchorTxid: string;
  readonly name: string;
  readonly bondVout: number;
}

export interface ExperimentalAnnexVerificationReport {
  readonly kind: "gns-batch-reveal-annex-verification";
  readonly network: GnsCliNetwork;
  readonly signedTransactionId: string;
  readonly signedTransactionWitnessId: string;
  readonly verification: {
    readonly witnessAnnexPresent: boolean;
    readonly witnessAnnexMatchesUnsignedEnvelope: boolean;
    readonly witnessAnnexHashMatchesHeader: boolean;
    readonly witnessAnnexHashMatchesSignedEnvelope: boolean;
    readonly headerShaMatchesUnsignedEnvelope: boolean;
    readonly headerShaMatchesSignedEnvelope: boolean;
    readonly headerCarrierInputMatchesSignedEnvelope: boolean;
    readonly signedTxidMatchesEnvelope: boolean;
    readonly signedWtxidMatchesEnvelope: boolean;
    readonly signatureVerifiesAgainstRecoveredAnnex: boolean;
  };
}

export interface BuildExperimentalAnnexRevealEnvelopeOptions {
  readonly network: GnsCliNetwork;
  readonly name: string;
  readonly anchorTxid: string;
  readonly bondVout: number;
  readonly carrierPrevout: {
    readonly txid: string;
    readonly vout: number;
    readonly valueSats: bigint;
  };
  readonly wif: string;
  readonly carrierInputIndex?: number;
  readonly feeSats?: bigint;
  readonly changeAddress?: string;
  readonly annexProofHex?: string;
  readonly annexProofBytes?: number;
  readonly annexProofFillByte?: number;
}

export interface SignExperimentalAnnexRevealEnvelopeOptions {
  readonly unsignedEnvelope: ExperimentalAnnexUnsignedEnvelope;
  readonly wif: string;
}

export interface VerifyExperimentalAnnexRevealEnvelopeOptions {
  readonly unsignedEnvelope: ExperimentalAnnexUnsignedEnvelope;
  readonly signedEnvelope: ExperimentalAnnexSignedEnvelope;
}

export function buildExperimentalAnnexRevealEnvelope(
  options: BuildExperimentalAnnexRevealEnvelopeOptions
): ExperimentalAnnexUnsignedEnvelope {
  validateName(options.name);
  const network = resolveNetwork(options.network);
  const keyPair = ECPair.fromWIF(options.wif, [network]);
  const internalPubkey = Buffer.from(toXOnly(keyPair.publicKey));
  const taprootPayment = payments.p2tr({
    internalPubkey,
    network
  });

  if (!taprootPayment.output || !taprootPayment.address) {
    throw new Error("failed to derive experimental taproot carrier payment");
  }

  const feeSats = options.feeSats ?? DEFAULT_EXPERIMENTAL_FEE_SATS;
  if (feeSats < 0n) {
    throw new Error("experimental annex feeSats must be non-negative");
  }

  const prevoutValue = options.carrierPrevout.valueSats;
  if (prevoutValue <= feeSats) {
    throw new Error("experimental annex carrier prevout must exceed feeSats");
  }

  assertTxidHex(options.anchorTxid, "anchorTxid");

  const annexProof = options.annexProofHex
    ? parseHex(options.annexProofHex, "annexProofHex")
    : createDeterministicProofBytes(
        options.annexProofBytes ?? DEFAULT_EXPERIMENTAL_PROOF_BYTES,
        options.annexProofFillByte ?? DEFAULT_EXPERIMENTAL_PROOF_FILL_BYTE
      );
  const annex = Buffer.concat([ANNEX_PREFIX, annexProof]);
  const carrierInputIndex = options.carrierInputIndex ?? 0;
  const explicitHeader = buildIllustrativeHybridHeader({
    anchorTxid: options.anchorTxid,
    bondVout: options.bondVout,
    carrierInputIndex,
    annex,
    name: options.name
  });
  const changeValue = prevoutValue - feeSats;
  const changeAddress = options.changeAddress ?? taprootPayment.address;

  const transaction = new Transaction();
  transaction.version = 2;
  transaction.addInput(reverseHex(options.carrierPrevout.txid), options.carrierPrevout.vout);
  transaction.addOutput(btcScript.compile([btcScript.OPS.OP_RETURN, explicitHeader]), 0n);
  transaction.addOutput(taprootPayment.output, changeValue);

  const psbt = new Psbt({ network });
  psbt.setVersion(2);
  psbt.addInput({
    hash: options.carrierPrevout.txid,
    index: options.carrierPrevout.vout,
    witnessUtxo: {
      script: taprootPayment.output,
      value: prevoutValue
    },
    tapInternalKey: internalPubkey
  });
  psbt.addOutput({
    script: btcScript.compile([btcScript.OPS.OP_RETURN, explicitHeader]),
    value: 0n
  });
  psbt.addOutput({
    address: changeAddress,
    value: changeValue
  });

  return {
    kind: "gns-batch-reveal-annex-artifacts",
    network: options.network,
    psbtBase64: psbt.toBase64(),
    unsignedBaseTransactionHex: transaction.toHex(),
    unsignedBaseTransactionId: transaction.getId(),
    carrierInputIndex,
    carrierPrevout: {
      txid: options.carrierPrevout.txid,
      vout: options.carrierPrevout.vout,
      valueSats: prevoutValue.toString()
    },
    carrierAddress: taprootPayment.address,
    taprootInternalPubkey: bytesToHex(internalPubkey),
    explicitHeaderHex: bytesToHex(explicitHeader),
    explicitHeaderSha256: bytesToHex(btcCrypto.sha256(explicitHeader)),
    annexHex: bytesToHex(annex),
    annexSha256: bytesToHex(btcCrypto.sha256(annex)),
    annexBytesLength: annex.length,
    annexFormat: EXPERIMENTAL_ANNEX_FORMAT,
    anchorTxid: options.anchorTxid,
    name: options.name,
    bondVout: options.bondVout,
    feeSats: feeSats.toString()
  };
}

export function signExperimentalAnnexRevealEnvelope(
  options: SignExperimentalAnnexRevealEnvelopeOptions
): ExperimentalAnnexSignedEnvelope {
  const network = resolveNetwork(options.unsignedEnvelope.network);
  const psbt = Psbt.fromBase64(options.unsignedEnvelope.psbtBase64, { network });
  const tx = Transaction.fromHex(options.unsignedEnvelope.unsignedBaseTransactionHex);
  const keyPair = ECPair.fromWIF(options.wif, [network]);
  const input = psbt.data.inputs[options.unsignedEnvelope.carrierInputIndex];

  if (!input?.witnessUtxo) {
    throw new Error("experimental annex signer requires witnessUtxo on the carrier input");
  }

  if (!input.tapInternalKey) {
    throw new Error("experimental annex signer requires tapInternalKey on the carrier input");
  }

  const expectedInternalPubkey = Buffer.from(input.tapInternalKey);
  const signerInternalPubkey = Buffer.from(toXOnly(keyPair.publicKey));

  if (!expectedInternalPubkey.equals(signerInternalPubkey)) {
    throw new Error("no supplied WIF matched the experimental annex carrier input");
  }

  if (tx.getId() !== options.unsignedEnvelope.unsignedBaseTransactionId) {
    throw new Error("unsigned base transaction id does not match the envelope");
  }

  const headerBytes = Buffer.from(options.unsignedEnvelope.explicitHeaderHex, "hex");
  const parsedHeader = parseIllustrativeHybridHeader(headerBytes);

  if (parsedHeader.carrierInputIndex !== options.unsignedEnvelope.carrierInputIndex) {
    throw new Error("explicit header carrierInputIndex does not match the envelope");
  }

  if (parsedHeader.annexSha256 !== options.unsignedEnvelope.annexSha256) {
    throw new Error("explicit header annex hash does not match the envelope");
  }

  if (parsedHeader.anchorTxid !== options.unsignedEnvelope.anchorTxid) {
    throw new Error("explicit header anchorTxid does not match the envelope");
  }

  if (parsedHeader.bondVout !== options.unsignedEnvelope.bondVout) {
    throw new Error("explicit header bondVout does not match the envelope");
  }

  if (parsedHeader.name !== options.unsignedEnvelope.name) {
    throw new Error("explicit header name does not match the envelope");
  }

  const annex = Buffer.from(options.unsignedEnvelope.annexHex, "hex");
  const annexSha256 = bytesToHex(btcCrypto.sha256(annex));

  if (annexSha256 !== options.unsignedEnvelope.annexSha256) {
    throw new Error("annex bytes do not match annexSha256");
  }

  const tweakedPrivateKey = tweakPrivateKey({
    privateKey: Buffer.from(keyPair.privateKey ?? []),
    publicKey: Buffer.from(keyPair.publicKey)
  });
  const sighash = Buffer.from(
    tx.hashForWitnessV1(
      options.unsignedEnvelope.carrierInputIndex,
      [input.witnessUtxo.script],
      [input.witnessUtxo.value],
      Transaction.SIGHASH_DEFAULT,
      undefined,
      annex
    )
  );
  const signature = Buffer.from(tinysecp.signSchnorr(sighash, tweakedPrivateKey));

  tx.setWitness(options.unsignedEnvelope.carrierInputIndex, [signature, annex]);

  return {
    kind: "gns-signed-batch-reveal-annex-artifacts",
    network: options.unsignedEnvelope.network,
    signedTransactionHex: tx.toHex(),
    signedTransactionId: tx.getId(),
    signedTransactionWitnessId: displayHash(tx.getHash(true)),
    signedInputCount: 1,
    signedPsbtBase64: null,
    signedPsbtReason:
      "custom annex finalization signs and attaches witness outside standard PSBT fields",
    carrierInputIndex: options.unsignedEnvelope.carrierInputIndex,
    annexSha256: options.unsignedEnvelope.annexSha256,
    annexBytesLength: options.unsignedEnvelope.annexBytesLength,
    explicitHeaderSha256: options.unsignedEnvelope.explicitHeaderSha256,
    anchorTxid: options.unsignedEnvelope.anchorTxid,
    name: options.unsignedEnvelope.name,
    bondVout: options.unsignedEnvelope.bondVout
  };
}

export function verifyExperimentalAnnexRevealEnvelope(
  options: VerifyExperimentalAnnexRevealEnvelopeOptions
): ExperimentalAnnexVerificationReport {
  const tx = Transaction.fromHex(options.signedEnvelope.signedTransactionHex);
  const carrierWitness = tx.ins[options.signedEnvelope.carrierInputIndex]?.witness ?? [];
  const recoveredAnnex = Buffer.from(carrierWitness.at(-1) ?? []);
  const recoveredSignature = Buffer.from(carrierWitness[0] ?? []);
  const headerBytes = extractOpReturnPayload(tx.outs[0]?.script ?? new Uint8Array());
  const parsedHeader = parseIllustrativeHybridHeader(headerBytes);
  const headerHash = bytesToHex(btcCrypto.sha256(headerBytes));
  const annexHash = recoveredAnnex.length === 0 ? "" : bytesToHex(btcCrypto.sha256(recoveredAnnex));
  const network = resolveNetwork(options.unsignedEnvelope.network);
  const psbt = Psbt.fromBase64(options.unsignedEnvelope.psbtBase64, { network });
  const input = psbt.data.inputs[options.signedEnvelope.carrierInputIndex];

  if (!input?.witnessUtxo) {
    throw new Error("experimental annex verifier requires witnessUtxo on the carrier input");
  }

  if (!input.tapInternalKey) {
    throw new Error("experimental annex verifier requires tapInternalKey on the carrier input");
  }

  const tweakedPublicKey = deriveTweakedOutputKey({
    internalPubkey: Buffer.from(input.tapInternalKey),
    ...(input.tapMerkleRoot ? { tapMerkleRoot: Buffer.from(input.tapMerkleRoot) } : {})
  });
  const sighash = Buffer.from(
    tx.hashForWitnessV1(
      options.signedEnvelope.carrierInputIndex,
      [input.witnessUtxo.script],
      [input.witnessUtxo.value],
      Transaction.SIGHASH_DEFAULT,
      undefined,
      recoveredAnnex
    )
  );

  return {
    kind: "gns-batch-reveal-annex-verification",
    network: options.unsignedEnvelope.network,
    signedTransactionId: tx.getId(),
    signedTransactionWitnessId: displayHash(tx.getHash(true)),
    verification: {
      witnessAnnexPresent: recoveredAnnex.length === options.unsignedEnvelope.annexBytesLength,
      witnessAnnexMatchesUnsignedEnvelope:
        bytesToHex(recoveredAnnex) === options.unsignedEnvelope.annexHex,
      witnessAnnexHashMatchesHeader: annexHash === parsedHeader.annexSha256,
      witnessAnnexHashMatchesSignedEnvelope: annexHash === options.signedEnvelope.annexSha256,
      headerShaMatchesUnsignedEnvelope: headerHash === options.unsignedEnvelope.explicitHeaderSha256,
      headerShaMatchesSignedEnvelope: headerHash === options.signedEnvelope.explicitHeaderSha256,
      headerCarrierInputMatchesSignedEnvelope:
        parsedHeader.carrierInputIndex === options.signedEnvelope.carrierInputIndex,
      signedTxidMatchesEnvelope: tx.getId() === options.signedEnvelope.signedTransactionId,
      signedWtxidMatchesEnvelope:
        displayHash(tx.getHash(true)) === options.signedEnvelope.signedTransactionWitnessId,
      signatureVerifiesAgainstRecoveredAnnex:
        recoveredSignature.length === 64 &&
        tinysecp.verifySchnorr(sighash, tweakedPublicKey, recoveredSignature)
    }
  };
}

export function parseExperimentalAnnexRevealEnvelope(
  input: unknown
): ExperimentalAnnexUnsignedEnvelope {
  const record = assertRecord(input, "experimental annex envelope");
  const kind = assertString(record.kind, "kind");

  if (kind !== "gns-batch-reveal-annex-artifacts") {
    throw new Error("experimental annex envelope kind must be gns-batch-reveal-annex-artifacts");
  }

  const carrierPrevout = assertRecord(record.carrierPrevout, "carrierPrevout");

  return {
    kind,
    network: parseNetwork(assertString(record.network, "network")),
    psbtBase64: assertString(record.psbtBase64, "psbtBase64"),
    unsignedBaseTransactionHex: assertString(
      record.unsignedBaseTransactionHex,
      "unsignedBaseTransactionHex"
    ),
    unsignedBaseTransactionId: assertString(
      record.unsignedBaseTransactionId,
      "unsignedBaseTransactionId"
    ),
    carrierInputIndex: assertInteger(record.carrierInputIndex, "carrierInputIndex"),
    carrierPrevout: {
      txid: assertString(carrierPrevout.txid, "carrierPrevout.txid"),
      vout: assertInteger(carrierPrevout.vout, "carrierPrevout.vout"),
      valueSats: assertString(carrierPrevout.valueSats, "carrierPrevout.valueSats")
    },
    carrierAddress: assertString(record.carrierAddress, "carrierAddress"),
    taprootInternalPubkey: assertString(record.taprootInternalPubkey, "taprootInternalPubkey"),
    explicitHeaderHex: assertString(record.explicitHeaderHex, "explicitHeaderHex"),
    explicitHeaderSha256: assertString(record.explicitHeaderSha256, "explicitHeaderSha256"),
    annexHex: assertString(record.annexHex, "annexHex"),
    annexSha256: assertString(record.annexSha256, "annexSha256"),
    annexBytesLength: assertInteger(record.annexBytesLength, "annexBytesLength"),
    annexFormat: assertString(record.annexFormat, "annexFormat"),
    anchorTxid: assertString(record.anchorTxid, "anchorTxid"),
    name: assertString(record.name, "name"),
    bondVout: assertInteger(record.bondVout, "bondVout"),
    feeSats: assertString(record.feeSats, "feeSats")
  };
}

export function parseSignedExperimentalAnnexRevealEnvelope(
  input: unknown
): ExperimentalAnnexSignedEnvelope {
  const record = assertRecord(input, "signed experimental annex envelope");
  const kind = assertString(record.kind, "kind");

  if (kind !== "gns-signed-batch-reveal-annex-artifacts") {
    throw new Error(
      "signed experimental annex envelope kind must be gns-signed-batch-reveal-annex-artifacts"
    );
  }

  return {
    kind,
    network: parseNetwork(assertString(record.network, "network")),
    signedTransactionHex: assertString(record.signedTransactionHex, "signedTransactionHex"),
    signedTransactionId: assertString(record.signedTransactionId, "signedTransactionId"),
    signedTransactionWitnessId: assertString(
      record.signedTransactionWitnessId,
      "signedTransactionWitnessId"
    ),
    signedInputCount: assertInteger(record.signedInputCount, "signedInputCount"),
    signedPsbtBase64: assertNullableString(record.signedPsbtBase64, "signedPsbtBase64"),
    signedPsbtReason: assertString(record.signedPsbtReason, "signedPsbtReason"),
    carrierInputIndex: assertInteger(record.carrierInputIndex, "carrierInputIndex"),
    annexSha256: assertString(record.annexSha256, "annexSha256"),
    annexBytesLength: assertInteger(record.annexBytesLength, "annexBytesLength"),
    explicitHeaderSha256: assertString(record.explicitHeaderSha256, "explicitHeaderSha256"),
    anchorTxid: assertString(record.anchorTxid, "anchorTxid"),
    name: assertString(record.name, "name"),
    bondVout: assertInteger(record.bondVout, "bondVout")
  };
}

export function parseExperimentalCarrierPrevoutDescriptor(spec: string): {
  readonly txid: string;
  readonly vout: number;
  readonly valueSats: bigint;
} {
  const [txid, voutRaw, valueRaw] = spec.split(":");

  if (!txid || voutRaw === undefined || valueRaw === undefined) {
    throw new Error("carrier prevout must use txid:vout:valueSats");
  }

  assertTxidHex(txid, "carrier prevout txid");

  const vout = Number.parseInt(voutRaw, 10);
  if (!Number.isSafeInteger(vout) || vout < 0) {
    throw new Error("carrier prevout vout must be a non-negative safe integer");
  }

  const valueSats = BigInt(valueRaw);
  if (valueSats < 0n) {
    throw new Error("carrier prevout valueSats must be non-negative");
  }

  return { txid, vout, valueSats };
}

function buildIllustrativeHybridHeader(options: {
  readonly anchorTxid: string;
  readonly bondVout: number;
  readonly carrierInputIndex: number;
  readonly annex: Uint8Array;
  readonly name: string;
}): Buffer {
  const nameBytes = Buffer.from(options.name, "utf8");
  if (nameBytes.length > 0xff) {
    throw new Error("experimental annex name bytes must fit in one byte");
  }

  const annexHash = btcCrypto.sha256(options.annex);
  const annexLength = Buffer.alloc(2);
  annexLength.writeUInt16BE(options.annex.length, 0);

  return Buffer.concat([
    PROTOCOL_MAGIC,
    Buffer.from([1, EXPERIMENTAL_ANNEX_TYPE]),
    Buffer.from(options.anchorTxid, "hex"),
    Buffer.from([options.bondVout, options.carrierInputIndex]),
    annexHash,
    annexLength,
    Buffer.from([nameBytes.length]),
    nameBytes
  ]);
}

function parseIllustrativeHybridHeader(headerBytes: Uint8Array): {
  readonly anchorTxid: string;
  readonly bondVout: number;
  readonly carrierInputIndex: number;
  readonly annexSha256: string;
  readonly annexBytesLength: number;
  readonly name: string;
} {
  const header = Buffer.from(headerBytes);
  const minimumBytes = 3 + 1 + 1 + 32 + 1 + 1 + 32 + 2 + 1;

  if (header.length < minimumBytes) {
    throw new Error("experimental annex explicit header is too short");
  }

  if (!header.subarray(0, 3).equals(PROTOCOL_MAGIC)) {
    throw new Error("experimental annex explicit header magic mismatch");
  }

  if (header[3] !== 1 || header[4] !== EXPERIMENTAL_ANNEX_TYPE) {
    throw new Error("experimental annex explicit header version/type mismatch");
  }

  const nameLength = header[73];
  if (nameLength === undefined) {
    throw new Error("experimental annex explicit header missing name length");
  }
  const expectedLength = 74 + nameLength;

  if (header.length !== expectedLength) {
    throw new Error("experimental annex explicit header length mismatch");
  }

  return {
    anchorTxid: header.subarray(5, 37).toString("hex"),
    bondVout: header[37] ?? 0,
    carrierInputIndex: header[38] ?? 0,
    annexSha256: header.subarray(39, 71).toString("hex"),
    annexBytesLength: header.readUInt16BE(71),
    name: header.subarray(74).toString("utf8")
  };
}

function validateName(name: string): void {
  if (!/^[a-z0-9]{1,32}$/.test(name)) {
    throw new Error("experimental annex name must match the ordinary v1 namespace");
  }
}

function parseHex(value: string, label: string): Buffer {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) {
    throw new Error(`${label} must be an even-length hex string`);
  }

  return Buffer.from(value, "hex");
}

function assertTxidHex(value: string, label: string): void {
  if (!/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error(`${label} must be a 32-byte hex string`);
  }
}

function createDeterministicProofBytes(length: number, fillByte: number): Buffer {
  if (!Number.isSafeInteger(length) || length < 1) {
    throw new Error("experimental annex proof length must be a positive safe integer");
  }

  if (!Number.isInteger(fillByte) || fillByte < 0 || fillByte > 0xff) {
    throw new Error("experimental annex proof fill byte must be between 0 and 255");
  }

  const proofBytes = Buffer.alloc(length);
  for (let index = 0; index < proofBytes.length; index += 1) {
    proofBytes[index] = (fillByte + index) & 0xff;
  }

  return proofBytes;
}

function tweakPrivateKey(options: {
  readonly privateKey: Uint8Array;
  readonly publicKey: Uint8Array;
}): Buffer {
  if (options.privateKey.length !== 32) {
    throw new Error("experimental annex signer requires a 32-byte private key");
  }

  const adjustedPrivateKey =
    options.publicKey[0] === 3
      ? Buffer.from(tinysecp.privateNegate(options.privateKey))
      : Buffer.from(options.privateKey);
  const tweak = Buffer.from(btcCrypto.taggedHash("TapTweak", toXOnly(options.publicKey)));
  const tweaked = tinysecp.privateAdd(adjustedPrivateKey, tweak);

  if (!tweaked) {
    throw new Error("failed to tweak taproot private key");
  }

  return Buffer.from(tweaked);
}

function deriveTweakedOutputKey(options: {
  readonly internalPubkey: Uint8Array;
  readonly tapMerkleRoot?: Uint8Array;
}): Buffer {
  if (options.internalPubkey.length !== 32) {
    throw new Error("experimental annex verifier requires a 32-byte internal pubkey");
  }

  const tweak = Buffer.from(
    btcCrypto.taggedHash(
      "TapTweak",
      options.tapMerkleRoot
        ? Buffer.concat([options.internalPubkey, Buffer.from(options.tapMerkleRoot)])
        : Buffer.from(options.internalPubkey)
    )
  );
  const tweaked = tinysecp.xOnlyPointAddTweak(options.internalPubkey, tweak);

  if (!tweaked) {
    throw new Error("failed to derive tweaked taproot output key");
  }

  return Buffer.from(tweaked.xOnlyPubkey);
}

function extractOpReturnPayload(script: Uint8Array): Buffer {
  const decompiled = btcScript.decompile(script);

  if (!decompiled || decompiled[0] !== btcScript.OPS.OP_RETURN) {
    throw new Error("expected an OP_RETURN explicit header output");
  }

  const payload = decompiled[1];

  if (!payload || typeof payload === "number") {
    throw new Error("expected an OP_RETURN payload push");
  }

  return Buffer.from(payload);
}

function reverseHex(hex: string): Buffer {
  return Buffer.from(hex, "hex").reverse();
}

function bytesToHex(value: Uint8Array): string {
  return Buffer.from(value).toString("hex");
}

function displayHash(hash: Uint8Array): string {
  return Buffer.from(hash).reverse().toString("hex");
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value as Record<string, unknown>;
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }

  return value;
}

function assertNullableString(value: unknown, label: string): null {
  if (value !== null) {
    throw new Error(`${label} must be null in the experimental annex flow`);
  }

  return null;
}

function assertInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }

  return value as number;
}

function parseNetwork(value: string): GnsCliNetwork {
  if (value === "main" || value === "signet" || value === "testnet" || value === "regtest") {
    return value;
  }

  throw new Error("experimental annex network must be one of main, signet, testnet, regtest");
}

function resolveNetwork(name: GnsCliNetwork) {
  switch (name) {
    case "main":
      return networks.bitcoin;
    case "testnet":
    case "signet":
      return networks.testnet;
    case "regtest":
      return networks.regtest;
  }
}
