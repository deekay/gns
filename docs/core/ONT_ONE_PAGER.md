# ONT One-Pager

Status note:

- for the current framing, start with [ONT_FROM_ZERO.md](./ONT_FROM_ZERO.md)
- for the current implementation status, use [ONT_IMPLEMENTATION_AND_VALIDATION.md](../research/ONT_IMPLEMENTATION_AND_VALIDATION.md)
- for the current launch direction, use [LAUNCH_SPEC_V0.md](../research/LAUNCH_SPEC_V0.md)

This one-pager still captures the core model, but some older launch details below
should not be treated as the settled launch spec.

Open Name Tags (ONT) is a payment-handle system anchored to Bitcoin. An ONT name is a flat string like `satoshi` that the owner can control directly. The first use case is simple: help humans say who should get paid before money moves, without copying raw addresses or depending on a gatekeeper-controlled alias.

## What The System Does

ONT separates two things:

- **ownership**, which is recorded on-chain
- **what the name points to**, which is signed off-chain by the current owner

That means Bitcoin is used as a notary for ownership and state transitions, not as a general-purpose data store.

A name can point to:

- payment destinations
- broader ordered key/value pairs later if clients and applications decide to support them

## Core Design

ONT claims use a **commit / reveal** flow plus a **bitcoin bond**.

1. `COMMIT` hides the intended name while establishing the claim attempt.
2. `REVEAL` publishes the plaintext name and must confirm within **24 blocks** after the commit confirms.
3. Once the reveal confirms, the name is claimed and usable, but it enters a settlement period.
4. The current lead launch direction is to simplify this into a fixed ordinary-lane settlement period of about **1 year** rather than the older epoch-and-halving schedule. During settlement, bond continuity still matters. After maturity, the name remains valid without ongoing bond continuity.

Transfers move ownership from one pubkey to another. Off-chain value updates are only valid if signed by the name's **current owner key**.

Two key distinctions matter:

- the **wallet key** signs Bitcoin transactions
- the **owner key** controls later updates and transfers

In v1, losing the owner key means losing update and transfer authority for that name.

## Economic Model

ONT tries to allocate names through **bonded capital**, not through rent, private allocation, or protocol sales.

The bond is:

- **not** a payment to ONT
- **not** burned
- **not** annual rent

It is bitcoin the claimer still owns, temporarily locked as economic commitment during settlement.

### Bond Curve

The current launch curve is:

- `₿100,000,000 (1 BTC)` for a 1-character name
- each additional character halves the required bond
- the bond floors at `₿50,000 (0.0005 BTC)` for names of length 12 and longer

Examples:

| Name length | Required bond |
| --- | --- |
| `1` | `₿100,000,000 (1 BTC)` |
| `2` | `₿50,000,000 (0.5 BTC)` |
| `3` | `₿25,000,000 (0.25 BTC)` |
| `6` | `₿3,125,000 (0.03125 BTC)` |
| `12+` | `₿50,000 (0.0005 BTC)` |

This is meant to make short premium names expensive to monopolize while keeping the long tail accessible. The current lead launch direction also layers a separate reserved deferred-auction lane on top for salient existing names, rather than treating every name as the same launch-day ordinary claim.

### Why The Namespace Remains Open

Using the current v1 alphabet (`a-z0-9`), there are about **2.18 billion** possible 6-character names.

At the current 6-character bond of `₿3,125,000 (0.03125 BTC)`, claiming all possible 6-character names would require about **68 million BTC**, which is more than three times Bitcoin's total **21 million BTC** supply.

Even if every bitcoin in existence were somehow devoted to 6-character claims, it would only be enough to bond about **672 million names** out of roughly **2.18 billion** possible 6-character names. The majority of that namespace would still remain open.

That does not make allocation perfectly neutral. Early participants, wealthy claimants, and fee conditions will matter. But under the current v1 alphabet and bond curve, it does mean that from 6-character names onward, fully cornering the namespace becomes economically impossible: combinatorial supply outgrows the total capital that can exist.

### Why The Bond Ends At Maturity

After settlement, names remain valid without ongoing bond continuity.

This is intentional. The fairness mechanism is the opportunity cost of locking capital through settlement, not perpetual rent. Once a claimer has committed bitcoin for the full maturity period, the protocol has already observed a meaningful economic signal that they value the name and gave up the chance to use that capital elsewhere. Requiring the bond to remain parked indefinitely would add ongoing carrying cost without materially improving initial allocation fairness, while also increasing permanent UTXO pressure.

### Launch Fairness

The fairness story is not only about the bond curve. It is also about how launch happens.

A mainnet launch should only happen once the signet and private-demo paths are well tested and the activation block height is widely announced in advance. The goal is that everyone knows the exact starting rules, the exact starting height, and the exact claim mechanics before names open, so access is as open and simultaneous as possible on day one.

## Blockspace Footprint

ONT keeps its pure naming payload relatively small, but it still consumes real Bitcoin blockspace because each successful claim is a pair of ordinary Bitcoin transactions.

Current implementation summary:

- pure naming payload per completed claim: about `117–148 bytes`
- observed full claim footprint: about `404 vbytes`
- observed full serialized footprint: about `566 raw bytes`

So ONT is compact as protocol data, but it still competes in the normal fee market like any other transaction.

At the current transaction shape:

- a full block could theoretically fit about **2,475** completed claims
- that is about **356,000 claims per day** at the extreme upper bound
- at `50 sat/vB`, one completed claim costs about `₿20,200 (0.000202 BTC)` in transaction fees alone

In practice, usage is constrained by:

- fee pressure
- bond capital lockup
- temporary UTXO pressure during settlement

So the main economic brakes are not protocol throttles; they are normal Bitcoin fee-market pressure plus the capital required to hold names through settlement.

## Trust Model

ONT has two different trust and availability stories.

### Ownership

Ownership is chain-derived.

- any operator with chain data can reconstruct the canonical name set
- a resolver does not get to invent ownership
- a resolver going offline does not destroy the registry

### Values

What a name points to is intentionally off-chain.

- values are signed by the current owner
- authenticity is cryptographic
- availability depends on one or more resolvers retaining a copy

That means ONT is decentralized for ownership, but only partly decentralized for value availability in v1. The intended direction is stronger distribution and better resolver availability, not moving normal value updates on-chain.

### Why Resolver Decentralization Is Still Strong

Resolvers do not get to invent ownership, and they cannot fake completeness against a client that knows the chain. Because the canonical name set is derivable from Bitcoin, any client can sample names that should exist, query a resolver, and score how complete and up to date it is against ground truth.

That creates a decentralized path forward that is stronger than a generic off-chain directory. Resolver quality is auditable. Multi-resolver publish and multi-resolver read can improve availability over time, while the chain remains the authority for which names exist and who owns them.

## The Vision For ONT

The first claim is narrow and useful:

- pay the right person
- express that choice in words you control instead of raw addresses
- let clients verify the current owner-signed payment record before sending

From that payment-handle base, ONT can grow into a broader owner-signed record layer if useful clients emerge. The key/value model allows additional records without putting routine updates on Bitcoin or changing the ownership model.

As we hand more decision-making to software, human-readable names become more important, not less. Software can interpret intent flexibly, but the final payment target should not rest on a probabilistic guess about which account is the right one. ONT is designed to make payment handles human-readable while keeping ownership cryptographically grounded, so both people and software acting on their behalf can resolve them with much higher confidence.

The system is designed so that the ownership record is public, auditable, and difficult to revoke or forge, while the mutable destination layer stays lightweight and easy to update.

Adjacent systems are useful to keep in mind here too. Pubky / PKARR, which the older Slashtags effort now points toward, takes a different approach: public keys are the durable identity layer, and the base system intentionally avoids trying to allocate a scarce global human-readable namespace. ONT is trying to solve that extra layer for the Bitcoin ecosystem by adding Bitcoin-anchored ownership for shared human-readable payment handles. See [../research/ONT_VS_PUBKY_PKARR.md](../research/ONT_VS_PUBKY_PKARR.md) for a short comparison note.

## Current Status

ONT is an active prototype, not a mainnet-ready production system.

Today:

- hosted private demo claim flow: working
- hosted private demo batch-claim smoke: working
- hosted private demo experimental auction smoke: working
- browser value publishing: working
- self-hosted website + resolver stack: working
- transfers: prototype
- mainnet readiness: not yet

The current product surface is available at [https://opennametags.org](https://opennametags.org), and the public repository is at [https://github.com/deekay/ont](https://github.com/deekay/ont).
