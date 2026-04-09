# Merkle Batching Annex Artifact Round-Trip

This note records the next step after the low-level annex tooling spike.

The question here was:

> can we make the annex envelope shape concrete enough that a builder, signer,
> and verifier can round-trip the same artifact without hand-waving?

This is still a prototype, not protocol integration.

Update: the round-trip shape has now been promoted into an **experimental CLI
module** in [apps/cli/src/annex-envelope.ts](../../apps/cli/src/annex-envelope.ts)
with three commands:

- `build-experimental-annex-reveal-envelope`
- `build-experimental-annex-reveal-envelope-from-batch-claim-package`
- `sign-experimental-annex-reveal-envelope`
- `verify-experimental-annex-reveal-envelope`

Artifacts:

- [spike-annex-artifact-roundtrip.mjs](../../scripts/spike-annex-artifact-roundtrip.mjs)
- [MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md](./MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md)
- [MERKLE_BATCHING_ANNEX_TOOLING_SPIKE.md](./MERKLE_BATCHING_ANNEX_TOOLING_SPIKE.md)
- [MERKLE_BATCHING_ANNEX_CORE_INDEXER_SPIKE.md](./MERKLE_BATCHING_ANNEX_CORE_INDEXER_SPIKE.md)

Run it with:

```bash
npm run spike:annex-artifact-roundtrip
```

## What The Prototype Does

The script models three roles:

1. `builder`
   - creates a base PSBT
   - creates the explicit reveal header bytes
   - creates the annex bytes
   - emits a concrete unsigned envelope

2. `signer`
   - consumes the unsigned envelope
   - validates header and annex commitments
   - computes the annex-aware Taproot key-path sighash
   - signs
   - attaches witness
   - emits a concrete signed envelope

3. `verifier`
   - re-parses the signed transaction
   - extracts the explicit header
   - extracts the annex from raw witness
   - checks hashes and ids
   - verifies the Schnorr signature against the recovered annex

So this is the first pass that actually exercises the envelope design, not just
the transaction mechanics.

## Main Result

The artifact round-trip works.

That matters because it means the annex path can now be described more
concretely as:

```text
base PSBT + explicit header + annex sidecar + custom finalizer + witness-aware verifier
```

That is more specific and more credible than simply saying "annex is probably
possible."

## Important Findings

### 1. The unsigned envelope shape is viable

The prototype unsigned envelope includes:

- `psbtBase64`
- `unsignedBaseTransactionHex`
- `unsignedBaseTransactionId`
- `carrierInputIndex`
- `carrierPrevout`
- `explicitHeaderHex`
- `explicitHeaderSha256`
- `annexHex`
- `annexSha256`
- `annexBytesLength`
- `annexFormat`
- `anchorTxid`
- `name`
- `bondVout`

That was enough to:

- reconstruct the intended base transaction
- pin the exact annex bytes
- and prevent the signer from inventing protocol-semantic proof bytes late

### 2. The signed envelope needs `wtxid`

This stays true in the round-trip prototype just like it did in the lower-level
spike.

If annex changes:

- `txid` stays stable
- `wtxid` changes

So the signed envelope needs to carry:

- `signedTransactionHex`
- `signedTransactionId`
- `signedTransactionWitnessId`

not just `txid`.

### 3. `signedPsbtBase64` is not naturally authoritative here

This is one of the most useful findings.

In the prototype, the signer consumes the base PSBT, but the real finalization
step is custom:

- compute annex-aware sighash
- create Schnorr signature
- attach `[signature, annex]` witness manually

So the artifact that really matters at the end is:

- finalized transaction hex
- plus `txid` and `wtxid`

not a standard "signed PSBT" in the same sense as the current ordinary flow.

The prototype therefore emits:

- `signedPsbtBase64: null`
- plus an explicit reason string explaining that custom annex finalization
  happened outside standard PSBT fields

That is a useful design signal. It suggests the future envelope sketch should
probably treat `signedPsbtBase64` as optional or secondary for this path, not
foundational.

### 4. The verifier can round-trip the envelope commitments

The verifier in the prototype successfully checks:

- witness annex is present
- witness annex matches the unsigned envelope
- witness annex hash matches the explicit header
- header hash matches both the unsigned and signed envelopes
- signed `txid` and `wtxid` match the actual finalized transaction
- the Schnorr signature verifies against the recovered annex

That is important because it means the envelope model is not just "data we hope
stays consistent." The fields are actually strong enough to verify.

## What This Tells Us About The Future CLI Shape

If GNS ever takes the annex path seriously, the CLI probably should not pretend
it is a normal PSBT-only command family.

A more honest future shape would be something like:

- `build-annex-reveal-envelope`
- `sign-annex-reveal-envelope`
- `verify-annex-reveal-envelope`

where the envelope is the primary artifact and PSBT is one component inside it.

That is different from the current ordinary lane, where PSBT is much closer to
the whole story.

## Current Read

The round-trip prototype improves my confidence in the annex path, but in a
very specific way.

It does **not** make the path feel standard-wallet-friendly.

It **does** make it feel like a manageable custom-tooling path if we ever decide
the weight savings are important enough.

So the decision now looks more like:

- not "is annex real?"
- but "is the custom-envelope model worth the added product and engineering
  complexity?"

That is a healthy place to be.

## Current Status

The next thin slice described above has now been done:

- typed unsigned/signed experimental annex envelope interfaces
- one experimental builder command
- one experimental builder command that reuses a **real reveal-ready batch claim
  package**
- one custom annex finalizer command
- one verifier command

The important follow-up result is that the experimental CLI now supports a
bridge from:

```text
real GNS batch claim package -> annex envelope -> signed annex tx -> verifier
```

So the annex experiment is no longer limited to synthetic names and mock proof
bytes. It can now reuse:

- the real `BATCH_REVEAL` payload bytes from a reveal-ready batch claim package
- the real Merkle proof bytes from `batchProofHex`
- and the real batch anchor txid / name / owner / nonce / bond_vout semantics

The current bridge shape is:

- explicit `OP_RETURN` header = canonical `BATCH_REVEAL` payload + annex
  commitment extension
- witness annex = `0x50 0x00 || raw_merkle_proof_bytes`

That is still experimental, but it is a much more credible signal than the
earlier purely illustrative header.

So the open question has shifted again. It is no longer "can we make the
workflow concrete?" It is now:

> does this experimental CLI flow feel maintainable enough to justify deeper
> integration work, or should annex stay as a research lane beside the explicit
> v0 carrier?
