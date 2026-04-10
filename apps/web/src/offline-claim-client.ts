import {
  buildBatchRevealArtifacts,
  buildBatchCommitArtifacts,
  buildClaimPsbtBundle,
  parseFundingInputDescriptor,
  type BatchCommitArtifacts,
  type BatchRevealArtifacts,
  type ClaimPsbtBundle,
  type ClaimPsbtWalletUtxo,
  type WalletDerivationDescriptor
} from "@gns/architect";
import {
  createClaimPackage,
  parseBatchClaimPackage,
  type BatchClaimPackage,
  type ClaimPackage,
  type CreateClaimPackageInput
} from "@gns/protocol";

const elements = {
  nameInput: requireElement<HTMLInputElement>("offlineNameInput"),
  ownerPubkeyInput: requireElement<HTMLInputElement>("offlineOwnerPubkeyInput"),
  nonceInput: requireElement<HTMLInputElement>("offlineNonceInput"),
  bondDestinationInput: requireElement<HTMLInputElement>("offlineBondDestinationInput"),
  changeDestinationInput: requireElement<HTMLInputElement>("offlineChangeDestinationInput"),
  bondVoutInput: requireElement<HTMLInputElement>("offlineBondVoutInput"),
  fingerprintInput: requireElement<HTMLInputElement>("offlineFingerprintInput"),
  accountXpubInput: requireElement<HTMLInputElement>("offlineAccountXpubInput"),
  accountPathInput: requireElement<HTMLInputElement>("offlineAccountPathInput"),
  walletScanLimitInput: requireElement<HTMLInputElement>("offlineWalletScanLimitInput"),
  commitFeeInput: requireElement<HTMLInputElement>("offlineCommitFeeInput"),
  revealFeeInput: requireElement<HTMLInputElement>("offlineRevealFeeInput"),
  fundingInputsInput: requireElement<HTMLTextAreaElement>("offlineFundingInputsInput"),
  batchClaimsInput: requireElement<HTMLTextAreaElement>("offlineBatchClaimsInput"),
  batchRevealPackageInput: requireElement<HTMLTextAreaElement>("offlineBatchRevealPackageInput"),
  generateNonceButton: requireElement<HTMLButtonElement>("offlineGenerateNonceButton"),
  buildButton: requireElement<HTMLButtonElement>("offlineBuildButton"),
  buildBatchButton: requireElement<HTMLButtonElement>("offlineBuildBatchButton"),
  buildBatchRevealButton: requireElement<HTMLButtonElement>("offlineBuildBatchRevealButton"),
  downloadClaimPackageButton: requireElement<HTMLButtonElement>("offlineDownloadClaimPackageButton"),
  downloadRevealReadyButton: requireElement<HTMLButtonElement>("offlineDownloadRevealReadyButton"),
  downloadCommitPsbtButton: requireElement<HTMLButtonElement>("offlineDownloadCommitPsbtButton"),
  downloadRevealPsbtButton: requireElement<HTMLButtonElement>("offlineDownloadRevealPsbtButton"),
  downloadSignerNotesButton: requireElement<HTMLButtonElement>("offlineDownloadSignerNotesButton"),
  downloadBatchBundleButton: requireElement<HTMLButtonElement>("offlineDownloadBatchBundleButton"),
  downloadBatchCommitPsbtButton: requireElement<HTMLButtonElement>("offlineDownloadBatchCommitPsbtButton"),
  downloadBatchSignerNotesButton: requireElement<HTMLButtonElement>("offlineDownloadBatchSignerNotesButton"),
  downloadBatchRevealPackageButton: requireElement<HTMLButtonElement>("offlineDownloadBatchRevealPackageButton"),
  downloadBatchRevealPsbtButton: requireElement<HTMLButtonElement>("offlineDownloadBatchRevealPsbtButton"),
  downloadBatchRevealSignerNotesButton: requireElement<HTMLButtonElement>("offlineDownloadBatchRevealSignerNotesButton"),
  result: requireElement<HTMLDivElement>("offlineClaimResult"),
  batchResult: requireElement<HTMLDivElement>("offlineBatchResult"),
  batchDownloads: requireElement<HTMLDivElement>("offlineBatchDownloads"),
  batchRevealResult: requireElement<HTMLDivElement>("offlineBatchRevealResult")
};

let currentClaimPackage: ClaimPackage | null = null;
let currentBundle: ClaimPsbtBundle | null = null;
let currentBatchClaimPackages: ClaimPackage[] = [];
let currentBatchArtifacts: BatchCommitArtifacts | null = null;
let currentBatchRevealClaimPackage: BatchClaimPackage | null = null;
let currentBatchRevealArtifacts: BatchRevealArtifacts | null = null;
let currentBatchRevealFundingInputs: ClaimPsbtWalletUtxo[] = [];

elements.nonceInput.value = elements.nonceInput.value.trim() || generateNonceHex();

elements.generateNonceButton.addEventListener("click", () => {
  elements.nonceInput.value = generateNonceHex();
});

elements.buildButton.addEventListener("click", () => {
  try {
    const claimInput = readClaimPackageInput();
    const walletDerivation = readWalletDerivation();
    const availableUtxos = readFundingInputs();

    currentClaimPackage = createClaimPackage(claimInput);
    currentBundle = buildClaimPsbtBundle({
      name: claimInput.name,
      ownerPubkey: claimInput.ownerPubkey,
      nonceHex: claimInput.nonceHex,
      bondVout: claimInput.bondVout ?? 0,
      bondDestination: claimInput.bondDestination ?? "",
      ...(claimInput.changeDestination === null ? {} : { changeDestination: claimInput.changeDestination }),
      walletDerivation,
      availableUtxos,
      commitFeeSats: readSats(elements.commitFeeInput, "Commit fee"),
      revealFeeSats: readSats(elements.revealFeeInput, "Reveal fee"),
      network: "signet"
    });

    setDownloadState(true);
    renderSuccess(currentClaimPackage, currentBundle);
  } catch (error) {
    currentClaimPackage = null;
    currentBundle = null;
    setDownloadState(false);
    renderError(error);
  }
});

elements.buildBatchButton.addEventListener("click", () => {
  try {
    const walletDerivation = readWalletDerivation();
    const availableUtxos = readFundingInputs();
    const batchInputs = readBatchClaimPackageInputs();
    const claimPackages = batchInputs.map((claimInput) => createClaimPackage(claimInput));

    const seenNames = new Set<string>();
    for (const claimPackage of claimPackages) {
      if (seenNames.has(claimPackage.name)) {
        throw new Error(`Duplicate batch claim name: ${claimPackage.name}`);
      }

      seenNames.add(claimPackage.name);
    }

    const changeAddress = normalizeOptionalText(elements.changeDestinationInput.value);
    currentBatchClaimPackages = claimPackages;
    currentBatchArtifacts = buildBatchCommitArtifacts({
      claimPackages,
      fundingInputs: availableUtxos,
      feeSats: readSats(elements.commitFeeInput, "Commit fee"),
      network: "signet",
      ...(changeAddress === null ? {} : { changeAddress }),
      walletDerivation
    });

    setBatchDownloadState(true);
    renderBatchSuccess(currentBatchClaimPackages, currentBatchArtifacts);
    renderBatchDownloadButtons(currentBatchArtifacts.updatedClaimPackages);
  } catch (error) {
    currentBatchClaimPackages = [];
    currentBatchArtifacts = null;
    setBatchDownloadState(false);
    renderBatchError(error);
  }
});

elements.buildBatchRevealButton.addEventListener("click", () => {
  try {
    const walletDerivation = readWalletDerivation();
    const availableUtxos = readFundingInputs();
    const claimPackage = readBatchRevealClaimPackage();
    const changeAddress = normalizeOptionalText(elements.changeDestinationInput.value);

    currentBatchRevealClaimPackage = claimPackage;
    currentBatchRevealFundingInputs = availableUtxos;
    currentBatchRevealArtifacts = buildBatchRevealArtifacts({
      claimPackage,
      fundingInputs: availableUtxos,
      feeSats: readSats(elements.revealFeeInput, "Reveal fee"),
      network: "signet",
      ...(changeAddress === null ? {} : { changeAddress }),
      walletDerivation
    });

    setBatchRevealDownloadState(true);
    renderBatchRevealSuccess(claimPackage, currentBatchRevealArtifacts);
  } catch (error) {
    currentBatchRevealClaimPackage = null;
    currentBatchRevealArtifacts = null;
    currentBatchRevealFundingInputs = [];
    setBatchRevealDownloadState(false);
    renderBatchRevealError(error);
  }
});

elements.downloadClaimPackageButton.addEventListener("click", () => {
  if (!currentClaimPackage) {
    return;
  }

  downloadJsonFile(currentClaimPackage, "gns-claim-" + currentClaimPackage.name + "-offline.json");
});

elements.downloadRevealReadyButton.addEventListener("click", () => {
  if (!currentBundle) {
    return;
  }

  downloadJsonFile(
    currentBundle.revealReadyClaimPackage,
    "gns-claim-" + currentBundle.revealReadyClaimPackage.name + "-reveal-ready.json"
  );
});

elements.downloadCommitPsbtButton.addEventListener("click", () => {
  if (!currentBundle) {
    return;
  }

  downloadBase64BinaryFile(
    currentBundle.commitArtifacts.psbtBase64,
    "gns-commit-" + currentBundle.revealReadyClaimPackage.name + "-offline.psbt"
  );
});

elements.downloadRevealPsbtButton.addEventListener("click", () => {
  if (!currentBundle) {
    return;
  }

  downloadBase64BinaryFile(
    currentBundle.revealArtifacts.psbtBase64,
    "gns-reveal-" + currentBundle.revealReadyClaimPackage.name + "-offline.psbt"
  );
});

elements.downloadSignerNotesButton.addEventListener("click", () => {
  if (!currentClaimPackage || !currentBundle) {
    return;
  }

  downloadTextFile(
    buildSignerNotes(currentClaimPackage, currentBundle),
    "gns-claim-" + currentBundle.revealReadyClaimPackage.name + "-offline-signer-notes.txt"
  );
});

elements.downloadBatchBundleButton.addEventListener("click", () => {
  if (!currentBatchArtifacts) {
    return;
  }

  downloadJsonFile(
    {
      kind: "gns-batch-offline-claim-bundle",
      exportedAt: new Date().toISOString(),
      network: "signet",
      claimPackages: currentBatchClaimPackages,
      commitArtifacts: currentBatchArtifacts,
      revealReadyClaimPackages: currentBatchArtifacts.updatedClaimPackages
    },
    "gns-batch-" + String(currentBatchArtifacts.updatedClaimPackages.length) + "-claims-offline.json"
  );
});

elements.downloadBatchCommitPsbtButton.addEventListener("click", () => {
  if (!currentBatchArtifacts) {
    return;
  }

  downloadBase64BinaryFile(
    currentBatchArtifacts.psbtBase64,
    "gns-batch-commit-" + String(currentBatchArtifacts.updatedClaimPackages.length) + "-claims-offline.psbt"
  );
});

elements.downloadBatchSignerNotesButton.addEventListener("click", () => {
  if (!currentBatchArtifacts) {
    return;
  }

  downloadTextFile(
    buildBatchSignerNotes(currentBatchClaimPackages, currentBatchArtifacts),
    "gns-batch-" + String(currentBatchArtifacts.updatedClaimPackages.length) + "-claims-offline-signer-notes.txt"
  );
});

elements.downloadBatchRevealPackageButton.addEventListener("click", () => {
  if (!currentBatchRevealClaimPackage) {
    return;
  }

  downloadJsonFile(
    currentBatchRevealClaimPackage,
    "gns-claim-" + currentBatchRevealClaimPackage.name + "-batch-reveal-ready.json"
  );
});

elements.downloadBatchRevealPsbtButton.addEventListener("click", () => {
  if (!currentBatchRevealArtifacts || !currentBatchRevealClaimPackage) {
    return;
  }

  downloadBase64BinaryFile(
    currentBatchRevealArtifacts.psbtBase64,
    "gns-reveal-" + currentBatchRevealClaimPackage.name + "-batch-offline.psbt"
  );
});

elements.downloadBatchRevealSignerNotesButton.addEventListener("click", () => {
  if (!currentBatchRevealClaimPackage || !currentBatchRevealArtifacts) {
    return;
  }

  downloadTextFile(
    buildBatchRevealSignerNotes(
      currentBatchRevealClaimPackage,
      currentBatchRevealArtifacts,
      currentBatchRevealFundingInputs
    ),
    "gns-reveal-" + currentBatchRevealClaimPackage.name + "-batch-offline-signer-notes.txt"
  );
});

elements.batchDownloads.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest<HTMLButtonElement>("[data-batch-package-index]");
  if (!button || !currentBatchArtifacts) {
    return;
  }

  const index = Number.parseInt(button.dataset.batchPackageIndex ?? "", 10);
  const claimPackage = currentBatchArtifacts.updatedClaimPackages[index];

  if (!claimPackage) {
    return;
  }

  const action = button.dataset.batchPackageAction ?? "download";
  if (action === "load") {
    elements.batchRevealPackageInput.value = JSON.stringify(claimPackage, null, 2);
    renderBatchRevealLoaded(claimPackage);
    return;
  }

  downloadJsonFile(claimPackage, "gns-claim-" + claimPackage.name + "-batch-reveal-ready.json");
});

function readClaimPackageInput(): CreateClaimPackageInput {
  const name = elements.nameInput.value.trim();
  const ownerPubkey = elements.ownerPubkeyInput.value.trim();
  const nonceHex = elements.nonceInput.value.trim().toLowerCase();
  const bondDestination = elements.bondDestinationInput.value.trim();
  const changeDestination = normalizeOptionalText(elements.changeDestinationInput.value);
  const bondVoutText = elements.bondVoutInput.value.trim();
  const bondVout = Number.parseInt(bondVoutText || "0", 10);

  if (name === "" || ownerPubkey === "" || nonceHex === "" || bondDestination === "") {
    throw new Error("Name, owner pubkey, nonce, and bond destination are all required.");
  }

  if (!Number.isInteger(bondVout) || bondVout < 0 || bondVout > 0xff) {
    throw new Error("Bond output vout must be a byte value between 0 and 255.");
  }

  return {
    name,
    ownerPubkey,
    nonceHex,
    bondVout,
    bondDestination,
    changeDestination
  };
}

function readBatchClaimPackageInputs(): CreateClaimPackageInput[] {
  const lines = elements.batchClaimsInput.value
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line !== "");

  if (lines.length === 0) {
    throw new Error("Paste at least one batch claim line.");
  }

  if (lines.length > 0xff) {
    throw new Error("Batch commit builder currently supports at most 255 claims per batch.");
  }

  const fallbackChangeDestination = normalizeOptionalText(elements.changeDestinationInput.value);

  return lines.map((line, index) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 4 || parts.length > 5) {
      throw new Error(
        "Batch claim line " +
          String(index + 1) +
          " must use name|owner_pubkey|nonce_hex|bond_destination|change_destination(optional)."
      );
    }

    const [name, ownerPubkey, nonceHex, bondDestination, lineChangeDestination] = parts;
    if (!name || !ownerPubkey || !nonceHex || !bondDestination) {
      throw new Error(
        "Batch claim line " +
          String(index + 1) +
          " must include name, owner pubkey, nonce, and bond destination."
      );
    }

    return {
      name,
      ownerPubkey,
      nonceHex: nonceHex.toLowerCase(),
      bondDestination,
      changeDestination: normalizeOptionalText(lineChangeDestination ?? "") ?? fallbackChangeDestination
    };
  });
}

function readWalletDerivation(): WalletDerivationDescriptor {
  const masterFingerprint = elements.fingerprintInput.value.trim();
  const accountXpub = elements.accountXpubInput.value.trim();
  const accountDerivationPath = elements.accountPathInput.value.trim();

  if (masterFingerprint === "" || accountXpub === "" || accountDerivationPath === "") {
    throw new Error("Master fingerprint, account xpub, and account derivation path are required.");
  }

  const scanLimit = Number.parseInt(elements.walletScanLimitInput.value.trim() || "50", 10);
  if (!Number.isInteger(scanLimit) || scanLimit <= 0 || scanLimit > 500) {
    throw new Error("Wallet scan limit must be an integer between 1 and 500.");
  }

  return {
    masterFingerprint,
    accountXpub,
    accountDerivationPath,
    scanLimit
  };
}

function readBatchRevealClaimPackage(): BatchClaimPackage {
  const raw = elements.batchRevealPackageInput.value.trim();
  if (raw === "") {
    throw new Error("Paste one reveal-ready batch claim package JSON document.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Batch reveal package input must be valid JSON.");
  }

  return parseBatchClaimPackage(parsed);
}

function readFundingInputs(): ClaimPsbtWalletUtxo[] {
  const lines = elements.fundingInputsInput.value
    .split(/\r?\n/g)
    .map((line: string) => line.trim())
    .filter((line: string) => line !== "");

  if (lines.length === 0) {
    throw new Error("Paste at least one confirmed funding input descriptor.");
  }

  return lines.map((line: string) => parseFundingInputDescriptor(line));
}

function renderSuccess(claimPackage: ClaimPackage, bundle: ClaimPsbtBundle): void {
  const commitInputs = bundle.selectedCommitInputs
    .map((input) => input.txid.slice(0, 12) + ":" + input.vout + " · " + formatSats(input.valueSats))
    .join("\n");
  const revealInputs = bundle.selectedRevealInputs
    .map((input) => input.txid.slice(0, 12) + ":" + input.vout + " · " + formatSats(input.valueSats))
    .join("\n");

  elements.result.className = "result-card success";
  elements.result.innerHTML = [
    "<h2>Offline Claim Bundle Ready</h2>",
    "<p>Everything below was generated locally in this browser session. Download the artifacts, then carry them into Sparrow for signing.</p>",
    '<div class="summary-grid">',
    renderSummaryItem("Required Bond", formatSats(claimPackage.requiredBondSats)),
    renderSummaryItem("Commit Txid", bundle.commitArtifacts.commitTxid),
    renderSummaryItem("Reveal Funding", bundle.revealFundingSource === "commit_change" ? "Commit change" : "Extra wallet UTXOs"),
    renderSummaryItem("Change Address", bundle.commitChangeAddress),
    "</div>",
    "<pre>" + escapeHtml([
      "Commit payload: " + claimPackage.commitPayloadHex,
      "Reveal payload: " + (bundle.revealReadyClaimPackage.revealPayloadHex ?? "(not available)"),
      "",
      "Commit inputs:",
      commitInputs,
      "",
      "Reveal inputs:",
      revealInputs
    ].join("\n")) + "</pre>"
  ].join("");
}

function renderBatchSuccess(claimPackages: readonly ClaimPackage[], artifacts: BatchCommitArtifacts): void {
  const totalBondSats = claimPackages.reduce(
    (sum, claimPackage) => sum + BigInt(claimPackage.requiredBondSats),
    0n
  );

  elements.batchResult.className = "result-card success";
  elements.batchResult.innerHTML = [
    "<h2>Offline Batch Commit Bundle Ready</h2>",
    "<p>The batch commit PSBT and one reveal-ready batch claim package per name were generated locally in this browser session. Sign the batch commit first, then keep the reveal-ready packages for the later one-by-one reveals.</p>",
    '<div class="summary-grid">',
    renderSummaryItem("Claim Count", String(artifacts.updatedClaimPackages.length)),
    renderSummaryItem("Total Bond", formatSats(totalBondSats.toString())),
    renderSummaryItem("Commit Txid", artifacts.commitTxid),
    renderSummaryItem("Merkle Root", artifacts.merkleRoot),
    "</div>",
    "<pre>" + escapeHtml([
      "Batch commit txid: " + artifacts.commitTxid,
      "Merkle root: " + artifacts.merkleRoot,
      "Proof chunk bytes: " + String(artifacts.proofChunkBytes),
      "",
      "Claim outputs:",
      ...artifacts.updatedClaimPackages.map(
        (claimPackage) =>
          "  - " +
          claimPackage.name +
          " -> bond vout " +
          String(claimPackage.bondVout) +
          " · " +
          formatSats(claimPackage.requiredBondSats) +
          " · proof " +
          String(claimPackage.batchProofBytes) +
          " bytes"
      )
    ].join("\n")) + "</pre>"
  ].join("");
}

function renderBatchRevealSuccess(
  claimPackage: BatchClaimPackage,
  artifacts: BatchRevealArtifacts
): void {
  elements.batchRevealResult.className = "result-card success";
  elements.batchRevealResult.innerHTML = [
    "<h2>Offline Batch Reveal PSBT Ready</h2>",
    "<p>This reveal transaction was generated locally from a saved reveal-ready batch claim package. Each batched name still reveals one-by-one, but the Merkle proof and batch anchor details are already pinned in the package.</p>",
    '<div class="summary-grid">',
    renderSummaryItem("Name", claimPackage.name),
    renderSummaryItem("Anchor Txid", claimPackage.batchAnchorTxid),
    renderSummaryItem("Reveal Txid", artifacts.revealTxid),
    renderSummaryItem("Proof", String(claimPackage.batchProofBytes) + " bytes"),
    "</div>",
    "<pre>" + escapeHtml([
      "Batch reveal payload: " + claimPackage.revealPayloadHex,
      "Proof chunk count: " + String(claimPackage.revealProofChunkPayloadsHex.length),
      "Anchor txid: " + claimPackage.batchAnchorTxid,
      "Merkle root: " + claimPackage.batchMerkleRoot
    ].join("\n")) + "</pre>"
  ].join("");
}

function renderBatchRevealLoaded(claimPackage: BatchClaimPackage): void {
  elements.batchRevealResult.className = "result-card";
  elements.batchRevealResult.innerHTML = [
    "<h2>Batch Reveal Package Loaded</h2>",
    "<p>Reuse the wallet metadata, reveal fee, and confirmed funding inputs above, then build the one-by-one reveal PSBT for this saved batch claim package.</p>",
    '<div class="summary-grid">',
    renderSummaryItem("Name", claimPackage.name),
    renderSummaryItem("Anchor Txid", claimPackage.batchAnchorTxid),
    renderSummaryItem("Proof", String(claimPackage.batchProofBytes) + " bytes"),
    renderSummaryItem("Bond Vout", String(claimPackage.bondVout)),
    "</div>"
  ].join("");
}

function renderError(error: unknown): void {
  elements.result.className = "result-card error";
  elements.result.innerHTML = "<h2>Unable to Build Bundle</h2><p>" + escapeHtml(error instanceof Error ? error.message : "Unknown error.") + "</p>";
}

function renderBatchError(error: unknown): void {
  elements.batchResult.className = "result-card error";
  elements.batchResult.innerHTML = "<h2>Unable to Build Batch Bundle</h2><p>" + escapeHtml(error instanceof Error ? error.message : "Unknown error.") + "</p>";
  elements.batchDownloads.innerHTML = "";
}

function renderBatchRevealError(error: unknown): void {
  elements.batchRevealResult.className = "result-card error";
  elements.batchRevealResult.innerHTML =
    "<h2>Unable to Build Batch Reveal PSBT</h2><p>" +
    escapeHtml(error instanceof Error ? error.message : "Unknown error.") +
    "</p>";
}

function renderSummaryItem(label: string, value: string): string {
  return '<div class="summary-item"><strong>' + escapeHtml(label) + '</strong><span class="mono">' + escapeHtml(value) + "</span></div>";
}

function renderBatchDownloadButtons(claimPackages: readonly BatchClaimPackage[]): void {
  if (claimPackages.length === 0) {
    elements.batchDownloads.innerHTML = "";
    return;
  }

  elements.batchDownloads.innerHTML = claimPackages
    .map(
      (claimPackage, index) =>
        '<button type="button" class="secondary" data-batch-package-index="' +
        escapeHtml(String(index)) +
        '" data-batch-package-action="download">Download ' +
        escapeHtml(claimPackage.name) +
        ' package</button><button type="button" class="secondary" data-batch-package-index="' +
        escapeHtml(String(index)) +
        '" data-batch-package-action="load">Load ' +
        escapeHtml(claimPackage.name) +
        " into reveal builder</button>"
    )
    .join("");
}

function setDownloadState(enabled: boolean): void {
  elements.downloadClaimPackageButton.disabled = !enabled;
  elements.downloadRevealReadyButton.disabled = !enabled;
  elements.downloadCommitPsbtButton.disabled = !enabled;
  elements.downloadRevealPsbtButton.disabled = !enabled;
  elements.downloadSignerNotesButton.disabled = !enabled;
}

function setBatchDownloadState(enabled: boolean): void {
  elements.downloadBatchBundleButton.disabled = !enabled;
  elements.downloadBatchCommitPsbtButton.disabled = !enabled;
  elements.downloadBatchSignerNotesButton.disabled = !enabled;

  if (!enabled) {
    elements.batchDownloads.innerHTML = "";
  }
}

function setBatchRevealDownloadState(enabled: boolean): void {
  elements.downloadBatchRevealPackageButton.disabled = !enabled;
  elements.downloadBatchRevealPsbtButton.disabled = !enabled;
  elements.downloadBatchRevealSignerNotesButton.disabled = !enabled;
}

function buildSignerNotes(claimPackage: ClaimPackage, bundle: ClaimPsbtBundle): string {
  return [
    "Global Name System Offline Claim Notes",
    "",
    "Name: " + claimPackage.name,
    "Owner Pubkey: " + claimPackage.ownerPubkey,
    "Nonce: " + claimPackage.nonceHex,
    "Required Bond: " + formatSats(claimPackage.requiredBondSats),
    "Bond Vout: " + claimPackage.bondVout,
    "Bond Destination: " + (claimPackage.bondDestination ?? "(none)"),
    "Change Destination: " + (claimPackage.changeDestination ?? bundle.commitChangeAddress),
    "",
    "Commit Payload Hex:",
    claimPackage.commitPayloadHex,
    "",
    "Commit Txid:",
    bundle.commitArtifacts.commitTxid,
    "",
    "Reveal Payload Hex:",
    bundle.revealReadyClaimPackage.revealPayloadHex ?? "(missing)",
    "",
    "Commit Inputs:",
    ...bundle.selectedCommitInputs.map((input) => "  - " + input.txid + ":" + input.vout + " · " + formatSats(input.valueSats)),
    "",
    "Reveal Inputs:",
    ...bundle.selectedRevealInputs.map((input) => "  - " + input.txid + ":" + input.vout + " · " + formatSats(input.valueSats))
  ].join("\n");
}

function buildBatchSignerNotes(
  claimPackages: readonly ClaimPackage[],
  artifacts: BatchCommitArtifacts
): string {
  return [
    "Global Name System Offline Batch Claim Notes",
    "",
    "Claim Count: " + String(artifacts.updatedClaimPackages.length),
    "Commit Txid: " + artifacts.commitTxid,
    "Merkle Root: " + artifacts.merkleRoot,
    "Proof Chunk Bytes: " + String(artifacts.proofChunkBytes),
    "Fee: " + formatSats(artifacts.feeSats),
    "",
    "Claims:",
    ...artifacts.updatedClaimPackages.map((claimPackage, index) => {
      const original = claimPackages[index];
      return [
        "  - Name: " + claimPackage.name,
        "    Owner Pubkey: " + claimPackage.ownerPubkey,
        "    Nonce: " + claimPackage.nonceHex,
        "    Required Bond: " + formatSats(claimPackage.requiredBondSats),
        "    Assigned Bond Vout: " + String(claimPackage.bondVout),
        "    Bond Destination: " + (claimPackage.bondDestination ?? "(none)"),
        "    Change Destination: " + (claimPackage.changeDestination ?? "(none)"),
        "    Original Commit Payload Hex: " + (original?.commitPayloadHex ?? "(missing)"),
        "    Batch Reveal Payload Hex: " + claimPackage.revealPayloadHex,
        "    Batch Proof Bytes: " + String(claimPackage.batchProofBytes)
      ].join("\n");
    })
  ].join("\n");
}

function buildBatchRevealSignerNotes(
  claimPackage: BatchClaimPackage,
  artifacts: BatchRevealArtifacts,
  fundingInputs: readonly ClaimPsbtWalletUtxo[]
): string {
  return [
    "Global Name System Offline Batch Reveal Notes",
    "",
    "Name: " + claimPackage.name,
    "Owner Pubkey: " + claimPackage.ownerPubkey,
    "Nonce: " + claimPackage.nonceHex,
    "Anchor Txid: " + claimPackage.batchAnchorTxid,
    "Merkle Root: " + claimPackage.batchMerkleRoot,
    "Batch Proof Bytes: " + String(claimPackage.batchProofBytes),
    "Reveal Proof Chunk Count: " + String(claimPackage.revealProofChunkPayloadsHex.length),
    "Reveal Fee: " + formatSats(artifacts.feeSats),
    "",
    "Reveal Payload Hex:",
    claimPackage.revealPayloadHex,
    "",
    "Funding Inputs:",
    ...fundingInputs.map((input) => "  - " + input.txid + ":" + input.vout + " · " + formatSats(input.valueSats.toString()))
  ].join("\n");
}

function readSats(input: HTMLInputElement, label: string): bigint {
  const value = input.value.trim();
  if (value === "") {
    throw new Error(label + " is required.");
  }

  try {
    const sats = BigInt(value);
    if (sats <= 0n) {
      throw new Error(label + " must be greater than zero.");
    }

    return sats;
  } catch (error) {
    if (error instanceof Error && error.message.includes(label)) {
      throw error;
    }

    throw new Error(label + " must be an integer satoshi amount.");
  }
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function generateNonceHex(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function formatSats(value: string): string {
  const sats = BigInt(value);
  return "₿" + sats.toLocaleString("en-US") + " (" + formatBtcDecimal(sats) + " BTC)";
}

function formatBtcDecimal(sats: bigint): string {
  const whole = sats / 100_000_000n;
  const fractional = (sats % 100_000_000n).toString().padStart(8, "0").replace(/0+$/g, "");
  return fractional === "" ? whole.toString() : whole.toString() + "." + fractional;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) {
    throw new Error("Missing expected element #" + id);
  }

  return element as T;
}

function downloadJsonFile(value: unknown, filename: string): void {
  downloadTextFile(JSON.stringify(value, null, 2) + "\n", filename, "application/json");
}

function downloadTextFile(value: string, filename: string, contentType = "text/plain"): void {
  const blob = new Blob([value], { type: contentType + ";charset=utf-8" });
  downloadBlob(blob, filename);
}

function downloadBase64BinaryFile(base64: string, filename: string): void {
  const binary = Uint8Array.from(globalThis.atob(base64), (char) => char.charCodeAt(0));
  downloadBlob(new Blob([binary], { type: "application/octet-stream" }), filename);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
