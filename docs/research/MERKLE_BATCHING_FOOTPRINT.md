# Merkle Batching Footprint Measurements

This note records the first repeatable footprint measurements for the current
ordinary-lane Merkle batching design.

The measuring script lives at:

- [measure-batch-footprint.mjs](../../scripts/measure-batch-footprint.mjs)

Run it with:

```bash
npm run measure:batch-footprint
```

## Method

The current measurement compares two paths for the same set of ordinary-lane
claims:

1. `legacy`
   - one ordinary commit transaction per claim
   - one ordinary reveal transaction per claim

2. `batched`
   - one batch anchor transaction for the whole set
   - one batch reveal transaction per claim

Assumptions:

- signed `p2wpkh` transactions
- one funding input per legacy commit
- one shared funding input for the batch commit
- one reveal transaction per name in both paths
- default proof chunk size of `66` bytes
- equal-length benchmark names so the bond curve is not the variable being tested

This means the comparison is intentionally focused on **chain footprint**, not
on pricing, bonding, or launch dynamics.

## Results

| Batch Size | Legacy Tx Count | Batch Tx Count | Legacy Total vB | Batch Total vB | vB Saved | vB Saved % | Legacy Avg/Claim vB | Batch Avg/Claim vB | Legacy Raw Bytes | Batch Raw Bytes | Avg Proof Bytes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 2 | 2 | 401 | 407 | -6 | -1.5% | 401.0 | 407.0 | 565 | 570 | 0 |
| 2 | 4 | 3 | 802 | 754 | 48 | 6.0% | 401.0 | 377.0 | 1128 | 999 | 33 |
| 4 | 8 | 5 | 1604 | 1480 | 124 | 7.7% | 401.0 | 370.0 | 2255 | 1888 | 66 |
| 8 | 16 | 9 | 3208 | 3200 | 8 | 0.2% | 401.0 | 400.0 | 4511 | 3934 | 99 |
| 16 | 32 | 17 | 6416 | 6768 | -352 | -5.5% | 401.0 | 423.0 | 9018 | 8150 | 132 |
| 32 | 64 | 33 | 12832 | 14976 | -2144 | -16.7% | 401.0 | 468.0 | 18045 | 17669 | 165 |
| 64 | 128 | 65 | 25664 | 31903 | -6239 | -24.3% | 401.0 | 498.5 | 36098 | 37198 | 198 |

## Commit-Only Comparison

| Batch Size | Legacy Commit Tx Count | Batch Commit Tx Count | Legacy Commit vB | Batch Commit vB | Commit vB Saved | Commit vB Saved % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | 1 | 222 | 191 | 31 | 14.0% |
| 2 | 2 | 1 | 444 | 222 | 222 | 50.0% |
| 4 | 4 | 1 | 888 | 284 | 604 | 68.0% |
| 8 | 8 | 1 | 1776 | 408 | 1368 | 77.0% |
| 16 | 16 | 1 | 3552 | 656 | 2896 | 81.5% |
| 32 | 32 | 1 | 7104 | 1152 | 5952 | 83.8% |
| 64 | 64 | 1 | 14208 | 2144 | 12064 | 84.9% |

## What This Means

The result is mixed in a useful way.

What looks strong:

- the **commit side** improves dramatically
- transaction count also drops sharply
- small batches, especially around `2-4`, improve the full ordinary claim path
- raw serialized bytes improve for a while even when vbytes are near break-even

What looks weaker than expected:

- under the current explicit proof-carriage design, **batched reveals get large**
- once the batch gets beyond roughly `8`, the heavier reveal proofs eat the
  commit-side savings in total vbytes
- by `16+`, the current design is a clear **net vbyte loss** across the full
  ordinary claim lifecycle, even though commit batching by itself remains very
  efficient

## Current Read

The honest interpretation is:

> the current Merkle batching design is already a strong **commit-footprint and
> transaction-count** improvement, but it is **not yet a universal full-flow
> vbyte win** at larger batch sizes.

That leads to a few practical conclusions:

1. `64`-claim anchors are probably too optimistic for the current explicit proof
   carrier if the goal is full-flow vbyte reduction.
2. A **small v0 batch cap** such as `2-8` looks much more defensible.
3. If we want larger batches to remain attractive in full-flow vbytes, the next
   optimization target is the **reveal proof carrier**, not the batch anchor.

## Recommended Follow-Up

- keep using the current design for real-world small-batch evaluation
- do not publicly overclaim that batching automatically reduces total blockspace
  for all batch sizes
- revisit the v0 batch-size recommendation in
  [MERKLE_BATCHING_V0.md](./MERKLE_BATCHING_V0.md)
- explore whether a different reveal proof carrier can preserve the strong
  commit savings without making large batched reveals so heavy
