# Global Name System (GNS): Protocol Specification Draft (v2)

This document defines the GNS protocol behind Global Name System: a Bitcoin-anchored ownership and state log for human-readable names.

## 1. Name Syntax and Normalization

- **Charset:** `[a-z0-9]` (ASCII lowercase letters and digits).
- **Length:** 1 to 32 characters.
- **Normalization:** Case-insensitive input; canonical form is lowercase.
- **No Suffixes:** Names are standalone strings (e.g., `satoshi`).

## 2. Ownership Model

GNS uses **Pubkey-Controlled Ownership**. A name is owned by a specific public key. Valid state transitions (claims, reveals, transfers) must be authorized by signatures from the corresponding private key.

- **Ownership Truth:** The latest valid signed state transition recognized by the GNS indexer from the Bitcoin blockchain.
- **Separation of Concerns:** Bitcoin records ownership events; application-specific "Values" (e.g., Lightning addresses) are off-chain and owner-signed.

## 3. The Name-Bond Model

To claim or maintain an immature name, a participant must lock a required amount of bitcoin (the "Bond") in a dedicated UTXO.

### 3.1 Bond Curve
Bond amounts are length-based and follow a halving curve:
`bond_sats(length) = max(50,000, 100,000,000 >> (length - 1))`

### 3.2 Maturity Schedule
Names are "immature" for a set period, after which bond continuity is no longer required.
- **Epoch 0:** 52,000 blocks (~1 year).
- **Epoch Length:** 52,000 blocks.
- **Halving:** Maturity duration for newly committed claims halves each epoch until a 4,000-block floor is reached.

### 3.3 Bond Continuity
An immature name remains valid only while its dedicated bond outpoint remains unspent (or is moved via a valid GNS Transfer). If bond continuity breaks before maturity, the name is immediately released.

## 4. On-Chain Events

GNS v1 standardizes three on-chain events via `OP_RETURN`.

### 4.1 COMMIT
A mandatory hash-commitment to prevent front-running.
- **Payload:** `magic(3) | version(1) | type(1) | owner_pubkey(32) | commit_hash(32)`
- **Rule:** Must be in the same transaction as the initial Bond UTXO.

### 4.2 REVEAL
Publishes the committed name.
- **Payload:** `magic(3) | version(1) | type(1) | commit_txid(32) | nonce(8) | name_len(1) | name(variable)`
- **Rule:** Must confirm within 24 blocks of the `COMMIT`.

### 4.3 TRANSFER
Atomic ownership and bond transition.
- **Payload:** `magic(3) | version(1) | type(1) | body(...) | signature(64)`
- **Rule:** For immature names, the transfer transaction must spend the old bond and create a valid successor bond.

## 5. Off-Chain Values

Name "Values" (what the name points to) are off-chain by default.
- **Envelope:** `value_type(1) | payload_length(2) | payload(variable)`
- **Authentication:** Must be signed by the current GNS owner key.
- **Sequence:** Highest monotonic sequence number wins.

## 6. Resolver and Value Availability

### 6.1 Two-Layer Trust Model

GNS ownership state and off-chain value records have different availability guarantees by design.

**Ownership state** is fully derivable from Bitcoin. Any operator with access to chain data from the launch height can reconstruct the complete GNS name registry without any resolver. No resolver availability assumption is required for ownership verification.

**Off-chain value records** are signed by the current owner key and served by resolvers. Their authenticity is verifiable — any record with an invalid or stale signature is rejected — but their availability depends on at least one resolver retaining a copy.

### 6.2 Chain-Derived Completeness

Because the canonical name set is derivable from Bitcoin, resolver completeness is objectively auditable. A client that has indexed chain data knows exactly which names should exist and can score any resolver by sampling its answers against ground truth. Resolvers cannot fabricate completeness; the chain is the reference.

### 6.3 Resolver Discovery

The reference implementation supports a layered discovery model:

- **Hardcoded seeds:** Known resolver endpoints shipped in the client as a bootstrap mechanism, analogous to Bitcoin's hardcoded seed nodes.
- **DNS seeds:** Operator-run domains that return lists of active resolver endpoints.
- **Gossip:** Resolvers surface lists of other known resolvers to connecting clients.
- **On-chain announcements:** Resolvers may publish an OP_RETURN announcement (endpoint URL and signing pubkey) to make themselves permanently discoverable via chain indexing alone.

### 6.4 Value Record Availability

Owners have several options for ensuring their value records remain available:

- **Self-hosted with resolver cache:** Owner publishes the signed record at a self-controlled URL and registers a fetch hint with resolvers. The record survives any individual resolver failure.
- **Multi-resolver replication:** Any resolver may store and serve value records for any name. Clients accept the record with the highest valid sequence number across all resolvers queried.
- **External transport:** Since value records are self-contained signed envelopes, they may be published over any authenticated transport. No specific transport is mandated by the protocol.

## 7. Fairness and Immutability

- **No Reserved Names:** Issuance is open to all from day one.
- **Immutable Constants:** Bond curves, maturity schedules, and validity rules are frozen at launch.
- **Objective Scarcity:** Throttled by capital lockup and time, not by subjective pricing categories.
