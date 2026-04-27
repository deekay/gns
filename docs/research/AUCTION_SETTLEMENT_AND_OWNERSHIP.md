# Auction Settlement And Ownership

This note describes the current experimental settlement shape for ONT auctions.

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
- the settlement lock duration
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
- the name enters the normal immature / locked period until the settlement lock
  release height

In the current experimental engine, that means the settled auction winner is
materialized as a real `NameRecord` in the registry state.

## Why We Chose This Shape

The main benefits are:

- fewer transactions than a separate "win then settle into ownership" step
- simpler operator flow
- simpler website explanation
- easier indexer materialization
- direct reuse of the existing name-lock / bond-continuity model

The strongest practical benefit is that a settled auction can become a real
owned name without inventing a second ownership-assignment mechanism.

## Bond Continuity Consequences

This shape makes the winner's capital lock meaningful:

- the winner bond remains the live locked bond through the settlement period
- loser bonds become releasable after settlement
- later transfer / invalidation logic can key off the same bond anchor the name
  was created from

That gives auctions a cleaner relationship to the existing state machine than a
purely advisory "auction winner" record would.

## Current Lead Direction For Pre-Release Transfers

The current experimental engine still models winners using one live owner bond.

That is good enough for current testing, but it may not be the right final
anti-speculation rule for pre-release transfers.

The strongest current direction is:

- a pre-release transfer should still deliver a clean asset to the buyer
- the live owner bond for the name should move to the buyer in the transfer
  transaction
- a seller who exits before the release height may need to leave behind an exit
  bond until that original release height
- the maturity / release clock should not reset on transfer

The intended outcome is:

- clean pre-release transfers remain possible
- the buyer does not inherit hidden seller counterparty risk
- short-horizon speculative flipping remains capital-intensive

This split-lock shape is not fully implemented yet.

## Legacy Scheduled-Catalog Compatibility State

The older scheduled-catalog prototype allowed a catalog entry to reach a
configured expiry window without a valid opening bid:

- it moves to `unopened`
- no auction-owned name is materialized
- the name remains without an owner until a future objective path reopens it

That state is useful compatibility coverage for old catalog fixtures, but it is
not the current launch story. In the user-started model, no auction exists until
a valid bonded opening bid confirms. Settlement materialization only happens for
auctions with an actual settled winning bid.

## Current Validation

This experimental settlement path is now validated beyond the moment of
settlement itself.

In the controlled-chain regtest suite, we prove that:

- a settled winning bid materializes into a live owned name
- the winning owner can publish a value record after settlement
- once the settlement lock expires, that auction-owned name can move through a
  mature transfer
- the new owner can then publish the next value record sequence successfully

That gives us a stronger claim than "the winner appears in a feed." The
auction-owned name is now exercised through later registry lifecycle steps too.

## What This Does Not Solve Yet

This experimental model still leaves open:

- whether final launch protocol wants a separate winner-acknowledgement step
- exact script and state rules for the split between the live owner bond and a
  possible seller exit lock on pre-release transfers
- whether a future version wants a more private winner-key mechanism
- how much of the current experimental derivation should become stricter
  chain-enforced semantics

So the right way to describe the current state is:

> the repo now has an experimental but real `winning bid -> owned name`
> settlement path for auctions.
