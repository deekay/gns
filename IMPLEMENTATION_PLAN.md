# Global Name System Implementation Plan

## Purpose

This document turns the current Global Name System / GNS protocol direction into a concrete implementation plan for a public prototype on signet.

The goal is not to freeze the final mainnet protocol immediately. The goal is to:
- build a working reference implementation
- test the protocol shape on signet
- gather feedback from Bitcoin-focused reviewers
- tighten the spec before any canonical mainnet launch

## Build Goal

Ship a signet prototype with:
- a long-running Global Name System / GNS indexer
- a read-only resolver API
- a CLI or signer-capable client
- a website for browsing, search, provenance, and transaction assembly

The signet prototype should demonstrate:
- name availability checks
- commit/reveal claiming
- bond continuity tracking
- ownership transfer
- off-chain value publishing and lookup
- independent reproducibility from Bitcoin data

## Working Assumptions

These assumptions are already strong enough to build against:
- names are `[a-z0-9]{1,32}` and canonicalized to lowercase
- v1 on-chain events are only `COMMIT`, `REVEAL`, and `TRANSFER`
- values are off-chain by default
- initial bond curve is `base_sats = 100,000,000` and `floor_sats = 50,000`
- initial maturity is `52,000` blocks with yearly epochs and a `4,000`-block floor
- reveal window is `24` blocks
- pre-maturity transfer must preserve bond continuity
- same-block competing commits are tie-broken by block transaction order

Still provisional for prototype:
- exact byte layout for `COMMIT`, `REVEAL`, `TRANSFER`
- exact payload format for `0x01` bitcoin payment target
- some reorg and malformed-event edge-case handling

## Recommended Architecture

### Core Components

1. `bitcoin-node`

Use a signet-capable Bitcoin Core node as the source of block and transaction truth.

Responsibilities:
- sync signet chain
- expose RPC and ZMQ or polling access
- support transaction broadcast for prototype flows

2. `gns-indexer`

A long-running service that:
- scans signet blocks
- parses GNS events
- tracks claim state, ownership state, bond continuity, and maturity
- stores normalized indexed state in a database
- handles reorg rollback and replay

3. `gns-resolver`

A read-only API layered on indexed state.

Responsibilities:
- resolve names to current state
- return latest valid off-chain value record
- return provenance for events and names

4. `gns-cli`

A local signer-oriented tool that:
- derives or imports owner keys
- prepares and signs GNS transactions
- signs off-chain value records
- validates bond continuity before signing
- broadcasts transactions when configured to do so

5. `gns-web`

A website that:
- queries the resolver
- shows availability, ownership, and provenance
- prepares unsigned or partially prepared claim/reveal/transfer flows
- helps users publish off-chain value records

The website should not be the only execution path. Every meaningful action should also be possible with the CLI.

## Recommended Hosting Split

### Use Vercel For

- Next.js website frontend
- lightweight read-only API proxying, if needed
- static documentation

### Do Not Use Vercel For

- the long-running indexer
- Bitcoin node operations
- background chain synchronization
- durable reorg-sensitive processing

### Use A Separate Always-On Service For

- Bitcoin Core signet node
- GNS indexer
- PostgreSQL database
- resolver backend

Good fits:
- Hetzner
- Fly.io
- Render
- Railway
- EC2
- any VPS or container host with persistent disk and long-running process support

## Recommended Prototype Stack

Because the project is starting from an empty workspace, the simplest practical stack is:

- `TypeScript`
- `Node.js`
- `Next.js` for the website
- `PostgreSQL` for indexed state
- `pnpm` workspace or monorepo layout

Suggested structure:

```text
apps/
  web/          Next.js website
  indexer/      long-running GNS indexer
  resolver/     read-only HTTP API
  cli/          signer and transaction preparation tool

packages/
  protocol/     wire format encoders/decoders and constants
  core/         state transition and validation logic
  db/           schema and data access
  bitcoin/      RPC, PSBT, and transaction helpers
```

Why this stack:
- shared types across web, resolver, CLI, and indexer
- fast prototype velocity
- easy deployment for the website
- easier to iterate on provisional wire formats

If the prototype succeeds and performance becomes a concern, the indexer can later be rewritten in Go or Rust without changing the public resolver shape.

## Provisional Wire-Format Direction

These are recommended prototype choices so implementation can start before the final launch spec is frozen.

### COMMIT

Target:
- single conservative OP_RETURN payload

Recommended payload:

```text
magic(3) | version(1) | type(1) | owner_pubkey(32) | commit_hash(32)
```

Commit hash input:

```text
sha256(name_len | normalized_name | owner_pubkey | nonce64)
```

### REVEAL

Target:
- single conservative OP_RETURN payload

Recommended payload:

```text
magic(3) | version(1) | type(1) | commit_txid(32) | nonce64(8) | name_len(1) | normalized_name(<=32)
```

This fits under the 32-character cap.

### TRANSFER

Target:
- possibly chunked or otherwise more compact than the human-readable form

Recommended signed fields:

```text
prev_state_txid(32) | new_owner_pubkey(32) | flags(1) | successor_bond_vout(1)
```

With a Schnorr signature over the transfer body.

Notes:
- `successor_bond_vout` is required for immature-name transfers
- mature transfers may use a sentinel `vout` value if bond continuity is no longer relevant
- transfer is the only v1 event likely to need a richer carrier format
- the transfer payload alone should not be treated as sufficient for a mature-name sale
- the reference implementation should use a cooperative transaction flow for sale transfers, especially after maturity

## Data Model

The indexer should maintain these core entities:

### names

- `name`
- `status` (`unclaimed`, `pending`, `immature`, `mature`, `invalid`)
- `current_owner_pubkey`
- `claim_commit_txid`
- `claim_reveal_txid`
- `claim_height`
- `maturity_height`
- `required_bond_sats`
- `active_bond_txid`
- `active_bond_vout`
- `active_bond_value_sats`
- `last_state_txid`

### events

- `txid`
- `block_height`
- `event_type`
- `parsed_payload`
- `validity`
- `linked_name`

### value_records

- `name`
- `owner_pubkey`
- `sequence`
- `value_type`
- `value_payload`
- `signature`
- `source`
- `observed_at`

For v1, assume:

- signed value records are portable and can be verified by any resolver
- the first hosted product may still rely on a single public resolver as the main distribution point for those records
- this is acceptable for v1 because ownership remains chain-derived and independently reproducible
- broader value-record resilience can be added later through client-side multi-resolver publish, before introducing resolver gossip or relay-based coordination

### blocks

- `height`
- `hash`
- `prev_hash`
- `processed_at`

## Resolver API v1

Recommended minimal read-only endpoints:

### `GET /name/{normalized_name}`

Returns:
- normalized name
- status
- owner pubkey
- claim height
- maturity height
- maturity status
- bond information
- relevant txids
- provenance references

### `GET /name/{normalized_name}/value`

Returns:
- latest valid off-chain value record
- sequence
- owner pubkey used to authorize it
- provenance fields

### `GET /tx/{txid}`

Returns:
- parsed GNS event if present
- raw decoded fields
- validation status
- links to related name state

## Website Scope v1

The prototype website should support:

### Browse And Search

- search a normalized name
- show available, pending, immature, or mature state
- show ownership and maturity details
- show linked signet txids

### Claim Flow Assistance

- explain required bond amount
- explain reveal timing
- generate commit input data
- generate reveal input data after commit confirms
- export unsigned transaction or PSBT data for a signer flow

### Transfer Flow Assistance

- show whether the name is still immature
- show the current bond outpoint
- prepare transfer data including successor bond output index
- distinguish gift transfers from sale transfers
- for sale transfers, prepare a single delivery-versus-payment transaction skeleton
- export unsigned transaction or PSBT data

### Off-Chain Value Publishing

- prepare value records
- sign locally via CLI/wallet flow
- submit to resolver-backed storage or publication layer

### GNS Signet Faucet (UX Beta)

- provide small amounts of sBTC (e.g., 10,000 - 50,000 sats) for testing
- integrated into the claim planning flow for zero-friction onboarding
- rate-limited and protected to prevent automated draining

### Provenance

- explain exactly which chain events support the current state
- show when the answer depends on off-chain value data rather than on-chain ownership data

## CLI Scope v1

The CLI should support:

- `gns name lookup <name>`
- `gns claim prepare <name>`
- `gns claim reveal <commit_txid> <name>`
- `gns transfer prepare <name> <new_owner_pubkey>`
- `gns value sign <name> ...`
- `gns value publish ...`
- `gns wallet scan`

Minimum capabilities:
- derive/import owner key
- produce and sign prototype transactions
- detect and protect live bond UTXOs
- validate successor bond continuity before signing
- support cooperative PSBT-style sale flows so mature-name sales are bound to the exact transaction

## Phase Plan

### Phase 0: Skeleton And Constants

Goal:
- establish the workspace and shared package layout

Deliverables:
- monorepo layout
- shared protocol constants
- normalization helpers
- bond and maturity calculators
- provisional wire-format types

Exit criteria:
- packages compile
- constants match the current decision log

### Phase 1: Local Protocol Engine

Goal:
- make GNS state transitions executable without any UI

Deliverables:
- event parsers
- name state machine
- bond continuity validator
- maturity and epoch logic
- deterministic same-block tie-break logic

Exit criteria:
- unit tests cover claim, reveal, maturity, transfer, and invalidation cases

### Phase 2: Regtest Prototype

Goal:
- prove end-to-end transaction logic locally

Deliverables:
- regtest Bitcoin Core integration
- commit/reveal transaction creation
- transfer transaction creation
- atomic sale transaction creation for gift and sale transfer modes
- off-chain value signing
- local indexer processing from regtest blocks

Exit criteria:
- can claim, reveal, transfer, and resolve a name on regtest
- can deliberately break bond continuity and observe release behavior

### Phase 3: Signet Public Beta & Community Review

Goal: Run an open prototype on Bitcoin Signet to gather technical feedback, identify edge cases, and stress-test the protocol incentives.

**Focus Areas:**
- **Protocol Hardening:** Encouraging technical reviewers to identify reorg handling issues, bond continuity exploits, or tie-breaking ambiguities.
- **UX Refinement:** Testing the "Commit/Reveal" flow and resolution logic with early adopters.
- **Ecosystem Tooling:** Launching the GNS Signet Faucet and reference resolution APIs to lower the barrier for developer participation.
- **Alternative Approaches:** Remaining open to protocol adjustments based on community input before constants are frozen.

### Phase 4: Path to Mainnet (Stability-Driven)

Goal: A fair, neutral launch of the canonical namespace once the protocol is proven stable.

- **Criteria for Launch:** Mainnet will be scheduled only after the Signet prototype has demonstrated consistent stability and the protocol constants (bond curves, maturity schedules) have undergone public review.
- **Fair Launch Block:** A future Bitcoin block height will be announced in advance to serve as the "Starting Gun."
- **Neutrality:** The protocol remains committed to no reserved names and no founder allocation.

### Phase 5: Ecosystem & Wallet Support

Goal: Scale the utility of the namespace through integration and tooling.

- **Resolution Hosting:** Reference implementations for serving signed off-chain resolution records.
- **Wallet Integrations:** Partnering with major Bitcoin wallets (Sparrow, Electrum, Alby) for native GNS resolution.

### Phase 6: Review Loop

Goal:
- pressure-test protocol and implementation with Bitcoin-focused reviewers

Deliverables:
- documented reviewer questions
- measured commit/reveal/transfer transaction sizes
- observed UTXO growth under prototype usage
- list of protocol changes before final freeze

Exit criteria:
- wire format and unresolved constants are either frozen or intentionally deferred

## Testing Strategy

### Regtest

Use for:
- fast transaction iteration
- edge-case state testing
- failure and repair scenarios

### Signet

Use for:
- public prototype
- realistic latency and confirmation timing
- external review and demos

### Testnet

Not required for the initial proof of concept unless broader wallet-ecosystem compatibility testing becomes important.

## Security And Safety Requirements

The prototype should enforce these rules even before launch:

- never require users to paste seed phrases into the website
- clearly label all provisional protocol behavior
- isolate bond UTXOs in CLI and wallet logic
- fund fees separately from bond outputs when possible
- make transfer successor bond output explicit before signing
- show the user when a name is pending rather than final
- show when value resolution depends on off-chain data

## Mainnet Freeze Checklist

Do not present a canonical mainnet launch until these are frozen:
- exact wire format
- exact value payload definitions
- exact reorg and malformed-event handling
- resolver and provenance expectations
- wallet safety behavior
- user-facing launch and fairness documentation

## Immediate Next Steps

1. Create the workspace skeleton and shared packages.
2. Implement normalization, bond, and maturity calculators.
3. Encode provisional `COMMIT`, `REVEAL`, and `TRANSFER` formats.
4. Build a regtest harness and state-machine tests.
5. Stand up the signet indexer and resolver.
6. Add the website once the resolver answers are stable.
