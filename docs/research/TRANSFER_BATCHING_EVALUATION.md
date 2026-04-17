# Transfer Batching Evaluation

This note answers a narrower question than the Merkle batching work:

> should ONT turn its attention toward batching transfers, and if so, what
> would that actually mean?

The short answer is:

- transfer batching is possible to explore
- but it is **not** the highest-leverage next protocol change
- the bigger transfer pressure is still compactness and relay compatibility, not
  "we need Merkle-style batching right now"

Related notes:

- [TRANSFER_RELAY_OPTIONS.md](./TRANSFER_RELAY_OPTIONS.md)
- [MERKLE_BATCHING_STATUS.md](./MERKLE_BATCHING_STATUS.md)
- [ONT_IMPLEMENTATION_AND_VALIDATION.md](./ONT_IMPLEMENTATION_AND_VALIDATION.md)

## Current State

Today, ONT has:

- working transfer prototypes
- valid immature transfer handling with bond continuity
- valid mature transfer handling
- controlled-chain transfer coverage
- proof that names originally claimed through batch anchors still transfer
  correctly later

What ONT does **not** have today:

- transfers that are themselves Merkle-batched
- multi-name transfer packaging as a production flow
- transfer batching as a mainline protocol objective

So the current system is:

- batched claim path
- ordinary transfer path

That split is intentional right now.

## Why Claim Batching Was High Leverage

Commit/reveal had an obvious repeated-cost problem:

- many independent claims
- repeated on-chain commit carriers
- repeated reveal proof carriage

Merkle batching attacks a real repeated-overhead pattern:

- one batch anchor
- many later individual reveals against that root

That was worth doing because ordinary claims are exactly where we expect broad,
repeated use and open-namespace churn.

## Why Transfer Batching Is Different

Transfers are structurally less batch-friendly for several reasons.

### 1. Transfer authority is individualized

Each transfer is tied to:

- one prior state txid
- one current owner key
- one successor owner key
- and often one successor bond story

So unlike many claims that can share one payer and one batch anchor, transfers
are usually not naturally pooled around a single authority.

### 2. Immature transfers need bond continuity

Before maturity, each transfer has to:

- spend the old bond
- create a valid successor bond

That means immature transfers are not just metadata updates. They carry real UTXO
continuity constraints name by name.

### 3. Mature transfers are simpler, but still individualized

Mature transfers do not need successor bond continuity in the same way.

But even then, each transfer still needs:

- explicit prior-state reference
- explicit new owner
- explicit authorization

So the repeated byte burden is not mostly coming from a Merkle-proof-style
problem. It is coming from explicit authority and state-transition semantics.

### 4. Transfer demand is likely lower-frequency than claim demand

Claims are the high-volume launch and onboarding path.

Transfers matter a lot for correctness and market behavior, but they are less
obviously the place where batching buys the first big scalability win.

## What "Transfer Batching" Could Mean

There are at least four different things people might mean by the phrase.

### 1. One transaction moving many names, each with its own explicit transfer event

This is the lightest version.

For example:

- one Bitcoin transaction
- multiple transfer OP_RETURN outputs
- maybe shared fee funding

Pros:

- operationally convenient
- no major consensus-model change

Cons:

- mostly a wallet / builder convenience
- does not really solve the core size problem
- does not change the per-transfer authorization burden much

This is closer to "multi-transfer packaging" than real transfer batching.

### 2. One batch-transfer header plus explicit per-name entries

This would look more like:

- one batch header
- multiple transfer items under it

Pros:

- some fixed-overhead sharing

Cons:

- each item still needs most of the same state and authorization material
- likely modest savings unless authority model also changes

This is possible, but the gains look limited unless a more radical authority
compression path comes with it.

### 3. Merkle-batched transfer entries

This would parallel the claim-batching model more closely:

- one batch transfer anchor
- one or more later proofs that a given transfer item was included

Pros:

- could reduce repeated carrier overhead if there were real high-volume
  coordinated transfer sets

Cons:

- unclear product need today
- much more protocol complexity
- not obvious that the workflow naturally wants deferred reveal-like transfer
  settlement
- does not solve the biggest byte problem by itself

This currently looks like over-design for the actual transfer problem.

### 4. Witness-based or implicit-authority transfer compression

This is not really batching, but it is the most serious "make transfers
smaller" direction.

Examples:

- move some authority into witness data
- infer some authority from signed spending inputs

Pros:

- directly attacks the real transfer byte burden

Cons:

- touches the owner-key separation model
- complicates indexer semantics
- is a more fundamental authority-model decision

This is why [TRANSFER_RELAY_OPTIONS.md](./TRANSFER_RELAY_OPTIONS.md) is still
the more important transfer note.

## Main Insight

For transfers, the real pressure is:

> how do we keep the owner-key / authority model strong while reducing payload
> and relay awkwardness?

That is a different pressure from:

> how do we efficiently anchor many independent claim attempts?

So claim batching and transfer compactness are related only at a very high
level. They are not the same kind of problem.

## Priority Assessment

### What looks high priority

1. keep the current transfer prototype correct and well-tested
2. continue clarifying transfer relay / compactness tradeoffs
3. avoid weakening the owner-key model accidentally

### What looks lower priority

1. full Merkle-style transfer batching
2. elaborate batched transfer workflows
3. protocol work whose main gain is only operational convenience rather than a
   real size or trust-model improvement

## Recommendation

My current recommendation is:

- **do not** make transfer batching the next mainline protocol project
- **do** keep it as a research topic
- **do** treat transfer compactness and authority-model tradeoffs as the more
  important transfer research line

In other words:

> if we spend protocol attention on transfers soon, it should probably go first
> toward compactness / relay / authority questions, not Merkle-style batching.

## What Would Change My Mind

Transfer batching would become more urgent if one of these became true:

- we discover a product workflow with many same-owner or same-coordinator
  transfers happening together regularly
- transfer volume starts to dominate chain footprint concerns
- there is a clean batching shape that preserves owner-key semantics while
  producing large real savings

Right now, none of those look clearly true.

## Practical Next Steps

If we want to keep making progress here without overcommitting, the sensible
next steps are:

1. write a `transfer compactness` status/update note that summarizes the current
   relay tradeoffs after recent Merkle/annex work
2. maybe build one small `multi-transfer packaging` prototype if operational UX
   becomes important
3. postpone true transfer batching unless the demand or the economics become
   much clearer

## Bottom Line

The current answer is:

> transfers after batched claims work, but transfers themselves are not batched.
> That is probably okay for now. The next serious transfer question is still
> compactness and authority-model design, not Merkle-style transfer batching.
