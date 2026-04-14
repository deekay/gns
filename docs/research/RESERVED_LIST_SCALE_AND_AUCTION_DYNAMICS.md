# Reserved List Scale And Auction Dynamics

This note answers two practical questions we should be able to discuss
plainly before asking for outside technical review:

1. roughly how big might the reserved list be?
2. what do we think early auction price discovery will look like if
   participation is limited?

Related notes:

- [RESERVED_LIST_GENERATION_METHOD.md](/Users/davidking/dev/gns/docs/research/RESERVED_LIST_GENERATION_METHOD.md)
- [RESERVED_AUCTION_SIMULATOR.md](/Users/davidking/dev/gns/docs/research/RESERVED_AUCTION_SIMULATOR.md)
- [LAUNCH_SPEC_V0.md](/Users/davidking/dev/gns/docs/research/LAUNCH_SPEC_V0.md)
- [ONE_LANE_VS_TWO_LANE_AUCTION_COMPARISON.md](/Users/davidking/dev/gns/docs/research/ONE_LANE_VS_TWO_LANE_AUCTION_COMPARISON.md)

## Short Answer

The current working direction is:

- not `~1,000`
- not `~1,000,000`
- and definitely not `~10,000,000`

The most plausible launch-scale range today looks more like:

- **tens of thousands to low hundreds of thousands**
- plausibly **30,000 to 150,000** names

That is still provisional, but it is a much more concrete order of magnitude.

## Why Not Only A Few Hundred Or A Thousand?

That is too narrow if the goal is to prevent obviously wrong launch outcomes.

A very small list catches only:

- the most famous global brands
- the most obvious web destinations
- a tiny number of public figures

It misses a large number of names that still have:

- one dominant real-world referent
- one obvious natural buyer
- hostage / resale asymmetry
- trust-sensitive user expectations

So a list in the low thousands is probably too small if we actually mean:

> reserve the names where cheap day-one capture would feel obviously wrong.

## Why Not Millions?

A launch list in the millions starts to look wrong for a different reason.

It implies:

- too much editorial reach
- too much governance burden
- too much capital and attention spread across too many auctions
- too many lots that probably have weak or nonexistent early bidder demand

Even if auction pricing prevents obvious giveaways, millions of reserved names
would likely make the system feel over-governed and thinly traded.

That is especially hard to defend before the market is deep.

## Why Tens Of Thousands To Low Hundreds Of Thousands Feels Plausible

That range is large enough to cover:

- major consumer and institutional names
- strong operator / public-identity names
- obvious natural-buyer names that would create cheap hostage dynamics

But it is still small enough to remain:

- describable
- auditable
- challengeable
- and economically legible

It also fits the current class structure better:

- top-collision / ultra-scarce
- major existing name
- public identity / operator

The important thing is that this range is not being presented as
mathematically exact. It is the current best estimate of a *defensible launch
order of magnitude*.

## Current Recommendation On Scale

The most defensible current wording is:

> we expect the reserved set to be on the order of tens of thousands to low
> hundreds of thousands of names, not merely a few hundred, and not millions.

If we want a sharper working guess for internal planning, a reasonable center
of gravity today is something like:

- **30,000 to 150,000**

with the final number mostly driven by how broad the public-identity category
becomes.

## What The Simulator Suggests About Price Discovery

The current simulator is useful for *directional* insight, not prediction.

It suggests that early launch auctions will not behave uniformly.

### 1. Top-collision names can get meaningful bidding

Example:

- [google-competitive.json](/Users/davidking/dev/gns/fixtures/auction/google-competitive.json)

Under the current temporary policy:

- opening floor: `1,000,000,000` sats
- accepted late bids push the winner to `1,210,000,000` sats
- soft close extends twice
- weaker late bid attempts are rejected

That is the kind of case where an auction is doing real work.

### 2. Thin public-identity names often clear at or near the floor

Example:

- [tylercowen-thin-market.json](/Users/davidking/dev/gns/fixtures/auction/tylercowen-thin-market.json)

Under the current temporary policy:

- opening floor: `25,000,000` sats
- below-floor attempt is rejected
- one bidder clears the floor and wins there

That is a useful reminder:

> in thin early markets, many reserved names will not get beautifully
> efficient price discovery.

They will often:

- clear at the opening floor
- or get no bid and fall back

### 3. Capital lock can distort simultaneous price discovery

Example:

- [market-capital-pressure.json](/Users/davidking/dev/gns/fixtures/auction/market-capital-pressure.json)

In that scenario:

- one bidder locks `200,000,000` sats in `openai`
- then cannot chase `tylercowen` because their remaining budget is too small
- a different bidder wins the thinner lot at the opening floor
- the first bidder re-enters only later, once capital pressure relaxes

That is important because it means:

> early auction prices may be locally informative without being globally
> efficient.

In other words, a price may reflect:

- who had attention
- who had liquid capital at that moment
- what other lots were open simultaneously

not just intrinsic demand for the name in the abstract.

## What This Means For Launch Design

The design implication is not:

> auctions are bad

The implication is:

> auctions should be used to avoid obviously wrong underpricing, not to pretend
> we will discover a perfect market-clearing BTC amount for every reserved name
> on day one.

That favors:

- a bounded reserved list
- coarse classes
- strong floors
- no-bid release valves
- and probably some wave discipline rather than exposing an enormous long tail
  all at once

## What This Means For Reviewer Framing

When we talk to technically sophisticated reviewers, the clean way to say this
is:

- we do not expect perfect efficiency across the whole reserved set
- we do expect auctions to work well for the most salient names
- we expect thinner names to clear near floors or release back
- and that is acceptable, because the launch goal is to avoid obviously wrong
  allocations, not to run a perfectly efficient global name market on day one

That is a much more credible claim than pretending all reserved names will be
priced perfectly immediately.
