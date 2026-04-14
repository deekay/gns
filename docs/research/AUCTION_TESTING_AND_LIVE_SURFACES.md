# Auction Testing And Live Surfaces

This note answers one practical question:

> how much of the auction system is actually tested, and which auction states
> are visible on the live website versus only in fixture-backed examples?

This matters because it is easy to blur together three different things:

- simulator-backed examples
- controlled-chain validation
- live private-signet observations

Related notes:

- [TESTING.md](/Users/davidking/dev/gns/docs/core/TESTING.md)
- [GNS_IMPLEMENTATION_AND_VALIDATION.md](/Users/davidking/dev/gns/docs/research/GNS_IMPLEMENTATION_AND_VALIDATION.md)
- [RESERVED_AUCTION_SIMULATOR.md](/Users/davidking/dev/gns/docs/research/RESERVED_AUCTION_SIMULATOR.md)
- [AUCTION_IMPLEMENTATION_GAP_LIST.md](/Users/davidking/dev/gns/docs/research/AUCTION_IMPLEMENTATION_GAP_LIST.md)

## Short Answer

The auction work is well-tested for its current experimental scope.

We can say with confidence that:

- policy and simulator behavior are tested
- chain-derived experimental auction state is tested
- controlled-chain regtest auction lifecycle coverage is strong
- hosted private-signet auction smoke proves real bid, settlement, winner, and
  release-valve behavior

We should **not** say that the live private chain-derived feed always shows
every auction phase simultaneously.

The correct distinction is:

- the **public website auction lab** shows all major phases through curated
  fixture examples
- the **private signet live feed** proves real observed behavior, but only the
  phases currently present on the live chain at that moment

## What Is Tested

### 1. Core and web package tests

Current local coverage includes:

- auction policy and increment behavior
- fixture-backed single-auction outcomes
- bidder-budget and market-pressure behavior
- state-at-block phase derivation
- chain-derived experimental auction-state derivation from observed
  `AUCTION_BID` transactions
- stale-state rejection
- same-bidder replacement derivation
- derived bond status and spend / release summaries
- settled-winner materialization into a real owned name record
- website loading and rendering of auction fixtures and chain-derived auction
  state

As of this audit, both still pass locally:

- `npm test -w @gns/core`
- `npm test -w @gns/web`

### 2. Controlled-chain regtest

The SSH-backed regtest suite gives the strongest deterministic validation for
auction lifecycle semantics.

It covers:

- opening bid acceptance
- soft-close extension
- settlement into winner / loser bond states
- winner materialization into a live owned name
- winner value publication after settlement
- mature transfer from an auction-owned name
- new-owner value publication after that transfer
- loser release and allowed spend
- winner lock until release and allowed spend

That means we are not relying only on simulator logic for the important auction
state-machine transitions.

### 3. Hosted private-signet smoke

The hosted private-signet auction smoke is the live-chain proof path.

It currently proves:

- one opening `AUCTION_BID`
- one higher `AUCTION_BID`
- one intentionally early losing-bond spend
- settlement into a real owned name
- winner value publication
- post-release transfer
- recipient value publication
- a separate no-bid lot releasing to the ordinary lane
- a deliberately late bid rejected as `released_to_ordinary_lane`

This is the strongest live demo evidence we currently have.

## What The Public Website Shows

The public auction lab at:

- [https://globalnamesystem.org/auctions](https://globalnamesystem.org/auctions)

uses curated fixture cases from `/api/auctions`.

That surface is designed to guarantee visible examples of all major auction
phases in one place.

At the time of this audit, the public lab API includes explicit cases for:

- `pending_unlock`
- `awaiting_opening_bid`
- `live_bidding`
- `soft_close`
- `settled`
- `released_to_ordinary_lane`

This is the right place to say:

> the website visibly demonstrates all major auction phases

because that claim is stable and fixture-backed.

## What The Private Signet Live Feed Shows

The private chain-derived experimental auction feed at:

- [https://globalnamesystem.org/gns-private/api/experimental-auctions](https://globalnamesystem.org/gns-private/api/experimental-auctions)

is different.

It is not a curated full-state gallery. It is a real observed-state feed.

That means the set of visible phases depends on:

- current private chain height
- current dedicated smoke lots
- whether a lot has already been used, settled, or released

At the time of this audit, the private live feed includes:

- real `settled`
- real `released_to_ordinary_lane`
- real `pending_unlock`

It does **not** simultaneously show live examples of:

- `awaiting_opening_bid`
- `live_bidding`
- `soft_close`

even though those phases are covered elsewhere in tests and fixtures.

So the right statement is:

> the private live feed proves real auction behavior, but it is not currently a
> simultaneous gallery of every phase.

## What The Private Auction Smoke Summary Adds

The live private smoke summary at:

- [https://globalnamesystem.org/api/private-auction-smoke-status](https://globalnamesystem.org/api/private-auction-smoke-status)

fills much of that gap.

It gives a real observed end-to-end lifecycle record with:

- opening bid txid
- higher bid txid
- early losing-bond spend
- settled state
- winner-owned name
- winner value record
- post-release transfer
- post-transfer value record
- no-bid release-valve rejection

So while the chain-derived feed does not always hold every phase open at once,
the smoke summary still proves the key live transitions.

## The Honest Public Claim

The clearest accurate wording today is:

> GNS reserved auctions are tested across simulator, package, regtest, and
> hosted private-signet smoke layers. The public auction lab shows all major
> phases through curated fixture cases, while the private signet live feed and
> smoke summary prove real observed auction behavior on the hosted demo chain.

## Remaining Gap

If we want the private live feed itself to act as a simultaneous phase gallery,
we would need additional operational work, for example:

- dedicated long-lived lots parked in awaiting-opening-bid
- dedicated long-lived lots parked in live-bidding or soft-close
- a repeatable reseed cadence that restores those states after smoke runs

That is not a protocol blocker, but it is a real presentation gap if we want
the live chain-derived feed alone to demonstrate every phase.
