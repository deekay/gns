import {
  address as btcAddress,
  crypto as btcCrypto,
  networks,
  opcodes,
  Psbt,
  script as btcScript,
  Transaction
} from "bitcoinjs-lib";
import { BIP32Factory } from "bip32";
import * as tinysecp from "tiny-secp256k1";

import {
  bytesToHex,
  createClaimPackage,
  encodeRevealPayload,
  encodeTransferPayload,
  parseClaimPackage,
  signTransferAuthorization,
  type ClaimPackage
} from "@gns/protocol";

const bip32 = BIP32Factory(tinysecp);

export type GnsCliNetwork = "main" | "signet" | "testnet" | "regtest";

export interface FundingInputDescriptor {
  readonly txid: string;
  readonly vout: number;
  readonly valueSats: bigint;
  readonly address: string;
  readonly derivationPath?: string;
}

export interface WalletDerivationDescriptor {
  readonly masterFingerprint: string;
  readonly accountXpub: string;
  readonly accountDerivationPath: string;
  readonly scanLimit?: number;
}

export interface WalletAccountAddress {
  readonly address: string;
  readonly derivationPath: string;
  readonly branch: number;
  readonly index: number;
}

export interface ClaimPsbtWalletUtxo extends FundingInputDescriptor {
  readonly derivationPath?: string;
  readonly branch?: number;
  readonly index?: number;
}

export interface BuildClaimPsbtBundleInput {
  readonly name: string;
  readonly ownerPubkey: string;
  readonly nonceHex: string;
  readonly bondVout: number;
  readonly bondDestination: string;
  readonly changeDestination?: string;
  readonly walletDerivation: WalletDerivationDescriptor;
  readonly availableUtxos: ReadonlyArray<ClaimPsbtWalletUtxo>;
  readonly commitFeeSats?: bigint;
  readonly revealFeeSats?: bigint;
  readonly network: GnsCliNetwork;
}

export interface ClaimPsbtBundle {
  readonly kind: "gns-claim-psbt-bundle";
  readonly network: GnsCliNetwork;
  readonly wallet: {
    readonly masterFingerprint: string;
    readonly accountXpub: string;
    readonly accountDerivationPath: string;
    readonly scanLimit: number;
  };
  readonly commitFeeSats: string;
  readonly revealFeeSats: string;
  readonly selectedCommitInputs: ReadonlyArray<{
    readonly txid: string;
    readonly vout: number;
    readonly valueSats: string;
    readonly address: string;
    readonly derivationPath: string | null;
  }>;
  readonly selectedRevealInputs: ReadonlyArray<{
    readonly txid: string;
    readonly vout: number;
    readonly valueSats: string;
    readonly address: string;
    readonly derivationPath: string | null;
  }>;
  readonly commitChangeAddress: string;
  readonly revealFundingSource: "commit_change" | "wallet_utxos";
  readonly commitArtifacts: CommitArtifacts;
  readonly revealArtifacts: RevealArtifacts;
  readonly revealReadyClaimPackage: ClaimPackage;
}

export interface BuildCommitArtifactsOptions {
  readonly claimPackage: ClaimPackage;
  readonly fundingInputs: ReadonlyArray<FundingInputDescriptor>;
  readonly feeSats: bigint;
  readonly network: GnsCliNetwork;
  readonly bondAddress?: string;
  readonly changeAddress?: string;
  readonly walletDerivation?: WalletDerivationDescriptor;
}

export interface BuildRevealArtifactsOptions {
  readonly claimPackage: ClaimPackage;
  readonly fundingInputs: ReadonlyArray<FundingInputDescriptor>;
  readonly feeSats: bigint;
  readonly network: GnsCliNetwork;
  readonly changeAddress?: string;
  readonly walletDerivation?: WalletDerivationDescriptor;
}

export interface BuildTransferArtifactsOptions {
  readonly prevStateTxid: string;
  readonly ownerPrivateKeyHex: string;
  readonly newOwnerPubkey: string;
  readonly successorBondVout: number;
  readonly successorBondSats: bigint;
  readonly currentBondInput: FundingInputDescriptor;
  readonly additionalFundingInputs?: ReadonlyArray<FundingInputDescriptor>;
  readonly feeSats: bigint;
  readonly network: GnsCliNetwork;
  readonly bondAddress: string;
  readonly changeAddress?: string;
  readonly flags?: number;
}

export interface BuildSaleTransferArtifactsOptions {
  readonly prevStateTxid: string;
  readonly ownerPrivateKeyHex: string;
  readonly newOwnerPubkey: string;
  readonly sellerInputs: ReadonlyArray<FundingInputDescriptor>;
  readonly buyerInputs: ReadonlyArray<FundingInputDescriptor>;
  readonly sellerPaymentSats: bigint;
  readonly sellerPaymentAddress: string;
  readonly feeSats: bigint;
  readonly network: GnsCliNetwork;
  readonly sellerChangeAddress?: string;
  readonly buyerChangeAddress?: string;
  readonly flags?: number;
}

export interface BuildImmatureSaleTransferArtifactsOptions {
  readonly prevStateTxid: string;
  readonly ownerPrivateKeyHex: string;
  readonly newOwnerPubkey: string;
  readonly successorBondVout: number;
  readonly successorBondSats: bigint;
  readonly currentBondInput: FundingInputDescriptor;
  readonly sellerInputs?: ReadonlyArray<FundingInputDescriptor>;
  readonly buyerInputs: ReadonlyArray<FundingInputDescriptor>;
  readonly salePriceSats: bigint;
  readonly sellerPayoutAddress: string;
  readonly feeSats: bigint;
  readonly network: GnsCliNetwork;
  readonly bondAddress: string;
  readonly buyerChangeAddress?: string;
  readonly flags?: number;
}

export interface CommitArtifacts {
  readonly kind: "gns-commit-artifacts";
  readonly network: GnsCliNetwork;
  readonly feeSats: string;
  readonly totalInputSats: string;
  readonly changeValueSats: string;
  readonly unsignedTransactionHex: string;
  readonly unsignedTransactionVirtualSize: number;
  readonly commitTxid: string;
  readonly psbtBase64: string;
  readonly outputs: ReadonlyArray<{
    readonly vout: number;
    readonly role: "bond" | "gns_commit" | "change";
    readonly valueSats: string;
    readonly address: string | null;
    readonly scriptHex: string;
  }>;
  readonly updatedClaimPackage: ClaimPackage;
}

export interface RevealArtifacts {
  readonly kind: "gns-reveal-artifacts";
  readonly network: GnsCliNetwork;
  readonly feeSats: string;
  readonly totalInputSats: string;
  readonly changeValueSats: string;
  readonly unsignedTransactionHex: string;
  readonly unsignedTransactionVirtualSize: number;
  readonly revealTxid: string;
  readonly psbtBase64: string;
  readonly outputs: ReadonlyArray<{
    readonly vout: number;
    readonly role: "gns_reveal" | "change";
    readonly valueSats: string;
    readonly address: string | null;
    readonly scriptHex: string;
  }>;
}

export interface TransferArtifacts {
  readonly kind: "gns-transfer-artifacts";
  readonly mode?: "gift" | "sale" | "immature-sale";
  readonly network: GnsCliNetwork;
  readonly feeSats: string;
  readonly totalInputSats: string;
  readonly changeValueSats: string;
  readonly unsignedTransactionHex: string;
  readonly unsignedTransactionVirtualSize: number;
  readonly transferTxid: string;
  readonly psbtBase64: string;
  readonly outputs: ReadonlyArray<{
    readonly vout: number;
    readonly role:
      | "successor_bond"
      | "gns_transfer"
      | "change"
      | "seller_payment"
      | "seller_change"
      | "buyer_change";
    readonly valueSats: string;
    readonly address: string | null;
    readonly scriptHex: string;
  }>;
}

interface CommitBuilderOutput {
  readonly role: "bond" | "gns_commit" | "change";
  readonly valueSats: bigint;
  readonly address: string | null;
  readonly script: Uint8Array;
}

interface RevealBuilderOutput {
  readonly role: "gns_reveal" | "change";
  readonly valueSats: bigint;
  readonly address: string | null;
  readonly script: Uint8Array;
}

interface TransferBuilderOutput {
  readonly role:
    | "successor_bond"
    | "gns_transfer"
    | "change"
    | "seller_payment"
    | "seller_change"
    | "buyer_change";
  readonly valueSats: bigint;
  readonly address: string | null;
  readonly script: Uint8Array;
}

const DEFAULT_CLAIM_COMMIT_FEE_SATS = 1_000n;
const DEFAULT_CLAIM_REVEAL_FEE_SATS = 500n;
const DEFAULT_WALLET_SCAN_LIMIT = 50;

export function parseFundingInputDescriptor(spec: string): FundingInputDescriptor {
  const parts = spec.split(":");

  if (parts.length !== 4 && parts.length !== 5) {
    throw new Error(
      "input descriptors must use txid:vout:valueSats:address[:derivationPath]"
    );
  }

  const [txid, voutText, valueText, inputAddress, derivationPath] = parts;

  if (!/^[0-9a-fA-F]{64}$/.test(txid ?? "")) {
    throw new Error("input txid must be 32-byte hex");
  }

  const vout = Number.parseInt(voutText ?? "", 10);
  if (!Number.isInteger(vout) || vout < 0) {
    throw new Error("input vout must be a non-negative integer");
  }

  const valueSats = BigInt(valueText ?? "");
  if (valueSats <= 0n) {
    throw new Error("input valueSats must be positive");
  }

  if (!inputAddress) {
    throw new Error("input address is required");
  }

  return {
    txid: (txid ?? "").toLowerCase(),
    vout,
    valueSats,
    address: inputAddress,
    ...(derivationPath ? { derivationPath } : {})
  };
}

export function buildClaimPsbtBundle(input: BuildClaimPsbtBundleInput): ClaimPsbtBundle {
  const walletDerivation: WalletDerivationDescriptor = {
    masterFingerprint: input.walletDerivation.masterFingerprint.toLowerCase(),
    accountXpub: input.walletDerivation.accountXpub.trim(),
    accountDerivationPath: input.walletDerivation.accountDerivationPath.trim(),
    scanLimit: input.walletDerivation.scanLimit ?? DEFAULT_WALLET_SCAN_LIMIT
  };
  const commitFeeSats = input.commitFeeSats ?? DEFAULT_CLAIM_COMMIT_FEE_SATS;
  const revealFeeSats = input.revealFeeSats ?? DEFAULT_CLAIM_REVEAL_FEE_SATS;
  const claimPackage = createClaimPackage({
    name: input.name,
    ownerPubkey: input.ownerPubkey,
    nonceHex: input.nonceHex,
    bondVout: input.bondVout,
    bondDestination: input.bondDestination,
    ...(input.changeDestination === undefined ? {} : { changeDestination: input.changeDestination })
  });

  if (input.availableUtxos.length === 0) {
    throw new Error("At least one confirmed wallet UTXO is required.");
  }

  const requiredCommitTotal = BigInt(claimPackage.requiredBondSats) + commitFeeSats;
  const selectedCommitInputs = selectFundingInputsGreedy(input.availableUtxos, requiredCommitTotal);
  const derivedChangeAddress = pickFreshAccountAddress(
    walletDerivation,
    input.availableUtxos,
    input.bondDestination,
    input.network,
    1
  );
  const commitChangeAddress = input.changeDestination ?? derivedChangeAddress.address;
  const commitChangeDerivationPath =
    input.changeDestination === undefined
      ? derivedChangeAddress.derivationPath
      : inferWalletAccountDerivationPath(
          input.changeDestination,
          walletDerivation,
          input.network
        );

  if (!commitChangeDerivationPath) {
    throw new Error(
      "The change destination must belong to the supplied wallet account so the reveal PSBT stays signable."
    );
  }

  const commitArtifacts = buildCommitArtifacts({
    claimPackage,
    fundingInputs: selectedCommitInputs,
    feeSats: commitFeeSats,
    network: input.network,
    bondAddress: input.bondDestination,
    changeAddress: commitChangeAddress,
    walletDerivation
  });

  const derivedRevealInput = deriveRevealInputFromCommitChange(
    commitArtifacts,
    revealFeeSats,
    commitChangeDerivationPath
  );
  const selectedRevealInputs =
    derivedRevealInput === null
      ? selectFundingInputsGreedy(
          input.availableUtxos.filter(
            (candidate) =>
              !selectedCommitInputs.some(
                (selected) => selected.txid === candidate.txid && selected.vout === candidate.vout
              )
          ),
          revealFeeSats
        )
      : [derivedRevealInput];

  const revealArtifacts = buildRevealArtifacts({
    claimPackage: commitArtifacts.updatedClaimPackage,
    fundingInputs: selectedRevealInputs,
    feeSats: revealFeeSats,
    network: input.network,
    changeAddress: commitChangeAddress,
    walletDerivation
  });

  return {
    kind: "gns-claim-psbt-bundle",
    network: input.network,
    wallet: {
      masterFingerprint: walletDerivation.masterFingerprint,
      accountXpub: walletDerivation.accountXpub,
      accountDerivationPath: walletDerivation.accountDerivationPath,
      scanLimit: walletDerivation.scanLimit ?? DEFAULT_WALLET_SCAN_LIMIT
    },
    commitFeeSats: commitFeeSats.toString(),
    revealFeeSats: revealFeeSats.toString(),
    selectedCommitInputs: selectedCommitInputs.map((utxo) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      valueSats: utxo.valueSats.toString(),
      address: utxo.address,
      derivationPath: utxo.derivationPath ?? null
    })),
    selectedRevealInputs: selectedRevealInputs.map((utxo) => ({
      txid: utxo.txid,
      vout: utxo.vout,
      valueSats: utxo.valueSats.toString(),
      address: utxo.address,
      derivationPath: utxo.derivationPath ?? null
    })),
    commitChangeAddress,
    revealFundingSource: derivedRevealInput === null ? "wallet_utxos" : "commit_change",
    commitArtifacts,
    revealArtifacts,
    revealReadyClaimPackage: commitArtifacts.updatedClaimPackage
  };
}

export function selectFundingInputsGreedy(
  utxos: ReadonlyArray<ClaimPsbtWalletUtxo>,
  targetSats: bigint
): ClaimPsbtWalletUtxo[] {
  if (targetSats <= 0n) {
    throw new Error("target amount must be positive");
  }

  const ordered = [...utxos].sort((left, right) => {
    if (left.valueSats === right.valueSats) {
      return left.txid.localeCompare(right.txid);
    }

    return left.valueSats > right.valueSats ? -1 : 1;
  });

  const selected: ClaimPsbtWalletUtxo[] = [];
  let total = 0n;

  for (const utxo of ordered) {
    selected.push(utxo);
    total += utxo.valueSats;

    if (total >= targetSats) {
      return selected;
    }
  }

  throw new Error(
    `Wallet UTXOs only cover ${total.toString()} sats, which is below the required ${targetSats.toString()} sats.`
  );
}

export function pickFreshAccountAddress(
  walletDerivation: WalletDerivationDescriptor,
  utxos: ReadonlyArray<ClaimPsbtWalletUtxo>,
  bondDestination: string,
  network: GnsCliNetwork,
  branch: number
): WalletAccountAddress {
  const usedAddresses = new Set<string>([bondDestination, ...utxos.map((utxo) => utxo.address)]);
  const scanLimit = Math.max(
    walletDerivation.scanLimit ?? DEFAULT_WALLET_SCAN_LIMIT,
    DEFAULT_WALLET_SCAN_LIMIT
  );

  for (let index = 0; index < scanLimit + 100; index += 1) {
    const candidate = deriveWalletAccountAddress(walletDerivation, network, branch, index);
    if (!usedAddresses.has(candidate.address)) {
      return candidate;
    }
  }

  throw new Error("Unable to derive a fresh wallet address for change within the configured scan range.");
}

export function buildCommitArtifacts(options: BuildCommitArtifactsOptions): CommitArtifacts {
  const network = resolveNetwork(options.network);
  const claimPackage = options.claimPackage;
  const bondAddress = options.bondAddress ?? claimPackage.bondDestination;

  if (!bondAddress) {
    throw new Error("a bond destination address is required to build commit artifacts");
  }

  const changeAddress = options.changeAddress ?? claimPackage.changeDestination ?? null;
  const requiredBondSats = BigInt(claimPackage.requiredBondSats);
  const totalInputSats = sumInputValues(options.fundingInputs);
  const changeValueSats = totalInputSats - requiredBondSats - options.feeSats;

  if (changeValueSats < 0n) {
    throw new Error("funding inputs do not cover the required bond and fee");
  }

  if (changeValueSats > 0n && changeAddress === null) {
    throw new Error("a change address is required when the commit transaction produces change");
  }

  const bondScript = toSupportedOutputScript(bondAddress, network, "bond address");
  const commitOpReturnScript = compileOpReturn(claimPackage.commitPayloadHex);
  const changeScript = changeAddress === null ? null : toSupportedOutputScript(changeAddress, network, "change address");

  if (claimPackage.bondVout > 1) {
    throw new Error("prototype commit builder currently supports bondVout 0 or 1 only");
  }

  const outputs: CommitBuilderOutput[] = claimPackage.bondVout === 0
    ? [
        {
          role: "bond" as const,
          valueSats: requiredBondSats,
          address: bondAddress,
          script: bondScript
        },
        {
          role: "gns_commit" as const,
          valueSats: 0n,
          address: null,
          script: commitOpReturnScript
        }
      ]
    : [
        {
          role: "gns_commit" as const,
          valueSats: 0n,
          address: null,
          script: commitOpReturnScript
        },
        {
          role: "bond" as const,
          valueSats: requiredBondSats,
          address: bondAddress,
          script: bondScript
        }
      ];

  if (changeValueSats > 0n && changeScript !== null) {
    outputs.push({
      role: "change" as const,
      valueSats: changeValueSats,
      address: changeAddress,
      script: changeScript
    });
  }

  const transaction = new Transaction();
  const psbt = new Psbt({ network });
  transaction.version = 2;
  psbt.setVersion(2);

  for (const input of options.fundingInputs) {
    const inputScript = toSupportedOutputScript(input.address, network, "input address");

    transaction.addInput(reverseTxid(input.txid), input.vout);
    psbt.addInput({
      hash: input.txid,
      index: input.vout,
      witnessUtxo: {
        script: inputScript,
        value: input.valueSats
      },
      ...(buildInputBip32Derivation(input, options.walletDerivation, network) ?? {})
    });
  }

  for (const output of outputs) {
    transaction.addOutput(output.script, output.valueSats);

    if (output.address !== null) {
      psbt.addOutput({
        address: output.address,
        value: output.valueSats
      });
    } else {
      psbt.addOutput({
        script: output.script,
        value: output.valueSats
      });
    }
  }

  const commitTxid = transaction.getId();
  const updatedClaimPackage = withCommitTxid(claimPackage, commitTxid);

  return {
    kind: "gns-commit-artifacts",
    network: options.network,
    feeSats: options.feeSats.toString(),
    totalInputSats: totalInputSats.toString(),
    changeValueSats: changeValueSats.toString(),
    unsignedTransactionHex: transaction.toHex(),
    unsignedTransactionVirtualSize: transaction.virtualSize(),
    commitTxid,
    psbtBase64: psbt.toBase64(),
    outputs: outputs.map((output, index) => ({
      vout: index,
      role: output.role,
      valueSats: output.valueSats.toString(),
      address: output.address,
      scriptHex: bytesToHex(output.script)
    })),
    updatedClaimPackage
  };
}

export function buildRevealArtifacts(options: BuildRevealArtifactsOptions): RevealArtifacts {
  const network = resolveNetwork(options.network);
  const claimPackage = options.claimPackage;

  if (!claimPackage.revealReady || !claimPackage.revealPayloadHex) {
    throw new Error("claim package must be reveal-ready before building reveal artifacts");
  }

  const changeAddress = options.changeAddress ?? claimPackage.changeDestination ?? null;
  const totalInputSats = sumInputValues(options.fundingInputs);
  const changeValueSats = totalInputSats - options.feeSats;

  if (changeValueSats < 0n) {
    throw new Error("funding inputs do not cover the reveal fee");
  }

  if (changeValueSats > 0n && changeAddress === null) {
    throw new Error("a change address is required when the reveal transaction produces change");
  }

  const revealScript = compileOpReturn(claimPackage.revealPayloadHex);
  const changeScript = changeAddress === null ? null : toSupportedOutputScript(changeAddress, network, "change address");

  const outputs: RevealBuilderOutput[] = [
    {
      role: "gns_reveal" as const,
      valueSats: 0n,
      address: null,
      script: revealScript
    }
  ];

  if (changeValueSats > 0n && changeScript !== null) {
    outputs.push({
      role: "change" as const,
      valueSats: changeValueSats,
      address: changeAddress,
      script: changeScript
    });
  }

  const transaction = new Transaction();
  const psbt = new Psbt({ network });
  transaction.version = 2;
  psbt.setVersion(2);

  for (const input of options.fundingInputs) {
    const inputScript = toSupportedOutputScript(input.address, network, "input address");

    transaction.addInput(reverseTxid(input.txid), input.vout);
    psbt.addInput({
      hash: input.txid,
      index: input.vout,
      witnessUtxo: {
        script: inputScript,
        value: input.valueSats
      },
      ...(buildInputBip32Derivation(input, options.walletDerivation, network) ?? {})
    });
  }

  for (const output of outputs) {
    transaction.addOutput(output.script, output.valueSats);

    if (output.address !== null) {
      psbt.addOutput({
        address: output.address,
        value: output.valueSats
      });
    } else {
      psbt.addOutput({
        script: output.script,
        value: output.valueSats
      });
    }
  }

  return {
    kind: "gns-reveal-artifacts",
    network: options.network,
    feeSats: options.feeSats.toString(),
    totalInputSats: totalInputSats.toString(),
    changeValueSats: changeValueSats.toString(),
    unsignedTransactionHex: transaction.toHex(),
    unsignedTransactionVirtualSize: transaction.virtualSize(),
    revealTxid: transaction.getId(),
    psbtBase64: psbt.toBase64(),
    outputs: outputs.map((output, index) => ({
      vout: index,
      role: output.role,
      valueSats: output.valueSats.toString(),
      address: output.address,
      scriptHex: bytesToHex(output.script)
    }))
  };
}

export function buildTransferArtifacts(options: BuildTransferArtifactsOptions): TransferArtifacts {
  const network = resolveNetwork(options.network);
  const flags = options.flags ?? 0;

  if (!Number.isInteger(options.successorBondVout) || options.successorBondVout < 0 || options.successorBondVout > 1) {
    throw new Error("prototype transfer builder currently supports successorBondVout 0 or 1 only");
  }

  if (options.successorBondSats < 0n) {
    throw new Error("successorBondSats must be non-negative");
  }

  const fundingInputs = [options.currentBondInput, ...(options.additionalFundingInputs ?? [])];
  const totalInputSats = sumInputValues(fundingInputs);
  const changeAddress = options.changeAddress ?? null;
  const changeValueSats = totalInputSats - options.successorBondSats - options.feeSats;

  if (changeValueSats < 0n) {
    throw new Error("funding inputs do not cover the successor bond and fee");
  }

  if (changeValueSats > 0n && changeAddress === null) {
    throw new Error("a change address is required when the transfer transaction produces change");
  }

  const signature = signTransferAuthorization({
    prevStateTxid: options.prevStateTxid,
    newOwnerPubkey: options.newOwnerPubkey,
    flags,
    successorBondVout: options.successorBondVout,
    ownerPrivateKeyHex: options.ownerPrivateKeyHex
  });
  const transferPayload = encodeTransferPayload({
    prevStateTxid: options.prevStateTxid,
    newOwnerPubkey: options.newOwnerPubkey,
    flags,
    successorBondVout: options.successorBondVout,
    signature
  });
  const successorBondScript = toSupportedOutputScript(options.bondAddress, network, "bond address");
  const transferOpReturnScript = compileOpReturn(bytesToHex(transferPayload));
  const changeScript =
    changeAddress === null ? null : toSupportedOutputScript(changeAddress, network, "change address");

  const outputs: TransferBuilderOutput[] =
    options.successorBondVout === 0
      ? [
          {
            role: "successor_bond",
            valueSats: options.successorBondSats,
            address: options.bondAddress,
            script: successorBondScript
          },
          {
            role: "gns_transfer",
            valueSats: 0n,
            address: null,
            script: transferOpReturnScript
          }
        ]
      : [
          {
            role: "gns_transfer",
            valueSats: 0n,
            address: null,
            script: transferOpReturnScript
          },
          {
            role: "successor_bond",
            valueSats: options.successorBondSats,
            address: options.bondAddress,
            script: successorBondScript
          }
        ];

  if (changeValueSats > 0n && changeScript !== null) {
    outputs.push({
      role: "change",
      valueSats: changeValueSats,
      address: changeAddress,
      script: changeScript
    });
  }

  const transaction = new Transaction();
  const psbt = new Psbt({ network });
  transaction.version = 2;
  psbt.setVersion(2);

  for (const input of fundingInputs) {
    const inputScript = toSupportedOutputScript(input.address, network, "input address");

    transaction.addInput(reverseTxid(input.txid), input.vout);
    psbt.addInput({
      hash: input.txid,
      index: input.vout,
      witnessUtxo: {
        script: inputScript,
        value: input.valueSats
      }
    });
  }

  for (const output of outputs) {
    transaction.addOutput(output.script, output.valueSats);

    if (output.address !== null) {
      psbt.addOutput({
        address: output.address,
        value: output.valueSats
      });
    } else {
      psbt.addOutput({
        script: output.script,
        value: output.valueSats
      });
    }
  }

  return {
    kind: "gns-transfer-artifacts",
    mode: "gift",
    network: options.network,
    feeSats: options.feeSats.toString(),
    totalInputSats: totalInputSats.toString(),
    changeValueSats: changeValueSats.toString(),
    unsignedTransactionHex: transaction.toHex(),
    unsignedTransactionVirtualSize: transaction.virtualSize(),
    transferTxid: transaction.getId(),
    psbtBase64: psbt.toBase64(),
    outputs: outputs.map((output, index) => ({
      vout: index,
      role: output.role,
      valueSats: output.valueSats.toString(),
      address: output.address,
      scriptHex: bytesToHex(output.script)
    }))
  };
}

export function buildSaleTransferArtifacts(
  options: BuildSaleTransferArtifactsOptions
): TransferArtifacts {
  const network = resolveNetwork(options.network);
  const flags = options.flags ?? 0xff;
  const successorBondVout = 0xff;

  if (options.sellerInputs.length === 0) {
    throw new Error("at least one seller input is required for a cooperative sale transfer");
  }

  if (options.buyerInputs.length === 0) {
    throw new Error("at least one buyer input is required for a cooperative sale transfer");
  }

  if (options.sellerPaymentSats < 0n) {
    throw new Error("sellerPaymentSats must be non-negative");
  }

  const totalSellerInputSats = sumInputValues(options.sellerInputs);
  const totalBuyerInputSats = sumInputValues(options.buyerInputs);
  const sellerChangeValueSats = totalSellerInputSats;
  const buyerChangeValueSats = totalBuyerInputSats - options.sellerPaymentSats - options.feeSats;

  if (buyerChangeValueSats < 0n) {
    throw new Error("buyer inputs do not cover the seller payment and fee");
  }

  if (sellerChangeValueSats > 0n && options.sellerChangeAddress === undefined) {
    throw new Error("a seller change address is required when seller inputs are present");
  }

  if (buyerChangeValueSats > 0n && options.buyerChangeAddress === undefined) {
    throw new Error("a buyer change address is required when buyer inputs produce change");
  }

  const signature = signTransferAuthorization({
    prevStateTxid: options.prevStateTxid,
    newOwnerPubkey: options.newOwnerPubkey,
    flags,
    successorBondVout,
    ownerPrivateKeyHex: options.ownerPrivateKeyHex
  });
  const transferPayload = encodeTransferPayload({
    prevStateTxid: options.prevStateTxid,
    newOwnerPubkey: options.newOwnerPubkey,
    flags,
    successorBondVout,
    signature
  });
  const transferOpReturnScript = compileOpReturn(bytesToHex(transferPayload));
  const sellerPaymentScript = toSupportedOutputScript(
    options.sellerPaymentAddress,
    network,
    "seller payment address"
  );
  const sellerChangeScript =
    options.sellerChangeAddress === undefined
      ? null
      : toSupportedOutputScript(options.sellerChangeAddress, network, "seller change address");
  const buyerChangeScript =
    options.buyerChangeAddress === undefined
      ? null
      : toSupportedOutputScript(options.buyerChangeAddress, network, "buyer change address");

  const outputs: TransferBuilderOutput[] = [
    {
      role: "gns_transfer",
      valueSats: 0n,
      address: null,
      script: transferOpReturnScript
    },
    {
      role: "seller_payment",
      valueSats: options.sellerPaymentSats,
      address: options.sellerPaymentAddress,
      script: sellerPaymentScript
    }
  ];

  if (sellerChangeValueSats > 0n && sellerChangeScript !== null && options.sellerChangeAddress !== undefined) {
    outputs.push({
      role: "seller_change",
      valueSats: sellerChangeValueSats,
      address: options.sellerChangeAddress,
      script: sellerChangeScript
    });
  }

  if (buyerChangeValueSats > 0n && buyerChangeScript !== null && options.buyerChangeAddress !== undefined) {
    outputs.push({
      role: "buyer_change",
      valueSats: buyerChangeValueSats,
      address: options.buyerChangeAddress,
      script: buyerChangeScript
    });
  }

  const transaction = new Transaction();
  const psbt = new Psbt({ network });
  transaction.version = 2;
  psbt.setVersion(2);

  for (const input of [...options.sellerInputs, ...options.buyerInputs]) {
    const inputScript = toSupportedOutputScript(input.address, network, "input address");

    transaction.addInput(reverseTxid(input.txid), input.vout);
    psbt.addInput({
      hash: input.txid,
      index: input.vout,
      witnessUtxo: {
        script: inputScript,
        value: input.valueSats
      }
    });
  }

  for (const output of outputs) {
    transaction.addOutput(output.script, output.valueSats);

    if (output.address !== null) {
      psbt.addOutput({
        address: output.address,
        value: output.valueSats
      });
    } else {
      psbt.addOutput({
        script: output.script,
        value: output.valueSats
      });
    }
  }

  return {
    kind: "gns-transfer-artifacts",
    mode: "sale",
    network: options.network,
    feeSats: options.feeSats.toString(),
    totalInputSats: (totalSellerInputSats + totalBuyerInputSats).toString(),
    changeValueSats: (sellerChangeValueSats + buyerChangeValueSats).toString(),
    unsignedTransactionHex: transaction.toHex(),
    unsignedTransactionVirtualSize: transaction.virtualSize(),
    transferTxid: transaction.getId(),
    psbtBase64: psbt.toBase64(),
    outputs: outputs.map((output, index) => ({
      vout: index,
      role: output.role,
      valueSats: output.valueSats.toString(),
      address: output.address,
      scriptHex: bytesToHex(output.script)
    }))
  };
}

export function buildImmatureSaleTransferArtifacts(
  options: BuildImmatureSaleTransferArtifactsOptions
): TransferArtifacts {
  const network = resolveNetwork(options.network);
  const flags = options.flags ?? 0;

  if (!Number.isInteger(options.successorBondVout) || options.successorBondVout < 0 || options.successorBondVout > 1) {
    throw new Error("prototype immature sale builder currently supports successorBondVout 0 or 1 only");
  }

  if (options.buyerInputs.length === 0) {
    throw new Error("at least one buyer input is required for an immature sale transfer");
  }

  if (options.successorBondSats < 0n) {
    throw new Error("successorBondSats must be non-negative");
  }

  if (options.salePriceSats < 0n) {
    throw new Error("salePriceSats must be non-negative");
  }

  const sellerInputs = [options.currentBondInput, ...(options.sellerInputs ?? [])];
  const totalSellerInputSats = sumInputValues(sellerInputs);
  const totalBuyerInputSats = sumInputValues(options.buyerInputs);
  const sellerPayoutSats = totalSellerInputSats + options.salePriceSats;
  const buyerChangeValueSats =
    totalBuyerInputSats - options.successorBondSats - options.salePriceSats - options.feeSats;

  if (buyerChangeValueSats < 0n) {
    throw new Error("buyer inputs do not cover the successor bond, sale price, and fee");
  }

  if (buyerChangeValueSats > 0n && options.buyerChangeAddress === undefined) {
    throw new Error("a buyer change address is required when buyer inputs produce change");
  }

  const signature = signTransferAuthorization({
    prevStateTxid: options.prevStateTxid,
    newOwnerPubkey: options.newOwnerPubkey,
    flags,
    successorBondVout: options.successorBondVout,
    ownerPrivateKeyHex: options.ownerPrivateKeyHex
  });
  const transferPayload = encodeTransferPayload({
    prevStateTxid: options.prevStateTxid,
    newOwnerPubkey: options.newOwnerPubkey,
    flags,
    successorBondVout: options.successorBondVout,
    signature
  });
  const successorBondScript = toSupportedOutputScript(options.bondAddress, network, "bond address");
  const transferOpReturnScript = compileOpReturn(bytesToHex(transferPayload));
  const sellerPayoutScript = toSupportedOutputScript(
    options.sellerPayoutAddress,
    network,
    "seller payout address"
  );
  const buyerChangeScript =
    options.buyerChangeAddress === undefined
      ? null
      : toSupportedOutputScript(options.buyerChangeAddress, network, "buyer change address");

  const outputs: TransferBuilderOutput[] =
    options.successorBondVout === 0
      ? [
          {
            role: "successor_bond",
            valueSats: options.successorBondSats,
            address: options.bondAddress,
            script: successorBondScript
          },
          {
            role: "gns_transfer",
            valueSats: 0n,
            address: null,
            script: transferOpReturnScript
          }
        ]
      : [
          {
            role: "gns_transfer",
            valueSats: 0n,
            address: null,
            script: transferOpReturnScript
          },
          {
            role: "successor_bond",
            valueSats: options.successorBondSats,
            address: options.bondAddress,
            script: successorBondScript
          }
        ];

  outputs.push({
    role: "seller_payment",
    valueSats: sellerPayoutSats,
    address: options.sellerPayoutAddress,
    script: sellerPayoutScript
  });

  if (buyerChangeValueSats > 0n && buyerChangeScript !== null && options.buyerChangeAddress !== undefined) {
    outputs.push({
      role: "buyer_change",
      valueSats: buyerChangeValueSats,
      address: options.buyerChangeAddress,
      script: buyerChangeScript
    });
  }

  const transaction = new Transaction();
  const psbt = new Psbt({ network });
  transaction.version = 2;
  psbt.setVersion(2);

  for (const input of [...sellerInputs, ...options.buyerInputs]) {
    const inputScript = toSupportedOutputScript(input.address, network, "input address");

    transaction.addInput(reverseTxid(input.txid), input.vout);
    psbt.addInput({
      hash: input.txid,
      index: input.vout,
      witnessUtxo: {
        script: inputScript,
        value: input.valueSats
      }
    });
  }

  for (const output of outputs) {
    transaction.addOutput(output.script, output.valueSats);

    if (output.address !== null) {
      psbt.addOutput({
        address: output.address,
        value: output.valueSats
      });
    } else {
      psbt.addOutput({
        script: output.script,
        value: output.valueSats
      });
    }
  }

  return {
    kind: "gns-transfer-artifacts",
    mode: "immature-sale",
    network: options.network,
    feeSats: options.feeSats.toString(),
    totalInputSats: (totalSellerInputSats + totalBuyerInputSats).toString(),
    changeValueSats: buyerChangeValueSats.toString(),
    unsignedTransactionHex: transaction.toHex(),
    unsignedTransactionVirtualSize: transaction.virtualSize(),
    transferTxid: transaction.getId(),
    psbtBase64: psbt.toBase64(),
    outputs: outputs.map((output, index) => ({
      vout: index,
      role: output.role,
      valueSats: output.valueSats.toString(),
      address: output.address,
      scriptHex: bytesToHex(output.script)
    }))
  };
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

function sumInputValues(inputs: ReadonlyArray<FundingInputDescriptor>): bigint {
  if (inputs.length === 0) {
    throw new Error("at least one funding input is required");
  }

  return inputs.reduce((sum, input) => sum + input.valueSats, 0n);
}

function deriveRevealInputFromCommitChange(
  commitArtifacts: CommitArtifacts,
  revealFeeSats: bigint,
  derivationPath: string
): ClaimPsbtWalletUtxo | null {
  const changeOutput = commitArtifacts.outputs.find((output) => output.role === "change");

  if (!changeOutput || changeOutput.address === null) {
    return null;
  }

  const changeValueSats = BigInt(changeOutput.valueSats);
  if (changeValueSats < revealFeeSats) {
    return null;
  }

  return {
    txid: commitArtifacts.commitTxid,
    vout: changeOutput.vout,
    valueSats: changeValueSats,
    address: changeOutput.address,
    derivationPath
  };
}

function toSupportedOutputScript(address: string, network: ReturnType<typeof resolveNetwork>, label: string): Uint8Array {
  assertSupportedSegwitAddress(address, network, label);
  return btcAddress.toOutputScript(address, network);
}

function assertSupportedSegwitAddress(
  candidate: string,
  network: ReturnType<typeof resolveNetwork>,
  label: string
): void {
  const decoded = btcAddress.fromBech32(candidate);

  if (decoded.prefix !== network.bech32) {
    throw new Error(`${label} must use the ${network.bech32} bech32 prefix for the selected network`);
  }

  if (decoded.version !== 0 && decoded.version !== 1) {
    throw new Error(`${label} must be a v0 or v1 segwit address`);
  }
}

function reverseTxid(txid: string): Uint8Array {
  return Uint8Array.from(Buffer.from(txid, "hex").reverse());
}

function buildInputBip32Derivation(
  input: FundingInputDescriptor,
  walletDerivation: WalletDerivationDescriptor | undefined,
  network: networks.Network
): { bip32Derivation: Array<{ masterFingerprint: Buffer; path: string; pubkey: Buffer }> } | null {
  if (!walletDerivation) {
    return null;
  }

  const resolvedPath =
    input.derivationPath ?? inferInputDerivationPath(input.address, walletDerivation, network);

  if (!resolvedPath) {
    return null;
  }

  const accountPathSegments = parseDerivationPath(walletDerivation.accountDerivationPath);
  const fullPathSegments = parseDerivationPath(resolvedPath);

  if (fullPathSegments.length < accountPathSegments.length) {
    throw new Error("input derivation path must extend the account derivation path");
  }

  for (let index = 0; index < accountPathSegments.length; index += 1) {
    if (fullPathSegments[index] !== accountPathSegments[index]) {
      throw new Error("input derivation path must share the configured account derivation prefix");
    }
  }

  const childSegments = fullPathSegments.slice(accountPathSegments.length);
  const accountNode = bip32.fromBase58(walletDerivation.accountXpub, network);
  let childNode = accountNode;
  for (const segment of childSegments) {
    childNode = childNode.derive(segment);
  }

  const derivedAddress = deriveP2wpkhAddress(childNode.publicKey, network);
  if (derivedAddress !== input.address) {
    throw new Error(
      `wallet derivation path ${resolvedPath} does not derive input address ${input.address}`
    );
  }

  return {
    bip32Derivation: [
      {
        masterFingerprint: Buffer.from(walletDerivation.masterFingerprint, "hex"),
        path: resolvedPath,
        pubkey: Buffer.from(childNode.publicKey)
      }
    ]
  };
}

function inferInputDerivationPath(
  address: string,
  walletDerivation: WalletDerivationDescriptor,
  network: networks.Network
): string | null {
  const scanLimit = walletDerivation.scanLimit ?? 500;
  const accountNode = bip32.fromBase58(walletDerivation.accountXpub, network);

  for (const branch of [0, 1]) {
    for (let index = 0; index < scanLimit; index += 1) {
      const childNode = accountNode.derive(branch).derive(index);
      if (deriveP2wpkhAddress(childNode.publicKey, network) === address) {
        return `${walletDerivation.accountDerivationPath}/${branch}/${index}`;
      }
    }
  }

  return null;
}

export function inferWalletAccountDerivationPath(
  address: string,
  walletDerivation: WalletDerivationDescriptor,
  networkName: GnsCliNetwork
): string | null {
  return inferInputDerivationPath(address, walletDerivation, resolveNetwork(networkName));
}

function parseDerivationPath(path: string): number[] {
  const trimmed = path.trim();
  if (!/^m(\/[0-9]+'?)*$/.test(trimmed)) {
    throw new Error(`invalid derivation path: ${path}`);
  }

  if (trimmed === "m") {
    return [];
  }

  return trimmed
    .slice(2)
    .split("/")
    .map((segment) => {
      const hardened = segment.endsWith("'");
      const value = Number.parseInt(hardened ? segment.slice(0, -1) : segment, 10);

      if (!Number.isInteger(value) || value < 0) {
        throw new Error(`invalid derivation path segment: ${segment}`);
      }

      return hardened ? value + 0x80000000 : value;
    });
}

export function deriveWalletAccountAddress(
  walletDerivation: WalletDerivationDescriptor,
  networkName: GnsCliNetwork,
  branch: number,
  index: number
): WalletAccountAddress {
  if (!Number.isInteger(branch) || branch < 0) {
    throw new Error("branch must be a non-negative integer");
  }

  if (!Number.isInteger(index) || index < 0) {
    throw new Error("index must be a non-negative integer");
  }

  const network = resolveNetwork(networkName);
  const accountNode = bip32.fromBase58(walletDerivation.accountXpub, network);
  const childNode = accountNode.derive(branch).derive(index);
  return {
    address: deriveP2wpkhAddress(childNode.publicKey, network),
    derivationPath: `${walletDerivation.accountDerivationPath}/${branch}/${index}`,
    branch,
    index
  };
}

function deriveP2wpkhAddress(pubkey: Uint8Array, network: networks.Network): string {
  const payment = btcAddress.fromOutputScript(
    btcScript.compile([
      opcodes.OP_0,
      btcCrypto.hash160(pubkey)
    ]),
    network
  );

  return payment;
}

function compileOpReturn(dataHex: string): Uint8Array {
  return btcScript.compile([opcodes.OP_RETURN, Buffer.from(dataHex, "hex")]);
}

function withCommitTxid(claimPackage: ClaimPackage, commitTxid: string): ClaimPackage {
  const revealPayload = encodeRevealPayload({
    commitTxid,
    nonce: BigInt(`0x${claimPackage.nonceHex}`),
    name: claimPackage.name
  });

  return parseClaimPackage({
    ...claimPackage,
    exportedAt: new Date().toISOString(),
    commitTxid,
    revealReady: true,
    revealPayloadHex: bytesToHex(revealPayload),
    revealPayloadBytes: revealPayload.length
  });
}
