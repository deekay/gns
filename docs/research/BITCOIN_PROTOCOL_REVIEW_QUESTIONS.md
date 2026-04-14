# Bitcoin Protocol Review Questions

This note is the focused companion to
[BITCOIN_EXPERT_ONE_PAGER.md](/Users/davidking/dev/gns/docs/research/BITCOIN_EXPERT_ONE_PAGER.md).

Its purpose is simple:

> if we get a limited amount of time from technically sophisticated Bitcoin
> reviewers, what should we actually ask them?

Related notes:

- [BITCOIN_EXPERT_REVIEW_PACKET.md](/Users/davidking/dev/gns/docs/research/BITCOIN_EXPERT_REVIEW_PACKET.md)
- [BITCOIN_REVIEW_CLOSURE_MATRIX.md](/Users/davidking/dev/gns/docs/research/BITCOIN_REVIEW_CLOSURE_MATRIX.md)
- [MERKLE_BATCHING_STATUS.md](/Users/davidking/dev/gns/docs/research/MERKLE_BATCHING_STATUS.md)
- [AUCTION_SETTLEMENT_AND_OWNERSHIP.md](/Users/davidking/dev/gns/docs/research/AUCTION_SETTLEMENT_AND_OWNERSHIP.md)

## Best Use Of Bitcoin-Expert Attention

The highest-value questions are Bitcoin-native and systems-native, not launch
governance questions.

## 1. Ordinary-Lane Batching Baseline

Current position:

- explicit Merkle batching is the implemented ordinary-lane baseline
- one batch anchor commits many claims
- each claim is still revealed individually

Questions:

- does this batching path look disciplined from a blockspace and Bitcoin-policy
  perspective?
- is the current explicit proof-carrier baseline acceptable as a launch
  posture?
- are there standardness, relay, mempool, or policy concerns we are missing?

Why this matters:

- this is the current mainline scaling story
- we want to know whether the baseline already feels reasonable before arguing
  about more exotic upgrade paths

## 2. Reveal Carrier Upgrade Path

Current position:

- explicit proof carriage is the baseline
- Taproot annex is the leading future optimization candidate
- annex tooling has been prototyped, but it is not the mainline path

Questions:

- does annex look like a technically credible future optimization?
- does it look like an awkward use of Taproot that we should avoid?
- are there cleaner witness-aware or policy-aware alternatives we have missed?

Why this matters:

- the main batching bottleneck is reveal-proof carriage, not the Merkle anchor

## 3. Auction Transaction And Settlement Shape

Current position:

- `AUCTION_BID` exists as a real experimental transaction type
- chain-derived experimental auction state exists
- a settled winner can materialize directly into a live owned name

Questions:

- is the current `AUCTION_BID` shape coherent?
- is direct winner materialization into a name a good idea, or should there be
  a separate settlement step?
- are same-bidder replacement and stale-state commitment rules shaped
  sensibly?

Why this matters:

- this is where transaction semantics and state-machine complexity meet

## 4. System Simplicity And Protocol Boundaries

Current position:

- two-lane remains the lead direction
- one-lane universal auction remains a serious alternative
- ordinary claims, auctions, transfers, and off-chain value records are now
  all visible in the prototype

Questions:

- does the current split between ordinary claims, auction bids, transfers, and
  off-chain values feel coherent?
- are we drawing the protocol boundary in the right place?
- are any parts obviously too clever or too stateful for a launch system?

Why this matters:

- we want experts to push on complexity before we freeze it

## Secondary Questions

These are worth documenting, but they are not the best first use of Bitcoin
expert time:

- exact reserved-list size
- exact class floors and lock durations
- exact reserved-name inclusion choices
- whether one-lane universal auction should replace two-lane entirely

Those are real questions, but they lean more toward launch-policy and
governance judgment than Bitcoin-native protocol review.

## Current Stance We Should Present Clearly

These are the positions we should present as our current working answers:

- explicit batching is the current baseline
- annex is research, not dependency
- two-lane is the current lead architecture
- reserved list scale is likely on the order of tens of thousands to low
  hundreds of thousands, not millions
- auction numbers are still placeholders, but the mechanism family is the real
  design choice

That makes the review ask much cleaner.
