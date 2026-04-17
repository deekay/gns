import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { ClaimPackage } from "@ont/protocol";
import type { BitcoinEsploraConfig, BitcoinRpcConfig } from "@ont/bitcoin";

import {
  buildCommitArtifacts,
  buildRevealArtifacts,
  maybeWriteJsonFile,
  type FundingInputDescriptor,
  type OntCliNetwork
} from "./builder.js";
import { broadcastSignedArtifacts, type RpcConnectionOptions } from "./rpc-actions.js";
import {
  createRevealQueueItem,
  DEFAULT_REVEAL_QUEUE_PATH,
  enqueueRevealQueueItem
} from "./reveal-queue.js";
import { signArtifacts } from "./signer.js";

export interface SubmitClaimResult {
  readonly kind: "ont-submit-claim-result";
  readonly expectedChain: RpcConnectionOptions["expectedChain"];
  readonly commitTxid: string;
  readonly revealTxid: string;
  readonly queueId: string;
  readonly queuePath: string;
  readonly outDir: string | null;
  readonly files: {
    readonly commitArtifacts: string | null;
    readonly signedCommitArtifacts: string | null;
    readonly revealReadyClaimPackage: string | null;
    readonly revealArtifacts: string | null;
    readonly signedRevealArtifacts: string | null;
  };
}

export async function submitClaim(options: {
  readonly claimPackage: ClaimPackage;
  readonly network: OntCliNetwork;
  readonly expectedChain: RpcConnectionOptions["expectedChain"];
  readonly rpc: BitcoinRpcConfig | undefined;
  readonly esplora: BitcoinEsploraConfig | undefined;
  readonly commitInputs: ReadonlyArray<FundingInputDescriptor>;
  readonly commitFeeSats: bigint;
  readonly revealInputs: ReadonlyArray<FundingInputDescriptor>;
  readonly revealFeeSats: bigint;
  readonly wifs: ReadonlyArray<string>;
  readonly bondAddress?: string;
  readonly commitChangeAddress?: string;
  readonly revealChangeAddress?: string;
  readonly queuePath?: string;
  readonly outDir?: string;
}): Promise<SubmitClaimResult> {
  const commitArtifacts = buildCommitArtifacts({
    claimPackage: options.claimPackage,
    fundingInputs: options.commitInputs,
    feeSats: options.commitFeeSats,
    network: options.network,
    ...(options.bondAddress === undefined ? {} : { bondAddress: options.bondAddress }),
    ...(options.commitChangeAddress === undefined
      ? {}
      : { changeAddress: options.commitChangeAddress })
  });

  const signedCommitArtifacts = signArtifacts({
    artifacts: commitArtifacts,
    wifs: options.wifs
  });

  const { broadcastedTxid } = await broadcastSignedArtifacts({
    rpc: options.rpc,
    esplora: options.esplora,
    expectedChain: options.expectedChain,
    signedArtifacts: signedCommitArtifacts
  });

  if (broadcastedTxid !== signedCommitArtifacts.signedTransactionId) {
    throw new Error("broadcasted commit txid does not match the locally signed commit txid");
  }

  const revealInputs = options.revealInputs.length > 0
    ? options.revealInputs
    : deriveRevealInputsFromCommit({
        commitTxid: signedCommitArtifacts.signedTransactionId,
        commitArtifacts
      });

  const revealArtifacts = buildRevealArtifacts({
    claimPackage: commitArtifacts.updatedClaimPackage,
    fundingInputs: revealInputs,
    feeSats: options.revealFeeSats,
    network: options.network,
    ...(options.revealChangeAddress === undefined
      ? {}
      : { changeAddress: options.revealChangeAddress })
  });

  const signedRevealArtifacts = signArtifacts({
    artifacts: revealArtifacts,
    wifs: options.wifs
  });

  const queuePath = options.queuePath ?? DEFAULT_REVEAL_QUEUE_PATH;
  const queueItem = createRevealQueueItem({
    expectedChain: options.expectedChain,
    commitTxid: signedCommitArtifacts.signedTransactionId,
    signedRevealArtifacts
  });
  await enqueueRevealQueueItem({
    queuePath,
    item: queueItem
  });

  const outDir = options.outDir === undefined ? null : resolve(process.cwd(), options.outDir);

  if (outDir !== null) {
    await mkdir(outDir, { recursive: true });
    await maybeWriteJsonFile(join(outDir, "commit-artifacts.json"), commitArtifacts);
    await maybeWriteJsonFile(join(outDir, "signed-commit-artifacts.json"), signedCommitArtifacts);
    await maybeWriteJsonFile(
      join(outDir, "reveal-ready-claim-package.json"),
      commitArtifacts.updatedClaimPackage
    );
    await maybeWriteJsonFile(join(outDir, "reveal-artifacts.json"), revealArtifacts);
    await maybeWriteJsonFile(join(outDir, "signed-reveal-artifacts.json"), signedRevealArtifacts);
  }

  return {
    kind: "ont-submit-claim-result",
    expectedChain: options.expectedChain,
    commitTxid: signedCommitArtifacts.signedTransactionId,
    revealTxid: signedRevealArtifacts.signedTransactionId,
    queueId: queueItem.id,
    queuePath: resolve(process.cwd(), queuePath),
    outDir,
    files: {
      commitArtifacts: outDir === null ? null : join(outDir, "commit-artifacts.json"),
      signedCommitArtifacts: outDir === null ? null : join(outDir, "signed-commit-artifacts.json"),
      revealReadyClaimPackage:
        outDir === null ? null : join(outDir, "reveal-ready-claim-package.json"),
      revealArtifacts: outDir === null ? null : join(outDir, "reveal-artifacts.json"),
      signedRevealArtifacts: outDir === null ? null : join(outDir, "signed-reveal-artifacts.json")
    }
  };
}

function deriveRevealInputsFromCommit(input: {
  readonly commitTxid: string;
  readonly commitArtifacts: {
    readonly outputs: ReadonlyArray<{
      readonly vout: number;
      readonly role: "bond" | "ont_commit" | "change";
      readonly valueSats: string;
      readonly address: string | null;
    }>;
  };
}): ReadonlyArray<FundingInputDescriptor> {
  const changeOutput = input.commitArtifacts.outputs.find(
    (output) => output.role === "change" && output.address !== null && BigInt(output.valueSats) > 0n
  );

  if (!changeOutput || changeOutput.address === null) {
    throw new Error(
      "submit-claim requires at least one --reveal-input or a commit change output that can fund the reveal"
    );
  }

  return [
    {
      txid: input.commitTxid,
      vout: changeOutput.vout,
      valueSats: BigInt(changeOutput.valueSats),
      address: changeOutput.address
    }
  ];
}
