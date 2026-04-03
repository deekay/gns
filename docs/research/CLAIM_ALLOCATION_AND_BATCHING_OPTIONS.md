# Claim Allocation And Batching Options

This note explores the main design fork now under active pressure from review:

- should GNS keep a fixed, objective bond curve as the primary allocation mechanism?
- should it add or replace that with an auction mechanism?
- and how should the protocol reduce chain footprint, especially if launch dynamics become more competitive?

The goal here is not to lock a decision immediately. The goal is to make the trade-offs explicit.

## Design Goals

Any launch allocation mechanism should be judged against a few concrete goals:

1. **Open launch fairness**
   Everyone should know the start height, the rules, and the path to claim.

2. **Objective protocol rules**
   The protocol should avoid subjective pricing categories like "brand" or "premium word" if possible.

3. **Resistance to large-scale squatting**
   A wealthy actor should not be able to lock up an overwhelming share of the economically relevant namespace too cheaply.

4. **Good first-claim UX**
   Discovering an available name should feel like "I can try to get it now," not "I have entered a prolonged contest by expressing interest."

5. **Reasonable chain footprint**
   The allocation mechanism should respect Bitcoin blockspace and avoid unnecessary long-term footprint.

6. **Legible secondary market**
   The primary protocol should not need to solve every market problem if the secondary market can handle some of them more cleanly later.

## Current Baseline

The current prototype uses:

- a fixed length-based bond curve
- a commit / reveal claim flow
- first valid reveal after the earliest valid commit wins
- no semantic premium categories
- no auction during primary claim

### Strengths Of The Baseline

- easy to explain
- objective and auditable
- preserves the "see it, try to grab it" feel people intuitively expect from a namespace
- avoids turning every name claim into a public bidding war
- makes the long tail tractable

### Weaknesses Of The Baseline

- may underprice famous brands, premium words, and culturally salient names
- invites the objection that the relevant namespace is much smaller than the total namespace
- does not directly translate demand into price discovery
- may leave launch vulnerable to concentrated top-end squatting even if the total namespace remains broad

## Core Pressure From Review

The strongest current objection is not:

> can someone corner all 6-character names?

It is:

> can someone rationally lock up the top 10,000 or 100,000 names people care about most?

That changes the evaluation. A mechanism can look excellent under total-namespace math and still look weak under premium-name analysis.

## Allocation Mechanic 1: Fixed Bonds Only

### Shape

- every name follows the same public bond curve
- no bidding contest
- the first successful claim wins

### Why It Is Attractive

- preserves neutrality at the protocol level
- gives immediate, predictable pricing
- avoids adversaries bidding up every revealed demand signal
- keeps the user experience closer to DNS registration than to an auction house

### Where It Struggles

- premium names may be too cheap relative to their real-world value
- large speculators can rationally concentrate on the top slice of names rather than the whole namespace
- the protocol relies on the bond curve and launch timing doing enough work by themselves

### Current Assessment

Still the cleanest default from a protocol-simplicity standpoint, but now under real pressure from the premium-brand objection.

## Allocation Mechanic 2: Pure On-Chain Open Auction

### Shape

- a claim starts an auction window
- other claimants can outbid during that window
- the highest bid at the end wins

### Why It Is Attractive

- price discovery happens where demand is strongest
- premium brands and premium words become more expensive automatically
- directly counters the "top 10k names are too cheap" objection

### Where It Struggles

- it changes the feel of the system dramatically
- expressing interest in a name publicly invites competition
- any interesting name can be griefed or bid up by a richer counterparty
- users lose the clean "I saw it and grabbed it" experience
- chain activity can spike badly during contested periods

### Specific Concern

This is the problem you called out directly:

If `davidking` is cheap to claim and an adversary sees the attempt, an auction system may let them turn every meaningful first-party claim into a bidding contest. That is worse than normal DNS-style first-come registration for many legitimate users.

### Current Assessment

Useful as a thought experiment and maybe compelling for premium pricing, but it imposes a very different primary-claim dynamic and may create as many fairness problems as it solves.

## Allocation Mechanic 3: Sealed-Bid Auction

### Shape

- bids are committed privately first
- later revealed
- highest valid bid wins

### Why It Is Attractive

- hides exact willingness to pay during the bidding window
- avoids some public bid-up dynamics of open auctions
- feels less like a live mempool-visible knife fight

### Where It Struggles

- much more complex to explain and implement
- still turns names into contests once interest appears
- still creates a window in which an expressed claim can attract stronger bidders
- may require extra phases, extra deadlines, and more failure modes

### Current Assessment

Better than open auctions on information leakage, but still changes primary claims from acquisition into competition.

## Allocation Mechanic 4: Fixed Bond With Challenge Window

### Shape

- a claimer posts the fixed bond and enters a challenge period
- challengers can overbond or trigger a contest
- uncontested names settle under the normal fixed curve

### Why It Is Attractive

- preserves the simple path for ordinary names
- reserves contest mechanics for names that attract multiple claimants
- addresses premium-name pressure more directly than pure fixed bonds

### Where It Struggles

- still invites strategic griefing once interest is visible
- creates a two-track system that is harder to reason about
- moves the protocol toward auctions anyway, just with an extra layer of conditional complexity

### Current Assessment

One of the more plausible hybrids, but still needs a strong answer to "why should someone's ordinary self-claim become contestable just because another party can force a higher-price path?"

## Allocation Mechanic 5: Fixed Bond Primary, Secondary Market Does The Rest

### Shape

- keep primary claims objective and simple
- accept that many high-salience names will become part of a secondary market
- rely on launch bond design, launch fairness, and future-native naming adoption rather than primary auctions

### Why It Is Attractive

- keeps the protocol simple
- mirrors a familiar internet pattern: primary registration plus secondary market
- avoids making every name contestable on first claim
- best preserves the UX that discovering an open name is actionable now

### Where It Struggles

- can look like "the protocol just tolerates squatting"
- weakest answer to the existing-brand problem
- may be acceptable for future-native brands but unsatisfying for already-famous names

### Current Assessment

This is close to the spirit of the current design, but it needs stronger justification if we keep it.

## Allocation Mechanic 6: Semantic Or Category-Based Pricing

### Shape

- brands, dictionary words, or premium names cost more than random strings
- pricing depends on something other than length alone

### Why It Is Attractive

- directly targets the premium-name objection

### Where It Struggles

- violates the current fairness principle of objective, protocol-level neutrality
- requires someone to define what counts as "premium"
- turns pricing into a subjective governance problem
- creates endless edge cases and legitimacy fights

### Current Assessment

This appears to solve the criticism while actually introducing a much deeper governance problem. It is probably the least aligned with the current GNS philosophy.

### Narrower Variant Worth Exploring

There is one bounded version of this that may still be worth serious review:

- keep the ordinary protocol objective and length-based
- add a frozen, launch-only premium overlay for a bounded set of already-salient existing names
- derive that list from public datasets, deterministic scoring, and coarse tiers rather than bespoke per-name pricing

That is still less neutral than pure fixed bonds, but it is much more defensible than an ongoing semantic pricing system.

See [LAUNCH_PREMIUM_OVERLAY_PIPELINE.md](./LAUNCH_PREMIUM_OVERLAY_PIPELINE.md).

## Working Comparison

| Mechanism | Best property | Main failure mode |
| --- | --- | --- |
| Fixed bonds only | clean, objective, immediate | may underprice premium names |
| Open auction | strong price discovery | every interesting name becomes a bidding war |
| Sealed-bid auction | less information leakage | still contest-heavy and complex |
| Fixed bond + challenge | hybrid flexibility | griefing and conditional complexity |
| Fixed bond + secondary market | simple primary path | weak answer to existing-brand squatting |
| Semantic pricing | targets premium names directly | destroys protocol neutrality |

## Tentative Viewpoint So Far

The current objection does not automatically prove that auctions are better.

It proves that the current fixed-bond story is incomplete for premium names.

That is an important distinction.

The strongest argument against jumping straight to auctions is that auctions change the social character of the namespace:

- first discovery no longer gives you a clean shot
- revealing interest can itself make you lose
- richer or more adversarial parties can contest any name you expose

That feels much worse for ordinary users than DNS-style first registration, even if it prices premium names more aggressively.

So the current question is not simply:

> auction or no auction?

It is:

> what degree of contestability is acceptable in the primary claim path?

## Blockspace And Batching

These questions should be separated from the auction question.

A better batching design may be worth doing even if the allocation mechanic stays fixed-bond and non-auction.

### Why Batching Matters

- it reduces per-name chain footprint
- it helps answer Bitcoin-cultural objections around blockspace
- it may make large-scale legitimate onboarding cleaner
- it may also make large-scale squatting cheaper, so batching is not purely upside

That last point matters: a batching design can help respectable use cases and aggressive squatting at the same time.

## Batching Direction 1: Merkle-Anchored Commit Batches

### Shape

- a transaction anchors a Merkle root representing many claim commitments
- claimants later prove inclusion when they reveal

### Strengths

- materially better chain efficiency
- conceptually similar to other timestamping/anchoring patterns Bitcoiners already accept
- does not require routine value data to move on-chain

### Trade-Offs

- requires proof management
- adds more off-chain artifact handling
- changes the indexer and reveal logic
- may complicate the "simple enough for launch" story

### Current Assessment

This looks like the most plausible pre-launch footprint improvement to explore seriously.

## Batching Direction 2: Aggregator Or Service-Provider Batching

### Shape

- a service batches many customer commits or reveals into one anchor transaction

### Strengths

- best immediate footprint reduction for hosted or assisted flows
- can be layered on top of Merkle proofs

### Trade-Offs

- may concentrate operational power
- introduces timing and service-level trust assumptions
- does not by itself change core fairness rules

### Current Assessment

Good operationally, but not a substitute for a protocol-level story.

## Batching Direction 3: Scriptless / Taproot-Hidden Commitments

### Shape

- commit information is hidden inside key tweaks or signature material rather than explicit OP_RETURN payloads

### Strengths

- strongest answer to visible protocol footprint criticism
- can make GNS usage look more like ordinary Bitcoin activity

### Trade-Offs

- much higher design and reviewer complexity
- harder to explain, verify, and implement correctly
- easier to overpromise without a crisp spec

### Current Assessment

Worth researching, but currently less launch-ready than Merkle batching.

## Important Coupling: Batching Does Not Solve Premium Pricing

It is tempting to combine these debates, but they solve different problems:

- auctions or fixed bonds decide **who gets the name**
- batching decides **how much chain footprint that competition creates**

Merkle batching may be a strong pre-launch improvement even if the allocation mechanism remains unchanged.

## Questions We Still Need To Answer

1. Is the premium-name objection best answered by:
   - a steeper bond curve
   - some form of contestability
   - a stronger "future brands, not legacy brands" stance
   - or a combination?

2. If we introduce contestability, how do we avoid turning ordinary self-claims into bid-up griefing events?

3. Does a better batching design make large-scale squatting easier at the same time it makes legitimate use easier?

4. Which footprint improvement is most realistic before launch:
   - Merkle batching
   - service-provider batching
   - scriptless / taproot-heavy designs

5. If we reject auctions, what is the cleanest and most honest explanation for that choice?

## Recommended Next Steps

1. Model premium-name squatting explicitly rather than relying only on total-namespace math.
2. Write down the strongest case for fixed bonds and the strongest case for auctions in concrete launch terms.
3. Decide whether Merkle-based batching is a launch goal, a launch-visible plan, or later work.
4. Keep the allocation question and the batching question linked, but not conflated.
