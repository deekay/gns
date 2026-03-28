import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  bytesToHex,
  parseSignedValueRecord,
  signValueRecord,
  type SignedValueRecord
} from "@gns/protocol";

export function createSignedValueRecord(options: {
  readonly name: string;
  readonly ownerPrivateKeyHex: string;
  readonly sequence: number;
  readonly valueType: number;
  readonly payloadUtf8?: string;
  readonly payloadHex?: string;
}): SignedValueRecord {
  return signValueRecord({
    name: options.name,
    ownerPrivateKeyHex: options.ownerPrivateKeyHex,
    sequence: options.sequence,
    valueType: options.valueType,
    payloadHex: resolvePayloadHex(
      options.payloadUtf8 === undefined && options.payloadHex === undefined
        ? {}
        : {
            ...(options.payloadUtf8 === undefined ? {} : { payloadUtf8: options.payloadUtf8 }),
            ...(options.payloadHex === undefined ? {} : { payloadHex: options.payloadHex })
          }
    )
  });
}

export async function loadSignedValueRecord(filePath: string): Promise<SignedValueRecord> {
  const resolvedPath = resolve(process.cwd(), filePath);
  const raw = await readFile(resolvedPath, "utf8");
  return parseSignedValueRecord(JSON.parse(raw));
}

export async function publishValueRecord(options: {
  readonly resolverUrl?: string;
  readonly valueRecord: SignedValueRecord;
}): Promise<unknown> {
  const resolverUrl = resolveResolverUrl(options.resolverUrl);
  const response = await fetch(`${resolverUrl.replace(/\/$/, "")}/values`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(options.valueRecord)
  });
  const raw = await response.text();
  const parsed = raw.length === 0 ? null : JSON.parse(raw);

  if (!response.ok) {
    const message =
      parsed !== null &&
      typeof parsed === "object" &&
      parsed !== null &&
      "message" in parsed &&
      typeof parsed.message === "string"
        ? parsed.message
        : `resolver returned HTTP ${response.status}`;
    throw new Error(message);
  }

  return parsed;
}

function resolvePayloadHex(input: {
  readonly payloadUtf8?: string;
  readonly payloadHex?: string;
}): string {
  if (input.payloadUtf8 !== undefined && input.payloadHex !== undefined) {
    throw new Error("use either --payload-utf8 or --payload-hex, not both");
  }

  if (input.payloadUtf8 !== undefined) {
    return bytesToHex(Buffer.from(input.payloadUtf8, "utf8"));
  }

  return input.payloadHex ?? "";
}

function resolveResolverUrl(explicitResolverUrl: string | undefined): string {
  if (explicitResolverUrl) {
    return explicitResolverUrl;
  }

  if (process.env.GNS_RESOLVER_URL) {
    return process.env.GNS_RESOLVER_URL;
  }

  const port = process.env.GNS_RESOLVER_PORT ?? "8787";
  return `http://127.0.0.1:${port}`;
}
