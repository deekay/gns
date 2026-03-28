import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";

import {
  buildClaimPsbtBundle,
  type ClaimPsbtBundle,
  type ClaimPsbtWalletUtxo,
  deriveWalletAccountAddress,
  type GnsCliNetwork,
  type WalletAccountAddress,
  type WalletDerivationDescriptor
} from "@gns/architect";

const execFile = promisify(execFileCallback);
const PRIVATE_SIGNET_NETWORK: GnsCliNetwork = "signet";
const DEFAULT_SCAN_LIMIT = 50;

export interface BuildPrivateSignetClaimPsbtBundleInput {
  readonly name: string;
  readonly ownerPubkey: string;
  readonly nonceHex: string;
  readonly bondVout: number;
  readonly bondDestination: string;
  readonly changeDestination?: string;
  readonly walletMasterFingerprint: string;
  readonly walletAccountXpub: string;
  readonly walletAccountPath: string;
  readonly walletScanLimit?: number;
  readonly commitFeeSats?: bigint;
  readonly revealFeeSats?: bigint;
}

export interface BuildPrivateSignetClaimPsbtBundleOptions {
  readonly bitcoinCliPath: string;
  readonly bitcoinConfPath: string;
  readonly bitcoinDataDir: string;
}

export type PrivateSignetWalletUtxo = ClaimPsbtWalletUtxo;
export type PrivateSignetClaimPsbtBundle = ClaimPsbtBundle;

export async function buildPrivateSignetClaimPsbtBundle(
  input: BuildPrivateSignetClaimPsbtBundleInput,
  options: BuildPrivateSignetClaimPsbtBundleOptions
): Promise<PrivateSignetClaimPsbtBundle> {
  const walletDerivation: WalletDerivationDescriptor = {
    masterFingerprint: input.walletMasterFingerprint.toLowerCase(),
    accountXpub: input.walletAccountXpub.trim(),
    accountDerivationPath: input.walletAccountPath.trim(),
    scanLimit: input.walletScanLimit ?? DEFAULT_SCAN_LIMIT
  };
  const discoveredUtxos = await scanWalletUtxos(walletDerivation, options);
  if (discoveredUtxos.length === 0) {
    throw new Error("No confirmed wallet UTXOs were found for the supplied Sparrow account metadata.");
  }

  return buildClaimPsbtBundle({
    name: input.name,
    ownerPubkey: input.ownerPubkey,
    nonceHex: input.nonceHex,
    bondVout: input.bondVout,
    bondDestination: input.bondDestination,
    ...(input.changeDestination === undefined ? {} : { changeDestination: input.changeDestination }),
    walletDerivation,
    availableUtxos: discoveredUtxos,
    ...(input.commitFeeSats === undefined ? {} : { commitFeeSats: input.commitFeeSats }),
    ...(input.revealFeeSats === undefined ? {} : { revealFeeSats: input.revealFeeSats }),
    network: PRIVATE_SIGNET_NETWORK
  });
}

async function scanWalletUtxos(
  walletDerivation: WalletDerivationDescriptor,
  options: BuildPrivateSignetClaimPsbtBundleOptions
): Promise<PrivateSignetWalletUtxo[]> {
  const scanLimit = Math.max(walletDerivation.scanLimit ?? DEFAULT_SCAN_LIMIT, 1);
  const derivedAddresses: WalletAccountAddress[] = [];

  for (const branch of [0, 1]) {
    for (let index = 0; index < scanLimit; index += 1) {
      derivedAddresses.push(
        deriveWalletAccountAddress(walletDerivation, PRIVATE_SIGNET_NETWORK, branch, index)
      );
    }
  }

  const descriptors = JSON.stringify(
    derivedAddresses.map((entry) => `addr(${entry.address})`)
  );
  const raw = await execBitcoinCli(options, ["scantxoutset", "start", descriptors]);
  const result = parseScantxoutsetResult(raw);
  const byAddress = new Map<string, WalletAccountAddress>(
    derivedAddresses.map((entry) => [entry.address, entry])
  );

  return result.unspents
    .flatMap((entry) => {
      const address = parseAddressFromDescriptor(entry.desc);
      const derived = address ? byAddress.get(address) ?? null : null;
      if (!derived) {
        return [];
      }

      return [
        {
          txid: entry.txid,
          vout: entry.vout,
          valueSats: bitcoinDecimalToSats(entry.amount),
          address: derived.address,
          derivationPath: derived.derivationPath,
          branch: derived.branch,
          index: derived.index
        }
      ];
    })
    .sort((left, right) => {
      if (left.valueSats === right.valueSats) {
        return left.derivationPath.localeCompare(right.derivationPath);
      }

      return left.valueSats > right.valueSats ? -1 : 1;
    });
}

async function execBitcoinCli(
  options: BuildPrivateSignetClaimPsbtBundleOptions,
  args: string[]
): Promise<string> {
  const cliArgs = [
    `-conf=${options.bitcoinConfPath}`,
    `-datadir=${options.bitcoinDataDir}`,
    "-signet",
    ...args
  ];
  const { stdout } = await execFile(options.bitcoinCliPath, cliArgs, {
    maxBuffer: 1024 * 1024 * 8
  });
  return stdout;
}

function parseScantxoutsetResult(input: string): {
  readonly success: boolean;
  readonly unspents: ReadonlyArray<{
    readonly txid: string;
    readonly vout: number;
    readonly amount: string | number;
    readonly desc: string;
  }>;
} {
  const parsed = JSON.parse(input) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("bitcoin-cli scantxoutset returned a non-object response");
  }

  const record = parsed as Record<string, unknown>;
  if (record.success !== true) {
    throw new Error("bitcoin-cli scantxoutset did not report success");
  }

  if (!Array.isArray(record.unspents)) {
    throw new Error("bitcoin-cli scantxoutset response is missing unspents");
  }

  return {
    success: true,
    unspents: record.unspents.map((entry) => {
      if (!entry || typeof entry !== "object") {
        throw new Error("bitcoin-cli scantxoutset unspent entry must be an object");
      }

      const item = entry as Record<string, unknown>;
      if (typeof item.txid !== "string" || typeof item.desc !== "string") {
        throw new Error("bitcoin-cli scantxoutset unspent entry is missing txid or desc");
      }

      if (typeof item.vout !== "number" || !Number.isInteger(item.vout) || item.vout < 0) {
        throw new Error("bitcoin-cli scantxoutset unspent entry has an invalid vout");
      }

      if (typeof item.amount !== "number" && typeof item.amount !== "string") {
        throw new Error("bitcoin-cli scantxoutset unspent entry has an invalid amount");
      }

      return {
        txid: item.txid,
        vout: item.vout,
        amount: item.amount,
        desc: item.desc
      };
    })
  };
}

function parseAddressFromDescriptor(descriptor: string): string | null {
  const match = descriptor.match(/addr\(([^)]+)\)/);
  return match?.[1] ?? null;
}

function bitcoinDecimalToSats(value: string | number): bigint {
  const normalized = typeof value === "number" ? value.toFixed(8) : value;
  const match = normalized.match(/^(-?)(\d+)(?:\.(\d{1,8}))?$/);
  if (!match) {
    throw new Error(`invalid bitcoin amount: ${normalized}`);
  }

  const sign = match[1] === "-" ? -1n : 1n;
  const whole = BigInt(match[2] ?? "0");
  const fraction = (match[3] ?? "").padEnd(8, "0");
  return sign * (whole * 100_000_000n + BigInt(fraction));
}
