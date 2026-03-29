export const PROFILE_BUNDLE_KIND = "gns-profile-bundle";
export const PROFILE_BUNDLE_VERSION = 1;

export interface ProfileBundleDraft {
  readonly website: string;
  readonly bitcoin: string;
  readonly youtube: string;
  readonly x: string;
  readonly service: string;
  readonly notes: string;
}

export interface ProfileBundlePayload {
  readonly kind: typeof PROFILE_BUNDLE_KIND;
  readonly version: typeof PROFILE_BUNDLE_VERSION;
  readonly website?: string;
  readonly bitcoin?: string;
  readonly youtube?: string;
  readonly x?: string;
  readonly service?: string;
  readonly notes?: string;
}

export function emptyProfileBundleDraft(): ProfileBundleDraft {
  return {
    website: "",
    bitcoin: "",
    youtube: "",
    x: "",
    service: "",
    notes: ""
  };
}

export function createProfileBundlePayload(input: Partial<ProfileBundleDraft>): ProfileBundlePayload {
  const payload: Record<string, unknown> = {
    kind: PROFILE_BUNDLE_KIND,
    version: PROFILE_BUNDLE_VERSION
  };

  for (const field of profileBundleFieldNames()) {
    const value = normalizeOptionalString(input[field]);
    if (value !== null) {
      payload[field] = value;
    }
  }

  return payload as unknown as ProfileBundlePayload;
}

export function encodeProfileBundlePayloadHex(input: Partial<ProfileBundleDraft>): string {
  const payload = createProfileBundlePayload(input);

  if (countProfileBundleEntries(payload) === 0) {
    throw new Error("Add at least one destination or note to the profile bundle.");
  }

  return utf8ToHex(JSON.stringify(payload, null, 2));
}

export function decodeProfileBundlePayloadHex(payloadHex: string): ProfileBundlePayload | null {
  const text = decodeHexUtf8(payloadHex);
  if (text === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    if (record.kind !== PROFILE_BUNDLE_KIND || record.version !== PROFILE_BUNDLE_VERSION) {
      return null;
    }

    return createProfileBundlePayload({
      website: stringOrEmpty(record.website),
      bitcoin: stringOrEmpty(record.bitcoin),
      youtube: stringOrEmpty(record.youtube),
      x: stringOrEmpty(record.x),
      service: stringOrEmpty(record.service),
      notes: stringOrEmpty(record.notes)
    });
  } catch {
    return null;
  }
}

export function profileBundleDraftFromPayload(payload: ProfileBundlePayload | null): ProfileBundleDraft {
  return {
    website: payload?.website ?? "",
    bitcoin: payload?.bitcoin ?? "",
    youtube: payload?.youtube ?? "",
    x: payload?.x ?? "",
    service: payload?.service ?? "",
    notes: payload?.notes ?? ""
  };
}

export function describeProfileBundle(payload: ProfileBundlePayload): string {
  const labels = listProfileBundleLabels(payload);
  return labels.length === 0 ? "Profile bundle" : `Profile bundle · ${labels.join(", ")}`;
}

export function listProfileBundleEntries(payload: ProfileBundlePayload): Array<{ label: string; value: string }> {
  return profileBundleFieldMeta()
    .map((field) => {
      const value = payload[field.name];
      return typeof value === "string" && value.trim() !== ""
        ? { label: field.label, value }
        : null;
    })
    .filter((entry): entry is { label: string; value: string } => entry !== null);
}

export function decodeHexUtf8(payloadHex: string): string | null {
  try {
    const normalized = normalizeHex(payloadHex);
    const bytes = new Uint8Array(normalized.length / 2);
    for (let index = 0; index < normalized.length; index += 2) {
      bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function utf8ToHex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function listProfileBundleLabels(payload: ProfileBundlePayload): string[] {
  return listProfileBundleEntries(payload).map((entry) => entry.label.toLowerCase());
}

function countProfileBundleEntries(payload: ProfileBundlePayload): number {
  return listProfileBundleEntries(payload).length;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeHex(payloadHex: string): string {
  const normalized = String(payloadHex).trim().toLowerCase();
  if (normalized.length % 2 !== 0 || /[^0-9a-f]/.test(normalized)) {
    throw new Error("invalid hex");
  }
  return normalized;
}

function profileBundleFieldNames(): Array<keyof ProfileBundleDraft> {
  return profileBundleFieldMeta().map((field) => field.name);
}

function profileBundleFieldMeta(): Array<{ name: keyof ProfileBundleDraft; label: string }> {
  return [
    { name: "website", label: "Website" },
    { name: "bitcoin", label: "Bitcoin" },
    { name: "youtube", label: "YouTube" },
    { name: "x", label: "X" },
    { name: "service", label: "Service" },
    { name: "notes", label: "Notes" }
  ];
}
