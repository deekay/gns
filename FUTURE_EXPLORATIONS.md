# GNS Future Explorations

This document captures speculative technical directions and brainstorming for the GNS protocol. These are **not** part of the current implementation plan or the v1 protocol freeze. They are preserved here for research and potential inclusion in future protocol versions.

## 1. Zero-Knowledge (ZK) Enhancements

### ZK-Rollups for Scalability
- **The Idea:** An aggregator collects 1,000 name claims and posts a single ZK-proof to Bitcoin.
- **Benefit:** Reduces the cost of a name claim by 99% while maintaining cryptographic validity.
- **Risk:** Introduces a dependency on a "Prover" (though non-custodial).

### Blinded Ownership (Privacy)
- **The Idea:** Instead of revealing the plaintext name on-chain, the user reveals a ZK-proof of a valid commit.
- **Benefit:** "Stealth Names" where the public doesn't know which name you own until you choose to resolve it.
- **Collision Warning:** Full blindness can lead to "Bait-and-Switch" collisions where two users claim the same name unknowingly.
- **The Solution:** Use a **Deterministic Occupancy Signal** (e.g., a Sparse Merkle Tree where the leaf position is `hash(name)`). This proves a "slot" is taken without revealing the name, though common names can still be brute-forced.

### Succinct State Proofs
- **The Idea:** Represent the GNS registry as a Merkle Tree and provide a ZK-SNARK of the state transition.
- **Benefit:** Allows mobile/light clients to verify the entire 10-million-name registry with a few hundred bytes of data.

## 2. "Scriptless" Protocol Design (Minimizing Bloat)

### Taproot Tweaking
- **The Idea:** Hide the `COMMIT` hash by tweaking the Owner Public Key ($P' = P + hash(name)G$).
- **Benefit:** **Zero bytes** of extra data on-chain. GNS transactions look identical to standard Bitcoin spends.

### Inference-Based Transfers
- **The Idea:** Instead of an `OP_RETURN` transfer event, the indexer monitors the movement of "Known Bond UTXOs."
- **Benefit:** Transfers become "silent" to anyone not running a GNS indexer.

### Signature-Based Reveals
- **The Idea:** Encode the reveal name into the Schnorr Signature nonce or signature itself.
- **Benefit:** Eliminates the need for a dedicated data field in the reveal transaction.

## 3. Advanced Resolution (Silent Payments)

### BIP 352 Integration
- **The Idea:** Use the Bond UTXO's public key as the basis for a **Silent Payment** scheme.
- **Benefit:** Allows users to pay "satoshi" by generating a unique, one-time address that only the owner can spend. To an observer, it's an anonymous BTC payment.

## 4. On-Chain Enforcement (BitVM)

### Bond Continuity via BitVM
- **The Idea:** Use BitVM to create a "bridge" or "contract" that Bitcoin can actually "see."
- **Benefit:** If a bond is broken, the BitVM contract could automatically release the name or penalize the owner on-chain, removing the "Indexer-only" enforcement gap.

## 5. Resolver Discovery and Data Availability

A known open question in the current design: off-chain value records (Lightning addresses, payment targets, HTTPS pointers, etc.) are served by resolvers, but there is no defined mechanism for clients to discover resolvers or evaluate their trustworthiness. In practice, every client bootstraps against a single known endpoint.

These are ideas for addressing that without introducing a central registry or a new trust layer.

### DNS Seeds + Hardcoded Defaults (Bitcoin-Style Bootstrap)

- **The Idea:** Ship the client with a small set of hardcoded resolver endpoints and 2-3 DNS seed domains (e.g., `seed.gns.example`) that return lists of known resolver IPs. Anyone can operate a seed domain.
- **Benefit:** Mirrors exactly how Bitcoin nodes discover peers at startup. Simple, works on day one, requires no new protocol machinery.
- **Note:** The hardcoded seeds are a starting point for discovery, not a trust anchor. They get a client onto the network; completeness scoring (below) handles trust from there.

### Completeness Scoring via Chain-Derived Ground Truth

- **The Idea:** Because every name event is on Bitcoin, any client that has synced the chain knows the ground truth: the exact set of names that exist, their owners, and their claim heights. A client can sample random names from its local index, query a resolver for each, and score it: `correct_answers / queries`. Resolvers that score below a threshold get dropped; high-scoring resolvers get preferred.
- **Benefit:** Resolver trust becomes objectively measurable with zero external dependencies. A resolver cannot fake completeness — it either watched the chain or it didn't. This is a property unique to Bitcoin-anchored systems and worth exploiting.
- **Extension:** Resolvers could publish a signed **completeness certificate** — a Merkle root over their full name index at a given block height. Clients spot-check it. Multiple resolvers compete on completeness, giving the ecosystem a trust signal derived entirely from chain data.

### On-Chain Resolver Announcements

- **The Idea:** Resolvers that want to be permanently discoverable post a small OP_RETURN announcement: their endpoint URL and a signing pubkey. This is anchored to Bitcoin — any client syncing from the launch height will find all announced resolvers without relying on any seed operator.
- **Benefit:** Discovery becomes derivable from chain data. The announcement is a permanent pointer, not a trust claim. Clients evaluate announced resolvers using completeness scoring.
- **Trade-off:** Adds a new on-chain event type or repurposes the `RawAppDefined` value type. Not part of core name ownership state. Would need careful scoping to avoid protocol creep.

### Resolver Gossip

- **The Idea:** When a client connects to a resolver, that resolver returns a list of other resolvers it knows about — similar to Bitcoin's `addr` message. No central registry needed. Could be as simple as a convention: `GET /peers` returns a list of endpoints.
- **Benefit:** The resolver network becomes self-propagating over time without any coordination mechanism.

### Value Record Transport Options

Off-chain value records have an additional DA challenge: unlike ownership state, they are mutable and not derivable from chain. A few approaches worth considering:

- **Owner self-hosts, resolver caches:** The owner publishes their signed value record at a URL they control and registers a "fetch hint" with the resolver. The resolver caches for performance, but the canonical copy stays under owner control. If a resolver disappears, the record survives at the owner's URL.
- **Multi-resolver replication:** Since value records are small and Schnorr-signed, any resolver can store and serve them for any name. Clients query multiple resolvers and take the highest valid sequence number. Completeness scoring extends naturally to value record coverage.
- **Nostr as optional value record transport:** Value records are already Schnorr-signed. A Nostr event kind for GNS records is a natural fit — Nostr relays are designed for signed mutable data. This keeps Nostr optional (not required for ownership verification) while giving owners a decentralized publication layer they don't have to self-host. Consistent with Decision #2 as long as Nostr is never required.

## 6. First-Class Identity (No Suffixes)

### Global Flattening
- **The Idea:** Formalizing the "No-Suffix" rule where names like `satoshi` are protocol-level primitives.
- **Challenge:** Handling potential collisions or the desire for TLD-like grouping in the future without re-introducing hierarchy.
