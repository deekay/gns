# Auction Placeholders And Mechanism Choices

This note exists to separate two things that can easily get blurred together:

- the **mechanism family** we are actually leaning toward
- the **temporary numbers** we are using to test it

Related notes:

- [LAUNCH_SPEC_V0.md](/Users/davidking/dev/gns/docs/research/LAUNCH_SPEC_V0.md)
- [RESERVED_AUCTION_SIMULATOR.md](/Users/davidking/dev/gns/docs/research/RESERVED_AUCTION_SIMULATOR.md)
- [BITCOIN_REVIEW_CLOSURE_MATRIX.md](/Users/davidking/dev/gns/docs/research/BITCOIN_REVIEW_CLOSURE_MATRIX.md)

## Real Mechanism Choices

These are the things we currently mean as real design choices, even if they are
still technically provisional:

- reserved names should not be ordinary-lane first-come-first-served on day one
- reserved names should unlock later and use an open ascending auction
- auctions should have soft close rather than hard-end sniping
- bids that extend an auction during soft close should face a stronger minimum
  increment than ordinary mid-auction bids
- no-bid reserved lots should not remain open forever; they should release back
  to the ordinary lane
- same-bidder rebids should replace earlier bids by spending the earlier bond
  outpoint
- winning bids should carry the eventual owner key
- the current working path is that a settled winner materializes directly into a
  live owned name
- reserved names should be divided into a small number of coarse classes rather
  than bespoke hand-tuned burdens

These are the choices reviewers should spend more time on.

## Placeholder Numbers

These are still temporary and should not be treated as frozen:

- exact class floor amounts
- exact class lock durations
- exact ordinary lock duration
- exact auction window length
- exact no-bid release window length
- exact absolute increment floor
- exact percentage increment floor
- exact soft-close increment strength
- exact reserved-list size
- exact class assignment for every name

These numbers are currently there so we can:

- simulate
- test
- compare shapes
- and reason concretely

not because we believe they are already final.

## How To Read The Current Defaults

The cleanest way to frame the current defaults is:

> the mechanism family is meaningful; the exact numbers are currently
> calibration placeholders.

So if a reviewer says:

- “this window should probably be shorter”
- “that class floor looks too low”
- “this lock duration seems too blunt”

that is useful calibration feedback, but it does not undermine the basic
mechanism choice itself.

## What We Should Present Clearly

For the next review round, we should be explicit:

- the auction *shape* is what we want reviewed now
- the exact numbers are there to make the shape concrete and testable
- we are not pretending those numbers are already the launch constants

That reduces confusion a lot.
