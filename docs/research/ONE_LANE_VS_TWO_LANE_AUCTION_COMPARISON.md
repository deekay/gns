# One-Lane vs Two-Lane Auction Comparison

This note compares two launch architectures that are both now credible enough
to deserve direct side-by-side treatment:

- a **two-lane** model
- a **one-lane universal auction** model

The goal is not to force a decision immediately. The goal is to make the
trade-offs legible in one place.

Related notes:

- [LAUNCH_SPEC_V0.md](./LAUNCH_SPEC_V0.md)
- [CLAIM_ALLOCATION_AND_BATCHING_OPTIONS.md](./CLAIM_ALLOCATION_AND_BATCHING_OPTIONS.md)
- [RESERVED_NAME_AUCTION_LANE.md](./RESERVED_NAME_AUCTION_LANE.md)
- [RESERVED_AUCTION_SIMULATOR.md](./RESERVED_AUCTION_SIMULATOR.md)

## The Two Candidates

## Option A: Two-Lane Launch

- `ordinary lane`
  - commit / reveal
  - objective floor table
  - simple fixed lock
- `reserved lane`
  - deferred unlock
  - auction for selected reserved names
  - class-based floors and longer locks

This is the current lead direction.

## Option B: One-Lane Universal Auction

- every name enters the same public auction mechanism
- names are visible immediately
- likely no reveal step for the auction path
- same basic allocation rule for ordinary names and salient names

The most attractive version of this idea is:

- open ascending auction
- soft close
- protocol-set lock duration or class-set lock duration
- no semantic reserved list or a much lighter reserved list

## Why One-Lane Is Attractive

There are real benefits to taking it seriously.

### 1. One mechanism is easier to explain

The cleanest one-lane story is:

> every name is allocated the same way

That is simpler than teaching users:

- ordinary lane
- reserved lane
- and why some names are treated specially

### 2. It may reduce chain footprint for uncontested names

If the one-lane mechanism is an open auction, then an uncontested name may need:

- one public claim / bid

instead of:

- commit
- then reveal

That means no reveal payload for the uncontested case.

This is one of the strongest technical attractions of the one-lane idea.

### 3. It reduces reserve-list governance pressure

If every name is already on an auction path, then the protocol does not need to
draw as sharp a line between:

- ordinary names
- and salient names

That could remove a lot of edge-case arguments about inclusion.

### 4. It lets markets price everything directly

If demand is what should determine price, a universal auction does that more
cleanly than:

- a fixed ordinary curve
- plus a special auction exception

## Why Two-Lane Is Still Attractive

The strongest case for two-lane is not only technical. It is social and
product-level.

### 1. Ordinary names still feel claimable

Under a two-lane model, an ordinary user can still think:

> I found an open name and I can try to claim it now

That preserves a DNS-like intuition for the long tail.

### 2. Not every meaningful self-claim becomes contestable

A one-lane universal auction means:

- every name claim is public
- every name claim can become a contest

That changes the feel of the system a lot.

A meaningful personal or business name no longer feels like:

- discovery followed by acquisition

It feels more like:

- discovery followed by a waiting period in a public market

### 3. Salient-name fairness pressure is concentrated where it matters

Two-lane says:

- keep the long tail simple
- reserve the auction mechanism for names where cheap capture is especially
  embarrassing or trust-damaging

That may be a cleaner balance than turning the whole namespace into one market.

## Chain Footprint Comparison

This is one of the most important direct comparisons.

## Two-Lane

For ordinary names:

- commit
- reveal
- maybe Merkle-batched commit optimization

For reserved names:

- later auction flow

Implication:

- more bytes for the normal ordinary-name happy path
- but ordinary names do not create bidding churn

## One-Lane

For uncontested names:

- maybe just one public auction-opening claim

For contested names:

- repeated bid transactions
- possible extensions
- more total chain activity on hot names

Implication:

- one-lane may be more compact for quiet ordinary names
- one-lane may be much less compact for contested names

So the real blockspace comparison is not:

> two-lane always heavier, one-lane always lighter

It is:

> two-lane has more fixed cost on ordinary names; one-lane has more variable
> cost on contested names

## Griefing Comparison

## Two-Lane

Main griefing question:

- are reserved-name auctions healthy and bounded?

Ordinary claims remain relatively protected from contest dynamics.

## One-Lane

Main griefing question:

- are we comfortable with contestability as the default rule?

Even if speculators are distracted by very attractive names in large waves,
that does not eliminate the possibility that somebody bids against:

- a personal name
- a merchant name
- a local business
- or an identity claim

The issue is not only whether that happens constantly.

It is that the mechanism makes it legitimate and expected whenever somebody
wants to do it.

## User Experience Comparison

## Two-Lane

Ordinary user experience:

- ordinary name appears available
- user can prepare a claim now
- reveal window and bond mechanics still exist
- but the experience is not a public bidding contest by default

Reserved-name experience:

- later unlock
- auction
- more complexity

## One-Lane

Universal user experience:

- every name starts as a public auction path
- every user needs to understand bidding and settlement timing
- finality may arrive only after the auction window closes

This is simpler at the protocol-mechanism level, but not necessarily simpler at
the product level.

## Governance Comparison

## Two-Lane

Needs:

- a reserved list
- reserved classes
- deferred timing

That creates governance and legitimacy pressure.

## One-Lane

Could reduce:

- reserved-list arguments
- category inclusion debates

But it introduces a different kind of governance pressure:

- should everything really be contestable?
- are we comfortable making a market the default social rule?

## Social Character Of The Namespace

This is probably the deepest difference.

## Two-Lane Says

- ordinary names are names
- salient launch-sensitive names are markets

## One-Lane Says

- all names are markets first

That is not automatically wrong.

But it is a much bigger philosophical decision than just:

- fewer transactions
- or one less protocol phase

## Interaction With Open vs Sealed Auctions

The one-lane simplicity story is strongest only if the auction is:

- open
- visible
- and does not need a separate commit/reveal structure

If we later decide we need:

- sealed bids
- or hidden commitments

then the one-lane mechanism starts to reintroduce multi-phase complexity anyway.

So one-lane simplicity is tied closely to comfort with:

- public bids
- public contestability
- and visible interest

## Current Assessment

The one-lane idea is no longer just a throwaway alternative.

It is a real architectural candidate because it offers:

- simpler conceptual allocation
- potentially lower footprint for uncontested names
- and reduced reserve-list pressure

But the strongest remaining objection is still:

> it makes contestability the default rule for the whole namespace

That is a deeper product and social shift than it first appears.

So the current bias remains:

- `two-lane` is still the lead candidate
- `one-lane universal auction` is a credible alternative worth pressure-testing

## Good Questions To Resolve Next

1. Are we comfortable making public contestability the default rule for all names?
2. How much lighter is one-lane really once contested-name bid churn is modeled honestly?
3. Would attractive reserved-name waves absorb enough speculative capital to make ordinary-name griefing economically rare?
4. Does one-lane still look compelling if we later need some hidden-bid or privacy-preserving mechanism?
5. Is the simplicity of one mechanism worth changing the social character of the namespace?

## Current Recommendation

Use this note as a comparison document, not as a decision freeze.

For now:

- keep building around the current two-lane lead candidate
- keep one-lane universal auction on the table as a serious alternative
- and revisit the choice if:
  - auction-state testing keeps looking good
  - chain-footprint arguments become decisive
  - or we become more comfortable with contestability as the default rule
