# Merkle Batching Status

This note is the shortest practical answer to:

> what does Merkle batching actually cover in the current codebase, what have we
> validated, and what is still experimental or out of scope?

It is meant to be a status document, not a design memo.

Related notes:

- [MERKLE_BATCHING_V0.md](./MERKLE_BATCHING_V0.md)
- [MERKLE_BATCHING_FOOTPRINT.md](./MERKLE_BATCHING_FOOTPRINT.md)
- [MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md](./MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md)
- [MERKLE_BATCHING_PROTOCOL_REVIEW_MEMO.md](./MERKLE_BATCHING_PROTOCOL_REVIEW_MEMO.md)

## Current Bottom Line

We now have strong confidence that the **explicit ordinary-lane Merkle batching
path** works across commit, reveal, and the later ordinary lifecycle of a
claimed name.

That statement has a specific meaning:

- batched commit anchors work
- batched reveals are verified against anchored Merkle roots
- browser and CLI tooling can build the relevant artifacts
- resolver, indexer, and web provenance surfaces understand the batched events
- names claimed through batched anchors still participate in normal transfer and
  continuity rules afterward

This does **not** mean every future batching idea is done. It means the
ordinary-lane `batch anchor -> individual batch reveal -> normal name lifecycle`
path is real and validated.

## What Is Implemented Today

### Protocol and builder layer

- batch anchor payloads
- batch reveal payloads
- explicit proof-chunk payloads
- Merkle leaf hashing, root construction, and proof verification helpers
- reveal-ready batch claim packages
- batch commit artifact builders
- batch reveal artifact builders

### Core / state machine

- pending batch anchors tracked in state
- batch reveals validated against the anchored Merkle root
- invalid proof chunks rejected
- invalid Merkle proofs rejected
- invalid or duplicate `bond_vout` usage rejected
- same-block anchor/reveal ordering handled

### Persistence and review surfaces

- batch provenance stored in snapshots
- resolver responses include batched ordinary claims correctly
- website provenance views display batch anchors and batch reveals

### User tooling

- CLI can build batch commit artifacts
- CLI can build batch reveal artifacts
- CLI reveal queue can broadcast signed batch reveals
- offline web architect can:
  - build one ordinary-lane batch commit PSBT
  - export one reveal-ready batch claim package per name
  - later load a saved batch claim package
  - build the corresponding one-by-one batch reveal PSBT locally

## What We Have Validated

### Unit and package-level validation

We have passing tests across:

- `@gns/protocol`
- `@gns/core`
- `@gns/cli`
- `@gns/web`

The Merkle-specific confidence points now include:

- proof helpers round-trip deterministically
- valid batched reveals apply
- malformed proof chunks fail
- wrong Merkle proofs fail
- names claimed through batched anchors still transfer correctly under the
  normal immature transfer rules

### Fixture-backed smoke validation

[`npm run test:smoke-fixture-batch`](../../package.json) proves the stack stays
coherent with batched ordinary claims across:

- resolver health
- web health
- name lookups
- name activity
- transaction provenance
- offline architect presence for both batch commit and batch reveal builders

### Controlled-chain validation

[`npm run test:regtest-cli-suite`](../../package.json) includes a successful
ordinary-lane batched claim flow with:

- one batch anchor
- two queued batch reveals
- anchor confirmation
- reveal broadcast through the watcher
- final resolver verification of both claimed names

## What We Can Say Confidently

The strongest current claim is:

> explicit Merkle batching works today for the ordinary claim lifecycle through
> batched commit, individual batched reveal, and later ordinary transfer
> semantics.

That is materially stronger than:

> we have a commit-batching prototype

because the claim path is no longer isolated at commit time. It is wired into
the later reveal and post-claim state transitions too.

## What Is Still Experimental

These items are real research, but not mainline behavior:

- Taproot annex reveal carriage
- annex-aware builder / signer / verifier envelopes
- annex-aware core/indexer spike code

Those are promising, but they are still an upgrade path, not the production
Merkle batching path.

## What Is Still Out Of Scope

The current Merkle batching work does **not** implement:

- reserved-lane auction batching
- transfer batching
- value-record batching
- automatic multi-reveal execution in one browser step
- large-batch optimization beyond the current explicit proof-carriage design

In particular:

- transfers for names claimed through batch anchors work
- but **transfers themselves are not batched**

That distinction is important.

## Main Remaining Limits

### 1. Larger explicit batches are not automatically better

The footprint report still shows:

- strong commit-side savings
- good small-batch economics
- weaker full-flow economics at larger batch sizes under explicit proof
  carriage

So the current mainline batching path is strongest for modest batch sizes.

### 2. Browser automation remains intentionally one reveal at a time

The browser can now generate the later one-by-one reveal PSBT for a saved batch
claim package, which closes the biggest workflow gap.

What it still does not do is:

- automatically generate every later reveal PSBT for an entire batch in one
  action

That is a workflow limitation, not a protocol correctness problem.

## Recommended Public Wording

If we want a careful but confident summary, the wording I would use is:

> GNS now has a working explicit Merkle batching path for ordinary claims. We
> can batch the commit anchor, later reveal names individually against the
> anchored Merkle root, inspect the full provenance in the website, and carry
> those names through the normal immature transfer rules afterward. The next
> scaling question is not whether Merkle batching works. It is how far we want
> to push reveal proof carriage and large-batch efficiency.
