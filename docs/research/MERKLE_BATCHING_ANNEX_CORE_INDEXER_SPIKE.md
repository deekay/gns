# Merkle Batching Annex Core/Indexer Spike

This note captures the next research step after the experimental CLI annex
bridge.

The question here was:

> if we approach an annex-bearing batch reveal from the indexer side, can we
> recover the proof bytes from raw witness, verify them against the Merkle
> root, and explain exactly why the current explicit proof-chunk engine would
> still reject the same transaction?

This is still experimental. It is not protocol integration.

Artifacts:

- [experimental-annex.ts](../../packages/core/src/experimental-annex.ts)
- [experimental-annex.test.ts](../../packages/core/src/experimental-annex.test.ts)
- [annex-envelope.ts](../../apps/cli/src/annex-envelope.ts)

## What The Spike Adds

The new helper in `packages/core` does three things:

1. parses a signed annex-bearing reveal transaction from raw hex
2. recovers the hybrid explicit header and the annex witness bytes
3. verifies the Merkle proof against an expected anchor root

The important point is that this happens from a core/indexer point of view:

- start from signed transaction hex
- inspect raw witness
- inspect `OP_RETURN`
- reconstruct the proof and claim semantics

That is the right perspective for deciding whether annex can become a serious
verification path later.

## Main Result

The annex-aware parser works.

The spike can:

- recover the canonical `BATCH_REVEAL` payload bytes from the explicit header
- recover `carrier_input_index`, `annex_sha256`, and `annex_bytes_length` from
  the annex extension
- recover the annex bytes from witness
- strip the `0x50 0x00` annex prefix
- decode the Merkle proof bytes
- recompute the leaf hash from name / nonce / owner / `bond_vout`
- verify the Merkle proof against the expected root

So the core/indexer side is no longer hypothetical.

## The Most Important Finding

The spike also makes the semantic boundary much clearer:

> the current explicit proof-chunk engine would still reject an annex-bearing
> reveal, even when the annex-aware verifier says the reveal is valid.

That is not a bug in the spike. It is the expected result.

The current engine in [engine.ts](../../packages/core/src/engine.ts):

- looks for explicit `REVEAL_PROOF_CHUNK` outputs
- reconstructs proof bytes from those outputs
- compares them to `proofChunkCount` and `proofBytesLength`

An annex-bearing reveal has no explicit proof chunk outputs.

So if we want the explicit header to remain semantically honest, the annex-mode
header should not claim that those outputs exist.

That led to a useful cleanup in the experimental CLI path:

- annex-mode `BATCH_REVEAL` payloads now derive from the real reveal-ready batch
  claim package fields
- but `proofChunkCount` is set to `0`
- and `proofBytesLength` still reflects the real Merkle proof byte length

That is a better fit for the current experiment:

- explicit outputs: zero proof chunks
- annex witness: carries the proof bytes

## What The Core Helper Reports

The verification helper currently distinguishes between:

- `explicitChunkModelWouldAccept`
- `annexAwareMerkleProofValid`
- `annexAwareModelWouldAccept`

That split is useful.

It lets us say:

- the old chunk-output model would reject this transaction
- the annex-aware model can still verify the proof correctly

In the current test fixture, the result is intentionally:

- `explicitChunkModelWouldAccept = false`
- `annexAwareMerkleProofValid = true`
- `annexAwareModelWouldAccept = true`

That is the clearest statement of where the protocol would need to evolve if we
ever promote annex beyond experimentation.

## Why This Matters

This spike reduces a real uncertainty.

Before it, we knew:

- CLI tooling could build and sign annex-bearing transactions

After it, we also know:

- a core/indexer-oriented verifier can recover and validate the same proof from
  signed transaction hex alone
- and we understand exactly what the current engine is missing

That is a much stronger place to be.

## Current Read

My current read is:

- annex is a credible verification path, not just a signing trick
- the largest remaining gap is now **protocol semantics**, not low-level
  tooling

More concretely:

- builder flow exists
- signer flow exists
- verifier flow exists
- but the main engine still assumes proof chunks live in explicit outputs

So the next decision is no longer "can we parse annex?"

It is closer to:

> do we want annex to remain an upgrade path beside the explicit launch path, or
> do we want to start defining a first-class annex-aware reveal format in the
> protocol itself?
