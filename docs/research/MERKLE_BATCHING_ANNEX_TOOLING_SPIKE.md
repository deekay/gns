# Merkle Batching Annex Tooling Spike

This note records the first local tooling spike for the annex path.

The goal was narrow:

> can we build one Taproot key-path reveal-like transaction with deterministic
> annex bytes, sign it correctly, recover the annex afterward, and learn where
> the tooling starts to get awkward?

This is not an ONT integration. It is a feasibility probe.

Artifacts:

- [spike-annex-keypath-reveal.mjs](../../scripts/spike-annex-keypath-reveal.mjs)
- [MERKLE_BATCHING_ANNEX_ARTIFACT_ROUNDTRIP.md](./MERKLE_BATCHING_ANNEX_ARTIFACT_ROUNDTRIP.md)
- [MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md](./MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md)
- [MERKLE_BATCHING_ANNEX_HYBRID_WEIGHT_MODEL.md](./MERKLE_BATCHING_ANNEX_HYBRID_WEIGHT_MODEL.md)

Run it with:

```bash
npm run spike:annex-keypath-reveal
```

## What The Spike Does

The script builds a small reveal-like transaction with:

- one Taproot key-path input
- one explicit `OP_RETURN` header output
- one Taproot change output
- one deterministic annex payload containing mock proof bytes

It then:

1. computes the Taproot key-path sighash **with** annex
2. signs with a tweaked Taproot private key
3. attaches the witness stack manually as:
   - Schnorr signature
   - annex
4. verifies the signature against the tweaked output key
5. compares `txid` and `wtxid`
6. mutates the annex and repeats the signing step to see what changes

## Main Findings

### 1. The path is technically viable

At a low level, the building blocks are there:

- `Transaction.hashForWitnessV1(..., annex)` exists in `bitcoinjs-lib`
- `tiny-secp256k1` exposes the tweak and Schnorr primitives we need
- `Transaction.setWitness()` lets us attach the final `[signature, annex]`
  stack manually

So the annex path is not blocked by missing cryptographic primitives.

### 2. Annex really is part of the Taproot signing message

The spike confirms the expected behavior:

- the sighash with annex differs from the sighash without annex
- the Schnorr signature verifies against the annex-aware hash
- the same signature fails against the no-annex hash

That means annex support is not cosmetic. The signer really does need to be
annex-aware.

### 3. `txid` still does not pin the witnessed transaction

The spike signs the same base transaction twice with two different annex
payloads.

Result:

- `txid` stays the same
- `wtxid` changes

That is exactly why the envelope sketch treats:

- explicit header hash commitment
- annex hash
- and final `wtxid`

as separate important fields.

### 4. Custom finalization is the awkward part

This is the big practical result.

The clean local path in the spike is:

- build the base transaction
- compute the annex-aware sighash manually
- sign manually
- attach witness manually

That is **not** a normal PSBT-only flow.

The script does construct a base PSBT successfully, but the annex still lives
outside that container. So the real shape remains:

```text
PSBT + annex sidecar + custom finalization
```

That matches the earlier envelope note.

### 5. High-level payment parsing strips annex

`bitcoinjs-lib`'s `p2tr` payment parser understands the key-spend signature, but
it does not surface annex as a first-class semantic field.

That is reasonable for Bitcoin validation, but it matters for ONT:

- the protocol cannot rely on a high-level Taproot payment abstraction alone to
  recover the proof bytes
- the indexer must inspect raw witness data directly

This is a subtle but important implementation consequence.

## What This Means

The tooling spike makes the tradeoff clearer.

The annex path now looks like:

- technically viable
- economically attractive
- but dependent on custom builder / signer / finalizer logic

So the question is no longer:

- "can we do this at all?"

It is more like:

- "is the custom-tooling burden worth the footprint win?"

That is a much better place to be.

## Current Read

My current read after the spike is:

- the annex path is real enough to keep exploring
- it is not a standard wallet path
- and the next useful proof is not more abstract modeling

It is a slightly more product-shaped prototype.

## Best Next Step

The best next step now is:

1. use the artifact round-trip prototype to decide whether annex should remain
   research-only or graduate into an experimental CLI module
2. if it graduates, turn the round-trip shape into typed envelope interfaces and
   one custom finalizer command
