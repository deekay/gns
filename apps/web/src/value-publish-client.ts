import {
  deriveOwnerPubkey,
  payloadUtf8ToHex,
  normalizeRawPayloadHex,
  signBrowserValueRecord,
  verifyBrowserValueRecord,
  type BrowserSignedValueRecord
} from "./browser-value-record.js";

type NameRecord = {
  readonly name: string;
  readonly status: string;
  readonly currentOwnerPubkey: string;
  readonly claimHeight: number;
  readonly maturityHeight: number;
  readonly requiredBondSats: string | number | bigint;
};

type ValueRecord = {
  readonly name: string;
  readonly ownerPubkey: string;
  readonly sequence: number;
  readonly valueType: number;
  readonly payloadHex: string;
  readonly exportedAt: string;
  readonly signature: string;
};

const BASE_PATH = document.body.dataset.basePath ?? "";

const elements = {
  lookupStep: document.getElementById("value-step-inspect"),
  lookupStepState: document.getElementById("valueStepInspectState"),
  signStep: document.getElementById("value-step-sign"),
  signStepState: document.getElementById("valueStepSignState"),
  publishStep: document.getElementById("value-step-publish"),
  publishStepState: document.getElementById("valueStepPublishState"),
  lookupForm: document.getElementById("valueLookupForm"),
  nameInput: document.getElementById("valueNameInput") as HTMLInputElement | null,
  lookupResult: document.getElementById("valueLookupResult"),
  signForm: document.getElementById("valueSignForm"),
  ownerPrivateKeyInput: document.getElementById("valueOwnerPrivateKeyInput") as HTMLInputElement | null,
  ownerPubkeyPreview: document.getElementById("valueOwnerPubkeyPreview") as HTMLInputElement | null,
  ownerMatchNote: document.getElementById("valueOwnerMatchNote"),
  sequenceInput: document.getElementById("valueSequenceInput") as HTMLInputElement | null,
  sequenceHint: document.getElementById("valueSequenceHint"),
  valueTypeInput: document.getElementById("valueTypeInput") as HTMLSelectElement | null,
  payloadInput: document.getElementById("valuePayloadInput") as HTMLTextAreaElement | null,
  payloadHint: document.getElementById("valuePayloadHint"),
  signResult: document.getElementById("valueSignResult"),
  publishResult: document.getElementById("valuePublishResult"),
  downloadSignedValueButton: document.getElementById("downloadSignedValueButton") as HTMLButtonElement | null,
  publishValueButton: document.getElementById("publishValueButton") as HTMLButtonElement | null
};

const state: {
  currentName: NameRecord | null;
  currentValueRecord: ValueRecord | null;
  signedRecord: BrowserSignedValueRecord | null;
  lastSuggestedSequence: number | null;
} = {
  currentName: null,
  currentValueRecord: null,
  signedRecord: null,
  lastSuggestedSequence: null
};

if (elements.lookupForm && elements.nameInput) {
  void bootstrap();
}

async function bootstrap(): Promise<void> {
  syncWizard();
  renderLookupMessage("Enter a claimed name to load the current owner and published value.");
  renderSignMessage("Load a claimed name first, then sign the next value record locally.");
  renderPublishMessage("Sign a value record first. Then publish the signed JSON to the resolver.");
  updatePayloadHint();

  const initialName = new URL(window.location.href).searchParams.get("name")?.trim().toLowerCase() ?? "";
  if (initialName !== "") {
    if (elements.nameInput) {
      elements.nameInput.value = initialName;
    }
    await loadName(initialName);
  }

  elements.lookupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const rawName = elements.nameInput?.value?.trim().toLowerCase() ?? "";
    if (rawName === "") {
      renderLookupMessage("Enter a claimed name first.");
      return;
    }
    await loadName(rawName);
  });

  elements.signForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    signLocally();
  });

  elements.ownerPrivateKeyInput?.addEventListener("input", () => {
    updateDerivedOwnerState();
    invalidateSignedRecord("Owner key changed. Sign again before publishing.");
  });

  elements.sequenceInput?.addEventListener("input", () => {
    invalidateSignedRecord("Sequence changed. Sign again before publishing.");
  });

  elements.valueTypeInput?.addEventListener("change", () => {
    updatePayloadHint();
    invalidateSignedRecord("Value type changed. Sign again before publishing.");
  });

  elements.payloadInput?.addEventListener("input", () => {
    invalidateSignedRecord("Payload changed. Sign again before publishing.");
  });

  elements.downloadSignedValueButton?.addEventListener("click", () => {
    if (state.signedRecord === null) {
      renderSignMessage("Sign a value record before downloading it.");
      return;
    }

    downloadJsonFile(
      state.signedRecord,
      `gns-value-${state.signedRecord.name}-sequence-${state.signedRecord.sequence}.json`
    );
  });

  elements.publishValueButton?.addEventListener("click", async () => {
    await publishSignedRecord();
  });
}

async function loadName(rawName: string): Promise<void> {
  const normalizedName = rawName.trim().toLowerCase();
  updateUrl(normalizedName);
  renderLookupMessage("Loading current name state...");

  try {
    const [nameRecord, valueRecord] = await Promise.all([
      fetchJson<NameRecord>(withBasePath(`/api/name/${encodeURIComponent(normalizedName)}`)),
      fetchJson<ValueRecord>(withBasePath(`/api/name/${encodeURIComponent(normalizedName)}/value`)).catch((error) => {
        if (isNotFound(error)) {
          return null;
        }

        throw error;
      })
    ]);

    state.currentName = nameRecord;
    state.currentValueRecord = valueRecord;
    applySuggestedSequence(valueRecord === null ? 0 : valueRecord.sequence + 1);
    renderLookupRecord(nameRecord, valueRecord);
    updateDerivedOwnerState();
    syncWizard();
  } catch (error) {
    state.currentName = null;
    state.currentValueRecord = null;
    state.lastSuggestedSequence = null;
    invalidateSignedRecord("Load a claimed name first, then sign the next value record locally.");
    renderLookupMessage(error instanceof Error ? error.message : "Unable to load the requested name.");
    syncWizard();
  }
}

function signLocally(): void {
  if (state.currentName === null) {
    renderSignMessage("Load a claimed name first.");
    return;
  }

  if (state.currentName.status === "invalid") {
    renderSignMessage("Released names cannot publish new value records.");
    return;
  }

  try {
    const name = requireInput(elements.nameInput, "Enter a claimed name first.").trim().toLowerCase();
    const ownerPrivateKeyHex = requireInput(
      elements.ownerPrivateKeyInput,
      "Paste the owner private key in 32-byte hex form."
    );
    const derivedOwnerPubkey = deriveOwnerPubkey(ownerPrivateKeyHex);

    if (derivedOwnerPubkey !== state.currentName.currentOwnerPubkey) {
      throw new Error("This private key does not match the resolver's current owner pubkey.");
    }

    const sequence = parseNonNegativeInteger(
      requireInput(elements.sequenceInput, "Enter the next sequence."),
      "sequence"
    );
    const valueType = parseByte(
      elements.valueTypeInput?.value ?? "",
      "valueType"
    );
    const payloadHex = resolvePayloadHex(valueType, elements.payloadInput?.value ?? "");

    const signedRecord = signBrowserValueRecord({
      name,
      ownerPrivateKeyHex,
      sequence,
      valueType,
      payloadHex
    });

    if (!verifyBrowserValueRecord(signedRecord)) {
      throw new Error("Local value record verification failed.");
    }

    state.signedRecord = signedRecord;
    renderSignedRecord(signedRecord);
    renderPublishMessage("Signed record ready. Publish it to update the resolver's current value.");
    syncWizard();
  } catch (error) {
    state.signedRecord = null;
    renderSignMessage(error instanceof Error ? error.message : "Unable to sign the value record.");
    renderPublishMessage("Fix the value record first, then publish.");
    syncWizard();
  }
}

async function publishSignedRecord(): Promise<void> {
  if (state.signedRecord === null) {
    renderPublishMessage("Sign a value record before publishing it.");
    return;
  }

  renderPublishMessage("Publishing the signed value record...");

  try {
    const result = await postJson(withBasePath("/api/values"), state.signedRecord);
    renderPublishResult(result);
    await loadName(state.signedRecord.name);
  } catch (error) {
    renderPublishMessage(error instanceof Error ? error.message : "Unable to publish the signed value record.");
  }
}

function invalidateSignedRecord(message: string): void {
  state.signedRecord = null;
  if (elements.downloadSignedValueButton) {
    elements.downloadSignedValueButton.disabled = true;
  }
  if (elements.publishValueButton) {
    elements.publishValueButton.disabled = true;
  }
  renderSignMessage(message);
  renderPublishMessage("Sign a value record first. Then publish the signed JSON to the resolver.");
  syncWizard();
}

function renderLookupMessage(message: string): void {
  if (!elements.lookupResult) {
    return;
  }

  elements.lookupResult.classList.add("empty");
  elements.lookupResult.textContent = message;
}

function renderSignMessage(message: string): void {
  if (!elements.signResult) {
    return;
  }

  elements.signResult.classList.add("empty");
  elements.signResult.textContent = message;
}

function renderPublishMessage(message: string): void {
  if (!elements.publishResult) {
    return;
  }

  elements.publishResult.classList.add("empty");
  elements.publishResult.textContent = message;
}

function renderLookupRecord(nameRecord: NameRecord, valueRecord: ValueRecord | null): void {
  if (!elements.lookupResult) {
    return;
  }

  elements.lookupResult.classList.remove("empty");
  elements.lookupResult.innerHTML = `
    <div class="result-title">
      <h3>${escapeHtml(nameRecord.name)}</h3>
      <span class="status-pill ${escapeHtml(nameRecord.status)}">${escapeHtml(formatStateLabel(nameRecord.status))}</span>
    </div>
    <p class="result-meta">${escapeHtml(formatStateLabel(nameRecord.status))} · current owner ${truncateMiddle(nameRecord.currentOwnerPubkey, 12, 10)}</p>
    <div class="result-grid">
      <div class="result-item">
        <label>Current Owner</label>
        <p class="field-value">${escapeHtml(nameRecord.currentOwnerPubkey)}</p>
      </div>
      <div class="result-item">
        <label>Current Value</label>
        <p class="field-value">${escapeHtml(describeCurrentValue(valueRecord))}</p>
      </div>
      <div class="result-item">
        <label>Next Sequence</label>
        <p class="field-value">${escapeHtml(String(state.lastSuggestedSequence ?? 0))}</p>
      </div>
      <div class="result-item">
        <label>Bond Requirement</label>
        <p class="field-value">${escapeHtml(formatSats(nameRecord.requiredBondSats))}</p>
      </div>
    </div>
  `;
}

function renderSignedRecord(record: BrowserSignedValueRecord): void {
  if (!elements.signResult) {
    return;
  }

  if (elements.downloadSignedValueButton) {
    elements.downloadSignedValueButton.disabled = false;
  }
  if (elements.publishValueButton) {
    elements.publishValueButton.disabled = false;
  }

  elements.signResult.classList.remove("empty");
  elements.signResult.innerHTML = `
    <div class="result-title">
      <h3>Signed Record Ready</h3>
      <span class="status-pill mature">Local only</span>
    </div>
    <p class="result-meta">Signed locally in this browser. Only this JSON will be uploaded if you publish.</p>
    <div class="result-grid">
      <div class="result-item">
        <label>Owner Pubkey</label>
        <p class="field-value">${escapeHtml(record.ownerPubkey)}</p>
      </div>
      <div class="result-item">
        <label>Sequence</label>
        <p class="field-value">${escapeHtml(String(record.sequence))}</p>
      </div>
      <div class="result-item">
        <label>Value Type</label>
        <p class="field-value">${escapeHtml(formatValueType(record.valueType))}</p>
      </div>
      <div class="result-item">
        <label>Payload</label>
        <p class="field-value">${escapeHtml(previewPayload(record.valueType, record.payloadHex))}</p>
      </div>
    </div>
    <pre class="value-json-preview">${escapeHtml(JSON.stringify(record, null, 2))}</pre>
  `;
}

function renderPublishResult(result: unknown): void {
  if (!elements.publishResult) {
    return;
  }

  const record = isRecord(result) ? result : {};
  const name = typeof record.name === "string" ? record.name : state.signedRecord?.name ?? "unknown";
  const sequence = typeof record.sequence === "number" ? record.sequence : state.signedRecord?.sequence ?? 0;
  const valueType = typeof record.valueType === "number" ? record.valueType : state.signedRecord?.valueType ?? 0;

  elements.publishResult.classList.remove("empty");
  elements.publishResult.innerHTML = `
    <div class="result-title">
      <h3>Value Published</h3>
      <span class="status-pill mature">Resolver updated</span>
    </div>
    <p class="result-meta">${escapeHtml(name)} · sequence ${escapeHtml(String(sequence))} · ${escapeHtml(formatValueType(valueType))}</p>
    <p class="field-value">The resolver accepted the signed value record and will now serve it for the current on-chain owner.</p>
  `;
}

function updateDerivedOwnerState(): void {
  if (!elements.ownerPubkeyPreview) {
    return;
  }

  const privateKey = elements.ownerPrivateKeyInput?.value?.trim() ?? "";
  if (privateKey === "") {
    elements.ownerPubkeyPreview.value = "";
    if (elements.ownerMatchNote) {
      elements.ownerMatchNote.textContent = "Paste the owner private key to derive the current owner pubkey locally.";
    }
    return;
  }

  try {
    const derived = deriveOwnerPubkey(privateKey);
    elements.ownerPubkeyPreview.value = derived;
    if (elements.ownerMatchNote) {
      elements.ownerMatchNote.textContent =
        state.currentName === null
          ? "Owner pubkey derived locally. Load the claimed name to compare it against the resolver's current owner."
          : derived === state.currentName.currentOwnerPubkey
            ? "Derived owner matches the resolver's current owner."
            : "Derived owner does not match the resolver's current owner.";
    }
  } catch (error) {
    elements.ownerPubkeyPreview.value = "";
    if (elements.ownerMatchNote) {
      elements.ownerMatchNote.textContent =
        error instanceof Error ? error.message : "Unable to derive the owner pubkey from this private key.";
    }
  }
}

function updatePayloadHint(): void {
  if (!elements.payloadInput || !elements.payloadHint) {
    return;
  }

  const valueType = Number(elements.valueTypeInput?.value ?? 2);
  if (valueType === 255) {
    elements.payloadInput.placeholder = "68747470733a2f2f6578616d706c652e636f6d";
    elements.payloadHint.textContent = "Raw/app-defined values expect hex. Use even-length hex without a 0x prefix.";
    return;
  }

  if (valueType === 1) {
    elements.payloadInput.placeholder = "bitcoin:tb1q...";
    elements.payloadHint.textContent = "Bitcoin payment targets are encoded as UTF-8 text before signing.";
    return;
  }

  elements.payloadInput.placeholder = "https://example.com";
  elements.payloadHint.textContent = "HTTPS targets are encoded as UTF-8 text before signing.";
}

function applySuggestedSequence(nextSequence: number): void {
  const currentValue = elements.sequenceInput?.value?.trim() ?? "";
  const currentSequence =
    currentValue === "" ? null : Number.parseInt(currentValue, 10);
  const shouldReplace =
    currentValue === ""
    || currentSequence === state.lastSuggestedSequence;

  state.lastSuggestedSequence = nextSequence;

  if (shouldReplace && elements.sequenceInput) {
    elements.sequenceInput.value = String(nextSequence);
  }

  if (elements.sequenceHint) {
    elements.sequenceHint.textContent = `Resolver-visible next sequence: ${nextSequence}.`;
  }
}

function syncWizard(): void {
  const hasLookup = state.currentName !== null;
  const hasSignedRecord = state.signedRecord !== null;

  setStepChip(elements.lookupStepState, hasLookup ? "Loaded" : "Start here", hasLookup ? "complete" : "current");
  setStepChip(
    elements.signStepState,
    hasSignedRecord ? "Signed" : hasLookup ? "Sign next" : "After step 1",
    hasSignedRecord ? "complete" : hasLookup ? "ready" : "waiting"
  );
  setStepChip(
    elements.publishStepState,
    hasSignedRecord ? "Publish now" : "After step 2",
    hasSignedRecord ? "ready" : "waiting"
  );

  setDetailsOpen(elements.lookupStep, !hasLookup);
  setDetailsOpen(elements.signStep, hasLookup && !hasSignedRecord);
  setDetailsOpen(elements.publishStep, hasSignedRecord);
}

function setStepChip(node: HTMLElement | null, text: string, tone: "waiting" | "current" | "ready" | "complete"): void {
  if (!(node instanceof HTMLElement)) {
    return;
  }

  node.textContent = text;
  node.classList.remove("is-waiting", "is-current", "is-ready", "is-complete");
  node.classList.add(`is-${tone}`);
}

function setDetailsOpen(node: HTMLElement | null, open: boolean): void {
  if (node instanceof HTMLDetailsElement) {
    node.open = open;
  }
}

function requireInput(node: HTMLInputElement | HTMLTextAreaElement | null, message: string): string {
  const value = node?.value?.trim() ?? "";
  if (value === "") {
    throw new Error(message);
  }

  return value;
}

function resolvePayloadHex(valueType: number, payloadValue: string): string {
  const trimmed = payloadValue.trim();

  if (valueType === 255) {
    if (trimmed === "") {
      throw new Error("Enter a raw hex payload.");
    }

    return normalizeRawPayloadHex(trimmed);
  }

  if (trimmed === "") {
    throw new Error("Enter a payload value.");
  }

  return payloadUtf8ToHex(trimmed);
}

function parseNonNegativeInteger(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative safe integer`);
  }

  return parsed;
}

function parseByte(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 0xff) {
    throw new Error(`${label} must fit in one byte`);
  }

  return parsed;
}

async function fetchJson<T>(path: string): Promise<T> {
  return requestJson<T>(path);
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const payload = await response.json();

  if (!response.ok) {
    const error = new Error(
      typeof payload?.message === "string" ? payload.message : typeof payload?.error === "string" ? payload.error : "Request failed"
    ) as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = typeof payload?.error === "string" ? payload.error : "request_failed";
    throw error;
  }

  return payload as T;
}

function withBasePath(path: string): string {
  if (BASE_PATH === "") {
    return path;
  }

  if (path === "/") {
    return BASE_PATH;
  }

  return `${BASE_PATH}${path}`;
}

function updateUrl(name: string): void {
  const target = withBasePath(`/values?name=${encodeURIComponent(name)}`);
  if (window.location.pathname + window.location.search !== target) {
    window.history.replaceState({ name }, "", target);
  }
}

function isNotFound(error: unknown): boolean {
  return (
    error instanceof Error
    && "status" in error
    && (error as Error & { status?: number }).status === 404
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describeCurrentValue(valueRecord: ValueRecord | null): string {
  if (valueRecord === null) {
    return "No published value yet";
  }

  return `${formatValueType(valueRecord.valueType)} · sequence ${valueRecord.sequence}`;
}

function previewPayload(valueType: number, payloadHex: string): string {
  if (Number(valueType) === 255) {
    return payloadHex;
  }

  return decodeValuePayloadUtf8(payloadHex) ?? payloadHex;
}

function decodeValuePayloadUtf8(payloadHex: string): string | null {
  try {
    const normalized = payloadHex.trim().toLowerCase();
    if (normalized.length % 2 !== 0 || /[^0-9a-f]/.test(normalized)) {
      return null;
    }

    const bytes = new Uint8Array(normalized.length / 2);
    for (let index = 0; index < normalized.length; index += 2) {
      bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
    }

    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return /^[\x09\x0a\x0d\x20-\x7e]*$/.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

function formatStateLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Awaiting Reveal";
    case "immature":
      return "Settling";
    case "mature":
      return "Active";
    case "invalid":
      return "Released";
    default:
      return status;
  }
}

function formatValueType(valueType: number): string {
  switch (Number(valueType)) {
    case 1:
      return "0x01 (bitcoin payment target)";
    case 2:
      return "0x02 (https target)";
    case 255:
      return "0xff (raw/app-defined)";
    default:
      return `0x${Number(valueType).toString(16).padStart(2, "0")}`;
  }
}

function formatSats(value: string | number | bigint): string {
  const sats = BigInt(value);
  return `₿${sats.toLocaleString("en-US")} (${formatBtcDecimal(sats)} BTC)`;
}

function formatBtcDecimal(sats: bigint): string {
  const whole = sats / 100_000_000n;
  const fractional = (sats % 100_000_000n).toString().padStart(8, "0").replace(/0+$/g, "");
  return fractional === "" ? whole.toString() : `${whole}.${fractional}`;
}

function truncateMiddle(value: string, head = 14, tail = 10): string {
  const text = String(value);
  if (text.length <= head + tail + 1) {
    return text;
  }

  return `${text.slice(0, head)}…${text.slice(-tail)}`;
}

function downloadJsonFile(payload: unknown, filename: string): void {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: "application/json; charset=utf-8"
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
