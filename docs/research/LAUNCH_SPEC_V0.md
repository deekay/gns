# ONT Auction Spec v0

This note is the current best attempt to turn allocation research into a
provisional auction specification.

It is not a final protocol freeze. It is a **working auction spec** for the
direction we are most likely to pursue unless new evidence changes the choice.

Related notes:

- [UNIVERSAL_AUCTION_LAUNCH_MODEL.md](./UNIVERSAL_AUCTION_LAUNCH_MODEL.md)
- [LAUNCH_DIRECTION_STATUS.md](./LAUNCH_DIRECTION_STATUS.md)
- [BITCOIN_EXPERT_REVIEW_PACKET.md](./BITCOIN_EXPERT_REVIEW_PACKET.md)
- [BITCOIN_REVIEW_CLOSURE_MATRIX.md](./BITCOIN_REVIEW_CLOSURE_MATRIX.md)
- [AUCTION_IMPLEMENTATION_GAP_LIST.md](./AUCTION_IMPLEMENTATION_GAP_LIST.md)

## Current Direction

The current allocation rule is simple:

> every valid name is allocated by public bonded auction.

Shorter names can start with higher objective opening floors, but they do not
move into a special wave or alternate process.

## Primary Objectives

The launch design should try to satisfy all of these at once:

1. make allocation neutral and easy to explain
2. avoid subjective reserved-list governance
3. let markets price names when more than one party cares
4. keep normal long-tail acquisition from feeling intimidating when uncontested
5. preserve the bonded-bitcoin model: cost without rent or protocol sales
6. remain credible on blockspace and implementation complexity

## Opening A Name

The opening rule is intentionally simple:

| Name length | Auction treatment |
| --- | --- |
| shorter strings | public auction system, higher opening floor |
| longer strings | public auction system, lower opening floor |

It is a structural scarcity rule. Very short names are uniquely scarce, so they
can require higher objective opening floors without asking ONT to judge which
brands, people, companies, or words matter.

Those floors also make early bulk capture materially expensive before the
market has discovered every name that will eventually matter.

## Auction Flow

For valid names:

1. a participant opens an auction with a bonded bid
2. that opening bid sets the initial leader
3. the auction remains open through the public window
4. later bids must clear the minimum increment
5. bids near the end extend the soft close
6. the highest valid bidder wins
7. the winner owns the name and enters settlement

If nobody submits a valid bonded opening bid, no auction has opened and no
ownership changes.

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
| initial mainnet period | may use longer windows if awareness is uneven |
| valid names | all use the public auction system |

These are mainnet parameters, not final protocol constants yet.

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
- off-chain destination records are signed by the current owner key
- transfers move owner authority later

The exact settlement duration is still a mainnet parameter.

The current bias is to avoid decade-scale Bitcoin-native locks at mainnet. The
public auction model gets much of its fairness from public price discovery,
so it does not need to rely as heavily on very long lock durations.

## Length-Based Opening Floors

Every valid name can be opened by a valid bonded bid.

The opening floor should be:

- pre-announced
- objective
- easy to verify from name length
- higher for shorter strings
- part of the public auction mechanics

The floor curve can still be tuned. The important simplification is that the
auction system handles all valid names, while the length floor supplies
objective scarcity pressure.

## Allocation Guardrails

The allocation model should keep these guardrails:

- no source-generated auction lists as protocol-critical artifacts
- no bespoke classes for brands, identities, or generics

## Implementation Gap List

The main implementation work now is:

- keep public flows auction-opening-first
- update auction policy defaults toward the timing above
- enforce the length-based opening floors
- add or decide a max soft-close extension cap
- decide final settlement duration after winning auction
- update batch/footprint analysis for auction openings and bids
- keep user-facing docs and tools aligned with the public auction model

## Current Status

The repo still contains some internal test and fixture vocabulary for timing
states, but public surfaces should describe the current model directly.

The current allocation sentence is:

> ONT uses one market rule for names: valid names are auctioned, shorter names
> can start with higher objective opening floors, and the auction discovers the
> final bond when more than one participant cares.
