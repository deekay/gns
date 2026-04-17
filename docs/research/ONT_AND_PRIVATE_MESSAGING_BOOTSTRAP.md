# ONT and Private Messaging Bootstrap

This note explores a messaging use case for ONT that should remain secondary to
the payment-handle story.

The central question is not:

- should ONT become a messenger?

It is:

- can ONT help people know who they are messaging, discover current contact
  endpoints, and preserve identity continuity across messaging tools?

## Why This Matters

Modern secure messaging systems often make tradeoffs around identity and
discovery:

- phone-number identity
- app-specific usernames
- platform-controlled directories
- weak portability across apps or protocols

At the same time, the safest messaging systems often avoid a strong public
identity layer on purpose.

That creates a tension:

- humans want stable names
- private systems often avoid public discoverability

ONT may be useful at that boundary if it is treated carefully.

## The Useful Role For ONT

ONT looks most useful here as:

- a human-readable contact bootstrap layer
- a continuity layer for contact identity
- a way to publish current public messaging endpoints or keys

That means a name could point to a signed messaging bundle such as:

- protocol hints
- public identity keys
- relay or server hints
- key-rotation information
- links to richer public contact metadata

In that model, the user says something like:

- message `david`

And the client learns the current trusted messaging endpoints from the
owner-signed record.

## What ONT Should Not Try To Be Here

ONT should not be framed as:

- the private transport layer
- the thing that makes messaging confidential
- the thing that replaces end-to-end encryption
- the thing that solves high-risk anonymity by itself

The public name helps you know who you mean. It does not guarantee that the
messaging transport is private or safe enough for every threat model.

## Why Public Names Are Tricky For Messaging

Messaging is more privacy-sensitive than payments in several ways.

A public human-readable name can become:

- a stable correlation point
- a discoverability surface
- a social graph anchor

That can be useful for pseudonymous or public-facing communication, but it can
be harmful for:

- whistleblowers
- dissidents
- people who need deniability
- users who do not want a globally discoverable alias

So the right model is probably:

- useful as an optional public contact layer
- dangerous as a mandatory identity layer for all users

## White Noise / Marmot As A Concrete Example

White Noise is an interesting example of the kind of system ONT could pair with.

As of April 12, 2026, [White Noise](https://www.whitenoise.chat/) describes
itself as a secure and private messenger that is "identity-free," with no phone
numbers or emails required. Its build docs say it is built on Nostr, Blossom,
and MLS via the Marmot protocol, with Nostr keypairs used for identity and
separate MLS signing keys. See [White Noise](https://www.whitenoise.chat/) and
[Build with Marmot](https://www.whitenoise.chat/build).

That suggests a clean pairing:

- White Noise / Marmot handles encrypted transport and messaging mechanics
- ONT could optionally handle human-readable contact bootstrap and identity
  continuity

For example, an ONT name could point to:

- a stable Nostr pubkey
- preferred relay hints
- protocol support metadata
- a pointer to richer public contact material

That would let a client interpret:

- message `david`

As:

- resolve `david`
- fetch the current public messaging bundle
- hand off to White Noise or another supported messenger for the actual secure
  conversation

## A Clean Division Of Labor

The division of labor should stay simple:

- ONT: who you mean
- messenger: how you talk safely

That is the most honest framing.

ONT helps with:

- human-readable contact discovery
- continuity across key rotation or app migration
- public bootstrap for contact methods

The messenger still has to handle:

- end-to-end encryption
- forward secrecy and post-compromise security
- metadata minimization
- group messaging
- abuse controls
- device sync and message storage

## Where This Fits Strategically

This is a real use case, but probably not the first public story.

Why it is promising:

- the identity problem is obvious
- phone-number dependence is widely disliked
- people already understand the pain of app-specific handles and identity
  silos

Why it should remain secondary:

- payments are still easier to explain and more obviously high-stakes
- messaging has much trickier privacy tradeoffs
- it is easier to overclaim what public names can safely do in a messaging
  context

So the likely story order is:

1. payment handles first
2. service selection second
3. optional public contact bootstrap for messaging as an adjacent use case

## What Might Live In ONT vs Above It

Things that plausibly belong in ONT or owner-signed public records:

- public messaging protocol hints
- public identity keys
- public server or relay hints
- key-rotation continuity signals
- public contact metadata

Things that likely belong above ONT:

- message history
- private contact graph
- private notes and trust memory
- encrypted inbox state
- delivery guarantees
- notification routing
- high-risk privacy protections

## Recommendation

If this direction is mentioned publicly, it should be phrased as:

- ONT can provide a user-owned human-readable contact layer for messaging apps,
  while the private transport happens somewhere else.

That keeps the claim useful and believable.

## Design Guardrails

If this is explored later, a few guardrails seem important:

- keep it optional, not mandatory
- do not imply a public name is suitable for every threat model
- keep ONT separate from the messaging transport layer
- make room for multiple messaging protocols rather than coupling ONT to one
  app
- preserve the payment-handle narrative as the main entry point
