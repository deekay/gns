# ONT Allocation Direction Status

This note captures the current allocation direction in one place.

It is not a final protocol freeze. It is the current working posture for the
allocation model.

Related notes:

- [UNIVERSAL_AUCTION_LAUNCH_MODEL.md](./UNIVERSAL_AUCTION_LAUNCH_MODEL.md)
- [LAUNCH_SPEC_V0.md](./LAUNCH_SPEC_V0.md)
- [AUCTION_IMPLEMENTATION_GAP_LIST.md](./AUCTION_IMPLEMENTATION_GAP_LIST.md)
- [POST_QUANTUM_AND_SIGNATURE_AGILITY.md](./POST_QUANTUM_AND_SIGNATURE_AGILITY.md)
- [REVIEW_FEEDBACK_BACKLOG.md](./REVIEW_FEEDBACK_BACKLOG.md)

## Current Direction

The current allocation direction is:

- public bonded auctions
- all valid names can be opened with a valid bonded bid
- shorter names have higher fixed objective opening floors

The core rule is:

> every valid name is allocated by auction.

This keeps ONT out of deciding which brands, people, companies, words, or
handles deserve special protocol treatment.

## Why This Shape Works

The launch problem is real:

- obvious names should not be cheaply captured before natural buyers notice ONT

Universal auctions with length floors make the allocation rule neutral:

- if nobody else cares, the opener likely wins cheaply
- if others care, the market discovers that price
- shorter names have higher objective opening floors
- early bulk capture of scarce names is materially expensive

## What Feels Stable Now

### 1. Public Auctions Are The Allocation Rule

The clean allocation story is:

> names are scarce, so names are auctioned.

The same rule applies whether the name looks like a brand, a generic word, a
personal handle, or a long-tail string.

### 2. Short Names Use Objective Floors

Keeping shorter names in the public auction system avoids arbitrary launch
boundaries.

The scarcity pressure should come from an objective length-based opening floor.

Current lean:

- every valid name can be opened by a valid bonded bid
- shorter strings have higher fixed opening floors
- one process for all names

### 4. Griefing Looks Less Central Than Before

Small-name griefing is still possible, but it is probably not the main design
constraint.

If ONT works, rational speculators have better opportunities:

- obvious brands
- obvious generics
- scarce short names with higher opening floors
- names with visible demand

That makes neutrality and objective floors more important than hand-curated
exceptions.

## Current Working Architecture

| Surface | Current lean |
| --- | --- |
| valid names | public bonded auctions |
| shorter strings | higher length-based opening floors |
| allocation | open auction for every valid name |
| opening experience | user opens with bonded bid; uncontested names should feel like simple auctions |
| pricing | auction-discovered BTC amount |
| minimum floor | objective opening-bond floor, still to finalize |
| auction window | about `7 days` by default |
| soft close | about `24 hours` extension |
| extension cap | open, likely needed |
| settlement | winning bid becomes name ownership after settlement requirements |

## What Still Needs Work

The model still leaves real protocol and product questions:

- exact auction window
- exact increment rules
- max soft-close extension cap
- length-based opening-bond floor curve
- settlement duration for auction winners
- how to keep public tooling auction-opening-first
- how auction openings and bids should be batched for blockspace efficiency
- how to present uncontested auctions so normal users understand the low-drama
  path without thinking ONT is selling names

## Current Best Summary

ONT should use one market rule for names.

Valid names are auctioned. Shorter names can have higher fixed objective
opening floors. The auction discovers the final bond when more than one
participant cares.
