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

That split is the heart of ONT. Bitcoin is used for scarce ownership and state transitions, not as a general-purpose data store. Records stay lightweight, updateable, and portable across resolvers.

## Bonds, Not Rent

ONT uses bonded bitcoin to create real cost without paying a third party to allocate scarcity.

A winning bidder does not pay ONT, burn bitcoin, or rent the name annually. The bitcoin remains the owner’s bitcoin in self-custody, but it is committed during settlement. The cost is liquidity, time, and opportunity cost.

That makes name allocation costly enough to discourage careless hoarding, while avoiding the usual model where a registry sells or rents names as a central issuer.

## Launch Allocation

The current launch model is a single auction lane.

- Every launch-eligible name is allocated by auction.
- There is no ordinary direct-allocation lane.
- There is no reserved-name lane.
- There is no pre-launch reservation system.
- There is no hand-built list of brands, public figures, companies, or generic words.

This is the biggest recent simplification. Earlier designs explored special handling for famous people, brands, generic words, and other high-salience names. That created hard governance questions: who decides what belongs on the list, how boundary cases are defended, and how to avoid insider favoritism.

The current rule is cleaner:

> If a launch-eligible name matters to more than one participant, the auction discovers that.

For most long-tail names, the experience can still be simple. Start an auction. If nobody else bids during the public window, you win at your opening bid. If others care, the price is discovered in the open.

## Short Names

Names of length `1-4` are held for a later short-name auction wave.

Names of length `5-32` are eligible at launch.

This is not a reserved list. It is an objective scarcity rule. Very short names are structurally scarce, so they should not clear before ONT has enough public attention. The boundary is easy to verify and does not require judging whether a person, brand, company, or word is important enough for special treatment.

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

## What ONT Is Not

ONT is not a protocol sale, rent system, or editorial naming authority.

- ONT does not sell names to users.
- ONT does not collect annual rent.
- ONT does not maintain a special-case reserved list.
- ONT does not rely on one resolver to define who owns a name.
- ONT does not put routine destination updates on-chain.

The system is intentionally narrow at the base layer: Bitcoin anchors ownership, and owner-signed off-chain records make names useful.

## Current Launch Shape

The current working launch direction is:

- one auction rule for all launch-eligible names
- `5-32` character names eligible at launch
- `1-4` character names delayed to a later short-name wave
- auction windows measured in days, with a soft close for late bidding
- winning bids treated as bonded bitcoin, not payments to ONT
- settlement duration and exact auction parameters still to be finalized

The current bias is to avoid decade-scale Bitcoin-native locks at launch. Long timelocks raise bootstrapping and quantum-risk concerns, and the single-lane auction model gets much of its fairness from public price discovery rather than relying on extremely long lock duration.

## Status

ONT is an active prototype, not a mainnet-ready production system.

Working pieces include private signet demos, auction state, bid packages, value publishing, resolver tooling, and transfer prototypes. Remaining work includes finalizing launch parameters, cleaning up older direct-claim assumptions, hardening the auction flow, improving wallet UX, and validating the system with more outside review.

The product surface is [opennametags.org](https://opennametags.org). The public repository is [github.com/deekay/ont](https://github.com/deekay/ont).

## One-Sentence Summary

ONT uses Bitcoin to anchor ownership of human-readable names, owner-signed off-chain records to keep destinations updateable, and one auction rule to allocate scarce names without reserved lists, rent, or issuer-controlled sales.
