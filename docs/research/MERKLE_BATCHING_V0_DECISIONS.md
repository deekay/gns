# Merkle Batching v0 Decisions

This note closes the main wire-format questions that were still open in [MERKLE_BATCHING_V0.md](./MERKLE_BATCHING_V0.md).

These are still provisional implementation decisions, not a final immutable protocol freeze, but they are concrete enough to plan engineering work against.

## Purpose

The goal here is to remove ambiguity around the first Merkle-batching implementation target.

In particular, this note answers:

1. what the batch-anchor payload should look like
2. how reveal-side proof data should be carried
3. how leaves and internal nodes should be hashed
4. whether legacy single-commit support should remain during transition

## Decision 1: Use Explicit Batch-Specific Event Types

The clearest v0 path is to introduce explicit batch-specific carriers rather than overloading the existing `COMMIT` and `REVEAL` byte layouts.

Current recommendation:

- keep legacy `COMMIT`, `REVEAL`, and `TRANSFER` untouched
- add a dedicated batch-anchor event for batched ordinary-lane commits
- add a dedicated batched-reveal header event
- add a dedicated reveal-proof-chunk event for explicit proof carriage
- assign the first v0 batch carrier event codes as:
  - `BATCH_ANCHOR = 0x04`
  - `BATCH_REVEAL = 0x05`
  - `REVEAL_PROOF_CHUNK = 0x06`

This is a better engineering trade than trying to make one payload decoder silently support incompatible shapes.

### Why

- easier to reason about in the indexer
- easier to explain in docs and tests
- cleaner backward compatibility during transition
- avoids turning current exact-length decoders into ambiguous variable-shape parsers

## Decision 2: Batch Anchor Uses One Explicit Root Carrier

The batch anchor transaction should contain one explicit GNS batch-anchor payload plus one dedicated bond output per claim.

Recommended batch-anchor payload shape:

```text
magic(3) | version(1) | type(1) | flags(1) | leaf_count(1) | merkle_root(32)
```

Notes:

- `flags` is reserved for future compatibility and should be `0x00` in v0
- `leaf_count` is the number of claims/bond outputs represented in the root
- `merkle_root` is the 32-byte root over deterministic per-claim leaves

This keeps the anchor compact while still giving the indexer enough metadata to validate the batch structure.

## Decision 3: Bind Leaves To Dedicated Bond Outputs By `bond_vout`

Each leaf binds to exactly one dedicated bond output in the same anchor transaction.

Current v0 leaf contents:

```text
leaf_hash = sha256(
  "gnsmb0-leaf" |
  bond_vout_u8 |
  owner_pubkey_32 |
  commit_hash_32
)
```

### Why This Shape

- preserves one-claim-to-one-bond semantics
- keeps bond economics unchanged
- lets the indexer verify the exact funded bond output directly from the anchor transaction
- stays compatible with the current one-byte `bond_vout` assumption as long as batch size remains below `256`

### Deterministic Ordering

Leaves are ordered by ascending `bond_vout`.

That means:

- no extra leaf-position field is required
- the transaction itself provides the canonical ordering
- proof reconstruction remains deterministic

## Decision 4: Use Explicit Multi-Output Proof Carriage At Reveal Time

For v0, proof data should be carried explicitly in the reveal transaction, not hidden in Taproot or witness-specific tricks.

Recommended shape:

- one `BATCH_REVEAL` header output
- zero or more `REVEAL_PROOF_CHUNK` outputs in the same transaction
- proof bytes are reconstructed by concatenating chunk payloads in ascending `vout` order
- current implementation default: `66` proof bytes per chunk, which fits two `33`-byte proof steps cleanly

### Batched Reveal Header

Recommended header payload shape:

```text
magic(3) | version(1) | type(1) |
anchor_txid(32) |
owner_pubkey(32) |
nonce64(8) |
bond_vout(1) |
proof_bytes_len(2) |
proof_chunk_count(1) |
name_len(1) |
normalized_name(<=32)
```

The explicit `owner_pubkey` is part of the current implementation because the
leaf hash commits to both `owner_pubkey` and `commit_hash`. Without carrying it
at reveal time, the indexer cannot reconstruct the claim leaf from on-chain
data alone.

### Proof Chunk Payload

Recommended chunk payload shape:

```text
magic(3) | version(1) | type(1) | chunk_index(1) | proof_bytes(...)
```

### Why This Is The Right v0 Trade

- preserves explicit chain-visible verification
- fits the current indexer philosophy better than hidden witness semantics
- avoids forcing a Taproot-heavy signer redesign
- keeps the proof model inspectable for reviewers

### Important Policy Note

This design assumes a modern deployment baseline where multiple explicit data-carrier outputs are acceptable, or where direct-node broadcast is available.

That should be measured and tested directly on regtest and signet rather than assumed on paper.

## Decision 5: Use SHA-256 With Explicit Domain Separation

The v0 hashing model should remain simple and boring.

Current recommendation:

- leaf hash:
  - `sha256("gnsmb0-leaf" | bond_vout_u8 | owner_pubkey_32 | commit_hash_32)`
- internal node hash:
  - `sha256("gnsmb0-node" | left_hash_32 | right_hash_32)`

Odd-node rule:

- if a level has an odd number of nodes, duplicate the final node before hashing upward

### Why

- easy to explain and reimplement
- explicit domain separation avoids leaf/internal-node ambiguity
- duplicate-last is familiar and deterministic

## Decision 6: Keep Legacy Single-Commit Support During Transition

Yes: the first implementation should support both:

- legacy one-claim-one-commit ordinary-lane flow
- new batched ordinary-lane commit flow

This should be treated as a transition and validation aid, not as an excuse to leave the system half-migrated forever.

### Why

- easier regression testing
- easier staged rollout
- easier comparison of transaction sizes and UX
- gives the website and CLI a fallback path while batched flows mature

### Product Expectation

The website and CLI should make the mode explicit:

- legacy ordinary claim
- batched ordinary claim

Users should be able to inspect which one they are about to sign.

## Consequences For Planning

These decisions imply the first implementation plan should assume:

- new protocol event encoders / decoders
- updated indexer parsing logic
- explicit proof-package construction in architect / CLI
- website review surfaces for batched artifacts
- dual-path regression testing until the legacy path is intentionally retired

## Remaining Narrow Questions

These are now much smaller and should be handled during protocol implementation planning rather than blocking it:

1. whether `proof_bytes_len` should remain `u16` or widen later
2. whether v0 batch cap should be `32`, `64`, or another modest number

## Current Recommendation

With these defaults, Merkle batching is now concrete enough to treat as an implementation-planning problem rather than an open-ended research topic.
