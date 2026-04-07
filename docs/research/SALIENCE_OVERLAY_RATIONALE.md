# Salience Overlay Rationale

This note is meant to preserve the reasoning behind the current launch-overlay work in one place.

It serves two jobs:

- help us recover the full context if the current working session is lost
- give outside reviewers a clearer explanation of why this design path exists and what guardrails it is trying to preserve

This should be read alongside:

- [LAUNCH_PREMIUM_OVERLAY_PIPELINE.md](./LAUNCH_PREMIUM_OVERLAY_PIPELINE.md)
- [PREMIUM_NAME_CALIBRATION.md](./PREMIUM_NAME_CALIBRATION.md)
- [SALIENCE_DATA_BUILD_PLAN.md](./SALIENCE_DATA_BUILD_PLAN.md)
- [SALIENCE_BOUNDARY_CHALLENGE_SET.md](./SALIENCE_BOUNDARY_CHALLENGE_SET.md)
- [SALIENCE_INSTITUTIONAL_NATURAL_BUYER_SET.md](./SALIENCE_INSTITUTIONAL_NATURAL_BUYER_SET.md)
- [SALIENCE_PUBLIC_FIGURE_SET.md](./SALIENCE_PUBLIC_FIGURE_SET.md)
- [CLAIM_ALLOCATION_AND_BATCHING_OPTIONS.md](./CLAIM_ALLOCATION_AND_BATCHING_OPTIONS.md)

## Executive Summary

The current direction is:

- keep a simple, objective base bond curve for the general namespace
- add a **bounded, frozen, launch-only premium overlay** for already-salient names
- determine that overlay from public evidence of salience and coordination importance
- allow a second path for names where cheap capture would create an overly easy resale trade to one obvious, well-capitalized natural buyer or one dominant real-world referent

This is not a claim that GNS can neutrally price every important word on earth.

It is a narrower claim:

> existing high-salience names create a special launch fairness problem, and a bounded launch-only overlay may address that problem better than either pure auctions or a pure length-only curve

## The Problem This Is Trying To Solve

The main objection that pushed this work forward was not:

> can someone corner the whole namespace?

It was:

> can someone cheaply lock up the top slice of names people care about most?

That includes:

- global brands
- major consumer platforms
- strong regional household names
- category-defining service names
- and some institutional or professional names with obvious natural buyers

This objection is serious because a system can look broad and neutral under total-namespace math while still feeling weak on the names that matter most to people at launch.

## Why Not Leave Everything To The Base Curve

The fixed base curve still has major strengths:

- it is objective
- easy to explain
- easier to audit
- and preserves the "see a name, try to get it" feel people intuitively expect from a namespace

But review exposed a real weakness:

- a length-only curve can underprice already-famous names
- especially where the likely buyer is obvious and well capitalized

If `google`, `nike`, or `asana` can be captured too cheaply, the launch can look less like fair allocation and more like an obvious warehousing opportunity.

## Why Not Solve This With Auctions

We revisited auction thinking because it is the most obvious answer to premium-name pricing.

But the main drawbacks still look serious:

- it turns first claims into contests
- it lets expression of interest invite counter-bidding
- it makes the user experience feel less like registration and more like adversarial price discovery
- it creates new griefing paths for ordinary self-claims

That is why the current work still treats auctions as a pressure test, not the default direction.

The overlay path exists partly because it may preserve more of the simplicity and first-claim feel of the original design while giving a stronger answer to top-end squatting.

## Why The Overlay Is Launch-Only

The special problem is bootstrapping, not steady-state governance.

Existing famous names already carry off-chain value before GNS exists. Future names do not have that same starting condition.

So the cleanest version of the idea is:

- normal objective rules for everyone
- one launch-only exception layer for a bounded set of pre-existing high-salience names

This is much easier to defend than an ongoing semantic pricing regime.

## Core Guardrails

Several principles emerged as important guardrails.

### 1. Keep The Overlay Bounded

The overlay should remain a narrow exception.

If the premium table becomes "all names anybody can argue about," it stops feeling like a fairness patch and starts feeling like protocol governance by editorial judgment.

### 2. Keep The Base Curve As The Default

The overlay should not replace the base namespace logic.

It should sit on top of it as a limited floor for a special launch slice.

### 3. Use Public Evidence, Not Vibes

The list should come from:

- public rankings
- public coordination signals
- deterministic scoring where possible
- explicit review for gray-area cases

It should not come from hand-picking names by intuition alone.

### 4. Use Coarse Tiers, Not Bespoke Per-Name Prices

The goal is not to calculate the perfect price for every brand.

The goal is to place names into a few reasonable capital-time buckets.

### 5. Freeze It Before Launch

The list should be:

- announced
- reviewable
- and frozen before launch

That is part of the fairness story.

### 6. Stay Honest About V1 Scope

The current work is only about names GNS v1 can actually represent:

- lowercase Latin letters
- digits

Names that do not fit the v1 script surface should be tracked separately, not silently distorted into the launch table.

## The Biggest Conceptual Shift

The most important shift in the work so far is this:

> the relevant question is not just "how famous is the name?" It is also "what kind of coordination or resale opportunity does cheap capture create?"

That led to two inclusion paths.

## Inclusion Path 1: Public Coordination

Some names deserve extra protection because many people already expect them to resolve correctly.

Examples:

- major consumer brands
- major web destinations
- major payments or communications identities
- strong regional household names

This is the most intuitive path.

## Inclusion Path 2: Natural-Buyer Capture Risk

Some names may deserve extra protection even when they are not strongly household-facing, because:

- there is one obvious natural buyer
- that buyer is already large or well capitalized
- and cheap capture would create an overly easy speculative resale trade

This is how the thinking expanded from:

- `apple`
- `google`
- `nike`

to also include cases like:

- `asana`
- `datadog`
- `foundersfund`
- `mckinsey`
- `mongodb`

The important caveat is:

- buyer firepower alone is not enough

There is a second caveat too:

- this trust story is strongest only if the protocol makes the claimant actually bear meaningful time cost

That means the natural-buyer path should be thought of as:

- obvious buyer
- real resale asymmetry
- and enough long-duration / early-exit friction that the real operator is favored over the short-horizon speculator

This is why long premium locks matter.

A real long-term operator may be happy to hold:

- `cooley`
- `mckinsey`
- `harvard`

for `10+` years.

A speculator usually is not.

That asymmetry is one of the main non-legal tools GNS has for pushing existing brands toward their real operators over time.

The token itself still has to be reasonably clear and defensible.

That is why names like:

- `foundersfund`

may score well, while names like:

- `sequoia`
- `rentech`
- `apollo`
- `wise`

remain more arguable or likely excluded.

### Public-Figure And Personal-Name Variant

Some cases are not best described as "natural buyer" cases at all.

For public figures, creators, athletes, and other person-linked identities, the better question is:

> is there one dominant existing real-world referent such that cheap launch capture would create obviously bad hostage dynamics around that name?

This is the same family of problem as brand squatting, but with a slightly different lens:

- the long-run operator may be the person
- or their management company
- or their estate
- or another clearly authorized operating entity

The core working default should be:

- names with an obvious dominant existing buyer or dominant real-world referent should generally be selected
- unless the token is too generic, too socially contested, or too structurally special to privilege one claimant cleanly

That is why:

- `kanyewest`
- `taylorswift`
- `elonmusk`

can look much stronger than:

- `kanye`
- `prince`
- `future`

The main additional guardrail for personal names is token clarity.

Full names and highly distinctive public identities can often clear the bar.

Single first names, titles, generic mononyms, and broad surnames should face a much stricter standard.

That is why this lane should be evaluated separately rather than folded loosely into either the institutional set or the meteoric-name set.

The current practical stance should be:

- keep a broad public-figure watchlist for research
- but only freeze a much smaller, high-confidence public-figure subset into the launch overlay

That helps keep the public-figure lane useful without turning launch into an editorial catalog of every notable musician, politician, podcaster, or executive.

There is also a narrower but important sibling lane for:

- founder names
- executive full names
- investor names
- public intellectual full names

These are not always mass-celebrity identities, but they can still create obvious hostage dynamics if the full-name token is already a durable public operator identity with one clear long-run claimant.

## Why Market Cap Is Not The Main Scoring Engine

We explicitly moved away from using:

- revenue
- profit
- market cap
- enterprise value

as the main drivers of overlay pricing.

Why:

- they do not measure name salience well
- they overfit to one type of corporate success
- and they would produce distorted results across categories

For example:

- `Coca-Cola`
- `NVIDIA`
- `Google`

can all plausibly belong in the same top bucket even though the structure of their businesses is very different.

So the current position is:

- public evidence of salience and coordination should drive the main scoring
- capital scale can act as a **secondary capture-risk amplifier**
- but capital scale should not become the protocol's primary semantic judge

## Why Token Ambiguity Matters So Much

A recurring lesson is that many real institutions still fail the overlay test because the exact token is too broad, shared, or generic.

Examples:

- `sequoia`
- `cambridge`
- `economist`
- `nature`
- `wise`
- `toast`
- `scale`

This matters because the protocol is not trying to reward the strongest claimant in the world for every common word.

It is trying to protect names where special-casing feels legitimate and socially legible.

That is why the current methodology keeps asking:

- is the buyer obvious?
- is the token specific enough?
- would special treatment feel publicly understandable?

## Why We Stopped Targeting A Fixed Number

Earlier versions of the work asked questions like:

- should the overlay be 1,000 names?
- 10,000?
- 100,000?

That framing turned out to be less useful than expected.

The better approach is:

- define the **characteristics** that justify special treatment
- and let the count fall out of the rule

This avoids pretending there is a meaningful natural line at some exact rank like `#10,000`.

It also makes it easier to say:

- `digitalocean` and `eventbrite` are peers
- `datadog` likely clears the bar
- `mixpanel` likely does not

without pretending there is false precision deep in the tail.

## Why Challenge Sets Matter

The prestige seed was useful for obvious names, but it stopped teaching us much once the broader capture-risk logic was accepted.

That led to two challenge sets:

- [SALIENCE_BOUNDARY_CHALLENGE_SET.md](./SALIENCE_BOUNDARY_CHALLENGE_SET.md)
- [SALIENCE_INSTITUTIONAL_NATURAL_BUYER_SET.md](./SALIENCE_INSTITUTIONAL_NATURAL_BUYER_SET.md)

These exist to keep the lower edge honest.

They are useful because they force the methodology to answer questions like:

- why does `datadog` clear while `mixpanel` does not?
- why is `asana` selected but `digitalocean` still arguable?
- why might `foundersfund` clear while `sequoia` stays arguable?
- why can `harvard` make sense while `cambridge` may not?

If the system cannot explain those boundary calls coherently, it is not ready.

## Why This Can Increase Public Trust

This work is not just internal planning.

It can also improve public trust if presented honestly.

Why:

- it shows the launch is not ignoring premium-name squatting
- it shows the rules are being designed before launch, not improvised later
- it makes the tradeoffs visible
- it creates auditable reasoning instead of opaque hand-picked outcomes

The trust argument is strongest if we can show:

- the overlay is bounded
- the rationale is published
- the sources are inspectable
- the difficult edge cases are acknowledged openly
- and the final launch table is frozen and announced in advance

## Current Planning State

The work now has a real structure:

1. **High-level rationale**
   This document plus the premium-overlay pipeline notes

2. **Calibration**
   [PREMIUM_NAME_CALIBRATION.md](./PREMIUM_NAME_CALIBRATION.md)

3. **Methodology**
   [LAUNCH_PREMIUM_OVERLAY_PIPELINE.md](./LAUNCH_PREMIUM_OVERLAY_PIPELINE.md)

4. **Source plan**
   [SALIENCE_SOURCE_REGISTRY.md](./SALIENCE_SOURCE_REGISTRY.md)

5. **Build plan**
   [SALIENCE_DATA_BUILD_PLAN.md](./SALIENCE_DATA_BUILD_PLAN.md)

6. **Boundary pressure tests**
   [SALIENCE_BOUNDARY_CHALLENGE_SET.md](./SALIENCE_BOUNDARY_CHALLENGE_SET.md)
   [SALIENCE_INSTITUTIONAL_NATURAL_BUYER_SET.md](./SALIENCE_INSTITUTIONAL_NATURAL_BUYER_SET.md)

That is meaningful progress. We are no longer just debating abstract fairness principles; we now have a concrete structure for turning those principles into an auditable launch artifact.

## What Still Remains Open

Several important questions are still unresolved:

- what the final bond and lock buckets should be
- exactly how broad the launch overlay should be
- how much public-company or capital-scale evidence should matter in lower tiers
- how generic-word cases should be handled when the buyer is real but the token is socially broad
- how deep the regional `B` tier should go
- what final source mix is enough to call the result globally fair within the Latin-script v1 namespace

Those are still open. But they are now open inside a much more usable framework.

## Current Bottom Line

The current planning direction is not:

- "price every word on earth"
- or "let an LLM decide who deserves what"

It is:

- keep the default namespace objective
- admit that launch has a special fairness problem for already-salient names
- address that problem with a bounded, frozen overlay
- ground that overlay in public evidence
- and use explicit challenge sets to keep the lower edge honest

That is the best current summary of why this work exists and where it is headed.
