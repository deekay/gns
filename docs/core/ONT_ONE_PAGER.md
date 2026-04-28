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
     bond: 6,250,000 sats

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

| Name length | Auction treatment | Example opening floor |
| --- | --- | --- |
| `1` | same auction lane | `100,000,000 sats (1 BTC)` |
| `2` | same auction lane | `50,000,000 sats (0.5 BTC)` |
| `3` | same auction lane | `25,000,000 sats (0.25 BTC)` |
| `4` | same auction lane | `12,500,000 sats (0.125 BTC)` |
| `5` | same auction lane | `6,250,000 sats (0.0625 BTC)` |
| `6` | same auction lane | `3,125,000 sats (0.03125 BTC)` |
| `12+` | same auction lane | `50,000 sats (0.0005 BTC) floor` |

The floor starts the auction. The auction can clear higher when multiple bidders care about the same name.

## Launch Auctions

At launch, valid names open by auction.

- A participant opens a public auction for a name.
- If nobody else bids, the opener can win at the opening floor.
- If others bid, open bidding discovers the final bond.
- The winner controls the owner key after settlement.

The rule is simple:

> If a valid name matters to more than one participant, the auction discovers that.

For most long-tail names, the experience can still be simple. Start an auction. If nobody else bids during the public window, you win at your opening bid. If others care, the price is discovered in the open.

## Length Floors

Every valid name can enter the same auction flow.

Very short names are structurally scarce, so they start with higher objective opening floors. The floor comes from length, not from deciding whether a person, brand, company, or word deserves special treatment.

Length floors make early bulk capture of the scarcest names materially expensive, while keeping every valid name in the same auction flow.

The exact floor curve can still be tuned, but the launch rule stays simple: one auction lane for every valid name.

## What Ownership Lets You Do

The owner key controls the name after acquisition.

- Publish or update signed destination records.
- Map a name to payment destinations.
- Point to web, professional, messaging, or other records.
- Transfer the name to a new owner key.

Two key roles matter:

- The wallet key signs Bitcoin transactions.
- The owner key signs records and controls future updates or transfers.

In the current model, losing the owner key means losing update and transfer authority for that name.

## Base-Layer Discipline

ONT is intentionally narrow at the base layer: Bitcoin anchors ownership, and owner-signed off-chain records make names useful.

- Ownership is public and auditable.
- Routine destination updates stay off-chain.
- Resolvers distribute signed records, but ownership comes from Bitcoin.

## Status

ONT is an active demo/prototype, not a mainnet-ready production system.

Working pieces include private signet demos, auction state, bid packages, value publishing, resolver tooling, and transfer handoffs. Remaining work includes finalizing auction parameters, settlement duration, wallet UX, and outside review.

The product surface is [opennametags.org](https://opennametags.org). The public repository is [github.com/deekay/ont](https://github.com/deekay/ont).

## One-Sentence Summary

ONT uses Bitcoin to anchor ownership of human-readable names, owner-signed off-chain records to keep destinations updateable, bonded bitcoin to create cost without rent, and public auctions to allocate scarce names.
