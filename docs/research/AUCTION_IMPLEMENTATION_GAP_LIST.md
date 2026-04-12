# Auction Implementation Gap List

This note is meant to keep the auction work honest.

We now have enough auction implementation that it is easy to overstate where we
are:

- policy defaults exist
- simulators exist
- fixture coverage exists
- the website shows live auction states
- CLI and website can now export an experimental bid package from those states
- CLI can now turn that package into a signable experimental bid transaction
- the protocol has an explicit experimental `AUCTION_BID` payload shape
- the resolver and website can now derive an experimental live auction feed
  from observed `AUCTION_BID` transactions for catalog lots

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
- an experimental `AUCTION_BID` event payload in `@gns/protocol`
- an experimental unsigned/signed auction bid artifact flow in CLI + architect
- core/indexer support for recording structurally valid `AUCTION_BID`
  transactions and deriving lot-level experimental auction state from them
- resolver/web exposure of that chain-derived experimental auction state

That means we now have:

- state visualization
- operator handoff artifacts
- testable simulator behavior
- a real offline operator round-trip for:
  - simulator state -> bid package
  - bid package -> unsigned bid artifacts
  - unsigned bid artifacts -> signed bid transaction
- a resolver-backed experimental auction feed that derives:
  - current leader
  - current minimum next bid
  - soft-close / settled phase
  - stale observed-state rejection
  - same-bidder replacement when the later bid spends the earlier bid bond
  - derived accepted-bid bond status and bond spend / release summaries
  - accepted and rejected observed bid outcomes

What we do **not** yet have:

- on-chain auction indexing
- registry-backed auction state transitions
- settlement and fallback rules running end to end

## Gap Categories

### 1. Signable Bid Artifact To Live Auction Logic

The first half of this gap is now closed.

We now have:

- a stable bid package
- a compact experimental `AUCTION_BID` payload
- a builder that turns the package into signable bid artifacts
- signer support for producing a real signed bid transaction offline

What is still missing is the second half:

- chain rules that give that transaction meaning inside the reserved lane
- rebid and replacement semantics against prior auction state
- settlement consequences once those bid transactions land on chain

### 2. On-Chain Auction Event Model

We still need the actual protocol shape for reserved-lane bids.

Missing:

- chain-verifiable state transitions for:
  - opening bid
  - higher bid
  - soft-close extension
  - auction settlement
- treatment for rejected or stale late bids
- treatment for transactions that are Bitcoin-valid but auction-invalid at the
  observed state
- clear definition of how the bond output and payload relate to an auction lot

This is the point where the simulator becomes a real protocol.

### 3. Auction-Aware Indexer / Resolver State

Today the resolver now knows an **experimental** subset of reserved-auction
state for catalog lots:

- observed `AUCTION_BID` transactions
- current leading bidder commitment
- current minimum next bid
- close height
- stale observed-state rejection against the derived pre-bid state
- same-bidder replacement when the later bid spends the earlier bid bond
- accepted-bid bond / release summaries
- early-vs-allowed spend classification for observed bid bond outpoints
- settled / soft-close / pending phase

What it still does **not** know:

- final reserved-lane settlement semantics
- actual loser release / winner lock enforcement on chain
- full rebid replacement enforcement on chain beyond the current experimental
  derivation
- no-bid fallback behavior
- a fully registry-backed reserved-auction market beyond the experimental lot
  catalog

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

The website can now:

- inspect simulator-backed auction states
- inspect a chain-derived experimental `AUCTION_BID` feed
- download a bid package

The CLI can now go one step further and build/sign a bid transaction from that
package.

It cannot yet:

- show a bidder’s current standing bid
- show “you are leading” / “you were outbid”
- broadcast bids
- follow an auction through settlement from live resolver state

So the public website is now:

- a richer inspection surface
- a partial bidder-prep surface
- but still not a full live bidder surface

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

The second gap we just closed is:

> that shared artifact can now be turned into a signable experimental bid
> transaction offline, using the same CLI artifact/signer flow as the rest of
> the repo.

The third gap we just closed is:

> resolver and website can now derive experimental lot-level auction state from
> observed `AUCTION_BID` transactions instead of showing only simulator
> fixtures.

That matters because it gives the next protocol step a stable boundary:

- simulator state in
- bidder intent in
- portable artifact out
- signable transaction out

## Recommended Build Order

The next implementation order that still feels sane is:

1. keep the bid package as the stable operator boundary
2. keep the experimental bid artifact / transaction builder stable long enough
   to learn from it
3. deepen reserved-auction state transitions from those bid transactions
4. only then wire the website past “download package” into a more active bidder
   flow

That keeps the work staged and reviewable instead of jumping straight from
simulator states to a large implicit protocol.
