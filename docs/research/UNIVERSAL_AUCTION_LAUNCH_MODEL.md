# Universal Auction Launch Model

This is the current lead launch direction for ONT.

It replaces the earlier two-lane model of:

- ordinary names
- reserved names

with one allocation rule:

> every eligible ONT name is allocated by auction.

This is a working launch model, not a final protocol freeze. It is now the
source-of-truth framing for launch docs and website copy.

## Core Decision

ONT should not maintain a semantic reserved-name list.

The launch model should be:

- one auction lane
- no ordinary direct-allocation lane
- no reserved-name lane
- no pre-launch reservation system
- no editorial list of brands, public figures, companies, or generic words
- short names held for a later objective wave

The ordinary-long-tail problem is handled by the fact that most names will not
attract serious competing bids.

## Why This Is Cleaner

The earlier reserved-list path solved a real problem, but it created a bigger
one:

- which names are important enough to reserve?
- who decides?
- how do we defend boundary cases?
- how do we avoid insider or editorial favoritism?
- how do we keep the list current without governance creep?

Universal auctions avoid that entire category of judgment.

The rule becomes:

> if a name matters to more than one participant, the auction discovers that.

That is simpler, more neutral, and easier to explain than asking ONT to
pre-compute global salience.

## Basic Flow

For launch-eligible names:

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

## Short-Name Second Wave

Names of length `1-4` should not open at initial launch.

They should be held for a later short-name auction wave.

This is not a reserved list. It is an objective structural rule:

- `1-4` characters: later short-name wave
- `5-32` characters: eligible at launch

Why:

- very short names are structurally scarce
- the boundary is easy to verify
- no private party gets early access
- ONT can launch normal names without letting the scarcest namespace layer
  clear before the system has attention

`1-4` is preferred over `1-5` because `5` starts capturing too many ordinary
names, brand-like words, and first names.

The short-name wave should not unlock on calendar time alone. The current
working shape is a combined objective gate:

- minimum block-height delay after initial launch
- minimum time-weighted bonded value across live ONT auctions / settlement
- possibly a minimum count of settled names or distinct bidders, to reduce the
  chance that one large capital source unlocks the wave by itself

Exact thresholds are open. The principle is that the `1-4` namespace should
open only after the system has enough visible usage and bonded commitment for
the auction to be meaningfully public.

## Auction Timing Defaults

The current preferred timing shape is:

- default auction window: about `7 days`
- soft-close extension: about `24 hours`
- max extension cap: still to be implemented / decided
- initial launch period: may use longer windows if awareness is uneven
- short-name wave: later, widely announced, gated by block height plus bonded
  activity, same auction mechanics unless announced otherwise

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

## What Happens To Old Reserved-List Work

The previous auction-list and reserved-list work is now obsolete as launch
machinery.

It may still be useful as research:

- to understand salience
- to pressure-test expected auction demand
- to generate examples for reviewers
- to model speculative behavior

But it should not be used as a protocol-critical launch list.

## What Still Needs Work

The remaining launch-design questions are now narrower:

- exact auction window
- exact soft-close increment
- whether to cap total extension time
- opening-bond floor for `5+` launch names
- opening-bond floor for the later `1-4` short-name wave
- settlement duration after winning an auction
- how auction-opening and bid packages replace the retired direct-claim tooling
- how batching should work for auction openings and bids

This is a much better open-question set than:

> which people, brands, companies, and words deserve special treatment?

## Canonical One-Sentence Summary

ONT uses one market rule for names: eligible names are auctioned, short names
launch later in an objective second wave, and no semantic reserved list decides
who deserves special treatment.
