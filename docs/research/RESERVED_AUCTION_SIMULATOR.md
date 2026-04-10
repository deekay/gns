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

## What It Covers

The current simulator models:

- a broad reserved lane with `3` coarse classes
- class-specific floor amounts
- class-specific lock durations
- one opening window for the auction
- soft-close extensions
- a combined absolute-plus-percentage minimum increment rule
- first valid bid behavior
- late-bid rejection after auction close

It does **not** yet model:

- bidder capital reuse across multiple concurrent auctions
- auction-wave timing across many names
- no-bid fallback behavior
- transfer or settlement execution details
- the actual on-chain bid transaction format

That is intentional. The first goal is to test policy behavior and edge cases,
not to pretend the entire reserved-lane protocol is already finalized.

## Current Temporary Default Policy

The current defaults are intentionally coarse and easy to change:

- ordinary lock: `52,560` blocks
- auction window: `4,320` blocks
- soft close extension: `144` blocks
- minimum increment absolute floor: `1,000,000` sats
- minimum increment percentage floor: `500` basis points (`5%`)

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

## Included Sample Scenarios

Current fixture scenarios live in:

- [fixtures/auction/google-competitive.json](/Users/davidking/dev/gns/fixtures/auction/google-competitive.json)
- [fixtures/auction/openai-moderate.json](/Users/davidking/dev/gns/fixtures/auction/openai-moderate.json)
- [fixtures/auction/tylercowen-thin-market.json](/Users/davidking/dev/gns/fixtures/auction/tylercowen-thin-market.json)

These are meant to be illustrative:

- `google-competitive`
  - opening floor pressure
  - minimum increment rejection
  - soft-close extension
  - late bid rejection after close
- `openai-moderate`
  - a competitive but less extreme major-name auction
- `tylercowen-thin-market`
  - a lower-intensity public-identity case

## Why This Exists

The immediate purpose is to make a few questions testable:

- do `3` coarse reserved classes feel better than one universal reserved lane?
- are the default floors obviously too weak or too harsh?
- does soft close behave the way we expect?
- how sensitive are outcomes to the minimum increment rule?
- does a public-identity lane still feel viable under a lighter burden?

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
