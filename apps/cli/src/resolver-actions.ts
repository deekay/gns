import { normalizeName } from "@gns/protocol";

export interface ResolverClaimPlan {
  readonly name: string;
  readonly appearsAvailable: boolean;
  readonly availabilityNote: string;
  readonly currentResolverHeight: number | null;
  readonly launchHeight: number;
  readonly plannedCommitHeight: number;
  readonly recommendedBondVout: number;
  readonly revealWindowBlocks: number;
  readonly revealDeadlineHeight: number;
  readonly epochIndex: number;
  readonly maturityBlocks: number;
  readonly maturityHeight: number;
  readonly requiredBondSats: string;
  readonly existingClaim:
    | null
    | {
        readonly status: string;
        readonly currentOwnerPubkey: string;
        readonly claimCommitTxid: string;
        readonly claimRevealTxid: string;
        readonly currentBondTxid: string;
        readonly currentBondVout: number;
        readonly currentBondValueSats: string;
      };
  readonly nextSteps: readonly string[];
}

export interface ResolverNameRecord {
  readonly name: string;
  readonly status: "pending" | "immature" | "mature" | "invalid";
  readonly currentOwnerPubkey: string;
  readonly claimCommitTxid: string;
  readonly claimRevealTxid: string;
  readonly claimHeight: number;
  readonly maturityHeight: number;
  readonly requiredBondSats: string;
  readonly currentBondTxid: string;
  readonly currentBondVout: number;
  readonly currentBondValueSats: string;
  readonly lastStateTxid: string;
  readonly lastStateHeight?: number;
  readonly winningCommitBlockHeight: number;
  readonly winningCommitTxIndex: number;
}

export interface ResolverValueRecord {
  readonly format: string;
  readonly recordVersion: number;
  readonly exportedAt: string;
  readonly name: string;
  readonly ownerPubkey: string;
  readonly sequence: number;
  readonly valueType: number;
  readonly payloadHex: string;
  readonly signature: string;
}

export interface ResolverNameActivityResponse {
  readonly name: string;
  readonly activity: readonly ResolverRecentActivityRecord[];
}

export interface ResolverTransactionProvenance {
  readonly txid: string;
  readonly blockHeight: number;
  readonly txIndex: number;
  readonly inputs: ReadonlyArray<{
    readonly txid: string | null;
    readonly vout: number | null;
    readonly coinbase: boolean;
  }>;
  readonly outputs: ReadonlyArray<{
    readonly valueSats: string;
    readonly scriptType: "op_return" | "payment" | "unknown";
    readonly dataHex?: string;
  }>;
  readonly events: ReadonlyArray<{
    readonly vout: number;
    readonly type: number;
    readonly typeName: "COMMIT" | "REVEAL" | "TRANSFER";
    readonly payload:
      | {
          readonly bondVout: number;
          readonly ownerPubkey: string;
          readonly commitHash: string;
        }
      | {
          readonly commitTxid: string;
          readonly nonce: string;
          readonly name: string;
        }
      | {
          readonly prevStateTxid: string;
          readonly newOwnerPubkey: string;
          readonly flags: number;
          readonly successorBondVout: number;
          readonly signature: string;
        };
    readonly validationStatus: "applied" | "ignored";
    readonly reason: string;
    readonly affectedName: string | null;
  }>;
  readonly invalidatedNames: readonly string[];
}

export type ResolverRecentActivityRecord = ResolverTransactionProvenance;

export class ResolverHttpError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly payload: unknown;

  public constructor(input: {
    readonly status: number;
    readonly code: string;
    readonly message: string;
    readonly payload: unknown;
  }) {
    super(input.message);
    this.name = "ResolverHttpError";
    this.status = input.status;
    this.code = input.code;
    this.payload = input.payload;
  }
}

export function resolveResolverUrl(explicitResolverUrl: string | undefined): string {
  if (explicitResolverUrl) {
    return explicitResolverUrl;
  }

  if (process.env.GNS_RESOLVER_URL) {
    return process.env.GNS_RESOLVER_URL;
  }

  const port = process.env.GNS_RESOLVER_PORT ?? "8787";
  return `http://127.0.0.1:${port}`;
}

export async function fetchClaimPlan(options: {
  readonly name: string;
  readonly resolverUrl?: string;
}): Promise<ResolverClaimPlan> {
  const normalized = normalizeName(options.name);
  return fetchResolverJson<ResolverClaimPlan>({
    ...(options.resolverUrl ? { resolverUrl: options.resolverUrl } : {}),
    path: `/claim-plan/${encodeURIComponent(normalized)}`
  });
}

export async function fetchNameRecord(options: {
  readonly name: string;
  readonly resolverUrl?: string;
}): Promise<ResolverNameRecord> {
  const normalized = normalizeName(options.name);
  return fetchResolverJson<ResolverNameRecord>({
    ...(options.resolverUrl ? { resolverUrl: options.resolverUrl } : {}),
    path: `/name/${encodeURIComponent(normalized)}`
  });
}

export async function fetchNameValueRecord(options: {
  readonly name: string;
  readonly resolverUrl?: string;
}): Promise<ResolverValueRecord> {
  const normalized = normalizeName(options.name);
  return fetchResolverJson<ResolverValueRecord>({
    ...(options.resolverUrl ? { resolverUrl: options.resolverUrl } : {}),
    path: `/name/${encodeURIComponent(normalized)}/value`
  });
}

export async function fetchNameActivity(options: {
  readonly name: string;
  readonly resolverUrl?: string;
  readonly limit?: number;
}): Promise<ResolverNameActivityResponse> {
  const normalized = normalizeName(options.name);
  const search = new URLSearchParams();

  if (options.limit !== undefined) {
    if (!Number.isSafeInteger(options.limit) || options.limit < 0) {
      throw new Error("limit must be a non-negative safe integer");
    }

    search.set("limit", String(options.limit));
  }

  return fetchResolverJson<ResolverNameActivityResponse>({
    ...(options.resolverUrl ? { resolverUrl: options.resolverUrl } : {}),
    path: `/name/${encodeURIComponent(normalized)}/activity${search.size > 0 ? `?${search.toString()}` : ""}`
  });
}

export async function fetchTransactionProvenance(options: {
  readonly txid: string;
  readonly resolverUrl?: string;
}): Promise<ResolverTransactionProvenance> {
  const normalized = options.txid.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error("txid must be 64 hex characters");
  }

  return fetchResolverJson<ResolverTransactionProvenance>({
    ...(options.resolverUrl ? { resolverUrl: options.resolverUrl } : {}),
    path: `/tx/${normalized}`
  });
}

export async function fetchRecentActivity(options?: {
  readonly resolverUrl?: string;
  readonly limit?: number;
}): Promise<readonly ResolverRecentActivityRecord[]> {
  const search = new URLSearchParams();

  if (options?.limit !== undefined) {
    if (!Number.isSafeInteger(options.limit) || options.limit < 0) {
      throw new Error("limit must be a non-negative safe integer");
    }

    search.set("limit", String(options.limit));
  }

  const path = search.size > 0 ? `/activity?${search.toString()}` : "/activity";
  const result = await fetchResolverJson<{ readonly activity: readonly ResolverRecentActivityRecord[] }>({
    ...(options?.resolverUrl ? { resolverUrl: options.resolverUrl } : {}),
    path
  });

  return Array.isArray(result.activity) ? result.activity : [];
}

async function fetchResolverJson<T>(input: {
  readonly resolverUrl?: string;
  readonly path: string;
}): Promise<T> {
  const resolverUrl = resolveResolverUrl(input.resolverUrl).replace(/\/$/, "");
  const response = await fetch(`${resolverUrl}${input.path}`);
  const raw = await response.text();
  const parsed = raw.length === 0 ? null : JSON.parse(raw);

  if (!response.ok) {
    const code =
      parsed !== null &&
      typeof parsed === "object" &&
      "error" in parsed &&
      typeof parsed.error === "string"
        ? parsed.error
        : "resolver_http_error";
    const message =
      parsed !== null &&
      typeof parsed === "object" &&
      "message" in parsed &&
      typeof parsed.message === "string"
        ? parsed.message
        : `resolver returned HTTP ${response.status}`;

    throw new ResolverHttpError({
      status: response.status,
      code,
      message,
      payload: parsed
    });
  }

  return parsed as T;
}
