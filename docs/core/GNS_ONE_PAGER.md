# GNS One-Pager

Global Name System (GNS) is a human-readable naming system anchored to Bitcoin. A GNS name is a flat string like `satoshi`, not a hierarchical domain like `satoshi.com`. The goal is to let people, projects, agents, payment flows, and services use a name they control directly, without depending on a registrar, a platform handle, or a rented suffix.

## What The System Does

GNS separates two things:

- **ownership**, which is recorded on-chain
- **what the name points to**, which is signed off-chain by the current owner

That means Bitcoin is used as a notary for ownership and state transitions, not as a general-purpose data store.

A name can point to:

- a profile or identity record
- payment destinations
- APIs and services
- agent endpoints
- any ordered key/value pairs the ecosystem chooses to support

## Core Design

GNS claims use a **commit / reveal** flow plus a **bitcoin bond**.

1. `COMMIT` hides the intended name while establishing the claim attempt.
2. `REVEAL` publishes the plaintext name and must confirm within **24 blocks** after the commit confirms.
3. Once the reveal confirms, the name is claimed and usable, but it enters a settlement period of **52,000 blocks**.
4. During settlement, bond continuity still matters. After maturity, the name remains valid without ongoing bond continuity.

Transfers move ownership from one pubkey to another. Off-chain value updates are only valid if signed by the name's **current owner key**.

Two key distinctions matter:

- the **wallet key** signs Bitcoin transactions
- the **owner key** controls later updates and transfers

In v1, losing the owner key means losing update and transfer authority for that name.

## Economic Model

GNS tries to allocate names through **bonded capital**, not through rent, private allocation, or protocol sales.

The bond is:

- **not** a payment to GNS
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

This is meant to make short premium names expensive to monopolize while keeping the long tail accessible.

### Why The Namespace Stays Broad

Using the current v1 alphabet (`a-z0-9`), there are about **2.18 billion** possible 6-character names.

At the current 6-character bond of `₿3,125,000 (0.03125 BTC)`, claiming all possible 6-character names would require about **68 million BTC**, which is more than three times Bitcoin's total **21 million BTC** supply.

Even if every bitcoin in existence were somehow devoted to 6-character claims, it would only be enough to bond about **672 million names** out of roughly **2.18 billion** possible 6-character names. The majority of that namespace would still remain open.

That does not make allocation perfectly neutral. Early participants, wealthy claimants, and fee conditions will matter. But it does mean the namespace becomes structurally hard to corner at scale once names are long enough that combinatorial supply outgrows available capital.

### Important v1 Tradeoff

After settlement, names remain valid without ongoing bond continuity.

That keeps the UTXO footprint more self-cleaning, but it also means long names can become inexpensive to hold indefinitely after the settlement period. That is a deliberate v1 tradeoff.

### Launch Fairness

The fairness story is not only about the bond curve. It is also about how launch happens.

A mainnet launch should only happen once the signet and private-demo paths are well tested and the activation block height is widely announced in advance. The goal is that everyone knows the exact starting rules, the exact starting height, and the exact claim mechanics before names open, so access is as open and simultaneous as possible on day one.

## Blockspace Footprint

GNS keeps its pure naming payload relatively small, but it still consumes real Bitcoin blockspace because each successful claim is a pair of ordinary Bitcoin transactions.

Current implementation summary:

- pure naming payload per completed claim: about `117–148 bytes`
- observed full claim footprint: about `404 vbytes`
- observed full serialized footprint: about `566 raw bytes`

So GNS is compact as protocol data, but it still competes in the normal fee market like any other transaction.

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

GNS has two different trust and availability stories.

### Ownership

Ownership is chain-derived.

- any operator with chain data can reconstruct the canonical name set
- a resolver does not get to invent ownership
- a resolver going offline does not destroy the registry

### Values

What a name points to is off-chain in v1.

- values are signed by the current owner
- authenticity is cryptographic
- availability depends on one or more resolvers retaining a copy

That means GNS is decentralized for ownership, but only partly decentralized for value availability in v1. That is the main infrastructure tradeoff in the current design.

### Why Resolver Decentralization Is Still Strong

Resolvers do not get to invent ownership, and they cannot fake completeness against a client that knows the chain. Because the canonical name set is derivable from Bitcoin, any client can sample names that should exist, query a resolver, and score how complete and up to date it is against ground truth.

That creates a decentralized path forward that is stronger than a generic off-chain directory. Resolver quality is auditable. Multi-resolver publish and multi-resolver read can improve availability over time, while the chain remains the authority for which names exist and who owns them.

## The Vision For GNS

GNS is not just "better DNS." It is a sovereign naming layer for the internet resources humans and software actually want to access:

- identities
- payment endpoints
- services
- software agents

As we hand more decision-making to language models, human-readable names become more important, not less. Flexible interpretation is useful, but it also increases the risk of resolving to the wrong account, service, or identity unless the naming layer itself is authoritative. GNS is designed to make names human-readable while keeping ownership cryptographically grounded, so both people and software acting on their behalf can resolve them with much higher confidence.

The system is designed so that the ownership record is public, auditable, and difficult to revoke or forge, while the mutable destination layer stays lightweight and easy to update.

## Current Status

GNS is an active prototype, not a mainnet-ready production system.

Today:

- hosted private demo claim flow: working
- browser value publishing: working
- self-hosted website + resolver stack: working
- transfers: prototype
- mainnet readiness: not yet

The current product surface is available at [https://globalnamesystem.org](https://globalnamesystem.org), and the public repository is at [https://github.com/deekay/gns](https://github.com/deekay/gns).
