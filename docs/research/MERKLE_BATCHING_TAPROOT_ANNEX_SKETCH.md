# Merkle Batching Taproot Annex Sketch

This note makes one specific future path more concrete:

> what would a GNS batched reveal look like if the Merkle proof moved out of
> explicit data-carrier outputs and into a Taproot annex-style witness carrier?

This is **not** a chosen v1 design. It is a protocol research sketch so we can
reason more concretely about whether annex-based proof carriage is worth deeper
investment.

Related notes:

- [MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md](./MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md)
- [MERKLE_BATCHING_FOOTPRINT.md](./MERKLE_BATCHING_FOOTPRINT.md)
- [MERKLE_BATCHING_ANNEX_WEIGHT_MODEL.md](./MERKLE_BATCHING_ANNEX_WEIGHT_MODEL.md)
- [MERKLE_BATCHING_ANNEX_HYBRID_WEIGHT_MODEL.md](./MERKLE_BATCHING_ANNEX_HYBRID_WEIGHT_MODEL.md)
- [MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md](./MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md)
- [MERKLE_BATCHING_V0.md](./MERKLE_BATCHING_V0.md)

## Why This Is Interesting

The current measured bottleneck is not the batch anchor. It is the reveal proof
carrier.

Today:

- batch anchors are compact
- reveal proofs are explicit base-transaction data
- larger batches eventually lose their commit-side savings because the reveal
  transactions get heavy

Taproot annex carriage is attractive because witness bytes are cheaper than base
serialization bytes under the SegWit weight model.

So the potential upside is:

- keep the proof fully on chain
- keep independent indexer verification
- move proof bytes into cheaper witness space

## The High-Level Shape

An annex-based GNS batched reveal would likely have these properties:

1. the reveal transaction spends at least one Taproot input
2. the GNS reveal header stays visible in a normal explicit carrier or other
   parseable anchor
3. the Merkle proof bytes move into the Taproot annex of that reveal input
4. the indexer reads both:
   - the explicit reveal header
   - the annex bytes from the reveal input witness
5. the indexer reconstructs and verifies the claim leaf against the batch root

The important point is that:

- the **proof bytes** move
- the **claim semantics** do not have to

So conceptually the lifecycle can still be:

- commit
- reveal
- verify

But the reveal stops using explicit proof-chunk outputs.

## One Plausible Transaction Shape

### Current explicit batch reveal

Today the reveal is roughly:

- input(s): ordinary funding input(s)
- output 0: `BATCH_REVEAL` data carrier
- output 1..n: `REVEAL_PROOF_CHUNK` data carriers
- final output: optional change

### Annex-based batch reveal

A plausible annex-based reveal would instead be:

- input 0: Taproot funding input
- witness for input 0:
  - signature
  - annex carrying the Merkle proof bytes
- output 0: one explicit `BATCH_REVEAL` carrier
- final output: optional change

That means the proof bytes no longer require separate outputs.

The likely user-visible effect is:

- fewer reveal outputs
- smaller base transaction
- more witness dependence

## What Might Stay Explicit

Even in an annex-based design, it is probably still wise to keep a small
explicit reveal header on chain.

For example, the explicit reveal carrier could still include:

- protocol marker
- name
- nonce
- anchor txid
- `bond_vout`
- owner pubkey, if needed for deterministic reconstruction
- maybe proof length / version metadata

While the annex carries only:

- the proof bytes themselves

That hybrid approach preserves a clean parseable transaction-level event while
moving the large payload to witness.

## Why Not Put Everything In The Annex?

We probably could try to push more into witness, but there are tradeoffs.

Keeping a small explicit header helps with:

- provenance readability
- easier transaction scanning
- simpler "what kind of thing is this?" detection
- less dependence on witness-only parsing for every first-pass classifier

So the likely best research path is:

- move the **large proof bytes** first
- keep the **minimal semantic header** explicit unless there is a strong reason
  not to

## What The Indexer Would Need To Change

This is the most important concrete section.

An annex-based path would force the indexer to become witness-aware for reveal
validation.

Minimum new work:

1. transaction parser must inspect Taproot witness structure
2. parser must detect whether an annex is present
3. parser must extract the annex bytes for the relevant input
4. parser must decide how GNS associates a specific annex-bearing input with the
   reveal event
5. validation must reconstruct the Merkle proof from annex bytes and verify it

That means the indexer moves from:

- "parse outputs and explicit carrier bytes"

to:

- "parse outputs, plus selected witness data"

This is a meaningful trust-boundary and complexity shift, even if the economics
improve.

## What The Signer / Builder Would Need To Change

This is the second major impact area.

Current prototype signer assumptions are still very narrow:

- `witnesspubkeyhash` inputs only
- explicit payload outputs

An annex path would require at least:

1. Taproot input construction in the architect / builder layer
2. signing support for Taproot key-path spends
3. annex assembly and attachment during signing or PSBT finalization
4. validation that the annex bytes match the intended proof bytes

Open design choice:

- does the unsigned artifact already include the annex bytes?
- or does the signer assemble them at finalization time?

My current bias:

- the unsigned artifact should already commit to the exact annex bytes
- the signer should not be trusted to invent GNS proof content late

That keeps artifact review and reproducibility cleaner.

For a more concrete artifact-level version of that idea, see
[MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md](./MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md).

## What The Product Surface Would Need To Change

The website and CLI would need to explain a more advanced flow.

### CLI / offline artifacts

Likely changes:

- new artifact mode for Taproot-backed batch reveals
- explicit display of:
  - Taproot funding input requirements
  - annex byte length
  - exact proof bytes hash or checksum

### Website / review surface

Likely changes:

- provenance page needs to explain that the proof is in witness, not in visible
  output carriers
- claim review UI should show:
  - reveal header data
  - annex proof size
  - batch anchor reference

### Hosted walkthrough complexity

This path is harder to explain to newcomers than the current explicit one.

So even if it is more space-efficient, it raises the bar for:

- UI explanation
- debugging
- user confidence

## The Hardest Open Protocol Questions

### 1. Which input carries the annex?

If the reveal has multiple funding inputs, the indexer needs a deterministic
rule. For example:

- "the first Taproot input is the GNS witness carrier"
- or "the input spending a designated reveal-funding output is the carrier"

This cannot be left ambiguous.

### 2. How much explicit header remains?

We still need to decide:

- explicit reveal header + annex proof
- or almost-all-witness reveal

The hybrid model looks more realistic.

### 3. How do we guarantee wallet / signer support?

Even if the protocol sketch is sound, the practical question is:

- can we reliably create and sign annex-bearing Taproot reveals with the tools
  we expect users or operators to use?

This may become the real gating factor.

### 4. What happens to provenance readability?

The more we move from explicit outputs into witness, the more we risk a reviewer
saying:

- "yes, this is smaller"
- "but it is much harder to inspect"

That may still be the right trade in some paths, but it has to be weighed
explicitly.

## What This Path Could Buy Us

If annex carriage works in practice, the likely gains are:

- much smaller reveal proof weight
- better full-flow scaling for medium and large batches
- preserved on-chain self-containment
- better story for blockspace-sensitive reviewers

The measured data suggests this is exactly where the next real footprint win
would come from if we want batch sizes larger than the current small-batch
range.

## Why This Is Still Research

This path is not ready to be called the preferred implementation because:

- we have not yet measured annex-carried reveal sizes
- we have not built Taproot-capable artifact/signer support
- we have not resolved product and provenance ergonomics
- we have not documented a deterministic input-to-annex association rule

So the right current posture is:

- promising
- worth serious study
- not yet a chosen implementation target

## Current Recommendation

If we continue this line of work, the next research artifact should probably be:

1. a concrete unsigned/signed reveal envelope sketch for an annex-based path
2. a small prototype size model comparing:
   - current explicit reveal carrier
   - explicit header + annex proof
3. a short implementation-risk note for:
   - builder
   - signer
   - indexer
   - web review surfaces

That would let us answer the next real question:

> is annex-based proof carriage just theoretically attractive, or is it
> actually a plausible next protocol step for GNS?
