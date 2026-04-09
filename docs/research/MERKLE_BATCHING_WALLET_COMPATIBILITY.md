# Merkle Batching Wallet Compatibility Matrix

This note answers a practical question:

> which reveal-proof carrier options work with ordinary wallet / PSBT flows
> today, and which ones would require custom GNS tooling?

It is meant to complement:

- [MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md](./MERKLE_BATCHING_REVEAL_CARRIER_OPTIONS.md)
- [MERKLE_BATCHING_TAPROOT_ANNEX_SKETCH.md](./MERKLE_BATCHING_TAPROOT_ANNEX_SKETCH.md)
- [MERKLE_BATCHING_ANNEX_TOOLING_SPIKE.md](./MERKLE_BATCHING_ANNEX_TOOLING_SPIKE.md)

## Short Answer

If we care about compatibility with ordinary wallets like Sparrow today, the
current explicit reveal-proof carrier is the safest path by far.

If we move toward an annex-based or script-path-based reveal, the story changes:

- it may still be possible
- but it likely stops being a normal "export PSBT and sign in a traditional
  wallet" flow
- and starts becoming a **custom GNS builder / signer / finalizer** flow

## Compatibility Levels

- `good`
  - plausible with normal wallet usage today
- `mixed`
  - maybe possible, but only with careful implementation or limited wallet support
- `poor`
  - likely requires custom tooling rather than a standard wallet flow

## Matrix

| Carrier Option | Sparrow / Traditional Desktop Wallet | Hardware-Wallet PSBT Flow | Custom GNS CLI Signer | Hosted Coordinator / Managed Flow | Notes |
| --- | --- | --- | --- | --- | --- |
| Explicit reveal header + explicit proof outputs | good | good | good | good | Current best compatibility path |
| Better explicit packing | good | good | good | good | Same model, smaller encoding changes only |
| Taproot annex proof + explicit reveal header | poor | poor | mixed to good | mixed to good | Most promising deeper scaling path, but likely not a standard wallet flow today |
| Taproot script-path proof carrier | poor | poor | mixed | mixed | Much more complex than annex and harder to explain/review |
| P2WSH witness proof carrier | poor | poor | mixed | mixed | Witness discount helps, but ergonomics and tooling fit are weaker |
| Off-chain proof artifact with minimal on-chain reference | mixed | mixed | good | good | Smallest footprint, but weakest fit for GNS trust model |

## Why Explicit Carrier Works With Traditional Wallets

The current v0 design stays very wallet-friendly because it does not ask the
wallet to do anything unusual:

- sign ordinary witness pubkey hash inputs
- produce an ordinary fully signed transaction
- tolerate explicit data-carrier outputs

That means the proof bytes are just part of the visible transaction outputs.
They do not alter the signature model itself.

So from the wallet's perspective, this is still close to a normal
"sign the transaction you see" flow.

## Why Annex Changes The Compatibility Story

This is the key point.

Under Taproot, the annex is part of the signature hash. So the signer is not
just signing "the same transaction plus some ignored bytes". It is signing a
different message when annex is present.

That means annex support is not just:

- display some extra metadata

It is:

- construct the transaction correctly
- ensure the annex bytes are in the right witness position
- hash/sign with annex awareness
- preserve exact byte-level consistency through finalization

So even if a wallet "supports Taproot", it does **not** automatically mean it
supports annex-dependent signing as part of an ordinary PSBT flow.

## Why Sparrow Is Probably Not A Clean Annex Path Today

The practical signals are not encouraging for "normal Sparrow flow" support:

- [BIP341](https://bips.xyz/341) includes annex in Taproot sighash computation
- [BIP371](https://bips.dev/371/) defines Taproot PSBT fields, but does not
  define a standard annex field in the PSBT input model
- Sparrow's underlying library, Drongo, clearly has annex-aware Taproot hash
  code, but its normal Taproot signing path passes `annex = null`
- Drongo also still contains a `TODO` around Taproot script-path handling

Those signals together suggest:

- annex is understood as a protocol primitive
- but ordinary wallet signing flows are not obviously built around it

So the best current answer is:

> annex-based GNS reveals might be possible with custom work, but they are
> probably not something we should assume works cleanly with Sparrow out of the
> box today

## Hardware Wallets

The compatibility story is even weaker here.

Why:

- many hardware wallet PSBT flows already expose only a subset of Taproot
  behaviors cleanly
- annex-dependent signing is less common than ordinary key-path signing
- custom witness structure or finalization logic can be awkward or unsupported

So for now:

- explicit carrier: good fit
- annex / script-path carrier: likely poor fit unless the hardware path is
  custom-managed

## Custom GNS CLI Signer

This is where the deeper paths become most realistic.

If we control:

- artifact generation
- transaction assembly
- sighash inputs
- finalization

then we can support more specialized carrier paths that ordinary wallets may
not expose.

So for deeper protocol experimentation:

- custom CLI signer is the natural place to start

That is likely true for:

- annex-based reveal carriage
- script-path-based reveal carriage

## Hosted Coordinator / Managed Flow

This sits between traditional wallets and a fully local custom signer.

If GNS ever offered a more managed path, a coordinator could:

- construct the correct transaction shape
- ensure proof bytes are attached correctly
- hand off only the signature-critical parts
- or even centralize more of the finalization flow

That makes annex or witness-heavy designs more plausible in a hosted path than
in a generic wallet-export path.

But the tradeoff is obvious:

- more convenience
- less "works with any standard wallet" simplicity

## Practical Recommendation

If broad wallet compatibility is a top goal, the current ranking is:

1. explicit proof carrier
2. better explicit packing
3. annex research only after accepting that the flow may no longer fit ordinary
   wallet signing cleanly

If maximum future scaling is the top goal, then the likely ranking is:

1. annex research
2. script-path research
3. explicit carrier only as the conservative fallback

## Current Conclusion

For GNS right now, I would summarize it like this:

- `explicit proof outputs`
  - strongest compatibility with wallets like Sparrow
  - best near-term deployment story

- `Taproot annex`
  - strongest next-step scaling research path
  - but likely a custom-tooling story before it becomes a general wallet story

- `Taproot script-path`
  - real research option
  - but even less likely to feel like a normal wallet flow in the near term
