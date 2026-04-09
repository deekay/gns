# Merkle Batching Annex Artifact Round-Trip

This note records the next step after the low-level annex tooling spike.

The question here was:

> can we make the annex envelope shape concrete enough that a builder, signer,
> and verifier can round-trip the same artifact without hand-waving?

This is still a prototype, not protocol integration.

Artifacts:

- [spike-annex-artifact-roundtrip.mjs](../../scripts/spike-annex-artifact-roundtrip.mjs)
- [MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md](./MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md)
- [MERKLE_BATCHING_ANNEX_TOOLING_SPIKE.md](./MERKLE_BATCHING_ANNEX_TOOLING_SPIKE.md)

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

## Best Next Step

The next good step is no longer more envelope sketching.

The next good step is to decide whether we want to:

1. stop at research and keep the explicit carrier for the foreseeable future, or
2. build one experimental CLI module around this prototype shape

If we choose `2`, the next thin slice should be:

- a minimal TypeScript prototype in a sandbox package or script
- typed unsigned/signed envelope interfaces
- one custom annex finalizer
- one verifier command

That would tell us whether the annex path still feels reasonable once it stops
living only in research scripts.
