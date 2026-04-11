# Reserved Name Auction Lane

This note captures the design direction that emerged while pressure-testing the premium-overlay work.

It is **not** a final protocol decision yet, but it is now the leading launch candidate and the main working assumption for follow-on design work.

For the current provisional launch defaults gathered in one place, see
[LAUNCH_SPEC_V0.md](./LAUNCH_SPEC_V0.md).

It is a serious alternative worth evaluating alongside:

- [CLAIM_ALLOCATION_AND_BATCHING_OPTIONS.md](./CLAIM_ALLOCATION_AND_BATCHING_OPTIONS.md)
- [ONE_LANE_VS_TWO_LANE_AUCTION_COMPARISON.md](./ONE_LANE_VS_TWO_LANE_AUCTION_COMPARISON.md)
- [SALIENCE_OVERLAY_RATIONALE.md](./SALIENCE_OVERLAY_RATIONALE.md)
- [LAUNCH_PREMIUM_OVERLAY_PIPELINE.md](./LAUNCH_PREMIUM_OVERLAY_PIPELINE.md)

## Core Idea

Instead of trying to hand-price a long list of salient existing names, split launch into two lanes:

- an **ordinary lane** for names not on a reserved list
- a **reserved lane** for names on a broad deferred list, where price is discovered through auction rather than fixed protocol pricing

The ordinary lane can stay simple:

- commit / reveal
- objective floor table
- standardized lock period

The reserved lane would work differently:

- names on the reserved list cannot be claimed immediately at launch
- their availability is deferred until a later pre-announced block height
- when they do unlock, they enter an auction lane instead of ordinary commit / reveal
- the auction sets the required BTC amount
- the protocol fixes the lock duration for that lane

The key shift is:

> the salience list would decide which names enter the auction lane and when, not what each name should cost

## Current Working Assumptions

The current provisional direction is:

- **two-lane launch** as the leading candidate
- **ordinary lane** keeps commit / reveal, a simple objective floor table, and a fixed ordinary lock such as `1 year`
- **ordinary lane** drops or simplifies the current epoch / maturity-halving logic
- **reserved lane** uses open ascending on-chain auctions with soft close
- **reserved lane** fixes the bond lock duration by protocol or reserved class
- **reserved lane** lets bids compete on BTC amount only, not arbitrary BTC-time pairs

## Why This Is Attractive

This addresses several pressures at once.

### 1. It avoids hand-pricing thousands of names

The current overlay work has been useful, but it still pushes us toward:

- score thresholds
- tier assignments
- and eventually per-class pricing judgments

The auction-lane approach moves more of that burden into market discovery.

### 2. It lets the reserve list be broader

If inclusion on the reserved list no longer means:

- "we custom-priced this name"

and instead means:

- "this name is important enough that it should not be given away at the base curve on day one"

then the list can be more extensive without feeling as editorial.

### 3. It uses speculators to remove easy windfalls

This is the biggest philosophical change.

The real operator does **not** need to appear on day one of the auction for the mechanism to work.

If enough speculators believe:

- the name will become important
- the real operator will eventually want it
- and the eventual buyout may be large

then they will compete with each other and bid away much of the easy upside.

That means the auction can price:

- expected future buyout value

not just:

- current end-user demand

### 4. It keeps ordinary names simple

One of the biggest objections to universal auctions is that they make every interesting self-claim contestable.

This two-lane model avoids that.

Ordinary names can still feel like:

- "I saw the name and I can try to get it now"

while reserved names follow a different path because they create a different launch-fairness problem.

## Philosophical Commitments Behind This Model

This direction only makes sense if we accept a few things explicitly.

### 1. It is acceptable for the real operator to buy later from a speculator

The system does **not** need to guarantee that the real operator wins the initial auction.

The system only needs to avoid:

- obvious cheap giveaways
- obviously underpriced hostage opportunities

If a speculator acquires the name but had to bear a serious capital-time cost, that may be a legitimate outcome.

### 2. Speculative market intelligence can be a feature

Under this model, speculation is not only an attack to defend against.

It is also part of the pricing mechanism.

Competing speculators can collectively discover a more credible clearing price for:

- `markzuckerberg`
- `google`
- `taylorswift`

than a fixed protocol table may be able to encode.

### 3. Time does much of the moral and economic work

This only works if the reserved-lane lock is serious.

If the winning bidder only needs to lock capital for a short period, the auction simply becomes a cheap option on future ransom value.

So the reserved lane likely wants:

- a long fixed lock period

for example:

- `10 years`

or another deliberately high commitment window.

## Recommended Shape

The cleanest version of the model currently looks like:

### Ordinary Lane

- for names not on the reserved list
- ordinary commit / reveal
- fixed floor table
- simple standardized lock duration

This lane now appears likely to become simpler than the current epoch-heavy model if this direction is chosen.

The current working assumption is:

- a fixed `1-year` ordinary lock
- and removal or simplification of maturity-era halving logic

This is still provisional, but it is now the main direction being explored.

### Reserved Lane

- broad reserved list prepared before launch
- list announced publicly before launch
- reserved names unavailable during the initial ordinary-claim window
- auctions begin at a later pre-announced block height
- winning auction expresses **BTC amount**
- lock duration is fixed by protocol for the reserved lane

The most important design simplification here is:

- bidders should probably **not** choose both BTC amount and duration

If bidders can choose both, the protocol has to compare:

- `10 BTC for 10 years`
- versus `50 BTC for 1 year`

which forces hidden discount assumptions into consensus.

A cleaner model is:

- protocol sets duration by lane
- auction bids compete on BTC amount

## Floor And Duration Rule

The cleanest current pricing rule for the reserved lane is:

> `reserved_minimum_bid(name, class) = max(ordinary_floor_amount(name), reserved_class_floor_amount(class))`

That means:

- the ordinary base table still matters
- reserved names do **not** ignore objective scarcity pricing
- the reserved class can impose a higher minimum amount when needed

So the ordinary table remains the system's base scarcity floor, while the reserved lane adds stronger treatment only where launch fairness demands it.

Examples:

- a name like `x` may already have a high ordinary floor because it is structurally ultra-scarce, and the reserved class may push the minimum even higher
- a name like `google` may have a trivial ordinary floor relative to its reserved-class floor, so the reserved class dominates
- a name like `tylercowen` may have a small ordinary floor, but still clear a lighter reserved public-identity class floor

The important companion rule is:

- the **amount** floor can inherit from the ordinary table
- the **duration** in the reserved lane should come from the reserved class, not from the ordinary table

So the reserved lane likely uses:

- ordinary table as a lower bound on BTC amount
- reserved class to determine fixed long lock duration
- reserved class to determine any higher minimum BTC amount

## Why A Deferred Start Matters

The deferment is not just operational.

It is part of the fairness story.

It gives:

- reviewers
- brands
- institutions
- public figures
- and speculators

time to understand:

- which names are reserved
- when auctions will start
- and how much commitment the auction lane requires

That makes the launch less like a surprise land rush around the most obvious names.

Possible shapes worth exploring:

- reserved auctions start `25,000` blocks after launch
- reserved auctions start `50,000` blocks after launch
- or another clearly pre-announced interval

The exact number is still open.

## Auction Principles

Before specifying mechanics, the reserved lane should probably commit to a few principles:

1. **Reserved-lane auctions only**
   Ordinary names should stay on the simpler claim path. Auctions are for the deferred reserved lane, not for every name in the namespace.

2. **Auction discovers amount, protocol fixes time**
   Bidders should compete on BTC amount, while the protocol fixes the lock duration for the reserved lane or reserved class.

3. **No hard-close sniping**
   The auction should not end in a way that rewards hidden miner coordination or mempool timing tricks near a single final block.

4. **Bid capital must be real**
   Every standing bid should be backed by an actual on-chain bonded commitment, not just an off-chain signal of intent.

5. **Capital should be reusable within the same auction, not across many auctions**
   A bidder should be able to improve their own bid on one name without being punished for bidding early, but should not be able to cheaply spray the same capital across many hot names at once.

6. **The mechanism should stay understandable**
   A reviewer should be able to understand the auction as: reserved name unlocks, bonded bids compete, late bids extend the clock, highest valid bond wins.

## First-Pass Auction Flow

The current best starting point looks like an **open ascending bonded auction with a soft close**.

### Step 1: Auction Eligibility

- each reserved name becomes auction-eligible at a pre-announced block height
- the first valid bid starts the auction clock for that specific name

### Step 2: Base Auction Window

- once the first bid lands, the auction remains open for a long window
- something like `30 days` in blocks currently feels more credible than a window measured in hours

This is still only a working intuition, not a chosen parameter.

### Step 3: Soft Close

- if a valid higher bid appears near the end of the auction window, the auction extends
- a reasonable first shape is:
  - any valid higher bid in the final `1 day` extends the auction by another `1 day`

That makes the ending feel more like:

- "going, going, gone"

and less like:

- "who got the last hidden transaction to a miner first"

### Step 4: Winner

- once a full extension window passes with no new valid higher bid, the highest bonded bid wins
- the winner receives the name and the long reserved-lane lock begins or continues under the protocol rule

## Bid-Capital Rule

One important refinement is:

> standing bid capital should remain auction-bound, but a bidder must be able to roll their own prior bid upward within the same auction

This avoids two bad outcomes at once:

- bidders should not lose flexibility just because they bid early
- but they also should not be able to withdraw capital freely and reuse it across many still-live auctions

The cleanest current formulation is:

### One Active Bid Per Bidder Per Auction

- each bidder has at most one active bid on a given auctioned name

### Upward Replacement Is Allowed

- a bidder may replace their own standing bid with a higher bid for the same name
- the new bid spends the old bid output and adds only the incremental extra BTC needed

So if a bidder has:

- `1 BTC` already standing on `markzuckerberg`

and wants to move to:

- `15 BTC`

they should only need:

- the original `1 BTC` bid output
- plus `14 BTC` of fresh capital

not:

- `16 BTC` total locked because the old `1 BTC` is trapped separately

### No Mid-Auction Withdrawal

- capital should not be withdrawable from a live auction unless it is being rolled into a higher bid on that same auction

### Losers Unlock After Close

- when the auction ends, losing bidders recover their final standing bonded outputs
- the winner's final standing bid becomes the winning long-duration reserved-lane commitment

## Why This Capital Rule Matters

If losing bids were fully frozen in place with no upward replacement, bidders could be punished for bidding early.

That would distort price discovery by making participants artificially conservative.

If capital were fully withdrawable during the auction, bidders could recycle the same bankroll cheaply across many hot names, weakening the seriousness of live bids.

The current middle path is meant to preserve both:

- real commitment
- and credible upward price discovery

## Minimum Increment Principle

The auction likely also wants a meaningful minimum increment rule.

Otherwise:

- tiny last-minute raises could keep the auction alive cheaply
- and the soft-close extension could become a griefing tool

The exact increment rule is still open, but the principle should be explicit.

## Runaway-Extension Pressure Test

One obvious concern with soft close is:

> could a hot reserved name keep extending indefinitely?

In principle, yes.

But the right protection is probably **not** to force a hard stop at an arbitrary final block.

The better protection is:

- make extensions expensive enough that only genuine continuing price discovery survives

That means the real question is not:

- "can an auction extend for a long time?"

It is:

- "can it extend for a long time **cheaply**?"

### The Bad Version

If the extension rule is too weak, for example:

- any higher bid extends by `1 day`
- minimum increment is only `+1 BTC`

then a hot auction can drag on for a long time without meaningfully changing the price.

That is a real problem.

### The Better Version

A better rule is:

- any higher bid in the final extension window extends the auction
- but the higher bid must beat the current high bid by the greater of:
  - an absolute BTC floor
  - and a percentage increment

Conceptually:

`next_bid >= max(current_bid + abs_floor, current_bid * (1 + pct_floor))`

That makes late extensions materially more expensive as the auction gets larger.

### Why Percentage Matters

Flat increments become too weak for large auctions.

If the current high bid entering soft close is `100 BTC`:

- a fixed `+1 BTC` rule means `30` extra days of extensions only moves the price to `130 BTC`

That is much too cheap for something people still care enough to keep bidding on.

By contrast, if the same auction requires a percentage increment:

- `5%` minimum gets to about `432 BTC` after `30` extension bids
- `8%` minimum gets to about `1,006 BTC`
- `10%` minimum gets to about `1,745 BTC`

Even at a smaller starting point like `10 BTC`:

- `+1 BTC` for `30` extra days only gets to `40 BTC`
- `5%` minimum gets to about `43 BTC`
- `8%` minimum gets to about `101 BTC`
- `10%` minimum gets to about `174 BTC`

The point is not that these exact numbers are right.

The point is that:

- a flat increment allows cheap delay
- a percentage increment makes continued delay increasingly expensive

### Current Working Intuition

The best first defense against runaway extension is probably:

- a `1 day` soft-close extension window
- plus a meaningful minimum increment
- plus auction-bound capital that cannot be freely recycled across many auctions

Under those rules, a very long auction may still happen.

But if it does, it is more likely because:

- real new commitment keeps showing up

not because:

- people can keep the auction alive almost for free

### Hard Cap Caution

A hard cap on the number of extensions may sound attractive, but it risks recreating the very sniping problem soft close is meant to avoid.

If everyone knows:

- "this is the last possible extension"

then the final-extension boundary can become another miner-collusion or timing game.

So the current bias should be:

- prefer economic anti-griefing
- over arbitrary time caps

unless later testing shows the tail-risk is still unacceptable.

## What This Model Solves Better

Compared with a fixed premium overlay, this model may do a better job of:

- avoiding protocol-side hand-pricing of salient names
- using market competition to bid away obvious easy upside
- allowing a broader reserved list without requiring a stronger editorial claim about exact pricing
- keeping ordinary names on a simpler path

## What This Model Still Does Not Solve

It still leaves hard questions.

### 1. The reserve list is still governance

Even if the list no longer sets price, it still decides:

- which names are withheld from the ordinary lane
- and which names must wait for the auction lane

That is still a meaningful protocol choice.

### 2. Auction mechanics still matter a lot

This note intentionally does **not** settle:

- open auction versus sealed bid
- anti-griefing rules
- bid timing
- cancellation or non-reveal handling
- tie-breaking
- or batching design

Those questions need their own treatment.

### 3. Chain footprint may still be high

Auctions could use:

- fewer phases than commit / reveal for some names

but they could also generate:

- many more transactions for hot names

So this should not be assumed to be a blockspace win without deeper design work.

### 4. A very broad reserve list could feel withholding

If too many ordinary-sounding names are put into the reserved lane, users may feel the namespace is artificially gated at launch.

So breadth is a strength, but only up to the point where the launch still feels open and usable.

## Comparison To The Current Premium Overlay Path

| Question | Premium overlay path | Reserved auction lane |
| --- | --- | --- |
| Who sets the price? | protocol-side tiering and calibration | market competition among bidders |
| What does the list decide? | inclusion and approximate price class | inclusion and unlock timing |
| How broad can the list be? | narrower, because pricing claims feel stronger | potentially broader, because inclusion does not imply bespoke pricing |
| Ordinary-name UX | unchanged | unchanged if the reserved lane is isolated cleanly |
| Existing-name fairness story | protocol tries to encode seriousness directly | speculators bid away easy upside under long lock rules |

## Current Working View

This now looks like a genuinely strong alternative, especially if the main philosophical goals are:

- avoid obvious giveaways on existing salient names
- let the market discover how much serious commitment those names require
- keep ordinary names simple
- and avoid pretending the protocol can fairly hand-price thousands of heterogeneous identities

The cost is that we still need:

- a reserve list
- auction mechanics
- and a clear answer for how broad the reserved lane should be

## Next Questions

1. How broad should the reserved list be before launch starts to feel artificially constrained?
2. Should the reserved lane use one fixed lock duration or a small number of reserved classes?
3. Should the ordinary lane keep epochs, or become simpler if this path is chosen?
4. What auction mechanics best fit the fairness goal without creating a mempool knife fight?
5. Can the reserved lane be designed to respect blockspace well enough to be politically credible?
