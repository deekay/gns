# GNS Bitcoin Expert One-Pager

This is the shortest review-oriented summary of GNS we should be comfortable
sharing with technically sophisticated Bitcoin reviewers.

Related notes:

- [BITCOIN_EXPERT_REVIEW_PACKET.md](/Users/davidking/dev/gns/docs/research/BITCOIN_EXPERT_REVIEW_PACKET.md)
- [BITCOIN_PROTOCOL_REVIEW_QUESTIONS.md](/Users/davidking/dev/gns/docs/research/BITCOIN_PROTOCOL_REVIEW_QUESTIONS.md)
- [GNS_IMPLEMENTATION_AND_VALIDATION.md](/Users/davidking/dev/gns/docs/research/GNS_IMPLEMENTATION_AND_VALIDATION.md)
- [RESERVED_LIST_SCALE_AND_AUCTION_DYNAMICS.md](/Users/davidking/dev/gns/docs/research/RESERVED_LIST_SCALE_AND_AUCTION_DYNAMICS.md)
- [AUCTION_PLACEHOLDERS_AND_MECHANISM_CHOICES.md](/Users/davidking/dev/gns/docs/research/AUCTION_PLACEHOLDERS_AND_MECHANISM_CHOICES.md)

## What GNS Is For

GNS is a Bitcoin-anchored human-readable naming system.

The narrowest and most useful framing is:

> use a human-readable name to say who gets paid or which counterparty or
> service you trust.

This is why the project should be read as:

- payments first
- counterparties and services second
- broader key/value publishing later

## Core Design

GNS separates:

- on-chain ownership
- off-chain mutable value records

Bitcoin is used as the ownership and transfer notary, not as the place where
all mutable data lives.

The ordinary lifecycle is:

1. commit
2. reveal
3. settlement / continuity rules
4. later transfer and owner-signed value updates

Claims use bonded bitcoin rather than annual rent:

- the claimant locks bitcoin they still own
- scarcity comes from capital commitment and time
- the protocol is not trying to sell names directly

## Current Lead Architecture

The current lead launch direction is a **two-lane** model.

### Ordinary lane

- ordinary names
- commit / reveal
- objective floor table
- fixed ordinary lock
- explicit Merkle batching as the current footprint optimization path

### Reserved lane

- salient existing names
- deferred unlock
- open ascending auction
- soft close
- stronger late-extension increment rule
- no-bid release valve back to the ordinary lane
- longer lock durations than ordinary names

## Reserved List Scope

The current direction is **not** a list of only a few hundred names, and it is
also **not** a list of millions or tens of millions of words.

The current working expectation is:

- probably **tens of thousands to low hundreds of thousands**
- plausibly something like **30,000 to 150,000** depending on how broad the
  public-identity category becomes

Why:

- a few hundred or a thousand names is too narrow and misses many obvious
  hostage-risk / trust-sensitive names
- millions is too broad, too editorial, and likely too thin for early auction
  participation to price well

So the rough direction is:

> broad enough to cover obvious dominant referents and hostage-risk names, but
> still bounded enough that launch auctions remain legible and capital is not
> spread absurdly thin.

## What Is Implemented Today

This is already more than a whitepaper.

Implemented and validated today:

- ordinary claim commit / reveal flow
- resolver and website
- owner-signed value records
- transfer prototype
- explicit ordinary-lane Merkle batching
- experimental reserved-auction stack with real bid transactions, chain-derived
  state, winner materialization into owned names, regtest coverage, and hosted
  private-signet proof paths

The current live demo environments are:

- `regtest` for exhaustive controlled-chain testing
- `private signet` for hosted live demos and smoke evidence

## Merkle Batching: Current Position

The current mainline batching path is:

- ordinary lane only
- one batch anchor can commit many claims
- each name is later revealed individually against the anchored Merkle root
- each leaf binds to its own dedicated bond output

This means batching is:

- an efficiency improvement
- not the scarcity mechanism
- not transfer batching

The main scaling limit is no longer the Merkle anchor itself.

The current bottleneck is reveal-proof carriage:

- explicit proof outputs are simple and auditable
- but they become less efficient as batches grow

Taproot annex is now a credible research lane, but it is still not the
baseline because it weakens wallet compatibility and adds custom witness-aware
tooling complexity.

## Auction Dynamics: Current Read

The simulator and experimental auction stack suggest a simple pattern:

- top-collision names can get meaningful bidding and late extensions
- thinner public-identity names often clear at the opening floor or see no bid
- capital lock can materially prevent one bidder from chasing multiple names at
  once
- the no-bid release valve matters because early price discovery will not be
  efficient for the whole long tail

So the launch objective should not be:

> perfectly price every reserved name on day one

It should be:

- avoid obviously wrong underpricing for salient names
- let competitive names discover higher BTC amounts
- let thin or ignored names fall back instead of lingering forever

## Main Trade-Offs

The current lead recommendation remains:

- keep the **two-lane** model
- keep **explicit Merkle batching** as the ordinary-lane baseline
- keep **annex** as a research upgrade path, not a launch dependency

The main alternatives we are still taking seriously are:

- one-lane universal auction for everything
- annex-based reveal proof carriage for larger-batch efficiency

## What We Want Bitcoin Experts To Push On

The best current questions are:

1. Is the explicit ordinary-lane batching path disciplined and reasonable?
2. Is the explicit-reveal-carrier baseline a sane place to start?
3. Does the annex path look like a credible future optimization, or an awkward
   use of Taproot?
4. Is the current auction transaction / settlement shape coherent?
5. Are there obvious Bitcoin-native concerns around policy, relay, footprint,
   or state-machine complexity that we are missing?

That is the review ask.

We are **not** asking Bitcoin protocol experts to settle every launch-policy
question immediately.
