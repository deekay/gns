# Architecture

This document describes the current shape of the Global Name System prototype as it exists in this repository.

## Mental Model

The system has two layers:

- **Convenience layer:** the hosted website, resolver, and demo infrastructure
- **Sovereign layer:** the open-source code, the claim/transfer artifacts, and the Bitcoin chain itself

The goal is to keep those layers aligned without locking users into the hosted convenience path.

## Trust Boundaries

### Website

The website is an explorer and transaction-prep tool.

It is responsible for:

- browsing names and state
- preparing claim and transfer handoffs
- generating PSBTs for supported demo flows
- helping users move between search, claim, and transfer flows

It is **not** the signing authority.

### Wallet

Sparrow or another external signer is the authorization boundary.

The wallet is responsible for:

- holding funding keys
- signing PSBTs
- broadcasting Bitcoin transactions

### Chain

The authoritative state is the Bitcoin-compatible chain the resolver is indexing:

- public signet for shared testing
- private signet for controlled demos
- regtest for exhaustive automated tests

## Main Components

### `apps/web`

The product surface:

- explorer
- claim prep
- transfer prep
- offline claim architect download

It uses the shared protocol and architect packages, and talks to the resolver for current state.

### `apps/resolver`

The read API and convenience backend:

- name resolution
- claim availability
- activity feeds
- pending commits
- tx provenance
- off-chain value records

It owns the current indexed snapshot and optional database-backed persistence.

## Off-Chain Value Distribution In v1

There is an important distinction between:

- **name ownership**, which is derived from the chain
- **value-record availability**, which depends on who is hosting signed value records

Today, the trust story is:

- any indexer can independently derive ownership from Bitcoin-compatible chain data
- any resolver can independently verify a signed value record against the current on-chain owner
- the hosted resolver is still the primary distribution point for off-chain value records in the v1 product

That means v1 is **not** centralized for ownership, but it is still somewhat centralized for the availability of the latest signed value record if only one resolver is hosting it.

This is an intentional v1 boundary, not the intended end state.

### Why this is acceptable for v1

- the signed value record is portable
- the resolver does not get to invent ownership
- the user is not cryptographically locked to one hosted service
- we are only running one public resolver at launch, so a resolver-fanout protocol would add complexity before it adds much practical resilience

### Planned future direction

The most likely next decentralization step is **client-side multi-resolver publish**, not resolver-to-resolver gossip as the first move.

That would mean:

- the user signs one value record locally
- the client publishes the same signed record to multiple resolvers
- each resolver verifies ownership and sequence independently
- clients can read from one resolver or several preferred resolvers

This keeps the security boundary clean:

- chain determines ownership
- signatures authorize value updates
- resolvers provide convenience and availability, not ultimate authority

Resolver federation or relay-based distribution may still make sense later, but they are explicitly outside the v1 scope.

## Known v1 Tradeoffs

These are the main issues we already understand and want reviewers to keep pushing on:

- **Transfer relay policy:** the current prototype transfer payload exceeds older conservative `OP_RETURN` relay limits. Modern Bitcoin Core defaults are more permissive, but transfer relay is still policy-dependent and broad compatibility is not yet guaranteed.
- **Post-maturity holding cost:** mature names no longer require bond continuity. That reduces permanent UTXO pressure, but it also means long names become cheap to hold indefinitely after the maturity period.
- **Resolver concentration:** ownership is chain-derived, but value-record availability is still vulnerable to concentration if only one or a few resolvers matter in practice.
- **Reveal-window exposure:** a failed reveal is not just a failed claim. It also exposes which name somebody wanted, which can make the next attempt more competitive. That makes the reveal window a market-structure question, not only a wallet UX question.
- **Owner-key recovery:** the prototype intentionally separates the wallet/funding key from the owner key. That keeps authority clean, but it means v1 has no built-in recovery path if the owner key is lost.

### `apps/indexer`

The indexing entrypoint.

Today it can run as a one-shot indexer for inspection/debugging or as part of service orchestration. The resolver also embeds the same state machine for the hosted runtime.

### `apps/cli`

The operator and power-user surface:

- build artifacts
- inspect artifacts
- sign and publish value records
- claim / transfer support flows
- smoke and demo support

### `packages/protocol`

Pure protocol definitions:

- constants
- event encoding / decoding
- signatures
- value records
- transfer packages

### `packages/architect`

Pure transaction-prep logic:

- claim package construction
- PSBT building
- wallet metadata helpers

This is the package we want to keep portable so it can run in the browser, in the CLI, or offline.

### `packages/bitcoin`

Bitcoin chain-source helpers:

- RPC transaction parsing
- block loading
- source metadata

### `packages/core`

The state machine:

- name lifecycle
- bond continuity
- transfer handling
- activity tracking
- snapshots

### `packages/db`

Persistence adapters for:

- resolver snapshots
- value-record storage

## Runtime Modes

### Fixture mode

Best for:

- local UI work
- quick HTTP smoke tests
- deterministic demos without a node

### Regtest

Best for:

- exhaustive automated integration tests
- deterministic funding
- protocol edge cases

### Private signet

Best for:

- guided demos
- Sparrow testing
- realistic but controlled lifecycle walkthroughs

### Public signet

Best for:

- shared-network smoke checks
- testing assumptions against a public environment

It is intentionally not the primary exhaustive test path because faucets and public infrastructure are unreliable.

## Product Flows

### Explorer

User jobs:

- search for a name
- understand its state
- inspect history and provenance
- decide what to do next

### Claim prep

User jobs:

- choose a name
- choose owner key material
- prepare commit/reveal artifacts
- hand the result to Sparrow or another signer

### Transfer prep

User jobs:

- start from an existing name
- understand which transfer mode fits
- generate the right handoff for gift, immature sale, or mature sale

## Why The Offline Architect Exists

Hosted prep is the convenience layer.

The offline architect exists for users who want a more sovereign path:

- download the single-file tool
- paste trusted wallet metadata and UTXOs
- generate artifacts locally
- sign in Sparrow

That keeps high-value preparation closer to the Ian Coleman model: transparent and runnable without trusting a live hosted JavaScript bundle.

## What Still Needs Improvement

- transfer-side offline architect parity
- cleaner separation between hosted convenience and repo/operator docs
- eventual durable database-backed indexing as the normal default, not an optional mode
- long-term cleanup of infrastructure-specific defaults before broad open-source distribution
