# GNS From Zero

This note is meant for someone who knows little or nothing about GNS and wants
the shortest honest orientation before reading deeper design or protocol notes.

It is not a specification. It is a framing and status document.

Related notes:

- [BITCOIN_EXPERT_ONE_PAGER.md](/Users/davidking/dev/gns/docs/research/BITCOIN_EXPERT_ONE_PAGER.md)
- [BITCOIN_EXPERT_REVIEW_PACKET.md](/Users/davidking/dev/gns/docs/research/BITCOIN_EXPERT_REVIEW_PACKET.md)
- [BITCOIN_REVIEW_CLOSURE_MATRIX.md](/Users/davidking/dev/gns/docs/research/BITCOIN_REVIEW_CLOSURE_MATRIX.md)

## The Short Version

Global Name System (GNS) is an attempt to give Bitcoin human-readable payment
handles people can actually own.

The first user problem is simple:

- who do I mean before money moves?
- how do I say that in words instead of a long address?
- how can software verify that the handle still resolves to the payment record
  signed by the current owner?

The project is best framed today as **payment handles first, broader
owner-signed key/value records later**.

## What GNS Is Trying To Solve

Bitcoin addresses are not a human interface. People want readable payment
handles, but readable handles usually depend on a service, account, domain, or
operator between the payer and the recipient.

That means the human-readable layer around payment is usually rented,
revocable, or platform-controlled.

GNS explores a different approach:

- ownership is anchored to Bitcoin
- the human-readable string is flat, like `satoshi`
- no registrar or platform gets to revoke it
- what the name points to can change, but the ownership record is public and
  auditable

## The Core Design Idea

GNS separates two things:

- **ownership**, which is derived from on-chain events
- **values**, which are signed off-chain by the current owner

That means Bitcoin is used as a notary for the namespace, not as a database for
every routine update.

Today, a name can conceptually point to:

- payment destinations
- broader ordered key/value data later, if clients support it

But the current story should start with:

> use a human-readable payment handle to say who gets paid.

## Why Bonds Instead Of Fees

GNS uses a **bonded-capital** model rather than annual rent.

The claimant locks bitcoin they still own instead of paying protocol rent to a
registrar, treasury, or operator.

That still creates a real cost. Capital has time value and opportunity cost:
bitcoin locked in a bond cannot be sold, lent, invested, or used elsewhere
during settlement. The important difference is that this cost does not have to
be paid away to a third party. It comes from giving up liquidity and optionality
for a period of time, not from sending protocol rent to a gatekeeper.

That does not mean claims are free:

- claimants still pay normal Bitcoin transaction fees
- short and more competitive names require larger bonds
- time matters because capital is locked during settlement

The intended moral intuition is:

- the cost should come from capital commitment and time
- not from perpetual rent paid to a gatekeeper

## What The Claim Lifecycle Looks Like

At a high level, GNS uses:

1. `COMMIT`
2. `REVEAL`
3. settlement / continuity rules
4. later transfer and value updates

The commit/reveal structure is there to reduce front-running.

Transfers and value updates are separate:

- Bitcoin transaction keys fund and sign the Bitcoin transaction flow
- owner keys control later GNS updates and transfers

## Current Direction vs Current Prototype

This distinction matters.

### Current direction

The design direction we are converging toward is a **two-lane launch model**:

- `ordinary lane`
  - ordinary names
  - commit/reveal
  - simple objective floor table
  - fixed ordinary lock, currently leaning toward about one year

- `reserved lane`
  - salient existing names
  - deferred unlock
  - auction-based price discovery
  - longer fixed lock durations

That direction is motivated by launch fairness:

- keep ordinary names simple
- avoid giving away obviously valuable existing names too cheaply
- let markets discover BTC amounts for reserved names instead of hand-pricing
  every brand or public figure

### Current prototype

The repository already has a working prototype claim system, but not every part
of the future two-lane launch design is implemented yet.

What is real today:

- ordinary claim commit/reveal flow
- resolver and website
- transfer prototype
- off-chain signed value-record flow
- explicit Merkle batching for ordinary claims
- private-signet live demo paths for batched ordinary claims and experimental auction lifecycle smoke

What is still design or research:

- reserved-lane auction mechanism
- final launch-era policy and pricing details
- Taproot annex-based reveal carriage

So the right way to read the repo today is:

> there is a real working prototype, and there is also an evolving launch
> design sitting ahead of that prototype in some areas.

## Why Merkle Batching Matters

Every successful ordinary claim is a pair of Bitcoin transactions.

If GNS is going to be taken seriously by Bitcoin protocol-minded reviewers, we
need to show that we are thinking carefully about chain footprint.

That is why a lot of recent work has focused on Merkle batching:

- batching many commits into one anchored Merkle root
- keeping one bond output per claim
- later revealing claims individually against that anchored root

The important point is:

- batching is an **efficiency** improvement
- it is **not** the scarcity or anti-squatting mechanism

Scarcity still comes from bond size and lock duration.

## What We Can Say With Confidence Today

We now have strong evidence that the **explicit ordinary-lane Merkle batching
path works**.

That means:

- batch anchors work
- batch reveals verify correctly
- bad proofs are rejected by GNS even when the Bitcoin transaction itself
  confirms
- names claimed through batch anchors still participate in the normal later
  transfer rules
- the CLI, resolver, website, and offline browser flow understand the batched
  path

That is a much stronger statement than "we have a Merkle batching idea."

## What Is Still Experimental

The main experimental protocol branch right now is a possible future upgrade
path for reveal proof carriage:

- Taproot annex-based reveal proof bytes

Why it exists:

- the current explicit proof carrier is easy to audit and ship
- but larger batches eventually become less efficient because proof bytes are
  expensive in the current format

Why it is still experimental:

- it likely needs custom tooling
- it is worse for normal wallet compatibility
- it increases witness/indexer complexity

So the right current message is:

- **explicit batching is the working baseline**
- **annex is the leading scaling research path**

## Suggested Reading Order

If someone wants to learn the project in a reasonable order, this is the best
sequence right now:

1. [BITCOIN_EXPERT_ONE_PAGER.md](/Users/davidking/dev/gns/docs/research/BITCOIN_EXPERT_ONE_PAGER.md)
2. [BITCOIN_EXPERT_REVIEW_PACKET.md](/Users/davidking/dev/gns/docs/research/BITCOIN_EXPERT_REVIEW_PACKET.md)
3. [GNS_IMPLEMENTATION_AND_VALIDATION.md](/Users/davidking/dev/gns/docs/research/GNS_IMPLEMENTATION_AND_VALIDATION.md)
4. [MERKLE_BATCHING_STATUS.md](/Users/davidking/dev/gns/docs/research/MERKLE_BATCHING_STATUS.md)
5. [LAUNCH_SPEC_V0.md](/Users/davidking/dev/gns/docs/research/LAUNCH_SPEC_V0.md)
6. [BITCOIN_PROTOCOL_REVIEW_QUESTIONS.md](/Users/davidking/dev/gns/docs/research/BITCOIN_PROTOCOL_REVIEW_QUESTIONS.md)
7. [BITCOIN_REVIEW_CLOSURE_MATRIX.md](/Users/davidking/dev/gns/docs/research/BITCOIN_REVIEW_CLOSURE_MATRIX.md)

After that, deeper protocol appendices like Merkle reveal carriers and annex
research will make much more sense.

## The Right Takeaway

The project is best understood as:

- a serious Bitcoin-native naming project
- with a payment-handle first use case
- a real working prototype already on disk
- an increasingly coherent two-lane launch design
- and a deliberate effort to be thoughtful about blockspace, validation, and
  reviewer trust before asking for broad buy-in
