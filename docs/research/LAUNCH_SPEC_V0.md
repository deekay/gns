# ONT Launch Spec v0

This note is the current best attempt to turn launch research into a provisional
specification.

It is not a final protocol freeze. It is a **working launch spec** for the
direction we are most likely to pursue unless new evidence changes the choice.

Related notes:

- [UNIVERSAL_AUCTION_LAUNCH_MODEL.md](./UNIVERSAL_AUCTION_LAUNCH_MODEL.md)
- [LAUNCH_DIRECTION_STATUS.md](./LAUNCH_DIRECTION_STATUS.md)
- [BITCOIN_EXPERT_REVIEW_PACKET.md](./BITCOIN_EXPERT_REVIEW_PACKET.md)
- [BITCOIN_REVIEW_CLOSURE_MATRIX.md](./BITCOIN_REVIEW_CLOSURE_MATRIX.md)
- [AUCTION_IMPLEMENTATION_GAP_LIST.md](./AUCTION_IMPLEMENTATION_GAP_LIST.md)

## Current Lead Direction

The leading launch candidate is now a **single auction lane**.

The intended rule is:

> every launch-eligible name is allocated by auction.

That means:

- no ordinary direct-allocation lane
- no reserved-name lane
- no semantic reserved-name list
- no pre-launch reservation system
- no editorial distinction between brands, public figures, generic words, and
  ordinary names
- `1-4` character names held for a later short-name wave

## Primary Objectives

The launch design should try to satisfy all of these at once:

1. make allocation neutral and easy to explain
2. avoid subjective reserved-list governance
3. let markets price names when more than one party cares
4. keep normal long-tail acquisition from feeling intimidating when uncontested
5. preserve the bonded-bitcoin model: cost without rent or protocol sales
6. remain credible on blockspace and implementation complexity

## Eligibility At Launch

The launch split is objective:

| Name length | Launch treatment |
| --- | --- |
| `1-4` characters | held for a later short-name auction wave |
| `5-32` characters | eligible for the launch auction lane |

This is not a reserved list.

It is a structural scarcity rule. Very short names are uniquely scarce, so they
should not clear before ONT has enough public attention.

## Auction Flow

For names eligible at launch:

1. a participant opens an auction with a bonded bid
2. that opening bid sets the initial leader
3. the auction remains open through the public window
4. later bids must clear the minimum increment
5. bids near the end extend the soft close
6. the highest valid bidder wins
7. the winner owns the name and enters settlement
8. if no valid bid exists, the name remains without an owner

The product should frame an uncontested auction simply:

> Start an auction. If nobody else bids during the window, you win at your opening
> bid. If others care, the auction discovers the price.

## Auction Defaults

Current preferred defaults:

| Parameter | Current lean |
| --- | --- |
| default auction window | about `7 days` |
| soft-close extension | about `24 hours` |
| minimum increment | absolute floor plus percentage increment |
| soft-close increment | stronger than normal mid-auction increment |
| max extension cap | open, likely needed |
| initial launch period | may use longer windows if awareness is uneven |
| short-name wave | later, widely announced, same auction mechanics |

These are launch parameters, not final protocol constants yet.

## Pricing And Bonds

The auction discovers the price.

Length should not be treated as a value oracle. A short random string can be
less valuable than a longer obvious name.

Length may still be useful as an objective opening-bond / anti-spam floor.

Working direction:

- winning bids are bonded bitcoin, not fees paid to ONT
- the winner keeps the bitcoin in self-custody during settlement
- the real cost is liquidity, time, and opportunity cost
- normal Bitcoin transaction fees still apply
- ONT does not sell names, burn bids, or collect annual rent

## Settlement

Winning an auction should produce normal ONT ownership:

- the winning bid carries the owner key that should control the name
- the name becomes usable after settlement requirements are met
- off-chain value records are signed by the current owner key
- transfers move owner authority later

The exact settlement duration is still a launch parameter.

The current bias is to avoid decade-scale Bitcoin-native locks at launch. The
universal auction model gets much of its fairness from public price discovery,
so it does not need to rely as heavily on very long lock durations.

## Short-Name Second Wave

Names of length `1-4` are held out of the initial launch.

The later wave should be:

- public
- pre-announced
- objective
- open to all bidders
- using the same auction mechanics as the launch lane unless a specific
  objective short-name parameter is announced in advance

The current preferred boundary is `1-4`, not `1-5`.

Reason:

- `1-4` captures structural scarcity
- `5` starts including many normal names, first names, brands, and handles

## What The Spec Drops

This launch model drops:

- semantic reserved-name lists
- source-generated auction lists as protocol-critical artifacts
- pre-launch proof/reservation systems
- ordinary-vs-reserved allocation treatment
- no-bid fallback from auction into a separate ordinary direct-allocation lane
- bespoke reserved classes for brands, identities, and generics

The previous source-list work can remain useful for research and examples, but
it is no longer the allocation mechanism.

## Implementation Gap List

The main implementation work now is:

- keep retiring old direct-claim code paths in favor of auction-opening-first flows
- update auction policy defaults toward the launch timing above
- enforce the `1-4` short-name wave gate
- add or decide a max soft-close extension cap
- decide final settlement duration after winning auction
- update batch/footprint analysis for auction openings and bids
- remove old list-based launch language from user-facing docs and tools
- remove remaining legacy direct-claim implementation details that are no longer
  needed for auction-opening-first flows

## Current Status

The repo still contains a few legacy internal type names in code and fixtures.

Those should now be read as implementation history unless a document explicitly
points back to this launch spec.

The current lead launch sentence is:

> ONT uses one market rule for names: eligible names are auctioned, short names
> launch later in an objective second wave, and no semantic reserved list
> decides who deserves special treatment.
