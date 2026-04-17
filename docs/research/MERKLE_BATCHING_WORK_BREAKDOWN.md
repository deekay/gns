# Merkle Batching Work Breakdown

This note turns the Merkle batching design into an engineering work map across the current repository.

Use it together with:

- [MERKLE_BATCHING_V0.md](./MERKLE_BATCHING_V0.md)
- [MERKLE_BATCHING_V0_DECISIONS.md](./MERKLE_BATCHING_V0_DECISIONS.md)

## Goal

Implement ordinary-lane commit batching with explicit reveal-side proof verification while preserving:

- existing bond economics
- the high-level commit / reveal lifecycle
- inspectable provenance
- website-assisted review flows
- full automated and manual validation

## Repo Surfaces Affected

### `packages/protocol`

Primary files:

- `packages/protocol/src/constants.ts`
- `packages/protocol/src/events.ts`
- `packages/protocol/src/wire.ts`
- `packages/protocol/src/claim-package.ts`
- `packages/protocol/src/protocol.test.ts`

Responsibilities:

- add batch-specific event-type definitions
- define batch-anchor payload shapes
- define batched reveal and proof-chunk payload shapes
- implement Merkle leaf / node hashing helpers
- implement proof verification helpers
- extend claim-package structures if batched artifacts need extra fields
- add protocol-level tests for all new encodings and verifiers

### `packages/core`

Primary files:

- `packages/core/src/engine.ts`
- `packages/core/src/indexer.ts`
- `packages/core/src/state.ts`
- `packages/core/src/core.test.ts`
- `packages/core/src/indexer.test.ts`
- `packages/core/src/snapshot.test.ts`

Responsibilities:

- teach event extraction to recognize new batch event types
- materialize pending batched commits from anchor transactions
- verify batched reveal proofs against the anchored root
- preserve current claim precedence and reveal-window logic
- record provenance so batched claims remain inspectable
- ensure snapshots persist any new provenance/state fields cleanly

### `packages/architect`

Primary file:

- `packages/architect/src/index.ts`

Responsibilities:

- add batched ordinary-claim artifact builders
- keep legacy single-commit artifact builders intact during transition
- build explicit proof-package and reveal-side artifacts
- keep signer handoff formats legible for wallet use
- ensure commit/reveal artifact bundles clearly indicate batching mode

### `apps/cli`

Primary files:

- `apps/cli/src/index.ts`
- `apps/cli/src/submit-claim.ts`
- `apps/cli/src/builder.ts`
- `apps/cli/src/builder.test.ts`
- `apps/cli/src/submit-claim.test.ts`
- `apps/cli/src/signer.ts`
- `apps/cli/src/signer.test.ts`

Responsibilities:

- expose batched ordinary-claim build paths in the CLI
- make batched versus legacy mode explicit in commands and JSON output
- support inspection of batch anchor, proof metadata, and reveal requirements
- verify the current signer path still works without input-type regressions
- extend submit-claim automation if that path is meant to support batched ordinary claims

Note:

- `apps/cli/src/signer.ts` currently supports `witnesspubkeyhash` inputs only
- Merkle batching should ideally avoid forcing signer-model changes in its first rollout

### `apps/indexer`

Primary file:

- `apps/indexer/src/index.ts`

Responsibilities:

- mostly inherits behavior from `@ont/core`
- ensure snapshot boot / replay still works after new state fields are added
- provide a simple validation surface for one-shot indexing of batched claims

### `apps/resolver`

Primary files:

- `apps/resolver/src/index.ts`
- `apps/resolver/src/value-store.ts`

Responsibilities:

- expose batched claim provenance through resolver responses
- keep availability and pending-commit endpoints coherent
- ensure polling, snapshotting, and replay survive batched claim state

### `apps/web`

Primary files:

- `apps/web/src/index.ts`
- `apps/web/src/client-script.ts`
- `apps/web/src/page-shell.ts`
- `apps/web/src/offline-claim-page.ts`
- `apps/web/src/offline-claim-bundle.ts`
- `apps/web/test/client-script.test.ts`

Responsibilities:

- explain when a claim is legacy versus batched
- show batch anchor, bond output reference, and proof/reveal requirements
- keep offline claim prep and review understandable
- preserve provenance visibility in the UI
- ensure the website remains a credible way to review claim flows end to end

## Suggested Phases

### Phase 0: Spec Closure

Deliverables:

- lock numeric event-type assignments
- lock v0 batch cap
- lock proof chunk byte budget
- lock whether claim packages store proof bytes directly or reference separate artifacts

Acceptance:

- protocol-facing questions are closed tightly enough that implementation can begin without guessing

### Phase 1: Protocol And Merkle Helpers

Packages:

- `packages/protocol`

Tasks:

- add new event types for batch anchor, batched reveal, and proof chunk
- implement payload encoders / decoders
- implement `gnsmb0-leaf` and `gnsmb0-node` hashing
- implement Merkle proof verification
- add serialization / validation tests

Acceptance:

- protocol tests can round-trip all new payload types
- valid proofs verify
- malformed proofs, wrong `bond_vout`, and wrong roots fail deterministically

### Phase 2: Core State Machine And Provenance

Packages:

- `packages/core`

Tasks:

- extend `extractOntEvents` and event application paths
- represent batched pending commits in state
- verify batched reveals against anchored roots
- preserve same-block and precedence behavior
- extend transaction provenance snapshots to show batch events clearly

Acceptance:

- existing non-batched claim tests still pass
- new tests prove batched claims produce correct ownership state
- snapshots round-trip with new fields intact

### Phase 3: Architect And CLI Artifact Generation

Packages:

- `packages/architect`
- `apps/cli`

Tasks:

- add batched commit artifact builders alongside legacy builders
- emit per-claim proof bundles and reveal-ready artifacts
- expose batched mode through CLI commands
- add inspection output for anchor txid, `bond_vout`, proof size, and mode
- verify signer compatibility with the produced PSBTs / txs

Acceptance:

- a user can generate both legacy and batched ordinary claim artifacts
- CLI output makes the mode obvious
- current signer path still signs the relevant transactions successfully

### Phase 4: Indexer / Resolver Integration

Apps:

- `apps/indexer`
- `apps/resolver`

Tasks:

- ensure bootstrapping, polling, and snapshot restore all survive batched claim state
- expose provenance fields needed by the website
- ensure pending claim and claimed-name endpoints behave the same from a user perspective

Acceptance:

- resolver-backed flows can display batched claims without special casing failures
- one-shot indexer runs and resolver polling both handle batched events

### Phase 5: Website Review Flows

App:

- `apps/web`

Tasks:

- update claim prep copy and state transitions
- render batched artifact details
- show reveal requirements and proof details in a review-friendly way
- keep offline claim and private-signet-assisted flows coherent
- extend browser tests where the UI behavior changes

Acceptance:

- website can prepare and explain a batched ordinary claim
- website can still explain legacy claims during transition
- provenance views remain understandable

### Phase 6: Documentation

Docs:

- `docs/core/ARCHITECTURE.md`
- `docs/core/DECISIONS.md`
- `docs/core/TESTING.md`
- `docs/research/MERKLE_BATCHING_V0.md`
- `docs/research/MERKLE_BATCHING_V0_DECISIONS.md`
- reviewer/explainer docs as needed

Tasks:

- document the new event types and artifact flow
- document the optional-coordinator trust boundary
- document that batching changes efficiency, not scarcity economics
- update walkthroughs and testing instructions

Acceptance:

- docs match the actual implementation path closely enough that a reviewer can follow it without code archeology

### Phase 7: Test And Review Pass

Surfaces:

- `packages/protocol` tests
- `packages/core` tests
- `apps/cli` tests
- `apps/web` tests
- regtest integration and manual walkthroughs

Tasks:

- run the full test suite
- add missing regression coverage for batched and legacy parity
- run at least one manual website-driven ordinary batched claim flow
- measure actual tx-size / chain-footprint deltas versus legacy commit flow

Acceptance:

- full test suite passes
- manual review flow works through the website and signer path
- measured footprint improvements are documented, not assumed

## Dependency Order

Recommended order:

1. `packages/protocol`
2. `packages/core`
3. `packages/architect`
4. `apps/cli`
5. `apps/indexer` / `apps/resolver`
6. `apps/web`
7. docs and final validation

Why:

- protocol and proof verification must exist before state-machine work is stable
- state-machine behavior must exist before artifact builders can be trusted
- artifact builders must exist before website and CLI flows can be finalized

## High-Risk Areas

These are the places most likely to create churn if we underestimate them:

- proof carriage sizing and chunk reconstruction
- claim-package format changes
- provenance readability after batching
- keeping legacy and batched flows both working during transition
- website review UX for proof-heavy artifacts

## Recommended First Implementation Slice

If we want to keep momentum and reduce risk, the first concrete build slice should be:

1. add protocol Merkle helpers and new payload types
2. add core validation for one happy-path batched ordinary claim
3. add architect/CLI generation for one batched claim artifact flow
4. prove it on regtest before widening the UI surface

That gives us a real vertical slice early without needing to finish every endpoint and UI path at once.

## Exit Criteria For “Merkle Batching v0 Implemented”

We should only call this implemented when all of the following are true:

- batched ordinary claims work end to end on regtest
- legacy ordinary claims still work during transition
- indexer and resolver show correct provenance
- website can prepare and explain the batched path
- the full automated test suite passes
- measured footprint improvement has been recorded
