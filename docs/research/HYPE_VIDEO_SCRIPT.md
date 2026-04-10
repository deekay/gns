# GNS Hype Video Script

This is a messaging draft for the short GNS explainer / hype video.

It is intentionally script-like rather than protocol-spec-like. The goal is to make the core ideas legible quickly, while staying aligned with the deeper docs.

## Current Draft

Bitcoin addresses are not a human interface.

If you are paying someone, approving a merchant, or telling software which counterparty you mean, raw addresses and opaque account strings are a bad final interface.

Readable names exist, but they usually depend on somebody else. A domain depends on a registrar. A social handle depends on a platform. A payment alias often depends on a service provider.

Global Name System is a different approach.

A GNS name is a human-readable name anchored to Bitcoin. It gives you a way to say who you mean before money moves, without relying on a registrar, a platform handle, or a gatekeeper-controlled alias.

There is still a cost to claiming a name. Naming is never free. The difference is what kind of cost it is.

Most naming systems make you pay a third party. GNS uses a bond instead. You lock bitcoin you still own. That bond has a real financial cost because capital has time value and opportunity cost, but it does not have to be paid to a registrar, a company, or a treasury. It is pricing without tribute to a gatekeeper.

Here is how it works.

To claim a name, you lock bitcoin as a bond. The name goes through a settlement period, during which the bond stays parked. Once settlement completes, the bond is yours to reclaim. The name remains yours.

What the name points to can change. A payment address first. Later, an identity key or a service endpoint. Those records live off-chain and are signed by the current owner. The mutable pointer stays lightweight. The ownership record is what stays permanent.

This matters even more as software starts acting on your behalf. Let the model infer what you want. Do not let the model guess who you mean. When an agent routes a payment, authenticates a counterparty, or calls a service without a human in the loop, the final destination should not rest on a probabilistic guess or on a rented domain. GNS gives human-readable names cryptographically grounded ownership.

Other naming systems charge rent or depend on organizations that can change terms, remove access, or govern the namespace for their own interests. GNS is meant to be different: no token, no founder allocation, no whitelist, no protocol-level sale of names. Just a public namespace open under the same rules for everyone.

The first proof point is simple: pay the right person in words you control. The broader future can come later: services, identities, richer software delegation. But the payment problem alone is already real.

GNS is currently live on a private signet: a controlled Bitcoin test environment where anyone can inspect the idea, search names, prepare claims, and verify the ownership history for themselves.

A name you control, anchored to Bitcoin, for choosing who you mean before money moves.

That is Global Name System.

## Messaging Notes

- Lead first with payment and counterparty trust, not with generic naming ambition.
- Lead with the idea that bonds are still pricing, but a special form of pricing.
- Emphasize that GNS does not make naming free; it changes who gets paid and what the claimant retains.
- Keep the difference between:
  - ordinary Bitcoin fee-market costs
  - and the protocol's own bond pricing
  clear in spoken explanations.
