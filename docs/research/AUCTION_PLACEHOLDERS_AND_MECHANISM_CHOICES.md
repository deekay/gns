# Auction Placeholders And Mechanism Choices

This note separates two things that can easily get blurred together:

- the **mechanism family** we are leaning toward
- the **temporary numbers** we are using to test it

Related notes:

- [LAUNCH_SPEC_V0.md](./LAUNCH_SPEC_V0.md)
- [UNIVERSAL_AUCTION_LAUNCH_MODEL.md](./UNIVERSAL_AUCTION_LAUNCH_MODEL.md)
- [BITCOIN_REVIEW_CLOSURE_MATRIX.md](./BITCOIN_REVIEW_CLOSURE_MATRIX.md)

## Real Mechanism Choices

These are the things we currently mean as real design choices, even if they are
still technically provisional:

- valid names should be allocated by auction
- shorter names should use higher length-based opening floors
- ONT should not use semantic allocation classes
- ONT should start names through bonded public auctions
- auctions should have soft close rather than hard-end sniping
- bids that extend an auction during soft close should face a stronger minimum
  increment than ordinary mid-auction bids
- the current user-started launch story should not describe unopened names as
  failed auctions; a valid bonded opening bid is what creates the auction
- same-bidder rebids should replace earlier bids by spending the earlier bond
  outpoint
- winning bids should carry the eventual owner key
- the current working path is that a settled winner materializes directly into
  a live owned name

These are the choices reviewers should spend more time on.

## Placeholder Numbers

These are still temporary and should not be treated as frozen:

- exact opening-bond floors
- exact winner settlement duration
- exact auction window length
- exact absolute increment floor
- exact percentage increment floor
- exact soft-close increment strength
- exact soft-close extension cap
- final length-based floor curve

These numbers are currently there so we can:

- simulate
- test
- compare shapes
- reason concretely

They are not final launch constants.

## How To Read The Current Defaults

The cleanest way to frame the current defaults is:

> the mechanism family is meaningful; the exact numbers are calibration
> placeholders.

So if a reviewer says:

- “this window should probably be shorter”
- “that opening floor looks too low”
- “this settlement duration seems too blunt”

that is useful calibration feedback, but it does not undermine the basic
mechanism choice itself.

## What We Should Present Clearly

For the next review round, we should be explicit:

- the auction *shape* is what we want reviewed now
- the exact numbers are there to make the shape concrete and testable
- we are not pretending those numbers are already the launch constants

That reduces confusion a lot.
