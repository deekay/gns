# GNS Implementation And Validation

This note is meant to answer a practical question:

> what is actually implemented today, what is still experimental, and what has
> been validated enough that we can speak about it confidently?

This is not a roadmap and not a protocol appendix. It is a current-status
packet for onboarding and review.

Related notes:

- [GNS_FROM_ZERO.md](/Users/davidking/dev/gns/docs/core/GNS_FROM_ZERO.md)
- [BITCOIN_EXPERT_REVIEW_PACKET.md](/Users/davidking/dev/gns/docs/research/BITCOIN_EXPERT_REVIEW_PACKET.md)
- [BITCOIN_REVIEW_CLOSURE_MATRIX.md](/Users/davidking/dev/gns/docs/research/BITCOIN_REVIEW_CLOSURE_MATRIX.md)
- [TESTING.md](/Users/davidking/dev/gns/docs/core/TESTING.md)
- [AUCTION_TESTING_AND_LIVE_SURFACES.md](/Users/davidking/dev/gns/docs/research/AUCTION_TESTING_AND_LIVE_SURFACES.md)
- [MERKLE_BATCHING_STATUS.md](/Users/davidking/dev/gns/docs/research/MERKLE_BATCHING_STATUS.md)
- [AUCTION_SETTLEMENT_AND_OWNERSHIP.md](/Users/davidking/dev/gns/docs/research/AUCTION_SETTLEMENT_AND_OWNERSHIP.md)

## Snapshot

The shortest honest summary is:

- the ordinary claim flow is real
- the resolver and website are real
- transfer and value-record flows exist as prototypes
- explicit Merkle batching for ordinary claims is real and well-validated
- the two-lane launch design is a strong direction, but not the fully
  implemented launch mechanism yet
- Taproot annex work is credible research, not the production path

For external technically sophisticated review, the best current front door is:

- [BITCOIN_EXPERT_REVIEW_PACKET.md](/Users/davidking/dev/gns/docs/research/BITCOIN_EXPERT_REVIEW_PACKET.md)

## Status Table

| Area | Status | Confidence | Notes |
| --- | --- | --- | --- |
| Ordinary claim commit/reveal | Implemented | High | Works across CLI, resolver, web, and controlled-chain tests |
| Off-chain signed value records | Implemented prototype | Moderate | Works today, but broader resolver/network availability is still an ecosystem question |
| Transfers | Implemented prototype | Moderate to high | Gift and cooperative sale flows exist; browser UX is not the full end-user story yet |
| Ordinary-lane explicit Merkle batching | Implemented | High | Commit, reveal, negative-path rejection, and later transfer behavior are validated |
| Reserved-lane auction flow | Experimental simulator + chain-derived bid prototype | Moderate | Configurable policy, CLI simulation, fixture coverage, website state rendering, bid packages, signable experimental bid artifacts, chain-derived `AUCTION_BID` state, and an experimental settled-winner-to-owned-name path now exist; this is still not the final reserved-auction protocol |
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
- CLI commands for policy printing, scenario execution, and experimental
  bid-package creation / inspection
- an experimental bid transaction builder and signer path built on top of those
  bid packages
- a website-facing `/auctions` page that renders pending unlock, opening-floor,
  live bidding, soft-close, and settled states from those same fixtures
- a website-side simulator override for the no-bid release window, so the
  auction lab can be re-run against the same fixture set without editing code
- a resolver-backed chain-derived experimental auction feed for catalog lots,
  derived from observed `AUCTION_BID` transactions
- stale observed-state rejection in that chain-derived feed when a bid no
  longer matches the derived pre-bid state
- an explicit no-bid release valve in both the simulator-backed and
  chain-derived experimental auction states so lots can fall back to the
  ordinary lane instead of staying open forever
- same-bidder rebid classification when the later bid spends the prior bid
  bond outpoint
- derived accepted-bid bond-status plus bond spend / release summaries for both
  unsettled and settled experimental lots
- settled-winner materialization into a real owned name record, using the
  winning bid's `ownerPubkey` and bond outpoint as the live post-auction name
  state
- website bidder utilities that can preview and download experimental auction
  bid packages from both simulator-backed cases and resolver-derived observed
  states
- a dedicated private signet auction smoke script that produces real hosted
  `AUCTION_BID` activity for dedicated private smoke lots, including a live
  no-bid release-valve check plus a late-bid rejection after release, and
  publishes a summary the website can surface directly

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
- experimental bid package commitment validation
- experimental bid artifact building and signing
- experimental auction-state derivation from observed `AUCTION_BID`
  transactions
- stale-state rejection and settlement-summary derivation for those
  experimental auction observations
- same-bidder replacement derivation when the later bid spends the prior bid
  bond output
- early-vs-allowed bond-spend derivation from observed outpoint spends,
  including non-GNS spending transactions
- settled-winner materialization into a real owned name record once the auction
  reaches settlement
- website fixture loading and page rendering for the auction lab
- website rendering for the chain-derived experimental auction feed

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
- experimental reserved-auction lifecycle coverage with:
  - opening bid acceptance
  - soft-close extension
  - settlement into winner / loser bond states
  - winner materialization into a live owned name record
  - winner-owned value publication after settlement
  - mature transfer from an auction-owned name after release
  - new-owner value publication after that transfer
  - loser bond release and allowed post-settlement spend
  - winner lock until release height and allowed post-release spend
- later transfer behavior
- value publishing
- sale flows
- stale reveal handling
- invalid transfer behavior

And now, importantly, it also covers:

- a **Bitcoin-valid but GNS-invalid** batched reveal that confirms on-chain and
  is ignored by the GNS state machine because the Merkle proof does not match
  the anchored root
- a controlled-chain experimental auction lifecycle where real `AUCTION_BID`
  transactions open an auction, extend soft close, settle into winner / loser
  bond states, materialize the winner as a live owned name, and then prove
  both loser release and later winner release on chain

That is a strong validation milestone because it proves the protocol logic is
not just tied to transaction construction. It correctly rejects bad batched
reveals after they land on chain.

### Live-chain note

We now treat **private signet** as the live-chain environment that matters for
hosted demos and smoke validation.

The active live-chain batching path runs:

- one ordinary batch anchor
- two later batch reveals
- and one later gift transfer on a batch-claimed name

That gives us a live-chain demonstration of the explicit ordinary-lane Merkle
path in the hosted environment we actually control and maintain.

For the auction side, we now also have a dedicated **private signet auction
smoke** path that runs:

- one opening `AUCTION_BID`
- one higher `AUCTION_BID`
- and one intentionally early losing-bond spend
- plus a dedicated no-bid lot through release to the ordinary lane, followed
  by a deliberately late bid that gets rejected as `released_to_ordinary_lane`

That gives us a live hosted proof that the chain-derived experimental auction
feed is not just rendering fixtures. It can observe real bid transactions and
classify a real early bond spend as `spent_before_allowed_release`, while also
proving the live release valve, late-bid rejection path, and settled-winner
ownership materialization on the controlled private chain.

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
plus an experimental signable bid-artifact layer and a chain-derived
`AUCTION_BID` feed, not the final reserved-name market itself.

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
