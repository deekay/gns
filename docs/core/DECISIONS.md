# Open Name Tags / ONT Decision Log

This file records protocol decisions that have been resolved during design work on Open Name Tags / ONT. It is intended to keep the evolving draft grounded in explicit decisions rather than conversational context.

## Resolved Decisions

1. Ownership model

ONT is pubkey-controlled. A name is owned by a specific public key, and valid claim, update, and transfer operations must be authorized by signatures from the corresponding private key.

Implications:
- No xpub is required.
- A CLI may derive the ONT owner key from a seed phrase using a standard derivation path, or import a standalone key.
- ONT ownership is registry-style ownership, not inscription-style bearer ownership.

2. Canonical state model

Bitcoin is the canonical ownership and state log for ONT. External resolution data is optional and protocol-agnostic.

Implications:
- ONT is not Nostr-dependent.
- Nostr is an optional integration and early use-case, not a required foundation.
- A name may point to Nostr, Bitcoin, HTTPS, DID, or nothing at all.

3. Name state

Each name has:
- an owner public key
- an optional value

The value may be null.

Implications:
- Claim does not need to set a value.
- Value-setting can be a separate action.
- Names can exist as scarce property before they point anywhere.

4. Transfer semantics

Transfers are signed on-chain transfer records.

Rules:
- Pre-maturity transfers must also move the bonded UTXO.
- Post-maturity transfers do not require bond continuity.
- Transfer does not reset the original maturity clock.

5. Bond continuity

Each immature name has exactly one live dedicated bond outpoint.

Rules:
- Every pre-maturity transfer must spend the current bond outpoint.
- The same transaction must create a successor bond output for that name.
- The successor bond output must contain at least the required bond amount.
- The original claim height remains the maturity anchor.
- If bond continuity breaks before maturity, the name is immediately released back to the unclaimed pool.

Notes:
- The successor bond amount may be topped up with extra inputs.
- The protocol cares about successor bond continuity, not sat-level continuity of the exact prior bond amount.
- The successor bond may be funded by the seller, the recipient, or any combination of transaction inputs, as long as the old bond outpoint is spent and the required new bond output is created in the same transaction.
- Fees should be funded separately so the bonded amount is not accidentally reduced below threshold.

6. Initial pairing rule

The initial commit transaction must create both:
- the claim commitment carried in OP_RETURN
- the initial dedicated bond UTXO

7. Commit/reveal requirement

Initial claims use mandatory commit/reveal.

Purpose:
- Prevent miner and mempool front-running of visible plaintext name claims.

Commit:
- Confirms an OP_RETURN commitment to the claim.
- Locks the required bond capital in the same transaction.

Reveal:
- Must reveal the committed name and nonce.
- Must be confirmed within the reveal window.

8. Reveal window

Reveal window is 24 blocks after the commit confirms.

Rules:
- If commit confirms at height H, reveal must confirm by height H + 24.
- If no valid reveal confirms in time, the claim expires immediately.
- Availability during the reveal window is pending, not final.

9. Maturity anchor

Maturity starts at the commit block height, since that is when the capital first becomes locked.

10. Bond pricing function shape

Bond pricing is:
- objective
- length-only
- based on temporary bonded capital, not fees paid to an issuer

No subjective premium categories are used in v1.

11. Bond curve form

Bond amounts follow a Bitcoin-like halving curve with a minimum floor.

Formula under consideration:

`bond_sats(length) = max(floor_sats, base_sats >> (length - 1))`

12. Launch maturity

Initial maturity for new claims is 52,000 blocks, about 1 year.

13. Minimum maturity floor

Minimum maturity for new claims is 4,000 blocks, about 4 weeks.

14. Epoch length

Epoch length is 52,000 blocks, about 1 year.

Rules:
- Each epoch lasts 52,000 blocks.
- Newly committed claims use the maturity duration assigned to their epoch.
- Maturity duration halves each epoch until it reaches the minimum floor.

Illustrative schedule:
- Epoch 0: 52,000 blocks
- Epoch 1: 26,000 blocks
- Epoch 2: 13,000 blocks
- Epoch 3: 6,500 blocks
- Epoch 4+: 4,000-block floor

15. Immutability

Core economic and validity parameters are intended to be immutable once launched.

This includes:
- bond curve
- bond floor
- maturity schedule
- epoch length
- reveal window
- validity rules

Any incompatible change after launch should be treated as a new protocol version or competing namespace, not a normal upgrade.

Pre-launch note:
- During prototype and testing phases, the implementation may still change wire formats, payload layouts, and other unresolved constants.
- Those experiments should be treated as provisional and should not imply a final launch commitment.
- Mainnet launch should only happen after the protocol constants are intentionally frozen.

Testing recommendation:
- use regtest, signet, testnet, or a clearly labeled experimental mainnet namespace/version for iteration
- avoid creating ambiguity that experimental claims are part of the final canonical namespace

16. Name syntax

Names are restricted to:

`[a-z0-9]{1,32}`

Rules:
- Input is case-insensitive.
- Canonical form is lowercase.
- Allowed alphabet size is 36.
- No punctuation, separators, whitespace, or Unicode in v1.

17. Ownership versus value placement

Bitcoin carries ownership events only. Optional values are off-chain by default.

Implications:
- Bitcoin alone should be sufficient for independent, trust-minimized ownership verification.
- Routine value updates should not consume blockspace in v1.
- Loss of off-chain value data does not affect on-chain ownership validity.

18. Off-chain value authentication

Off-chain values are authenticated by signatures from the current owner key.

Recommended record fields:
- name
- owner public key
- sequence number
- ownership interval reference
- previous value-record hash
- value type
- value payload
- owner-issued timestamp
- signature

Rules:
- Value records form a signed append-only chain scoped to the current
  ownership interval.
- The first record in an ownership interval should have sequence `1` and no
  previous record hash.
- Later records should increment sequence exactly by one and point to the
  canonical hash of the previous value-record statement.
- Owner-issued timestamps are metadata, not the canonical ordering rule.
- On ownership transfer, value authority moves to the new owner key.
- Old owner-signed value records become stale once ownership changes on-chain.

Rationale:
- Sequence numbers plus predecessor hashes let clients prove update order, not
  just inspect the latest signed value.
- Binding the value chain to an ownership interval prevents a stale record from
  an earlier ownership period from becoming current again if the same key later
  reacquires the same name.
- This mirrors the useful part of Keybase-style signature chains without
  requiring routine mutable value updates to be posted to Bitcoin.

19. Value behavior on transfer

On transfer, the current off-chain value is cleared by default.

Rules:
- Ownership transfer does not automatically preserve the prior owner's value record.
- A transfer format may support an explicit preserve signal, but preserve is not the default behavior.
- After transfer, the new owner may publish a fresh value record under their own key and sequence space.

20. Bitcoin footprint minimization

The protocol should minimize on-chain footprint while preserving independent, trust-minimized ownership verification.

Implications:
- Avoid storing routine mutable mappings on Bitcoin.
- Avoid designs that require inscriptions or large witness-carried artifacts for normal operation.
- Prefer small ownership events over full on-chain application state.
- Make blockspace and UTXO trade-offs explicit in the draft for Bitcoin-focused reviewers.

21. Resolver strategy

ONT core remains transport-agnostic for off-chain values, but the project should ship a reference implementation of a minimal read-only ONT resolver/indexer profile.

Implications:
- The reference resolver is a convenience interface, not the source of ownership truth.
- Ownership truth remains Bitcoin plus the ONT protocol rules.
- Clients may use a hosted resolver, self-host a resolver, or implement compatible alternatives.
- The project should prefer a reference implementation over remaining only a protocol hypothesis.

22. Minimal resolver API surface

The first recommended ONT-native resolver profile should be minimal and read-only.

Recommended capabilities:
- resolve a normalized name to current ownership state
- return the latest valid off-chain value record for a normalized name, if any
- return value-record history for the current ownership interval
- return provenance for an ONT event or name state so clients can inspect the underlying chain-derived basis

Recommended endpoint shape for the reference profile:
- `GET /name/{normalized_name}`
- `GET /name/{normalized_name}/value`
- `GET /name/{normalized_name}/value/history`
- `GET /tx/{txid}`

Design constraints:
- Keep the profile small enough that alternative implementations are easy.
- Prefer explicit provenance fields over opaque answers.
- Avoid standardizing write APIs in the protocol profile.

23. Off-chain value encoding envelope

Off-chain values use a compact typed binary envelope.

Envelope shape:
- `value_type`: 1 byte
- `payload_length`: 2 bytes
- `payload`: variable-length bytes

This keeps value records compact while allowing a small standardized type set and future extension.

24. Initial standardized value types

The initial standardized value types for v1 are:
- `0x00`: null
- `0x01`: bitcoin payment target
- `0x02`: HTTPS target
- `0xff`: raw or app-defined

Notes:
- v1 does not standardize a Nostr-specific value type.
- This is intended to avoid unnecessary social or technical coupling between ONT and Nostr.
- Future standardized value types, if any, should be introduced conservatively and explicitly.

25. Bond amount parameters

The launch bond curve parameters are:
- `base_sats = 100,000,000` sats
- `floor_sats = 50,000` sats

Implications:
- 1-character names require a 1 BTC bond at launch.
- Each additional character halves the required bond until the 50,000-sat floor is reached.
- The 4,000-block value previously resolved is the minimum maturity floor, not the bond floor.

26. Same-block tie-break rule

If two competing commits for the same name are confirmed in the same block, the commit appearing earlier in the block's transaction order wins.

Rationale:
- deterministic
- easy to verify
- simpler and more legible than hash-based tie-break schemes
- avoids introducing a more complex tie-break rule that still would not eliminate miner influence

27. V1 on-chain event set

The v1 on-chain event set is intentionally minimal.

Standardized on-chain events:
- `COMMIT`
- `REVEAL`
- `TRANSFER`

Implications:
- v1 does not standardize on-chain `SET_VALUE`
- v1 does not standardize on-chain `CLEAR_VALUE`
- routine mutable value changes remain off-chain

28. Pre-maturity transfer linkage

For immature names, a transfer must identify the successor bond output created by the transfer transaction so the indexer can verify bond continuity without ambiguity.

Recommended approach:
- the signed transfer payload includes the successor bond output index (`vout`)

Implications:
- the transfer transaction itself creates the new live bond output
- the indexer verifies that the referenced output exists and meets the required bond threshold
- mature transfers do not require successor bond output linkage

29. Wire-format direction for v1

The v1 wire format should optimize for small ownership events:
- `COMMIT` should fit in a single conservative OP_RETURN payload
- `REVEAL` should fit in a single conservative OP_RETURN payload under the 32-character name cap
- `TRANSFER` may use a slightly richer or chunked format if needed because it must carry signature material

The exact byte-level format remains open, but the protocol direction is to avoid larger on-chain payloads where smaller ownership events are sufficient.

30. Prototype interaction boundary

The project should support a prototype website, but the boundary between interface and signer should remain explicit.

Recommended boundary:
- website handles browsing, availability search, validation, provenance display, and transaction assembly
- CLI, wallet, or explicit signer component handles key derivation, signing, bond continuity checks, and final broadcast

Implementation principle:
- website-assisted actions should have CLI-capable equivalents
- the website should not be the only way to perform protocol actions

31. Atomic transfer-for-payment model

ONT should distinguish between:
- ownership validity
- commercial settlement

The ONT indexer validates ownership transition rules and, for immature names, bond continuity. It should not need to interpret sale price terms or payment semantics to determine who owns a name.

When a transfer is a sale rather than a gift, the recommended protocol and wallet flow is atomic delivery-versus-payment in a single Bitcoin transaction.

Rules:
- Pre-maturity sale transfers should occur in one transaction that spends the current bond outpoint, pays the seller, creates the successor bond output for the buyer, and carries the ONT transfer event.
- Post-maturity sale transfers should not rely on a free-floating transfer authorization signature by itself.
- For post-maturity sales, seller authorization must be bound to the exact Bitcoin transaction that pays the seller and transfers the name.
- The v1 reference implementation should achieve that binding with a cooperative PSBT flow and at least one seller-controlled input in the mature-sale transaction.
- Mature gift transfers may remain simpler signed ownership transfers when no atomic payment is required.

Rationale:
- prevents replay or underpayment of mature-name sale authorizations
- preserves clear indexer responsibilities
- uses ordinary Bitcoin transaction atomicity rather than adding commerce parsing to ONT validity rules

32. Sale-intent listings are off-chain

Owners may want to advertise that a name is for sale and at what price. That should be documented as an optional off-chain layer, not part of canonical ONT ownership state.

Rules:
- sale-intent or ask listings should not be on-chain
- sale-intent or ask listings should not affect indexer ownership truth
- marketplaces, third-party sites, or future optional resolver extensions may ingest and display signed sale-intent records
- clients may verify those records against the current on-chain owner pubkey
- marketplaces may authenticate listing creators with an off-chain challenge signed by the current owner key
- that ownership proof does not by itself prove the final ability to complete an immature transfer, which also depends on participating in the bond-moving sale transaction

Rationale:
- asks are mutable market metadata, not ownership state
- they may change frequently
- they do not belong on Bitcoin
- they should not complicate canonical indexer behavior

## Fairness Principles To Carry Into The Rewrite

The rewritten draft should explicitly state:
- No reserved names
- No founder allocation
- No discounted claims
- No whitelist
- No identity-based quotas
- Every immature claim requires dedicated bonded BTC
- Bond and maturity rules are fixed at launch
- Fairness is auditable by anyone from chain data

The protocol should aim for objective fairness, not semantic fairness.

That means:
- Names of the same length are treated identically by the protocol.
- The protocol does not attempt to judge whether a name is a common word, brand, or vanity string.
- Scarcity and anti-hoarding pressure come from bonded BTC and time, not from subjective pricing rules.

## Open Questions

1. Value payload definitions

Need to define the exact payload format for:
- `0x01` bitcoin payment target
- `0x02` HTTPS target
- `0xff` raw or app-defined usage expectations, if any

For `0x01`, reviewer feedback should explicitly consider compatibility and trade-offs around existing Bitcoin payment-target standards and proposals such as:
- `BIP321` URI scheme guidance
- `BIP353` DNS payment instructions

2. Value transport and discovery

Need to define:
- whether the core protocol mandates any transport for off-chain value records
- whether there is a recommended default transport profile
- how clients discover and fetch current value records

3. ONT-native resolver profile

Need to define:
- how clients discover resolver endpoints, if at all

4. Reviewer-facing modeling and risk disclosure

The rewritten draft should explicitly document:
- preliminary blockspace estimates
- preliminary UTXO-set estimates
- known trade-offs in the current architecture
- open questions where external reviewers should challenge the design

Reviewer-facing trade-offs that should be stated plainly include:
- the current prototype `TRANSFER` payload exceeds older conservative `OP_RETURN` relay limits; modern Bitcoin Core defaults are more permissive, but broader network relay compatibility still depends on node policy
- mature names currently remain valid without ongoing bond continuity
- v1 resolver usage may still concentrate value-record availability around a small number of hosted resolvers
- a missed reveal does not just fail a claim; it also exposes demand for that specific name before the claimant secures it
- the owner key is distinct from the funding wallet key, and v1 does not include a protocol recovery path if that owner key is lost

5. Concrete wire format

Need to specify exact OP_RETURN payload formats for:
- COMMIT
- REVEAL
- TRANSFER

6. Canonical indexing and tie-breaking rules

Need to define:
- reorg handling
- duplicate reveal handling
- invalidation behavior for malformed sequences

7. Wallet and CLI safety rules

Need to define UX and implementation safeguards to prevent users from accidentally breaking bond continuity before maturity.

Need to define clearer operator and wallet guidance around missed reveals:
- a missed reveal should have an obvious recovery path for funds
- the docs should explain that a failed reveal also reveals which name was being attempted
- pre-launch review should revisit whether the 24-block reveal window is the right trade-off between uncertainty and demand leakage
