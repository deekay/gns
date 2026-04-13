# Auction Settlement And Ownership

This note describes the current experimental settlement shape for reserved-name
auctions.

The important design choice is:

> the winning bid itself carries the eventual owner key, so we do not need a
> separate settlement transaction just to assign ownership after the auction
> closes.

This is the current implementation direction, not a forever-frozen protocol
commitment.

## Current Shape

Each experimental `AUCTION_BID` now carries:

- the lot commitment
- the observed pre-bid auction-state commitment
- the bidder commitment
- the bid amount
- the reserved lock duration
- the bond outpoint location
- the eventual `ownerPubkey`

If that bid becomes the winning settled bid, the resolver/indexer can derive a
real owned name directly from it.

## What Happens At Settlement

When the auction reaches `settled`:

- the highest accepted bid becomes the winner
- the winning bid's `ownerPubkey` becomes the live owner key for the name
- the winning bid bond outpoint becomes the live bond anchor for the name
- the winning bid amount becomes the name's required bond amount
- the name enters the normal immature / locked period until the reserved lock
  release height

In the current experimental engine, that means the settled auction winner is
materialized as a real `NameRecord` in the registry state.

## Why We Chose This Shape

The main benefits are:

- fewer transactions than a separate "win then claim/settle" step
- simpler operator flow
- simpler website explanation
- easier indexer materialization
- direct reuse of the existing name-lock / bond-continuity model

The strongest practical benefit is that a settled reserved auction can now
become a real owned name without inventing a second ownership-assignment
mechanism.

## Bond Continuity Consequences

This shape makes the winner's capital lock meaningful in the same way as the
ordinary lane:

- the winner bond remains the live locked bond through the reserved maturity
  period
- the loser bonds become releasable after settlement
- later transfer / invalidation logic can key off the same bond anchor the name
  was created from

That gives reserved auctions a cleaner relationship to the existing state
machine than a purely advisory "auction winner" record would.

## No-Bid Lots

If a reserved lot reaches the configured no-bid release window without a valid
opening bid:

- it moves to `released_to_ordinary_lane`
- no auction-owned name is materialized
- the name becomes claimable through the ordinary path instead

So settlement materialization only happens for lots with an actual settled
winning bid.

## What This Does Not Solve Yet

This experimental model still leaves open:

- whether final launch protocol wants a separate winner-acknowledgement step
- whether transfer-before-maturity rules for reserved winners need any special
  treatment
- whether a future version wants a more private winner-key mechanism
- how much of the current experimental derivation should become stricter
  chain-enforced semantics

So the right way to describe the current state is:

> the repo now has an experimental but real `winning bid -> owned name`
> settlement path for reserved auctions.
