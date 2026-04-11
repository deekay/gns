# Auction Implementation Gap List

This note is meant to keep the auction work honest.

We now have enough auction implementation that it is easy to overstate where we
are:

- policy defaults exist
- simulators exist
- fixture coverage exists
- the website shows live auction states
- CLI and website can now export an experimental bid package from those states

That is real progress, but it is still not the same thing as a live reserved
auction protocol.

## Current Baseline

What exists today:

- configurable reserved-class policy in `@gns/core`
- single-auction and market-level simulators
- fixture-backed expected outcomes
- website-facing auction lab at `/auctions`
- shared `gns-auction-bid-package` artifact in `@gns/protocol`
- CLI creation and inspection of those bid packages
- website download utility for those bid packages

That means we now have:

- state visualization
- operator handoff artifacts
- testable simulator behavior

What we do **not** yet have:

- a real bid transaction format
- on-chain auction indexing
- registry-backed auction state transitions
- settlement and fallback rules running end to end

## Gap Categories

### 1. Real Bid Artifact

The new bid package is useful, but it is still only a handoff artifact.

Missing next step:

- define how a bid package becomes a signable/broadcastable bid transaction

That includes:

- funding input expectations
- bidder identity / key expectations
- how the bid amount and lock are bound on chain
- how rebids consume and replace earlier bid capital

### 2. On-Chain Auction Event Model

We still need the actual protocol shape for reserved-lane bids.

Missing:

- bid event types or transaction patterns
- chain-verifiable state transitions for:
  - opening bid
  - higher bid
  - soft-close extension
  - auction settlement
- treatment for rejected or stale late bids

This is the point where the simulator becomes a real protocol.

### 3. Auction-Aware Indexer / Resolver State

Today the resolver knows names and claim lifecycle state.

It does **not** yet know:

- active reserved auctions
- leading bidder
- current minimum next bid
- close height
- settled winner
- no-bid reserved outcomes

Until this exists, the website auction lab remains fixture-backed rather than
registry-backed.

### 4. Settlement / Release / Fallback Rules

Some of the most important reserved-lane rules are still policy notes rather
than executable logic.

Still open:

- when loser capital unlocks
- how winner capital remains locked
- whether no-bid reserved names fall back to the ordinary lane
- how over-reserved names get a release valve
- whether transfers before maturity are allowed and under what constraints

### 5. Website Bidder Flow

The website can now inspect auction states and download a bid package.

It cannot yet:

- show a bidder’s current standing bid
- show “you are leading” / “you were outbid”
- build a signable bid artifact
- broadcast bids
- follow an auction through settlement from live resolver state

So the public website is now an inspection + handoff surface, not a live
bidder surface.

### 6. End-to-End Auction Testing

Current coverage is good for the simulator layer:

- unit tests
- fixture-backed expectations
- market/budget tests
- website rendering tests

Missing higher-confidence layers:

- regtest prototype for bid transaction lifecycle
- controlled-chain settlement tests
- negative-path on-chain auction tests
- private signet or other hosted live auction smoke, if we go that far

## What We Just Closed

The first operator-facing gap we closed is:

> there is now one shared artifact for “I want to bid on this reserved auction
> state,” and both CLI and website can produce it.

That matters because it gives the next protocol step a stable boundary:

- simulator state in
- bidder intent in
- portable artifact out

## Recommended Build Order

The next implementation order that still feels sane is:

1. keep the bid package as the stable operator boundary
2. define an experimental signable bid artifact / transaction builder
3. prototype reserved-auction indexing from those bid transactions
4. only then wire the website past “download package” into a more active bidder
   flow

That keeps the work staged and reviewable instead of jumping straight from
simulator states to a large implicit protocol.
