# Two-Lane Launch One-Pager

This note summarizes a launch structure now under active exploration for GNS.

It is **not** a final protocol decision. The point is to share the philosophy, the mechanism split, and the current calibration intuition in a compact form.

## Core Idea

Split launch into two lanes:

- **ordinary lane** for names not on a reserved list
- **reserved lane** for a broad deferred list of salient existing names

The ordinary lane stays simple:

- commit / reveal
- objective floor table
- standardized lock period

The reserved lane works differently:

- reserved names do not open on launch day
- they unlock later at a pre-announced block height
- they enter an auction lane instead of ordinary commit / reveal
- the market discovers the BTC amount
- the protocol fixes the lock duration

The key idea is that the reserve list decides **which names are special** and **when they unlock**, not **what each one should cost**.

## Why Explore This

The strongest fairness objection is not:

- can someone corner the whole namespace?

It is:

- can someone cheaply lock up the top slice of names people most care about?

This two-lane model tries to answer that without turning every name claim into an auction.

It relies on a specific philosophical stance:

- it is acceptable if the real operator acquires the name later from a speculator
- as long as the speculator had to bear a serious capital-time cost

Under that view, speculative competition is not only an attack to prevent. It is also a way to bid away obvious free money.

## Lane 1: Ordinary Names

For names outside the reserved list:

- simple claim path
- objective pricing
- predictable user experience
- closer to DNS-style first-come registration

This lane is meant to remain easy, legible, and usable for ordinary people and long-tail names, potentially under a simpler standardized ordinary lock such as `1 year`.

## Lane 2: Reserved Names

For names on the reserved list:

- broad list announced before launch
- names withheld from the ordinary lane
- auctions start later at known block heights
- the auction sets BTC amount
- the protocol fixes a long lock duration

This lets the reserve list be broader than a hand-priced premium table, because inclusion no longer means:

- “we custom-priced this name”

It only means:

- “this name is important enough that it should not be given away at the base curve on day one”

## Auction Dynamics Under Discussion

Current starting point:

- on-chain auction for reserved names only
- open ascending bonded bids
- long base auction window, likely measured in weeks rather than hours
- soft close so late bids extend the clock
- one active bid per bidder per auction
- a bidder can roll their own earlier bid upward by spending the old bid output and adding only the difference
- losing bids unlock after close

Two key principles matter:

1. **auction discovers amount; protocol fixes time**
   Bidders compete on BTC amount, not arbitrary BTC-time pairs.

2. **soft close plus meaningful minimum increment**
   The goal is to stop cheap end-sniping and cheap runaway extensions.

The right protection is not necessarily a hard stop. It is making continued extension economically meaningful.

## Why Soft Close

A hard final block invites last-minute sniping and miner-timing games.

A soft close is closer to:

- going, going, gone

If a higher bid arrives late, the auction extends and others get time to respond.

That reduces the value of hidden last-second transaction tactics.

## Illustrative Capital-Time Starting Points

These are only working calibration anchors, not final protocol values.

| Bucket | Illustrative starting point | Why it exists |
| --- | ---: | --- |
| Ordinary lower floor | simple claim path, e.g. `~1 BTC for 1 year` at the top of the ordinary table | preserves easy objective pricing for non-reserved names |
| Reserved `B` | `50 BTC for 5 years` | meaningful but still accessible reserved-name commitment |
| Reserved `A` | `100 BTC for 10 years` | strong commitment for serious existing names |
| Reserved `S` | `250 BTC for 10 years` | starts to feel genuinely painful for a squatter |
| Reserved `S+` | `500 BTC for 10 years` | only for a very small top bucket, if needed |

For public full-name operator identities, the current rough intuition is:

- `markzuckerberg`, `jensenhuang`, `samaltman` feel closer to `A`
- `patrickcollison`, `parkerconrad`, `garrytan` feel closer to `B`
- `tylercowen`, `paulgraham` look more like review-edge or lighter public-identity cases

## Main Advantages

- ordinary names stay simple
- salient names are not given away cheaply
- the market can discover pricing instead of the protocol hardcoding thousands of valuations
- speculators can compete away easy upside even if the natural operator is absent at first

## Main Open Questions

- how broad should the reserved list be, and should it open all at once or in waves?
- what fixed long duration should the reserved lane use?
- what minimum increment rule prevents cheap endless extensions without making auctions brittle?
- can the auction lane be made politically credible on blockspace usage?
