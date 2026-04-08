import { createHash } from "node:crypto";

import { assertHexBytes, assertHexString, bytesToHex, hexToBytes } from "./bytes.js";

const LEAF_DOMAIN_TAG = Buffer.from("gnsmb0-leaf", "utf8");
const NODE_DOMAIN_TAG = Buffer.from("gnsmb0-node", "utf8");

export type MerkleProofPosition = "left" | "right";

export interface BatchCommitLeafInput {
  readonly bondVout: number;
  readonly ownerPubkey: string;
  readonly commitHash: string;
}

export interface MerkleProofStep {
  readonly position: MerkleProofPosition;
  readonly hash: string;
}

export const MERKLE_PROOF_STEP_LENGTH = 33;

export function computeBatchCommitLeafHash(input: BatchCommitLeafInput): string {
  if (!Number.isInteger(input.bondVout) || input.bondVout < 0 || input.bondVout > 0xff) {
    throw new Error("bondVout must fit in one byte");
  }

  const hasher = createHash("sha256");
  hasher.update(LEAF_DOMAIN_TAG);
  hasher.update(Uint8Array.of(input.bondVout));
  hasher.update(hexToBytes(assertHexBytes(input.ownerPubkey, 32, "ownerPubkey")));
  hasher.update(hexToBytes(assertHexBytes(input.commitHash, 32, "commitHash")));

  return hasher.digest("hex");
}

export function computeMerkleNodeHash(leftHash: string, rightHash: string): string {
  const hasher = createHash("sha256");
  hasher.update(NODE_DOMAIN_TAG);
  hasher.update(hexToBytes(assertHexBytes(leftHash, 32, "leftHash")));
  hasher.update(hexToBytes(assertHexBytes(rightHash, 32, "rightHash")));

  return hasher.digest("hex");
}

export function computeMerkleRoot(leafHashes: readonly string[]): string {
  if (leafHashes.length === 0) {
    throw new Error("at least one leaf hash is required");
  }

  let currentLevel = leafHashes.map((hash, index) =>
    assertHexBytes(hash, 32, `leafHashes[${index}]`)
  );

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];

    for (let index = 0; index < currentLevel.length; index += 2) {
      const left = currentLevel[index];

      if (left === undefined) {
        throw new Error("unexpected missing merkle left node");
      }

      const right = currentLevel[index + 1] ?? left;
      nextLevel.push(computeMerkleNodeHash(left, right));
    }

    currentLevel = nextLevel;
  }

  const [root] = currentLevel;
  if (root === undefined) {
    throw new Error("failed to compute merkle root");
  }

  return root;
}

export function createMerkleProof(
  leafHashes: readonly string[],
  leafIndex: number
): MerkleProofStep[] {
  if (!Number.isInteger(leafIndex) || leafIndex < 0 || leafIndex >= leafHashes.length) {
    throw new Error("leafIndex must reference an existing leaf");
  }

  if (leafHashes.length === 0) {
    throw new Error("at least one leaf hash is required");
  }

  let currentLevel = leafHashes.map((hash, index) =>
    assertHexBytes(hash, 32, `leafHashes[${index}]`)
  );
  let currentIndex = leafIndex;
  const proof: MerkleProofStep[] = [];

  while (currentLevel.length > 1) {
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
    const sibling = currentLevel[siblingIndex] ?? currentLevel[currentIndex];
    const position: MerkleProofPosition = currentIndex % 2 === 0 ? "right" : "left";

    if (sibling === undefined) {
      throw new Error("unexpected missing merkle sibling node");
    }

    proof.push({
      position,
      hash: sibling
    });

    const nextLevel: string[] = [];
    for (let index = 0; index < currentLevel.length; index += 2) {
      const left = currentLevel[index];

      if (left === undefined) {
        throw new Error("unexpected missing merkle left node");
      }

      const right = currentLevel[index + 1] ?? left;
      nextLevel.push(computeMerkleNodeHash(left, right));
    }

    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }

  return proof;
}

export function verifyMerkleProof(input: {
  readonly leafHash: string;
  readonly proof: readonly MerkleProofStep[];
  readonly expectedRoot: string;
}): boolean {
  let currentHash = assertHexBytes(input.leafHash, 32, "leafHash");
  const expectedRoot = assertHexBytes(input.expectedRoot, 32, "expectedRoot");

  for (const [index, step] of input.proof.entries()) {
    const siblingHash = assertHexBytes(step.hash, 32, `proof[${index}].hash`);

    if (step.position === "left") {
      currentHash = computeMerkleNodeHash(siblingHash, currentHash);
      continue;
    }

    if (step.position === "right") {
      currentHash = computeMerkleNodeHash(currentHash, siblingHash);
      continue;
    }

    throw new Error(`proof[${index}].position must be left or right`);
  }

  return currentHash === expectedRoot;
}

export function encodeMerkleProof(proof: readonly MerkleProofStep[]): Uint8Array {
  const bytes = new Uint8Array(proof.length * MERKLE_PROOF_STEP_LENGTH);
  let offset = 0;

  for (const [index, step] of proof.entries()) {
    const positionByte = getMerkleProofPositionByte(step.position, index);
    const hashBytes = hexToBytes(assertHexBytes(step.hash, 32, `proof[${index}].hash`));

    bytes[offset] = positionByte;
    bytes.set(hashBytes, offset + 1);
    offset += MERKLE_PROOF_STEP_LENGTH;
  }

  return bytes;
}

export function decodeMerkleProof(bytes: Uint8Array): MerkleProofStep[] {
  if (bytes.length % MERKLE_PROOF_STEP_LENGTH !== 0) {
    throw new Error(
      `merkle proof bytes must be a multiple of ${MERKLE_PROOF_STEP_LENGTH}`
    );
  }

  const proof: MerkleProofStep[] = [];

  for (let offset = 0; offset < bytes.length; offset += MERKLE_PROOF_STEP_LENGTH) {
    const positionByte = bytes[offset];
    const siblingHash = bytesToHex(bytes.slice(offset + 1, offset + MERKLE_PROOF_STEP_LENGTH));

    if (positionByte !== 0x00 && positionByte !== 0x01) {
      throw new Error(`invalid merkle proof position byte ${positionByte}`);
    }

    proof.push({
      position: positionByte === 0x00 ? "left" : "right",
      hash: siblingHash
    });
  }

  return proof;
}

export function parseMerkleProofHex(proofHex: string): MerkleProofStep[] {
  if (proofHex === "") {
    return [];
  }

  return decodeMerkleProof(hexToBytes(assertHexString(proofHex, "proofHex")));
}

function getMerkleProofPositionByte(position: MerkleProofPosition, index: number): number {
  if (position === "left") {
    return 0x00;
  }

  if (position === "right") {
    return 0x01;
  }

  throw new Error(`proof[${index}].position must be left or right`);
}
