# Open Name Tags (ONT) One-Pager

Open Name Tags is a Bitcoin-anchored naming system for human-readable names you can actually own.

An ONT name is a flat label like `alice`, `bob`, or a brand name. Ownership is public, auditable, and derived from Bitcoin. The owner can publish signed off-chain records that say where the name points: payment destinations, websites, profiles, messaging endpoints, or other application-specific records.

The goal is simple: make names human-readable without asking a company, registry, resolver, or protocol operator to be the trusted source of truth.

## The Core Model

ONT separates ownership from records.

- Bitcoin anchors who owns the name.
- The records it points to stay off-chain.
- Off-chain records are signed by the current owner key.
- Resolvers can help distribute records, but they cannot invent ownership.

That split is the heart of ONT. Bitcoin is used for scarce ownership and state transitions, not as a general-purpose data store. Off-chain records stay lightweight, updateable, and portable across resolvers.

## Alice Example

The overview flow is:

```text
alice
  -> Bitcoin anchor
     owner key: 8f3c...12ab
     bond: 50,000 sats

  -> signed off-chain bundle
     btc: bc1qxy...0wlh
     lightning: lno1q...9sa
     email: alice@example.com
     website: alice.example

  -> client
     verifies the owner signature
     uses the destination type it understands
```

Bitcoin answers: who owns `alice`? The signed bundle answers: where does `alice` point right now?

## Bonds, Not Rent

ONT uses bonded bitcoin to create real cost without paying a third party to allocate scarcity.

A winning bidder does not pay ONT, burn bitcoin, or rent the name annually. The bitcoin remains the owner’s bitcoin in self-custody, but it is committed during settlement. The cost is liquidity, time, and opportunity cost.

That makes name allocation costly enough to discourage careless hoarding, while avoiding the usual model where a registry sells or rents names as a central issuer.

Example opening-bond floors, not final launch parameters:

| Name length | Launch treatment | Example opening floor |
| --- | --- | --- |
| `1` | opens later | `₿1` |
| `2` | opens later | `₿0.5` |
| `3` | opens later | `₿0.25` |
| `4` | opens later | `₿0.125` |
| `5` | launch auction | `₿0.0625` |
| `6` | launch auction | `₿0.03125` |
| `12+` | launch auction | `₿0.0005 floor` |

The floor starts the auction. The auction can clear higher when multiple bidders care about the same name.

## Launch Auctions

At launch, names with `5-32` characters open by auction.

- A participant opens a public auction for a name.
- If nobody else bids, the opener can win at the opening floor.
- If others bid, open bidding discovers the final bond.
- The winner controls the owner key after settlement.

The rule is simple:

> If a `5-32` character name matters to more than one participant, the auction discovers that.

For most long-tail names, the experience can still be simple. Start an auction. If nobody else bids during the public window, you win at your opening bid. If others care, the price is discovered in the open.

## Short Names

Names with `1-4` characters open later.

Names of length `5-32` are eligible at launch.

Very short names are structurally scarce, so they should not clear before ONT has enough public attention. The boundary is easy to verify and does not require judging whether a person, brand, company, or word is important enough for special treatment.

Short names should open only after objective gates are met. The current working shape is:

- a minimum block-height delay after initial launch
- a minimum amount of time-weighted bonded value across the live ONT system
- usage and bidder thresholds, so one large capital source cannot trivially open short names alone

The exact thresholds are open. The principle is that `1-4` character names should not open just because time passed; they should open once ONT has enough visible usage and bonded commitment for the auction to be meaningfully public.

## What Ownership Lets You Do

The owner key controls the name after acquisition.

- Publish or update signed destination records.
- Map a name to payment destinations.
- Point to web, professional, messaging, or other records.
- Transfer the name to a new owner key.

Two key roles matter:

- The wallet key signs Bitcoin transactions.
- The owner key signs records and controls future updates or transfers.

In the current prototype model, losing the owner key means losing update and transfer authority for that name.

## Base-Layer Discipline

ONT is intentionally narrow at the base layer: Bitcoin anchors ownership, and owner-signed off-chain records make names useful.

- Ownership is public and auditable.
- Routine destination updates stay off-chain.
- Resolvers distribute signed records, but ownership comes from Bitcoin.

## Status

ONT is an active prototype, not a mainnet-ready production system.

Working pieces include private signet demos, auction state, bid packages, value publishing, resolver tooling, and transfer prototypes. Remaining work includes finalizing auction parameters, settlement duration, wallet UX, and outside review.

The product surface is [opennametags.org](https://opennametags.org). The public repository is [github.com/deekay/ont](https://github.com/deekay/ont).

## One-Sentence Summary

ONT uses Bitcoin to anchor ownership of human-readable names, owner-signed off-chain records to keep destinations updateable, bonded bitcoin to create cost without rent, and public launch auctions to allocate scarce names.
