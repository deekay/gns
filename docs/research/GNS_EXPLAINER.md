# Global Name System (GNS)

## The Problem With Names Today

Every name you use online is rented, not owned. Your domain renews annually through a registrar that can suspend it. Your social handle lives on a platform that can deactivate it. Your email address belongs to a provider that can close your account.

This is not a minor inconvenience. It means every identity you build — every reputation, every contact, every pointer to your work or your payment details — sits on infrastructure someone else controls. At any point, for any reason, it can be taken from you.

GNS is a different approach. A name like `satoshi` is not a subscription. It is something you own outright, in the same way you own a private key: no company can revoke it, no platform can suspend it, no registrar can let it lapse. The record of ownership is public, permanent, and verifiable by anyone without asking anyone's permission.

Human-facing amounts in GNS use integer bitcoin notation alongside the conventional BTC equivalent. Example: `₿50,000 (0.0005 BTC)`.

---

## Why Bonds Instead Of Fees

Naming is never free. The real question is where the cost goes and what kind of cost it is.

Most naming systems charge you by routing payment to a gatekeeper:

- a registrar
- a platform
- a DAO treasury
- or some other operator with the power to change terms later

GNS uses pricing too, but a different kind. It uses a **bond**. A bond still has a real financial cost because capital has time value and opportunity cost. But the cost does not have to be paid to a third party. You lock bitcoin you still own instead of spending it forever to a provider.

That distinction matters both economically and psychologically. For many people, especially retail users who may simply hold bitcoin in cold storage anyway, locking capital can feel very different from losing it permanently. For larger institutions and brands, the distinction may matter less in practice because both fees and bonds are just balance-sheet decisions. But the protocol stays consistent for everyone: the claimant bears a cost, yet no central operator collects tribute.

GNS claims still pay normal Bitcoin transaction fees. The point is not that naming becomes free. The point is that the protocol's own pricing mechanism is self-sovereign rather than gatekeeper-controlled.

---

## What GNS Names Are For

A GNS name is a stable, unforgeable pointer to whatever resources you want to be findable by. That includes:

- **Payment endpoints** — a Lightning address, an on-chain address, a payment URI
- **Identity** — a public key, a profile, a verifiable credential
- **Services** — an HTTPS endpoint, an API, an application
- **Anything you choose** — the protocol is deliberately open-ended

The name is the stable layer. What it points to can change. The ownership cannot be taken from you.

This matters increasingly as software acts on behalf of people. When an agent routes a payment, authenticates a counterparty, or resolves an address without a human in the loop, the cost of a spoofed or silenced record is much higher than when a person is visually verifying the result. GNS names carry cryptographic ownership guarantees at the protocol level — not because a company promises to honor them, but because the record of ownership is anchored to an immutable public ledger that no single party controls.

---

## How Ownership Works

GNS uses a **capital bond** rather than an annual fee to establish and protect name ownership. To claim a name, you lock a required amount of bitcoin in a dedicated output you control. The bond is not a payment to anyone — it is capital you retain, locked temporarily as a commitment to the name.

- **The Bond:** Shorter names require larger bonds. A 1-character name requires `₿100,000,000 (1 BTC)`; names of 12 characters and longer floor at `₿50,000 (0.0005 BTC)`. This ensures high-value names are backed by real economic commitment.
- **Settlement:** A newly claimed name is in a settlement period for approximately one year (52,000 blocks). During this time the bond must remain parked. If it is spent or broken before settlement completes, the name is immediately released back to the public pool.
- **After Settlement:** The name is fully yours. The bond can be freed. Ownership persists as a permanent on-chain record.

Scarcity comes from locked capital and time, not from fees paid to a registrar or burned into nothing. You keep your bitcoin.

That said, a GNS claim is not costless. In addition to posting the bond, the claimant also pays ordinary on-chain transaction fees for the commit and reveal transactions. At low fee levels those costs may be small relative to the bond. At higher fee levels they may become comparable to, or even exceed, the smallest bond tiers. That is not a payment to a centralized operator or registry. It is payment into Bitcoin's normal fee market, which is consistent with the system's decentralization story even if it makes claiming more expensive in absolute terms.

---

## Claiming A Name

GNS uses a two-step commit/reveal process to prevent front-running by bots or miners.

1. **Commit:** You post a hash of your intended name. This hides your intent while establishing your place in the queue.
2. **Reveal:** You reveal the plaintext name within a short window. If no valid reveal arrives in time, the claim expires and the bitcoin stays with you.

The two-step process means no one can copy your claim from the mempool and beat you to it.

---

## No Suffixes, No Hierarchy

GNS uses a flat namespace. A name is just `satoshi` — not `satoshi.gns` or `satoshi.btc`. There is no root authority, no TLD, no hierarchy to maintain. Every name of the same length is treated identically by the protocol.

---

## Fairness

The protocol has no special cases:

- No reserved names
- No founder allocation
- No discounted claims
- No whitelist or identity-based quotas

Every claim follows the same rules. Fairness is auditable by anyone from the public ownership record.

---

## Comparison to Alternatives

| Feature | GNS | ENS (Ethereum) | DNS |
| :--- | :--- | :--- | :--- |
| **Cost model** | Bonded capital (you keep it) | Annual rent to DAO | Annual rent to registrar |
| **Ownership** | Sovereign | Tenant | Tenant |
| **Revocability** | Cannot be revoked | DAO governance risk | Registrar / legal risk |
| **Forgery resistance** | Cryptographic | Cryptographic | Weak (hijacking, spoofing) |
| **Value storage** | Off-chain, owner-signed | On-chain | On DNS servers |

---

## Data Availability: An Honest Assessment

GNS separates two concerns with different trust profiles, and it is worth being explicit about both.

**Ownership state** is recorded on an immutable public ledger. Every claim, reveal, and transfer is a permanent on-chain event. The canonical registry is always recoverable from that record alone — if every GNS resolver disappeared tonight, any operator could reconstruct the entire namespace from scratch. Ownership truth does not depend on any resolver being available, honest, or even aware that GNS exists.

**Off-chain value records** — what a name actually points to — are a separate matter. These are stored and served by resolvers. They are signed by the name's current owner key, so their authenticity is always verifiable without trusting anyone. But their availability depends on at least one resolver having a copy.

This is a deliberate trade-off. Storing value records on-chain would impose a cost for every routine update and is inconsistent with using a public ledger as a notary rather than a database. The trade-off is the right one — but it means the long-term health of the system depends on a healthy resolver ecosystem.

### What the Design Gets for Free

Because the full name set is derivable from the public ledger, any client can objectively score a resolver: query it for names known to exist, compare the answers against the ground truth, measure what percentage it gets right. A resolver cannot fake completeness. This turns resolver trust into a verifiable metric rather than an assumption.

### The Mitigation Approach

The resolver layer is designed to be decentralized and self-sustaining:

1. **Hardcoded defaults and DNS seeds** handle bootstrapping, the same way nodes discover peers at startup.
2. **Resolver gossip** makes the network self-propagating — resolvers share peer lists with connecting clients.
3. **Completeness scoring** lets clients deprioritize low-quality resolvers using only locally verifiable data.
4. **On-chain resolver announcements** let any resolver make itself permanently discoverable to anyone syncing from the launch height.

For value records, owners retain full control: a name owner can self-host their signed record and register a fetch hint with resolvers. If a resolver disappears, the record survives at the owner's endpoint. Multiple resolvers can replicate records, and clients take the highest valid sequence number from whichever they reach.

No single operator needs to be trusted. A hosted resolver at launch is a convenience, not a requirement.

---

## How the Guarantee Holds

The properties GNS provides — that your name cannot be revoked, forged, or censored — hold because ownership is anchored to a public ledger with no administrator. This is not a promise made by a company. It is a property of the record itself.

Anyone can verify ownership. Anyone can run a resolver. Anyone can audit the full history of every name from the first block. The system does not ask you to trust it; it asks you to verify it.

---

## Future Directions

- **Silent Payments:** Generating unique, one-time payment addresses directly from a GNS name, so senders never reuse an address.
- **Taproot integration:** Hiding ownership commitments inside standard key material for zero visible on-chain footprint.

More speculative directions are documented separately in [FUTURE_EXPLORATIONS.md](./FUTURE_EXPLORATIONS.md).
