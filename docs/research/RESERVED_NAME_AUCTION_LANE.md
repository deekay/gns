# Reserved Name Auction Lane

This note captures a new design direction that emerged while pressure-testing the premium-overlay work.

It is **not** the chosen launch design yet.

It is a serious alternative worth evaluating alongside:

- [CLAIM_ALLOCATION_AND_BATCHING_OPTIONS.md](./CLAIM_ALLOCATION_AND_BATCHING_OPTIONS.md)
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

This lane could potentially become simpler than the current epoch-heavy model if this direction is chosen.

For example, it may make sense to explore:

- a fixed `1-year` ordinary lock
- and removal or simplification of maturity-era halving logic

That is not a recommendation yet, only an implication worth considering.

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
2. What fixed lock duration should the reserved lane use?
3. Should the ordinary lane keep epochs, or become simpler if this path is chosen?
4. What auction mechanics best fit the fairness goal without creating a mempool knife fight?
5. Can the reserved lane be designed to respect blockspace well enough to be politically credible?
