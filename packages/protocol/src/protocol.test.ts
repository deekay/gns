import { describe, expect, it } from "vitest";
import * as secp256k1 from "tiny-secp256k1";

import {
  BOND_FLOOR_SATS,
  BATCH_ANCHOR_PAYLOAD_LENGTH,
  BATCH_CLAIM_PACKAGE_FORMAT,
  BATCH_CLAIM_PACKAGE_VERSION,
  BATCH_REVEAL_MIN_PAYLOAD_LENGTH,
  CLAIM_PACKAGE_FORMAT,
  CLAIM_PACKAGE_VERSION,
  computeBatchCommitLeafHash,
  createBatchClaimPackage,
  createClaimPackage,
  createMerkleProof,
  createTransferPackage,
  DEFAULT_BATCH_PROOF_CHUNK_BYTES,
  INITIAL_MATURITY_BLOCKS,
  decodeBatchAnchorPayload,
  decodeBatchRevealPayload,
  MIN_MATURITY_BLOCKS,
  decodeMerkleProof,
  computeCommitHash,
  decodeCommitPayload,
  decodeGnsPayload,
  decodeRevealPayload,
  decodeRevealProofChunkPayload,
  decodeTransferBody,
  encodeBatchAnchorPayload,
  encodeBatchRevealPayload,
  encodeCommitPayload,
  encodeMerkleProof,
  computeTransferAuthorizationHash,
  encodeTransferPayload,
  encodeRevealPayload,
  encodeRevealProofChunkPayload,
  encodeTransferBody,
  GnsEventType,
  getBondSats,
  getEpochIndex,
  getMaturityBlocks,
  computeMerkleRoot,
  normalizeName,
  parseBatchClaimPackage,
  parseClaimPackage,
  parseMerkleProofHex,
  parseTransferPackage,
  parseSignedValueRecord,
  PROTOCOL_NAME,
  REVEAL_PROOF_CHUNK_MIN_PAYLOAD_LENGTH,
  signTransferAuthorization,
  signValueRecord,
  TRANSFER_PACKAGE_FORMAT,
  TRANSFER_PACKAGE_VERSION,
  VALUE_RECORD_FORMAT,
  VALUE_RECORD_VERSION,
  verifyMerkleProof,
  verifyTransferAuthorization,
  verifyValueRecord
} from "./index.js";

describe("normalizeName", () => {
  it("canonicalizes names to lowercase", () => {
    expect(normalizeName("Alice123")).toBe("alice123");
  });

  it("rejects characters outside the v1 alphabet", () => {
    expect(() => normalizeName("alice-123")).toThrow(/invalid GNS name/);
  });
});

describe("getBondSats", () => {
  it("halves per additional character before reaching the floor", () => {
    expect(getBondSats(1)).toBe(100_000_000n);
    expect(getBondSats(2)).toBe(50_000_000n);
    expect(getBondSats(3)).toBe(25_000_000n);
  });

  it("holds the configured floor for long names", () => {
    expect(getBondSats(12)).toBe(BOND_FLOOR_SATS);
    expect(getBondSats(32)).toBe(BOND_FLOOR_SATS);
  });
});

describe("getMaturityBlocks", () => {
  it("halves each epoch until the floor is reached", () => {
    expect(getMaturityBlocks(0)).toBe(INITIAL_MATURITY_BLOCKS);
    expect(getMaturityBlocks(1)).toBe(26_000);
    expect(getMaturityBlocks(2)).toBe(13_000);
    expect(getMaturityBlocks(3)).toBe(6_500);
    expect(getMaturityBlocks(4)).toBe(MIN_MATURITY_BLOCKS);
    expect(getMaturityBlocks(12)).toBe(MIN_MATURITY_BLOCKS);
  });

  it("derives epoch index from launch and claim heights", () => {
    expect(getEpochIndex(500_000, 500_000)).toBe(0);
    expect(getEpochIndex(552_000, 500_000)).toBe(1);
  });
});

describe("computeCommitHash", () => {
  it("is deterministic for the same commit input", () => {
    const input = {
      name: "alice",
      nonce: 42n,
      ownerPubkey: "11".repeat(32)
    };

    expect(computeCommitHash(input)).toBe(computeCommitHash(input));
  });

  it("changes when the name changes", () => {
    const first = computeCommitHash({
      name: "alice",
      nonce: 42n,
      ownerPubkey: "11".repeat(32)
    });
    const second = computeCommitHash({
      name: "bob",
      nonce: 42n,
      ownerPubkey: "11".repeat(32)
    });

    expect(first).not.toBe(second);
  });
});

describe("wire payloads", () => {
  it("round-trips commit payloads in a single 70-byte message", () => {
    const encoded = encodeCommitPayload({
      bondVout: 0,
      ownerPubkey: "11".repeat(32),
      commitHash: "22".repeat(32)
    });

    expect(encoded).toHaveLength(70);
    expect(decodeCommitPayload(encoded)).toEqual({
      bondVout: 0,
      ownerPubkey: "11".repeat(32),
      commitHash: "22".repeat(32)
    });
  });

  it("round-trips reveal payloads within the conservative size target", () => {
    const encoded = encodeRevealPayload({
      commitTxid: "33".repeat(32),
      nonce: 42n,
      name: "alice123"
    });

    expect(encoded.length).toBeLessThanOrEqual(78);
    expect(decodeRevealPayload(encoded)).toEqual({
      commitTxid: "33".repeat(32),
      nonce: 42n,
      name: "alice123"
    });
  });

  it("encodes the provisional transfer body length consistently", () => {
    const encoded = encodeTransferBody({
      prevStateTxid: "44".repeat(32),
      newOwnerPubkey: "55".repeat(32),
      flags: 0x00,
      successorBondVout: 0x02,
      signature: "66".repeat(64)
    });

    expect(encoded).toHaveLength(130);
    expect(decodeTransferBody(encoded)).toEqual({
      prevStateTxid: "44".repeat(32),
      newOwnerPubkey: "55".repeat(32),
      flags: 0x00,
      successorBondVout: 0x02,
      signature: "66".repeat(64)
    });
  });

  it("decodes wrapped transfer payloads through the generic dispatcher", () => {
    const encoded = encodeTransferPayload({
      prevStateTxid: "44".repeat(32),
      newOwnerPubkey: "55".repeat(32),
      flags: 0x00,
      successorBondVout: 0x02,
      signature: "66".repeat(64)
    });

    expect(decodeGnsPayload(encoded)).toEqual({
      type: GnsEventType.Transfer,
      payload: {
        prevStateTxid: "44".repeat(32),
        newOwnerPubkey: "55".repeat(32),
        flags: 0x00,
        successorBondVout: 0x02,
        signature: "66".repeat(64)
      }
    });
  });

  it("round-trips batch anchor payloads", () => {
    const encoded = encodeBatchAnchorPayload({
      flags: 0x00,
      leafCount: 3,
      merkleRoot: "77".repeat(32)
    });

    expect(encoded).toHaveLength(BATCH_ANCHOR_PAYLOAD_LENGTH);
    expect(decodeBatchAnchorPayload(encoded)).toEqual({
      flags: 0x00,
      leafCount: 3,
      merkleRoot: "77".repeat(32)
    });
    expect(decodeGnsPayload(encoded)).toEqual({
      type: GnsEventType.BatchAnchor,
      payload: {
        flags: 0x00,
        leafCount: 3,
        merkleRoot: "77".repeat(32)
      }
    });
  });

  it("round-trips batch reveal payloads", () => {
    const encoded = encodeBatchRevealPayload({
      anchorTxid: "88".repeat(32),
      ownerPubkey: "99".repeat(32),
      nonce: 42n,
      bondVout: 3,
      proofBytesLength: 66,
      proofChunkCount: 2,
      name: "alice123"
    });

    expect(encoded.length).toBe(BATCH_REVEAL_MIN_PAYLOAD_LENGTH + "alice123".length);
    expect(decodeBatchRevealPayload(encoded)).toEqual({
      anchorTxid: "88".repeat(32),
      ownerPubkey: "99".repeat(32),
      nonce: 42n,
      bondVout: 3,
      proofBytesLength: 66,
      proofChunkCount: 2,
      name: "alice123"
    });
    expect(decodeGnsPayload(encoded)).toEqual({
      type: GnsEventType.BatchReveal,
      payload: {
        anchorTxid: "88".repeat(32),
        ownerPubkey: "99".repeat(32),
        nonce: 42n,
        bondVout: 3,
        proofBytesLength: 66,
        proofChunkCount: 2,
        name: "alice123"
      }
    });
  });

  it("round-trips reveal proof chunk payloads", () => {
    const encoded = encodeRevealProofChunkPayload({
      chunkIndex: 1,
      proofBytesHex: "aa".repeat(12)
    });

    expect(encoded.length).toBe(REVEAL_PROOF_CHUNK_MIN_PAYLOAD_LENGTH + 12);
    expect(decodeRevealProofChunkPayload(encoded)).toEqual({
      chunkIndex: 1,
      proofBytesHex: "aa".repeat(12)
    });
    expect(decodeGnsPayload(encoded)).toEqual({
      type: GnsEventType.RevealProofChunk,
      payload: {
        chunkIndex: 1,
        proofBytesHex: "aa".repeat(12)
      }
    });
  });

  it("signs and verifies transfer authorizations against the owner x-only pubkey", () => {
    const ownerPrivateKeyHex = "07".repeat(32);
    const ownerPubkey = Buffer.from(
      secp256k1.xOnlyPointFromScalar(Buffer.from(ownerPrivateKeyHex, "hex"))
    ).toString("hex");
    const signature = signTransferAuthorization({
      prevStateTxid: "44".repeat(32),
      newOwnerPubkey: "55".repeat(32),
      flags: 0x00,
      successorBondVout: 0x02,
      ownerPrivateKeyHex
    });

    expect(computeTransferAuthorizationHash({
      prevStateTxid: "44".repeat(32),
      newOwnerPubkey: "55".repeat(32),
      flags: 0x00,
      successorBondVout: 0x02
    })).toHaveLength(64);

    expect(
      verifyTransferAuthorization({
        prevStateTxid: "44".repeat(32),
        newOwnerPubkey: "55".repeat(32),
        flags: 0x00,
        successorBondVout: 0x02,
        ownerPubkey,
        signature
      })
    ).toBe(true);
  });
});

describe("merkle batching helpers", () => {
  it("computes deterministic batch leaf hashes", () => {
    expect(
      computeBatchCommitLeafHash({
        bondVout: 0,
        ownerPubkey: "11".repeat(32),
        commitHash: "22".repeat(32)
      })
    ).toBe(
      computeBatchCommitLeafHash({
        bondVout: 0,
        ownerPubkey: "11".repeat(32),
        commitHash: "22".repeat(32)
      })
    );
  });

  it("creates and verifies merkle proofs", () => {
    const leaves = [
      computeBatchCommitLeafHash({
        bondVout: 0,
        ownerPubkey: "11".repeat(32),
        commitHash: "aa".repeat(32)
      }),
      computeBatchCommitLeafHash({
        bondVout: 1,
        ownerPubkey: "22".repeat(32),
        commitHash: "bb".repeat(32)
      }),
      computeBatchCommitLeafHash({
        bondVout: 2,
        ownerPubkey: "33".repeat(32),
        commitHash: "cc".repeat(32)
      })
    ];

    const root = computeMerkleRoot(leaves);
    const proof = createMerkleProof(leaves, 1);

    expect(verifyMerkleProof({
      leafHash: leaves[1] ?? "",
      proof,
      expectedRoot: root
    })).toBe(true);

    expect(verifyMerkleProof({
      leafHash: leaves[0] ?? "",
      proof,
      expectedRoot: root
    })).toBe(false);
  });

  it("encodes and decodes proof bytes deterministically", () => {
    const leaves = [
      computeBatchCommitLeafHash({
        bondVout: 0,
        ownerPubkey: "11".repeat(32),
        commitHash: "aa".repeat(32)
      }),
      computeBatchCommitLeafHash({
        bondVout: 1,
        ownerPubkey: "22".repeat(32),
        commitHash: "bb".repeat(32)
      })
    ];

    const proof = createMerkleProof(leaves, 0);
    const encoded = encodeMerkleProof(proof);
    const decoded = decodeMerkleProof(encoded);

    expect(decoded).toEqual(proof);
    expect(parseMerkleProofHex(Buffer.from(encoded).toString("hex"))).toEqual(proof);
  });

  it("treats a single-leaf proof as empty", () => {
    const leaf = computeBatchCommitLeafHash({
      bondVout: 0,
      ownerPubkey: "11".repeat(32),
      commitHash: "aa".repeat(32)
    });

    const proof = createMerkleProof([leaf], 0);

    expect(proof).toEqual([]);
    expect(parseMerkleProofHex("")).toEqual([]);
  });
});

describe("claim packages", () => {
  it("creates a valid claim package and auto-computes reveal payloads when commitTxid is present", () => {
    const created = createClaimPackage({
      name: "Bob",
      ownerPubkey: "11".repeat(32),
      nonceHex: "0102030405060708",
      bondVout: 1,
      bondDestination: " tb1qexamplebond ",
      changeDestination: "tb1qexamplechange",
      commitTxid: "22".repeat(32),
      exportedAt: "2026-03-19T08:00:00.000Z"
    });

    expect(created).toMatchObject({
      name: "bob",
      bondVout: 1,
      bondDestination: "tb1qexamplebond",
      changeDestination: "tb1qexamplechange",
      revealReady: true,
      commitTxid: "22".repeat(32)
    });
    expect(created.revealPayloadHex).not.toBeNull();
    expect(created.revealPayloadBytes).toBe((created.revealPayloadHex?.length ?? 0) / 2);
  });

  it("parses and validates a claim package before reveal is ready", () => {
    const ownerPubkey = "11".repeat(32);
    const nonceHex = "0102030405060708";
    const name = "bob";
    const commitHash = computeCommitHash({
      name,
      nonce: 0x0102_0304_0506_0708n,
      ownerPubkey
    });
    const commitPayloadHex = Buffer.from(
      encodeCommitPayload({
        bondVout: 0,
        ownerPubkey,
        commitHash
      })
    ).toString("hex");

    expect(
      parseClaimPackage({
        format: CLAIM_PACKAGE_FORMAT,
        packageVersion: CLAIM_PACKAGE_VERSION,
        protocol: PROTOCOL_NAME,
        exportedAt: "2026-03-18T20:00:00.000Z",
        name,
        ownerPubkey,
        nonceHex,
        nonceDecimal: "72623859790382856",
        requiredBondSats: getBondSats(name.length).toString(),
        bondVout: 0,
        bondDestination: "tb1qexamplebond",
        changeDestination: "tb1qexamplechange",
        commitHash,
        commitPayloadHex,
        commitPayloadBytes: 70,
        commitTxid: null,
        revealReady: false,
        revealPayloadHex: null,
        revealPayloadBytes: null
      })
    ).toMatchObject({
      name,
      ownerPubkey,
      bondVout: 0,
      revealReady: false
    });
  });

  it("rejects a claim package with mismatched bond amount", () => {
    expect(() =>
      parseClaimPackage({
        format: CLAIM_PACKAGE_FORMAT,
        packageVersion: CLAIM_PACKAGE_VERSION,
        protocol: PROTOCOL_NAME,
        exportedAt: "2026-03-18T20:00:00.000Z",
        name: "bob",
        ownerPubkey: "11".repeat(32),
        nonceHex: "0102030405060708",
        nonceDecimal: "72623859790382856",
        requiredBondSats: "123",
        bondVout: 0,
        bondDestination: null,
        changeDestination: null,
        commitHash: "22".repeat(32),
        commitPayloadHex: "00",
        commitPayloadBytes: 1,
        commitTxid: null,
        revealReady: false,
        revealPayloadHex: null,
        revealPayloadBytes: null
      })
    ).toThrow(/requiredBondSats/);
  });
});

describe("batch claim packages", () => {
  it("creates a valid reveal-ready batch claim package", () => {
    const ownerPubkey = "11".repeat(32);
    const nonceHex = "0102030405060708";
    const name = "bob";
    const commitHash = computeCommitHash({
      name,
      nonce: BigInt(`0x${nonceHex}`),
      ownerPubkey
    });
    const leafHash = computeBatchCommitLeafHash({
      bondVout: 1,
      ownerPubkey,
      commitHash
    });

    const created = createBatchClaimPackage({
      name: "Bob",
      ownerPubkey,
      nonceHex,
      bondVout: 1,
      bondDestination: " tb1qexamplebond ",
      changeDestination: "tb1qexamplechange",
      batchMerkleRoot: leafHash,
      batchLeafCount: 1,
      batchProofHex: "",
      batchAnchorTxid: "aa".repeat(32),
      proofChunkBytes: DEFAULT_BATCH_PROOF_CHUNK_BYTES,
      exportedAt: "2026-04-08T18:00:00.000Z"
    });

    expect(created).toMatchObject({
      format: BATCH_CLAIM_PACKAGE_FORMAT,
      packageVersion: BATCH_CLAIM_PACKAGE_VERSION,
      name: "bob",
      bondVout: 1,
      batchLeafHash: leafHash,
      batchMerkleRoot: leafHash,
      batchProofHex: "",
      batchProofBytes: 0,
      batchAnchorTxid: "aa".repeat(32),
      revealReady: true,
      revealProofChunkPayloadsHex: []
    });
    expect(created.revealPayloadHex.length).toBe(created.revealPayloadBytes * 2);
  });

  it("parses and validates a batch claim package with a non-empty proof", () => {
    const leaves = [
      computeBatchCommitLeafHash({
        bondVout: 1,
        ownerPubkey: "11".repeat(32),
        commitHash: computeCommitHash({
          name: "bob",
          nonce: 0x0102_0304_0506_0708n,
          ownerPubkey: "11".repeat(32)
        })
      }),
      computeBatchCommitLeafHash({
        bondVout: 2,
        ownerPubkey: "22".repeat(32),
        commitHash: computeCommitHash({
          name: "alice",
          nonce: 0x1112_1314_1516_1718n,
          ownerPubkey: "22".repeat(32)
        })
      })
    ];
    const proof = createMerkleProof(leaves, 0);
    const proofHex = Buffer.from(encodeMerkleProof(proof)).toString("hex");

    const parsed = parseBatchClaimPackage(
      createBatchClaimPackage({
        name: "bob",
        ownerPubkey: "11".repeat(32),
        nonceHex: "0102030405060708",
        bondVout: 1,
        bondDestination: "tb1qexamplebond",
        changeDestination: "tb1qexamplechange",
        batchMerkleRoot: computeMerkleRoot(leaves),
        batchLeafCount: 2,
        batchProofHex: proofHex,
        batchAnchorTxid: "bb".repeat(32),
        proofChunkBytes: DEFAULT_BATCH_PROOF_CHUNK_BYTES
      })
    );

    expect(parsed.batchProofHex).toBe(proofHex);
    expect(parsed.revealProofChunkPayloadsHex).toHaveLength(1);
  });
});

describe("transfer packages", () => {
  it("creates a valid transfer package", () => {
    const created = createTransferPackage({
      name: "Psal16sn0m",
      currentStatus: "mature",
      currentOwnerPubkey: "11".repeat(32),
      newOwnerPubkey: "22".repeat(32),
      lastStateTxid: "33".repeat(32),
      currentBondTxid: "44".repeat(32),
      currentBondVout: 0,
      currentBondValueSats: "195312",
      requiredBondSats: "195312",
      recommendedMode: "sale",
      sellerPayoutAddress: " bc1qsellerexample ",
      successorBondAddress: " bc1qbonddestexample ",
      exportedAt: "2026-03-23T14:00:00.000Z",
      modes: [
        {
          key: "gift",
          title: "Gift",
          suitability: "Available",
          summary: "Simple owner handoff.",
          command: "npm run dev:cli -- submit-transfer ..."
        },
        {
          key: "sale",
          title: "Sale",
          suitability: "Selected",
          summary: "Cooperative payment and transfer.",
          command: "npm run dev:cli -- submit-sale-transfer ..."
        }
      ]
    });

    expect(created).toMatchObject({
      format: TRANSFER_PACKAGE_FORMAT,
      packageVersion: TRANSFER_PACKAGE_VERSION,
      protocol: PROTOCOL_NAME,
      name: "psal16sn0m",
      currentStatus: "mature",
      recommendedMode: "sale",
      sellerPayoutAddress: "bc1qsellerexample",
      successorBondAddress: "bc1qbonddestexample"
    });
  });

  it("rejects transfer packages whose recommended mode is not present", () => {
    expect(() =>
      parseTransferPackage({
        format: TRANSFER_PACKAGE_FORMAT,
        packageVersion: TRANSFER_PACKAGE_VERSION,
        protocol: PROTOCOL_NAME,
        exportedAt: "2026-03-23T14:00:00.000Z",
        name: "psal16sn0m",
        currentStatus: "mature",
        currentOwnerPubkey: "11".repeat(32),
        newOwnerPubkey: "22".repeat(32),
        lastStateTxid: "33".repeat(32),
        currentBondTxid: "44".repeat(32),
        currentBondVout: 0,
        currentBondValueSats: "195312",
        requiredBondSats: "195312",
        recommendedMode: "sale",
        sellerPayoutAddress: null,
        successorBondAddress: null,
        modes: [
          {
            key: "gift",
            title: "Gift",
            suitability: "Available",
            summary: "Simple owner handoff.",
            command: "npm run dev:cli -- submit-transfer ..."
          }
        ]
      })
    ).toThrow(/recommendedMode must match/);
  });
});

describe("value records", () => {
  it("signs and verifies owner-authenticated off-chain value records", () => {
    const ownerPrivateKeyHex = "0c".repeat(32);
    const record = signValueRecord({
      name: "Alice",
      ownerPrivateKeyHex,
      sequence: 1,
      valueType: 0x02,
      payloadHex: Buffer.from("https://example.com/alice", "utf8").toString("hex")
    });

    expect(record.format).toBe(VALUE_RECORD_FORMAT);
    expect(record.recordVersion).toBe(VALUE_RECORD_VERSION);
    expect(record.name).toBe("alice");
    expect(record.signature).toHaveLength(128);
    expect(record.ownerPubkey).toHaveLength(64);
    expect(verifyValueRecord(record)).toBe(true);
  });

  it("parses and verifies signed value records", () => {
    const record = signValueRecord({
      name: "bob",
      ownerPrivateKeyHex: "0d".repeat(32),
      sequence: 3,
      valueType: 0x01,
      payloadHex: "001122"
    });

    const parsed = parseSignedValueRecord(record);

    expect(parsed).toEqual(record);
    expect(verifyValueRecord(parsed)).toBe(true);
  });
});
