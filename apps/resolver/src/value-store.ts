import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  loadDatabaseDocument,
  saveDatabaseDocument,
  type DatabaseConfig
} from "@gns/db";
import {
  normalizeName,
  parseSignedValueRecord,
  type SignedValueRecord,
  verifyValueRecord
} from "@gns/protocol";

export interface ValueRecordStoreSnapshot {
  readonly records: readonly SignedValueRecord[];
}

export function parseValueRecordStoreSnapshot(input: unknown): Map<string, SignedValueRecord> {
  if (!isRecord(input) || !Array.isArray(input.records)) {
    throw new Error("value record store must contain a records array");
  }

  return new Map(
    input.records.map((record) => {
      const parsedRecord = parseSignedValueRecord(record);

      if (!verifyValueRecord(parsedRecord)) {
        throw new Error(`stored value record for ${parsedRecord.name} failed signature verification`);
      }

      return [normalizeName(parsedRecord.name), parsedRecord] as const;
    })
  );
}

export async function loadValueRecordStoreFile(
  path: string
): Promise<Map<string, SignedValueRecord>> {
  try {
    const raw = await readFile(resolve(process.cwd(), path), "utf8");
    const parsed = JSON.parse(raw) as ValueRecordStoreSnapshot;
    return parseValueRecordStoreSnapshot(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes("ENOENT") ||
      message.includes("no such file")
    ) {
      return new Map();
    }

    throw error;
  }
}

export async function loadValueRecordStoreDatabase(
  config: DatabaseConfig,
  documentKey: string
): Promise<Map<string, SignedValueRecord>> {
  const payload = await loadDatabaseDocument(config, "value_record_store", documentKey);
  return payload === null ? new Map() : parseValueRecordStoreSnapshot(payload);
}

export async function saveValueRecordStoreFile(
  path: string,
  records: ReadonlyMap<string, SignedValueRecord>
): Promise<void> {
  const resolvedPath = resolve(process.cwd(), path);
  await mkdir(dirname(resolvedPath), { recursive: true });

  const snapshot: ValueRecordStoreSnapshot = {
    records: [...records.values()].sort((left, right) => left.name.localeCompare(right.name))
  };

  await writeFile(resolvedPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
}

export async function saveValueRecordStoreDatabase(
  config: DatabaseConfig,
  documentKey: string,
  records: ReadonlyMap<string, SignedValueRecord>
): Promise<void> {
  const snapshot: ValueRecordStoreSnapshot = {
    records: [...records.values()].sort((left, right) => left.name.localeCompare(right.name))
  };

  await saveDatabaseDocument(config, "value_record_store", documentKey, snapshot);
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}
