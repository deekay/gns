# Public Auction Allocation Model

This is the current allocation direction for ONT:

> every valid ONT name is allocated by public bonded auction.

This is a working allocation model, not a final protocol freeze. It is now the
source-of-truth framing for public docs and website copy.

## Core Decision

The allocation model should be:

- public bonded auctions
- length-based opening floors for shorter names

The long-tail experience is handled by the fact that most names will not attract
serious competing bids.

## Why This Is Neutral

The rule becomes:

> if a name matters to more than one participant, the auction discovers that.

That is simpler, more neutral, and easier to explain than asking ONT to decide
which names deserve special treatment.

## Basic Flow

For valid names:

1. a participant opens an auction with a bonded bid
2. the auction remains open for the public window
3. later valid bids must clear the minimum increment
4. bids near the end extend the soft close
5. the highest valid bidder wins
6. the winner owns the name and enters settlement

If nobody submits a valid bonded opening bid, no auction has opened and no
ownership changes.

The user-facing version can still feel simple:

> Start an auction. If nobody else bids during the window, you win at your opening
> bid. If others care, the auction discovers the price.

## Length-Based Opening Floors

Every valid name should use the public auction system.

The objective bond curve gives shorter names higher fixed opening floors.

This is an objective structural rule:

- shorter strings: higher opening floors
- longer strings: quickly fall toward the global floor

Why:

- very short names are structurally scarce
- the floor is easy to verify
- early bulk capture of scarce names becomes materially expensive
- no private party gets delayed or preferred access
- `coke` and `pepsi` follow the same market rule; only the objective length
  floor differs

The exact floor curve remains tunable. The principle is that length can set an
auditable opening floor without creating a special release boundary.

## Auction Timing Defaults

The current preferred timing shape is:

- default auction window: about `7 days`
- soft-close extension: about `24 hours`
- max extension cap: still to be implemented / decided
- initial launch period: may use longer windows if awareness is uneven
- all valid names use the public auction mechanics

The prototype currently has older simulator defaults in some places. Those
should be migrated toward this model rather than treated as final.

## Pricing And Bonds

Auctions discover the price.

Length should not be used to decide the final value of a name. A short random
string may be less valuable than a longer obvious brand or handle.

Length can still remain useful as an objective opening-bond / anti-spam floor,
especially for very short names.

The current direction:

- winning bids are bonded bitcoin, not payments to ONT
- the winner still owns the bitcoin in self-custody during settlement
- the real cost is liquidity, time, and opportunity cost
- normal Bitcoin transaction fees still apply
- the protocol does not sell names and does not collect rent

## Research Notes Outside The Allocation Path

Demand-list and salience research is not launch machinery.

It may still be useful as research:

- to understand salience
- to pressure-test expected auction demand
- to generate examples for reviewers
- to model speculative behavior

It should not be used as a protocol-critical allocation list.

## What Still Needs Work

The remaining allocation-design questions are now narrower:

- exact auction window
- exact soft-close increment
- whether to cap total extension time
- length-based opening-bond floor curve
- settlement duration after winning an auction
- how auction-opening and bid packages should be finalized
- how batching should work for auction openings and bids

## Canonical One-Sentence Summary

ONT uses one market rule for names: valid names are auctioned, shorter names
can have higher fixed objective opening floors, and the auction discovers the
final bond when more than one participant cares.
