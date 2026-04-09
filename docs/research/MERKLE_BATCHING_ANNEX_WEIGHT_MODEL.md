# Merkle Batching Annex Weight Model

This note asks a narrow quantitative question:

> if the current GNS batched reveal kept a small explicit reveal header, but
> moved the Merkle proof bytes from explicit proof outputs into a Taproot
> annex-like witness carrier, would the footprint economics meaningfully
> improve?

This is a rough model, not a full implementation benchmark.

Related notes:

- [MERKLE_BATCHING_FOOTPRINT.md](./MERKLE_BATCHING_FOOTPRINT.md)
- [MERKLE_BATCHING_TAPROOT_ANNEX_SKETCH.md](./MERKLE_BATCHING_TAPROOT_ANNEX_SKETCH.md)
- [MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md](./MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md)

## The Simplifying Assumption

We are not trying to fully model every Taproot detail here.

Instead, we ask a simpler first-pass question:

- keep the current explicit batch reveal header
- assume the current proof bytes move from base transaction outputs into witness
- ignore some second-order overhead changes
- estimate the savings from the SegWit weight discount alone

Under [BIP141](https://bips.xyz/141):

- base byte is roughly `4` weight units
- witness byte is roughly `1` weight unit

So moving `N` proof bytes from base to witness saves about:

```text
saved_vbytes ≈ 0.75 * N
```

That is only a rough upper-bound style estimate, but it is already enough to
see whether annex-style carriage is directionally compelling.

## Starting Data

From [MERKLE_BATCHING_FOOTPRINT.md](./MERKLE_BATCHING_FOOTPRINT.md), the current
average proof sizes are:

| Batch Size | Avg Proof Bytes | Current Batch Total vB | Current Legacy Total vB |
| --- | ---: | ---: | ---: |
| 2 | 33 | 754 | 802 |
| 4 | 66 | 1480 | 1604 |
| 8 | 99 | 3200 | 3208 |
| 16 | 132 | 6768 | 6416 |
| 32 | 165 | 14976 | 12832 |
| 64 | 198 | 31903 | 25664 |

## Rough Annex-Adjusted Estimate

If we apply the rough witness-discount estimate:

```text
annex_adjusted_batch_total_vB
  ≈ current_batch_total_vB - (0.75 * avg_proof_bytes * batch_size)
```

we get:

| Batch Size | Current Batch Total vB | Rough Proof-Move Savings vB | Rough Annex-Adjusted Batch Total vB | Legacy Total vB | Rough Net Savings vs Legacy |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2 | 754 | 49.5 | 704.5 | 802 | 97.5 |
| 4 | 1480 | 198.0 | 1282.0 | 1604 | 322.0 |
| 8 | 3200 | 594.0 | 2606.0 | 3208 | 602.0 |
| 16 | 6768 | 1584.0 | 5184.0 | 6416 | 1232.0 |
| 32 | 14976 | 3960.0 | 11016.0 | 12832 | 1816.0 |
| 64 | 31903 | 9504.0 | 22399.0 | 25664 | 3265.0 |

## What This Suggests

This is only a rough model, but it is very informative.

It suggests that:

- the current explicit-carrier design loses at larger batch sizes because proof
  bytes are expensive where they currently live
- if those same proof bytes moved into witness, the economics could flip back
  strongly in favor of batching

In other words:

> the reveal proof carrier really does appear to be the dominant bottleneck

That is exactly the strategic signal we wanted from a rough weight model.

## Why This Is Still Only A Rough Estimate

There are several things this model does **not** capture precisely:

- Taproot input overhead
- exact annex serialization overhead
- whether the explicit reveal header would also change shape
- whether chunk framing overhead disappears completely or only partially
- any extra bytes needed to make the indexer association deterministic
- any PSBT / signer-specific metadata needs

So these numbers should be read as:

- useful directional evidence
- not final implementation-size claims

## The Important Takeaway

Even with those caveats, the result is strong enough to matter:

- if the current explicit path is our conservative v0
- then annex-style proof carriage looks like a credible next-step research path
- because the rough weight model says it could materially improve the exact
  place where the current design starts losing

## Current Recommendation

The right next sequence now looks like:

1. keep the current explicit path for real small-batch v0 work
2. treat annex-based carriage as the leading scaling research candidate
3. if we continue, the next deeper artifact should estimate:
   - Taproot input overhead
   - annex serialization overhead
   - likely reveal-header carryover
   - final adjusted reveal vbytes per batch size

That would move us from:

- "annex seems promising"

to:

- "annex likely saves roughly this much after realistic overheads"
