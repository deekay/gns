# GNS Implementation And Validation

This note is meant to answer a practical question:

> what is actually implemented today, what is still experimental, and what has
> been validated enough that we can speak about it confidently?

This is not a roadmap and not a protocol appendix. It is a current-status
packet for onboarding and review.

Related notes:

- [GNS_FROM_ZERO.md](/Users/davidking/dev/gns/docs/core/GNS_FROM_ZERO.md)
- [TESTING.md](/Users/davidking/dev/gns/docs/core/TESTING.md)
- [MERKLE_BATCHING_STATUS.md](/Users/davidking/dev/gns/docs/research/MERKLE_BATCHING_STATUS.md)

## Snapshot

The shortest honest summary is:

- the ordinary claim flow is real
- the resolver and website are real
- transfer and value-record flows exist as prototypes
- explicit Merkle batching for ordinary claims is real and well-validated
- the two-lane launch design is a strong direction, but not the fully
  implemented launch mechanism yet
- Taproot annex work is credible research, not the production path

## Status Table

| Area | Status | Confidence | Notes |
| --- | --- | --- | --- |
| Ordinary claim commit/reveal | Implemented | High | Works across CLI, resolver, web, and controlled-chain tests |
| Off-chain signed value records | Implemented prototype | Moderate | Works today, but broader resolver/network availability is still an ecosystem question |
| Transfers | Implemented prototype | Moderate to high | Gift and cooperative sale flows exist; browser UX is not the full end-user story yet |
| Ordinary-lane explicit Merkle batching | Implemented | High | Commit, reveal, negative-path rejection, and later transfer behavior are validated |
| Reserved-lane auction flow | Experimental simulator + website lab | Moderate | Configurable policy, CLI simulation, fixture coverage, and website state rendering exist; no live on-chain reserved-auction flow yet |
| Taproot annex reveal carrier | Experimental research | Moderate | Structurally plausible, custom tooling path proven, not mainline |

## What Is Implemented Today

### 1. Ordinary claim lifecycle

The current repo supports:

- claim package creation
- commit transaction building
- reveal transaction building
- signing and broadcasting through CLI tooling
- resolver indexing of ownership
- website inspection of names and transaction provenance

This is the core system and it is real, not just mocked documentation.

### 2. Owner-signed value records

The repo also supports an off-chain value-record model:

- values are signed by the current owner key
- resolver can ingest and serve them
- clients can verify authenticity without trusting the resolver

This is important because it shows the intended separation between:

- on-chain ownership truth
- off-chain mutable destination data

### 3. Transfer flows

There is a working transfer prototype, including:

- immature gift transfers with bond continuity rules
- mature cooperative sale-style transfers

This matters because GNS is not just a claim toy anymore. The state machine has
already been exercised through later lifecycle transitions.

### 4. Explicit Merkle batching for ordinary claims

This is the most important recent implementation advance.

The explicit batching path now includes:

- batch anchor payloads
- batch reveal payloads
- explicit proof chunk payloads
- Merkle leaf / proof helpers
- batch commit and batch reveal artifact builders
- CLI reveal queue support
- resolver / indexer / web provenance support
- offline browser architect support for batch commit and later batch reveal prep

For the current confidence summary, see
[MERKLE_BATCHING_STATUS.md](/Users/davidking/dev/gns/docs/research/MERKLE_BATCHING_STATUS.md).

### 5. Experimental reserved-auction lab

The reserved-auction direction is no longer only prose.

Today the repo has:

- configurable reserved-auction policy defaults
- single-auction simulator logic
- market-level simulator logic with bidder budget constraints
- fixture-backed auction scenarios
- CLI commands for policy printing and scenario execution
- a website-facing `/auctions` page that renders pending unlock, opening-floor,
  live bidding, soft-close, and settled states from those same fixtures

This is still explicitly an experimental layer rather than the launch protocol,
but it is now implemented enough to inspect and test end to end.

## What Has Been Validated

### Unit and package tests

We have passing test coverage across:

- `@gns/protocol`
- `@gns/core`
- `@gns/cli`
- `@gns/web`

These cover both happy-path and important negative-path behaviors.

For reserved auctions specifically, this now includes:

- policy and increment behavior
- fixture-backed single-auction outcomes
- market-level bidder budget behavior
- state-at-block phase derivation
- website fixture loading and page rendering for the auction lab

### Fixture-backed smoke tests

The repo includes repeatable fixture-mode smoke tests for:

- the ordinary stack
- the batched ordinary-lane Merkle path

This gives us fast coherence checks for resolver, web, provenance, and browser
review flows.

### Controlled-chain regtest suite

The strongest practical validation today is the SSH-backed regtest CLI suite.

It already covers:

- successful ordinary claims
- successful batched ordinary claims
- later transfer behavior
- value publishing
- sale flows
- stale reveal handling
- invalid transfer behavior

And now, importantly, it also covers:

- a **Bitcoin-valid but GNS-invalid** batched reveal that confirms on-chain and
  is ignored by the GNS state machine because the Merkle proof does not match
  the anchored root

That is a strong validation milestone because it proves the protocol logic is
not just tied to transaction construction. It correctly rejects bad batched
reveals after they land on chain.

### Live-chain note

The shared public signet smoke path still exists, but it currently exercises a
single-name live claim flow rather than the newer batched ordinary-claim path.
So public signet remains useful as a “real external chain” smoke signal, but it
is not yet where the strongest Merkle-batching validation comes from.

We now also have a dedicated **private signet batch smoke** path that runs:

- one ordinary batch anchor
- two later batch reveals
- and one later gift transfer on a batch-claimed name

That gives us a live-chain demonstration of the explicit ordinary-lane Merkle
path in a controlled hosted environment, without depending on public signet
funding conditions.

## What We Can Say Confidently

The strongest implementation claims we can make today are:

1. The ordinary GNS claim flow works.
2. The resolver / website / CLI surfaces are coherent enough to review and demo
   the system end to end.
3. Explicit ordinary-lane Merkle batching works through commit, reveal,
   negative-path proof rejection, and later transfer semantics.

Those are meaningful claims.

They are stronger than:

- "we have ideas"
- "we have docs"
- "we have partial transaction builders"

## What Is Still Experimental

### 1. Two-lane launch details

We are converging toward:

- ordinary commit/reveal lane
- reserved deferred-auction lane

That direction is strong, but it is still a design direction rather than the
implemented launch spec.

What is implemented is the simulator-backed auction lab around that direction,
not the on-chain reserved-name market itself.

### 2. Taproot annex reveal carrier

The annex work has progressed from vague idea to credible research path:

- we modeled the likely weight savings
- we built custom tooling spikes
- we proved an envelope-style round-trip
- we proved an indexer/core-style parser can recover and verify annex data

But it is still experimental because:

- it is not a standard-wallet flow
- it likely needs custom tooling
- it complicates witness parsing and product surfaces

So annex should currently be described as:

> a serious upgrade candidate, not the production Merkle batching path

## What Is Intentionally Out Of Scope

These are not done yet and should not be implied by the current docs:

- reserved-lane auction implementation
- batched transfers
- batched value-record updates
- a fully polished browser signing flow
- a final mainnet launch package

## Best Current Review Story

If we want a reviewer-friendly summary right now, the strongest version is:

> GNS already has a real ordinary claim system with resolver and website
> surfaces, a working transfer prototype, and a well-validated explicit Merkle
> batching path for ordinary claims. The next big questions are launch-market
> design for reserved names and whether to keep the explicit reveal carrier as
> the production path or eventually move toward a more efficient Taproot-based
> reveal carrier.

## Suggested Next Review Order

For someone trying to evaluate the project without getting lost:

1. [GNS_FROM_ZERO.md](/Users/davidking/dev/gns/docs/core/GNS_FROM_ZERO.md)
2. [GNS_EXPLAINER.md](/Users/davidking/dev/gns/docs/research/GNS_EXPLAINER.md)
3. [TESTING.md](/Users/davidking/dev/gns/docs/core/TESTING.md)
4. [MERKLE_BATCHING_STATUS.md](/Users/davidking/dev/gns/docs/research/MERKLE_BATCHING_STATUS.md)

Only after that should a new reader jump into:

- Merkle batching v0 design notes
- reveal carrier tradeoffs
- Taproot annex sketches
