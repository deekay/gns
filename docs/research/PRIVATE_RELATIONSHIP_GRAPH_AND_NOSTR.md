# Private Relationship Graph and Nostr

This note explores a higher-layer idea that should stay clearly separate from the core purpose of GNS.

The idea is simple:

- GNS provides public human-readable names and public authority
- a separate encrypted layer could provide private relationship memory on top

Examples of that private memory:

- people I have paid before
- local nicknames and notes
- trust labels and allowlists
- preferred rails or services for a given name
- contact or messaging relationships
- client preferences that should follow me across devices

## Why This Is Not The Core GNS Value Layer

GNS value records are currently much closer to:

- public or semi-public resolution data
- name-centric records
- owner-signed statements about what a name points to

A private relationship graph is a different thing:

- user-centric instead of name-centric
- encrypted instead of publicly resolvable
- more like app state or personal memory than canonical name resolution

That is why this should be treated as:

- a layer built on GNS
- not what the GNS resolver layer itself is for

## Why Nostr Is A Plausible Substrate

Nostr already has several ingredients that are relevant here.

### 1. Encrypted payloads

[NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) defines versioned encrypted payloads for signed events.

### 2. Private messaging

[NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) defines private direct messages using gift wrapping and NIP-44 encryption, with recovery and relay conventions for DM inboxes.

### 3. Private and public lists

[NIP-51](https://github.com/nostr-protocol/nips/blob/master/51.md) explicitly supports lists with both public and private items. Private items can be encrypted in the event content.

### 4. App-specific storage

[NIP-78](https://github.com/nostr-protocol/nips/blob/master/78.md) is explicitly about arbitrary custom app data and calls out remoteStorage-like capabilities for apps that want a "bring your own database" model.

### 5. Cross-app wallet state already exists there

[NIP-60](https://github.com/nostr-protocol/nips/blob/master/60.md) already uses relays to store encrypted Cashu wallet state so a wallet can move across applications.

That does not prove Nostr is the right answer for GNS private data, but it does show that the ecosystem is already using Nostr for exactly this kind of "private, portable, user-controlled app state" pattern.

## What Nostr Seems Better At Than GNS For This

If the goal is encrypted personal sync, Nostr has some clear advantages over trying to overload the GNS resolver layer:

- it is user-centric
- it already has relay and client conventions for personal state
- it already has encrypted payload conventions
- it already has replaceable and addressable events for app data
- it already has some cross-client wallet and messaging patterns

This makes Nostr look like a more natural substrate for:

- paid-contact memory
- private notes
- personal allowlists
- messaging/contact graphs
- app-specific encrypted settings

## What Nostr Does Not Solve

Nostr should not be confused with GNS's core authority model.

Nostr is not a replacement for:

- chain-derived canonical ownership
- objective global name resolution
- public transfer history for scarce names
- Bitcoin-anchored authority

It is much better thought of as:

- an encrypted sync and messaging substrate
- not a canonical namespace

## Important Privacy And Security Caveats

Nostr is promising here, but it comes with real caveats.

[NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) explicitly warns that relay-based architecture makes stronger private messaging properties hard, and says high-risk users should prefer specialized end-to-end encrypted messaging software and use Nostr mainly for exchanging contacts.

Important caveats include:

- relay metadata leakage
- no strong global consistency guarantees
- limited or absent forward secrecy in many patterns
- relay availability and support fragmentation
- draft status for some NIPs that matter here

So the right framing is probably:

- good enough for private app sync and relationship memory
- not obviously ideal for the highest-risk secure messaging use cases

## A Plausible Hybrid

The cleanest architecture may be:

- GNS for public names and public authority
- Nostr for encrypted personal state about those names

For example, a client could store encrypted records such as:

- `david` -> trusted recipient, paid before, reimbursements OK
- `river` -> preferred buy service, pinned by user
- `lightspark` -> notes, support history, internal labels

That data would be:

- private to the user
- portable across the user's clients
- separate from the public meaning of the names themselves

## Recommendation

If this is explored later, it should probably be framed as:

- a higher-layer encrypted relationship graph built on top of GNS
- likely using Nostr or something Nostr-like as the sync layer

Not as:

- a reason to make GNS's own public value layer into a general private datastore

## Design Guardrails

If this direction is ever prototyped, a few guardrails seem wise:

- use a separate app/storage key, not the GNS owner key
- keep public name resolution separate from private app state
- treat Nostr sync as convenience and portability, not canonical truth
- assume relay privacy is imperfect
- avoid promising Signal-like security properties unless a much stronger messaging design is used
