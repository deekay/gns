import {
  buildClaimPsbtBundle,
  parseFundingInputDescriptor,
  type ClaimPsbtBundle,
  type ClaimPsbtWalletUtxo
} from "@gns/architect";
import { createClaimPackage, type ClaimPackage, type CreateClaimPackageInput } from "@gns/protocol";

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
  generateNonceButton: requireElement<HTMLButtonElement>("offlineGenerateNonceButton"),
  buildButton: requireElement<HTMLButtonElement>("offlineBuildButton"),
  downloadClaimPackageButton: requireElement<HTMLButtonElement>("offlineDownloadClaimPackageButton"),
  downloadRevealReadyButton: requireElement<HTMLButtonElement>("offlineDownloadRevealReadyButton"),
  downloadCommitPsbtButton: requireElement<HTMLButtonElement>("offlineDownloadCommitPsbtButton"),
  downloadRevealPsbtButton: requireElement<HTMLButtonElement>("offlineDownloadRevealPsbtButton"),
  downloadSignerNotesButton: requireElement<HTMLButtonElement>("offlineDownloadSignerNotesButton"),
  result: requireElement<HTMLDivElement>("offlineClaimResult")
};

let currentClaimPackage: ClaimPackage | null = null;
let currentBundle: ClaimPsbtBundle | null = null;

elements.nonceInput.value = elements.nonceInput.value.trim() || generateNonceHex();

elements.generateNonceButton.addEventListener("click", () => {
  elements.nonceInput.value = generateNonceHex();
});

elements.buildButton.addEventListener("click", () => {
  try {
    const claimInput = readClaimPackageInput();
    const availableUtxos = readFundingInputs();

    currentClaimPackage = createClaimPackage(claimInput);
    currentBundle = buildClaimPsbtBundle({
      name: claimInput.name,
      ownerPubkey: claimInput.ownerPubkey,
      nonceHex: claimInput.nonceHex,
      bondVout: claimInput.bondVout ?? 0,
      bondDestination: claimInput.bondDestination ?? "",
      ...(claimInput.changeDestination === null ? {} : { changeDestination: claimInput.changeDestination }),
      walletDerivation: {
        masterFingerprint: elements.fingerprintInput.value.trim(),
        accountXpub: elements.accountXpubInput.value.trim(),
        accountDerivationPath: elements.accountPathInput.value.trim(),
        scanLimit: Number.parseInt(elements.walletScanLimitInput.value.trim() || "50", 10)
      },
      availableUtxos,
      commitFeeSats: BigInt(elements.commitFeeInput.value.trim()),
      revealFeeSats: BigInt(elements.revealFeeInput.value.trim()),
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

function readClaimPackageInput(): CreateClaimPackageInput {
  const name = elements.nameInput.value.trim();
  const ownerPubkey = elements.ownerPubkeyInput.value.trim();
  const nonceHex = elements.nonceInput.value.trim().toLowerCase();
  const bondDestination = elements.bondDestinationInput.value.trim();
  const changeDestination = elements.changeDestinationInput.value.trim();
  const bondVoutText = elements.bondVoutInput.value.trim();
  const bondVout = Number.parseInt(bondVoutText || "0", 10);

  if (name === "" || ownerPubkey === "" || nonceHex === "" || bondDestination === "") {
    throw new Error("Name, owner pubkey, nonce, and bond destination are all required.");
  }

  if (!Number.isInteger(bondVout) || bondVout < 0 || bondVout > 0xff) {
    throw new Error("Bond output vout must be a byte value between 0 and 255.");
  }

  if (elements.fingerprintInput.value.trim() === "" || elements.accountXpubInput.value.trim() === "" || elements.accountPathInput.value.trim() === "") {
    throw new Error("Master fingerprint, account xpub, and account derivation path are required.");
  }

  return {
    name,
    ownerPubkey,
    nonceHex,
    bondVout,
    bondDestination,
    changeDestination: changeDestination === "" ? null : changeDestination
  };
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

function renderError(error: unknown): void {
  elements.result.className = "result-card error";
  elements.result.innerHTML = "<h2>Unable to Build Bundle</h2><p>" + escapeHtml(error instanceof Error ? error.message : "Unknown error.") + "</p>";
}

function renderSummaryItem(label: string, value: string): string {
  return '<div class="summary-item"><strong>' + escapeHtml(label) + '</strong><span class="mono">' + escapeHtml(value) + "</span></div>";
}

function setDownloadState(enabled: boolean): void {
  elements.downloadClaimPackageButton.disabled = !enabled;
  elements.downloadRevealReadyButton.disabled = !enabled;
  elements.downloadCommitPsbtButton.disabled = !enabled;
  elements.downloadRevealPsbtButton.disabled = !enabled;
  elements.downloadSignerNotesButton.disabled = !enabled;
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
