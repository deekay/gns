# GNS Narrative Framework

This note is a working draft for how to talk about GNS.

It is not a protocol specification and it is not a launch announcement. The goal is to sharpen the story, the flagship scenes, and the moral intuition behind the system.

## Working Thesis

GNS is a censorship-resistant human-readable naming layer for Bitcoin payments first, and Bitcoin counterparties more broadly over time.

The front-door use case is simple:

- who do I mean before money moves?
- how do I say that in words instead of raw addresses, opaque accounts, or third-party handles?
- how does my software verify that I meant the same person or business I think I meant?

Machines can use keys, hashes, and opaque identifiers without much trouble. Humans cannot. GNS exists to make those instructions legible and cryptographically grounded without depending on DNS, a registrar, or a platform account.

The broader ambition can stay open-ended, but it should not be the first thing the story asks people to believe. The near-term claim can stay much narrower:

- who should get paid?
- who do I mean?
- which counterparty do I trust?
- which Bitcoin-native service should my software use after that?

The short version is:

- Bitcoin gave us sovereign money.
- GNS explores sovereign naming for Bitcoin payments first, with room to grow into broader counterparty and service naming later.

## The Problem To Paint

The strongest near-term problem is not "how do we replace DNS?" It is much closer to:

- Bitcoin addresses are not a human interface
- DNS and platform handles are readable, but they depend on third parties
- people need a better way to specify who they mean before money moves or a service is used

That is already enough to justify a system like GNS inside the Bitcoin ecosystem.

This makes the project easier to believe:

- Bitcoin has room for new naming and coordination layers
- human-readable payment and service selection is already a real need
- censorship resistance and third-party independence are already legible values in this ecosystem

The broader future can remain visible in the background:

- software will act more often on behalf of humans
- humans will still need to choose counterparties and approve risk
- names will matter more as the action surface gets delegated

But that future should feel like expansion and option value, not a prerequisite for the first story to work.

## Core Claim

GNS should be framed first as a system for choosing who gets paid in Bitcoin and, secondarily, which Bitcoin-native counterparty or service to trust.

That umbrella is broad enough to include:

- payment destinations
- Bitcoin-native services
- identity
- richer delegation later

But it is more ambitious than any one of those alone.

The most important sentence may be:

> GNS gives humans a way to tell software who they mean.

That is stronger than:

- decentralized handles
- a DNS replacement
- a human-readable payment alias alone

Those may be examples or partial stepping stones, but they are not the full thesis.

## Front Door And Long Arc

The front door should be narrower than the full design space.

The best initial framing is something like:

- censorship-resistant human-readable naming for Bitcoin payments and counterparties

That lets the story start from something already believable:

- pay the right person
- check that a payment target is still the one you expect
- use the right Bitcoin-native service after that
- reduce dependence on DNS-era naming and platform handles

The long arc can remain much broader because the protocol already allows richer name/value uses. Over time, if better clients and supporting infrastructure emerge, the same naming layer could support:

- broader service selection
- stronger delegation policies
- richer identity and profile records
- more agent-mediated software flows

The key is not to demand belief in that larger future before the Bitcoin-native wedge has had a chance to prove itself.

## Probabilistic Models, Deterministic Counterparties

Large language models increase the amount of interpretation in the interface.

This is useful as a second-order framing, but it probably should not be the main front-door story.

That is useful for understanding what a human wants. It is much less acceptable when the same uncertainty leaks into who gets trusted, called, or paid.

So one important way to frame GNS is:

- LLMs widen the interpretation surface
- GNS narrows the action surface

Or more concretely:

- let the model infer what I want done
- do not let the model guess who I mean

This keeps the division of labor clear.

The model can remain probabilistic about understanding intent. GNS helps make execution more constrained at the counterparty layer, so a human can say, in effect:

> If you are going to serve me, here is how to do it according to the names and preferences I actually use.

That means some words in a prompt stop being soft hints and start becoming trusted constraints.

## What The Story Should Emphasize

### 1. Human legibility at the trust boundary

GNS matters where a person chooses, approves, delegates, audits, or revokes.

Human-readable names are not primarily for agent-to-agent coordination. Agents can use long keys and machine-native identifiers directly. The value of GNS is at the human boundary, where intent has to be expressed in terms a person can understand.

### 2. A believable Bitcoin-native wedge

The story should begin where the need is already easy to see:

- choosing who to pay
- verifying that a payment target has not silently changed
- choosing which Bitcoin-native service to trust after that
- reducing dependence on DNS and platform-controlled naming

That is a much easier first ask than "replace web navigation" or "invent a new browser."

### 3. Counterparty trust, not just discoverability

The problem is not only finding a destination.

The deeper problem is knowing that the destination is the one you meant. A name should help a human say:

- use `river` for buys
- use `lightspark` for this service
- pay `david` back for dinner
- only buy from services on my allowlist
- only call the support endpoint attached to the name I trust

The point is not just resolution. It is authoritative resolution.

### 4. Human-readable authority, not only human-readable payments

A payment alias is a good proof point because the cost of misdirection is obvious. But payment is still a special case of a broader problem:

- a human needs to specify the intended counterparty
- software needs to verify the mapping before acting

So the larger claim is not "easier addresses." It is "human-readable authority."

## Flagship Scene

The strongest flagship scene is probably not two agents talking to each other.

It is a human setting instructions for software:

1. A person tells their client: pay `david`, use `river` for recurring buys, and only interact with payment or service names I have approved above a threshold.
2. The client resolves those names, verifies the owner-signed records and policy constraints, and shows the human what it is about to do in terms the human can understand.
3. The software handles the underlying protocols, keys, capabilities, and payment rails.

The human does not need to inspect raw identifiers. The machine still can.

That is the bridge GNS is trying to provide.

## Use-Case Ladder

The use cases should probably stack in this order.

### 1. Pay the right person

This is the easiest first scene to understand.

- the cost of a mistake is immediate
- the value of a clear human name is obvious
- the Bitcoin audience already understands the pain of opaque addresses

This is the best starting point. It is also a proof point, not the whole story.

### 2. Use the right service

This is the next expansion after the payment story lands.

The human problem is not only "where do I send money?" It is also:

- which wallet, exchange, routing, or payment service do I authorize?
- which endpoint should my client call?
- which support or recovery flow is the one I actually mean?
- which service name should my software trust before it acts?

This is where the phrase "choose which service to trust" becomes useful, but it should come after the payment wedge is already legible.

### 3. Delegate safely to software

This is the long arc.

A person will increasingly want to set standing instructions such as:

- never pay unapproved names above a threshold
- prefer names I have pinned before
- only use endpoints signed by the current owner key
- warn me when the resolved target changes

At that point GNS starts to look like a trust layer for delegation rather than a lookup convenience.

## Near-Term Sci-Fi, Not Far-Term Fantasy

The story should feel speculative in its implications, but conservative in its assumptions.

The document should avoid pretending we know the exact shape of a future agent-run internet. It is enough to say:

- software will browse and transact more often
- humans will remain responsible for policy and approval
- names are where people express intent
- opaque identifiers are not an acceptable final interface

But this should stay behind the Bitcoin-native wedge rather than in front of it. The larger future matters as a reason the design has upside, not as the primary thing skeptics must accept on day one.

The tone should be:

- inevitable in the problem
- humble about the exact mechanics
- concrete about why names matter

## Two-Lane Moral Intuition

The two-lane story strengthens the philosophy rather than weakening it.

The old pure story said all names should be treated the same. The stronger updated story is that not all names create the same coordination pressure, and pretending otherwise does not produce fairness.

The moral center should be:

- legitimacy through open markets

With two supporting consequences:

- anti-squatting
- bootstrapping the ecosystem

That order matters.

If bootstrapping comes first, the mechanism can sound extractive. If legitimacy comes first, the market structure sounds principled:

- some names are socially salient
- giving them away cheaply is not neutral
- insider allocation is not acceptable
- protocol operators should not hand-price the whole world
- open competition with visible rules is the more credible answer

So the two-lane launch says:

- ordinary names stay simple
- salient names go through a more explicit market

This is not a retreat from fairness. It is a better market-based account of fairness.

## Relationship To DNS-Based Human Bitcoin Addressing

This should have a respectful but clearer place in the story.

The main points are:

- human-readable payment aliases solve a real human problem
- DNS-based approaches can be part of a transitional landscape
- GNS is aimed at the same human need, but with a more sovereign foundation
- over time GNS can also extend beyond payment naming into broader human-readable authority

That keeps the tone friendly, acknowledges useful adjacent work, and makes the architectural distinction legible without turning the narrative into an attack.

## Suggested Messaging Lines

These are working lines, not final copy.

- Machines can use keys. Humans need names.
- GNS is how humans tell software who they mean.
- GNS starts by helping Bitcoin users pay the right person in words they control.
- Pay the right person. Then use the right service. Say it in words you control.
- Let models infer your intent. Do not let them guess who you mean.
- LLMs widen the interpretation surface. GNS narrows the action surface.
- Probabilistic understanding, more deterministic counterparties.
- Bitcoin removed banks from money. GNS explores more sovereign naming around Bitcoin payments first, and Bitcoin services after that.
- In an automated internet, the critical interface is trustworthy naming.
- A name is the shortest safe instruction a human can give a machine.
- The goal is not just human-readable payments. It is human-readable authority.

## Narrative Hazards To Avoid

- Leading with "better DNS" makes the ambition feel smaller than it is.
- Leading with "DNS replacement" asks people to believe too much too early.
- Leading with identity alone makes GNS sound like a handle system.
- Leading with anti-censorship alone can sound generic and underspecified.
- Leading with generic key/value publishing can make the protocol feel abstract before the payment problem lands.
- Leading with premium-name monetization can make the project feel extractive before the fairness argument lands.
- Leading with a speculative new browser can make the core use case sound less believable.
- Over-describing a sci-fi future can make the thesis feel less credible instead of more credible.
- Narrowing too far into "just a payment alias" can hide the protocol's upside.

## A Good Narrative Shape

One simple structure for a public-facing essay or presentation:

1. Bitcoin users need a better human interface for choosing who gets paid.
2. Raw addresses, DNS aliases, and platform handles each leave something important on the table.
3. GNS explores a censorship-resistant naming layer for Bitcoin payments first, then counterparties and services more broadly.
4. The same design can grow into broader human-readable authority over time.
5. Ordinary names can stay simple; salient names need more legitimate market structure.

## Open Questions

These questions should keep guiding the storytelling work:

- How explicitly should the public story talk about censorship resistance versus convenience?
- Which payment-first scene makes the thesis click fastest: paying a person, paying a merchant, or approving a recovery/support flow?
- What minimum data should a name resolve to in the front-door story: payment target, endpoint, owner authority, or a bundle?
- How soon should the broader browser or agent story appear after the first Bitcoin-native framing lands?
