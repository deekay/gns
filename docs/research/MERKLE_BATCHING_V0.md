# Merkle Batching v0

This note turns the earlier batching discussion into a concrete design target and implementation checklist.

It is not a final mainnet freeze, but it is meant to be specific enough to plan and build against.

For the current recommended wire-format defaults, see [MERKLE_BATCHING_V0_DECISIONS.md](./MERKLE_BATCHING_V0_DECISIONS.md).
For the package-by-package engineering task map, see [MERKLE_BATCHING_WORK_BREAKDOWN.md](./MERKLE_BATCHING_WORK_BREAKDOWN.md).
For the first repeatable footprint measurements, see [MERKLE_BATCHING_FOOTPRINT.md](./MERKLE_BATCHING_FOOTPRINT.md).
For deeper reveal-proof carrier research, see [MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md](./MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md).
For a reviewer-facing summary of the Merkle and annex design space, see [MERKLE_BATCHING_PROTOCOL_REVIEW_MEMO.md](./MERKLE_BATCHING_PROTOCOL_REVIEW_MEMO.md).
For a concise implementation and validation snapshot, see [MERKLE_BATCHING_STATUS.md](./MERKLE_BATCHING_STATUS.md).

## Purpose

The goal of Merkle batching is to reduce ordinary-lane chain footprint without changing the core scarcity mechanism.

The intended division of labor is:

- **bond amount + lock duration** create scarcity and make warehousing expensive
- **batching** reduces transaction count, on-chain bytes, and operational overhead

So batching should be treated as an efficiency improvement, not as a pricing or anti-squatting mechanism.

## Current Working Decisions

These are the working assumptions for a v0 implementation plan:

- apply Merkle batching to the **ordinary lane** first
- apply it to **commit batching only**
- preserve the high-level `commit -> reveal` lifecycle
- keep one dedicated bond output per claim
- bind each claim leaf to its exact bond output using `bond_vout`
- keep the bond curve and lock economics unchanged
- allow both self-batching and optional coordinator-assisted batching
- avoid Taproot-hidden or scriptless commitment designs in v0
- require explicit proof verification during reveal / indexing

## Current Implementation Status

The current repo now covers these implemented slices:

- protocol encoders / decoders and Merkle proof helpers
- architect and CLI batch artifact generation for ordinary-lane claims
- CLI reveal queue acceptance for signed batch reveal artifacts
- core and indexer validation of batched anchors and batched reveals
- database snapshot compatibility for batched pending anchors and provenance events
- resolver / website compatibility for batched provenance inspection
- offline web architect support for batch commit PSBT generation, per-name reveal-ready batch claim packages, and later one-by-one batch reveal PSBT generation from those saved packages

The current browser-side scope is now:

- build one ordinary-lane batch commit PSBT
- export one reveal-ready batch claim package per name
- later load any one saved batch claim package back into the browser architect
- generate the corresponding one-by-one batch reveal PSBT locally

What the browser still does **not** try to do is automate all later reveals in
one step. Batched ordinary claims still reveal name by name.

We now also have a repeatable fixture-backed end-to-end review path:

- fixture: [demo-chain-batch.json](../../fixtures/demo-chain-batch.json)
- smoke runner: [smoke-fixture-batch.mjs](../../scripts/smoke-fixture-batch.mjs)

That path proves the batched ordinary-lane flow across resolver indexing, web
name lookup, transaction provenance inspection, and offline architect review.

We also now have the first batch-aware regtest CLI suite coverage in
[`regtest-cli-suite.mjs`](../../scripts/regtest-cli-suite.mjs). That path
builds a batch anchor, queues two signed batch reveals, confirms the anchor,
broadcasts both reveals through the watcher, verifies the names through the
resolver once they land on-chain, and then applies an immature transfer to one
of the names originally claimed through the batch anchor.

We also now have a repeatable footprint measurement script and report:

- script: [measure-batch-footprint.mjs](../../scripts/measure-batch-footprint.mjs)
- report: [MERKLE_BATCHING_FOOTPRINT.md](./MERKLE_BATCHING_FOOTPRINT.md)

The current measured result is important:

- commit batching is a strong footprint win
- small batches can reduce total full-flow footprint
- larger batches under the current explicit proof-carriage design do **not**
  automatically reduce total vbytes across the full ordinary claim lifecycle

## Non-Goals

Merkle batching v0 is **not** trying to do all of the following:

- redesign reserved-name auctions
- change ordinary-lane bond pricing
- replace the owner-key model
- move proof data into Taproot tweaks, signature tricks, or hidden witness semantics
- batch transfers
- solve every chain-footprint issue in one move

## What It Preserves

Merkle batching does **not** need to change the high-level claim story:

1. user commits first
2. user reveals later
3. reveal proves prior commitment
4. indexer derives ownership from chain-visible artifacts plus deterministic verification

This is why it is a plausible v1 improvement rather than a totally new protocol.

## What It Changes

Merkle batching **does** change the commit carrier and reveal verification path:

- instead of one on-chain `COMMIT` payload per claim, a batch anchor transaction carries one Merkle root
- each claimant receives a proof artifact showing their claim leaf was included in that root
- reveal logic and indexers must verify the proof before accepting the claim

So the conceptual lifecycle can stay intact while the wire and indexing model change materially.

## v0 Scope Recommendation

The cleanest launch-plausible first version is:

- ordinary lane only
- commit batching only
- explicit on-chain batch anchor
- explicit reveal-side proof verification
- modest batch size cap

This keeps the change substantial enough to matter, but narrow enough to review and ship.

## Proposed Batch Model

### Batch Anchor Transaction

A batch anchor transaction would contain:

- one batch-anchor carrier output containing the Merkle root and batch metadata
- one dedicated bond output per included claim
- any ordinary fee or change outputs

The transaction itself becomes the durable anchor for all claims in that batch.

### One Claim Per Bond Output

Each claim still gets its own dedicated bond UTXO.

That means Merkle batching does **not** pool or socialize bond capital across names.

Instead, it reduces only the repeated per-claim commit-carrier overhead.

### Deterministic Leaf Ordering

The cleanest current ordering rule is:

- leaves are ordered by ascending `bond_vout` within the batch anchor transaction

That gives each claim a stable chain-derived position without needing extra coordination rules.

### Leaf Contents

A v0 leaf should minimally bind:

- protocol domain / version tag
- `owner_pubkey`
- `commit_hash`
- `bond_vout`

Conceptually:

```text
leaf_hash = H(domain_tag | version | bond_vout | owner_pubkey | commit_hash)
```

The exact hash function and domain tag remain a spec item, but the important property is that the leaf commits both to the claim identity and to the exact bond output that funds it.

## Reveal-Side Proof Model

The claimant must later reveal:

- the batch anchor transaction id
- the owner public key bound into the committed leaf
- the claim nonce and normalized name
- the bound `bond_vout`
- the Merkle proof for the corresponding leaf

The indexer then verifies:

1. the batch anchor exists on-chain
2. the referenced `bond_vout` exists and satisfies the required ordinary-lane bond amount
3. the claim leaf reconstructed from reveal data, including `owner_pubkey`, matches the provided proof
4. the proof resolves to the anchored Merkle root

## Proof Carrier Recommendation

For v0, the best direction is:

- keep proof carriage **explicit**
- avoid Taproot-hidden or scriptless proof tricks

That means the proof should be carried in a way the chain/indexer model can verify directly.

The exact byte packing is still the main unresolved wire-format choice. The current bias is:

- use an explicit batched reveal format or chunked reveal-side carrier
- do **not** rely on hidden witness semantics or Taproot-specific tricks for v0

This keeps the design much easier to audit and explain.

## Batch Size Recommendation

The initial batching design should stay modest.

Working recommendation:

- target an initial batch cap in the low single digits, such as `2-8` claims per anchor
- keep the hard requirement that v0 remain under `255` bond outputs unless `bond_vout` is widened

Why:

- current payload and code paths already assume small `vout` references
- the current measured footprint report shows that small batches are much more favorable than large batches under explicit proof carriage
- large batches can be revisited later if reveal proof carriage becomes much more compact

## Coordinator Model

The protocol should not require a service-provider coordinator.

It should support:

- **self-batching** by a power user or tool
- **optional coordinator batching** for hosted or assisted flows

That keeps the sovereignty story clean:

- a hosted coordinator may improve convenience
- but the protocol itself should not require trust in one

## Wire-Format Implications

Merkle batching v0 likely implies:

- a new batched-commit carrier format for the anchor transaction
- a richer batched reveal format that includes proof material
- updated indexer parsing rules for batched commits and batched reveals

The exact byte layout is still open, but the conceptual change is already clear:

- the explicit one-claim-one-commit payload path is no longer the only claim carrier

## Indexer Implications

The indexer must learn to:

- recognize batch-anchor transactions
- extract root and metadata
- associate bond outputs with leaf ordering
- verify Merkle proofs during reveal
- preserve provenance so users can inspect which batch anchor a name came from

This is a meaningful implementation change, not just an encoding tweak.

## Website And UX Implications

The website should continue to make claims understandable to a normal user.

That means the product surface needs to show:

- whether a claim is using a batched commit path
- which batch anchor it belongs to
- the bond output chosen for that claim
- the proof package or reveal artifact required later

The UX should still feel like:

- prepare claim
- review claim details
- sign / broadcast
- later reveal

not like:

- manually manage an opaque Merkle artifact with no product support

## Open Design Questions Before Coding

The original open questions were:

1. exact batched-commit anchor payload format
2. exact batched reveal carrier and proof packing
3. exact hash / domain-separation convention for leaves and internal nodes
4. whether v0 should support both batched and legacy single-commit flows in parallel during transition

These now have recommended defaults in [MERKLE_BATCHING_V0_DECISIONS.md](./MERKLE_BATCHING_V0_DECISIONS.md).

## Implementation Checklist

Implementation should be treated as a full-stack change, not only a core-protocol patch.

### 1. Protocol / Spec

- define the batch-anchor event shape
- define leaf hash inputs and deterministic ordering
- define proof verification rules
- define batched reveal payload / artifact format
- define batch size cap for v0
- decide whether legacy single-commit support remains temporarily available

### 2. Shared Protocol And Core Packages

- extend `packages/protocol` to encode / decode batch-anchor and batched reveal structures
- add Merkle hashing and proof verification helpers
- update `packages/core` claim validation to accept batched commit provenance
- preserve current bond-threshold logic unchanged
- add clear error cases for invalid proofs, wrong `bond_vout`, malformed batch anchors, and duplicate claims

### 3. Transaction Architect / CLI

- extend claim artifact generation to support batched ordinary-lane commits
- generate per-claim proof bundles and reveal artifacts
- support self-batching flows from CLI tooling
- keep coordinator-assisted batching optional rather than mandatory
- add inspection commands so a user can review the anchor txid, bond output, and Merkle proof for a claim

### 4. Indexer / Resolver

- detect and parse batch-anchor transactions
- store batch roots, leaf metadata, and per-claim bond output references
- verify proofs on reveal
- expose batch provenance through resolver responses
- ensure availability and ownership queries still work normally for end users

### 5. Website

- update claim-prep flow to explain when batching is being used
- show the batch anchor, bond output reference, and later reveal requirements
- allow users to review the exact batched claim artifacts before signing
- update provenance views so batched claims remain inspectable in the UI
- verify that the website still supports end-to-end ordinary claim review after the protocol change

### 6. Documentation

- update core docs to explain batched commits versus legacy explicit commits
- update architecture docs to describe new artifact and proof flows
- update explainer / reviewer docs where chain-footprint claims are discussed
- document the trust boundary around optional coordinators
- clearly state that batching changes efficiency, not scarcity economics

### 7. Automated Testing

- add unit tests for Merkle leaf construction, ordering, root computation, and proof verification
- add protocol tests for valid and invalid batched reveal flows
- add indexer tests for batch anchor parsing and claim derivation
- add CLI / architect tests for claim artifact generation
- update regression tests so the existing claim lifecycle still works under the new ordinary-lane batching model
- run the full test suite, not just the new Merkle-specific tests

### 8. End-To-End Review

- exercise the full ordinary-lane batched claim flow on regtest
- verify that the website can prepare, review, and explain the new flow
- verify that provenance remains legible after indexing
- run at least one realistic manual walkthrough using the website and signer path

### 9. Rollout Discipline

- land the design note before or alongside code changes
- keep the implementation behind a clear feature branch or staged rollout path until regtest coverage is complete
- measure actual transaction size and chain-footprint deltas before claiming success publicly

That last item is now partially complete: we have a repeatable measurement
script and a first report, and the result is strong enough to guide the next
design decision on batch sizing.

## Suggested Order Of Work

1. close the remaining wire-format questions
2. implement shared protocol + proof helpers
3. update architect / CLI artifact generation
4. update indexer validation and provenance handling
5. update website review flows
6. update docs
7. run and expand the full test suite
8. do a manual website-based claim walkthrough

## Current Recommendation

If GNS wants one footprint-focused v1 improvement to pursue seriously before launch, Merkle batching now looks like the cleanest candidate.

The right framing is:

- keep the bond as the scarcity mechanism
- use batching to reduce footprint
- preserve the ordinary-lane commit / reveal mental model
- avoid overreaching into Taproot-heavy redesign unless there is a much stronger later reason

The important nuance from measurement is:

- batching already survives functional testing
- batching clearly improves commit footprint and transaction count
- batching does **not yet** justify a blanket claim of lower full-flow vbytes at
  large batch sizes
- so the next design work, if we want bigger wins, should focus on reveal proof
  carriage rather than on the batch anchor itself
