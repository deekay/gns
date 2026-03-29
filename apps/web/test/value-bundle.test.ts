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
      website: "https://presidiobitcoin.com",
      bitcoin: "bitcoin:bc1qexample",
      youtube: "https://youtube.com/@presidiobitcoin",
      service: "https://api.presidiobitcoin.com"
    });

    const decoded = decodeProfileBundlePayloadHex(payloadHex);
    expect(decoded).not.toBeNull();
    expect(decoded).toMatchObject({
      kind: "gns-profile-bundle",
      version: 1,
      website: "https://presidiobitcoin.com",
      bitcoin: "bitcoin:bc1qexample",
      youtube: "https://youtube.com/@presidiobitcoin",
      service: "https://api.presidiobitcoin.com"
    });
  });

  it("describes the destinations present in a profile bundle", () => {
    const payloadHex = encodeProfileBundlePayloadHex({
      website: "https://presidiobitcoin.com",
      bitcoin: "bitcoin:bc1qexample",
      youtube: "https://youtube.com/@presidiobitcoin"
    });

    const decoded = decodeProfileBundlePayloadHex(payloadHex);
    expect(decoded).not.toBeNull();
    expect(listProfileBundleEntries(decoded!)).toEqual([
      { label: "Website", value: "https://presidiobitcoin.com" },
      { label: "Bitcoin", value: "bitcoin:bc1qexample" },
      { label: "YouTube", value: "https://youtube.com/@presidiobitcoin" }
    ]);
    expect(describeProfileBundle(decoded!)).toBe("Profile bundle · website, bitcoin, youtube");
  });

  it("requires at least one destination or note", () => {
    expect(() => encodeProfileBundlePayloadHex({})).toThrow(
      "Add at least one destination or note to the profile bundle."
    );
  });
});
