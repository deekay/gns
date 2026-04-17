# Reserved Auction Simulator

This note documents the current **experimental simulator** for the reserved
auction lane.

Its job is simple:

- let us plug in temporary numbers
- run realistic bid scenarios
- and learn about auction behavior before we hard-freeze any launch economics

This is not the final on-chain auction implementation.

It is a configurable testing layer for the current launch-spec direction.

Related notes:

- [LAUNCH_SPEC_V0.md](./LAUNCH_SPEC_V0.md)
- [RESERVED_CLASS_OPTIONS.md](./RESERVED_CLASS_OPTIONS.md)
- [RESERVED_NAME_AUCTION_LANE.md](./RESERVED_NAME_AUCTION_LANE.md)
- [AUCTION_IMPLEMENTATION_GAP_LIST.md](./AUCTION_IMPLEMENTATION_GAP_LIST.md)
- [RESERVED_LIST_SCALE_AND_AUCTION_DYNAMICS.md](./RESERVED_LIST_SCALE_AND_AUCTION_DYNAMICS.md)
- [AUCTION_PLACEHOLDERS_AND_MECHANISM_CHOICES.md](./AUCTION_PLACEHOLDERS_AND_MECHANISM_CHOICES.md)

## What It Covers

The current simulator models:

- a broad reserved lane with `3` coarse classes
- class-specific floor amounts
- class-specific lock durations
- one opening window for the auction
- an explicit no-bid release window back to the ordinary lane
- soft-close extensions
- a combined absolute-plus-percentage minimum increment rule
- first valid bid behavior
- late-bid rejection after auction close
- bidder budget constraints across multiple concurrent auctions
- loser-capital release only after auction close
- winner-capital persistence after auction close
- same-auction rebids that only require additional delta capital

It does **not** yet model:

- auction-wave timing across many names
- transfer or settlement execution details
- the real reserved-auction state machine that would accept or reject bid
  transactions on chain

That is intentional. The first goal is to test policy behavior and edge cases,
not to pretend the entire reserved-lane protocol is already finalized.

## Current Temporary Default Policy

The current defaults are intentionally coarse and easy to change:

- ordinary lock: `52,560` blocks
- auction window: `4,320` blocks
- no-bid release window: `4,320` blocks
- soft close extension: `144` blocks
- minimum increment absolute floor: `1,000,000` sats
- minimum increment percentage floor: `500` basis points (`5%`)
- soft-close extension minimum absolute floor: `1,000,000` sats
- soft-close extension minimum percentage floor: `1,000` basis points (`10%`)

Reserved classes:

- `top_collision`
  - floor: `1,000,000,000` sats
  - lock: `525,600` blocks
- `major_existing_name`
  - floor: `200,000,000` sats
  - lock: `262,800` blocks
- `public_identity`
  - floor: `25,000,000` sats
  - lock: `157,680` blocks

These are **stub temporary numbers**. They exist so we can start testing the
mechanics now.

The current closure bias is:

- a normal higher bid must clear the ordinary increment rule
- a bid that would extend the auction during soft close must clear the
  stronger soft-close increment rule

So late extensions do not just add time. They also demand a larger price move.

## Current CLI Surface

Emit the default policy:

```bash
npm run dev:cli -- print-reserved-auction-policy
```

Save a copy you can edit:

```bash
npm run dev:cli -- print-reserved-auction-policy --write /tmp/reserved-policy.json
```

Run a scenario with the default policy:

```bash
npm run dev:cli -- simulate-reserved-auction fixtures/auction/google-competitive.json
```

Run a scenario with an edited policy override:

```bash
npm run dev:cli -- simulate-reserved-auction fixtures/auction/tylercowen-thin-market.json --policy /tmp/reserved-policy.json
```

Run a concurrent-auction market scenario with bidder budgets:

```bash
npm run dev:cli -- simulate-reserved-auction-market fixtures/auction/market-capital-pressure.json
```

Create an experimental bid package from a lab case:

```bash
npm run dev:cli -- create-auction-bid-package fixtures/auction/lab/04-soft-close-google.json --bidder-id operator_alpha --amount-sats 1700000000 --write /tmp/ont-auction-bid-package.json
```

Turn that package into signable experimental bid artifacts:

```bash
npm run dev:cli -- build-auction-bid-artifacts /tmp/ont-auction-bid-package.json --input <txid:vout:valueSats:address> --fee-sats 100000 --bond-address <address> --change-address <address> --write /tmp/ont-auction-bid-artifacts.json
```

Sign the experimental bid artifacts:

```bash
npm run dev:cli -- sign-artifacts /tmp/ont-auction-bid-artifacts.json --wif <wif> --write /tmp/ont-signed-auction-bid-artifacts.json
```

## Current Website Surface

The experimental simulator is also exposed through the website now:

- local/dev path: `/auctions`
- API payload: `/api/auctions`
- bid-package export: `/api/auction-bid-package`

That page renders a curated set of stateful fixtures so we can inspect:

- pending unlock
- awaiting opening bid
- released to ordinary lane
- live bidding
- soft close
- settled winner
- and download an experimental bid package for any displayed state

So the current public surface is:

- simulator-backed state inspection on the website
- one focused website override for `noBidReleaseBlocks`, so we can re-simulate
  the release window directly from `/auctions`
- bid-package handoff on the website
- bid-artifact building/signing in CLI

It is not yet a live bidder surface tied to registry-backed auction state.

Importantly, the website is not using a separate mock.

It is reading the same simulator-backed fixture data that the test suite uses.

## Included Sample Scenarios

Current fixture scenarios live in:

- [fixtures/auction/google-competitive.json](/Users/davidking/dev/gns/fixtures/auction/google-competitive.json)
- [fixtures/auction/openai-moderate.json](/Users/davidking/dev/gns/fixtures/auction/openai-moderate.json)
- [fixtures/auction/tylercowen-thin-market.json](/Users/davidking/dev/gns/fixtures/auction/tylercowen-thin-market.json)
- [fixtures/auction/no-bids.json](/Users/davidking/dev/gns/fixtures/auction/no-bids.json)
- [fixtures/auction/underfloor-major-name.json](/Users/davidking/dev/gns/fixtures/auction/underfloor-major-name.json)
- [fixtures/auction/soft-close-tail.json](/Users/davidking/dev/gns/fixtures/auction/soft-close-tail.json)
- [fixtures/auction/market-capital-pressure.json](/Users/davidking/dev/gns/fixtures/auction/market-capital-pressure.json)
- [fixtures/auction/market-winner-locks-capital.json](/Users/davidking/dev/gns/fixtures/auction/market-winner-locks-capital.json)
- [fixtures/auction/market-self-raise-delta.json](/Users/davidking/dev/gns/fixtures/auction/market-self-raise-delta.json)

These are meant to be illustrative:

- `google-competitive`
  - opening floor pressure
  - minimum increment rejection
  - soft-close extension
  - stronger late-bid escalation once the extension window is active
  - late bid rejection after close
- `openai-moderate`
  - a competitive but less extreme major-name auction
- `tylercowen-thin-market`
  - a lower-intensity public-identity case
- `no-bids`
  - reserved name unlocks and attracts no demand at all
- `underfloor-major-name`
  - repeated attempts fail to clear the opening minimum
- `soft-close-tail`
  - a live auction keeps extending because meaningful late bids keep arriving
- `market-capital-pressure`
  - cross-auction bidding pressure when one bidder tries to chase more than one name
- `market-winner-locks-capital`
  - confirms that capital stays tied up after a winning auction closes
- `market-self-raise-delta`
  - confirms that a bidder can roll their own earlier bid upward using only incremental capital

Each fixture now also carries an explicit `expected` section so the core test
suite can lock the intended behavior in place.

The website-facing auction lab fixtures live separately in:

- [fixtures/auction/lab/01-pending-unlock-google.json](/Users/davidking/dev/gns/fixtures/auction/lab/01-pending-unlock-google.json)
- [fixtures/auction/lab/02-awaiting-opening-sequoia.json](/Users/davidking/dev/gns/fixtures/auction/lab/02-awaiting-opening-sequoia.json)
- [fixtures/auction/lab/03-live-bidding-openai.json](/Users/davidking/dev/gns/fixtures/auction/lab/03-live-bidding-openai.json)
- [fixtures/auction/lab/04-soft-close-google.json](/Users/davidking/dev/gns/fixtures/auction/lab/04-soft-close-google.json)
- [fixtures/auction/lab/05-settled-openai.json](/Users/davidking/dev/gns/fixtures/auction/lab/05-settled-openai.json)
- [fixtures/auction/lab/06-released-sequoia.json](/Users/davidking/dev/gns/fixtures/auction/lab/06-released-sequoia.json)

These are intentionally curated around visible auction phases rather than only
final outcomes.

## Why This Exists

The immediate purpose is to make a few questions testable:

- do `3` coarse reserved classes feel better than one universal reserved lane?
- are the default floors obviously too weak or too harsh?
- does soft close behave the way we expect?
- does the no-bid release valve feel too eager or too lax?
- how sensitive are outcomes to the minimum increment rule?
- does the stronger soft-close increment create enough closure pressure without
  making legitimate late bidding feel too brittle?
- does a public-identity lane still feel viable under a lighter burden?
- how much do early winners constrain later bidding by the same actors?
- does losing-capital release timing materially affect later reserved waves?

This gives us a place to learn without hardcoding the economic policy all over
the codebase.

## Current Recommendation

The right use of this simulator is:

- change policy numbers freely
- add scenario fixtures aggressively
- look for awkward outcomes
- only then narrow toward a more stable launch configuration

So for now, the important thing is not whether these specific numbers are
correct.

It is whether the simulator is good enough to help us decide what the right
numbers and class shapes should be.

For a short synthesis of what the current scenarios suggest about thin early
participation and price discovery, see:

- [RESERVED_LIST_SCALE_AND_AUCTION_DYNAMICS.md](/Users/davidking/dev/gns/docs/research/RESERVED_LIST_SCALE_AND_AUCTION_DYNAMICS.md)
