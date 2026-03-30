# Global Name System (GNS)

Global Name System is a human-readable naming system anchored to Bitcoin.

It is partly a replacement for DNS, but that is not the whole story. GNS is meant to give people, agents, projects, payment flows, and services a name they control more directly, without depending on a registrar, a platform handle, or a rented suffix.

The hosted website is mainly a tool surface:

- browse names
- check availability
- prepare claims
- prepare transfers
- fund the private signet demo

This repository is where the fuller project explanation lives.

Human-facing amounts in GNS use integer bitcoin notation alongside the conventional BTC equivalent. Example: `₿50,000 (0.0005 BTC)`.

## Start Here

If you want the fastest first walkthrough, use the hosted private demo:

1. Open [setup](https://globalnamesystem.org/setup) and run the Sparrow helper shown there.
2. Request demo coins into the same Sparrow wallet you plan to spend from.
3. Open [claim prep](https://globalnamesystem.org/claim), choose the name, and save the owner key + backup package.
4. Build the commit and reveal PSBTs, sign them in Sparrow, and watch the name appear in [explore](https://globalnamesystem.org/explore).

Keep these distinctions in mind:

- the **wallet key** signs Bitcoin transactions
- the **owner key** controls the name later for value updates and transfers
- the hosted site prepares the flow, but your wallet still signs and broadcasts it
- in v1, losing the **owner key** means losing update and transfer authority for that name

## Quick Map

```mermaid
flowchart LR
  A["Wallet Key"] -->|"signs"| B["Claim / Transfer Bitcoin Transactions"]
  B -->|"records ownership on"| C["Bitcoin Chain"]
  C -->|"canonical state for"| D["Resolver / Website"]
  E["Owner Key"] -->|"signs"| F["Value Record / Profile Bundle"]
  F -->|"published to"| D
```

GNS has two different authority layers:

- the **wallet key** signs Bitcoin transactions that establish or transfer ownership
- the **owner key** signs the off-chain value record that says what the name points to

## Pick The Path That Fits

There are three practical ways to use GNS today:

| Path | Best for | What you trust | Works today |
| --- | --- | --- | --- |
| `Hosted Private Demo` | Fastest first walkthrough | Hosted site, hosted resolver, private demo chain | Yes |
| `Self-Hosted Website + Resolver` | Running your own browsing and resolution surface | Your own web stack and resolver; optionally your own Bitcoin backend | Yes |
| `Offline / Higher-Trust Claim Prep` | Preparing claims without depending on the hosted site UI | Local browser bundle plus your own signer | Yes |

Hosted private demo:
- website: [https://globalnamesystem.org](https://globalnamesystem.org)
- setup: [https://globalnamesystem.org/setup](https://globalnamesystem.org/setup)
- claim prep: [https://globalnamesystem.org/claim](https://globalnamesystem.org/claim)

Self-hosted website + resolver:
- quick guide: [SELF_HOSTING.md](./docs/core/SELF_HOSTING.md)

Offline / higher-trust claim prep:
- offline architect: [https://globalnamesystem.org/claim/offline](https://globalnamesystem.org/claim/offline)

## What Works Today

| Capability | Status | Notes |
| --- | --- | --- |
| Hosted private demo claims | Yes | Best first walkthrough today |
| Self-hosted website + resolver | Yes | Fixture-backed by default; can point at your own backend later |
| Browser value publishing | Yes | Owner-signed in the browser |
| Profile bundle value records | Yes | One record can point to several destinations |
| Transfers | Prototype | Works in the prototype, but not yet mainnet-ready |
| Mainnet-ready usage | Not yet | Still an active prototype |

## Which Key Does What

| Key | What it controls | Used for | If lost |
| --- | --- | --- | --- |
| `Wallet key` | Bitcoin UTXOs | Signing claim and transfer transactions | You lose control of the bitcoin and cannot complete those transactions |
| `Owner key` | Name authority after claim | Signing value updates and authorizing transfers | In v1, you lose update and transfer authority for that name |

## Claim Lifecycle At A Glance

| Phase | What it means | What you do next |
| --- | --- | --- |
| `Prepare` | Pick the name, create or paste the owner key, and build the claim plan | Save the owner key and backup package |
| `Commit Broadcast` | The hidden claim transaction is on-chain | Wait for confirmation |
| `Reveal Broadcast` | The name is published within the reveal window | Watch the name move into settlement |
| `Settling` | The claim succeeded and bond continuity still matters | Keep the bond intact until maturity |
| `Active` | The name is fully settled | Publish values, update the profile bundle, or transfer later |
| `Released` | The name returned to the pool | Start a fresh claim if you still want it |

## Hosted Demo Walkthrough

If you are brand new, this is the shortest path through the hosted product.

### 1. Start at the homepage

Use the homepage to look up a name, see the quick model, and choose whether you want `Setup`, `Claim`, or `Explore`.

![GNS homepage](./docs/assets/website-home.png)

### 2. Set up Sparrow and request demo coins

Run the helper shown on the setup page, confirm Sparrow is pointed at the private signet demo, then fund the same wallet you plan to spend from.

![GNS setup](./docs/assets/website-setup.png)

### 3. Prepare the claim

On claim prep, pick the name, generate or paste the owner key, save the backup package, and build the commit/reveal signer handoff.

![GNS claim prep](./docs/assets/website-claim.png)

### 4. Publish what the name points to

Once the name is active, use the values tool to publish a single target or a bundled profile with several destinations.

![GNS value bundle](./docs/assets/website-values-bundle.png)

## What GNS Is

GNS names are first-class strings like `satoshi`, not hierarchical domains like `satoshi.com`.

Ownership is derived from Bitcoin transactions. Mutable value records stay off-chain and are signed by the current owner key. That means GNS uses Bitcoin as a notary for ownership and state transitions, not as a general-purpose database.

The result is a naming layer that can point to:

- identities and profiles
- payment endpoints
- APIs and services
- software or agent endpoints
- whatever other owner-signed resources the ecosystem chooses to support

## Why It Exists

Most names on the internet are controlled by someone other than the person using them.

- social handles can be suspended or reassigned by platforms
- DNS domains depend on registries, registrars, DNS hosts, CDNs, billing, and account security
- human-readable payment or identity aliases usually inherit one of those stacks underneath

GNS is trying to offer a different model:

- no suffixes
- no registrar
- no annual renewal rent
- no protocol operator selling the namespace
- publicly verifiable ownership history

So the right framing is not just “better DNS.” It is closer to a sovereign naming layer for the internet resources humans want to access and remember.

## How Ownership Works

### Claims

Claims use a commit/reveal flow.

1. `COMMIT` hides the intended name while establishing the claim attempt.
2. `REVEAL` publishes the name within the allowed reveal window.
3. the name then enters a settlement period during which bond continuity matters

### Bonds

Claims are backed by locked bitcoin bonds, not fees paid to an issuer.

- shorter names require larger bonds
- longer names quickly fall toward a floor
- the bond is not paid to GNS
- the claimer keeps the bitcoin and only gives up liquidity for the settlement period

### Transfers

Transfers move owner authority from one pubkey to another.

- settling names still require successor-bond continuity
- active names no longer require that continuity
- the owner key, not a resolver, is what authorizes future value updates
- after a transfer, the old owner can no longer publish new value records for that name
- if the owner key is lost, v1 has no built-in protocol recovery path even if the user still controls the wallet that funded the claim

### Values

What a name points to is off-chain by default.

- values are signed by the current owner
- authenticity is cryptographic
- availability depends on one or more resolvers retaining a copy

## Bonding And Namespace Allocation

GNS tries to make namespace allocation as neutral as possible.

It does that by using locked bitcoin bonds instead of:

- registrar pricing tiers
- recurring rent
- reserved-name programs
- founder allocation
- whitelist access
- protocol-level sales of names

At launch, everyone follows the same public curve.

### Bond Curve

The current launch curve is:

- `₿100,000,000 (1 BTC)` for a 1-character name
- each additional character halves the required bond
- the bond floors at `₿50,000 (0.0005 BTC)` for names of length 12 and longer

That makes short names economically expensive to corner while keeping the long tail accessible.

### Why The Namespace Stays Broad

Using the current v1 alphabet (`a-z0-9`), there are about `2.18 billion` possible 6-character names.

At the current 6-character bond of `₿3,125,000 (0.03125 BTC)`, claiming all of them would require about `68 million BTC`, which is more than three times Bitcoin’s total `21 million` supply.

Even if every bitcoin in existence were somehow devoted to 6-character names, only about `672 million` of them could be bonded. The majority of that namespace would still remain open.

That does not make allocation perfectly neutral. Early participants, wealthy claimants, and fee conditions will matter. But it does mean the namespace is structurally hard to monopolize at scale, especially once names are long enough that combinatorial supply outgrows available capital.

### Important v1 Tradeoff

Mature names currently remain valid without ongoing bond continuity.

That keeps the UTXO footprint more self-cleaning, but it also means long names can become inexpensive to hold indefinitely after the settlement period. That is a deliberate v1 tradeoff, not an accident.

## Blockspace Footprint

GNS keeps its pure naming payload small, but it still consumes real Bitcoin blockspace because each successful claim is a pair of ordinary Bitcoin transactions.

Current implementation summary:

- pure naming payload per completed claim: about `117–148 bytes`
- observed full claim footprint: about `404 vbytes`
- observed full serialized footprint: about `566 raw bytes`

So GNS is compact as protocol data, but it still competes in the normal fee market like any other transaction. The main brakes on overuse are:

- fee pressure
- bond capital lockup
- temporary UTXO pressure during settlement

## Resolver And Availability Model

GNS has two different availability stories:

### Ownership

Ownership is chain-derived.

- any operator with chain data can reconstruct the canonical name set
- a resolver does not get to invent ownership
- a resolver going offline does not destroy the registry

### Values

Value records are different.

- they are portable and owner-signed
- any compatible resolver can verify them
- but in v1 their availability is only as decentralized as the set of resolvers people actually publish to and query

That means v1 is decentralized for ownership, but still only partly decentralized for value availability. The most likely next step is client-side multi-resolver publish, not mandatory resolver gossip as the first move.

## Hosted Product

The current hosted product is here:

- Home / lookup: [https://globalnamesystem.org](https://globalnamesystem.org)
- Explore: [https://globalnamesystem.org/explore](https://globalnamesystem.org/explore)
- Claim prep: [https://globalnamesystem.org/claim](https://globalnamesystem.org/claim)
- Transfer prep: [https://globalnamesystem.org/transfer](https://globalnamesystem.org/transfer)
- Setup: [https://globalnamesystem.org/setup](https://globalnamesystem.org/setup)
- Offline claim architect: [https://globalnamesystem.org/claim/offline](https://globalnamesystem.org/claim/offline)

The website is intentionally becoming more tool-oriented over time. The deeper explanation, economics, and design rationale are expected to live here in the repo.

## Current Demo Wallet Support

For the hosted private signet demo today:

- `Sparrow`: supported path
- `Electrum`: not supported in the hosted private-signet flow
- `Other PSBT wallets`: plausible, but not yet validated end to end

Why:

- the current private demo exposes Bitcoin Core RPC over an SSH tunnel
- Sparrow works cleanly with that path
- Electrum expects an Electrum server, which this demo does not currently run

## Quick Start

### Run the local prototype

```bash
npm install
npm run dev:all
```

Then open:

- `http://127.0.0.1:3000`

### Run your own web + resolver stack

```bash
cp .env.example .env
npm run selfhost:doctor
npm run selfhost:up
```

Then open:

- `http://127.0.0.1:3000`

That default path runs against the bundled fixture chain so you can use your own site and resolver immediately. If the doctor step says Docker is missing, install Docker Desktop or Docker Engine first. To point the stack at your own Bitcoin backend later, use [SELF_HOSTING.md](./docs/core/SELF_HOSTING.md).

### Run the controlled-chain suite

```bash
npm run test:regtest-cli-suite
```

### Private signet demo with Sparrow

- guide: [SPARROW_PRIVATE_SIGNET.md](./docs/demo/SPARROW_PRIVATE_SIGNET.md)
- one-command session helper: `/path/to/gns/scripts/start-private-signet-sparrow-session.sh`
- official Sparrow download: [https://sparrowwallet.com/download/](https://sparrowwallet.com/download/)

## Repository Map

This is a TypeScript monorepo using `npm` workspaces.

### Product surfaces

- `apps/web`: hosted site, explorer, claim prep, transfer prep, setup, offline architect bundle
- `apps/cli`: claim, transfer, value-record, and operator tooling

### Chain and resolution services

- `apps/resolver`: read API, value-record API, provenance endpoints, recent activity
- `apps/indexer`: long-running and one-shot chain indexing entrypoint

### Shared libraries

- `packages/protocol`: wire format, constants, signatures, value records, transfer packages
- `packages/bitcoin`: Bitcoin RPC parsing and chain-source helpers
- `packages/core`: state machine, indexing logic, snapshots, activity tracking
- `packages/db`: snapshot and value-record persistence adapters
- `packages/architect`: pure transaction-prep and PSBT-building logic shared by web and CLI

### Scripts

- `scripts/bootstrap-*.sh`: VPS bootstrap and domain setup
- `scripts/deploy-*.sh`: VPS deploy flows
- `scripts/*sparrow*`: local Sparrow + private signet helpers
- `scripts/*demo*` and `scripts/*suite*`: smoke, demo, and regtest integration flows

## Documentation

Start here:

- [docs/README.md](./docs/README.md): documentation index
- [docs/core/SELF_HOSTING.md](./docs/core/SELF_HOSTING.md): run your own website + resolver stack
- [docs/core/ARCHITECTURE.md](./docs/core/ARCHITECTURE.md): system structure, trust boundaries, and runtime modes
- [docs/core/DECISIONS.md](./docs/core/DECISIONS.md): design decisions and open tradeoffs
- [docs/core/TESTING.md](./docs/core/TESTING.md): fixture, regtest, public signet, and private signet testing paths
- [CONTRIBUTING.md](./CONTRIBUTING.md): local setup and contribution workflow

More exploratory and draft-oriented material lives under [`docs/research/`](./docs/research/).

## Status

GNS is currently in active prototype phase.

It is useful for local, regtest, signet, and private-signet experimentation, but it is **not ready for mainnet use**.

Important known issues and tradeoffs include:

- the current transfer payload shape exceeds older conservative `OP_RETURN` relay limits, so relay compatibility still depends on node policy even though modern Bitcoin Core defaults are more permissive
- mature-name permanence makes long-name holding cheap after settlement
- value-record availability can still concentrate around a small number of resolvers in v1

## License

This repository is licensed under the [MIT License](./LICENSE).
