import { PRODUCT_NAME, PROTOCOL_NAME, REVEAL_WINDOW_BLOCKS, TRANSFER_PACKAGE_FORMAT, TRANSFER_PACKAGE_VERSION } from "@gns/protocol";

export function renderClientScript(configuredBasePath: string): string {
  return `
const BASE_PATH = ${JSON.stringify(configuredBasePath)};
const PROTOCOL_ID = ${JSON.stringify(PROTOCOL_NAME)};
const PRODUCT_LABEL = ${JSON.stringify(PRODUCT_NAME)};
const TRANSFER_PACKAGE_FORMAT = ${JSON.stringify(TRANSFER_PACKAGE_FORMAT)};
const TRANSFER_PACKAGE_VERSION = ${JSON.stringify(TRANSFER_PACKAGE_VERSION)};
const CLAIM_PROGRESS_STORAGE_KEY = "gns.claim-progress.v1";
const TRANSFER_PROGRESS_STORAGE_KEY = "gns.transfer-progress.v1";
const state = {
  config: null,
  health: null,
  names: [],
  activity: [],
  activeNameActivity: [],
  pendingCommits: [],
  generatedOwnerKey: null,
  claimDraft: null,
  claimPsbtBundle: null,
  transferDraft: null,
  privateBatchSmokeStatus: null,
  privateAuctionSmokeStatus: null,
  auctionLab: null,
  experimentalAuctions: null,
  auctionBidPackages: new Map(),
  nameFilter: "all",
  activityFilter: "all",
  txCache: new Map()
};

const elements = {
  searchForm: document.getElementById("searchForm"),
  nameInput: document.getElementById("nameInput"),
  searchResult: document.getElementById("searchResult"),
  privateFundingForm: document.getElementById("privateFundingForm"),
  privateFundingAddressInput: document.getElementById("privateFundingAddressInput"),
  privateFundingResult: document.getElementById("privateFundingResult"),
  claimDraftForm: document.getElementById("claimDraftForm"),
  claimStepInputs: document.getElementById("claim-step-inputs"),
  claimStepInputsState: document.getElementById("claimStepInputsState"),
  claimStepBackups: document.getElementById("claim-step-backups"),
  claimStepBackupsState: document.getElementById("claimStepBackupsState"),
  claimStepPsbts: document.getElementById("claim-step-psbts"),
  claimStepPsbtsState: document.getElementById("claimStepPsbtsState"),
  claimNameInput: document.getElementById("claimNameInput"),
  ownerPubkeyInput: document.getElementById("ownerPubkeyInput"),
  generateOwnerKeyButton: document.getElementById("generateOwnerKeyButton"),
  nonceInput: document.getElementById("nonceInput"),
  bondVoutInput: document.getElementById("bondVoutInput"),
  bondDestinationInput: document.getElementById("bondDestinationInput"),
  changeDestinationInput: document.getElementById("changeDestinationInput"),
  commitTxidInput: document.getElementById("commitTxidInput"),
  regenNonceButton: document.getElementById("regenNonceButton"),
  downloadClaimPackageButton: document.getElementById("downloadClaimPackageButton"),
  downloadSignerNotesButton: document.getElementById("downloadSignerNotesButton"),
  walletMasterFingerprintInput: document.getElementById("walletMasterFingerprintInput"),
  walletAccountXpubInput: document.getElementById("walletAccountXpubInput"),
  walletAccountPathInput: document.getElementById("walletAccountPathInput"),
  walletScanLimitInput: document.getElementById("walletScanLimitInput"),
  commitFeeSatsInput: document.getElementById("commitFeeSatsInput"),
  revealFeeSatsInput: document.getElementById("revealFeeSatsInput"),
  buildClaimPsbtsButton: document.getElementById("buildClaimPsbtsButton"),
  downloadClaimCommitPsbtButton: document.getElementById("downloadClaimCommitPsbtButton"),
  downloadClaimRevealPsbtButton: document.getElementById("downloadClaimRevealPsbtButton"),
  downloadRevealReadyPackageButton: document.getElementById("downloadRevealReadyPackageButton"),
  transferDraftForm: document.getElementById("transferDraftForm"),
  transferStepInputs: document.getElementById("transfer-step-inputs"),
  transferStepInputsState: document.getElementById("transferStepInputsState"),
  transferStepReview: document.getElementById("transfer-step-review"),
  transferStepReviewState: document.getElementById("transferStepReviewState"),
  transferNameInput: document.getElementById("transferNameInput"),
  transferNewOwnerPubkeyInput: document.getElementById("transferNewOwnerPubkeyInput"),
  transferModeInput: document.getElementById("transferModeInput"),
  transferSellerPayoutAddressInput: document.getElementById("transferSellerPayoutAddressInput"),
  transferBondAddressInput: document.getElementById("transferBondAddressInput"),
  downloadTransferPackageButton: document.getElementById("downloadTransferPackageButton"),
  downloadTransferNotesButton: document.getElementById("downloadTransferNotesButton"),
  transferDraftResult: document.getElementById("transferDraftResult"),
  testKeyResult: document.getElementById("testKeyResult"),
  claimDraftResult: document.getElementById("claimDraftResult"),
  claimPsbtResult: document.getElementById("claimPsbtResult"),
  trackedNames: document.getElementById("trackedNames"),
  immatureNames: document.getElementById("immatureNames"),
  matureNames: document.getElementById("matureNames"),
  invalidNames: document.getElementById("invalidNames"),
  pendingCommits: document.getElementById("pendingCommits"),
  currentHeight: document.getElementById("currentHeight"),
  currentBlockHash: document.getElementById("currentBlockHash"),
  syncMode: document.getElementById("syncMode"),
  networkLabel: document.getElementById("networkLabel"),
  networkSource: document.getElementById("networkSource"),
  networkChain: document.getElementById("networkChain"),
  networkResolver: document.getElementById("networkResolver"),
  chainSummary: document.getElementById("chainSummary"),
  privateBatchSmokeMeta: document.getElementById("privateBatchSmokeMeta"),
  privateBatchSmokeResult: document.getElementById("privateBatchSmokeResult"),
  privateAuctionSmokeMeta: document.getElementById("privateAuctionSmokeMeta"),
  privateAuctionSmokeResult: document.getElementById("privateAuctionSmokeResult"),
  auctionPolicyControls: document.getElementById("auctionPolicyControls"),
  auctionNoBidReleaseBlocksInput: document.getElementById("auctionNoBidReleaseBlocksInput"),
  auctionPolicyResetButton: document.getElementById("auctionPolicyResetButton"),
  auctionPolicyControlsResult: document.getElementById("auctionPolicyControlsResult"),
  auctionLabMeta: document.getElementById("auctionLabMeta"),
  auctionPolicySummary: document.getElementById("auctionPolicySummary"),
  auctionLabList: document.getElementById("auctionLabList"),
  experimentalAuctionMeta: document.getElementById("experimentalAuctionMeta"),
  experimentalAuctionList: document.getElementById("experimentalAuctionList"),
  recentNamesState: document.getElementById("recentNamesState"),
  recentNamesList: document.getElementById("recentNamesList"),
  activityFilters: document.getElementById("activityFilters"),
  activityHighlights: document.getElementById("activityHighlights"),
  activityState: document.getElementById("activityState"),
  activityList: document.getElementById("activityList"),
  pendingState: document.getElementById("pendingState"),
  pendingList: document.getElementById("pendingList"),
  namesFilters: document.getElementById("namesFilters"),
  namesState: document.getElementById("namesState"),
  namesList: document.getElementById("namesList")
};

function updateClaimActionStates() {
  const hasDraft = state.claimDraft !== null;
  const hasPsbtBundle = state.claimPsbtBundle !== null;

  if (elements.downloadClaimPackageButton instanceof HTMLButtonElement) {
    elements.downloadClaimPackageButton.disabled = !hasDraft;
  }
  if (elements.downloadSignerNotesButton instanceof HTMLButtonElement) {
    elements.downloadSignerNotesButton.disabled = !hasDraft;
  }
  if (elements.buildClaimPsbtsButton instanceof HTMLButtonElement) {
    elements.buildClaimPsbtsButton.disabled = !hasDraft;
  }
  if (elements.downloadClaimCommitPsbtButton instanceof HTMLButtonElement) {
    elements.downloadClaimCommitPsbtButton.disabled = !hasPsbtBundle;
  }
  if (elements.downloadClaimRevealPsbtButton instanceof HTMLButtonElement) {
    elements.downloadClaimRevealPsbtButton.disabled = !hasPsbtBundle;
  }
  if (elements.downloadRevealReadyPackageButton instanceof HTMLButtonElement) {
    elements.downloadRevealReadyPackageButton.disabled = !hasPsbtBundle;
  }

  syncClaimWizard();
}

function updateTransferActionStates() {
  const hasTransferDraft = state.transferDraft !== null;
  const canExportPackage = hasTransferDraft && state.transferDraft?.kind !== "invalid";

  if (elements.downloadTransferPackageButton instanceof HTMLButtonElement) {
    elements.downloadTransferPackageButton.disabled = !canExportPackage;
  }
  if (elements.downloadTransferNotesButton instanceof HTMLButtonElement) {
    elements.downloadTransferNotesButton.disabled = !hasTransferDraft;
  }

  syncTransferWizard();
}

function setStepChip(node, text, tone) {
  if (!(node instanceof HTMLElement)) {
    return;
  }

  node.textContent = text;
  node.classList.remove("is-waiting", "is-current", "is-ready", "is-complete");
  if (tone) {
    node.classList.add("is-" + tone);
  }
}

function setDetailsOpen(node, open) {
  if (node instanceof HTMLDetailsElement) {
    node.open = open;
  }
}

function hasSelectedGeneratedOwnerKey() {
  return state.generatedOwnerKey !== null
    && String(elements.ownerPubkeyInput?.value?.trim() ?? "") === String(state.generatedOwnerKey.ownerPubkey);
}

function syncClaimWizard() {
  const hasDraft = state.claimDraft !== null;
  const hasPsbtBundle = state.claimPsbtBundle !== null;
  const hasGeneratedOwnerKey = hasSelectedGeneratedOwnerKey();

  setStepChip(elements.claimStepInputsState, hasDraft ? "Done" : "Start here", hasDraft ? "complete" : "current");
  setStepChip(
    elements.claimStepBackupsState,
    hasDraft || hasGeneratedOwnerKey ? "Do this now" : "After step 1",
    hasDraft || hasGeneratedOwnerKey ? "ready" : "waiting"
  );
  setStepChip(
    elements.claimStepPsbtsState,
    hasPsbtBundle ? "Bundle ready" : hasDraft ? "Build next" : "After step 2",
    hasPsbtBundle ? "complete" : hasDraft ? "ready" : "waiting"
  );

  if (hasPsbtBundle) {
    setDetailsOpen(elements.claimStepInputs, false);
    setDetailsOpen(elements.claimStepBackups, false);
    setDetailsOpen(elements.claimStepPsbts, true);
    return;
  }

  if (hasDraft) {
    setDetailsOpen(elements.claimStepInputs, false);
    setDetailsOpen(elements.claimStepBackups, true);
    setDetailsOpen(elements.claimStepPsbts, false);
    return;
  }

  if (hasGeneratedOwnerKey) {
    setDetailsOpen(elements.claimStepInputs, true);
    setDetailsOpen(elements.claimStepBackups, true);
    setDetailsOpen(elements.claimStepPsbts, false);
    return;
  }

  setDetailsOpen(elements.claimStepInputs, true);
  setDetailsOpen(elements.claimStepBackups, false);
  setDetailsOpen(elements.claimStepPsbts, false);
}

function syncTransferWizard() {
  const hasTransferDraft = state.transferDraft !== null;
  setStepChip(
    elements.transferStepInputsState,
    hasTransferDraft ? "Done" : "Start here",
    hasTransferDraft ? "complete" : "current"
  );
  setStepChip(
    elements.transferStepReviewState,
    hasTransferDraft ? "Review now" : "After step 1",
    hasTransferDraft ? "ready" : "waiting"
  );

  if (hasTransferDraft) {
    setDetailsOpen(elements.transferStepInputs, false);
    setDetailsOpen(elements.transferStepReview, true);
    return;
  }

  setDetailsOpen(elements.transferStepInputs, true);
  setDetailsOpen(elements.transferStepReview, false);
}

function invalidateClaimDraftState(draftMessage, psbtMessage) {
  const hadClaimArtifacts = state.claimDraft !== null || state.claimPsbtBundle !== null;
  state.claimDraft = null;
  state.claimPsbtBundle = null;

  if (hadClaimArtifacts) {
    renderClaimDraftMessage(draftMessage);
    renderClaimPsbtMessage(psbtMessage);
  }

  updateClaimActionStates();
}

function readStoredObject(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredObject(key, payload) {
  try {
    const hasMeaningfulValue = Object.values(payload).some((value) => typeof value === "string" && value.trim() !== "");
    if (!hasMeaningfulValue) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage failures in the browser-only convenience layer.
  }
}

function restoreClaimProgress(initialClaimName) {
  const saved = readStoredObject(CLAIM_PROGRESS_STORAGE_KEY);
  if (!saved) {
    return false;
  }

  const claimName = typeof saved.claimName === "string" ? saved.claimName : "";
  const ownerPubkey = typeof saved.ownerPubkey === "string" ? saved.ownerPubkey : "";
  const nonceHex = typeof saved.nonceHex === "string" ? saved.nonceHex : "";
  const bondVout = typeof saved.bondVout === "string" ? saved.bondVout : "";
  const bondDestination = typeof saved.bondDestination === "string" ? saved.bondDestination : "";
  const changeDestination = typeof saved.changeDestination === "string" ? saved.changeDestination : "";
  const commitTxid = typeof saved.commitTxid === "string" ? saved.commitTxid : "";
  let restored = false;

  if (elements.claimNameInput && !elements.claimNameInput.value && !initialClaimName && claimName) {
    elements.claimNameInput.value = claimName;
    restored = true;
  }
  if (elements.ownerPubkeyInput && !elements.ownerPubkeyInput.value && ownerPubkey) {
    elements.ownerPubkeyInput.value = ownerPubkey;
    restored = true;
  }
  if (elements.nonceInput && !elements.nonceInput.value && nonceHex) {
    elements.nonceInput.value = nonceHex;
    restored = true;
  }
  if (elements.bondVoutInput && !elements.bondVoutInput.value && bondVout) {
    elements.bondVoutInput.value = bondVout;
    restored = true;
  }
  if (elements.bondDestinationInput && !elements.bondDestinationInput.value && bondDestination) {
    elements.bondDestinationInput.value = bondDestination;
    restored = true;
  }
  if (elements.changeDestinationInput && !elements.changeDestinationInput.value && changeDestination) {
    elements.changeDestinationInput.value = changeDestination;
    restored = true;
  }
  if (elements.commitTxidInput && !elements.commitTxidInput.value && commitTxid) {
    elements.commitTxidInput.value = commitTxid;
    restored = true;
  }

  return restored;
}

function persistClaimProgress() {
  writeStoredObject(CLAIM_PROGRESS_STORAGE_KEY, {
    claimName: elements.claimNameInput?.value ?? "",
    ownerPubkey: elements.ownerPubkeyInput?.value ?? "",
    nonceHex: elements.nonceInput?.value ?? "",
    bondVout: elements.bondVoutInput?.value ?? "",
    bondDestination: elements.bondDestinationInput?.value ?? "",
    changeDestination: elements.changeDestinationInput?.value ?? "",
    commitTxid: elements.commitTxidInput?.value ?? ""
  });
}

function restoreTransferProgress(initialTransferName) {
  const saved = readStoredObject(TRANSFER_PROGRESS_STORAGE_KEY);
  if (!saved) {
    return false;
  }

  const transferName = typeof saved.transferName === "string" ? saved.transferName : "";
  const newOwnerPubkey = typeof saved.newOwnerPubkey === "string" ? saved.newOwnerPubkey : "";
  const mode = typeof saved.mode === "string" ? saved.mode : "";
  const sellerPayoutAddress = typeof saved.sellerPayoutAddress === "string" ? saved.sellerPayoutAddress : "";
  const bondAddress = typeof saved.bondAddress === "string" ? saved.bondAddress : "";
  let restored = false;

  if (elements.transferNameInput && !elements.transferNameInput.value && !initialTransferName && transferName) {
    elements.transferNameInput.value = transferName;
    restored = true;
  }
  if (elements.transferNewOwnerPubkeyInput && !elements.transferNewOwnerPubkeyInput.value && newOwnerPubkey) {
    elements.transferNewOwnerPubkeyInput.value = newOwnerPubkey;
    restored = true;
  }
  if (elements.transferModeInput && !elements.transferModeInput.value && mode) {
    elements.transferModeInput.value = mode;
    restored = true;
  }
  if (elements.transferSellerPayoutAddressInput && !elements.transferSellerPayoutAddressInput.value && sellerPayoutAddress) {
    elements.transferSellerPayoutAddressInput.value = sellerPayoutAddress;
    restored = true;
  }
  if (elements.transferBondAddressInput && !elements.transferBondAddressInput.value && bondAddress) {
    elements.transferBondAddressInput.value = bondAddress;
    restored = true;
  }

  return restored;
}

function persistTransferProgress() {
  writeStoredObject(TRANSFER_PROGRESS_STORAGE_KEY, {
    transferName: elements.transferNameInput?.value ?? "",
    newOwnerPubkey: elements.transferNewOwnerPubkeyInput?.value ?? "",
    mode: elements.transferModeInput?.value ?? "",
    sellerPayoutAddress: elements.transferSellerPayoutAddressInput?.value ?? "",
    bondAddress: elements.transferBondAddressInput?.value ?? ""
  });
}

void bootstrap();

async function bootstrap() {
  const initialDetailName = getInitialDetailName();
  const initialClaimName = getInitialClaimName();
  const initialTransferName = getInitialTransferName();
  const restoredClaimProgress = restoreClaimProgress(initialClaimName);
  const restoredTransferProgress = restoreTransferProgress(initialTransferName);

  if (elements.nonceInput && !elements.nonceInput.value) {
    elements.nonceInput.value = generateNonceHex();
  }

  if (initialClaimName) {
    if (elements.claimNameInput && !elements.claimNameInput.value) {
      elements.claimNameInput.value = initialClaimName;
    }
    if (elements.nameInput && !elements.nameInput.value) {
      elements.nameInput.value = initialClaimName;
    }
  }

  if (initialTransferName && elements.transferNameInput && !elements.transferNameInput.value) {
    elements.transferNameInput.value = initialTransferName;
  }

  persistClaimProgress();
  persistTransferProgress();

  updateClaimActionStates();
  updateTransferActionStates();

  try {
    const [config, health, namesPayload, pendingPayload, activityPayload, auctionLabPayload, experimentalAuctionsPayload] = await Promise.all([
      fetchJson(withBasePath("/api/config")),
      fetchJson(withBasePath("/api/health")),
      fetchJson(withBasePath("/api/names")),
      fetchJson(withBasePath("/api/pending-commits")),
      fetchJson(withBasePath("/api/activity?limit=10")),
      isAuctionsPage() ? fetchJson(getAuctionLabApiPath()).catch(() => null) : Promise.resolve(null),
      isAuctionsPage() ? fetchJson(withBasePath("/api/experimental-auctions")).catch(() => null) : Promise.resolve(null)
    ]);
    const privateBatchSmokeStatus = config.showPrivateBatchSmoke
      ? await fetchJson(withBasePath("/api/private-batch-smoke-status")).catch(() => null)
      : null;
    const privateAuctionSmokeStatus = config.showPrivateAuctionSmoke
      ? await fetchJson(withBasePath("/api/private-auction-smoke-status")).catch(() => null)
      : null;

    state.config = config;
    state.health = health;
    state.names = Array.isArray(namesPayload.names) ? namesPayload.names : [];
    state.activity = Array.isArray(activityPayload.activity) ? activityPayload.activity : [];
    state.pendingCommits = Array.isArray(pendingPayload.pendingCommits) ? pendingPayload.pendingCommits : [];
    state.privateBatchSmokeStatus = privateBatchSmokeStatus;
    state.privateAuctionSmokeStatus = privateAuctionSmokeStatus;
    state.auctionLab = auctionLabPayload;
    state.experimentalAuctions = experimentalAuctionsPayload;

    renderHealth();
    renderPrivateBatchSmokeStatus();
    renderPrivateAuctionSmokeStatus();
    renderAuctionLab();
    renderExperimentalAuctionFeed();
    renderRecentNames();
    renderActivity();
    renderPendingCommits();
    renderNames();

    if (initialDetailName) {
      if (elements.nameInput) {
        elements.nameInput.value = initialDetailName;
      }
      if (elements.claimNameInput) {
        elements.claimNameInput.value = initialDetailName;
      }
      await resolveNameLookup(initialDetailName, {
        updateHistory: false
      });
    } else if (isClaimPrepPage() && initialClaimName) {
      renderClaimDraftMessage(
        'Ready to prepare a claim for "' + initialClaimName + '". Fill in the owner pubkey and nonce, then continue in your signer.'
      );
    } else if (isClaimPrepPage() && restoredClaimProgress) {
      renderClaimDraftMessage(
        "Recovered claim details from this browser. Prepare the draft again to resume, and save the reveal backup before you leave later."
      );
    } else if (isTransferPrepPage() && initialTransferName) {
      renderTransferDraftMessage(
        'Ready to prepare a transfer for "' +
          initialTransferName +
          '". Add the new owner pubkey and the site will recommend the right transfer path from the current name state.'
      );
    } else if (isTransferPrepPage() && restoredTransferProgress) {
      renderTransferDraftMessage(
        "Recovered transfer details from this browser. Build the transfer plan again to resume."
      );
    }
  } catch (error) {
    renderBootError(error);
  }

  elements.searchForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const rawName = elements.nameInput?.value?.trim() ?? "";
    if (rawName.length === 0) {
      renderSearchMessage("Enter a name to resolve.");
      return;
    }
    await resolveNameLookup(rawName, {
      updateHistory: true
    });
  });

  elements.auctionPolicyControls?.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const overrides = readAuctionLabPolicyOverridesFromControls();
      applyAuctionLabPolicyOverridesToHistory(overrides);
      await reloadAuctionLab();
      setAuctionPolicyControlsMessage(
        overrides.noBidReleaseBlocks == null
          ? "Using the current default release window."
          : "Applied a custom no-bid release window to the simulator view."
      );
    } catch (error) {
      setAuctionPolicyControlsMessage(describeError(error));
    }
  });

  elements.auctionPolicyResetButton?.addEventListener("click", async () => {
    if (elements.auctionNoBidReleaseBlocksInput instanceof HTMLInputElement) {
      elements.auctionNoBidReleaseBlocksInput.value = "";
    }

    applyAuctionLabPolicyOverridesToHistory({
      noBidReleaseBlocks: null
    });

    try {
      await reloadAuctionLab();
      setAuctionPolicyControlsMessage("Reset the simulator policy back to the current defaults.");
    } catch (error) {
      setAuctionPolicyControlsMessage(describeError(error));
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const source = target.getAttribute("data-auction-package-source");
    const id =
      target.getAttribute("data-auction-bidder-id")
      ?? target.getAttribute("data-auction-bid-amount");

    if (!source || !id) {
      return;
    }

    const domKey = buildAuctionPackageDomKey(source, id);
    state.auctionBidPackages.delete(domKey);
    setAuctionBidPackagePreview(domKey, "");
    setAuctionBidPackageMessage(domKey, "Inputs changed. Preview the current bid package before downloading it.");
  });

  elements.regenNonceButton?.addEventListener("click", () => {
    if (elements.nonceInput) {
      elements.nonceInput.value = generateNonceHex();
    }
    persistClaimProgress();
    invalidateClaimDraftState(
      "Nonce updated. Prepare the claim draft again.",
      "Prepare the updated claim draft again before building Sparrow-native PSBTs."
    );
  });

  elements.generateOwnerKeyButton?.addEventListener("click", async () => {
    renderTestKeyMessage("Generating a local prototype key...");

    try {
      const generated = await fetchJson(withBasePath("/api/dev-owner-key"));
      state.generatedOwnerKey = generated;
      if (elements.ownerPubkeyInput) {
        elements.ownerPubkeyInput.value = generated.ownerPubkey;
      }
      persistClaimProgress();
      invalidateClaimDraftState(
        "Test key updated. Prepare a fresh claim draft next.",
        "Prepare a fresh claim draft, then build Sparrow-native PSBTs from your wallet metadata."
      );
      renderTestKey(generated);
    } catch (error) {
      renderTestKeyError(error);
    }
  });

  elements.privateFundingForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const address = elements.privateFundingAddressInput?.value?.trim() ?? "";
    if (address.length === 0) {
      renderPrivateFundingMessage("Paste a Sparrow receive address first.");
      return;
    }

    renderPrivateFundingMessage("Funding your private signet wallet... this can take around 20 seconds while the demo chain mines a block.");

    try {
      const result = await postJson(withBasePath("/api/private-signet-fund"), {
        address
      });
      renderPrivateFundingResult(result);
    } catch (error) {
      renderPrivateFundingError(error);
    }
  });

  elements.claimDraftForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const rawName = elements.claimNameInput?.value?.trim() ?? "";
    const ownerPubkey = elements.ownerPubkeyInput?.value?.trim() ?? "";
    const nonceHex = elements.nonceInput?.value?.trim().toLowerCase() ?? "";
    const bondVout = elements.bondVoutInput?.value?.trim() ?? "0";
    const bondDestination = elements.bondDestinationInput?.value?.trim() ?? "";
    const changeDestination = elements.changeDestinationInput?.value?.trim() ?? "";
    const commitTxid = elements.commitTxidInput?.value?.trim().toLowerCase() ?? "";

    if (rawName.length === 0) {
      renderClaimDraftMessage("Enter a desired name first.");
      return;
    }

    if (ownerPubkey.length === 0) {
      renderClaimDraftMessage("Enter the owner pubkey in 32-byte hex form.");
      return;
    }

    if (nonceHex.length === 0) {
      renderClaimDraftMessage("Generate or enter an 8-byte nonce.");
      return;
    }

    const normalizedName = rawName.toLowerCase();
    if (elements.claimNameInput) {
      elements.claimNameInput.value = normalizedName;
    }

    renderClaimDraftMessage("Preparing claim draft...");
    state.claimPsbtBundle = null;
    renderClaimPsbtMessage("Draft is updating. Rebuild the Sparrow PSBTs after the new draft is ready.");
    updateClaimActionStates();

    try {
      const query = new URLSearchParams({
        ownerPubkey,
        nonceHex,
        bondVout,
        ...(bondDestination === "" ? {} : { bondDestination }),
        ...(changeDestination === "" ? {} : { changeDestination }),
        ...(commitTxid === "" ? {} : { commitTxid })
      });
      const draft = await fetchJson(
        withBasePath("/api/claim-draft/" + encodeURIComponent(normalizedName) + "?" + query.toString())
      );
      state.claimDraft = draft;
      renderClaimDraft(draft);
      renderClaimPsbtMessage(
        "Draft ready. Paste the Sparrow account fingerprint and xpub below to generate ready-to-sign PSBTs."
      );
      updateClaimActionStates();
    } catch (error) {
      renderClaimDraftError(error);
      state.claimPsbtBundle = null;
      renderClaimPsbtMessage("Fix the claim draft first, then build Sparrow-native PSBTs.");
      updateClaimActionStates();
    }
  });

  elements.downloadClaimPackageButton?.addEventListener("click", () => {
    if (!state.claimDraft) {
      renderClaimDraftMessage("Prepare a claim draft before downloading a claim package.");
      return;
    }

    downloadJsonFile(
      withClaimDraftLocalData(state.claimDraft),
      "gns-claim-" +
        state.claimDraft.name +
        (state.claimDraft.commitTxid ? "-reveal-ready" : "-commit-ready") +
        ".json"
    );
  });

  elements.downloadSignerNotesButton?.addEventListener("click", () => {
    if (!state.claimDraft) {
      renderClaimDraftMessage("Prepare a claim draft before downloading signer notes.");
      return;
    }

    downloadTextFile(
      buildClaimEssentialsText(state.claimDraft),
      "gns-claim-" + state.claimDraft.name + "-signer-notes.txt"
    );
  });

  elements.buildClaimPsbtsButton?.addEventListener("click", async () => {
    if (!state.claimDraft) {
      renderClaimPsbtMessage("Prepare a claim draft before building Sparrow-native PSBTs.");
      return;
    }

    const walletMasterFingerprint = elements.walletMasterFingerprintInput?.value?.trim() ?? "";
    const walletAccountXpub = elements.walletAccountXpubInput?.value?.trim() ?? "";
    const walletAccountPath = elements.walletAccountPathInput?.value?.trim() ?? "";
    const walletScanLimit = elements.walletScanLimitInput?.value?.trim() ?? "";
    const commitFeeSats = elements.commitFeeSatsInput?.value?.trim() ?? "";
    const revealFeeSats = elements.revealFeeSatsInput?.value?.trim() ?? "";

    if (walletMasterFingerprint.length === 0 || walletAccountXpub.length === 0 || walletAccountPath.length === 0) {
      renderClaimPsbtMessage("Paste the Sparrow master fingerprint, account xpub, and account derivation path first.");
      return;
    }

    renderClaimPsbtMessage("Scanning the Sparrow account and building ready-to-sign commit/reveal PSBTs...");

    try {
      const bundle = await postJson(withBasePath("/api/private-signet-claim-psbts"), {
        name: state.claimDraft.name,
        ownerPubkey: state.claimDraft.ownerPubkey,
        nonceHex: state.claimDraft.nonceHex,
        bondVout: state.claimDraft.bondVout,
        bondDestination: state.claimDraft.bondDestination,
        changeDestination: state.claimDraft.changeDestination,
        walletMasterFingerprint,
        walletAccountXpub,
        walletAccountPath,
        ...(walletScanLimit === "" ? {} : { walletScanLimit: Number.parseInt(walletScanLimit, 10) }),
        ...(commitFeeSats === "" ? {} : { commitFeeSats }),
        ...(revealFeeSats === "" ? {} : { revealFeeSats })
      });
      state.claimPsbtBundle = bundle;
      renderClaimPsbtBundle(bundle);
      updateClaimActionStates();
    } catch (error) {
      state.claimPsbtBundle = null;
      renderClaimPsbtError(error);
      updateClaimActionStates();
    }
  });

  const claimInputsThatInvalidateDraft = [
    elements.claimNameInput,
    elements.ownerPubkeyInput,
    elements.nonceInput,
    elements.bondVoutInput,
    elements.bondDestinationInput,
    elements.changeDestinationInput,
    elements.commitTxidInput
  ];

  const handleClaimInputMutation = () => {
    invalidateClaimDraftState(
      "Claim details changed. Prepare the draft again so the backup files and PSBT step stay in sync.",
      "Claim details changed. Prepare the draft again before building Sparrow-native PSBTs."
    );
  };

  claimInputsThatInvalidateDraft.forEach((input) => {
    input?.addEventListener("input", () => {
      persistClaimProgress();
      handleClaimInputMutation();
    });
    input?.addEventListener("change", () => {
      persistClaimProgress();
      handleClaimInputMutation();
    });
  });

  [
    elements.transferNameInput,
    elements.transferNewOwnerPubkeyInput,
    elements.transferModeInput,
    elements.transferSellerPayoutAddressInput,
    elements.transferBondAddressInput
  ].forEach((input) => {
    const handleTransferMutation = () => {
      persistTransferProgress();

      if (state.transferDraft !== null) {
        state.transferDraft = null;
        renderTransferDraftMessage("Transfer details changed. Build the transfer plan again so the handoff stays in sync.");
        return;
      }

      updateTransferActionStates();
    };

    input?.addEventListener("input", handleTransferMutation);
    input?.addEventListener("change", handleTransferMutation);
  });

  elements.downloadClaimCommitPsbtButton?.addEventListener("click", () => {
    if (!state.claimPsbtBundle) {
      renderClaimPsbtMessage("Build the Sparrow-native PSBT bundle first.");
      return;
    }

    downloadBase64BinaryFile(
      state.claimPsbtBundle.commitArtifacts.psbtBase64,
      "gns-commit-" + state.claimPsbtBundle.revealReadyClaimPackage.name + "-sparrow.psbt"
    );
  });

  elements.downloadClaimRevealPsbtButton?.addEventListener("click", () => {
    if (!state.claimPsbtBundle) {
      renderClaimPsbtMessage("Build the Sparrow-native PSBT bundle first.");
      return;
    }

    downloadBase64BinaryFile(
      state.claimPsbtBundle.revealArtifacts.psbtBase64,
      "gns-reveal-" + state.claimPsbtBundle.revealReadyClaimPackage.name + "-sparrow.psbt"
    );
  });

  elements.downloadRevealReadyPackageButton?.addEventListener("click", () => {
    if (!state.claimPsbtBundle) {
      renderClaimPsbtMessage("Build the Sparrow-native PSBT bundle first.");
      return;
    }

    downloadJsonFile(
      withClaimPackageLocalData(state.claimPsbtBundle.revealReadyClaimPackage),
      "gns-claim-" + state.claimPsbtBundle.revealReadyClaimPackage.name + "-reveal-ready.json"
    );
  });

  elements.transferDraftForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const rawName = elements.transferNameInput?.value?.trim() ?? "";
    const newOwnerPubkey = elements.transferNewOwnerPubkeyInput?.value?.trim() ?? "";
    const mode = elements.transferModeInput?.value?.trim() ?? "auto";
    const sellerPayoutAddress = elements.transferSellerPayoutAddressInput?.value?.trim() ?? "";
    const bondAddress = elements.transferBondAddressInput?.value?.trim() ?? "";

    if (rawName.length === 0) {
      renderTransferDraftMessage("Enter the name you want to transfer first.");
      return;
    }

    if (newOwnerPubkey.length === 0) {
      renderTransferDraftMessage("Enter the new owner pubkey in 32-byte hex form.");
      return;
    }

    const normalizedName = rawName.toLowerCase();
    if (elements.transferNameInput) {
      elements.transferNameInput.value = normalizedName;
    }

    renderTransferDraftMessage("Preparing transfer handoff...");

    try {
      const [record, activityPayload] = await Promise.all([
        fetchJson(withBasePath("/api/name/" + encodeURIComponent(normalizedName))),
        fetchJson(withBasePath("/api/name/" + encodeURIComponent(normalizedName) + "/activity?limit=6")).catch(() => ({ activity: [] }))
      ]);

      const draft = buildTransferDraft({
        record,
        activity: Array.isArray(activityPayload.activity) ? activityPayload.activity : [],
        newOwnerPubkey,
        mode,
        sellerPayoutAddress,
        bondAddress
      });
      state.transferDraft = draft;
      renderTransferDraft(draft);
      updateTransferActionStates();
    } catch (error) {
      renderTransferDraftError(error, normalizedName);
    }
  });

  elements.downloadTransferNotesButton?.addEventListener("click", () => {
    if (!state.transferDraft) {
      renderTransferDraftMessage("Prepare a transfer handoff before downloading signer notes.");
      return;
    }

    downloadTextFile(
      buildTransferEssentialsText(state.transferDraft),
      "gns-transfer-" + state.transferDraft.name + "-signer-notes.txt"
    );
  });

  elements.downloadTransferPackageButton?.addEventListener("click", () => {
    if (!state.transferDraft) {
      renderTransferDraftMessage("Prepare a transfer handoff before downloading a transfer package.");
      return;
    }

    if (state.transferDraft.kind === "invalid") {
      renderTransferDraftMessage("Invalid names should be reclaimed, so there is no transfer package to export.");
      return;
    }

    const transferPackage = buildTransferPackage(state.transferDraft);
    downloadJsonFile(transferPackage, "gns-transfer-" + state.transferDraft.name + "-package.json");
  });

  document.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const namesFilterButton = target.closest("[data-names-filter]");
    if (namesFilterButton instanceof HTMLElement) {
      const nextFilter = namesFilterButton.getAttribute("data-names-filter") ?? "all";
      if (state.nameFilter !== nextFilter) {
        state.nameFilter = nextFilter;
        renderNames();
      }
      return;
    }

    const activityFilterButton = target.closest("[data-activity-filter]");
    if (activityFilterButton instanceof HTMLElement) {
      const nextFilter = activityFilterButton.getAttribute("data-activity-filter") ?? "all";
      if (state.activityFilter !== nextFilter) {
        state.activityFilter = nextFilter;
        renderActivity();
      }
      return;
    }

    const txButton = target.closest("[data-view-tx]");
    if (txButton instanceof HTMLElement) {
      const txid = txButton.getAttribute("data-view-tx");
      const panelId = txButton.getAttribute("data-target-panel");

      if (!txid || !panelId) {
        return;
      }

      await openTxProvenance(txid, panelId, txButton);
      return;
    }

    const ownerKeyDownloadButton = target.closest("[data-download-owner-key]");
    if (ownerKeyDownloadButton instanceof HTMLElement) {
      if (!state.claimDraft) {
        renderClaimDraftMessage("Prepare a claim draft before downloading the demo owner key.");
        return;
      }

      const generatedOwnerKey = getGeneratedOwnerKeyForDraft(state.claimDraft);
      if (!generatedOwnerKey) {
        renderClaimDraftMessage("This draft is not using a locally generated demo owner key.");
        return;
      }

      downloadTextFile(
        buildDemoOwnerKeyText(state.claimDraft),
        "gns-" + state.claimDraft.name + "-demo-owner-key.txt"
      );
      return;
    }

    const generatedOwnerKeyDownloadButton = target.closest("[data-download-generated-owner-key]");
    if (generatedOwnerKeyDownloadButton instanceof HTMLElement) {
      if (!state.generatedOwnerKey) {
        renderTestKeyMessage("Generate a test owner key before downloading it.");
        return;
      }

      const nameHint = elements.claimNameInput?.value?.trim() || null;
      downloadTextFile(
        buildGeneratedOwnerKeyText(state.generatedOwnerKey, nameHint),
        "gns-" + (nameHint || "demo-name") + "-demo-owner-key.txt"
      );
      return;
    }

    const revealBackupDownloadButton = target.closest("[data-download-reveal-ready]");
    if (revealBackupDownloadButton instanceof HTMLElement) {
      if (!state.claimPsbtBundle) {
        renderClaimPsbtMessage("Build the Sparrow-native PSBT bundle first.");
        return;
      }

      downloadJsonFile(
        withClaimPackageLocalData(state.claimPsbtBundle.revealReadyClaimPackage),
        "gns-claim-" + state.claimPsbtBundle.revealReadyClaimPackage.name + "-reveal-ready.json"
      );
      return;
    }

    const auctionBidPackageActionButton = target.closest("[data-auction-package-action]");
    if (auctionBidPackageActionButton instanceof HTMLElement) {
      const action = auctionBidPackageActionButton.getAttribute("data-auction-package-action");
      const source = auctionBidPackageActionButton.getAttribute("data-auction-package-source");
      const id = auctionBidPackageActionButton.getAttribute("data-auction-package-id");

      if (!action || !source || !id) {
        return;
      }

      const domKey = buildAuctionPackageDomKey(source, id);
      const bidderInput = document.querySelector('[data-auction-bidder-id="' + cssEscape(id) + '"][data-auction-package-source="' + cssEscape(source) + '"]');
      const amountInput = document.querySelector('[data-auction-bid-amount="' + cssEscape(id) + '"][data-auction-package-source="' + cssEscape(source) + '"]');
      const bidderId = bidderInput instanceof HTMLInputElement ? bidderInput.value.trim() : "";
      const amountSats = amountInput instanceof HTMLInputElement ? amountInput.value.trim() : "";

      if (bidderId.length === 0) {
        setAuctionBidPackageMessage(domKey, "Enter a bidder id first.");
        return;
      }

      if (amountSats.length === 0) {
        setAuctionBidPackageMessage(domKey, "Enter a bid amount in sats first.");
        return;
      }

      const cachedPackage = state.auctionBidPackages.get(domKey);
      const cachedMatchesInputs = cachedPackage
        && String(cachedPackage.bidderId ?? "") === bidderId
        && String(cachedPackage.bidAmountSats ?? "") === amountSats;

      setAuctionBidPackageMessage(
        domKey,
        action === "preview" ? "Building bid package preview..." : "Building bid package..."
      );

      try {
        const pkg = cachedMatchesInputs
          ? cachedPackage
          : await buildAuctionBidPackageForUi({
              source,
              id,
              bidderId,
              bidAmountSats: amountSats
            });
        state.auctionBidPackages.set(domKey, pkg);
        setAuctionBidPackagePreview(
          domKey,
          renderAuctionBidPackagePreview(pkg, source === "experimental" ? "resolver-derived state" : "simulator state")
        );
        setAuctionBidPackageMessage(
          domKey,
          String(pkg.previewSummary ?? "Auction bid package ready.")
        );

        if (action === "download") {
          downloadJsonFile(
            pkg,
            "gns-auction-" + String(pkg.auctionId ?? id) + "-" + String(pkg.bidderId ?? bidderId) + "-bid-package.json"
          );
        }
      } catch (error) {
        state.auctionBidPackages.delete(domKey);
        setAuctionBidPackagePreview(domKey, "");
        setAuctionBidPackageMessage(domKey, describeError(error));
      }
      return;
    }

    const button = target.closest("[data-copy]");
    if (!(button instanceof HTMLElement)) {
      return;
    }

    const copyValue = button.getAttribute("data-copy");
    if (!copyValue) {
      return;
    }

    try {
      await navigator.clipboard.writeText(copyValue);
      const previous = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = previous;
      }, 1200);
    } catch {
      button.textContent = "Copy failed";
    }
  });

  window.addEventListener("popstate", () => {
    const routeName = getInitialDetailName();
    if (!routeName) {
      hideSearchResult();
      return;
    }

    if (elements.nameInput) {
      elements.nameInput.value = routeName;
    }
    if (elements.claimNameInput) {
      elements.claimNameInput.value = routeName;
    }

    void resolveNameLookup(routeName, {
      updateHistory: false
    });
  });
}

async function resolveNameLookup(rawName, options = {}) {
  const normalizedName = rawName.trim().toLowerCase();

  if (normalizedName.length === 0) {
    renderSearchMessage("Enter a name to resolve.");
    return;
  }

  if (elements.nameInput) {
    elements.nameInput.value = normalizedName;
  }
  if (elements.claimNameInput) {
    elements.claimNameInput.value = normalizedName;
  }

  if (options.updateHistory !== false) {
    updateNameDetailHistory(normalizedName);
  }

  renderSearchMessage("Resolving name...");
  state.activeNameActivity = [];

  try {
    const [record, valueRecord, nameActivity] = await Promise.all([
      fetchJson(withBasePath("/api/name/" + encodeURIComponent(normalizedName))),
      fetchJson(withBasePath("/api/name/" + encodeURIComponent(normalizedName) + "/value")).catch((error) => {
        if (error instanceof Error && error.code === "value_not_found") {
          return null;
        }

        throw error;
      }),
      fetchJson(withBasePath("/api/name/" + encodeURIComponent(normalizedName) + "/activity?limit=6"))
        .then((payload) => (Array.isArray(payload.activity) ? payload.activity : []))
        .catch((error) => {
          if (error instanceof Error && error.code === "name_not_found") {
            return [];
          }

          throw error;
        })
    ]);
    state.activeNameActivity = nameActivity;
    renderSearchRecord(record, valueRecord);
  } catch (error) {
    if (error instanceof Error && error.code === "name_not_found") {
      try {
        const plan = await fetchJson(withBasePath("/api/claim-plan/" + encodeURIComponent(normalizedName)));
        state.activeNameActivity = [];
        renderClaimPlan(plan);
        return;
      } catch (planError) {
        renderSearchError(planError);
        return;
      }
    }

    renderSearchError(error);
  }
}

function renderHealth() {
  const health = state.health;
  if (!health) {
    return;
  }

  const stats = health.stats ?? {};
  const claimedNames = state.names.length;
  const immatureNames = state.names.filter((record) => record.status === "immature").length;
  const matureNames = state.names.filter((record) => record.status === "mature").length;
  const invalidNames = state.names.filter((record) => record.status === "invalid").length;
  setText(elements.syncMode, formatSyncMode(health.syncMode ?? "unknown"));
  setText(elements.networkLabel, String(state.config?.networkLabel ?? "Unknown Network"));
  setText(elements.networkSource, String(health.source ?? "unknown"));
  setText(elements.networkChain, String(health.rpcChainInfo?.chain ?? "-"));
  setText(elements.networkResolver, String(health.descriptor ?? "Unknown resolver"));
  setText(elements.trackedNames, String(claimedNames));
  setText(elements.immatureNames, String(immatureNames));
  setText(elements.matureNames, String(matureNames));
  setText(elements.invalidNames, String(invalidNames));
  setText(elements.pendingCommits, String(stats.pendingCommits ?? 0));
  setText(elements.currentHeight, stats.currentHeight == null ? "-" : String(stats.currentHeight));
  setCompactHash(elements.currentBlockHash, stats.currentBlockHash ?? "-");
  setText(
    elements.chainSummary,
    [
      state.config?.networkLabel ?? "Unknown Network",
      "Height " + (stats.currentHeight == null ? "-" : String(stats.currentHeight)),
      String(claimedNames) + " names",
      String(immatureNames) + " settling",
      String(matureNames) + " active",
      String(stats.pendingCommits ?? 0) + " awaiting reveal"
    ].join(" · ")
  );
}

function renderNames() {
  const list = elements.namesList;
  if (!list) {
    return;
  }

  renderNamesFilters();

  if (state.names.length === 0) {
    setText(elements.namesState, "No tracked names are visible from the resolver yet.");
    list.innerHTML = "";
    return;
  }

  const filteredNames = state.names.filter((record) => matchesNameFilter(record, state.nameFilter));
  const totalLabel = state.names.length + " tracked name" + (state.names.length === 1 ? "" : "s");

  if (filteredNames.length === 0) {
    setText(elements.namesState, totalLabel + " · no names match the current filter");
    list.innerHTML = "";
    return;
  }

  setText(
    elements.namesState,
    totalLabel +
      " · showing " +
      filteredNames.length +
      " " +
      (state.nameFilter === "all" ? "across all states" : "in " + formatNameFilterLabel(state.nameFilter).toLowerCase())
  );
  const groups = buildNameGroups(filteredNames);
  list.innerHTML =
    '<div class="name-groups">' +
    groups
      .map((group) => {
        return \`
          <section class="name-group \${group.compact ? "compact-group" : ""}">
            <div class="name-group-head">
              <div class="name-group-copy">
                <h3>\${escapeHtml(group.title)}</h3>
                <p>\${escapeHtml(group.description)}</p>
              </div>
              <span class="name-group-count">\${escapeHtml(String(group.records.length))}</span>
            </div>
            \${group.compact
              ? '<div class="compact-name-list">' + group.records.map((record) => renderCompactNameCard(record)).join("") + "</div>"
              : '<div class="name-group-list">' + group.records.map((record) => renderNameCard(record)).join("") + "</div>"}
          </section>
        \`;
      })
      .join("") +
    "</div>";
}

function renderRecentNames() {
  const list = elements.recentNamesList;
  if (!list) {
    return;
  }

  if (state.names.length === 0) {
    setText(elements.recentNamesState, "No tracked names are visible from the resolver yet.");
    list.innerHTML = "";
    return;
  }

  const recentNames = buildRecentNames(state.names, state.activity).slice(0, 10);
  setText(
    elements.recentNamesState,
    state.names.length +
      " tracked name" +
      (state.names.length === 1 ? "" : "s") +
      " · showing the 10 most recent state changes"
  );
  list.innerHTML = recentNames.map((record) => renderRecentNameRow(record)).join("");
}

function renderActivity() {
  const list = elements.activityList;
  if (!list) {
    return;
  }

  const highlightsContainer = elements.activityHighlights;

  renderActivityFilters();

  if (state.activity.length === 0) {
    setText(elements.activityState, "No recent Global Name System activity is visible from the resolver yet.");
    if (highlightsContainer) {
      highlightsContainer.innerHTML = "";
    }
    list.innerHTML = "";
    return;
  }

  const filteredActivity = state.activity.filter((record) => matchesActivityFilter(record, state.activityFilter));

  if (filteredActivity.length === 0) {
    setText(
      elements.activityState,
      state.activity.length +
        " recent transaction" +
        (state.activity.length === 1 ? "" : "s") +
        " · none match the current filter"
    );
    if (highlightsContainer) {
      highlightsContainer.innerHTML = "";
    }
    list.innerHTML = "";
    return;
  }

  setText(
    elements.activityState,
    state.activity.length +
      " recent transaction" +
      (state.activity.length === 1 ? "" : "s") +
      " · showing " +
      filteredActivity.length +
      " " +
      (state.activityFilter === "all" ? "across all types" : "in " + formatActivityFilterLabel(state.activityFilter).toLowerCase())
  );

  if (highlightsContainer) {
    const highlightedActivity = buildActivityHighlights(filteredActivity);
    highlightsContainer.innerHTML =
      highlightedActivity.length === 0
        ? ""
        : highlightedActivity.map((record, index) => renderActivityHighlightCard(record, index)).join("");
  }

  list.innerHTML = filteredActivity
    .map((record, index) => renderActivityCard(record, "activity", index))
    .join("");
}

function renderRelatedActivitySection(activity, panelPrefix) {
  if (!Array.isArray(activity) || activity.length === 0) {
    return "";
  }

  return \`
    <div class="step-list">
      <p class="step-list-label">Related Activity</p>
      <div class="activity-list">
        \${activity.map((record, index) => renderActivityCard(record, panelPrefix, index)).join("")}
      </div>
    </div>
  \`;
}

function renderNamesFilters() {
  if (!elements.namesFilters) {
    return;
  }

  const options = [
    { value: "all", label: "All" },
    { value: "immature", label: "Settling" },
    { value: "mature", label: "Active" },
    { value: "invalid", label: "Released" }
  ];

  elements.namesFilters.innerHTML = options
    .map((option) => {
      const count =
        option.value === "all"
          ? state.names.length
          : state.names.filter((record) => String(record.status) === option.value).length;

      return (
        '<button type="button" class="filter-chip' +
        (state.nameFilter === option.value ? " active" : "") +
        '" data-names-filter="' +
        escapeHtml(option.value) +
        '">' +
        escapeHtml(option.label) +
        " · " +
        escapeHtml(String(count)) +
        "</button>"
      );
    })
    .join("");
}

function renderActivityFilters() {
  if (!elements.activityFilters) {
    return;
  }

  const options = [
    { value: "all", label: "All" },
    { value: "claims", label: "Claims" },
    { value: "transfers", label: "Transfers" },
    { value: "invalidated", label: "Invalidations" }
  ];

  elements.activityFilters.innerHTML = options
    .map((option) => {
      const count =
        option.value === "all"
          ? state.activity.length
          : state.activity.filter((record) => matchesActivityFilter(record, option.value)).length;

      return (
        '<button type="button" class="filter-chip' +
        (state.activityFilter === option.value ? " active" : "") +
        '" data-activity-filter="' +
        escapeHtml(option.value) +
        '">' +
        escapeHtml(option.label) +
        " · " +
        escapeHtml(String(count)) +
        "</button>"
      );
    })
    .join("");
}

function renderActivityCard(record, panelPrefix, index) {
  const panelId = panelPrefix + "TxPanel-" + index + "-" + record.txid;
  const affectedNames = summarizeActivityNames(record);
  const eventBadges = summarizeActivityBadges(record);

  return \`
    <article class="activity-card">
      <div class="result-title">
        <h3>\${escapeHtml(summarizeActivityTitle(record))}</h3>
        <span class="status-pill \${escapeHtml(activityStatusPill(record))}">\${escapeHtml(activityStatusLabel(record))}</span>
      </div>
      <p class="pending-meta">\${escapeHtml(summarizeActivityCopy(record))}</p>
      <div class="activity-badge-row">
        \${eventBadges.map((badge) => '<span class="activity-badge' + (badge.kind === "invalidated" ? ' invalidated' : "") + '">' + escapeHtml(badge.label) + "</span>").join("")}
      </div>
      <div class="result-grid">
        <div class="result-item">
          <label>Block Height</label>
          <p class="field-value">\${escapeHtml(String(record.blockHeight))}</p>
        </div>
        <div class="result-item">
          <label>Affected Names</label>
          <p class="field-value">\${escapeHtml(affectedNames.length === 0 ? "None" : affectedNames.join(", "))}</p>
        </div>
        <div class="result-item">
          <label>Txid</label>
          \${renderCopyableCode(record.txid)}
        </div>
        <div class="result-item">
          <label>Inputs / Outputs</label>
          <p class="field-value">\${escapeHtml(String((record.inputs ?? []).length) + " in · " + String((record.outputs ?? []).length) + " out")}</p>
        </div>
      </div>
      <div class="step-list">
        <p class="step-list-label">Transaction Provenance</p>
        <div class="tx-link-list">
          <button type="button" class="tx-inspect-button" data-view-tx="\${escapeHtml(record.txid)}" data-target-panel="\${escapeHtml(panelId)}">Inspect Transaction</button>
        </div>
        <div id="\${escapeHtml(panelId)}" class="tx-provenance-panel empty"></div>
      </div>
    </article>
  \`;
}

function buildActivityHighlights(records) {
  return [...records]
    .filter((record) => activityPriority(record) > 0)
    .sort((left, right) => {
      const priorityDiff = activityPriority(right) - activityPriority(left);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return Number(right.blockHeight ?? 0) - Number(left.blockHeight ?? 0);
    })
    .slice(0, 3);
}

function renderActivityHighlightCard(record, index) {
  const panelId = "activityHighlightTxPanel-" + index + "-" + record.txid;
  const names = summarizeActivityNames(record);
  const primaryName = names[0] ?? null;
  const highlightLabel = activityHighlightLabel(record);

  return \`
    <article class="guide-card">
      <p class="step-list-label">Highlight</p>
      <h3>\${escapeHtml(highlightLabel)}</h3>
      <p class="field-value">\${escapeHtml(summarizeActivityCopy(record))}</p>
      <div class="activity-badge-row">
        \${summarizeActivityBadges(record)
          .map((badge) => '<span class="activity-badge' + (badge.kind === "invalidated" ? ' invalidated' : "") + '">' + escapeHtml(badge.label) + "</span>")
          .join("")}
      </div>
      <div class="result-grid">
        <div class="result-item">
          <label>Block Height</label>
          <p class="field-value">\${escapeHtml(String(record.blockHeight))}</p>
        </div>
        <div class="result-item">
          <label>Affected Names</label>
          <p class="field-value">\${escapeHtml(names.length === 0 ? "None" : names.join(", "))}</p>
        </div>
      </div>
      <div class="hero-cta-row">
        \${primaryName ? '<a class="action-link secondary" href="' + escapeHtml(buildNameDetailPath(primaryName)) + '">Open ' + escapeHtml(primaryName) + '</a>' : ""}
        <button type="button" class="tx-inspect-button" data-view-tx="\${escapeHtml(record.txid)}" data-target-panel="\${escapeHtml(panelId)}">Inspect transaction</button>
      </div>
      <div id="\${escapeHtml(panelId)}" class="tx-provenance-panel empty"></div>
    </article>
  \`;
}

function renderPendingCommits() {
  const list = elements.pendingList;
  if (!list) {
    return;
  }

  if (state.pendingCommits.length === 0) {
    setText(elements.pendingState, "No pending commits are currently waiting for reveal.");
    list.innerHTML = "";
    return;
  }

  const currentHeight = state.health?.stats?.currentHeight ?? null;
  setText(
    elements.pendingState,
    state.pendingCommits.length + " pending commit" + (state.pendingCommits.length === 1 ? "" : "s")
  );
  list.innerHTML = state.pendingCommits
    .map((record) => {
      const panelId = "pendingTxPanel-" + record.txid;
      const blocksLeft =
        currentHeight == null ? null : Number(record.revealDeadlineHeight) - Number(currentHeight);

      return \`
        <article class="pending-card">
          <div class="result-title">
            <h3>Pending Commit</h3>
            <span class="status-pill pending">awaiting reveal</span>
          </div>
          <div class="result-grid">
            <div class="result-item">
              <label>Commit Txid</label>
              \${renderCopyableCode(record.txid)}
            </div>
            <div class="result-item">
              <label>Owner Pubkey</label>
              \${renderCopyableCode(record.ownerPubkey)}
            </div>
            <div class="result-item">
              <label>Commit Height</label>
              <p class="field-value">\${escapeHtml(String(record.blockHeight))}</p>
            </div>
            <div class="result-item">
              <label>Reveal Deadline</label>
              <p class="field-value">
                \${escapeHtml(String(record.revealDeadlineHeight))}
                \${blocksLeft === null ? "" : '<span class="inline-note">(' + escapeHtml(String(blocksLeft)) + ' blocks left)</span>'}
              </p>
            </div>
            <div class="result-item">
              <label>Bond Vout</label>
              <p class="field-value">\${escapeHtml(String(record.bondVout))}</p>
            </div>
            <div class="result-item">
              <label>Bond Amount</label>
              <p class="field-value">\${escapeHtml(record.bondValueSats == null ? "Unknown" : formatSats(record.bondValueSats))}</p>
            </div>
          </div>
          <p class="pending-meta">
            The name is still hidden at the commit stage. It only becomes public when the reveal is broadcast within the allowed window.
          </p>
          <div class="step-list">
            <p class="step-list-label">Transaction Provenance</p>
            <div class="tx-link-list">
              <button type="button" class="tx-inspect-button" data-view-tx="\${escapeHtml(record.txid)}" data-target-panel="\${escapeHtml(panelId)}">Commit Tx</button>
            </div>
            <div id="\${escapeHtml(panelId)}" class="tx-provenance-panel empty"></div>
          </div>
        </article>
      \`;
    })
    .join("");
}

function summarizeActivityTitle(record) {
  const eventTypes = uniqueStrings((record.events ?? []).map((event) => String(event.typeName ?? "")).filter(Boolean));

  if ((record.invalidatedNames ?? []).length > 0 && eventTypes.length === 0) {
    return "Bond Released";
  }

  if (eventTypes.length === 0) {
    return "Recorded Activity";
  }

  return eventTypes.join(" + ");
}

function summarizeActivityCopy(record) {
  const names = summarizeActivityNames(record);

  if ((record.invalidatedNames ?? []).length > 0 && names.length > 0) {
    return "This transaction touched " + names.join(", ") + " and released at least one active name state.";
  }

  if ((record.invalidatedNames ?? []).length > 0) {
    return "This transaction released an active name state.";
  }

  if (names.length > 0) {
    return "This transaction affected " + names.join(", ") + ".";
  }

  return "This transaction contains parsed Global Name System activity.";
}

function summarizeActivityNames(record) {
  return uniqueStrings(
    [
      ...(record.events ?? []).map((event) => event.affectedName).filter(Boolean),
      ...((record.invalidatedNames ?? []).filter(Boolean))
    ].map((value) => String(value))
  );
}

function summarizeActivityBadges(record) {
  const badges = [];
  const eventTypes = uniqueStrings((record.events ?? []).map((event) => String(event.typeName ?? "")).filter(Boolean));

  for (const typeName of eventTypes) {
    badges.push({ label: typeName, kind: "event" });
  }

  if ((record.invalidatedNames ?? []).length > 0) {
    badges.push({ label: "RELEASED", kind: "invalidated" });
  }

  return badges;
}

function activityPriority(record) {
  if ((record.invalidatedNames ?? []).length > 0) {
    return 4;
  }

  const eventTypes = uniqueStrings((record.events ?? []).map((event) => String(event.typeName ?? "")).filter(Boolean));

  if (eventTypes.includes("TRANSFER")) {
    return 3;
  }

  if (eventTypes.includes("REVEAL") || eventTypes.includes("BATCH_REVEAL")) {
    return 2;
  }

  if (eventTypes.includes("COMMIT") || eventTypes.includes("BATCH_ANCHOR")) {
    return 1;
  }

  return 0;
}

function activityHighlightLabel(record) {
  if ((record.invalidatedNames ?? []).length > 0) {
    return "Release";
  }

  const eventTypes = uniqueStrings((record.events ?? []).map((event) => String(event.typeName ?? "")).filter(Boolean));

  if (eventTypes.includes("TRANSFER")) {
    return "Transfer";
  }

  if (eventTypes.includes("REVEAL") || eventTypes.includes("BATCH_REVEAL")) {
    return "Claim Revealed";
  }

  if (eventTypes.includes("BATCH_ANCHOR")) {
    return "Batch Commit Broadcast";
  }

  if (eventTypes.includes("COMMIT")) {
    return "Commit Broadcast";
  }

  return summarizeActivityTitle(record);
}

function activityStatusLabel(record) {
  if ((record.invalidatedNames ?? []).length > 0) {
    return "released";
  }

  const appliedEvents = (record.events ?? []).filter((event) => event.validationStatus === "applied");
  if (appliedEvents.length === 0) {
    return "ignored";
  }

  const firstType = String(appliedEvents[0]?.typeName ?? "").toUpperCase();

  if (firstType === "BATCH_ANCHOR") {
    return "batch_anchor";
  }

  if (firstType === "BATCH_REVEAL") {
    return "batch_reveal";
  }

  return String(appliedEvents[0]?.typeName ?? "activity").toLowerCase();
}

function activityStatusPill(record) {
  if ((record.invalidatedNames ?? []).length > 0) {
    return "invalid";
  }

  const appliedEvents = (record.events ?? []).filter((event) => event.validationStatus === "applied");
  const firstType = String(appliedEvents[0]?.typeName ?? "").toUpperCase();

  if (firstType === "REVEAL") {
    return "immature";
  }

  if (firstType === "BATCH_REVEAL") {
    return "immature";
  }

  if (firstType === "TRANSFER") {
    return "mature";
  }

  if (firstType === "BATCH_ANCHOR") {
    return "pending";
  }

  if (firstType === "COMMIT") {
    return "pending";
  }

  return "available";
}

function renderSearchRecord(record, valueRecord) {
  setDocumentTitle(record.name, record.status);

  if (elements.claimNameInput) {
    elements.claimNameInput.value = record.name;
  }

  if (!elements.searchResult) {
    return;
  }

  const panelId = "searchTxPanel";
  elements.searchResult.hidden = false;
  setSearchResultVariant(record.status);
  if (isNameDetailPage()) {
    elements.searchResult.innerHTML = renderNameDetailRecord(record, valueRecord, panelId);
    return;
  }

  elements.searchResult.innerHTML = \`
    <div class="search-state-banner \${escapeHtml(record.status)}">
      <p class="search-state-label">Current State</p>
      <h4 class="search-state-title">\${escapeHtml(searchStateTitle(record.status))}</h4>
      <p class="search-state-copy">\${escapeHtml(searchOutcomeSummary(record.status))}</p>
    </div>
    <div class="result-title">
      <h3>\${escapeHtml(record.name)}</h3>
      <span class="status-pill \${escapeHtml(record.status)}">\${escapeHtml(formatStateLabel(record.status))}</span>
    </div>
    <p class="result-meta">\${escapeHtml(renderLookupMeta(record, valueRecord, state.health?.stats?.currentHeight ?? null))}</p>
    <div class="lookup-facts">
      \${renderLookupFact("Settlement", detailSettlementValue(record, state.health?.stats?.currentHeight ?? null))}
      \${renderLookupFact("Required bond", formatSats(record.requiredBondSats))}
      \${renderLookupFact("Off-chain data", valueRecord ? "Published" : "Not published")}
    </div>
    <p class="lookup-note">\${escapeHtml(primaryLookupNote(record, valueRecord, state.health?.stats?.currentHeight ?? null))}</p>
    \${String(record.status) === "invalid" ? \`<p class="lookup-note lookup-note-warning">\${escapeHtml(invalidLookupWarning())}</p>\` : ""}
    <div class="hero-cta-row lookup-result-actions">
      \${String(record.status) === "invalid"
        ? \`<a class="action-link" href="\${escapeHtml(buildClaimPrepPath(record.name))}">Prepare a reclaim</a>\`
        : \`<a class="action-link" href="\${escapeHtml(buildValuePublishPath(record.name))}">Publish value</a>
           <a class="action-link secondary" href="\${escapeHtml(buildTransferPrepPath(record.name))}">Prepare transfer</a>\`}
      <a class="action-link secondary" href="\${escapeHtml(buildNameDetailPath(record.name))}">Open detail page</a>
    </div>
    <details class="detail-technical lookup-technical">
      <summary>More details</summary>
      <div class="detail-technical-body">
        <div class="result-grid">
          <div class="result-item">
            <label>Owner Pubkey</label>
            \${renderCopyableCode(record.currentOwnerPubkey)}
          </div>
          <div class="result-item">
            <label>Claim Height</label>
            <p class="field-value">\${escapeHtml(String(record.claimHeight))}</p>
          </div>
          <div class="result-item">
            <label>Maturity Height</label>
            <p class="field-value">\${escapeHtml(String(record.maturityHeight))}</p>
          </div>
          <div class="result-item">
            <label>Bond Amount</label>
            <p class="field-value">\${escapeHtml(formatSats(record.currentBondValueSats))}</p>
          </div>
        </div>
      </div>
    </details>
  \`;
}

function renderNameDetailRecord(record, valueRecord, panelId) {
  const currentHeight = state.health?.stats?.currentHeight ?? null;

  return \`
    <div class="search-state-banner \${escapeHtml(record.status)}">
      <p class="search-state-label">Current State</p>
      <h4 class="search-state-title">\${escapeHtml(searchStateTitle(record.status))}</h4>
      <p class="search-state-copy">\${escapeHtml(searchOutcomeSummary(record.status))}</p>
    </div>
    <div class="result-title">
      <h3>\${escapeHtml(record.name)}</h3>
      <span class="status-pill \${escapeHtml(record.status)}">\${escapeHtml(formatStateLabel(record.status))}</span>
    </div>
    <p class="result-meta detail-meta-row">\${renderDetailPageMeta(record, valueRecord, currentHeight)}</p>
    <div class="detail-actions-row">
      <a class="action-link secondary" href="\${escapeHtml(withBasePath("/"))}">Back to explorer</a>
      \${String(record.status) === "invalid"
        ? \`<a class="action-link" href="\${escapeHtml(buildClaimPrepPath(record.name))}">Prepare a reclaim</a>\`
        : \`<a class="action-link" href="\${escapeHtml(buildValuePublishPath(record.name))}">Publish value</a>
           <a class="action-link secondary" href="\${escapeHtml(buildTransferPrepPath(record.name))}">Prepare a transfer</a>
           <a class="action-link secondary" href="\${escapeHtml(withBasePath("/claim"))}">Prepare a new claim</a>\`}
    </div>
    \${renderInvalidationSummary(record, state.activeNameActivity, panelId)}
    <div class="detail-overview-grid">
      \${renderDetailSummaryCard("Current owner", truncateMiddle(record.currentOwnerPubkey, 16, 10), ownerSummaryCopy(record))}
      \${renderDetailSummaryCard("Settlement", detailSettlementValue(record, currentHeight), detailSettlementCopy(record, currentHeight))}
      \${renderDetailSummaryCard("Off-chain data", detailValueValue(valueRecord), detailValueCopy(valueRecord))}
    </div>
    \${renderTimelineSummary(record, valueRecord, state.activeNameActivity, currentHeight)}
    \${renderOffChainDataSection(valueRecord)}
    <div class="step-list">
      <p class="step-list-label">What Happens Next</p>
      <p class="field-value">\${escapeHtml(searchOutcomeSummary(record.status))}</p>
      <ol>
        \${searchOutcomeSteps(record.status, record).map((step) => \`<li>\${escapeHtml(step)}</li>\`).join("")}
      </ol>
    </div>
    \${renderRelatedActivitySection(state.activeNameActivity, "searchRelatedActivity")}
    <details class="step-list detail-technical">
      <summary>Technical details</summary>
      <div class="detail-technical-body">
        <div class="result-grid">
          <div class="result-item">
            <label>Owner Pubkey</label>
            \${renderCopyableCode(record.currentOwnerPubkey)}
          </div>
          <div class="result-item">
            <label>Claim Height</label>
            <p class="field-value">\${escapeHtml(String(record.claimHeight))}</p>
          </div>
          <div class="result-item">
            <label>Maturity Height</label>
            <p class="field-value">\${escapeHtml(String(record.maturityHeight))}</p>
          </div>
          <div class="result-item">
            <label>Required Bond</label>
            <p class="field-value">\${escapeHtml(formatSats(record.requiredBondSats))}</p>
          </div>
          <div class="result-item">
            <label>Commit Tx</label>
            \${renderCopyableCode(record.claimCommitTxid)}
          </div>
          <div class="result-item">
            <label>Reveal Tx</label>
            \${renderCopyableCode(record.claimRevealTxid)}
          </div>
          <div class="result-item">
            <label>Bond Outpoint</label>
            <p class="field-value">\${escapeHtml(record.currentBondTxid)}:\${escapeHtml(String(record.currentBondVout))}</p>
          </div>
          <div class="result-item">
            <label>Bond Amount</label>
            <p class="field-value">\${escapeHtml(formatSats(record.currentBondValueSats))}</p>
          </div>
        </div>
        <div class="step-list">
          <p class="step-list-label">Transaction Provenance</p>
          \${renderTxButtonList(record, panelId, state.activeNameActivity)}
          <div id="\${escapeHtml(panelId)}" class="tx-provenance-panel empty"></div>
        </div>
      </div>
    </details>
  \`;
}

function renderSearchMessage(message) {
  setDocumentTitle(null, null);

  if (!elements.searchResult) {
    return;
  }

  elements.searchResult.hidden = false;
  setSearchResultVariant(null);
  elements.searchResult.classList.add("empty");
  elements.searchResult.textContent = message;
}

function hideSearchResult() {
  setDocumentTitle(null, null);

  if (!elements.searchResult) {
    return;
  }

  setSearchResultVariant(null);
  elements.searchResult.classList.add("empty");
  elements.searchResult.textContent = "";
  elements.searchResult.hidden = true;
}

function renderClaimDraftMessage(message) {
  if (!elements.claimDraftResult) {
    return;
  }

  elements.claimDraftResult.classList.add("empty");
  elements.claimDraftResult.textContent = message;
}

function renderPrivateFundingMessage(message) {
  if (!elements.privateFundingResult) {
    return;
  }

  elements.privateFundingResult.classList.add("empty");
  elements.privateFundingResult.textContent = message;
}

function renderTransferDraftMessage(message) {
  if (!elements.transferDraftResult) {
    return;
  }

  elements.transferDraftResult.classList.add("empty");
  elements.transferDraftResult.textContent = message;
  updateTransferActionStates();
}

function renderTestKeyMessage(message) {
  if (!elements.testKeyResult) {
    return;
  }

  elements.testKeyResult.classList.add("empty");
  elements.testKeyResult.textContent = message;
}

function renderSearchError(error) {
  const message = error instanceof Error ? error.message : "Unable to resolve the requested name.";
  renderSearchMessage(message);
}

function renderPrivateFundingError(error) {
  const message = error instanceof Error ? error.message : "Unable to fund that private signet address.";
  renderPrivateFundingMessage(message);
}

function renderClaimDraftError(error) {
  const message = error instanceof Error ? error.message : "Unable to prepare the claim draft.";
  state.claimDraft = null;
  renderClaimDraftMessage(message);
  updateClaimActionStates();
}

function renderTransferDraftError(error, name) {
  state.transferDraft = null;

  if (error && typeof error === "object" && "status" in error && error.status === 404) {
    renderTransferDraftMessage(
      'This name is not currently claimed in the resolver view. Search it first, then use claim prep if you want to register "' +
        String(name) +
        '".'
    );
    return;
  }

  const message = error instanceof Error ? error.message : "Unable to prepare the transfer handoff.";
  renderTransferDraftMessage(message);
  updateTransferActionStates();
}

function renderTestKeyError(error) {
  const message = error instanceof Error ? error.message : "Unable to generate a test owner key.";
  renderTestKeyMessage(message);
}

function renderBootError(error) {
  const message =
    error instanceof Error
      ? error.message
      : "Unable to reach the resolver.";

  setText(elements.syncMode, "Unavailable");
  setText(elements.networkSource, "Unavailable");
  setText(elements.networkChain, "Unavailable");
  setText(elements.networkResolver, message);
  setText(elements.pendingState, "Pending commit data could not be loaded.");
  setText(elements.activityState, "Recent activity could not be loaded.");
  setText(elements.namesState, "Resolver data could not be loaded.");
  renderSearchMessage("Resolver data is unavailable right now.");
}

async function fetchJson(path) {
  return requestJson(path);
}

async function postJson(path, body) {
  return requestJson(path, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function requestJson(path, init) {
  const response = await fetch(path, init);
  const payload = await response.json();

  if (!response.ok) {
    const error = new Error(payload.message ?? payload.error ?? "Request failed");
    error.code = payload.error ?? "request_failed";
    error.status = response.status;
    throw error;
  }

  return payload;
}

function describeError(error) {
  return error instanceof Error ? error.message : "Request failed.";
}

function withBasePath(path) {
  if (!BASE_PATH) {
    return path;
  }

  if (path === "/") {
    return BASE_PATH;
  }

  return BASE_PATH + path;
}

function getAuctionLabPolicyOverridesFromLocation() {
  const currentUrl = new URL(window.location.href);
  const rawNoBidReleaseBlocks = currentUrl.searchParams.get("auctionNoBidReleaseBlocks");

  if (rawNoBidReleaseBlocks === null || rawNoBidReleaseBlocks.trim() === "") {
    return {
      noBidReleaseBlocks: null
    };
  }

  const parsed = Number.parseInt(rawNoBidReleaseBlocks, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return {
      noBidReleaseBlocks: null
    };
  }

  return {
    noBidReleaseBlocks: parsed
  };
}

function readAuctionLabPolicyOverridesFromControls() {
  if (!(elements.auctionNoBidReleaseBlocksInput instanceof HTMLInputElement)) {
    return {
      noBidReleaseBlocks: null
    };
  }

  const rawValue = elements.auctionNoBidReleaseBlocksInput.value.trim();
  if (rawValue === "") {
    return {
      noBidReleaseBlocks: null
    };
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error("No-bid release blocks must be a non-negative integer.");
  }

  return {
    noBidReleaseBlocks: parsed
  };
}

function syncAuctionPolicyControlsFromState() {
  if (!(elements.auctionNoBidReleaseBlocksInput instanceof HTMLInputElement)) {
    return;
  }

  const activeOverrides = getAuctionLabPolicyOverridesFromLocation();
  const fallbackValue =
    state.auctionLab?.policy?.auction?.noBidReleaseBlocks == null
      ? ""
      : String(state.auctionLab.policy.auction.noBidReleaseBlocks);

  elements.auctionNoBidReleaseBlocksInput.value =
    activeOverrides.noBidReleaseBlocks == null ? fallbackValue : String(activeOverrides.noBidReleaseBlocks);
}

function setAuctionPolicyControlsMessage(message) {
  setText(elements.auctionPolicyControlsResult, message);
}

function getAuctionLabApiPath() {
  const query = new URLSearchParams();
  const activeOverrides = getAuctionLabPolicyOverridesFromLocation();

  if (activeOverrides.noBidReleaseBlocks != null) {
    query.set("noBidReleaseBlocks", String(activeOverrides.noBidReleaseBlocks));
  }

  const queryString = query.toString();
  return withBasePath("/api/auctions" + (queryString ? "?" + queryString : ""));
}

function applyAuctionLabPolicyOverridesToHistory(overrides) {
  const currentUrl = new URL(window.location.href);

  if (overrides.noBidReleaseBlocks == null) {
    currentUrl.searchParams.delete("auctionNoBidReleaseBlocks");
  } else {
    currentUrl.searchParams.set("auctionNoBidReleaseBlocks", String(overrides.noBidReleaseBlocks));
  }

  const nextPath =
    currentUrl.pathname
    + (currentUrl.searchParams.toString() ? "?" + currentUrl.searchParams.toString() : "")
    + currentUrl.hash;
  window.history.replaceState({}, "", nextPath);
}

async function reloadAuctionLab() {
  state.auctionLab = await fetchJson(getAuctionLabApiPath());
  renderAuctionLab();
}

function cssEscape(value) {
  if (typeof window.CSS !== "undefined" && typeof window.CSS.escape === "function") {
    return window.CSS.escape(String(value));
  }

  return String(value).replace(/["\\\\]/g, "\\\\$&");
}

function getInitialDetailName() {
  const currentUrl = new URL(window.location.href);
  const pathname = stripClientBasePath(currentUrl.pathname);

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 2 || segments[0] !== "names" || !segments[1]) {
    return null;
  }

  try {
    return decodeURIComponent(segments[1]).trim().toLowerCase();
  } catch {
    return null;
  }
}

function getInitialClaimName() {
  const currentUrl = new URL(window.location.href);
  const prefill = currentUrl.searchParams.get("name");

  if (!prefill) {
    return null;
  }

  return prefill.trim().toLowerCase() || null;
}

function getInitialTransferName() {
  const currentUrl = new URL(window.location.href);
  const prefill = currentUrl.searchParams.get("name");

  if (!prefill) {
    return null;
  }

  return prefill.trim().toLowerCase() || null;
}

function isClaimPrepPage() {
  const currentUrl = new URL(window.location.href);
  const pathname = stripClientBasePath(currentUrl.pathname);
  return pathname === "/claim" || pathname === "/claim/";
}

function isAuctionsPage() {
  const currentUrl = new URL(window.location.href);
  const pathname = stripClientBasePath(currentUrl.pathname);
  return pathname === "/auctions" || pathname === "/auctions/";
}

function isTransferPrepPage() {
  const currentUrl = new URL(window.location.href);
  const pathname = stripClientBasePath(currentUrl.pathname);
  return pathname === "/transfer" || pathname === "/transfer/";
}

function isNameDetailPage() {
  return getInitialDetailName() !== null;
}

function stripClientBasePath(pathname) {
  if (!BASE_PATH) {
    return pathname;
  }

  if (pathname === BASE_PATH) {
    return "/";
  }

  if (pathname.startsWith(BASE_PATH + "/")) {
    return pathname.slice(BASE_PATH.length);
  }

  return pathname;
}

function buildNameDetailPath(name, configuredBasePath = BASE_PATH) {
  return withBasePath("/names/" + encodeURIComponent(String(name).trim().toLowerCase()), configuredBasePath);
}

function buildClaimPrepPath(name, configuredBasePath = BASE_PATH) {
  const normalizedName = String(name ?? "").trim().toLowerCase();
  const baseClaimPath = withBasePath("/claim", configuredBasePath);
  return normalizedName === "" ? baseClaimPath : baseClaimPath + "?name=" + encodeURIComponent(normalizedName);
}

function buildTransferPrepPath(name, configuredBasePath = BASE_PATH) {
  const normalizedName = String(name ?? "").trim().toLowerCase();
  const baseTransferPath = withBasePath("/transfer", configuredBasePath);
  return normalizedName === "" ? baseTransferPath : baseTransferPath + "?name=" + encodeURIComponent(normalizedName);
}

function buildValuePublishPath(name, configuredBasePath = BASE_PATH) {
  const normalizedName = String(name ?? "").trim().toLowerCase();
  const baseValuesPath = withBasePath("/values", configuredBasePath);
  return normalizedName === "" ? baseValuesPath : baseValuesPath + "?name=" + encodeURIComponent(normalizedName);
}

function updateNameDetailHistory(name) {
  const targetPath = buildNameDetailPath(name);

  if (window.location.pathname === targetPath) {
    return;
  }

  window.history.pushState({ name }, "", targetPath);
}

function setDocumentTitle(name, status) {
  if (!name) {
    document.title = PRODUCT_LABEL + " Explorer";
    return;
  }

  const statusSuffix = status ? " · " + formatStateLabel(status) : "";
  document.title = String(name) + statusSuffix + " · " + PRODUCT_LABEL;
}

function setText(node, value) {
  if (node) {
    node.textContent = value;
  }
}

function setCompactHash(node, value) {
  if (!node) {
    return;
  }

  node.textContent = truncateMiddle(value, 14, 8);
  node.title = value;
}

function formatSyncMode(value) {
  switch (value) {
    case "fixture":
      return "Fixture";
    case "rpc-oneshot":
      return "RPC One-Shot";
    case "rpc-polling":
      return "RPC Polling";
    default:
      return String(value);
  }
}

function formatLiveSmokeStatus(value) {
  switch (value) {
    case "awaiting_funds":
      return "Awaiting Funds";
    case "claim_broadcast":
      return "Claim Broadcast";
    case "reveal_broadcast":
      return "Reveal Broadcast";
    case "claimed":
      return "Claimed";
    case "value_published":
      return "Value Published";
    case "transferred":
      return "Transferred";
    case "name_unavailable":
      return "Name Unavailable";
    case "unavailable":
      return "Unavailable";
    case "error":
      return "Error";
    default:
      return String(value).replaceAll("_", " ");
  }
}

function mapLiveSmokeStatusPill(value) {
  switch (value) {
    case "awaiting_funds":
      return "pending";
    case "claim_broadcast":
    case "reveal_broadcast":
      return "pending";
    case "claimed":
    case "value_published":
      return "immature";
    case "transferred":
      return "mature";
    case "name_unavailable":
    case "error":
      return "invalid";
    case "unavailable":
      return "pending";
    default:
      return "pending";
  }
}

function formatSats(value) {
  const sats = BigInt(value);
  return "₿" + sats.toLocaleString("en-US") + " (" + formatBtcDecimal(sats) + " BTC)";
}

function formatStateLabel(status) {
  switch (String(status)) {
    case "pending":
      return "Awaiting Reveal";
    case "immature":
      return "Settling";
    case "mature":
      return "Active";
    case "invalid":
      return "Released";
    default:
      return String(status);
  }
}

function formatCompactSats(value) {
  const sats = BigInt(value);
  if (sats >= 1000000000n) {
    return "₿" + (Number(sats) / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
  }
  if (sats >= 1000000n) {
    return "₿" + (Number(sats) / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (sats >= 1000n) {
    return "₿" + (Number(sats) / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }

  return "₿" + sats.toString();
}

function formatBtcDecimal(sats) {
  const whole = sats / 100000000n;
  const fractional = (sats % 100000000n).toString().padStart(8, "0").replace(/0+$/g, "");
  return fractional === "" ? whole.toString() : whole.toString() + "." + fractional;
}

function buildNameGroups(names) {
  const orderedNames = [...names].sort((left, right) => {
    const leftOrder = statusSortOrder(left.status);
    const rightOrder = statusSortOrder(right.status);
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(left.name).localeCompare(String(right.name));
  });

  const grouped = new Map();
  for (const record of orderedNames) {
    const status = String(record.status);
    const records = grouped.get(status) ?? [];
    records.push(record);
    grouped.set(status, records);
  }

  return Array.from(grouped.entries()).map(([status, records]) => ({
    status,
    records,
    title: statusGroupTitle(status),
    description: statusGroupDescription(status),
    compact: statusGroupCompact(status)
  }));
}

function buildRecentNames(names, activity) {
  return [...names].sort((left, right) => {
    const leftRecency = recentNameRecency(left, activity);
    const rightRecency = recentNameRecency(right, activity);

    if (leftRecency.height !== rightRecency.height) {
      return rightRecency.height - leftRecency.height;
    }

    if (leftRecency.kind !== rightRecency.kind) {
      return leftRecency.kind.localeCompare(rightRecency.kind);
    }

    return String(left.name).localeCompare(String(right.name));
  });
}

function renderNameCard(record) {
  const panelId = "nameTxPanel-" + record.name;

  return \`
    <details class="name-card">
      <summary>
        <div class="name-summary">
          <div class="name-title">
            <h3>\${escapeHtml(record.name)}</h3>
            <span class="status-pill \${escapeHtml(record.status)}">\${escapeHtml(formatStateLabel(record.status))}</span>
          </div>
          <div class="name-summary-meta">
            <span>Owner \${escapeHtml(truncateMiddle(record.currentOwnerPubkey, 10, 6))}</span>
            <span>Claim height \${escapeHtml(String(record.claimHeight))}</span>
            <span>Bond \${escapeHtml(formatCompactSats(record.requiredBondSats))}</span>
          </div>
        </div>
      </summary>
      <div class="name-card-body">
        <p class="result-meta">
          \${renderDetailLink(record.name, "Open detail page")}
          \${String(record.status) === "invalid" ? "" : " · " + renderValuePublishLink(record.name, "Publish value") + " · " + renderTransferPrepLink(record.name, "Prepare transfer")}
        </p>
        <div class="name-grid">
          <div class="name-item">
            <label>Owner Pubkey</label>
            \${renderCopyableCode(record.currentOwnerPubkey)}
          </div>
          <div class="name-item">
            <label>Claim Height</label>
            <p class="field-value">\${escapeHtml(String(record.claimHeight))}</p>
          </div>
          <div class="name-item">
            <label>Maturity Height</label>
            <p class="field-value">\${escapeHtml(String(record.maturityHeight))}</p>
          </div>
          <div class="name-item">
            <label>Required Bond</label>
            <p class="field-value">\${escapeHtml(formatSats(record.requiredBondSats))}</p>
          </div>
          <div class="name-item">
            <label>Bond Outpoint</label>
            <p class="field-value">\${escapeHtml(record.currentBondTxid)}:\${escapeHtml(String(record.currentBondVout))}</p>
          </div>
          <div class="name-item">
            <label>Bond Amount</label>
            <p class="field-value">\${escapeHtml(formatSats(record.currentBondValueSats))}</p>
          </div>
        </div>
        <div class="step-list">
          <p class="step-list-label">What Happens Next</p>
          <p class="field-value">\${escapeHtml(searchOutcomeSummary(record.status))}</p>
          <ol>
            \${searchOutcomeSteps(record.status, record).map((step) => \`<li>\${escapeHtml(step)}</li>\`).join("")}
          </ol>
        </div>
        <div class="step-list">
          <p class="step-list-label">Transaction Provenance</p>
          \${renderTxButtonList(record, panelId)}
          <div id="\${escapeHtml(panelId)}" class="tx-provenance-panel empty"></div>
        </div>
      </div>
    </details>
  \`;
}

function renderCompactNameCard(record) {
  const panelId = "compactNameTxPanel-" + record.name;

  return \`
    <details class="compact-name-card">
      <summary>
        <div class="compact-name-summary">
          <div class="name-title">
            <h3>\${escapeHtml(record.name)}</h3>
            <span class="status-pill \${escapeHtml(record.status)}">\${escapeHtml(formatStateLabel(record.status))}</span>
          </div>
          <div class="compact-name-meta">
            <span>Owner \${escapeHtml(truncateMiddle(record.currentOwnerPubkey, 10, 6))}</span>
            <span>Claim \${escapeHtml(String(record.claimHeight))}</span>
            <span>Bond \${escapeHtml(formatCompactSats(record.requiredBondSats))}</span>
          </div>
        </div>
      </summary>
      <div class="name-card-body">
        <p class="result-meta">
          \${renderDetailLink(record.name, "Open detail page")}
          \${String(record.status) === "invalid" ? "" : " · " + renderValuePublishLink(record.name, "Publish value")}
        </p>
        <div class="name-grid">
          <div class="name-item">
            <label>Owner Pubkey</label>
            \${renderCopyableCode(record.currentOwnerPubkey)}
          </div>
          <div class="name-item">
            <label>Claim Height</label>
            <p class="field-value">\${escapeHtml(String(record.claimHeight))}</p>
          </div>
          <div class="name-item">
            <label>Maturity Height</label>
            <p class="field-value">\${escapeHtml(String(record.maturityHeight))}</p>
          </div>
          <div class="name-item">
            <label>Required Bond</label>
            <p class="field-value">\${escapeHtml(formatSats(record.requiredBondSats))}</p>
          </div>
        </div>
        <div class="step-list">
          <p class="step-list-label">Transaction Provenance</p>
          \${renderTxButtonList(record, panelId)}
          <div id="\${escapeHtml(panelId)}" class="tx-provenance-panel empty"></div>
        </div>
      </div>
    </details>
  \`;
}

function renderRecentNameRow(record) {
  const recency = recentNameRecency(record, state.activity);
  const panelId = "recentNameTxPanel-" + record.name;
  const eventLabel = recentNameEventLabel(record, recency.kind);

  return \`
    <article class="recent-name-row">
      <div class="recent-name-header">
        <div class="recent-name-title">
          <h3>\${escapeHtml(record.name)}</h3>
          <span class="status-pill \${escapeHtml(record.status)}">\${escapeHtml(formatStateLabel(record.status))}</span>
        </div>
        <div class="recent-name-links result-meta">
          \${renderDetailLink(record.name, "Open detail page")}
          \${String(record.status) === "invalid" ? "" : " · " + renderValuePublishLink(record.name, "Publish value") + " · " + renderTransferPrepLink(record.name, "Prepare transfer")}
        </div>
      </div>
      <p class="recent-name-meta">
        <span>\${escapeHtml(eventLabel)}</span>
        <span>Height \${escapeHtml(String(recency.height))}</span>
        <span>\${escapeHtml(truncateMiddle(recency.txid, 10, 8))}</span>
        <span>Bond \${escapeHtml(formatCompactSats(record.requiredBondSats))}</span>
      </p>
      <div class="tx-chip-row">
        \${renderTxButtonList(record, panelId, state.activity)}
      </div>
      <div id="\${escapeHtml(panelId)}" class="tx-provenance-panel empty"></div>
    </article>
  \`;
}

function statusGroupTitle(status) {
  switch (String(status)) {
    case "immature":
      return "Settling Names";
    case "mature":
      return "Active Names";
    case "invalid":
      return "Released Names";
    default:
      return "Other Names";
  }
}

function statusGroupDescription(status) {
  switch (String(status)) {
    case "immature":
      return "These names are already claimed and are still in the bond-backed settlement period.";
    case "mature":
      return "These names have finished settlement and no longer depend on a live bond UTXO.";
    case "invalid":
      return "These names were released because bond continuity failed before settlement finished, so inspect their history before treating them as reclaimable.";
    default:
      return "Names that do not fit the main lifecycle buckets above.";
  }
}

function statusGroupCompact(status) {
  switch (String(status)) {
    case "mature":
      return true;
    default:
      return false;
  }
}

function recentNameRecency(record, activity) {
  if (String(record.status) === "invalid") {
    const invalidationRecord = findLatestInvalidationActivity(record.name, activity);
    if (invalidationRecord) {
      return {
        height: Number(invalidationRecord.blockHeight ?? record.lastStateHeight ?? record.claimHeight ?? 0),
        txid: String(invalidationRecord.txid),
        kind: "invalidated"
      };
    }
  }

  const fallbackHeight =
    typeof record.lastStateHeight === "number" && Number.isFinite(record.lastStateHeight)
      ? record.lastStateHeight
      : Number(record.claimHeight ?? 0);
  const kind = String(record.lastStateTxid) === String(record.claimRevealTxid) ? "claimed" : "transferred";

  return {
    height: fallbackHeight,
    txid: String(record.lastStateTxid || record.claimRevealTxid || ""),
    kind
  };
}

function recentNameEventLabel(record, kind) {
  if (kind === "invalidated") {
    return "Released";
  }

  if (kind === "transferred") {
    return "Transferred";
  }

  return String(record.status) === "mature" ? "Claimed" : "Claimed";
}

function searchOutcomeSummary(status) {
  switch (String(status)) {
    case "immature":
      return "This name is already claimed and is still in settlement.";
    case "mature":
      return "This name is already claimed and active.";
    case "invalid":
      return "This name was released because bond continuity was broken before settlement finished.";
    default:
      return "This name is in a transitional state.";
  }
}

function searchStateTitle(status) {
  switch (String(status)) {
    case "immature":
      return "Claimed And Still Settling";
    case "mature":
      return "Claimed And Active";
    case "invalid":
      return "Released Back To The Pool";
    default:
      return "State In Transition";
  }
}

function searchOutcomeSteps(status, record) {
  switch (String(status)) {
    case "immature":
      return [
        "The current owner must preserve bond continuity until settlement finishes at height " + String(record.maturityHeight) + ".",
        "A transfer is still possible, but it must create the successor bond in the same transaction.",
        "If you are evaluating the name, inspect the provenance and current owner rather than assuming the state is final."
      ];
    case "mature":
      return [
        "Ownership is now active and no longer depends on the original bond output remaining live.",
        "The current owner can publish new off-chain values or transfer the name without successor-bond continuity.",
        "If you want to understand how it got here, inspect the commit, reveal, and latest state transaction."
      ];
    case "invalid":
      return [
        "Inspect the release transaction first. That is the clearest explanation for why the name returned to the pool.",
        "The usual cause is that the active bond UTXO was spent before settlement finished without creating a valid successor bond in the same transaction.",
        "Do not treat the name as safely available until the resolver and transaction history make the reclaim path clear."
      ];
    default:
      return [
        "Inspect the provenance to understand the current state transition.",
        "Use the resolver and transaction history together before acting on the name."
      ];
  }
}

function findLatestInvalidationActivity(name, activity) {
  const normalizedName = String(name).trim().toLowerCase();

  return (
    (Array.isArray(activity) ? activity : []).find(
      (record) =>
        Array.isArray(record.invalidatedNames) &&
        record.invalidatedNames.some((candidate) => String(candidate).trim().toLowerCase() === normalizedName)
    ) ?? null
  );
}

function renderInvalidationSummary(record, activity, panelId) {
  if (String(record.status) !== "invalid") {
    return "";
  }

  const invalidationRecord = findLatestInvalidationActivity(record.name, activity);
  const copy =
    invalidationRecord === null
      ? "This name was released because its bonded state failed before settlement finished. Use the related activity and transaction provenance below to inspect what happened."
      : "This name was released when its active bond outpoint was spent before settlement finished without a valid successor bond in the same transaction.";
  const details =
    invalidationRecord === null
      ? ""
      : '<p class="field-value">Invalidation tx ' +
        escapeHtml(truncateMiddle(invalidationRecord.txid, 12, 10)) +
        " at height " +
        escapeHtml(String(invalidationRecord.blockHeight)) +
        ".</p>";
  const inspectButton =
    invalidationRecord === null
      ? ""
      : '<div class="tx-link-list"><button type="button" class="tx-inspect-button" data-view-tx="' +
        escapeHtml(invalidationRecord.txid) +
        '" data-target-panel="' +
        escapeHtml(panelId) +
        '">Inspect invalidation tx</button></div>';

  return (
    '<div class="step-list">' +
    '<p class="step-list-label">Why It Was Released</p>' +
    '<p class="field-value">' +
    escapeHtml(copy) +
    "</p>" +
    details +
    inspectButton +
    "</div>"
  );
}

function statusSortOrder(status) {
  switch (String(status)) {
    case "immature":
      return 0;
    case "invalid":
      return 1;
    case "mature":
      return 2;
    case "pending":
      return 3;
    default:
      return 9;
  }
}

function matchesNameFilter(record, filter) {
  if (filter === "all") {
    return true;
  }

  return String(record.status) === String(filter);
}

function formatNameFilterLabel(filter) {
  switch (String(filter)) {
    case "immature":
      return "Settling";
    case "mature":
      return "Active";
    case "invalid":
      return "Released";
    default:
      return "All";
  }
}

function matchesActivityFilter(record, filter) {
  switch (String(filter)) {
    case "claims":
      return (record.events ?? []).some(
        (event) =>
          event.typeName === "COMMIT" ||
          event.typeName === "REVEAL" ||
          event.typeName === "BATCH_ANCHOR" ||
          event.typeName === "BATCH_REVEAL"
      );
    case "transfers":
      return (record.events ?? []).some((event) => event.typeName === "TRANSFER");
    case "invalidated":
      return Array.isArray(record.invalidatedNames) && record.invalidatedNames.length > 0;
    default:
      return true;
  }
}

function formatActivityFilterLabel(filter) {
  switch (String(filter)) {
    case "claims":
      return "Claims";
    case "transfers":
      return "Transfers";
    case "invalidated":
      return "Invalidations";
    default:
      return "All";
  }
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function truncateMiddle(value, head = 16, tail = 12) {
  const text = String(value);
  if (text.length <= head + tail + 1) {
    return text;
  }

  return text.slice(0, head) + "…" + text.slice(-tail);
}

function renderCopyableCode(value) {
  const fullValue = String(value);

  return \`
    <div class="code-row">
      <code title="\${escapeHtml(fullValue)}">\${escapeHtml(truncateMiddle(fullValue, 18, 10))}</code>
      <button type="button" class="copy-button" data-copy="\${escapeHtml(fullValue)}">Copy</button>
    </div>
  \`;
}

function renderDetailLink(name, label, configuredBasePath = BASE_PATH) {
  const normalizedName = String(name).trim().toLowerCase();
  return '<a class="detail-link" href="' + escapeHtml(buildNameDetailPath(normalizedName, configuredBasePath)) + '">' + escapeHtml(label) + "</a>";
}

function renderClaimPrepLink(name, label, configuredBasePath = BASE_PATH) {
  const normalizedName = String(name).trim().toLowerCase();
  return '<a class="detail-link" href="' + escapeHtml(buildClaimPrepPath(normalizedName, configuredBasePath)) + '">' + escapeHtml(label) + "</a>";
}

function renderTransferPrepLink(name, label, configuredBasePath = BASE_PATH) {
  const normalizedName = String(name).trim().toLowerCase();
  return '<a class="detail-link" href="' + escapeHtml(buildTransferPrepPath(normalizedName, configuredBasePath)) + '">' + escapeHtml(label) + "</a>";
}

function renderValuePublishLink(name, label, configuredBasePath = BASE_PATH) {
  const normalizedName = String(name).trim().toLowerCase();
  return '<a class="detail-link" href="' + escapeHtml(buildValuePublishPath(normalizedName, configuredBasePath)) + '">' + escapeHtml(label) + "</a>";
}

function renderDetailPageMeta(record, valueRecord, currentHeight) {
  const parts = [
    detailSettlementValue(record, currentHeight),
    valueRecord ? "value published" : "no value published yet"
  ];

  if (String(record.status) === "invalid") {
    parts.unshift("currently released");
  }

  return parts.join(" · ");
}

function renderLookupMeta(record, valueRecord, currentHeight) {
  const parts = [detailSettlementValue(record, currentHeight)];

  if (String(record.status) === "invalid") {
    parts.unshift("released");
  }

  parts.push(valueRecord ? "value published" : "no value published yet");
  return parts.join(" · ");
}

function renderLookupFact(label, value) {
  return (
    '<article class="lookup-fact">' +
    '<span class="lookup-fact-label">' +
    escapeHtml(label) +
    "</span>" +
    '<strong class="lookup-fact-value">' +
    escapeHtml(String(value)) +
    "</strong>" +
    "</article>"
  );
}

function renderDetailSummaryCard(label, value, copy) {
  return \`
    <article class="detail-summary-card">
      <label>\${escapeHtml(label)}</label>
      <p class="detail-summary-value">\${escapeHtml(value)}</p>
      <p class="detail-summary-copy">\${escapeHtml(copy)}</p>
    </article>
  \`;
}

function ownerSummaryCopy(record) {
  if (String(record.status) === "invalid") {
    return "This was the last recorded owner before the name was released.";
  }

  return "This is the key currently recognized by the resolver as the controlling owner.";
}

function primaryLookupNote(record, valueRecord, currentHeight) {
  const status = String(record.status);

  if (status === "invalid") {
    return "This name was released before settlement finished. Use the detail page if you want the full transaction history before reclaiming it.";
  }

  if (status === "mature") {
    return valueRecord
      ? "The name is active and has a current off-chain value record."
      : "The name is active, but the owner has not published an off-chain value record yet.";
  }

  if (currentHeight === null) {
    return "This name is still settling under the current resolver snapshot.";
  }

  const blocksLeft = Math.max(0, Number(record.maturityHeight) - Number(currentHeight));
  return blocksLeft === 0
    ? "This name is at the edge of settlement and should become active once the resolver advances."
    : "This name is still settling. About " + String(blocksLeft) + " blocks remain before it becomes active.";
}

function invalidLookupWarning() {
  return "Treat released names cautiously until you inspect the detail page and confirm why the bond continuity failed.";
}

function detailSettlementValue(record, currentHeight) {
  const status = String(record.status);

  if (status === "invalid") {
    return "Released before settlement";
  }

  if (status === "mature") {
    return "Active";
  }

  if (currentHeight === null) {
    return "Still settling";
  }

  const blocksLeft = Math.max(0, Number(record.maturityHeight) - Number(currentHeight));
  return blocksLeft === 0 ? "At maturity" : String(blocksLeft) + " blocks left";
}

function detailSettlementCopy(record, currentHeight) {
  const status = String(record.status);

  if (status === "invalid") {
    return "Bond continuity broke before settlement finished, so this recorded state should be treated as historical rather than live ownership.";
  }

  if (status === "mature") {
    return "The name has cleared the bond-backed settlement period and is now active without depending on the original bond output staying live.";
  }

  if (currentHeight === null) {
    return "The resolver has not published a current height yet, but this name is still within the settlement window.";
  }

  const blocksLeft = Math.max(0, Number(record.maturityHeight) - Number(currentHeight));
  return blocksLeft === 1
    ? "One block remains before this name becomes active."
    : String(blocksLeft) + " blocks remain before this name becomes active.";
}

function detailValueValue(valueRecord) {
  if (!valueRecord) {
    return "No off-chain data";
  }

  const bundle = Number(valueRecord.valueType) === 255
    ? decodeProfileBundlePayloadHex(valueRecord.payloadHex)
    : null;
  if (bundle !== null) {
    return truncateMiddle(listProfileBundleEntries(bundle).map((entry) => entry.key).join(", "), 26, 18);
  }

  const utf8Preview = decodeValuePayloadUtf8(valueRecord.payloadHex);
  if (utf8Preview !== null && utf8Preview.trim() !== "") {
    return truncateMiddle(utf8Preview, 26, 18);
  }

  return formatValueType(valueRecord.valueType, valueRecord.payloadHex);
}

function detailValueCopy(valueRecord) {
  if (!valueRecord) {
    return "The owner has not published an off-chain value record yet.";
  }

  const bundle = Number(valueRecord.valueType) === 255
    ? decodeProfileBundlePayloadHex(valueRecord.payloadHex)
    : null;
  if (bundle !== null) {
    const destinationCount = listProfileBundleEntries(bundle).length;
    return (
      "Signed off-chain by the current owner. This key/value bundle currently points to " +
      String(destinationCount) +
      " destination" +
      (destinationCount === 1 ? "" : "s") +
      "."
    );
  }

  return (
    "Signed off-chain by the current owner. Latest sequence " +
    String(valueRecord.sequence) +
    " exported " +
    new Date(valueRecord.exportedAt).toLocaleDateString()
  );
}

function renderOffChainDataSection(valueRecord) {
  const typeValue = valueRecord ? formatValueType(valueRecord.valueType, valueRecord.payloadHex) : "Not published";
  const sequenceValue = valueRecord ? String(valueRecord.sequence) : "None yet";
  const publishedValue = valueRecord ? new Date(valueRecord.exportedAt).toLocaleString() : "Not published";
  const bundle = valueRecord && Number(valueRecord.valueType) === 255
    ? decodeProfileBundlePayloadHex(valueRecord.payloadHex)
    : null;
  const explanatoryCopy = valueRecord
    ? bundle !== null
      ? "This name currently resolves through one signed key/value bundle. Ownership stays on-chain; the bundle carries several off-chain destinations at once."
      : "This is the current signed value record for the name. Ownership stays on-chain; the resolution target is stored and updated off-chain."
    : "No signed off-chain value record has been published yet. The name exists, but it does not currently point anywhere.";
  const destinationCountValue = bundle !== null ? String(listProfileBundleEntries(bundle).length) : null;

  return (
    '<section class="step-list offchain-data-section">' +
    '<p class="step-list-label">Off-Chain Data</p>' +
    '<p class="field-value">' + escapeHtml(explanatoryCopy) + "</p>" +
    '<div class="result-grid">' +
    '<div class="result-item"><label>Current Resolution</label>' + renderValueRecordPreview(valueRecord) + "</div>" +
    '<div class="result-item"><label>Record Type</label><p class="field-value">' + escapeHtml(typeValue) + "</p></div>" +
    '<div class="result-item"><label>Sequence</label><p class="field-value">' + escapeHtml(sequenceValue) + "</p></div>" +
    '<div class="result-item"><label>Last Published</label><p class="field-value">' + escapeHtml(publishedValue) + "</p></div>" +
    (destinationCountValue === null
      ? ""
      : '<div class="result-item"><label>Destinations</label><p class="field-value">' + escapeHtml(destinationCountValue) + "</p></div>") +
    "</div>" +
    "</section>"
  );
}

function renderTimelineSummary(record, valueRecord, activity, currentHeight) {
  const items = buildTimelineItems(record, valueRecord, activity, currentHeight);

  if (items.length === 0) {
    return "";
  }

  return \`
    <div class="timeline-strip">
      <p class="timeline-strip-label">Lifecycle Timeline</p>
      <div class="timeline-list">
        \${items
          .map((item) => \`
            <article class="timeline-item">
              <p class="timeline-item-label">\${escapeHtml(item.label)}</p>
              <h4 class="timeline-item-title">\${escapeHtml(item.title)}</h4>
              <p class="timeline-item-meta">\${escapeHtml(item.meta)}</p>
            </article>
          \`)
          .join("")}
      </div>
    </div>
  \`;
}

function buildTimelineItems(record, valueRecord, activity, currentHeight) {
  const items = [];
  const activityByTxid = new Map((Array.isArray(activity) ? activity : []).map((entry) => [entry.txid, entry]));

  items.push({
    label: "Commit",
    title: "Bonded claim committed",
    meta:
      "Height " +
      String(record.winningCommitBlockHeight ?? record.claimHeight) +
      " · " +
      truncateMiddle(record.claimCommitTxid, 10, 8)
  });

  items.push({
    label: "Reveal",
    title: "Name became public",
    meta: "Height " + String(record.claimHeight) + " · " + truncateMiddle(record.claimRevealTxid, 10, 8)
  });

  if (record.lastStateTxid && record.lastStateTxid !== record.claimRevealTxid) {
    const lastStateRecord = activityByTxid.get(record.lastStateTxid);
    const transferEvent = (lastStateRecord?.events ?? []).find((event) => event.typeName === "TRANSFER");

    items.push({
      label: "State Change",
      title: transferEvent ? "Transfer applied" : "State updated",
      meta:
        "Height " +
        String(lastStateRecord?.blockHeight ?? "unknown") +
        " · " +
        truncateMiddle(record.lastStateTxid, 10, 8)
    });
  }

  const invalidationRecord = findLatestInvalidationActivity(record.name, activity);
  if (String(record.status) === "invalid") {
    items.push({
      label: "Release",
      title: "Bond continuity failed",
      meta:
        invalidationRecord === null
          ? "The active bond was spent before settlement finished without a valid successor bond."
          : "Height " + String(invalidationRecord.blockHeight) + " · " + truncateMiddle(invalidationRecord.txid, 10, 8)
    });
  } else {
    items.push({
      label: "Settlement",
      title: currentHeight !== null && currentHeight >= record.maturityHeight ? "Name is active" : "Bond still settling",
      meta:
        "Maturity height " +
        String(record.maturityHeight) +
        (currentHeight === null ? "" : " · current height " + String(currentHeight))
    });
  }

  if (valueRecord) {
    items.push({
      label: "Value",
      title: "Current value published",
      meta:
        "Sequence " +
        String(valueRecord.sequence) +
        " · type 0x" +
        Number(valueRecord.valueType).toString(16).padStart(2, "0") +
        " · " +
        new Date(valueRecord.exportedAt).toLocaleString()
    });
  }

  return items;
}

function renderClaimPlan(plan) {
  setDocumentTitle(plan.name, "available");

  if (elements.claimNameInput) {
    elements.claimNameInput.value = plan.name;
  }

  if (!elements.searchResult) {
    return;
  }

  elements.searchResult.hidden = false;
  setSearchResultVariant("available");
  elements.searchResult.innerHTML = \`
    <div class="search-state-banner available">
      <p class="search-state-label">Current State</p>
      <h4 class="search-state-title">Available Right Now</h4>
      <p class="search-state-copy">This name appears available in the current resolver view, so you can move into claim preparation next.</p>
    </div>
    <div class="result-title">
      <h3>\${escapeHtml(plan.name)}</h3>
      <span class="status-pill available">\${plan.appearsAvailable ? "appears available" : "claimed"}</span>
    </div>
    <p class="result-meta">\${escapeHtml(plan.availabilityNote)}</p>
    <div class="lookup-facts">
      \${renderLookupFact("Required bond", formatSats(plan.requiredBondSats))}
      \${renderLookupFact("Reveal window", String(plan.revealWindowBlocks) + " blocks")}
      \${renderLookupFact("Settlement", String(plan.maturityBlocks) + " blocks")}
    </div>
    <p class="lookup-note">The next move is to prepare the claim package and finish signing outside the browser.</p>
    <div class="hero-cta-row lookup-result-actions">
      <a class="action-link" href="\${escapeHtml(buildClaimPrepPath(plan.name))}">Prepare this claim</a>
      <a class="action-link secondary" href="\${escapeHtml(withBasePath("/setup"))}">Open setup</a>
    </div>
    <details class="step-list detail-technical">
      <summary>Claim planning details</summary>
      <div class="detail-technical-body">
        <div class="result-grid">
          <div class="result-item">
            <label>Planned Commit Height</label>
            <p class="field-value">\${escapeHtml(String(plan.plannedCommitHeight))}</p>
          </div>
          <div class="result-item">
            <label>Recommended Bond Output</label>
            <p class="field-value">vout \${escapeHtml(String(plan.recommendedBondVout ?? 0))}</p>
          </div>
          <div class="result-item">
            <label>Reveal Deadline</label>
            <p class="field-value">\${escapeHtml(String(plan.revealDeadlineHeight))}</p>
          </div>
          <div class="result-item">
            <label>Maturity Height</label>
            <p class="field-value">\${escapeHtml(String(plan.maturityHeight))}</p>
          </div>
        </div>
      </div>
    </details>
    <div class="step-list">
      <p class="step-list-label">Next</p>
      <ol>
        \${plan.nextSteps.slice(0, 3).map((step) => \`<li>\${escapeHtml(step)}</li>\`).join("")}
      </ol>
    </div>
  \`;
}

function renderClaimDraft(draft) {
  if (!elements.claimDraftResult) {
    return;
  }

  const generatedOwnerKey = getGeneratedOwnerKeyForDraft(draft);
  const claimEssentialsText = buildClaimEssentialsText(draft);
  elements.claimDraftResult.classList.remove("empty");
  elements.claimDraftResult.innerHTML = \`
    <div class="result-title">
      <h3>\${escapeHtml(draft.name)}</h3>
      <span class="status-pill available">draft ready</span>
    </div>
    <p class="field-value">The claim draft is ready. Finish the backup step here, then move to Step 3 to build the signer-ready PSBTs.</p>
    \${generatedOwnerKey
      ? \`<div class="step-list">
          <p class="step-list-label">Save This Demo Owner Key</p>
          <p class="field-value">This is the key you will need later for off-chain value updates and owner-authorized transfers. Save it with the claim package before you leave this page.</p>
          <div class="copy-block">
            <div class="copy-block-head">
              <label>Downloadable backup</label>
              <button type="button" class="copy-button" data-download-owner-key="1">Download demo owner key</button>
            </div>
            <pre>\${escapeHtml(buildDemoOwnerKeyText(draft))}</pre>
          </div>
          <div class="result-grid">
            <div class="result-item">
              <label>Owner Pubkey</label>
              \${renderCopyableCode(generatedOwnerKey.ownerPubkey)}
            </div>
            <div class="result-item">
              <label>Owner Private Key</label>
              \${renderCopyableCode(generatedOwnerKey.privateKeyHex)}
            </div>
          </div>
        </div>\`
      : ""}
    <div class="result-grid">
      <div class="result-item">
        <label>Required Bond</label>
        <p class="field-value">\${escapeHtml(formatSats(draft.requiredBondSats))}</p>
      </div>
      <div class="result-item">
        <label>Bond Output</label>
        <p class="field-value">vout \${escapeHtml(String(draft.bondVout))}</p>
      </div>
      <div class="result-item">
        <label>Bond Destination</label>
        <p class="field-value">\${escapeHtml(draft.bondDestination ?? "Choose a self-custody destination in your wallet builder.")}</p>
      </div>
      <div class="result-item">
        <label>Change Destination</label>
        <p class="field-value">\${escapeHtml(draft.changeDestination ?? "Let the wallet choose, or set one explicitly.")}</p>
      </div>
      <div class="result-item">
        <label>Nonce</label>
        <p class="field-value">\${escapeHtml(draft.nonceHex)} <span class="inline-note">(decimal \${escapeHtml(draft.nonceDecimal)})</span></p>
      </div>
      <div class="result-item">
        <label>Owner Pubkey</label>
        \${renderCopyableCode(draft.ownerPubkey)}
      </div>
      <div class="result-item">
        <label>Reveal Status</label>
        <p class="field-value">\${draft.revealReady ? "Commit txid is already known, so reveal artifacts can be exported." : "Reveal artifacts appear after the final commit txid is known."}</p>
      </div>
    </div>
    <div class="quick-copy-grid">
      <article class="quick-copy-card">
        <label>Commit Payload</label>
        \${renderCopyableCode(draft.commitPayloadHex)}
        <p class="quick-copy-copy">Use this exact <code>OP_RETURN</code> payload in the commit transaction.</p>
      </article>
      <article class="quick-copy-card">
        <label>Owner Pubkey</label>
        \${renderCopyableCode(draft.ownerPubkey)}
        <p class="quick-copy-copy">This key controls later owner-authorized actions for the name.</p>
      </article>
      <article class="quick-copy-card">
        <label>Reveal Payload</label>
        \${draft.revealReady ? renderCopyableCode(draft.revealPayloadHex) : '<p class="quick-copy-value">Still waiting on final commit txid</p>'}
        <p class="quick-copy-copy">\${draft.revealReady ? "The reveal payload is ready when you return after the commit confirms." : "Once the commit txid is known, prepare the draft again or use the reveal backup flow."}</p>
      </article>
    </div>
    <details class="step-list detail-technical">
      <summary>Manual claim details</summary>
      <div class="detail-technical-body">
        <div class="copy-block">
          <div class="copy-block-head">
            <label>Claim essentials</label>
            <button type="button" class="copy-button" data-copy="\${escapeHtml(claimEssentialsText)}">Copy all essentials</button>
          </div>
          <pre>\${escapeHtml(claimEssentialsText)}</pre>
        </div>
      </div>
    </details>
    <div class="step-list">
      <p class="step-list-label">What To Do Next</p>
      <ol>
        <li>\${generatedOwnerKey ? "Save the generated owner private key first." : "Confirm the owner pubkey is the one you intend to use."}</li>
        <li>Download the backup package if you want a structured resume file.</li>
        <li>Download signer notes only if you want a human-readable fallback.</li>
        <li>Continue to Step 3 and build the Sparrow PSBTs.</li>
      </ol>
    </div>
  \`;
}

function renderClaimPsbtMessage(message) {
  if (!elements.claimPsbtResult) {
    return;
  }

  elements.claimPsbtResult.classList.add("empty");
  elements.claimPsbtResult.textContent = message;
}

function renderClaimPsbtError(error) {
  const message =
    error instanceof Error ? error.message : "Unable to build Sparrow-native claim PSBTs.";
  renderClaimPsbtMessage(message);
  updateClaimActionStates();
}

function renderClaimPsbtBundle(bundle) {
  if (!elements.claimPsbtResult) {
    return;
  }

  elements.claimPsbtResult.classList.remove("empty");
  elements.claimPsbtResult.innerHTML = \`
    <div class="result-title">
      <h3>Sparrow PSBT Bundle Ready</h3>
      <span class="status-pill available">signer-ready</span>
    </div>
    <p class="field-value">These are the only files from this page that belong in Sparrow. Import the <code>.psbt</code> files there, and keep the reveal backup to resume later. The hosted demo should confirm pending claim transactions automatically after broadcast.</p>
    <div class="step-list resume-callout">
      <p class="step-list-label">Before You Leave This Page</p>
      <p class="field-value">Download the Reveal Backup (.json). It is the easiest way to resume the reveal step after the commit confirms.</p>
      <div class="hero-cta-row">
        <button type="button" class="secondary-button" data-download-reveal-ready="1">Download Reveal Backup (.json)</button>
      </div>
    </div>
    <div class="result-grid">
      <div class="result-item">
        <label>Commit Fee</label>
        <p class="field-value">\${escapeHtml(formatSats(bundle.commitFeeSats))}</p>
      </div>
      <div class="result-item">
        <label>Reveal Fee</label>
        <p class="field-value">\${escapeHtml(formatSats(bundle.revealFeeSats))}</p>
      </div>
      <div class="result-item">
        <label>Commit Change Address</label>
        <p class="field-value">\${escapeHtml(bundle.commitChangeAddress)}</p>
      </div>
      <div class="result-item">
        <label>Reveal Funding Source</label>
        <p class="field-value">\${
          bundle.revealFundingSource === "commit_change"
            ? "Reveal spends the predicted commit change output, so the workflow stays self-contained."
            : "Reveal spends additional confirmed wallet UTXOs from the same Sparrow account."
        }</p>
      </div>
    </div>
    <div class="step-list">
      <p class="step-list-label">What To Do Next</p>
      <ol>
        <li>Download and open the commit PSBT in Sparrow.</li>
        <li>Sign and broadcast the commit transaction. This private demo should confirm it automatically within about 30 seconds.</li>
        <li>Once the commit confirms, open the reveal PSBT in Sparrow.</li>
        <li>Sign and broadcast the reveal transaction within the ${REVEAL_WINDOW_BLOCKS}-block reveal window. The hosted demo should confirm that automatically too.</li>
      </ol>
    </div>
    <details class="step-list detail-technical">
      <summary>Inspect selected wallet inputs</summary>
      <div class="detail-technical-body">
        <div class="template-list">
          \${bundle.selectedCommitInputs
            .map(
              (input) => \`
            <div class="template-row">
              <strong>Commit · \${escapeHtml(truncateMiddle(input.txid, 16, 10))}:\${escapeHtml(String(input.vout))}</strong>
              <span class="inline-note">\${escapeHtml(formatSats(input.valueSats))} · \${escapeHtml(input.derivationPath)}</span>
              <p class="field-value">\${escapeHtml(input.address)}</p>
            </div>\`
            )
            .join("")}
          \${bundle.selectedRevealInputs
            .map(
              (input) => \`
            <div class="template-row">
              <strong>Reveal · \${escapeHtml(truncateMiddle(input.txid, 16, 10))}:\${escapeHtml(String(input.vout))}</strong>
              <span class="inline-note">\${escapeHtml(formatSats(input.valueSats))}\${
                input.derivationPath ? " · " + escapeHtml(input.derivationPath) : ""
              }</span>
              <p class="field-value">\${escapeHtml(input.address)}</p>
            </div>\`
            )
            .join("")}
        </div>
      </div>
    </details>
  \`;
}

function setSearchResultVariant(status) {
  if (!elements.searchResult) {
    return;
  }

  elements.searchResult.classList.remove("empty", "available-state", "immature-state", "mature-state", "invalid-state");

  switch (String(status ?? "")) {
    case "available":
      elements.searchResult.classList.add("available-state");
      break;
    case "immature":
      elements.searchResult.classList.add("immature-state");
      break;
    case "mature":
      elements.searchResult.classList.add("mature-state");
      break;
    case "invalid":
      elements.searchResult.classList.add("invalid-state");
      break;
    default:
      break;
  }
}

function renderTestKey(generated) {
  if (!elements.testKeyResult) {
    return;
  }

  elements.testKeyResult.classList.remove("empty");
  elements.testKeyResult.innerHTML = \`
    <div class="result-title">
      <h3>Generated Test Owner Key</h3>
      <span class="status-pill invalid">prototype only</span>
    </div>
    <p class="prototype-warning">\${escapeHtml(generated.warning)}</p>
    <div class="step-list">
      <p class="step-list-label">Do This Now</p>
      <ol>
        <li>Download or copy the private key before you continue.</li>
        <li>Keep it with your claim package if you want to publish off-chain values or authorize transfers later.</li>
        <li>Then continue with <strong>Prepare Draft</strong> and build the Sparrow PSBTs below.</li>
      </ol>
      <div class="hero-cta-row">
        <button type="button" class="secondary-button" data-download-generated-owner-key="1">Download demo owner key</button>
      </div>
    </div>
    <div class="result-grid">
      <div class="result-item">
        <label>Owner Pubkey</label>
        \${renderCopyableCode(generated.ownerPubkey)}
      </div>
      <div class="result-item">
        <label>Private Key</label>
        \${renderCopyableCode(generated.privateKeyHex)}
      </div>
    </div>
  \`;
}

function getGeneratedOwnerKeyForDraft(draft) {
  if (!draft || !state.generatedOwnerKey) {
    return null;
  }

  return String(draft.ownerPubkey) === String(state.generatedOwnerKey.ownerPubkey) ? state.generatedOwnerKey : null;
}

function renderPrivateFundingResult(result) {
  if (!elements.privateFundingResult) {
    return;
  }

  elements.privateFundingResult.classList.remove("empty");
  elements.privateFundingResult.innerHTML = \`
    <div class="result-title">
      <h3>Demo Coins Sent</h3>
      <span class="status-pill available">funded</span>
    </div>
    <p class="field-value">
      Sent \${escapeHtml(formatSats(result.fundedSats))} to your Sparrow wallet and mined \${escapeHtml(String(result.minedBlocks))} confirming block immediately.
    </p>
    <div class="result-grid">
      <div class="result-item">
        <label>Receive Address</label>
        \${renderCopyableCode(result.address)}
      </div>
      <div class="result-item">
        <label>Funding Tx</label>
        \${renderCopyableCode(result.txid)}
      </div>
      <div class="result-item">
        <label>Amount</label>
        <p class="field-value">\${escapeHtml(formatSats(result.fundedSats))}</p>
      </div>
      <div class="result-item">
        <label>Cooldown</label>
        <p class="field-value">\${escapeHtml(String(Math.ceil(Number(result.cooldownMs ?? 0) / 1000)))} seconds</p>
      </div>
    </div>
    <div class="step-list">
      <p class="step-list-label">What To Do Next</p>
      <ol>
        <li>Refresh Sparrow so the new confirmed UTXO appears.</li>
        <li>Keep using that same wallet when you build the claim transaction.</li>
        <li>Copy a fresh receive address from Sparrow into Bond Destination so the bond output is easy to distinguish from the funding UTXO.</li>
        <li>Optionally paste a dedicated change address too, or let the wallet choose one.</li>
        <li>Continue with the claim draft below and save the generated demo owner key before you leave the page. Later claim transactions on this hosted demo will confirm automatically after you broadcast them.</li>
      </ol>
    </div>
  \`;
}

function generateNonceHex() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function downloadJsonFile(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2) + "\\n"], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadTextFile(text, filename) {
  const blob = new Blob([String(text)], {
    type: "text/plain;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadBase64BinaryFile(base64, filename) {
  const binary = atob(String(base64));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], {
    type: "application/octet-stream"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function renderWalletOutput(output) {
  return \`
    <div class="template-row">
      <strong>\${escapeHtml(output.role)} output</strong>
      <span class="inline-note">
        \${output.fixedVout === null ? "vout flexible" : "vout " + escapeHtml(String(output.fixedVout))} ·
        \${output.required ? "required" : "optional"} ·
        \${escapeHtml(output.scriptType)} ·
        \${escapeHtml(String(output.valueSats) === "wallet-calculated" ? "wallet-calculated" : formatSats(output.valueSats))}
      </span>
      \${output.destination ? \`<p class="field-value">Destination: \${escapeHtml(output.destination)}</p>\` : ""}
      \${output.dataHex ? renderCopyableCode(output.dataHex) : ""}
    </div>
  \`;
}

function buildClaimEssentialsText(draft) {
  const generatedOwnerKey = getGeneratedOwnerKeyForDraft(draft);
  const lines = [
    "Global Name System claim essentials",
    "====================",
    "",
    "Name: " + String(draft.name),
    "Owner pubkey: " + String(draft.ownerPubkey),
    "Required bond: " + formatSats(draft.requiredBondSats),
    "Bond vout: " + String(draft.bondVout),
    "Bond destination: " + String(draft.bondDestination ?? "Choose in signer"),
    "Change destination: " + String(draft.changeDestination ?? "Choose in signer"),
    "Nonce: " + String(draft.nonceHex),
    "Commit hash: " + String(draft.commitHash),
    "Commit payload hex: " + String(draft.commitPayloadHex),
    ""
  ];

  if (generatedOwnerKey) {
    lines.push(
      "Demo owner private key: " + String(generatedOwnerKey.privateKeyHex),
      "Demo owner key warning: Save this key if you want to publish off-chain values or authorize transfers later.",
      ""
    );
  }

  if (draft.commitTxid) {
    lines.push("Commit txid: " + String(draft.commitTxid));
  } else {
    lines.push("Commit txid: still needed");
  }

  if (draft.revealReady && draft.revealPayloadHex) {
    lines.push("Reveal payload hex: " + String(draft.revealPayloadHex));
  } else {
    lines.push("Reveal payload hex: derive after commit txid is known");
  }

  lines.push(
    "",
    "Sparrow checklist",
    "-----------------",
    "1. Preserve the bond output at the declared vout with at least the required bond amount.",
    "2. Add the exact commit OP_RETURN payload above to the commit transaction.",
    "3. Fund fees separately so the bond output does not shrink below the required bond.",
    "4. Broadcast the commit, then paste the final commit txid back into the claim page.",
    "5. On the hosted private demo, the commit should confirm automatically soon after broadcast.",
    "6. After confirmation, build and broadcast the reveal within the ${REVEAL_WINDOW_BLOCKS}-block reveal window."
  );

  return lines.join("\\n");
}

function buildDemoOwnerKeyText(draft) {
  const generatedOwnerKey = getGeneratedOwnerKeyForDraft(draft);

  if (!generatedOwnerKey) {
    return "";
  }

  return buildGeneratedOwnerKeyText(generatedOwnerKey, String(draft.name));
}

function buildGeneratedOwnerKeyText(generatedOwnerKey, nameHint) {
  return [
    "Global Name System demo owner key",
    "===================",
    "",
    "Name: " + String(nameHint ?? "unassigned"),
    "Owner pubkey: " + String(generatedOwnerKey.ownerPubkey),
    "Owner private key: " + String(generatedOwnerKey.privateKeyHex),
    "",
    "Why this matters",
    "----------------",
    "This key controls owner-authorized actions for the name itself.",
    "Keep it if you want to publish off-chain values or authorize transfers later.",
    "",
    "Warning",
    "-------",
    String(generatedOwnerKey.warning)
  ].join("\\n");
}

function withClaimDraftLocalData(draft) {
  const generatedOwnerKey = getGeneratedOwnerKeyForDraft(draft);

  if (!generatedOwnerKey) {
    return draft;
  }

  return {
    ...draft,
    localDemoOwnerKey: {
      ownerPubkey: generatedOwnerKey.ownerPubkey,
      privateKeyHex: generatedOwnerKey.privateKeyHex,
      warning:
        "Local demo helper only. This generated owner private key is required for later off-chain value updates and owner-authorized transfers."
    }
  };
}

function withClaimPackageLocalData(claimPackage) {
  if (!state.generatedOwnerKey) {
    return claimPackage;
  }

  if (String(claimPackage.ownerPubkey) !== String(state.generatedOwnerKey.ownerPubkey)) {
    return claimPackage;
  }

  return {
    ...claimPackage,
    localDemoOwnerKey: {
      ownerPubkey: state.generatedOwnerKey.ownerPubkey,
      privateKeyHex: state.generatedOwnerKey.privateKeyHex,
      warning:
        "Local demo helper only. This generated owner private key is required for later off-chain value updates and owner-authorized transfers."
    }
  };
}

function buildTransferDraft({ record, activity, newOwnerPubkey, mode, sellerPayoutAddress, bondAddress }) {
  if (String(record.status) === "invalid") {
    return {
      kind: "invalid",
      name: record.name,
      status: record.status,
      record,
      activity,
      newOwnerPubkey,
      summary:
        "This name has been released, so the next move is to reclaim it rather than transfer it.",
      modes: [],
      recommendedMode: null
    };
  }

  const normalizedMode = normalizeTransferMode(mode, record.status);
  const sellerPayout = sellerPayoutAddress || "<seller-payout-address>";
  const successorBondAddress = bondAddress || "<successor-bond-address>";
  const bondInputDescriptor =
    record.currentBondTxid +
    ":" +
    String(record.currentBondVout) +
    ":" +
    String(record.currentBondValueSats) +
    ":<current-bond-address>";
  const feeInputDescriptor = "<fee-input-txid:vout:valueSats:address>";
  const ownerKeyPlaceholder = "<current-owner-private-key-hex>";
  const ownerWifPlaceholder = "<owner-wif>";
  const buyerWifPlaceholder = "<buyer-wif>";
  const giftCommand = [
    "npm run dev:cli -- submit-transfer \\\\",
    "  --prev-state-txid " + String(record.lastStateTxid) + " \\\\",
    "  --new-owner-pubkey " + String(newOwnerPubkey) + " \\\\",
    "  --owner-private-key-hex " + ownerKeyPlaceholder + " \\\\",
    "  --bond-input " + bondInputDescriptor + " \\\\",
    "  --input " + feeInputDescriptor + " \\\\",
    "  --successor-bond-vout 0 \\\\",
    "  --successor-bond-sats " + String(record.currentBondValueSats) + " \\\\",
    "  --fee-sats <fee-sats> \\\\",
    "  --bond-address " + successorBondAddress + " \\\\",
    "  --wif " + ownerWifPlaceholder
  ].join("\\n");
  const immatureSaleCommand = [
    "npm run dev:cli -- submit-immature-sale-transfer \\\\",
    "  --prev-state-txid " + String(record.lastStateTxid) + " \\\\",
    "  --new-owner-pubkey " + String(newOwnerPubkey) + " \\\\",
    "  --owner-private-key-hex " + ownerKeyPlaceholder + " \\\\",
    "  --bond-input " + bondInputDescriptor + " \\\\",
    "  --buyer-input <buyer-input-txid:vout:valueSats:address> \\\\",
    "  --successor-bond-vout 0 \\\\",
    "  --successor-bond-sats " + String(record.currentBondValueSats) + " \\\\",
    "  --sale-price-sats <sale-price-sats> \\\\",
    "  --seller-payout-address " + sellerPayout + " \\\\",
    "  --fee-sats <fee-sats> \\\\",
    "  --bond-address " + successorBondAddress + " \\\\",
    "  --wif " + ownerWifPlaceholder + " \\\\",
    "  --wif " + buyerWifPlaceholder
  ].join("\\n");
  const matureSaleCommand = [
    "npm run dev:cli -- submit-sale-transfer \\\\",
    "  --prev-state-txid " + String(record.lastStateTxid) + " \\\\",
    "  --new-owner-pubkey " + String(newOwnerPubkey) + " \\\\",
    "  --owner-private-key-hex " + ownerKeyPlaceholder + " \\\\",
    "  --seller-input <seller-input-txid:vout:valueSats:address> \\\\",
    "  --buyer-input <buyer-input-txid:vout:valueSats:address> \\\\",
    "  --seller-payment-sats <sale-price-sats> \\\\",
    "  --seller-payment-address " + sellerPayout + " \\\\",
    "  --fee-sats <fee-sats> \\\\",
    "  --wif " + ownerWifPlaceholder + " \\\\",
    "  --wif " + buyerWifPlaceholder
  ].join("\\n");

  const modes = String(record.status) === "immature"
    ? [
        {
          key: "gift",
          title: "Gift / pre-arranged transfer",
          suitability: normalizedMode === "gift" ? "Selected on this page" : "Good default when no sale payment needs to be embedded",
          copy:
            "Use the current bond outpoint plus a successor bond output. The current CLI flow carries the bond forward in the same transfer transaction.",
          command: giftCommand
        },
        {
          key: "immature-sale",
          title: "Buyer-funded settling sale",
          suitability:
            normalizedMode === "immature-sale"
              ? "Selected on this page"
              : "Best sale path while the name is still settling",
          copy:
            "The buyer funds the successor bond and seller payout atomically, so bond continuity and sale settlement happen in one transaction.",
          command: immatureSaleCommand
        }
      ]
    : [
        {
          key: "gift",
          title: "Gift / pre-arranged transfer",
          suitability: normalizedMode === "gift" ? "Selected on this page" : "Available if you want a simple owner handoff",
          copy:
            "The protocol no longer requires bond continuity after maturity, but the current CLI gift flow still carries the recorded bond input forward conservatively.",
          command: giftCommand
        },
        {
          key: "sale",
          title: "Cooperative active sale",
          suitability: normalizedMode === "sale" ? "Selected on this page" : "Best sale path after maturity",
          copy:
            "Use a cooperative payment-plus-transfer transaction so seller payment and name transfer settle together on-chain.",
          command: matureSaleCommand
        }
      ];

  return {
    kind: "transfer",
    name: record.name,
    status: record.status,
    record,
    activity,
    newOwnerPubkey,
    sellerPayoutAddress,
    bondAddress,
    recommendedMode: normalizedMode,
    summary:
      String(record.status) === "immature"
        ? "This name is still settling, so any transfer must respect the live bond state."
        : "This name is active, so the transfer can focus on ownership change and optional seller payment.",
    modes
  };
}

function normalizeTransferMode(mode, status) {
  const raw = String(mode ?? "auto");
  if (raw === "gift" || raw === "immature-sale" || raw === "sale") {
    return raw;
  }

  return String(status) === "immature" ? "immature-sale" : "sale";
}

function buildTransferPackage(draft) {
  if (draft.kind === "invalid") {
    throw new Error("invalid names cannot be exported as transfer packages");
  }

  return {
    format: TRANSFER_PACKAGE_FORMAT,
    packageVersion: TRANSFER_PACKAGE_VERSION,
    protocol: PROTOCOL_ID,
    exportedAt: new Date().toISOString(),
    name: String(draft.name),
    currentStatus: String(draft.status),
    currentOwnerPubkey: String(draft.record.currentOwnerPubkey),
    newOwnerPubkey: String(draft.newOwnerPubkey),
    lastStateTxid: String(draft.record.lastStateTxid),
    currentBondTxid: String(draft.record.currentBondTxid),
    currentBondVout: Number(draft.record.currentBondVout),
    currentBondValueSats: String(draft.record.currentBondValueSats),
    requiredBondSats: String(draft.record.requiredBondSats),
    recommendedMode: String(draft.recommendedMode),
    sellerPayoutAddress: draft.sellerPayoutAddress || null,
    successorBondAddress: draft.bondAddress || null,
    modes: draft.modes.map((mode) => ({
      key: String(mode.key),
      title: String(mode.title),
      suitability: String(mode.suitability),
      summary: String(mode.copy),
      command: String(mode.command)
    }))
  };
}

function getRecommendedTransferMode(draft) {
  return draft.modes.find((mode) => mode.key === draft.recommendedMode) ?? draft.modes[0];
}

function getAlternativeTransferModes(draft) {
  return draft.modes.filter((mode) => mode.key !== draft.recommendedMode);
}

function transferParticipantLines(draft, mode) {
  if (mode.key === "gift") {
    return [
      "The current owner provides the owner key material and the recorded bond context.",
      String(draft.status) === "immature"
        ? "You still need a successor bond output in the same transaction because the name is still settling."
        : "The current CLI still carries bond details forward conservatively, even though active names no longer require continuity.",
      "A fee input and destination addresses still need to be filled in before signing."
    ];
  }

  if (mode.key === "immature-sale") {
    return [
      "The seller provides the owner key material and the live bond state.",
      "The buyer provides the funding inputs for the successor bond and the seller payout.",
      "This is the right sale path while the name is still settling because payment and bond continuity settle together."
    ];
  }

  return [
    "The seller provides the owner key material and a seller-side input.",
    "The buyer provides payment-side funding inputs for the sale settlement.",
    "This is the clean active-name sale path when ownership and seller payout need to settle together."
  ];
}

function transferPrimarySteps(draft, mode) {
  const steps = [
    "Replace the placeholder keys, funding inputs, payout address, and fee values in the command block.",
    "Keep the current owner pubkey and last state txid exactly as shown in this handoff."
  ];

  if (mode.key === "gift") {
    steps.push("Use the gift transfer command when no buyer payment needs to settle inside the transfer transaction.");
  } else if (mode.key === "immature-sale") {
    steps.push("Use the buyer-funded settling sale command so the successor bond and seller payout happen atomically.");
  } else {
    steps.push("Use the cooperative active sale command so the seller payout and ownership transfer finalize together.");
  }

  if (String(draft.status) === "immature") {
    steps.push("Because this name is still settling, confirm the successor bond output is present and at least meets the required bond.");
  }

  steps.push("Run the command locally, then return to the explorer to confirm the new owner and state txid.");
  return steps;
}

function renderTransferDraft(draft) {
  if (!elements.transferDraftResult) {
    return;
  }

  elements.transferDraftResult.classList.remove("empty");

  if (draft.kind === "invalid") {
    elements.transferDraftResult.innerHTML = \`
      <div class="search-state-banner invalid">
        <p class="search-state-label">Transfer Status</p>
        <h4 class="search-state-title">Reclaim Instead Of Transfer</h4>
        <p class="search-state-copy">\${escapeHtml(draft.summary)}</p>
      </div>
      <div class="result-title">
        <h3>\${escapeHtml(draft.name)}</h3>
        <span class="status-pill invalid">Released</span>
      </div>
      <div class="hero-cta-row">
        <a class="action-link" href="\${escapeHtml(buildClaimPrepPath(draft.name))}">Prepare a reclaim</a>
        <a class="action-link secondary" href="\${escapeHtml(buildNameDetailPath(draft.name))}">Open detail page</a>
      </div>
    \`;
    return;
  }

  const transferEssentialsText = buildTransferEssentialsText(draft);
  const recommendedMode = getRecommendedTransferMode(draft);
  const alternativeModes = getAlternativeTransferModes(draft);
  elements.transferDraftResult.innerHTML = \`
    <div class="search-state-banner \${escapeHtml(draft.status)}">
      <p class="search-state-label">Transfer Status</p>
      <h4 class="search-state-title">\${escapeHtml(String(draft.status) === "immature" ? "Bond continuity still matters" : "Ownership handoff is simpler now")}</h4>
      <p class="search-state-copy">\${escapeHtml(draft.summary)}</p>
    </div>
    <div class="result-title">
      <h3>\${escapeHtml(draft.name)}</h3>
      <span class="status-pill \${escapeHtml(draft.status)}">\${escapeHtml(formatStateLabel(draft.status))}</span>
    </div>
    <p class="result-meta">
      \${renderDetailLink(draft.name, "Open detail page")} · \${renderTransferPrepLink(draft.name, "Stay on transfer prep")}
    </p>
    <div class="result-grid">
      <div class="result-item">
        <label>Current Owner</label>
        \${renderCopyableCode(draft.record.currentOwnerPubkey)}
      </div>
      <div class="result-item">
        <label>New Owner</label>
        \${renderCopyableCode(draft.newOwnerPubkey)}
      </div>
      <div class="result-item">
        <label>Last State Txid</label>
        \${renderCopyableCode(draft.record.lastStateTxid)}
      </div>
      <div class="result-item">
        <label>Current Bond Input</label>
        <p class="field-value">\${escapeHtml(draft.record.currentBondTxid)}:\${escapeHtml(String(draft.record.currentBondVout))}</p>
      </div>
      <div class="result-item">
        <label>Current Bond Amount</label>
        <p class="field-value">\${escapeHtml(formatSats(draft.record.currentBondValueSats))}</p>
      </div>
      <div class="result-item">
        <label>Required Bond</label>
        <p class="field-value">\${escapeHtml(formatSats(draft.record.requiredBondSats))}</p>
      </div>
    </div>
    <div class="step-list">
      <p class="step-list-label">Recommended Path</p>
      <div class="guide-grid">
        <article class="guide-card">
          <h3>\${escapeHtml(recommendedMode.title)}</h3>
          <p class="field-value">\${escapeHtml(recommendedMode.suitability)}</p>
          <p class="inline-note">\${escapeHtml(recommendedMode.copy)}</p>
        </article>
        <article class="guide-card">
          <h3>Who Brings What</h3>
          <ul class="guide-list">
            \${transferParticipantLines(draft, recommendedMode)
              .map((line) => \`<li>\${escapeHtml(line)}</li>\`)
              .join("")}
          </ul>
        </article>
      </div>
      <div class="copy-block">
        <div class="copy-block-head">
          <label>Primary CLI command</label>
          <button type="button" class="copy-button" data-copy="\${escapeHtml(recommendedMode.command)}">Copy command</button>
        </div>
        <pre>\${escapeHtml(recommendedMode.command)}</pre>
      </div>
    </div>
    <p class="field-value">Use the download buttons above if you want the package or notes on disk. For most people, the primary command block is the shortest path out of this page.</p>
    <div class="step-list">
      <p class="step-list-label">Run This Flow</p>
      <ol>
        \${transferPrimarySteps(draft, recommendedMode)
          .map((step) => \`<li>\${escapeHtml(step)}</li>\`)
          .join("")}
      </ol>
    </div>
    \${alternativeModes.length === 0 ? "" : \`
      <details class="step-list detail-technical">
        <summary>Other transfer modes</summary>
        <div class="detail-technical-body">
          <div class="template-list">
            \${alternativeModes
              .map(
                (mode) => \`
                  <div class="template-row">
                    <strong>\${escapeHtml(mode.title)}</strong>
                    <p class="field-value">\${escapeHtml(mode.suitability)}</p>
                    <p class="inline-note">\${escapeHtml(mode.copy)}</p>
                    <div class="copy-block">
                      <div class="copy-block-head">
                        <label>CLI command</label>
                        <button type="button" class="copy-button" data-copy="\${escapeHtml(mode.command)}">Copy command</button>
                      </div>
                      <pre>\${escapeHtml(mode.command)}</pre>
                    </div>
                  </div>
                \`
              )
              .join("")}
          </div>
        </div>
      </details>
    \`}
    <details class="step-list detail-technical">
      <summary>Copy all transfer essentials</summary>
      <div class="detail-technical-body">
        <div class="copy-block">
          <div class="copy-block-head">
            <label>CLI handoff bundle</label>
            <button type="button" class="copy-button" data-copy="\${escapeHtml(transferEssentialsText)}">Copy all essentials</button>
          </div>
          <pre>\${escapeHtml(transferEssentialsText)}</pre>
        </div>
      </div>
    </details>
    <div class="step-list">
      <p class="step-list-label">What Happens Next</p>
      <ol>
        \${transferOutcomeSteps(draft)
          .map((step) => \`<li>\${escapeHtml(step)}</li>\`)
          .join("")}
      </ol>
    </div>
  \`;
}

function buildTransferEssentialsText(draft) {
  if (draft.kind === "invalid") {
    return "This name has been released. Reclaim it instead of transferring it.";
  }

  const lines = [
    "Global Name System transfer essentials",
    "=======================",
    "",
    "Name: " + String(draft.name),
    "Current status: " + formatStateLabel(draft.status),
    "Current owner pubkey: " + String(draft.record.currentOwnerPubkey),
    "New owner pubkey: " + String(draft.newOwnerPubkey),
    "Last state txid: " + String(draft.record.lastStateTxid),
    "Current bond outpoint: " + String(draft.record.currentBondTxid) + ":" + String(draft.record.currentBondVout),
    "Current bond amount: " + formatSats(draft.record.currentBondValueSats),
    "Required bond: " + formatSats(draft.record.requiredBondSats),
    "Recommended mode: " + String(draft.recommendedMode),
    "",
    "Mode notes",
    "----------"
  ];

  for (const mode of draft.modes) {
    lines.push(mode.title + ": " + mode.copy);
  }

  lines.push("", "CLI commands", "------------");
  for (const mode of draft.modes) {
    lines.push("", mode.title, mode.command);
  }

  return lines.join("\\n");
}

function transferOutcomeSteps(draft) {
  if (draft.kind === "invalid") {
    return ["The current state has been released, so reclaim the name instead of transferring it."];
  }

  const steps = [
    "Choose the CLI mode that matches whether this is a gift/pre-arranged transfer or a sale.",
    "Replace the placeholder addresses, inputs, WIFs, and fee amounts in the copied command block.",
    "Run the command locally so the CLI can build, sign, and broadcast the transfer transaction."
  ];

  if (String(draft.status) === "immature") {
    steps.push(
      "Because this name is still settling, make sure the chosen flow preserves or recreates a valid successor bond in the same transaction."
    );
  } else {
    steps.push(
      "Because this name is active, you can use the cooperative sale flow directly when seller payment needs to settle atomically."
    );
  }

  steps.push("Return to the explorer afterward to confirm the name record moved to the new owner.");
  return steps;
}

async function openTxProvenance(txid, panelId, buttonNode) {
  const panel = document.getElementById(panelId);
  if (!panel) {
    return;
  }

  for (const candidate of document.querySelectorAll("[data-target-panel]")) {
    if (candidate.getAttribute("data-target-panel") === panelId) {
      candidate.classList.toggle("active", candidate === buttonNode);
    }
  }

  panel.classList.remove("empty");
  panel.innerHTML = '<p class="tx-panel-note">Loading transaction provenance...</p>';

  try {
    const cached = state.txCache.get(txid);
    const payload = cached ?? await fetchJson(withBasePath("/api/tx/" + encodeURIComponent(txid)));
    state.txCache.set(txid, payload);
    panel.innerHTML = renderTxProvenance(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load transaction provenance.";
    panel.innerHTML = '<p class="tx-panel-note">' + escapeHtml(message) + "</p>";
  }
}

function renderTxButtonList(record, panelId, activity = []) {
  const items = [];
  const seen = new Set();

  for (const entry of [
    { label: "Commit Tx", txid: record.claimCommitTxid },
    { label: "Reveal Tx", txid: record.claimRevealTxid },
    { label: "Last State Tx", txid: record.lastStateTxid },
    { label: "Bond Tx", txid: record.currentBondTxid }
  ]) {
    if (!entry.txid || seen.has(entry.txid)) {
      continue;
    }

    seen.add(entry.txid);
    items.push(
      '<button type="button" class="tx-inspect-button" data-view-tx="' +
        escapeHtml(entry.txid) +
        '" data-target-panel="' +
        escapeHtml(panelId) +
        '">' +
        escapeHtml(entry.label) +
        "</button>"
    );
  }

  const invalidationRecord = findLatestInvalidationActivity(record.name, activity);
  if (invalidationRecord && !seen.has(invalidationRecord.txid)) {
    seen.add(invalidationRecord.txid);
    items.push(
      '<button type="button" class="tx-inspect-button" data-view-tx="' +
        escapeHtml(invalidationRecord.txid) +
        '" data-target-panel="' +
        escapeHtml(panelId) +
        '">Invalidation Tx</button>'
    );
  }

  return '<div class="tx-link-list">' + items.join("") + "</div>";
}

function renderTxProvenance(tx) {
  return (
    '<div class="tx-provenance-card">' +
    "<h4>Transaction Provenance</h4>" +
    '<div class="result-grid">' +
    '<div class="result-item"><label>Txid</label>' + renderCopyableCode(tx.txid) + "</div>" +
    '<div class="result-item"><label>Block Height</label><p class="field-value">' + escapeHtml(String(tx.blockHeight)) + "</p></div>" +
    '<div class="result-item"><label>Tx Index</label><p class="field-value">' + escapeHtml(String(tx.txIndex)) + "</p></div>" +
    '<div class="result-item"><label>Inputs / Outputs</label><p class="field-value">' +
      escapeHtml(String((tx.inputs ?? []).length) + " in · " + String((tx.outputs ?? []).length) + " out") +
      "</p></div>" +
    "</div>" +
    ((tx.invalidatedNames ?? []).length > 0
      ? '<p class="tx-panel-note">Released names: ' + escapeHtml(tx.invalidatedNames.join(", ")) + "</p>"
      : '<p class="tx-panel-note">No names were released by this transaction.</p>') +
    renderTxEventList(tx.events ?? []) +
    "</div>"
  );
}

function renderTxEventList(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return '<p class="tx-panel-note">No Global Name System events were parsed from this transaction.</p>';
  }

  return (
    '<div class="tx-event-list">' +
    events
      .map((event) => {
        return (
          '<article class="tx-event-card">' +
          '<div class="tx-event-header">' +
          "<strong>" + escapeHtml(String(event.typeName ?? "UNKNOWN")) + "</strong>" +
          '<span class="tx-pill ' + escapeHtml(String(event.validationStatus ?? "ignored")) + '">' +
          escapeHtml(String(event.validationStatus ?? "ignored")) +
          "</span>" +
          '<span class="inline-note">vout ' + escapeHtml(String(event.vout ?? "-")) + "</span>" +
          "</div>" +
          '<p class="tx-event-meta">Reason: ' + escapeHtml(String(event.reason ?? "unknown")) + "</p>" +
          (event.affectedName
            ? '<p class="tx-event-meta">Affected name: ' + escapeHtml(String(event.affectedName)) + "</p>"
            : "") +
          renderTxEventPayload(event.payload ?? {}) +
          "</article>"
        );
      })
      .join("") +
    "</div>"
  );
}

function renderTxEventPayload(payload) {
  const rows = [];

  if (payload.ownerPubkey) {
    rows.push('<div class="result-item"><label>Owner Pubkey</label>' + renderCopyableCode(payload.ownerPubkey) + "</div>");
  }
  if (payload.commitHash) {
    rows.push('<div class="result-item"><label>Commit Hash</label>' + renderCopyableCode(payload.commitHash) + "</div>");
  }
  if (payload.commitTxid) {
    rows.push('<div class="result-item"><label>Commit Txid</label>' + renderCopyableCode(payload.commitTxid) + "</div>");
  }
  if (payload.anchorTxid) {
    rows.push('<div class="result-item"><label>Anchor Txid</label>' + renderCopyableCode(payload.anchorTxid) + "</div>");
  }
  if (payload.name) {
    rows.push('<div class="result-item"><label>Name</label><p class="field-value">' + escapeHtml(String(payload.name)) + "</p></div>");
  }
  if (payload.nonce !== undefined) {
    rows.push('<div class="result-item"><label>Nonce</label><p class="field-value">' + escapeHtml(String(payload.nonce)) + "</p></div>");
  }
  if (payload.newOwnerPubkey) {
    rows.push('<div class="result-item"><label>New Owner</label>' + renderCopyableCode(payload.newOwnerPubkey) + "</div>");
  }
  if (payload.prevStateTxid) {
    rows.push('<div class="result-item"><label>Prev State Txid</label>' + renderCopyableCode(payload.prevStateTxid) + "</div>");
  }
  if (payload.signature) {
    rows.push('<div class="result-item"><label>Signature</label>' + renderCopyableCode(payload.signature) + "</div>");
  }
  if (payload.bondVout !== undefined) {
    rows.push('<div class="result-item"><label>Bond Vout</label><p class="field-value">' + escapeHtml(String(payload.bondVout)) + "</p></div>");
  }
  if (payload.successorBondVout !== undefined) {
    rows.push('<div class="result-item"><label>Successor Bond Vout</label><p class="field-value">' + escapeHtml(String(payload.successorBondVout)) + "</p></div>");
  }
  if (payload.flags !== undefined) {
    rows.push('<div class="result-item"><label>Flags</label><p class="field-value">' + escapeHtml(String(payload.flags)) + "</p></div>");
  }
  if (payload.bidAmountSats !== undefined) {
    rows.push('<div class="result-item"><label>Bid Amount</label><p class="field-value">' + escapeHtml(formatSats(payload.bidAmountSats)) + "</p></div>");
  }
  if (payload.reservedLockBlocks !== undefined) {
    rows.push('<div class="result-item"><label>Reserved Lock</label><p class="field-value">' + escapeHtml(formatBlockWindow(payload.reservedLockBlocks)) + "</p></div>");
  }
  if (payload.bidderCommitment) {
    rows.push('<div class="result-item"><label>Bidder Commitment</label>' + renderCopyableCode(payload.bidderCommitment) + "</div>");
  }
  if (payload.auctionLotCommitment) {
    rows.push('<div class="result-item"><label>Auction Lot Commitment</label>' + renderCopyableCode(payload.auctionLotCommitment) + "</div>");
  }
  if (payload.auctionCommitment) {
    rows.push('<div class="result-item"><label>Auction State Commitment</label>' + renderCopyableCode(payload.auctionCommitment) + "</div>");
  }
  if (payload.leafCount !== undefined) {
    rows.push('<div class="result-item"><label>Leaf Count</label><p class="field-value">' + escapeHtml(String(payload.leafCount)) + "</p></div>");
  }
  if (payload.merkleRoot) {
    rows.push('<div class="result-item"><label>Merkle Root</label>' + renderCopyableCode(payload.merkleRoot) + "</div>");
  }
  if (payload.proofBytesLength !== undefined) {
    rows.push('<div class="result-item"><label>Proof Bytes</label><p class="field-value">' + escapeHtml(String(payload.proofBytesLength)) + "</p></div>");
  }
  if (payload.proofChunkCount !== undefined) {
    rows.push('<div class="result-item"><label>Proof Chunks</label><p class="field-value">' + escapeHtml(String(payload.proofChunkCount)) + "</p></div>");
  }
  if (payload.chunkIndex !== undefined) {
    rows.push('<div class="result-item"><label>Chunk Index</label><p class="field-value">' + escapeHtml(String(payload.chunkIndex)) + "</p></div>");
  }
  if (payload.proofBytesHex) {
    rows.push('<div class="result-item"><label>Proof Bytes Hex</label>' + renderCopyableCode(payload.proofBytesHex) + "</div>");
  }

  if (rows.length === 0) {
    return "";
  }

  return '<div class="result-grid">' + rows.join("") + "</div>";
}

function renderValueRecordPreview(valueRecord) {
  if (!valueRecord) {
    return '<p class="field-value">No published value record yet.</p>';
  }

  if (String(valueRecord.payloadHex ?? "").length === 0 || Number(valueRecord.valueType) === 0) {
    return '<p class="field-value">Null / cleared value</p>';
  }

  const bundle = Number(valueRecord.valueType) === 255
    ? decodeProfileBundlePayloadHex(valueRecord.payloadHex)
    : null;
  if (bundle !== null) {
    return renderProfileBundlePreview(bundle);
  }

  const utf8Preview = decodeValuePayloadUtf8(valueRecord.payloadHex);
  if (utf8Preview !== null) {
    if (Number(valueRecord.valueType) === 2 && /^https?:\\/\\//i.test(utf8Preview)) {
      return (
        '<p class="field-value"><a class="detail-link" href="' +
        escapeHtml(utf8Preview) +
        '" target="_blank" rel="noreferrer noopener">' +
        escapeHtml(utf8Preview) +
        "</a></p>"
      );
    }

    return '<p class="field-value">' + escapeHtml(utf8Preview) + '</p>';
  }

  return renderCopyableCode(valueRecord.payloadHex);
}

function formatValueRecordMeta(valueRecord) {
  if (!valueRecord) {
    return "No value record";
  }

  return "type " + formatValueType(valueRecord.valueType, valueRecord.payloadHex) + " · sequence " + String(valueRecord.sequence);
}

function formatValueType(valueType, payloadHex) {
  switch (Number(valueType)) {
    case 0:
      return "0x00 (null)";
    case 1:
      return "0x01 (bitcoin payment target)";
    case 2:
      return "0x02 (https target)";
    case 255:
      return decodeProfileBundlePayloadHex(payloadHex) !== null
        ? "0xff (key/value bundle)"
        : "0xff (raw/app-defined)";
    default:
      return "0x" + Number(valueType).toString(16).padStart(2, "0");
  }
}

function renderProfileBundlePreview(bundle) {
  const rows = listProfileBundleEntries(bundle)
    .map((entry) => {
      return (
        '<div class="value-bundle-preview-row">' +
        '<label>' + escapeHtml(entry.key) + "</label>" +
        '<p class="field-value">' + renderBundleValue(entry.value) + "</p>" +
        "</div>"
      );
    })
    .join("");

  return '<div class="value-bundle-preview">' + rows + "</div>";
}

function listProfileBundleEntries(bundle) {
  return Array.isArray(bundle.entries)
    ? bundle.entries
        .map((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            return null;
          }

          const key = typeof entry.key === "string" ? entry.key.trim() : "";
          const value = typeof entry.value === "string" ? entry.value.trim() : "";
          return key !== "" && value !== "" ? { key, value } : null;
        })
        .filter(Boolean)
    : [];
}

function renderBundleValue(value) {
  if (/^https?:\\/\\//i.test(value) || /^bitcoin:/i.test(value)) {
    return (
      '<a class="detail-link" href="' +
      escapeHtml(value) +
      '" target="_blank" rel="noreferrer noopener">' +
      escapeHtml(value) +
      "</a>"
    );
  }

  return escapeHtml(value);
}

function decodeProfileBundlePayloadHex(payloadHex) {
  const text = decodeValuePayloadUtf8(payloadHex);
  if (text === null) {
    return null;
  }

  try {
    const payload = JSON.parse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return null;
    }

    if (payload.kind !== "gns-key-value-bundle") {
      return null;
    }

    if (payload.version === 1 && Array.isArray(payload.entries)) {
      return {
        kind: payload.kind,
        version: 1,
        entries: listProfileBundleEntries(payload)
      };
    }

    return null;
  } catch {
    return null;
  }
}

function decodeValuePayloadUtf8(payloadHex) {
  try {
    const bytes = hexToBytes(payloadHex);
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);

    if (/^[\\x09\\x0a\\x0d\\x20-\\x7e]*$/.test(decoded)) {
      return decoded;
    }

    return null;
  } catch {
    return null;
  }
}

function hexToBytes(hex) {
  const normalized = String(hex).trim().toLowerCase();
  if (normalized.length % 2 !== 0 || /[^0-9a-f]/.test(normalized)) {
    throw new Error("invalid hex");
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }

  return bytes;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll(String.fromCharCode(34), "&quot;")
    .replaceAll("'", "&#39;");
}

function renderAuctionLab() {
  if (!elements.auctionLabList) {
    return;
  }

  const auctionLab = state.auctionLab;
  if (!auctionLab || !Array.isArray(auctionLab.cases)) {
    elements.auctionLabList.classList.add("empty");
    elements.auctionLabList.innerHTML = '<div class="result-card empty">No auction lab payload is available yet.</div>';
    if (elements.auctionPolicySummary) {
      elements.auctionPolicySummary.innerHTML = "";
    }
    setText(
      elements.auctionLabMeta,
      "Waiting for the reserved-auction lab payload."
    );
    return;
  }

  elements.auctionLabList.classList.remove("empty");
  syncAuctionPolicyControlsFromState();
  if (elements.auctionPolicySummary) {
    elements.auctionPolicySummary.innerHTML = renderAuctionPolicySummary(auctionLab.policy ?? null);
  }
  const activeOverrides = getAuctionLabPolicyOverridesFromLocation();
  setText(
    elements.auctionLabMeta,
    [
      String(auctionLab.cases.length) + " experimental auction state" + (auctionLab.cases.length === 1 ? "" : "s"),
      activeOverrides.noBidReleaseBlocks == null
        ? "using current stub reserved-class floors and lock durations"
        : "using a custom no-bid release window override",
      "website/API/tests are all reading the same fixture set"
    ].join(" · ")
  );
  elements.auctionLabList.innerHTML = auctionLab.cases
    .map((auctionCase) => renderAuctionCaseCard(auctionCase))
    .join("");
}

function renderExperimentalAuctionFeed() {
  if (!elements.experimentalAuctionList) {
    return;
  }

  const payload = state.experimentalAuctions;
  if (!payload || !Array.isArray(payload.auctions)) {
    elements.experimentalAuctionList.classList.add("empty");
    elements.experimentalAuctionList.innerHTML = '<div class="result-card empty">No chain-derived experimental auction state is available yet.</div>';
    setText(
      elements.experimentalAuctionMeta,
      "Waiting for resolver-backed experimental auction state."
    );
    return;
  }

  elements.experimentalAuctionList.classList.remove("empty");
  setText(
    elements.experimentalAuctionMeta,
    [
      String(payload.auctions.length) + " catalog lot" + (payload.auctions.length === 1 ? "" : "s"),
      payload.currentBlockHeight == null ? "resolver has not reached a current block yet" : "derived at block " + String(payload.currentBlockHeight),
      "leaders, stale bid rejection, and settlement summaries come from observed AUCTION_BID transactions"
    ].join(" · ")
  );
  elements.experimentalAuctionList.innerHTML = payload.auctions
    .map((auction) => renderExperimentalAuctionCard(auction))
    .join("");
}

function renderAuctionPolicySummary(policy) {
  if (!policy || typeof policy !== "object") {
    return "";
  }

  const reservedClasses = policy.reservedClasses && typeof policy.reservedClasses === "object"
    ? Object.entries(policy.reservedClasses)
    : [];
  const topRow = [
    {
      title: "Base window",
      value: formatBlockWindow(policy.auction?.baseWindowBlocks)
    },
    {
      title: "No-bid release",
      value: formatBlockWindow(policy.auction?.noBidReleaseBlocks)
    },
    {
      title: "Soft close",
      value: formatBlockWindow(policy.auction?.softCloseExtensionBlocks)
    },
    {
      title: "Min increment",
      value:
        formatSats(policy.auction?.minimumIncrementAbsoluteSats ?? "0") +
        " or " +
        String((Number(policy.auction?.minimumIncrementBasisPoints ?? 0) / 100).toFixed(2)) +
        "%"
    },
    {
      title: "Soft-close increment",
      value:
        formatSats(policy.auction?.softCloseMinimumIncrementAbsoluteSats ?? "0") +
        " or " +
        String((Number(policy.auction?.softCloseMinimumIncrementBasisPoints ?? 0) / 100).toFixed(2)) +
        "%"
    }
  ];

  return [
    '<article class="guide-card">',
    "  <h3>Current Prototype Policy</h3>",
    '  <div class="result-grid">',
    topRow
      .map((row) => {
        return (
          '<div class="result-item"><label>' +
          escapeHtml(row.title) +
          '</label><p class="field-value">' +
          escapeHtml(row.value) +
          "</p></div>"
        );
      })
      .join(""),
    "  </div>",
    "</article>",
    ...reservedClasses.map(([classId, entry]) => {
      return [
        '<article class="guide-card">',
        "  <h3>" + escapeHtml(String(entry.label ?? classId)) + "</h3>",
        '  <div class="result-grid">',
        '    <div class="result-item"><label>Opening floor</label><p class="field-value">' + escapeHtml(formatSats(entry.floorSats ?? "0")) + "</p></div>",
        '    <div class="result-item"><label>Lock length</label><p class="field-value">' + escapeHtml(formatBlockWindow(entry.lockBlocks)) + "</p></div>",
        '    <div class="result-item"><label>Class id</label><p class="field-value">' + escapeHtml(String(classId)) + "</p></div>",
        "  </div>",
        "</article>"
      ].join("");
    })
  ].join("");
}

function renderAuctionCaseCard(auctionCase) {
  const stateView = auctionCase.state ?? {};
  const caseId = caseIdFromAuctionState(auctionCase.id, stateView.normalizedName);
  const phase = String(stateView.phase ?? "unknown");
  const defaultBidderId = "operator_" + caseId.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
  const defaultBidAmount = String(
    stateView.currentRequiredMinimumBidSats
    ?? stateView.openingMinimumBidSats
    ?? stateView.currentHighestBidSats
    ?? "0"
  );
  const phasePill = mapAuctionPhasePill(phase);
  const leaderLabel = phase === "settled" ? "Winner" : "Current leader";
  const nextBidLabel =
    phase === "released_to_ordinary_lane"
      ? "Ordinary-lane floor"
      : phase === "soft_close"
        ? "Next valid bid (extends close)"
        : "Next valid bid";
  const closeLabel = phase === "pending_unlock"
    ? "Unlock block"
    : phase === "released_to_ordinary_lane"
      ? "Released at block"
    : phase === "awaiting_opening_bid"
      ? "No-bid release"
      : "Auction close";
  const closeValue =
    phase === "pending_unlock"
      ? String(stateView.unlockBlock ?? "-")
      : phase === "released_to_ordinary_lane"
        ? String(stateView.noBidReleaseBlock ?? "-")
      : phase === "awaiting_opening_bid"
        ? String(stateView.noBidReleaseBlock ?? "-")
        : stateView.auctionCloseBlockAfter == null
          ? "-"
          : String(stateView.auctionCloseBlockAfter);
  const nextBidValue =
    phase === "released_to_ordinary_lane"
      ? formatSats(stateView.ordinaryMinimumBidSats ?? "0")
      : stateView.currentRequiredMinimumBidSats
        ? formatSats(stateView.currentRequiredMinimumBidSats)
        : "Auction settled";
  const secondaryTimingLabel =
    phase === "awaiting_opening_bid" || phase === "released_to_ordinary_lane"
      ? "Blocks to release"
      : "Blocks to close";
  const secondaryTimingValue =
    phase === "awaiting_opening_bid" || phase === "released_to_ordinary_lane"
      ? (stateView.blocksUntilNoBidRelease == null ? "-" : String(stateView.blocksUntilNoBidRelease))
      : (stateView.blocksUntilClose == null ? "-" : String(stateView.blocksUntilClose));

  return [
    '<article class="activity-card">',
    '  <div class="result-title">',
    '    <h3>' + escapeHtml(String(auctionCase.title ?? stateView.normalizedName ?? "Reserved auction")) + "</h3>",
    '    <span class="status-pill ' + escapeHtml(phasePill) + '">' + escapeHtml(String(stateView.phaseLabel ?? phase)) + "</span>",
    "  </div>",
    '  <p class="field-value">' + escapeHtml(String(auctionCase.description ?? "")) + "</p>",
    '  <div class="result-grid">',
    '    <div class="result-item"><label>Name</label><p class="field-value">' + escapeHtml(String(stateView.normalizedName ?? "-")) + "</p></div>",
    '    <div class="result-item"><label>Class</label><p class="field-value">' + escapeHtml(String(stateView.classLabel ?? "-")) + "</p></div>",
    '    <div class="result-item"><label>Observed block</label><p class="field-value">' + escapeHtml(String(stateView.currentBlockHeight ?? "-")) + "</p></div>",
    '    <div class="result-item"><label>' + escapeHtml(closeLabel) + '</label><p class="field-value">' + escapeHtml(closeValue) + "</p></div>",
    '    <div class="result-item"><label>Ordinary-lane floor</label><p class="field-value">' + escapeHtml(formatSats(stateView.ordinaryMinimumBidSats ?? "0")) + "</p></div>",
    '    <div class="result-item"><label>Opening minimum</label><p class="field-value">' + escapeHtml(formatSats(stateView.openingMinimumBidSats ?? "0")) + "</p></div>",
    '    <div class="result-item"><label>' + escapeHtml(leaderLabel) + '</label><p class="field-value">' + escapeHtml(stateView.currentLeaderBidderId ?? "None yet") + "</p></div>",
    '    <div class="result-item"><label>Highest bid</label><p class="field-value">' + escapeHtml(stateView.currentHighestBidSats ? formatSats(stateView.currentHighestBidSats) : "None yet") + "</p></div>",
    '    <div class="result-item"><label>' + escapeHtml(nextBidLabel) + '</label><p class="field-value">' + escapeHtml(nextBidValue) + "</p></div>",
    '    <div class="result-item"><label>Accepted / rejected</label><p class="field-value">' + escapeHtml(String(stateView.acceptedBidCount ?? 0) + " / " + String(stateView.rejectedBidCount ?? 0)) + "</p></div>",
    '    <div class="result-item"><label>Reserved lock</label><p class="field-value">' + escapeHtml(formatBlockWindow(stateView.reservedLockBlocks)) + "</p></div>",
    '    <div class="result-item"><label>Blocks to unlock</label><p class="field-value">' + escapeHtml(String(stateView.blocksUntilUnlock ?? 0)) + "</p></div>",
    '    <div class="result-item"><label>' + escapeHtml(secondaryTimingLabel) + '</label><p class="field-value">' + escapeHtml(secondaryTimingValue) + "</p></div>",
    "  </div>",
    renderAuctionBidPackageComposer({
      source: "lab",
      id: caseId,
      phase,
      normalizedName: stateView.normalizedName,
      defaultBidAmount,
      defaultBidderId,
      note:
        stateView.phase === "soft_close"
          ? "Soft close is active. A bid from this state must clear the stronger late-extension increment."
          : "Build a bid package from the simulator state shown on this card.",
      fallbackPath: buildClaimPrepPath(stateView.normalizedName ?? "")
    }),
    renderAuctionBidHistory(stateView.visibleBidOutcomes),
    "</article>"
  ].join("");
}

function renderExperimentalAuctionCard(auction) {
  const phase = String(auction.phase ?? "unknown");
  const phasePill = mapAuctionPhasePill(phase);
  const leaderLabel = phase === "settled" ? "Winner commitment" : "Leader commitment";
  const nextBidLabel =
    phase === "released_to_ordinary_lane"
      ? "Ordinary-lane floor"
      : phase === "soft_close"
        ? "Next valid bid (extends close)"
        : "Next valid bid";
  const nextBidValue =
    phase === "released_to_ordinary_lane"
      ? formatSats(auction.ordinaryMinimumBidSats ?? "0")
      : auction.currentRequiredMinimumBidSats
        ? formatSats(auction.currentRequiredMinimumBidSats)
        : "Auction settled";
  const settlementLabel =
    phase === "released_to_ordinary_lane"
      ? "Ordinary lane"
      : phase === "settled"
        ? "Winner release"
        : "Settlement";
  const settlementValue =
    phase === "released_to_ordinary_lane"
      ? (auction.noBidReleaseBlock == null ? "Released to ordinary lane" : "released at block " + String(auction.noBidReleaseBlock))
      : phase === "settled"
      ? (auction.winnerBondReleaseBlock == null ? "-" : "block " + String(auction.winnerBondReleaseBlock))
      : "Not settled";
  const closeLabel =
    phase === "released_to_ordinary_lane"
      ? "Released at block"
      : "Blocks to close";
  const closeValue =
    phase === "released_to_ordinary_lane"
      ? String(auction.noBidReleaseBlock ?? "-")
      : (auction.blocksUntilClose == null ? "-" : String(auction.blocksUntilClose));

  return [
    '<article class="activity-card">',
    '  <div class="result-title">',
    '    <h3>' + escapeHtml(String(auction.title ?? auction.normalizedName ?? "Experimental auction")) + "</h3>",
    '    <span class="status-pill ' + escapeHtml(phasePill) + '">' + escapeHtml(String(auction.phaseLabel ?? phase)) + "</span>",
    "  </div>",
    '  <p class="field-value">' + escapeHtml(String(auction.description ?? "")) + "</p>",
    '  <div class="result-grid">',
    '    <div class="result-item"><label>Name</label><p class="field-value">' + escapeHtml(String(auction.normalizedName ?? "-")) + "</p></div>",
    '    <div class="result-item"><label>Class</label><p class="field-value">' + escapeHtml(String(auction.classLabel ?? "-")) + "</p></div>",
    '    <div class="result-item"><label>Lot commitment</label><p class="field-value">' + escapeHtml(formatAuctionCommitment(auction.auctionLotCommitment)) + "</p></div>",
    '    <div class="result-item"><label>Current block</label><p class="field-value">' + escapeHtml(String(auction.currentBlockHeight ?? "-")) + "</p></div>",
    '    <div class="result-item"><label>Ordinary-lane floor</label><p class="field-value">' + escapeHtml(formatSats(auction.ordinaryMinimumBidSats ?? "0")) + "</p></div>",
    '    <div class="result-item"><label>Opening minimum</label><p class="field-value">' + escapeHtml(formatSats(auction.openingMinimumBidSats ?? "0")) + "</p></div>",
    '    <div class="result-item"><label>' + escapeHtml(leaderLabel) + '</label><p class="field-value">' + escapeHtml(formatAuctionCommitment(auction.currentLeaderBidderCommitment)) + "</p></div>",
    '    <div class="result-item"><label>Highest bid</label><p class="field-value">' + escapeHtml(auction.currentHighestBidSats ? formatSats(auction.currentHighestBidSats) : "None yet") + "</p></div>",
    '    <div class="result-item"><label>' + escapeHtml(nextBidLabel) + '</label><p class="field-value">' + escapeHtml(nextBidValue) + "</p></div>",
    '    <div class="result-item"><label>Accepted / rejected</label><p class="field-value">' + escapeHtml(String(auction.acceptedBidCount ?? 0) + " / " + String(auction.rejectedBidCount ?? 0)) + "</p></div>",
    '    <div class="result-item"><label>Observed bids</label><p class="field-value">' + escapeHtml(String(auction.totalObservedBidCount ?? 0)) + "</p></div>",
    '    <div class="result-item"><label>Blocks to unlock</label><p class="field-value">' + escapeHtml(String(auction.blocksUntilUnlock ?? 0)) + "</p></div>",
    '    <div class="result-item"><label>' + escapeHtml(closeLabel) + '</label><p class="field-value">' + escapeHtml(closeValue) + "</p></div>",
    '    <div class="result-item"><label>Accepted capital locked</label><p class="field-value">' + escapeHtml(formatSats(auction.currentlyLockedAcceptedBidAmountSats ?? "0")) + " (" + escapeHtml(String(auction.currentlyLockedAcceptedBidCount ?? 0)) + ")</p></div>",
    '    <div class="result-item"><label>Accepted capital releasable</label><p class="field-value">' + escapeHtml(formatSats(auction.releasableAcceptedBidAmountSats ?? "0")) + " (" + escapeHtml(String(auction.releasableAcceptedBidCount ?? 0)) + ")</p></div>",
    '    <div class="result-item"><label>' + escapeHtml(settlementLabel) + '</label><p class="field-value">' + escapeHtml(settlementValue) + "</p></div>",
    '    <div class="result-item"><label>Winner tx</label><p class="field-value">' + escapeHtml(auction.winnerBidTxid ? shortenTxid(auction.winnerBidTxid) : "Not settled") + "</p></div>",
    "  </div>",
    renderAuctionBidPackageComposer({
      source: "experimental",
      id: caseIdFromAuctionState(auction.auctionId, auction.normalizedName),
      phase,
      normalizedName: auction.normalizedName,
      defaultBidAmount: String(
        auction.currentRequiredMinimumBidSats
        ?? auction.openingMinimumBidSats
        ?? auction.currentHighestBidSats
        ?? "0"
      ),
      defaultBidderId: "operator_" + String(auction.auctionId ?? auction.normalizedName ?? "auction")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase(),
      note:
        phase === "soft_close"
          ? "Built from current resolver-derived state. A soft-close extension bid must clear the stronger late increment and may go stale if another bid lands first."
          : "Build a bid package from the current resolver-derived experimental auction state.",
      fallbackPath: buildClaimPrepPath(auction.normalizedName ?? "")
    }),
    renderExperimentalAuctionBidHistory(auction.visibleBidOutcomes),
    "</article>"
  ].join("");
}

function caseIdFromAuctionState(id, fallbackName) {
  return String(id ?? fallbackName ?? "auction-case");
}

function renderAuctionBidPackageComposer(input) {
  const domKey = buildAuctionPackageDomKey(input.source, input.id);

  if (input.phase === "released_to_ordinary_lane") {
    return [
      '<details class="detail-technical">',
      "  <summary>Auction bid packages unavailable</summary>",
      '  <div class="detail-technical-body">',
      '    <p class="tx-panel-note">This lot attracted no valid opening bid before the release window ended, so it has fallen back to the ordinary lane.</p>',
      '    <p><a class="action-link" href="' + escapeHtml(input.fallbackPath) + '">Prepare an ordinary claim</a></p>',
      "  </div>",
      "</details>"
    ].join("");
  }

  if (input.phase === "settled") {
    return [
      '<details class="detail-technical">',
      "  <summary>Auction bid packages unavailable</summary>",
      '  <div class="detail-technical-body">',
      '    <p class="tx-panel-note">This auction is already settled. Review the winner and release details above instead of preparing another bid package.</p>',
      "  </div>",
      "</details>"
    ].join("");
  }

  return [
    '<details class="detail-technical">',
    "  <summary>Preview or download bid package</summary>",
    '  <div class="detail-technical-body draft-grid">',
    '    <div class="field"><label class="field-label" for="auction-bidder-' + escapeHtml(domKey) + '">Bidder id</label><input id="auction-bidder-' + escapeHtml(domKey) + '" type="text" data-auction-bidder-id="' + escapeHtml(input.id) + '" data-auction-package-source="' + escapeHtml(input.source) + '" value="' + escapeHtml(input.defaultBidderId) + '" /></div>',
    '    <div class="field"><label class="field-label" for="auction-amount-' + escapeHtml(domKey) + '">Bid amount (sats)</label><input id="auction-amount-' + escapeHtml(domKey) + '" type="text" inputmode="numeric" data-auction-bid-amount="' + escapeHtml(input.id) + '" data-auction-package-source="' + escapeHtml(input.source) + '" value="' + escapeHtml(input.defaultBidAmount) + '" /></div>',
    '    <div class="draft-field-full">',
    '      <div class="field-actions">',
    '        <button type="button" data-auction-package-action="preview" data-auction-package-source="' + escapeHtml(input.source) + '" data-auction-package-id="' + escapeHtml(input.id) + '">Preview bid package</button>',
    '        <button type="button" class="secondary-button" data-auction-package-action="download" data-auction-package-source="' + escapeHtml(input.source) + '" data-auction-package-id="' + escapeHtml(input.id) + '">Download bid package</button>',
    "      </div>",
    '      <p class="tx-panel-note" data-auction-package-result="' + escapeHtml(domKey) + '">' + escapeHtml(input.note) + "</p>",
    '      <div data-auction-package-preview="' + escapeHtml(domKey) + '"></div>',
    "    </div>",
    "  </div>",
    "</details>"
  ].join("");
}

function buildAuctionPackageDomKey(source, id) {
  return String(source) + ":" + String(id);
}

function setAuctionBidPackageMessage(domKey, message) {
  const node = document.querySelector('[data-auction-package-result="' + cssEscape(domKey) + '"]');
  if (node instanceof HTMLElement) {
    node.textContent = message;
  }
}

function setAuctionBidPackagePreview(domKey, html) {
  const node = document.querySelector('[data-auction-package-preview="' + cssEscape(domKey) + '"]');
  if (node instanceof HTMLElement) {
    node.innerHTML = html;
  }
}

async function buildAuctionBidPackageForUi(input) {
  const policyOverrides = getAuctionLabPolicyOverridesFromLocation();
  const body = {
    bidderId: input.bidderId,
    bidAmountSats: input.bidAmountSats
  };

  if (input.source === "experimental") {
    return await postJson(withBasePath("/api/experimental-auction-bid-package"), {
      ...body,
      auctionId: input.id
    });
  }

  return await postJson(withBasePath("/api/auction-bid-package"), {
    ...body,
    caseId: input.id,
    ...(policyOverrides.noBidReleaseBlocks == null
      ? {}
      : {
          noBidReleaseBlocks: policyOverrides.noBidReleaseBlocks
        })
  });
}

function renderAuctionBidPackagePreview(pkg, sourceLabel) {
  return [
    '<article class="guide-card">',
    "  <h3>Bid Package Preview</h3>",
    '  <p class="field-value">' + escapeHtml(String(pkg.previewSummary ?? "Bid package ready.")) + "</p>",
    '  <div class="result-grid">',
    '    <div class="result-item"><label>Observed source</label><p class="field-value">' + escapeHtml(sourceLabel) + "</p></div>",
    '    <div class="result-item"><label>Preview status</label><p class="field-value">' + escapeHtml(formatAuctionPreviewStatus(pkg.previewStatus)) + "</p></div>",
    '    <div class="result-item"><label>Bid amount</label><p class="field-value">' + escapeHtml(formatSats(pkg.bidAmountSats ?? "0")) + "</p></div>",
    '    <div class="result-item"><label>Required minimum</label><p class="field-value">' + escapeHtml(pkg.previewRequiredMinimumBidSats ? formatSats(pkg.previewRequiredMinimumBidSats) : "Not applicable") + "</p></div>",
    '    <div class="result-item"><label>Would become leader</label><p class="field-value">' + escapeHtml(pkg.wouldBecomeLeader ? "Yes" : "No") + "</p></div>",
    '    <div class="result-item"><label>Would extend soft close</label><p class="field-value">' + escapeHtml(pkg.wouldExtendSoftClose ? "Yes" : "No") + "</p></div>",
    '    <div class="result-item"><label>Bidder commitment</label>' + renderCopyableCode(pkg.bidderCommitment) + "</div>",
    '    <div class="result-item"><label>State commitment</label>' + renderCopyableCode(pkg.auctionStateCommitment) + "</div>",
    '    <div class="result-item"><label>Lot commitment</label>' + renderCopyableCode(pkg.auctionLotCommitment) + "</div>",
    '    <div class="result-item"><label>Reserved lock</label><p class="field-value">' + escapeHtml(formatBlockWindow(pkg.reservedLockBlocks)) + "</p></div>",
    "  </div>",
    '  <ul class="guide-list">',
    '    <li>Save the package if you want a durable handoff from this observed auction state.</li>',
    '    <li>Next CLI step: build the unsigned bid artifacts from this package, then sign and broadcast them with the funding wallet.</li>',
    '    <li>If another bid lands first, rebuild the package from the latest state before signing.</li>',
    "  </ul>",
    "</article>"
  ].join("");
}

function formatAuctionPreviewStatus(value) {
  switch (value) {
    case "too_early":
      return "Too early";
    case "below_minimum":
      return "Below minimum";
    case "currently_valid":
      return "Currently valid";
    case "auction_closed":
      return "Auction closed";
    default:
      return typeof value === "string" && value.length > 0 ? value : "Unknown";
  }
}

function renderAuctionBidHistory(outcomes) {
  if (!Array.isArray(outcomes) || outcomes.length === 0) {
    return '<p class="tx-panel-note">No visible bid attempts yet at this block height.</p>';
  }

  return [
    '<details class="detail-technical">',
    "  <summary>Visible bid attempts</summary>",
    '  <div class="detail-technical-body">',
    '    <div class="tx-event-list">',
    outcomes
      .map((outcome) => {
        return [
          '<article class="tx-event-card">',
          '  <div class="tx-event-header">',
          "    <strong>" + escapeHtml(String(outcome.bidderId ?? "unknown")) + "</strong>",
          '    <span class="tx-pill ' + escapeHtml(String(outcome.status ?? "rejected")) + '">' + escapeHtml(String(outcome.status ?? "rejected")) + "</span>",
          '    <span class="inline-note">block ' + escapeHtml(String(outcome.blockHeight ?? "-")) + "</span>",
          "  </div>",
          '  <p class="tx-event-meta">Attempted ' + escapeHtml(formatSats(outcome.amountSats ?? "0")) + " · " + escapeHtml(String(outcome.reason ?? "unknown")) + "</p>",
          '  <div class="result-grid">',
          '    <div class="result-item"><label>Required minimum</label><p class="field-value">' + escapeHtml(formatSats(outcome.requiredMinimumBidSats ?? "0")) + "</p></div>",
          '    <div class="result-item"><label>Highest after</label><p class="field-value">' + escapeHtml(outcome.highestBidSatsAfter ? formatSats(outcome.highestBidSatsAfter) : "None yet") + "</p></div>",
          '    <div class="result-item"><label>Close after</label><p class="field-value">' + escapeHtml(outcome.auctionCloseBlockAfter == null ? "-" : String(outcome.auctionCloseBlockAfter)) + "</p></div>",
          "  </div>",
          "</article>"
        ].join("");
      })
      .join(""),
    "    </div>",
    "  </div>",
    "</details>"
  ].join("");
}

function renderExperimentalAuctionBidHistory(outcomes) {
  if (!Array.isArray(outcomes) || outcomes.length === 0) {
    return '<p class="tx-panel-note">No AUCTION_BID transactions for this catalog lot have been observed yet.</p>';
  }

  return [
    '<details class="detail-technical">',
    "  <summary>Observed AUCTION_BID transactions</summary>",
    '  <div class="detail-technical-body">',
    '    <div class="tx-event-list">',
    outcomes
      .map((outcome) => {
        return [
          '<article class="tx-event-card">',
          '  <div class="tx-event-header">',
          '    <strong>' + escapeHtml(formatAuctionCommitment(outcome.bidderCommitment)) + "</strong>",
          '    <span class="status-pill ' + escapeHtml(outcome.status === "accepted" ? "status-pending" : "status-invalid") + '">' + escapeHtml(String(outcome.status)) + "</span>",
          "  </div>",
          '  <div class="result-grid">',
          '    <div class="result-item"><label>Bid</label><p class="field-value">' + escapeHtml(formatSats(outcome.amountSats)) + "</p></div>",
          '    <div class="result-item"><label>Block</label><p class="field-value">' + escapeHtml(String(outcome.blockHeight)) + "</p></div>",
          '    <div class="result-item"><label>Outcome</label><p class="field-value">' + escapeHtml(String(outcome.reason)) + "</p></div>",
          '    <div class="result-item"><label>Required minimum</label><p class="field-value">' + escapeHtml(formatSats(outcome.requiredMinimumBidSats)) + "</p></div>",
          '    <div class="result-item"><label>Tx</label><p class="field-value">' + escapeHtml(shortenTxid(outcome.txid)) + "</p></div>",
          '    <div class="result-item"><label>Close after</label><p class="field-value">' + escapeHtml(outcome.auctionCloseBlockAfter == null ? "-" : String(outcome.auctionCloseBlockAfter)) + "</p></div>",
          '    <div class="result-item"><label>State commitment</label><p class="field-value">' + escapeHtml(outcome.stateCommitmentMatched ? "Matched observed state" : "Stale or mismatched") + "</p></div>",
          '    <div class="result-item"><label>Bond status</label><p class="field-value">' + escapeHtml(formatAuctionBondStatus(outcome.bondStatus)) + "</p></div>",
          '    <div class="result-item"><label>Bond release</label><p class="field-value">' + escapeHtml(outcome.bondReleaseBlock == null ? "-" : "block " + String(outcome.bondReleaseBlock)) + "</p></div>",
          '    <div class="result-item"><label>Bond spend</label><p class="field-value">' + escapeHtml(formatAuctionBondSpendStatus(outcome.bondSpendStatus)) + "</p></div>",
          '    <div class="result-item"><label>Spent by tx</label><p class="field-value">' + escapeHtml(outcome.bondSpentTxid ? shortenTxid(outcome.bondSpentTxid) : "-") + "</p></div>",
          '    <div class="result-item"><label>Spent at block</label><p class="field-value">' + escapeHtml(outcome.bondSpentBlockHeight == null ? "-" : String(outcome.bondSpentBlockHeight)) + "</p></div>",
          "  </div>",
          "</article>"
        ].join("");
      })
      .join(""),
    "    </div>",
    "  </div>",
    "</details>"
  ].join("");
}

function formatAuctionCommitment(value) {
  if (typeof value !== "string" || value.length === 0) {
    return "None yet";
  }

  if (value.length <= 16) {
    return value;
  }

  return value.slice(0, 12) + "…" + value.slice(-8);
}

function formatAuctionBondStatus(value) {
  switch (value) {
    case "rejected_not_tracked":
      return "Rejected / not tracked";
    case "replaced_by_self_rebid":
      return "Consumed by self-rebid";
    case "leading_locked":
      return "Leading bid locked";
    case "superseded_locked_until_settlement":
      return "Superseded until settlement";
    case "losing_bid_releasable":
      return "Losing bid releasable";
    case "winner_locked":
      return "Winner locked";
    case "winner_releasable":
      return "Winner releasable";
    default:
      return typeof value === "string" && value.length > 0 ? value : "Unknown";
  }
}

function formatAuctionBondSpendStatus(value) {
  switch (value) {
    case "not_applicable":
      return "Not tracked";
    case "unspent":
      return "Unspent";
    case "replacement_spend":
      return "Consumed by replacement rebid";
    case "spent_after_allowed_release":
      return "Spent after allowed release";
    case "spent_before_allowed_release":
      return "Spent before allowed release";
    default:
      return typeof value === "string" && value.length > 0 ? value : "Unknown";
  }
}

function mapAuctionPhasePill(phase) {
  switch (phase) {
    case "pending_unlock":
      return "pending";
    case "awaiting_opening_bid":
      return "available";
    case "released_to_ordinary_lane":
      return "available";
    case "live_bidding":
      return "immature";
    case "soft_close":
      return "transfer";
    case "settled":
      return "mature";
    default:
      return "invalid";
  }
}

function formatBlockWindow(value) {
  const blocks = Number(value ?? 0);
  if (!Number.isFinite(blocks) || blocks <= 0) {
    return "0 blocks";
  }

  const days = blocks / 144;
  if (days >= 365) {
    return (days / 365).toFixed(days % 365 === 0 ? 0 : 1) + " years";
  }
  if (days >= 30) {
    return (days / 30).toFixed(days % 30 === 0 ? 0 : 1) + " months";
  }
  if (days >= 1) {
    return days.toFixed(days % 1 === 0 ? 0 : 1) + " days";
  }

  return String(blocks) + " blocks";
}

function getPrivateDemoBasePath() {
  return typeof state.config?.privateDemoBasePath === "string" && state.config.privateDemoBasePath.length > 0
    ? state.config.privateDemoBasePath
    : BASE_PATH;
}

function renderPrivateBatchSmokeStatus() {
  if (!elements.privateBatchSmokeResult) {
    return;
  }

  const batchSmoke = state.privateBatchSmokeStatus;
  if (!batchSmoke) {
    elements.privateBatchSmokeResult.classList.add("empty");
    elements.privateBatchSmokeResult.textContent = "No private signet batch smoke status is available yet.";
    setText(
      elements.privateBatchSmokeMeta,
      "Waiting for the first published private signet batched ordinary-claim smoke summary."
    );
    return;
  }

  const status = String(batchSmoke.status ?? "unknown");
  const alphaName = batchSmoke.names?.alpha ?? null;
  const betaName = batchSmoke.names?.beta ?? null;
  const transferName = batchSmoke.transfer?.name ?? null;
  const revealTxids = batchSmoke.revealTxids && typeof batchSmoke.revealTxids === "object"
    ? Object.values(batchSmoke.revealTxids).filter((value) => typeof value === "string")
    : [];
  const revealSummary =
    revealTxids.length === 0
      ? "Reveal txids unavailable"
      : String(revealTxids.length) + " reveal tx" + (revealTxids.length === 1 ? "" : "s");
  const privateDemoBasePath = getPrivateDemoBasePath();
  const nameLinks = [alphaName, betaName]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .map((name) => renderDetailLink(name, String(name), privateDemoBasePath))
    .join(" · ");
  const transferLink =
    typeof transferName === "string" && transferName.trim().length > 0
      ? renderDetailLink(transferName, transferName, privateDemoBasePath)
      : null;
  const actionLinks = [
    alphaName ? '<a class="action-link" href="' + escapeHtml(buildNameDetailPath(alphaName, privateDemoBasePath)) + '">Open alpha detail</a>' : "",
    betaName ? '<a class="action-link secondary" href="' + escapeHtml(buildNameDetailPath(betaName, privateDemoBasePath)) + '">Open beta detail</a>' : "",
    '<a class="action-link secondary" href="' + escapeHtml(withBasePath("/claim/offline", privateDemoBasePath)) + '">Open offline architect</a>',
    '<a class="action-link secondary" href="' + escapeHtml(withBasePath("/explore", privateDemoBasePath)) + '">Open explorer</a>'
  ]
    .filter(Boolean)
    .join("");

  setText(
    elements.privateBatchSmokeMeta,
    [
      "Status: " + formatLiveSmokeStatus(status),
      batchSmoke.completedAt
        ? "Updated " + new Date(batchSmoke.completedAt).toLocaleString()
        : batchSmoke.startedAt
          ? "Started " + new Date(batchSmoke.startedAt).toLocaleString()
          : null,
      revealSummary
    ]
      .filter(Boolean)
      .join(" · ")
  );

  elements.privateBatchSmokeResult.classList.remove("empty");
  elements.privateBatchSmokeResult.innerHTML = [
    '<div class="result-title">',
    '  <h3>' + escapeHtml(alphaName && betaName ? alphaName + " + " + betaName : batchSmoke.kind ?? "Private batch smoke") + '</h3>',
    '  <span class="status-pill ' + escapeHtml(mapLiveSmokeStatusPill(status)) + '">' + escapeHtml(formatLiveSmokeStatus(status)) + '</span>',
    '</div>',
    '<div class="result-grid">',
    '  <div class="result-item">',
    "    <label>Message</label>",
    '    <p class="field-value">' + escapeHtml(batchSmoke.message ?? "No message") + '</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Names</label>",
    nameLinks ? '    <p class="field-value">' + nameLinks + '</p>' : '    <p class="field-value">Not published</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Batch Commit Txid</label>",
    batchSmoke.batchCommitTxid ? renderCopyableCode(batchSmoke.batchCommitTxid) : '<p class="field-value">Not published</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Reveal Count</label>",
    '    <p class="field-value">' + escapeHtml(String(revealTxids.length)) + '</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Transferred Name</label>",
    transferLink ? '    <p class="field-value">' + transferLink + '</p>' : '    <p class="field-value">Not published</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Payer Funding Address</label>",
    batchSmoke.payerFundingAddress ? renderCopyableCode(batchSmoke.payerFundingAddress) : '<p class="field-value">Not published</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Resolver</label>",
    '    <p class="field-value">' + escapeHtml(batchSmoke.resolverUrl ?? "Unavailable") + '</p>',
    "  </div>",
    "</div>",
    actionLinks ? '<div class="result-actions">' + actionLinks + "</div>" : ""
  ].join("");
}

function renderPrivateAuctionSmokeStatus() {
  if (!elements.privateAuctionSmokeResult) {
    return;
  }

  const auctionSmoke = state.privateAuctionSmokeStatus;
  if (!auctionSmoke) {
    elements.privateAuctionSmokeResult.classList.add("empty");
    elements.privateAuctionSmokeResult.textContent = "No private signet auction smoke status is available yet.";
    setText(
      elements.privateAuctionSmokeMeta,
      "Waiting for the first published private signet experimental auction smoke summary."
    );
    return;
  }

  const status = String(auctionSmoke.status ?? "unknown");
  const privateDemoBasePath = getPrivateDemoBasePath();
  const auction = auctionSmoke.auction && typeof auctionSmoke.auction === "object" ? auctionSmoke.auction : {};
  const finalState = auctionSmoke.finalState && typeof auctionSmoke.finalState === "object" ? auctionSmoke.finalState : {};
  const phaseLabel =
    typeof finalState.phaseLabel === "string" && finalState.phaseLabel.length > 0
      ? finalState.phaseLabel
      : typeof finalState.phase === "string" && finalState.phase.length > 0
        ? finalState.phase
        : "State unavailable";
  const acceptedBidCount = Number(finalState.acceptedBidCount ?? 0);
  const totalObservedBidCount = Number(finalState.totalObservedBidCount ?? 0);
  const highestBidText = finalState.currentHighestBidSats ? formatSats(finalState.currentHighestBidSats) : "None yet";
  const nextBidText = finalState.currentRequiredMinimumBidSats ? formatSats(finalState.currentRequiredMinimumBidSats) : "Auction settled";
  const releaseCheck =
    auctionSmoke.releaseCheck && typeof auctionSmoke.releaseCheck === "object"
      ? auctionSmoke.releaseCheck
      : null;
  const releaseFinalState =
    releaseCheck?.finalState && typeof releaseCheck.finalState === "object"
      ? releaseCheck.finalState
      : {};
  const actionLinks = [
    '<a class="action-link" href="' + escapeHtml(withBasePath("/auctions", privateDemoBasePath)) + '">Open private auction lab</a>',
    '<a class="action-link secondary" href="' + escapeHtml(withBasePath("/explore", privateDemoBasePath)) + '">Open private explorer</a>'
  ]
    .filter(Boolean)
    .join("");

  setText(
    elements.privateAuctionSmokeMeta,
    [
      "Status: " + formatLiveSmokeStatus(status),
      auctionSmoke.completedAt
        ? "Updated " + new Date(auctionSmoke.completedAt).toLocaleString()
        : auctionSmoke.startedAt
          ? "Started " + new Date(auctionSmoke.startedAt).toLocaleString()
          : null,
      acceptedBidCount > 0 || totalObservedBidCount > 0
        ? String(acceptedBidCount) + " accepted / " + String(totalObservedBidCount) + " observed bids"
        : null,
      releaseCheck?.highlight?.lateBidReason
        ? "Release check: " + formatAuctionReason(releaseCheck.highlight.lateBidReason)
        : null
    ]
      .filter(Boolean)
      .join(" · ")
  );

  elements.privateAuctionSmokeResult.classList.remove("empty");
  elements.privateAuctionSmokeResult.innerHTML = [
    '<div class="result-title">',
    '  <h3>' + escapeHtml(String(auction.title ?? finalState.title ?? auctionSmoke.kind ?? "Private auction smoke")) + '</h3>',
    '  <span class="status-pill ' + escapeHtml(mapLiveSmokeStatusPill(status)) + '">' + escapeHtml(formatLiveSmokeStatus(status)) + '</span>',
    '</div>',
    '<div class="result-grid">',
    '  <div class="result-item">',
    "    <label>Message</label>",
    '    <p class="field-value">' + escapeHtml(auctionSmoke.message ?? "No message") + '</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Lot</label>",
    '    <p class="field-value">' + escapeHtml(String(auction.auctionId ?? finalState.auctionId ?? "Not published")) + '</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Name / class</label>",
    '    <p class="field-value">' + escapeHtml(String(auction.normalizedName ?? finalState.normalizedName ?? "-")) + " · " + escapeHtml(String(finalState.classLabel ?? auction.reservedClassId ?? "-")) + '</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Phase</label>",
    '    <p class="field-value">' + escapeHtml(String(phaseLabel)) + '</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Highest / next bid</label>",
    '    <p class="field-value">' + escapeHtml(highestBidText) + " / " + escapeHtml(nextBidText) + '</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Accepted / observed bids</label>",
    '    <p class="field-value">' + escapeHtml(String(acceptedBidCount) + " / " + String(totalObservedBidCount)) + '</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Opening Bid Txid</label>",
    auctionSmoke.alphaBid?.bidTxid ? renderCopyableCode(auctionSmoke.alphaBid.bidTxid) : '<p class="field-value">Not published</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Higher Bid Txid</label>",
    auctionSmoke.betaBid?.bidTxid ? renderCopyableCode(auctionSmoke.betaBid.bidTxid) : '<p class="field-value">Not published</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Early Spend Txid</label>",
    auctionSmoke.earlySpendTxid ? renderCopyableCode(auctionSmoke.earlySpendTxid) : '<p class="field-value">Not published</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Alpha spend status</label>",
    '    <p class="field-value">' + escapeHtml(formatAuctionBondSpendStatus(auctionSmoke.highlight?.alphaBondSpendStatus ?? null)) + '</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Beta bond status</label>",
    '    <p class="field-value">' + escapeHtml(formatAuctionBondStatus(auctionSmoke.highlight?.betaBondStatus ?? null)) + '</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Release Lot</label>",
    '    <p class="field-value">' + escapeHtml(String(releaseCheck?.auctionId ?? "Not published")) + '</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Release Phase</label>",
    '    <p class="field-value">' + escapeHtml(String(releaseFinalState.phaseLabel ?? releaseCheck?.highlight?.releasePhase ?? "Not published")) + '</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>No-Bid Release Block</label>",
    '    <p class="field-value">' + escapeHtml(String(releaseCheck?.noBidReleaseBlock ?? "Not published")) + '</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Late Bid Txid</label>",
    releaseCheck?.lateBidTxid ? renderCopyableCode(releaseCheck.lateBidTxid) : '<p class="field-value">Not published</p>',
    "  </div>",
    '  <div class="result-item">',
    "    <label>Late Bid Outcome</label>",
    '    <p class="field-value">' + escapeHtml(formatAuctionReason(releaseCheck?.highlight?.lateBidReason ?? null)) + '</p>',
    "  </div>",
    "</div>",
    actionLinks ? '<div class="result-actions">' + actionLinks + "</div>" : ""
  ].join("");
}
  `;
}
