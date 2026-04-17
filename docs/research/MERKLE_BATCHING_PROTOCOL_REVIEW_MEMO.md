# Merkle Batching Protocol Review Memo

This note is meant to be the compact reviewer-facing explanation of what ONT is
doing with Merkle batching, where Taproot annex fits into that story, and which
questions we most want thoughtful Bitcoin protocol engineers to challenge.

It is intentionally narrower than the broader launch docs. The focus here is
Bitcoin footprint, protocol shape, verification boundaries, and upgrade
options.

Related notes:

- [MERKLE_BATCHING_V0.md](./MERKLE_BATCHING_V0.md)
- [MERKLE_BATCHING_V0_DECISIONS.md](./MERKLE_BATCHING_V0_DECISIONS.md)
- [MERKLE_BATCHING_FOOTPRINT.md](./MERKLE_BATCHING_FOOTPRINT.md)
- [MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md](./MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md)
- [MERKLE_BATCHING_TAPROOT_ANNEX_SKETCH.md](./MERKLE_BATCHING_TAPROOT_ANNEX_SKETCH.md)
- [MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md](./MERKLE_BATCHING_TAPROOT_ANNEX_ENVELOPE_SKETCH.md)
- [MERKLE_BATCHING_WALLET_COMPATIBILITY.md](./MERKLE_BATCHING_WALLET_COMPATIBILITY.md)
- [MERKLE_BATCHING_ANNEX_ARTIFACT_ROUNDTRIP.md](./MERKLE_BATCHING_ANNEX_ARTIFACT_ROUNDTRIP.md)
- [MERKLE_BATCHING_ANNEX_CORE_INDEXER_SPIKE.md](./MERKLE_BATCHING_ANNEX_CORE_INDEXER_SPIKE.md)

## What We Are Trying To Achieve

ONT uses bonds and time locks to make names costly to warehouse. That is the
scarcity mechanism.

Merkle batching is not trying to replace that mechanism. Its job is simpler:

- reduce the number of ordinary-lane commit transactions
- reduce repeated on-chain commit-carrier bytes
- keep claim verification deterministic
- preserve the same high-level `commit -> reveal` lifecycle

So the intended separation of responsibilities is:

- **bond amount + lock duration** create scarcity
- **Merkle batching** improves chain efficiency

That distinction matters to us. We are not trying to smuggle anti-squatting
economics into transaction complexity.

## Current Mainline Design

The current concrete path is:

- `ordinary lane` only
- `commit batching` only
- one explicit batch-anchor transaction
- one dedicated bond output per claim
- explicit reveal-side proof verification

At a high level:

1. a batch anchor transaction commits many claims at once by publishing one
   Merkle root
2. the same anchor transaction includes one bond output per claim
3. each claimant later reveals their own name separately
4. each reveal includes enough information for an indexer to reconstruct the
   relevant leaf and verify a Merkle proof back to the anchored root

Conceptually, ONT still behaves like:

- commit first
- reveal later
- verify against prior commitment

The only structural change is that the commit step becomes batched.

## What The Merkle Tree Is Actually Committing To

Each batch leaf binds one claim to one exact bond output. The current model is:

- `owner_pubkey`
- `commit_hash`
- `bond_vout`
- protocol domain / version separation

The key property is that the Merkle leaf is not just "some name exists in this
batch." It is:

> this exact claim commitment is bound to this exact bond output in this exact
> anchor transaction.

That keeps the existing ONT economics intact:

- one claim still has one dedicated bond UTXO
- batching does not pool or socialize the bond itself
- batching only compresses repeated commit-carrier overhead

## Why Merkle Batching Helps

Without batching, each ordinary claim needs its own on-chain commit carrier.

With batching:

- many claims share one explicit root commitment
- many claims share one transaction shell
- each claim still keeps its own bond output

That means batching can reduce:

- transaction count
- repeated commit-carrier bytes
- operator overhead for bulk ordinary claims

It does not change:

- required bond amount
- lock duration
- per-claim bond continuity

## Where The Current Bottleneck Is

The current footprint measurements show an important pattern:

- the batch anchor is efficient
- small batches improve the full ordinary claim lifecycle
- larger batches stop looking good because the reveal proof bytes get heavy

That means the limiting factor is no longer the anchor root itself.

The real bottleneck is:

> how the reveal carries the Merkle proof bytes

Today the proof is carried explicitly in reveal-side outputs. That is simple and
easy to review, but those bytes live in the more expensive base transaction
serialization.

## How Annex / Taproot Enters The Picture

Taproot annex became interesting to us for one reason:

> it offers a way to keep the proof on chain while moving the bulky proof bytes
> into witness space instead of explicit base outputs.

The hybrid design we have been researching is:

- keep a small explicit `BATCH_REVEAL` header on chain
- make that header commit to:
  - `carrier_input_index`
  - `annex_sha256`
  - `annex_bytes_length`
- carry the actual Merkle proof bytes in the Taproot annex of a designated
  input

So the semantics stay recognizable:

- the transaction still has an explicit ONT reveal event
- the header still tells the indexer what claim this is
- the annex carries only the bulky proof bytes

This is attractive because witness bytes are cheaper than base bytes under the
SegWit weight model.

## What We Have Already Proven

We now have three layers of evidence.

### 1. Explicit Merkle batching is real

The explicit v0 batching path is implemented and exercised end to end for the
ordinary lane.

That includes:

- protocol encoders / decoders
- builder and CLI support
- core and indexer verification
- web provenance visibility
- fixture-backed smoke flow
- SSH-backed regtest coverage

### 2. Reveal carrier is the real scaling question

The footprint measurements show:

- explicit proof carriage is fine for small batches
- explicit proof carriage becomes the limiting factor at larger batch sizes

So if we want to claim the design is thoughtful about Bitcoin block space, the
next serious question is reveal proof carriage, not whether Merkle roots work.

### 3. Annex is now more than theory

We have experimental but real evidence that an annex path is technically
plausible:

- custom CLI tooling can build, sign, and verify annex-bearing reveal-like
  transactions
- real ONT batch reveal semantics can be bridged into that envelope
- a core/indexer-style parser can recover the annex bytes from raw witness,
  reconstruct the proof, and verify it against the expected Merkle root

So annex is no longer just a whiteboard idea. It is now a credible custom
tooling path.

## Why Annex Is Not Yet The Mainline Path

Even though annex looks promising, we have not promoted it to the mainline
protocol path.

The reason is not that it seems cryptographically unsound. The remaining
concerns are mostly around ecosystem and operational complexity:

- normal PSBT wallet flows do not handle annex cleanly
- [BIP371](https://bips.dev/371/) does not define a standard annex field for
  PSBTs
- custom finalization becomes part of the operator story
- `txid` is no longer enough to pin the witnessed transaction; `wtxid` matters
- indexers must inspect raw witness, not just explicit outputs
- witness retention and archival assumptions become more important
- reviewer trust may depend on whether this looks like a reasonable use of
  Taproot or a clever but awkward trick

So the current posture is:

- `explicit batching` is the concrete mainline path
- `annex` is the leading scaling upgrade candidate

## The Practical Tradeoff

The current design space looks like this:

| Path | What It Buys | What It Costs |
| --- | --- | --- |
| Explicit proof outputs | simplest review story, strong wallet compatibility, easy provenance | larger reveal transactions at medium/large batch sizes |
| Better explicit packing | modest savings with low protocol risk | limited headroom because proof bytes still live in base serialization |
| Explicit header + annex proof | likely strongest next footprint improvement while keeping proof on chain | custom tooling, weaker wallet compatibility, more witness-aware parsing |
| Full script-path / deeper Taproot redesign | possibly more expressive future design | higher protocol and tooling complexity than we want right now |

## Questions We Want Bitcoin Protocol Engineers To Weigh In On

These are the questions where outside review would be most valuable.

### 1. Is annex a reasonable place for this kind of application payload?

We want blunt feedback on whether carrying Merkle proof bytes in annex looks
like:

- a legitimate witness-native optimization, or
- a socially awkward use of Taproot that Bitcoin engineers would find
  ill-fitting

### 2. Are we missing relay or policy pitfalls?

We want review on whether annex-bearing key-path transactions create any
practical problems around:

- relay behavior
- mempool policy expectations
- standardness assumptions
- miner behavior
- fee estimation or replacement edge cases

### 3. Is the hybrid design the right shape?

Our current instinct is:

- small explicit reveal header
- explicit commitment to annex hash and length
- proof bytes only in annex

We want feedback on whether that is the right split, or whether protocol
engineers would prefer:

- more explicit bytes
- less explicit bytes
- a different witness carrier entirely

### 4. Is the `carrier_input_index` model acceptable?

If multiple inputs exist, the protocol needs a deterministic answer to:

> which input carries the annex for this reveal?

We currently model that explicitly in the header. We want feedback on whether
that is clean enough or whether a better binding rule exists.

### 5. Are we underestimating the operational cost of witness dependence?

Annex improves weight, but it also makes historical witness availability more
important.

We want feedback on whether it is acceptable for ONT to assume:

- archival nodes or indexed witness access for serious verification

and whether that crosses any important line from a protocol-legibility point of
view.

### 6. How concerning is the PSBT / wallet compatibility story?

Today annex looks like:

- standard unsigned PSBT as a construction container
- plus an ONT sidecar
- plus custom finalization

We want review on whether that seems like:

- an acceptable specialized operator flow, or
- a warning sign that annex should stay research-only for longer

### 7. Are there better witness-native alternatives we should study first?

Before we go deeper on annex, we want to know if experienced reviewers think we
should instead prioritize:

- improved explicit packing only
- Taproot script-path carriage
- a P2WSH-style witness path
- a different proof serialization strategy

### 8. Does the current Merkle binding model look sound?

We want challenge on the basics too, not just annex:

- leaf contents
- `bond_vout` binding
- batch ordering by `bond_vout`
- duplicate leaf or replay edge cases
- batch size and `vout` width assumptions

### 9. Is there a clearer reviewer-friendly path for v1 versus later upgrades?

Right now our bias is:

- ship explicit batching first
- continue annex research in parallel
- only promote annex after stronger external confidence

We want protocol engineers to tell us whether that sequencing seems prudent or
overly conservative.

## What We Would Most Like Reviewers To Tell Us

The most helpful feedback is not generic approval or disapproval. It is direct
answers to questions like:

- "annex is fine, but your input-association rule is weak"
- "this looks efficient, but the wallet story is too custom for v1"
- "you are underestimating witness availability requirements"
- "your explicit path is already good enough; stop here for launch"
- "annex is the right direction, but use a different envelope or witness rule"

That kind of feedback would help us converge much faster than more abstract
reactions.

## Current Recommendation

Our current recommendation to ourselves is:

- keep the implemented explicit batching path as the mainline ordinary-lane
  design
- keep annex as an active research track, not just a speculative note
- socialize the current evidence with protocol-minded reviewers before deeper
  integration

That feels like the right balance between ambition and discipline:

- we already have a working footprint improvement
- we have identified the real remaining bottleneck
- and we now have enough annex evidence to ask sharp questions rather than
  vague ones
