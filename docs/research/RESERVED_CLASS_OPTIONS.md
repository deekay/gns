# Reserved Class Options

This note focuses on one of the biggest remaining open questions in
[LAUNCH_SPEC_V0.md](./LAUNCH_SPEC_V0.md):

> should the reserved lane use one fixed long duration for all names, or should
> it use a small number of reserved classes?

The short answer is:

- one universal reserved duration is simpler
- but `2-3` reserved classes are probably the better launch design

The current temporary implementation work for testing those assumptions now
lives in [RESERVED_AUCTION_SIMULATOR.md](./RESERVED_AUCTION_SIMULATOR.md).

The reason is that the current reserved list is broad enough that a single
capital-time burden will likely be too weak for the top names or too harsh for
public-identity and narrower institutional names.

## What This Question Is Really About

This is not mainly about elegance.

It is about whether the launch system can treat all of these names with the
same burden and still feel legitimate:

- `google`
- `x`
- `openai`
- `cooley`
- `patrickcollison`
- `tylercowen`

If the answer is no, then one universal reserved bucket is probably not the
right fit.

## Option 1: One Universal Reserved Duration

### Shape

- one reserved lane
- one fixed lock duration
- one reserved minimum floor rule
- auction still discovers the BTC amount above that floor

The most likely version would be something like:

- one long duration, probably `10 years`
- one reserved floor band, with the auction doing the rest

### Why It Is Attractive

- easiest story to explain
- least editorial structure
- least room for category creep
- avoids arguments over whether a name is in class A or class B

### Why It Struggles

The problem is not the auction. The problem is the burden shape.

A single reserved duration means:

- `google` and `tylercowen` both enter the same broad lane
- the auction can separate them on BTC amount
- but the time burden is still identical

That may be acceptable if the time burden is very long and we believe the
market can do almost all of the sorting.

But the likely failure mode is:

- the burden has to be long enough to matter for the strongest names
- which makes it harsher than necessary for a lot of clean full-name identity
  or narrower institutional cases

### Best Case For This Option

This option works best if we believe:

- the market should do almost all the differentiation
- broad reserve-list inclusion is cheap to justify
- and the protocol should only distinguish `ordinary` versus `reserved`

## Option 2: Three Reserved Classes

### Shape

Use a small number of coarse reserved classes, for example:

1. `R1` or `top-collision`
2. `R2` or `major-existing-name`
3. `R3` or `public-identity`

The exact labels matter less than the role they play.

### Why It Is Attractive

This keeps the system coarse while acknowledging a real difference between:

- ultra-scarce or globally obvious top names
- major existing brands and institutions
- public full-name identities and narrower operator cases

That lets the system say:

- `google` and `x` belong to a heavier class
- `openai`, `cooley`, `citadel`, `mckinsey`, `patrickcollison`, and
  `taylorswift` can still be special without carrying exactly the same burden
- `tylercowen` can still be selected without requiring a Zuckerberg-tier
  capital-time commitment

### Why It Struggles

- more governance than a single lane
- class assignment debates become real
- slightly harder to explain

So the value only exists if the classes are:

- very few
- very coarse
- and tied to obvious intuition

### Best Case For This Option

This works best if we believe:

- broad reservation is good for trust
- but the protocol still needs a lighter reserved treatment for some classes of
  names

## Option 3: Two Reserved Classes

This is the midpoint:

- one heavier reserved class
- one lighter reserved class

Typical shape:

- `top / structural / globally obvious`
- `everything else reserved`

This is cleaner than three classes, but it still compresses a lot of diversity
into the lighter bucket.

It may end up being an okay compromise, but it risks putting:

- `openai`
- `cooley`
- `tylercowen`

into a single bucket that still feels too broad.

## Candidate Class Shapes

The most coherent class family currently looks like this.

### Class 1: Ultra-Scarce / Top Collision

Typical names:

- `x`
- `google`
- `apple`
- `nvidia`

Typical properties:

- extreme structural scarcity or extreme brand collision
- very obvious buyer firepower
- very obvious windfall risk if underpriced

Likely role:

- strongest reserved burden

### Class 2: Major Existing Names

Typical names:

- `openai`
- `openai`-like meteoric company names
- `mckinsey`
- `deloitte`
- `cooley`
- `foundersfund`
- `tesla`
- `netflix`

Typical properties:

- strong existing buyer or dominant referent
- high trust benefit if the system routes the name toward the real operator
- real capture-risk, but not always in the same class as the top global names

Likely role:

- strong reserved burden, but below the top bucket

### Class 3: Public Identity / Operator

Typical names:

- `patrickcollison`
- `parkerconrad`
- `garrytan`
- `tylercowen`
- `taylorswift`
- `kanyewest`

Typical properties:

- clear dominant referent
- trust benefit from broad reservation
- real but often lower hostage-risk than the biggest corporate names
- long-run operator plausibly wants the name, but may not rationally bear the
  same burden as the very top brand tier

Likely role:

- lighter reserved burden that still meaningfully deters cheap capture

## Why Three Classes Feels Better Than One

The user’s earlier example is exactly the right test:

- `markzuckerberg` likely clears a much heavier burden than `tylercowen`

The system should be able to say:

- both are important enough to reserve
- but they are not important in the same economic class

That is hard to express cleanly with one universal reserved duration.

Three classes make it easier to preserve the trust benefit of broad reservation
without making the lower-confidence public-identity set feel priced out by
default.

## Why More Than Three Feels Wrong

Once we go beyond `2-3` classes, the system starts drifting toward:

- bespoke pricing by stealth
- category governance overhead
- endless class-boundary debate

That is exactly what the auction-lane idea was meant to reduce.

So the discipline should be:

- use the market for fine-grained pricing
- use the protocol only for a tiny number of coarse capital-time buckets

## Current Recommendation

My current recommendation is:

> use `3` reserved classes maximum, and treat that as the working launch
> assumption unless new evidence suggests one universal reserved duration is
> clearly good enough.

More specifically:

- keep the ordinary lane simple
- reserve broadly
- use one heavier class for top-collision names
- one middle class for major existing brands/institutions
- one lighter class for public identities and narrower operator names

This seems like the best way to:

- preserve the trust benefits of broad reservation
- keep the protocol coarse and legible
- avoid overburdening names like `tylercowen`
- without making names like `google` feel under-defended

## What This Still Leaves Open

Even if we choose the `3`-class direction, we still need to decide:

1. exact durations
2. whether class floors differ only in BTC amount, or also in duration
3. what borderline names move between `Class 2` and `Class 3`

Those are meaningful questions, but they are smaller questions than:

> one universal reserved duration, or a few coarse classes at all?

## Suggested Working Decision

If we want a provisional decision now, the cleanest one is:

> proceed as if the reserved lane will use three coarse classes, and use that
> assumption when pressure-testing timing, list breadth, and early-exit policy.

That does not freeze the exact values. But it gives the rest of the launch-spec
work a much better base to build on.
