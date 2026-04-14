# Bitcoin Expert Review Packet

This note is the intended front door for technically sophisticated Bitcoin
reviewers who do not already know GNS well.

The goal is not to make them reconstruct the project from scattered design
notes. The goal is to give them one compact packet that says:

- what GNS is trying to do
- what is implemented today
- what is still provisional
- which questions are actually worth their time

This is not a full specification. It is a review packet.

Related notes:

- [GNS_FROM_ZERO.md](/Users/davidking/dev/gns/docs/core/GNS_FROM_ZERO.md)
- [GNS_IMPLEMENTATION_AND_VALIDATION.md](/Users/davidking/dev/gns/docs/research/GNS_IMPLEMENTATION_AND_VALIDATION.md)
- [MERKLE_BATCHING_STATUS.md](/Users/davidking/dev/gns/docs/research/MERKLE_BATCHING_STATUS.md)
- [LAUNCH_SPEC_V0.md](/Users/davidking/dev/gns/docs/research/LAUNCH_SPEC_V0.md)
- [RESERVED_LIST_GENERATION_METHOD.md](/Users/davidking/dev/gns/docs/research/RESERVED_LIST_GENERATION_METHOD.md)
- [BITCOIN_REVIEW_CLOSURE_MATRIX.md](/Users/davidking/dev/gns/docs/research/BITCOIN_REVIEW_CLOSURE_MATRIX.md)

## 1. What GNS Is

GNS is a Bitcoin-anchored human-readable naming system.

The narrowest useful framing is:

> use a human-readable name to say who gets paid or which counterparty or
> service you trust.

That framing matters. GNS should not be introduced first as:

- a generic DNS replacement
- a generic key/value layer
- or a social-handle land grab

The project is best understood as:

- payments first
- counterparties and services second
- broader key/value publishing later

## 2. Core System Shape

GNS separates:

- on-chain ownership
- off-chain mutable value records

Bitcoin is used as the ownership and transfer notary, not as the data layer for
every routine update.

The current ordinary-name path uses:

1. commit
2. reveal
3. settlement / continuity rules
4. later transfer and owner-signed value updates

Claims use bonded capital rather than protocol rent:

- the claimant locks bitcoin they still own
- the scarcity signal comes from capital commitment and time
- the protocol is not trying to sell names directly

## 3. What Is Real Today

There is already a working prototype, not just a whitepaper direction.

Implemented today:

- ordinary claim commit / reveal flow
- resolver and website
- owner-signed value records
- transfer prototype
- explicit Merkle batching for ordinary claims
- experimental reserved-auction stack with real bid transactions, chain-derived
  auction state, settled-winner materialization into owned names, and live
  private-signet smoke coverage

Validated today:

- package tests across protocol, core, CLI, and web
- fixture smoke for the ordinary stack and batch path
- SSH-backed regtest lifecycle suite
- hosted private-signet batch smoke
- hosted private-signet auction smoke

The strongest honest claims we can make now are:

1. the ordinary claim flow works
2. explicit ordinary-lane Merkle batching works
3. the experimental reserved-auction slice is far enough along to inspect,
   test, and critique as a real system rather than only prose

## 4. Current Lead Architecture

The current launch direction is a two-lane model.

### Ordinary lane

- ordinary names
- commit / reveal
- objective floor table
- simple fixed ordinary lock
- explicit Merkle batching as the current footprint optimization path

### Reserved lane

- salient existing names
- deferred unlock
- open ascending auction
- soft close
- protocol-set longer lock duration
- broad reserve list plus a small number of reserved classes

The current lead recommendation is:

- keep the two-lane model
- keep explicit ordinary-lane batching as the mainline path
- keep Taproot annex as a research upgrade path, not the production baseline
- keep reserved auctions visible and testable, but do not overstate them as a
  frozen launch protocol yet

## 5. Merkle Batching: Current Position

The current batching story is clearer than it used to be.

### Mainline implemented path

- ordinary lane only
- one batch anchor can commit many ordinary claims
- each name is later revealed individually against the anchored Merkle root
- each leaf binds to a dedicated bond output
- the rest of the name lifecycle remains normal

This means batching is currently:

- a commit-efficiency improvement
- not a scarcity mechanism
- not transfer batching

### What is already proven

- batch anchors work
- batch reveals verify
- bad proofs are rejected by GNS even when the Bitcoin transaction itself
  confirms
- batch-claimed names still work with later transfer behavior

### Current limitation

The main scaling limit is no longer the Merkle anchor.

The limiting factor is reveal proof carriage:

- explicit proof outputs are simple and auditable
- but larger batches become inefficient because those proof bytes are expensive

### Annex / Taproot status

The annex path is now a credible research lane, not just a sketch:

- custom tooling can build, sign, and verify annex-bearing reveal envelopes
- a core-style parser can recover and validate them

But annex is still not the mainline path because:

- wallet compatibility is weaker
- standard PSBT flows do not handle it cleanly
- it adds witness-aware tooling and indexing complexity

The current recommendation is:

- explicit reveal proof carrier for the current baseline
- annex as the leading upgrade candidate if larger-batch scaling becomes the
  next priority

## 6. Reserved Auctions: Current Position

Reserved auctions are no longer only simulator prose.

Today we have:

- configurable policy defaults
- single-auction and market simulators
- fixture-backed expected outcomes
- website auction lab
- bid-package export
- signable experimental bid artifacts
- chain-derived auction feed from observed `AUCTION_BID` transactions
- stale-state rejection
- same-bidder replacement derivation
- no-bid release valve
- settled winner materialization into a live owned name
- live private-signet smoke proving auction lifecycle behavior

What is still provisional:

- final launch semantics for every reserved-lane rule
- exact class floors and lock durations
- final reserve-list generation methodology
- whether every current experimental derivation should become stricter
  chain-enforced behavior

So the right wording is:

> the reserved-auction path is now implemented enough to test and critique, but
> it is still an experimental launch candidate rather than a frozen launch
> protocol.

## 7. What We Are Actually Asking Bitcoin Experts To Review

We should be disciplined here. This audience is best used for Bitcoin-native
questions, not for every policy argument at once.

The best questions for this round are:

### A. Bitcoin protocol and blockspace sensibility

- does the ordinary-lane batching design look reasonable and disciplined?
- is the current explicit proof carrier an acceptable baseline?
- does the annex path look like a credible future optimization or an awkward
  use of Taproot?
- are there relay, standardness, policy, or mempool concerns we are missing?

### B. Transaction and state-machine shape

- is the current claim / transfer / value split coherent?
- is the current experimental `AUCTION_BID` shape reasonable?
- does winning-bid materialization into an owned name look like a good idea, or
  should there be a separate settlement step?
- are any current rules obviously too complex or too fragile for a launch
  system?

### C. Operational posture

- are we being honest about what is implemented vs what is still experimental?
- are we making the right tradeoff between easy-to-audit explicit data and
  tighter on-chain footprint?

## 8. What We Are Not Primarily Asking Them To Decide

These are important, but they are not the highest-value first ask for Bitcoin
protocol experts:

- the exact final reserved list
- the exact final list-generation methodology
- the exact final class floors and lock durations
- whether a specific public figure belongs in class 2 or class 3
- broader product narrative questions

Those can remain provisional as long as we are explicit about that.

## 9. Current Recommendations On The Biggest Open Questions

These are the current house recommendations for the next review revision.

### Keep

- payment-first framing
- two-lane lead architecture
- ordinary-lane commit / reveal
- explicit ordinary-lane Merkle batching
- broad reserved list with coarse reserved classes
- no-bid release valve

### Treat as provisional but good enough for review

- three reserved classes rather than one universal reserved burden
- current auction family: open ascending, soft close, meaningful minimum
  increments, stronger extension increments
- winner materialization from the winning bid

### Keep experimental

- Taproot annex reveal carrier
- deeper witness-native batching ideas
- transfer batching
- one-lane universal auction as an alternative architecture

## 10. What We Still Need Before Sharing Broadly

The project is much closer now, but a good first external round should still be
packaged deliberately.

Before broader outreach, we should keep tightening:

1. one canonical reading order
2. one canonical explanation of implemented vs experimental
3. one canonical list of the actual review questions
4. one canonical matrix of which launch questions are closed, provisional, or
   intentionally deferred

This packet and the closure matrix are meant to be that spine.

## 11. Suggested Reading Order For A Bitcoin Expert

If someone is willing to read a short packet, this is the order that should
give them the best signal with the least confusion:

1. [GNS_FROM_ZERO.md](/Users/davidking/dev/gns/docs/core/GNS_FROM_ZERO.md)
2. [GNS_IMPLEMENTATION_AND_VALIDATION.md](/Users/davidking/dev/gns/docs/research/GNS_IMPLEMENTATION_AND_VALIDATION.md)
3. [MERKLE_BATCHING_STATUS.md](/Users/davidking/dev/gns/docs/research/MERKLE_BATCHING_STATUS.md)
4. [LAUNCH_SPEC_V0.md](/Users/davidking/dev/gns/docs/research/LAUNCH_SPEC_V0.md)
5. [BITCOIN_REVIEW_CLOSURE_MATRIX.md](/Users/davidking/dev/gns/docs/research/BITCOIN_REVIEW_CLOSURE_MATRIX.md)

Optional deeper appendices after that:

- [MERKLE_BATCHING_PROTOCOL_REVIEW_MEMO.md](/Users/davidking/dev/gns/docs/research/MERKLE_BATCHING_PROTOCOL_REVIEW_MEMO.md)
- [MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md](/Users/davidking/dev/gns/docs/research/MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md)
- [AUCTION_SETTLEMENT_AND_OWNERSHIP.md](/Users/davidking/dev/gns/docs/research/AUCTION_SETTLEMENT_AND_OWNERSHIP.md)

## 12. Short Current Bottom Line

If we want one honest paragraph for technically serious reviewers, it is this:

> GNS is a Bitcoin-anchored human-readable naming system aimed first at
> payments and counterparties. The ordinary claim path is real, explicit
> ordinary-lane Merkle batching is implemented and strongly validated, and the
> reserved-auction slice is now implemented enough to inspect as a real system
> rather than only a design sketch. The remaining review questions are mostly
> about launch semantics, blockspace sensitivity, and whether future scaling
> paths like Taproot annex are worth their added complexity.
