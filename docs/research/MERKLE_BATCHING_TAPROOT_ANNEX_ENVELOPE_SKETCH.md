# Merkle Batching Taproot Annex Envelope Sketch

This note answers one narrower follow-up question:

> if GNS ever moves batched reveal proofs into a Taproot annex carrier, what
> exactly would the unsigned and signed reveal artifacts need to contain so the
> builder, signer, and indexer all agree on the same bytes?

This is still protocol research. It is not a chosen v1 design.

Related notes:

- [MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md](./MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md)
- [MERKLE_BATCHING_TAPROOT_ANNEX_SKETCH.md](./MERKLE_BATCHING_TAPROOT_ANNEX_SKETCH.md)
- [MERKLE_BATCHING_ANNEX_WEIGHT_MODEL.md](./MERKLE_BATCHING_ANNEX_WEIGHT_MODEL.md)
- [MERKLE_BATCHING_WALLET_COMPATIBILITY.md](./MERKLE_BATCHING_WALLET_COMPATIBILITY.md)

## Why The Envelope Matters

For the current explicit batched reveal flow, `txid` is a decent artifact
integrity check because the GNS proof bytes live in ordinary transaction
outputs.

For an annex-based reveal, that changes.

Under SegWit:

- the witness affects `wtxid`
- the witness does **not** affect `txid`

So if the Merkle proof bytes move into annex witness data:

- the same base transaction can keep the same `txid`
- but different annex bytes can still produce different witness data

That means a future annex-based artifact model cannot rely on `txid` alone.

It needs a second integrity hook that says:

> these exact annex bytes are the intended proof bytes for this reveal.

## Core Recommendation

The cleanest current research direction is a **hybrid reveal**:

- keep a **small explicit `BATCH_REVEAL` header** in the transaction outputs
- make that header commit to the annex bytes by hash
- carry the large proof bytes in the Taproot annex witness

In short:

```text
explicit header commits to annex hash
witness annex carries proof bytes
```

That gives us three useful properties at once:

- the proof payload moves into cheaper witness space
- the base transaction still contains a parseable GNS reveal event
- the on-chain header commits to the exact annex content, so the annex is not
  "floating" outside the protocol semantics

## Proposed On-Chain Structure

### Explicit reveal header

The explicit `BATCH_REVEAL` header would still be a base-transaction carrier and
would likely include:

- protocol marker
- version
- name
- nonce or commit-binding fields already needed by the reveal model
- batch anchor txid
- `bond_vout`
- `owner_pubkey`, if required for deterministic leaf reconstruction
- `carrier_input_index`
- `annex_sha256`
- `annex_bytes_length`
- optional `annex_format` or proof-version flags

The important new fields are:

- `carrier_input_index`
- `annex_sha256`
- `annex_bytes_length`

Those give the indexer an explicit, txid-visible commitment to the expected
annex payload.

### Annex witness payload

The Taproot annex itself would then carry the large proof material, likely:

- proof node count
- proof direction bits or per-level orientation
- proof node bytes
- optional compact proof-format flags

The header tells the indexer what annex payload to expect. The annex supplies
the actual bytes.

## Proposed Artifact Model

Because [BIP371](https://bips.dev/371/) does not define a standard PSBT annex
field, the cleanest research model is:

- PSBT carries the base unsigned transaction inputs and outputs
- a GNS sidecar envelope carries the exact annex bytes and related metadata

So the artifact is not "PSBT alone". It is:

```text
PSBT + annex sidecar metadata
```

That is less wallet-friendly than the current explicit path, but it is the most
honest way to model annex reveals today.

## Proposed Unsigned Artifact

One plausible unsigned envelope shape:

```json
{
  "kind": "gns-batch-reveal-annex-artifacts",
  "network": "signet",
  "psbtBase64": "...",
  "unsignedBaseTransactionHex": "...",
  "unsignedBaseTransactionId": "...",
  "carrierInputIndex": 0,
  "carrierPrevout": {
    "txid": "...",
    "vout": 1
  },
  "explicitHeaderHex": "...",
  "explicitHeaderSha256": "...",
  "annexHex": "...",
  "annexSha256": "...",
  "annexBytesLength": 99,
  "annexFormat": "gns-batch-proof-v0",
  "anchorTxid": "...",
  "name": "markzuckerberg",
  "bondVout": 2
}
```

### Why these fields matter

- `psbtBase64`
  The base unsigned transaction still needs a standard construction container.
- `unsignedBaseTransactionId`
  Useful, but no longer sufficient by itself.
- `carrierInputIndex`
  Tells the signer and indexer which input must carry the annex.
- `explicitHeaderHex`
  Makes the header reviewable before signing.
- `annexHex`
  Pins the exact annex bytes before signing.
- `annexSha256` and `annexBytesLength`
  Make accidental or malicious mutation detectable.

## Proposed Signed Artifact

One plausible signed envelope shape:

```json
{
  "kind": "gns-signed-batch-reveal-annex-artifacts",
  "network": "signet",
  "signedTransactionHex": "...",
  "signedTransactionId": "...",
  "signedTransactionWitnessId": "...",
  "signedPsbtBase64": "...",
  "signedInputCount": 1,
  "carrierInputIndex": 0,
  "annexSha256": "...",
  "annexBytesLength": 99,
  "explicitHeaderSha256": "...",
  "anchorTxid": "...",
  "name": "markzuckerberg",
  "bondVout": 2
}
```

### Why `wtxid` should be included

For an annex-bearing transaction:

- `txid` identifies the base transaction
- `wtxid` identifies the fully witnessed transaction

If we only emitted `txid`, the signed artifact would not fully pin the exact
wire transaction that was actually signed and broadcast.

So annex-based flows should treat `wtxid` as a first-class artifact field.

## Builder Responsibilities

The builder would need to:

1. choose the deterministic `carrier_input_index`
2. assemble the exact explicit reveal header bytes
3. assemble the exact annex bytes
4. hash the annex bytes and place that hash into the explicit header
5. produce the unsigned PSBT for the base transaction
6. emit a sidecar envelope that includes the exact annex bytes

The important trust-boundary rule is:

> the builder, not the signer, defines the annex bytes.

If the signer gets to invent or transform proof bytes late, offline review gets
much weaker.

## Signer Responsibilities

The signer would need to:

1. parse the base PSBT
2. confirm that the designated carrier input is Taproot-capable
3. confirm that the explicit header commits to the provided `annex_sha256`
4. sign the Taproot input using annex-aware sighash behavior
5. attach the annex as the last witness element for the carrier input
6. emit both `txid` and `wtxid`

The signer should **not** be allowed to silently replace the annex with a
different payload.

If the signer changes the annex:

- the explicit header hash no longer matches
- the indexer should reject the reveal

## Indexer Responsibilities

The indexer would need to:

1. parse the explicit `BATCH_REVEAL` header from outputs
2. read `carrier_input_index`, `annex_sha256`, and `annex_bytes_length`
3. parse witness data for that exact input
4. confirm an annex is present
5. hash the annex bytes and compare against the header
6. decode the annex bytes as a Merkle proof
7. reconstruct the claim leaf and verify it against the batch root

This is the key reason the header-hash model is attractive:

- the txid-visible part of the transaction commits to the witness payload the
  protocol expects

That keeps the witness data auditable rather than merely "attached".

## Why Not Let The Signer Attach Annex Later Without A Sidecar?

That would be much looser.

If the unsigned artifact only said:

- here is a PSBT
- please attach the right annex later

then the signer becomes responsible for creating protocol-semantic content, not
just signing reviewed content.

That is a poor fit for:

- offline review
- reproducibility
- protocol auditability

So the stronger rule is:

> unsigned artifacts must already contain the exact annex bytes, or at least an
> exact annex hash plus deterministic derivation rules that leave nothing to
> signer discretion.

The current bias should be:

- carry the exact annex bytes in the unsigned sidecar

## Why Not Rely On `txid` Alone?

Because for witness-bearing transactions, `txid` is only the base transaction
identifier.

If GNS semantics depend on witness annex bytes, then:

- `txid` alone does not prove the intended proof bytes were used

The artifact and protocol both need to care about:

- the explicit header hash commitment
- the annex hash
- the final `wtxid`

## Product And Review Implications

If GNS ever adopts this path, the product story changes.

Users and reviewers would need to understand:

- the PSBT is only the base transaction container
- the annex sidecar contains protocol-semantic proof bytes
- the explicit header commits to those bytes
- `wtxid` matters in a way it does not matter for the current explicit-output
  path

That is all manageable, but it is a higher-complexity review story than the
current v0 design.

## Main Advantages Of This Envelope Shape

- keeps the large proof payload in witness
- preserves an explicit parseable on-chain header
- gives the indexer a deterministic way to locate the annex
- prevents the annex from becoming a hidden uncommitted side payload
- makes artifact review more rigorous than "PSBT plus hope"

## Main Drawbacks

- no longer a normal PSBT-only flow
- likely poor fit for standard wallets like Sparrow
- requires custom builder/signer/finalizer logic
- requires indexer witness parsing
- introduces `wtxid` as an important artifact field

## Current Recommendation

If we keep researching the annex path, this should be the next working mental
model:

- **small explicit header remains**
- **header commits to annex hash**
- **annex carries proof bytes**
- **unsigned artifact includes exact annex bytes**
- **signed artifact includes `wtxid`**

That is probably the cleanest version of an annex-based GNS reveal that still
feels reviewable and protocol-legible.

## Next Questions

The next useful follow-ups after this note are:

1. can we refine the rough annex weight model using this hybrid
   `explicit-header + annex` envelope instead of the earlier upper-bound style
   estimate?
2. what exact annex byte format should `gns-batch-proof-v0` use?
3. can bitcoinjs-lib or adjacent tooling realistically support this without
   invasive custom finalization work?
4. is the custom-tooling cost worth it relative to simply keeping explicit proof
   carriage and smaller batches?
