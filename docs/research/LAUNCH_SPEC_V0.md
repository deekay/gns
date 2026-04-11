# GNS Launch Spec v0

This note is the current best attempt to turn recent launch research into one
provisional specification.

It is not a final protocol freeze. It is a **working launch spec** for the
direction we are most likely to pursue unless new evidence changes the choice.

The main job of this note is to separate:

- what we are currently leaning toward strongly enough to build around
- what is still intentionally open

Related notes:

- [RESERVED_NAME_AUCTION_LANE.md](./RESERVED_NAME_AUCTION_LANE.md)
- [RESERVED_CLASS_OPTIONS.md](./RESERVED_CLASS_OPTIONS.md)
- [RESERVED_AUCTION_SIMULATOR.md](./RESERVED_AUCTION_SIMULATOR.md)
- [ONE_LANE_VS_TWO_LANE_AUCTION_COMPARISON.md](./ONE_LANE_VS_TWO_LANE_AUCTION_COMPARISON.md)
- [CLAIM_ALLOCATION_AND_BATCHING_OPTIONS.md](./CLAIM_ALLOCATION_AND_BATCHING_OPTIONS.md)
- [SALIENCE_OVERLAY_RATIONALE.md](./SALIENCE_OVERLAY_RATIONALE.md)
- [TWO_LANE_LAUNCH_ONE_PAGER.md](./TWO_LANE_LAUNCH_ONE_PAGER.md)

## Current Lead Direction

The leading launch candidate is now a **two-lane model**:

- `ordinary lane`
- `reserved lane`

The intended split is:

- keep ordinary names easy and legible
- do not give obviously salient existing names away at the ordinary base curve
- let markets discover BTC amounts for reserved names instead of asking the
  protocol to hand-price thousands of them

## Primary Objectives

The launch design should try to satisfy all of these at once:

1. keep the ordinary namespace easy to understand and use
2. reduce obvious launch windfalls on salient existing names
3. avoid turning every ordinary self-claim into a bidding contest
4. keep the protocol explainable to new users and reviewers
5. remain credible on blockspace and implementation complexity

## Provisional Defaults

These are the defaults we should currently treat as the working spec.

### 1. Two-lane launch

We should now assume:

- launch uses an ordinary lane and a reserved lane

This is no longer just one option among many. It is the current lead
architecture.

### 2. Ordinary lane uses commit / reveal

For names outside the reserved list:

- standard commit / reveal claim flow
- objective floor table
- predictable first-claim experience

This lane should preserve the normal intuition:

> I found an available name and I can try to claim it now.

### 3. Ordinary lane uses a simple fixed lock

The current leading simplification is:

- fixed ordinary settlement lock of about `1 year`

And:

- drop the current epoch / maturity-halving logic from the lead launch design

This makes the ordinary lane materially easier to explain.

### 4. Reserved names do not open in the ordinary lane

Names on the reserved list should:

- not be claimable on launch day through the ordinary path
- unlock later at known pre-announced block heights

The reserved list decides:

- which names are deferred
- when they unlock

It does **not** try to assign exact bespoke pricing per name.

### 5. Reserved lane uses auctions

Reserved names should enter:

- an on-chain auction lane

The current leading auction family is:

- open ascending auction
- soft close
- real on-chain bonded bids

### 6. Reserved auctions bid on BTC amount only

The protocol should fix the time dimension.

Bidders should compete on:

- BTC amount

They should **not** compete on arbitrary BTC-time pairs.

This avoids forcing hidden discount-rate assumptions into consensus.

### 7. Reserved lock duration is protocol-set

The reserved lane should use:

- a fixed long lock duration set by protocol or reserved class

This is doing much of the fairness work. It is what makes the auction more than
just a cheap option on future resale value.

### 8. Reserved auction floor inherits the ordinary floor

The working floor formula is:

`reserved_minimum_bid(name, class) = max(ordinary_floor_amount(name), reserved_class_floor_amount(class))`

That means:

- the ordinary base table remains the global scarcity floor
- reserved treatment only adds stronger minimums where launch fairness seems to
  require them

### 9. Reserved list can be broad

Because the protocol is no longer trying to custom-price each reserved name,
the list can be much broader than a traditional premium-pricing table.

The current bias is:

- reserve broadly where cheap launch capture would feel visibly wrong or
  create obvious hostage dynamics

not:

- reserve only a tiny prestige list

### 10. Ordinary-lane Merkle batching remains compatible

The current ordinary-lane implementation work stays useful under this launch
spec.

That means:

- commit / reveal remains the ordinary claim path
- explicit ordinary-lane Merkle batching remains the lead chain-footprint
  optimization for that path

The two-lane launch spec does not replace that work.

## Ordinary Lane v0

The ordinary lane should currently be understood as:

- names not on the reserved list
- commit / reveal
- objective base floor table
- fixed ordinary lock of about one year
- no auction

What this is trying to preserve:

- good first-claim UX
- simple mental model
- open access to the long tail

## Reserved Lane v0

The reserved lane should currently be understood as:

- names from a broad pre-announced reserved list
- unavailable during the initial ordinary-name launch window
- later unlocked at known block heights
- allocated by auction rather than ordinary commit / reveal
- lock duration fixed by protocol or reserved class
- bids compete on BTC amount only

## Reserved List Scope

The current direction is to be fairly broad, using the salience work to feed the
list.

The current candidate categories include:

- globally salient brands
- regionally obvious brands with strong coordination value
- institutions with dominant natural buyers
- full-name public identities with strong dominant referents
- public operators and founders
- meteoric company names that create obvious capture-risk
- ultra-scarce structural names that also have dominant existing buyers

The current philosophy is:

> if a name clearly has a dominant existing buyer or dominant real-world
> referent, it should usually be selected for special launch treatment unless
> the token is too ambiguous or structurally special to privilege cleanly.

## Auction Defaults

The current leading auction defaults are:

### Open ascending auction

- bids are visible on chain
- highest valid bonded bid leads

### Soft close

- late higher bids extend the auction window
- no brittle single final block

### One active bid per bidder per auction

- a bidder should be able to roll their own earlier bid upward
- their existing bid capital stays auction-bound
- they cannot freely withdraw and recycle it elsewhere mid-auction

### Meaningful minimum increment

The current bias is:

- require an increment that is economically meaningful
- likely some combination of absolute floor plus percentage increment

This is how we prevent cheap endless extensions.

## Timing Defaults

The current timing direction is:

- ordinary lane opens at launch
- reserved lane does **not** open at launch

What remains open is the exact reserved unlock structure, but the current bias
is:

- a small `pilot reserved wave`
- followed by a larger `main reserved wave`

rather than:

- everything on day one
- or many tiny editorial waves

## Reserved Class Bias

The current bias is **not** to create many bespoke classes.

The most likely good outcome is:

- `2-3` reserved classes maximum

The current recommendation after comparing the options is:

- prefer `3` coarse reserved classes over one universal reserved duration

See [RESERVED_CLASS_OPTIONS.md](./RESERVED_CLASS_OPTIONS.md).

Possible class shapes worth exploring:

- ultra-scarce structural / top-collision names
- major existing brands and institutions
- public-identity / operator names

The main goal is coarse, defensible buckets, not per-name tailoring.

## Intentionally Open Questions

These are the main unresolved items that should stay explicit.

### 1. One reserved duration or a few reserved classes?

This is probably the most important remaining economic choice.

The current recommended direction is:

- use a few coarse reserved classes rather than one universal reserved duration

The remaining question is narrower:

- what exact `2-3` class structure and burdens should those classes use?

### 2. Exact reserved duration

The live range still looks like:

- `5 years`
- `10 years`

The strongest current intuition is:

- top names can bear very long commitments
- public-identity names may need lighter treatment than the very top brand
  bucket

### 3. Transfer / early-exit policy for reserved winners

The principle is clear:

- early exit should not make the long lock meaningless

But the precise rule is still open.

### 4. Reserved unlock timing

We still need to finalize:

- how long after launch reserved auctions begin
- whether the best structure is `pilot + main`
- whether over-reserved names need a later release valve if they attract no
  bids

### 5. Final reserved-list breadth

The bias is broad reservation, but the exact practical boundary is still open.

We still need to answer:

- how broad is broad enough to build trust
- without making launch feel artificially withheld

## Not In This Spec Yet

This note does **not** yet finalize:

- the final reserved salience dataset
- the exact auction script mechanics
- transfer script details for reserved winners
- whether annex-based reveal carriage should ever become production path
- browser UX beyond the current prototype

## What We Can Build Against Now

Even with open questions, the following are stable enough to use as working
assumptions:

1. two-lane launch
2. ordinary commit / reveal lane
3. fixed ordinary lock around one year
4. reserved deferred-auction lane
5. reserved bids on BTC amount only
6. long fixed reserved lock set by protocol or a very small number of classes
7. broad reserve-list philosophy

## Short Practical Takeaway

If someone asks what we are currently converging toward, the shortest accurate
answer is:

> GNS is currently converging toward a two-lane launch. Ordinary names keep a
> simple commit/reveal path with an objective floor table and a fixed ordinary
> lock. Salient existing names go to a broad reserved lane, unlock later, and
> are priced by deferred on-chain auctions where the protocol fixes the time
> commitment and the market discovers the BTC amount.
