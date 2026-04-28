# Payment Names and Trust Signals

This note tries to make the payment-handle ONT story more concrete.

The main idea is that modern payment UX is not only about routing money. It is
also about helping a human feel confident that they are paying the right person
or business.

That confidence usually comes from more than a raw destination string.

## What Existing Payment Apps Get Right

When people use Venmo, PayPal, Cash App, bank apps, email, or messaging-linked
payment systems, they usually do some mix of:

- search by name
- recognize a handle
- check a photo or profile
- check whether they have paid this person before
- infer legitimacy from surrounding network signals
- confirm against context such as mutuals, notes, or transaction history

The real UX is not just:

- `name -> address`

It is closer to:

- discovery
- disambiguation
- trust confirmation
- payment execution

## What Bitcoin Systems Often Lack

Bitcoin gives strong settlement and censorship resistance, but the human-facing
payment layer is still weak in many products.

What users often get instead is:

- opaque addresses
- opaque invoices
- QR codes with little identity context
- weak continuity across repeated payments
- few built-in trust or confirmation signals

So the user is often left asking:

- am I paying the right person?
- is this the same merchant as last time?
- what changed since my last payment?

That is the gap ONT can help fill.

## The Job To Be Done

ONT should be thought of first as payment handles people can actually own, not
just prettier Bitcoin addresses.

The deeper job is:

> help humans say who they mean before money moves, and help software verify
> that choice with enough context to be safe.

That suggests a stronger product shape:

- a public human-readable name
- an authoritative owner
- a signed payment record
- layered trust signals around that record

## A Useful Payment UX Model

A payment client built on ONT should ideally walk through four stages.

### 1. Discovery

The user starts from a name:

- `david`
- `river`
- `lightspark`

The important thing is that the human starts from words, not from a long
destination string.

### 2. Disambiguation

The client helps the user distinguish among plausible meanings:

- which `david` do you mean?
- is this the merchant you used before?
- is this the same destination as last time?

### 3. Trust Confirmation

The client shows enough evidence to make the act legible:

- who owns the name
- what payment rails are attached
- whether the destination changed
- what public proofs or linked identities exist
- what private history the user has with this name

### 4. Payment Execution

Only after the user understands the recipient should the payment machinery
take over:

- BTC
- Lightning
- Silent Payments
- stablecoin rails later
- or whatever other payment instruction types clients support

## What Should Live In Core ONT

Core ONT should stay narrow and authoritative.

Things that belong in ONT itself:

- the human-readable name
- chain-derived ownership
- transfer history
- owner-signed payment records
- typed destination records or bundles that tell clients what rails or endpoints are
  available
- sequence and freshness semantics for those owner-signed records

If the payment-handle story stays central, core ONT should mostly answer:

- who owns this name?
- what did the current owner sign as the latest payment record?
- what rails or endpoints are currently attached to that name?

That is already useful and already meaningfully better than a raw address.

## What Should Not Live In Core ONT

Core ONT should probably not try to directly absorb all the social and product
signals that make modern payment apps feel reassuring.

Things that likely do **not** belong in core ONT:

- mutuals or follower graphs
- social reputation scores
- platform-specific verification programs
- personal transaction history
- private notes
- per-user allowlists and preferences
- dispute-driven identity judgments about who the "real" person is
- general messaging or contact sync

Those things may matter a lot in practice, but they are not the same as
canonical name ownership.

## Public Layers Enabled By ONT

On top of core ONT, public overlays could add more context without changing
canonical ownership.

Examples:

- public proof bundles
- public merchant descriptors
- optional avatars or profile fields
- proof bundles showing that multiple public identities point back to the same
  ONT-controlled key
- resolver-distributed context records that clients can choose to display

These are useful as public signals, but they should remain clearly secondary to
the base question of who owns the name and what that owner signed.

## Private Layers Enabled By ONT

A separate private client-memory layer can add the kinds of signals people
already rely on in existing payment apps.

Examples:

- I have paid this person before
- I pinned this name
- this is my preferred `david`
- warn me if the target changed
- reimbursements are OK for this person
- notes, nicknames, and categories
- spending limits or approval policies tied to names

This is not public name resolution. It is personal trust memory.

That is why it likely belongs in client state or in a separate encrypted sync
layer rather than in the ONT resolver itself. See
[PRIVATE_RELATIONSHIP_GRAPH_AND_NOSTR.md](./PRIVATE_RELATIONSHIP_GRAPH_AND_NOSTR.md).

## Stablecoins and Multi-Rail Payments

A useful implication of the payment-handle framing is that ONT does not need to
be limited to Bitcoin-only destinations just because Bitcoin anchors the
namespace.

The cleaner distinction is:

- Bitcoin can anchor ownership
- names can still point to multiple payment rails

That means a name could later resolve to a payment bundle containing:

- Bitcoin instructions
- Lightning instructions
- Silent Payment information
- stablecoin payment endpoints
- or other rail-specific records that clients know how to interpret

This would let ONT stay Bitcoin-anchored while still being useful in a broader
payments world.

## A Good Architectural Split

The cleanest split may be:

### ONT core

- names
- ownership
- transfers
- owner-signed payment records

### Public overlays

- proofs
- metadata
- public linked identities
- public merchant context

### Private client memory

- paid-before history
- pins
- notes
- local labels
- approval policies

That structure mirrors how current payment systems actually help users, while
keeping the protocol itself from becoming a giant social product.

## Why This Story Is Strong

This framing helps explain why names matter without immediately demanding belief
in a broader identity or application ecosystem.

It starts from a question people already understand:

- who am I paying?

And it explains why a sovereign naming layer is useful:

- current payment UX depends heavily on names and trust signals
- Bitcoin mostly gives settlement without enough human context
- ONT can restore some of that context in a layered way without collapsing back
  into a centralized platform

## Open Questions

- What is the minimum useful payment record for the first story?
- Which public trust signals are useful enough to mention early without
  overcomplicating the protocol?
- Should the first product demo show only "name -> payment target" or also "paid
  before / target changed / pinned recipient" signals?
- How should multi-rail payment bundles be typed so clients can stay legible and
  safe?
