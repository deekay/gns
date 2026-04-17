import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Client } from "pg";

export interface DatabaseConfig {
  readonly connectionString: string;
  readonly schema: string;
}

export type DatabaseDocumentKind = "indexer_snapshot" | "value_record_store";

export interface PersistedNameRecord {
  readonly name: string;
  readonly status: "pending" | "immature" | "mature" | "invalid";
  readonly currentOwnerPubkey: string;
  readonly acquisitionKind?: "claim" | "auction";
  readonly acquisitionAuctionId?: string;
  readonly acquisitionAuctionLotCommitment?: string;
  readonly acquisitionAuctionBidTxid?: string;
  readonly acquisitionAuctionBidderCommitment?: string;
  readonly acquisitionBondReleaseHeight?: number;
  readonly claimCommitTxid: string;
  readonly claimRevealTxid: string;
  readonly claimHeight: number;
  readonly maturityHeight: number;
  readonly requiredBondSats: string;
  readonly currentBondTxid: string;
  readonly currentBondVout: number;
  readonly currentBondValueSats: string;
  readonly lastStateTxid: string;
  readonly winningCommitBlockHeight: number;
  readonly winningCommitTxIndex: number;
}

export interface PersistedPendingCommit {
  readonly txid: string;
  readonly bondVout: number;
  readonly bondValueSats: string | null;
  readonly ownerPubkey: string;
  readonly commitHash: string;
  readonly blockHeight: number;
  readonly txIndex: number;
  readonly revealDeadlineHeight: number;
}

export interface PersistedPendingBatchAnchor {
  readonly txid: string;
  readonly merkleRoot: string;
  readonly leafCount: number;
  readonly bondOutputs: ReadonlyArray<{
    readonly vout: number;
    readonly bondValueSats: string | null;
  }>;
  readonly revealedBondVouts: readonly number[];
  readonly blockHeight: number;
  readonly txIndex: number;
  readonly revealDeadlineHeight: number;
}

export interface PersistedTransactionOutput {
  readonly valueSats: string;
  readonly scriptType: "op_return" | "payment" | "unknown";
  readonly dataHex?: string;
}

export type PersistedTransactionProvenancePayload =
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
      readonly anchorTxid: string;
      readonly ownerPubkey: string;
      readonly nonce: string;
      readonly bondVout: number;
      readonly proofBytesLength: number;
      readonly proofChunkCount: number;
      readonly name: string;
    }
  | {
      readonly prevStateTxid: string;
      readonly newOwnerPubkey: string;
      readonly flags: number;
      readonly successorBondVout: number;
      readonly signature: string;
    }
  | {
      readonly flags: number;
      readonly leafCount: number;
      readonly merkleRoot: string;
    }
  | {
      readonly chunkIndex: number;
      readonly proofBytesHex: string;
    }
  | {
      readonly flags: number;
      readonly bondVout: number;
      readonly reservedLockBlocks: number;
      readonly bidAmountSats: string;
      readonly ownerPubkey: string;
      readonly auctionLotCommitment: string;
      readonly auctionCommitment: string;
      readonly bidderCommitment: string;
    };

export interface PersistedTransactionProvenanceEvent {
  readonly vout: number;
  readonly type: number;
  readonly typeName:
    | "COMMIT"
    | "REVEAL"
    | "TRANSFER"
    | "BATCH_ANCHOR"
    | "BATCH_REVEAL"
    | "REVEAL_PROOF_CHUNK"
    | "AUCTION_BID";
  readonly payload: PersistedTransactionProvenancePayload;
  readonly validationStatus: "applied" | "ignored";
  readonly reason: string;
  readonly affectedName: string | null;
}

export interface PersistedTransactionProvenance {
  readonly txid: string;
  readonly blockHeight: number;
  readonly txIndex: number;
  readonly inputs: ReadonlyArray<{
    readonly txid: string | null;
    readonly vout: number | null;
    readonly coinbase: boolean;
  }>;
  readonly outputs: readonly PersistedTransactionOutput[];
  readonly events: readonly PersistedTransactionProvenanceEvent[];
  readonly invalidatedNames: readonly string[];
}

export interface PersistedSpentOutpointObservation {
  readonly outpointTxid: string;
  readonly outpointVout: number;
  readonly spentTxid: string;
  readonly spentBlockHeight: number;
  readonly spentTxIndex: number;
  readonly spendingInputIndex: number;
}

export interface PersistedIndexerSnapshot {
  readonly launchHeight: number;
  readonly currentHeight: number | null;
  readonly currentBlockHash: string | null;
  readonly processedBlocks: number;
  readonly names: readonly PersistedNameRecord[];
  readonly pendingCommits: readonly PersistedPendingCommit[];
  readonly pendingBatchAnchors: readonly PersistedPendingBatchAnchor[];
  readonly spentOutpoints?: readonly PersistedSpentOutpointObservation[];
  readonly transactionProvenance: readonly PersistedTransactionProvenance[];
  readonly recentCheckpoints?: readonly PersistedIndexerSnapshotState[];
}

export interface PersistedIndexerSnapshotState {
  readonly launchHeight: number;
  readonly currentHeight: number | null;
  readonly currentBlockHash: string | null;
  readonly processedBlocks: number;
  readonly names: readonly PersistedNameRecord[];
  readonly pendingCommits: readonly PersistedPendingCommit[];
  readonly pendingBatchAnchors: readonly PersistedPendingBatchAnchor[];
  readonly spentOutpoints?: readonly PersistedSpentOutpointObservation[];
  readonly transactionProvenance: readonly PersistedTransactionProvenance[];
}

export function createDatabaseConfig(
  connectionString: string,
  options: { schema?: string } = {}
): DatabaseConfig {
  if (connectionString.length === 0) {
    throw new Error("connectionString must not be empty");
  }

  const schema = normalizeDatabaseIdentifier(options.schema ?? "public", "schema");

  return { connectionString, schema };
}

export function loadIndexerSnapshotFile(filePath: string): PersistedIndexerSnapshot {
  const raw = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  return parseIndexerSnapshot(parsed);
}

export function saveIndexerSnapshotFile(
  filePath: string,
  snapshot: PersistedIndexerSnapshot
): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf8");
}

export function parseIndexerSnapshot(input: unknown): PersistedIndexerSnapshot {
  if (!isRecord(input)) {
    throw new Error("indexer snapshot must be an object");
  }

  const launchHeight = getRequiredInteger(input, "launchHeight");
  const currentHeight = getNullableInteger(input, "currentHeight");
  const currentBlockHash = getNullableString(input, "currentBlockHash");
  const processedBlocks = getRequiredInteger(input, "processedBlocks");
  const names = getRequiredArray(input, "names");
  const pendingCommits = getRequiredArray(input, "pendingCommits");
  const pendingBatchAnchors = getOptionalArray(input, "pendingBatchAnchors") ?? [];
  const spentOutpoints = getOptionalArray(input, "spentOutpoints") ?? [];
  const transactionProvenance = getOptionalArray(input, "transactionProvenance") ?? [];
  const recentCheckpoints = getOptionalArray(input, "recentCheckpoints");

  return {
    launchHeight,
    currentHeight,
    currentBlockHash,
    processedBlocks,
    names: names.map(parseNameRecordSnapshot),
    pendingCommits: pendingCommits.map(parsePendingCommitRecord),
    pendingBatchAnchors: pendingBatchAnchors.map(parsePendingBatchAnchorRecord),
    spentOutpoints: spentOutpoints.map(parseSpentOutpointObservation),
    transactionProvenance: transactionProvenance.map(parseTransactionProvenanceRecord),
    ...(recentCheckpoints === undefined
      ? {}
      : { recentCheckpoints: recentCheckpoints.map(parseIndexerSnapshotState) })
  };
}

function parseIndexerSnapshotState(input: unknown): PersistedIndexerSnapshotState {
  const parsed = parseIndexerSnapshot(input);
  return {
    launchHeight: parsed.launchHeight,
    currentHeight: parsed.currentHeight,
    currentBlockHash: parsed.currentBlockHash,
    processedBlocks: parsed.processedBlocks,
    names: parsed.names,
    pendingCommits: parsed.pendingCommits,
    pendingBatchAnchors: parsed.pendingBatchAnchors,
    ...(parsed.spentOutpoints === undefined ? {} : { spentOutpoints: parsed.spentOutpoints }),
    transactionProvenance: parsed.transactionProvenance
  };
}

export async function ensureDatabaseSchema(config: DatabaseConfig): Promise<void> {
  const client = await connectDatabase(config);

  try {
    const schema = quoteIdentifier(config.schema);

    await client.query(`create schema if not exists ${schema}`);
    await client.query(`
      create table if not exists ${schema}.ont_documents (
        kind text not null,
        document_key text not null,
        payload jsonb not null,
        updated_at timestamptz not null default now(),
        primary key (kind, document_key)
      )
    `);
  } finally {
    await client.end();
  }
}

export async function loadDatabaseDocument(
  config: DatabaseConfig,
  kind: DatabaseDocumentKind,
  documentKey: string
): Promise<unknown | null> {
  const validatedKey = validateDocumentKey(documentKey);
  const client = await connectDatabase(config);

  try {
    const schema = quoteIdentifier(config.schema);
    const result = await client.query<{ payload: unknown }>(
      `select payload from ${schema}.ont_documents where kind = $1 and document_key = $2 limit 1`,
      [kind, validatedKey]
    );

    return result.rows[0]?.payload ?? null;
  } finally {
    await client.end();
  }
}

export async function saveDatabaseDocument(
  config: DatabaseConfig,
  kind: DatabaseDocumentKind,
  documentKey: string,
  payload: unknown
): Promise<void> {
  const validatedKey = validateDocumentKey(documentKey);
  const client = await connectDatabase(config);

  try {
    const schema = quoteIdentifier(config.schema);
    await client.query(
      `
        insert into ${schema}.ont_documents (kind, document_key, payload)
        values ($1, $2, $3::jsonb)
        on conflict (kind, document_key)
        do update set payload = excluded.payload, updated_at = now()
      `,
      [kind, validatedKey, JSON.stringify(payload)]
    );
  } finally {
    await client.end();
  }
}

export async function loadIndexerSnapshotDatabase(
  config: DatabaseConfig,
  documentKey: string
): Promise<PersistedIndexerSnapshot | null> {
  const payload = await loadDatabaseDocument(config, "indexer_snapshot", documentKey);
  return payload === null ? null : parseIndexerSnapshot(payload);
}

export async function saveIndexerSnapshotDatabase(
  config: DatabaseConfig,
  documentKey: string,
  snapshot: PersistedIndexerSnapshot
): Promise<void> {
  await saveDatabaseDocument(config, "indexer_snapshot", documentKey, snapshot);
}

function parseNameRecordSnapshot(input: unknown): PersistedIndexerSnapshot["names"][number] {
  if (!isRecord(input)) {
    throw new Error("name record snapshot must be an object");
  }

  const acquisitionKind = getOptionalAuctionAcquisitionKind(input, "acquisitionKind");
  const acquisitionAuctionId = getOptionalString(input, "acquisitionAuctionId");
  const acquisitionAuctionLotCommitment = getOptionalString(input, "acquisitionAuctionLotCommitment");
  const acquisitionAuctionBidTxid = getOptionalString(input, "acquisitionAuctionBidTxid");
  const acquisitionAuctionBidderCommitment = getOptionalString(input, "acquisitionAuctionBidderCommitment");
  const acquisitionBondReleaseHeight = getOptionalInteger(input, "acquisitionBondReleaseHeight");

  return {
    name: getRequiredString(input, "name"),
    status: getRequiredNameStatus(input, "status"),
    currentOwnerPubkey: getRequiredString(input, "currentOwnerPubkey"),
    ...(acquisitionKind === undefined ? {} : { acquisitionKind }),
    ...(acquisitionAuctionId === undefined ? {} : { acquisitionAuctionId }),
    ...(acquisitionAuctionLotCommitment === undefined ? {} : { acquisitionAuctionLotCommitment }),
    ...(acquisitionAuctionBidTxid === undefined ? {} : { acquisitionAuctionBidTxid }),
    ...(acquisitionAuctionBidderCommitment === undefined ? {} : { acquisitionAuctionBidderCommitment }),
    ...(acquisitionBondReleaseHeight === undefined ? {} : { acquisitionBondReleaseHeight }),
    claimCommitTxid: getRequiredString(input, "claimCommitTxid"),
    claimRevealTxid: getRequiredString(input, "claimRevealTxid"),
    claimHeight: getRequiredInteger(input, "claimHeight"),
    maturityHeight: getRequiredInteger(input, "maturityHeight"),
    requiredBondSats: getRequiredString(input, "requiredBondSats"),
    currentBondTxid: getRequiredString(input, "currentBondTxid"),
    currentBondVout: getRequiredInteger(input, "currentBondVout"),
    currentBondValueSats: getRequiredString(input, "currentBondValueSats"),
    lastStateTxid: getRequiredString(input, "lastStateTxid"),
    winningCommitBlockHeight: getRequiredInteger(input, "winningCommitBlockHeight"),
    winningCommitTxIndex: getRequiredInteger(input, "winningCommitTxIndex")
  };
}

async function connectDatabase(config: DatabaseConfig): Promise<Client> {
  const client = new Client(buildClientConfig(config.connectionString));

  await client.connect();
  return client;
}

export function buildClientConfig(connectionString: string): ConstructorParameters<typeof Client>[0] {
  const clientConfig: ConstructorParameters<typeof Client>[0] = {
    connectionString
  };

  try {
    const url = new URL(connectionString);
    const hostname = url.hostname.toLowerCase();
    const sslMode = url.searchParams.get("sslmode")?.trim().toLowerCase() ?? "";

    if (hostname.endsWith(".supabase.com") || sslMode === "require" || sslMode === "verify-ca" || sslMode === "verify-full") {
      return {
        ...clientConfig,
        ssl: {
          rejectUnauthorized: false
        }
      };
    }
  } catch {
    return clientConfig;
  }

  return clientConfig;
}

function normalizeDatabaseIdentifier(value: string, label: string): string {
  const trimmed = value.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
    throw new Error(`invalid database ${label}: ${value}`);
  }

  return trimmed;
}

function validateDocumentKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("document key must not be empty");
  }

  if (trimmed.length > 120) {
    throw new Error("document key must be 120 characters or fewer");
  }

  return trimmed;
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function parsePendingCommitRecord(input: unknown): PersistedIndexerSnapshot["pendingCommits"][number] {
  if (!isRecord(input)) {
    throw new Error("pending commit record must be an object");
  }

  return {
    txid: getRequiredString(input, "txid"),
    bondVout: getRequiredInteger(input, "bondVout"),
    bondValueSats: getNullableString(input, "bondValueSats"),
    ownerPubkey: getRequiredString(input, "ownerPubkey"),
    commitHash: getRequiredString(input, "commitHash"),
    blockHeight: getRequiredInteger(input, "blockHeight"),
    txIndex: getRequiredInteger(input, "txIndex"),
    revealDeadlineHeight: getRequiredInteger(input, "revealDeadlineHeight")
  };
}

function parsePendingBatchAnchorRecord(
  input: unknown
): PersistedIndexerSnapshot["pendingBatchAnchors"][number] {
  if (!isRecord(input)) {
    throw new Error("pending batch anchor record must be an object");
  }

  return {
    txid: getRequiredString(input, "txid"),
    merkleRoot: getRequiredString(input, "merkleRoot"),
    leafCount: getRequiredInteger(input, "leafCount"),
    bondOutputs: getRequiredArray(input, "bondOutputs").map((output) => {
      if (!isRecord(output)) {
        throw new Error("pending batch anchor bond output must be an object");
      }

      return {
        vout: getRequiredInteger(output, "vout"),
        bondValueSats: getNullableString(output, "bondValueSats")
      };
    }),
    revealedBondVouts: getRequiredArray(input, "revealedBondVouts").map((value) => {
      if (typeof value !== "number" || !Number.isInteger(value)) {
        throw new Error("pending batch anchor revealedBondVouts entries must be integers");
      }

      return value;
    }),
    blockHeight: getRequiredInteger(input, "blockHeight"),
    txIndex: getRequiredInteger(input, "txIndex"),
    revealDeadlineHeight: getRequiredInteger(input, "revealDeadlineHeight")
  };
}

function parseSpentOutpointObservation(
  input: unknown
): PersistedSpentOutpointObservation {
  if (!isRecord(input)) {
    throw new Error("spent outpoint must be an object");
  }

  return {
    outpointTxid: getRequiredString(input, "outpointTxid"),
    outpointVout: getRequiredInteger(input, "outpointVout"),
    spentTxid: getRequiredString(input, "spentTxid"),
    spentBlockHeight: getRequiredInteger(input, "spentBlockHeight"),
    spentTxIndex: getRequiredInteger(input, "spentTxIndex"),
    spendingInputIndex: getRequiredInteger(input, "spendingInputIndex")
  };
}

function parseTransactionProvenanceRecord(
  input: unknown
): PersistedIndexerSnapshot["transactionProvenance"][number] {
  if (!isRecord(input)) {
    throw new Error("transaction provenance record must be an object");
  }

  return {
    txid: getRequiredString(input, "txid"),
    blockHeight: getRequiredInteger(input, "blockHeight"),
    txIndex: getRequiredInteger(input, "txIndex"),
    inputs: getRequiredArray(input, "inputs").map(parseTransactionInput),
    outputs: getRequiredArray(input, "outputs").map(parseTransactionOutput),
    events: getRequiredArray(input, "events").map(parseTransactionProvenanceEvent),
    invalidatedNames: getRequiredArray(input, "invalidatedNames").map((value) => {
      if (typeof value !== "string") {
        throw new Error("invalidatedNames entries must be strings");
      }

      return value;
    })
  };
}

function parseTransactionInput(
  input: unknown
): PersistedIndexerSnapshot["transactionProvenance"][number]["inputs"][number] {
  if (!isRecord(input)) {
    throw new Error("transaction input must be an object");
  }

  const txid = input.txid;
  const vout = input.vout;
  const coinbase = input.coinbase;

  if (txid !== null && typeof txid !== "string") {
    throw new Error("transaction input txid must be a string or null");
  }

  if (vout !== null && (typeof vout !== "number" || !Number.isInteger(vout))) {
    throw new Error("transaction input vout must be an integer or null");
  }

  if (typeof coinbase !== "boolean") {
    throw new Error("transaction input coinbase must be a boolean");
  }

  return {
    txid,
    vout,
    coinbase
  };
}

function parseTransactionOutput(
  input: unknown
): PersistedIndexerSnapshot["transactionProvenance"][number]["outputs"][number] {
  if (!isRecord(input)) {
    throw new Error("transaction output must be an object");
  }

  const scriptType = input.scriptType;
  if (scriptType !== "op_return" && scriptType !== "payment" && scriptType !== "unknown") {
    throw new Error("transaction output scriptType must be a known value");
  }

  const dataHex = input.dataHex;
  if (dataHex !== undefined && typeof dataHex !== "string") {
    throw new Error("transaction output dataHex must be a string when present");
  }

  return {
    valueSats: getRequiredString(input, "valueSats"),
    scriptType,
    ...(dataHex === undefined ? {} : { dataHex })
  };
}

function parseTransactionProvenanceEvent(
  input: unknown
): PersistedIndexerSnapshot["transactionProvenance"][number]["events"][number] {
  if (!isRecord(input)) {
    throw new Error("transaction provenance event must be an object");
  }

  const typeName = input.typeName;
  if (
    typeName !== "COMMIT" &&
    typeName !== "REVEAL" &&
    typeName !== "TRANSFER" &&
    typeName !== "BATCH_ANCHOR" &&
    typeName !== "BATCH_REVEAL" &&
    typeName !== "REVEAL_PROOF_CHUNK" &&
    typeName !== "AUCTION_BID"
  ) {
    throw new Error(
      "transaction provenance event typeName must be COMMIT, REVEAL, TRANSFER, BATCH_ANCHOR, BATCH_REVEAL, REVEAL_PROOF_CHUNK, or AUCTION_BID"
    );
  }

  const validationStatus = input.validationStatus;
  if (validationStatus !== "applied" && validationStatus !== "ignored") {
    throw new Error("transaction provenance event validationStatus must be applied or ignored");
  }

  return {
    vout: getRequiredInteger(input, "vout"),
    type: getRequiredInteger(input, "type"),
    typeName,
    payload: parseTransactionProvenancePayload(getRequiredRecord(input, "payload")),
    validationStatus,
    reason: getRequiredString(input, "reason"),
    affectedName: getNullableString(input, "affectedName")
  };
}

function parseTransactionProvenancePayload(
  input: Record<string, unknown>
): PersistedTransactionProvenancePayload {
  if ("anchorTxid" in input) {
    return {
      anchorTxid: getRequiredString(input, "anchorTxid"),
      ownerPubkey: getRequiredString(input, "ownerPubkey"),
      nonce: getRequiredString(input, "nonce"),
      bondVout: getRequiredInteger(input, "bondVout"),
      proofBytesLength: getRequiredInteger(input, "proofBytesLength"),
      proofChunkCount: getRequiredInteger(input, "proofChunkCount"),
      name: getRequiredString(input, "name")
    };
  }

  if ("merkleRoot" in input) {
    return {
      flags: getRequiredInteger(input, "flags"),
      leafCount: getRequiredInteger(input, "leafCount"),
      merkleRoot: getRequiredString(input, "merkleRoot")
    };
  }

  if ("chunkIndex" in input) {
    return {
      chunkIndex: getRequiredInteger(input, "chunkIndex"),
      proofBytesHex: getRequiredString(input, "proofBytesHex")
    };
  }

  if ("auctionCommitment" in input) {
    return {
      flags: getRequiredInteger(input, "flags"),
      bondVout: getRequiredInteger(input, "bondVout"),
      reservedLockBlocks: getRequiredInteger(input, "reservedLockBlocks"),
      bidAmountSats: getRequiredString(input, "bidAmountSats"),
      ownerPubkey: getRequiredString(input, "ownerPubkey"),
      auctionLotCommitment: getRequiredString(input, "auctionLotCommitment"),
      auctionCommitment: getRequiredString(input, "auctionCommitment"),
      bidderCommitment: getRequiredString(input, "bidderCommitment")
    };
  }

  if ("bondVout" in input) {
    return {
      bondVout: getRequiredInteger(input, "bondVout"),
      ownerPubkey: getRequiredString(input, "ownerPubkey"),
      commitHash: getRequiredString(input, "commitHash")
    };
  }

  if ("nonce" in input) {
    return {
      commitTxid: getRequiredString(input, "commitTxid"),
      nonce: getRequiredString(input, "nonce"),
      name: getRequiredString(input, "name")
    };
  }

  return {
    prevStateTxid: getRequiredString(input, "prevStateTxid"),
    newOwnerPubkey: getRequiredString(input, "newOwnerPubkey"),
    flags: getRequiredInteger(input, "flags"),
    successorBondVout: getRequiredInteger(input, "successorBondVout"),
    signature: getRequiredString(input, "signature")
  };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}

function getRequiredArray(input: Record<string, unknown>, key: string): unknown[] {
  const value = input[key];

  if (!Array.isArray(value)) {
    throw new Error(`${key} must be an array`);
  }

  return value;
}

function getOptionalArray(input: Record<string, unknown>, key: string): unknown[] | undefined {
  const value = input[key];

  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(`${key} must be an array`);
  }

  return value;
}

function getRequiredRecord(input: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = input[key];

  if (!isRecord(value)) {
    throw new Error(`${key} must be an object`);
  }

  return value;
}

function getRequiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];

  if (typeof value !== "string") {
    throw new Error(`${key} must be a string`);
  }

  return value;
}

function getRequiredInteger(input: Record<string, unknown>, key: string): number {
  const value = input[key];

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${key} must be an integer`);
  }

  return value;
}

function getNullableInteger(input: Record<string, unknown>, key: string): number | null {
  const value = input[key];

  if (value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${key} must be an integer or null`);
  }

  return value;
}

function getNullableString(input: Record<string, unknown>, key: string): string | null {
  const value = input[key];

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${key} must be a string or null`);
  }

  return value;
}

function getOptionalInteger(input: Record<string, unknown>, key: string): number | undefined {
  const value = input[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${key} must be an integer when present`);
  }

  return value;
}

function getOptionalString(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${key} must be a string when present`);
  }

  return value;
}

function getRequiredNameStatus(
  input: Record<string, unknown>,
  key: string
): PersistedIndexerSnapshot["names"][number]["status"] {
  const value = input[key];

  if (value !== "pending" && value !== "immature" && value !== "mature" && value !== "invalid") {
    throw new Error(`${key} must be a valid claimed name status`);
  }

  return value;
}

function getOptionalAuctionAcquisitionKind(
  input: Record<string, unknown>,
  key: string
): PersistedIndexerSnapshot["names"][number]["acquisitionKind"] {
  const value = input[key];

  if (value === undefined) {
    return undefined;
  }

  if (value !== "claim" && value !== "auction") {
    throw new Error(`${key} must be claim or auction when present`);
  }

  return value;
}
