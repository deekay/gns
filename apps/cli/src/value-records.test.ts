import { afterEach, describe, expect, it, vi } from "vitest";

import { createSignedValueRecord, publishValueRecord } from "./value-records.js";

const ORIGINAL_FETCH = globalThis.fetch;

describe("value record helpers", () => {
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it("creates signed value records from UTF-8 payloads", () => {
    const record = createSignedValueRecord({
      name: "Alice",
      ownerPrivateKeyHex: "0e".repeat(32),
      sequence: 1,
      valueType: 0x02,
      payloadUtf8: "https://example.com/alice"
    });

    expect(record.name).toBe("alice");
    expect(record.payloadHex).toBe(Buffer.from("https://example.com/alice", "utf8").toString("hex"));
    expect(record.signature).toHaveLength(128);
  });

  it("publishes signed value records to the resolver", async () => {
    const record = createSignedValueRecord({
      name: "bob",
      ownerPrivateKeyHex: "0f".repeat(32),
      sequence: 2,
      valueType: 0x01,
      payloadHex: "001122"
    });

    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          name: record.name,
          sequence: record.sequence
        }),
        {
          status: 201,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    ) as typeof fetch;

    await expect(
      publishValueRecord({
        resolverUrl: "http://127.0.0.1:8787",
        valueRecord: record
      })
    ).resolves.toMatchObject({
      ok: true,
      name: "bob",
      sequence: 2
    });
  });
});
