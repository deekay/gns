import { describe, expect, it } from "vitest";

import {
  decodeProfileBundlePayloadHex,
  describeProfileBundle,
  encodeProfileBundlePayloadHex,
  listProfileBundleEntries
} from "../src/value-bundle.js";

describe("profile bundle helpers", () => {
  it("encodes and decodes a multi-destination profile bundle", () => {
    const payloadHex = encodeProfileBundlePayloadHex({
      entries: [
        { key: "website", value: "https://presidiobitcoin.com" },
        { key: "payment", value: "bitcoin:bc1qexample" },
        { key: "youtube", value: "https://youtube.com/@presidiobitcoin" },
        { key: "service", value: "https://api.presidiobitcoin.com" }
      ]
    });

    const decoded = decodeProfileBundlePayloadHex(payloadHex);
    expect(decoded).not.toBeNull();
    expect(decoded).toMatchObject({
      kind: "gns-profile-bundle",
      version: 2,
      entries: [
        { key: "website", value: "https://presidiobitcoin.com" },
        { key: "payment", value: "bitcoin:bc1qexample" },
        { key: "youtube", value: "https://youtube.com/@presidiobitcoin" },
        { key: "service", value: "https://api.presidiobitcoin.com" }
      ]
    });
  });

  it("describes the destinations present in a profile bundle", () => {
    const payloadHex = encodeProfileBundlePayloadHex({
      entries: [
        { key: "website", value: "https://presidiobitcoin.com" },
        { key: "payment", value: "bitcoin:bc1qexample" },
        { key: "youtube", value: "https://youtube.com/@presidiobitcoin" }
      ]
    });

    const decoded = decodeProfileBundlePayloadHex(payloadHex);
    expect(decoded).not.toBeNull();
    expect(listProfileBundleEntries(decoded!)).toEqual([
      { key: "website", value: "https://presidiobitcoin.com" },
      { key: "payment", value: "bitcoin:bc1qexample" },
      { key: "youtube", value: "https://youtube.com/@presidiobitcoin" }
    ]);
    expect(describeProfileBundle(decoded!)).toBe("Profile bundle · website, payment, youtube");
  });

  it("requires at least one key/value entry", () => {
    expect(() => encodeProfileBundlePayloadHex({ entries: [] })).toThrow(
      "Add at least one key/value entry to the bundle."
    );
  });

  it("decodes older structured bundles into generic entries", () => {
    const legacyHex = Buffer.from(
      JSON.stringify({
        kind: "gns-profile-bundle",
        version: 1,
        website: "https://presidiobitcoin.com",
        youtube: "https://youtube.com/@presidiobitcoin"
      }),
      "utf8"
    ).toString("hex");

    expect(decodeProfileBundlePayloadHex(legacyHex)).toEqual({
      kind: "gns-profile-bundle",
      version: 1,
      entries: [
        { key: "website", value: "https://presidiobitcoin.com" },
        { key: "youtube", value: "https://youtube.com/@presidiobitcoin" }
      ]
    });
  });

  it("allows repeated keys", () => {
    const payloadHex = encodeProfileBundlePayloadHex({
      entries: [
        { key: "youtube", value: "https://youtube.com/@one" },
        { key: "youtube", value: "https://youtube.com/@two" }
      ]
    });

    expect(decodeProfileBundlePayloadHex(payloadHex)).toMatchObject({
      entries: [
        { key: "youtube", value: "https://youtube.com/@one" },
        { key: "youtube", value: "https://youtube.com/@two" }
      ]
    });
  });

  it("rejects partial entries", () => {
    expect(() =>
      encodeProfileBundlePayloadHex({
        entries: [{ key: "youtube", value: "" }]
      })
    ).toThrow(
      "Profile bundle entry 1 needs both a key and a value."
    );
  });
});
