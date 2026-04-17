# Merkle Batching Annex Hybrid Weight Model

This note tightens the earlier annex estimate by using the more concrete hybrid
envelope from
[MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md](./MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md).

The narrow question here is:

> if ONT keeps a small explicit `BATCH_REVEAL` header, but moves proof bytes
> into a Taproot annex carrier, does the economics still look clearly better
> after adding realistic header and Taproot overheads?

This is still a model, not a fully signed annex transaction benchmark. But it is
much more realistic than the earlier upper-bound style estimate.

Related notes:

- [MERKLE_BATCHING_FOOTPRINT.md](./MERKLE_BATCHING_FOOTPRINT.md)
- [MERKLE_BATCHING_ANNEX_WEIGHT_MODEL.md](./MERKLE_BATCHING_ANNEX_WEIGHT_MODEL.md)
- [MERKLE_BATCHING_TAPROOT_ANNEX_SKETCH.md](./MERKLE_BATCHING_TAPROOT_ANNEX_SKETCH.md)
- [MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md](./MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md)
- [MERKLE_BATCHING_WALLET_COMPATIBILITY.md](./MERKLE_BATCHING_WALLET_COMPATIBILITY.md)

The measuring script lives at:

- [measure-annex-hybrid-model.mjs](../../scripts/measure-annex-hybrid-model.mjs)

Run it with:

```bash
npm run measure:annex-hybrid-model
```

## What Changed Versus The Earlier Rough Model

The earlier annex model asked a deliberately simple question:

- what if the current proof bytes just moved from base serialization into
  witness?

That was useful as a first signal, but it ignored several things a reviewer
would care about.

This model adds them back:

- the explicit reveal header stays on chain
- the explicit header grows to commit to the annex
- the reveal funding input moves from `p2wpkh` to Taproot key-path
- the annex itself has non-proof bytes
- a fully Taproot-native flow may also return change to `p2tr`

So this model is much closer to:

> "what would the real hybrid path feel like if we actually tried to ship it?"

## Hybrid Assumptions

### Explicit header

For the benchmark names used in the existing footprint script:

- current `BATCH_REVEAL` payload bytes: `94`
- modeled hybrid header growth: `+33` bytes

That `+33` comes from:

- `annex_sha256`: `32`
- `annex_format`: `1`

The current `proofChunkCount` byte is assumed to be replaced by
`carrier_input_index`, so that part is treated as size-neutral.

### Annex payload

The annex payload is modeled as:

- `proofBytes`
- plus `2` non-proof bytes:
  - required annex prefix marker
  - one ONT proof-format byte

So the annex witness element is modeled as:

```text
proofBytes + 2
```

plus its compact-size length prefix in witness.

### Input transition

The current explicit measured flow uses signed `p2wpkh` reveal funding inputs.

The hybrid model assumes a signed Taproot key-path funding input instead.

Working witness assumptions:

- signed `p2wpkh` witness: `109` bytes
- signed `p2tr` key-path witness without annex: `66` bytes

So the carrier input change is modeled as:

```text
-43 weight units
```

before the annex is added back.

That is not meant to overclaim precision. A DER signature can vary by a byte,
but that only changes the result by about `0.25 vB`.

### Change output variants

Two reveal-side variants are shown:

1. `same-change`
   - keep the reveal change output script type unchanged
   - useful as a lower-overhead optimistic benchmark

2. `taproot-change`
   - also migrate reveal change to `p2tr`
   - useful as a more wallet-consistent benchmark

That difference is:

- `p2wpkh` change output script: `22` bytes
- `p2tr` change output script: `34` bytes

So the `taproot-change` variant adds:

```text
+48 weight units
```

relative to `same-change`.

## Results

| Batch Size | Legacy Total vB | Current Explicit Batch Total vB | Hybrid Batch Total vB (same-change) | Hybrid Batch Total vB (taproot-change) | Saved vs Legacy (same-change) | Saved vs Legacy (taproot-change) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 802 | 754 | 716 | 740 | 86 | 62 |
| 4 | 1604 | 1480 | 1304 | 1352 | 300 | 252 |
| 8 | 3208 | 3200 | 2517 | 2613 | 691 | 595 |
| 16 | 6416 | 6768 | 5008 | 5200 | 1408 | 1216 |
| 32 | 12832 | 14976 | 10112 | 10496 | 2720 | 2336 |
| 64 | 25664 | 31903 | 20576 | 21344 | 5088 | 4320 |

## Reveal-Level Intuition

The reveal-level result is the clearest signal.

Current explicit batched reveal cost per claim:

| Batch Size | Current Explicit Reveal vB | Hybrid Reveal vB (same-change) | Hybrid Reveal vB (taproot-change) |
| --- | ---: | ---: | ---: |
| 2 | 266 | 247 | 259 |
| 4 | 299 | 255 | 267 |
| 8 | 349 | 263.6 | 275.6 |
| 16 | 382 | 272 | 284 |
| 32 | 432 | 280 | 292 |
| 64 | 465 | 288 | 300 |

That pattern matters.

Under the current explicit proof-chunk path, reveal cost keeps growing because
new proof chunks keep adding full base-transaction outputs.

Under the hybrid annex model, reveal cost still rises with proof length, but it
rises much more slowly because the large proof bytes move into witness.

## What This Suggests

The more realistic model still supports the same strategic conclusion:

> the reveal proof carrier is the real bottleneck, and a hybrid
> `explicit-header + annex-proof` design could plausibly turn medium and large
> batches back into strong full-flow winners.

That is stronger than the earlier rough estimate because we are no longer
pretending the explicit header disappears or that Taproot has no transition
cost.

## What This Model Still Does Not Prove

This is not yet a transaction-construction benchmark.

It still does **not** prove:

- that the annex flow is pleasant to build or sign
- that `bitcoinjs-lib` or adjacent PSBT tooling can support it without awkward
  custom finalization
- that wallet or hardware flows can tolerate it
- that the final signed witness sizes will match these assumptions exactly

So the bottleneck has shifted.

The open question is no longer:

- "would annex likely help on-chain footprint?"

It is now more like:

- "is the tooling complexity worth the likely footprint win?"

## Current Read

I think the honest current read is:

- `v0 explicit small-batch batching` still makes sense as the conservative path
- the hybrid annex model now looks credible enough to deserve a real tooling
  feasibility spike
- if the tooling spike goes reasonably well, the protocol-review story gets much
  stronger because the scalability direction is no longer just hand-wavy

## Best Next Step

The best next step after this model is:

1. build one minimal local prototype that:
   - creates a Taproot key-path reveal-like transaction
   - attaches deterministic annex bytes
   - signs and finalizes it
   - extracts both `txid` and `wtxid`
   - verifies the annex bytes on the decoded transaction

2. document exactly where the tooling gets awkward:
   - unsigned artifact construction
   - finalization
   - witness parsing
   - signer UX

That will tell us whether the annex path is merely economically attractive or
actually practical.
