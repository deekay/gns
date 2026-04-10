# Merkle Batching Reveal Carrier Options

This note focuses on one narrow but important question:

> if Merkle batching is already a strong commit-footprint improvement, what
> reveal-proof carrier would make the **full ordinary claim lifecycle** more
> space-efficient too?

This matters because the current measurements in
[MERKLE_BATCHING_FOOTPRINT.md](./MERKLE_BATCHING_FOOTPRINT.md) show a real
pattern:

- batch anchors are compact
- small batches can improve the full flow
- larger batches become expensive because the **reveal proofs themselves** are
  heavy

For a broader reviewer-facing explanation of the Merkle path, annex path, and
the protocol questions we want outside experts to pressure-test, see
[MERKLE_BATCHING_PROTOCOL_REVIEW_MEMO.md](./MERKLE_BATCHING_PROTOCOL_REVIEW_MEMO.md).

So if we want a reviewer to come away saying "this is designed to scale", the
next serious protocol question is not the batch anchor. It is the **reveal proof
carrier**.

## The Core Weight Model

Bitcoin's SegWit weight model from [BIP141](https://bips.xyz/141) defines:

- transaction weight = `base_size * 3 + total_size`
- virtual size = `weight / 4`, rounded up

That means, in practice:

- one byte in the base serialization costs about `4` weight units
- one byte in witness costs about `1` weight unit

So if proof bytes can move from explicit base transaction outputs into witness,
the savings can be substantial. A rough upper bound is:

- moving `132` proof bytes from base to witness can save about `99` vbytes
- moving `198` proof bytes from base to witness can save about `148.5` vbytes

Those numbers matter because the current batch measurements already show proof
sizes in that range for larger batches.

## Current Carrier: Explicit Reveal Outputs

Current v0 design:

- one explicit `BATCH_REVEAL` data-carrier output
- one or more explicit `REVEAL_PROOF_CHUNK` data-carrier outputs

### Why It Is Good

- very easy to explain
- very easy to inspect in provenance
- fits the current indexer model cleanly
- no Taproot-specific signing or parsing requirements
- no hidden witness tricks

### Why It Gets Expensive

- proof bytes sit in the base transaction serialization
- each chunk adds its own framing overhead
- larger proofs mean larger reveal transactions

That is exactly why the current measurements look like:

- `2-4` claims per batch: good
- `8` claims per batch: roughly break-even
- `16+` claims per batch: net vbyte loss across the full ordinary claim flow

So this carrier is a strong simplicity play, but not the best long-run scaling
answer if large batches are the goal.

## Option 1: Better Explicit Packing

This is the conservative path.

Instead of changing script or signer assumptions, we keep the explicit reveal
model and just pack the proof bytes more efficiently.

Possible directions:

- fewer per-chunk headers
- fewer outputs for the same proof
- tighter proof serialization
- stricter v0 batch cap so proofs stay short

### Why It Helps

- smallest implementation jump
- preserves the current reviewability and product story
- low protocol risk

### Why It Probably Has Limited Headroom

- the base-carrier weight disadvantage remains
- many of the current savings opportunity are structural, not just encoding
  waste
- it improves the current design, but probably does not transform it

### Best Use

- very plausible for v0
- likely enough if we decide small batches like `2-8` are the intended range

## Option 2: Taproot Annex Carrier

This is the most interesting "deeper protocol" option to study first.

[BIP341](https://bips.xyz/341) defines the Taproot annex:

- if the last witness element begins with `0x50`, it is treated as an annex
- the annex contributes to transaction weight
- but is otherwise ignored by Taproot validation

That makes the annex an appealing place to carry Merkle proof bytes.

For a rough quantitative estimate of how much this might help, see
[MERKLE_BATCHING_ANNEX_WEIGHT_MODEL.md](./MERKLE_BATCHING_ANNEX_WEIGHT_MODEL.md).

### What It Would Look Like

- reveal transactions would need to spend a Taproot input
- the Merkle proof would be carried in the annex
- the indexer would extract and verify the proof from witness data rather than
  from explicit outputs

### Why It Could Be Much Better

- proof bytes become witness bytes instead of base bytes
- the full reveal stays self-contained on chain
- the indexer can still verify everything from transaction data
- this directly attacks the current bottleneck: heavy reveal proof carriage

### Why It Is Harder

- current signer flow does not support Taproot inputs
- many wallet flows do not expose annex handling cleanly
- provenance becomes less obviously readable than explicit outputs
- direct transaction parsing becomes more witness-aware
- this needs careful review of relay behavior and wallet interoperability

### My Current Read

This is the strongest candidate if we want a serious next-step research lane
without fully redesigning the protocol around script trees. It is much deeper
than v0 explicit packing, but much more targeted than a full tapscript redesign.

For a more concrete GNS-specific flow sketch, see
[MERKLE_BATCHING_TAPROOT_ANNEX_SKETCH.md](./MERKLE_BATCHING_TAPROOT_ANNEX_SKETCH.md).

For a more concrete unsigned/signed artifact model, see
[MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md](./MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md).

For a more realistic hybrid weight estimate, see
[MERKLE_BATCHING_ANNEX_HYBRID_WEIGHT_MODEL.md](./MERKLE_BATCHING_ANNEX_HYBRID_WEIGHT_MODEL.md).

For wallet and signer compatibility tradeoffs, see
[MERKLE_BATCHING_WALLET_COMPATIBILITY.md](./MERKLE_BATCHING_WALLET_COMPATIBILITY.md).

## Option 3: Taproot Script-Path Carrier

This is a more ambitious version of the Taproot path.

Under [BIP341](https://bips.xyz/341), script-path spending reveals:

- a script
- a control block
- witness stack elements

So, in principle, the reveal proof could be encoded into a script-path spend
structure instead of into explicit outputs.

### Why People Reach For This

- it keeps proof data in witness
- it offers more expressive structure than the annex alone
- it can combine proof carriage with a more protocol-native commitment path

### Why It Is Probably Not The First Move

- much higher design complexity
- script and control-block overhead can claw back some of the weight savings
- custom tapscript design is harder to explain and audit
- much larger signer and wallet-model change

### My Current Read

This is real research territory, but it is probably a second-step investigation
after annex-style witness carriage, not before it.

## Option 4: P2WSH / SegWit v0 Witness Carrier

This is the "use witness, but not Taproot" version.

In principle, a reveal transaction could carry proof bytes through a custom
P2WSH witness stack and script path.

### Why It Might Be Considered

- witness discount still applies
- it may be conceptually simpler than a full Taproot redesign in some narrow
  setups

### Why It Is Unattractive

- still requires custom witness/script machinery
- less future-facing than Taproot
- poorer long-run ergonomics than an annex- or Taproot-based path

### My Current Read

Not impossible, but hard to justify as the preferred research lane when Taproot
already exists.

## Option 5: Off-Chain Proof Artifact With Minimal On-Chain Reference

This is the smallest on-chain path, but it is the weakest fit for GNS.

### Why It Looks Tempting

- tiny chain footprint
- simplest on-chain reveal carrier

### Why It Is A Bad Fit

- weakens the self-contained chain-verifiability story
- pushes more trust or data-availability burden off chain
- makes third-party audit and replay harder

### My Current Read

This should stay out of scope for the main design path.

## What The Measurements Suggest

The current measured data gives us a very practical lens:

- if we only want small batches, the current explicit carrier may already be
  acceptable
- if we want medium or large batches to be truly space-efficient, the reveal
  proof bytes need to move into a cheaper carrier

That means the real fork is:

1. `v0 small-batch path`
   - keep explicit reveal proof carriage
   - cap batches conservatively, probably around `2-8`

2. `deeper protocol path`
   - investigate witness-native proof carriage
   - most likely beginning with Taproot annex research

## Current Recommendation

If the goal is to show thoughtful Bitcoin-footprint sensitivity to protocol
reviewers, the next research sequence should be:

1. **document and keep the current explicit carrier for v0**
2. **study Taproot annex carriage as the leading next-step candidate**
3. **only after that, study full Taproot script-path carriage**

That sequencing keeps the research honest:

- we already have something functional and reviewable
- we know where the measured bottleneck is
- and we have a concrete next protocol question that could materially improve
  scaling rather than just polishing v0

## Open Questions For Deeper Research

1. Can annex-based proof carriage be made wallet- and signer-friendly enough for
   practical use?
2. What exact weight savings would annex carriage deliver versus the current
   explicit chunk model?
3. Are there relay or tooling edge cases that make annex use awkward in
   practice?
4. Would an annex path preserve enough provenance legibility for reviewers and
   operators?
5. If annex is not sufficient, what is the smallest viable step into
   script-path-based carriage?
