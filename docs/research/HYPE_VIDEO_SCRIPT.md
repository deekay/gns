# GNS Hype Video Script

This is a messaging draft for the short GNS explainer / hype video.

It is intentionally script-like rather than protocol-spec-like. The goal is to make the core ideas legible quickly, while staying aligned with the deeper docs.

## Current Draft

Every name you use online is rented.

Your domain renews annually through a registrar that can suspend it. Your social handle lives on a platform that can deactivate it. Your email address belongs to a provider that can close your account.

These are not edge cases. Domains get suspended. Accounts get deleted. Businesses and individuals lose names they spent years building around because the name was never really theirs. It was on loan.

Global Name System is a different approach.

A GNS name is something you control directly. No registrar. No platform. No renewal fee to a gatekeeper. The ownership record is public, verifiable, and anchored to Bitcoin.

There is still a cost to claiming a name. Naming is never free. The difference is what kind of cost it is.

Most naming systems make you pay a third party. GNS uses a bond instead. You lock bitcoin you still own. That bond has a real financial cost because capital has time value and opportunity cost, but it does not have to be paid to a registrar, a company, or a treasury. It is pricing without tribute to a gatekeeper.

Here is how it works.

To claim a name, you lock bitcoin as a bond. The name goes through a settlement period, during which the bond stays parked. Once settlement completes, the bond is yours to reclaim. The name remains yours.

What the name points to can change. A payment address, a website, an identity key, a service endpoint. Those records live off-chain and are signed by the current owner. The mutable pointer stays lightweight. The ownership record is what stays permanent.

This matters even more as software starts acting on your behalf. When an agent routes a payment, authenticates a counterparty, or calls a service without a human in the loop, the final destination should not rest on a probabilistic guess or on a rented domain. GNS gives human-readable names cryptographically grounded ownership.

Other naming systems charge rent or depend on organizations that can change terms, remove access, or govern the namespace for their own interests. GNS is meant to be different: no token, no founder allocation, no whitelist, no protocol-level sale of names. Just a public namespace open under the same rules for everyone.

Think about what it would have meant to register a domain in the early web, before the rest of the world fully appreciated what those names would become. Thousands of future companies, brands, and identities were still sitting there, unclaimed. That moment never comes back.

GNS is currently live on a private signet: a controlled Bitcoin test environment where anyone can inspect the idea, search names, prepare claims, and verify the ownership history for themselves.

A name you control, anchored to Bitcoin, without paying a gatekeeper to keep it alive.

That is Global Name System.

## Messaging Notes

- Lead with the idea that bonds are still pricing, but a special form of pricing.
- Emphasize that GNS does not make naming free; it changes who gets paid and what the claimant retains.
- Keep the difference between:
  - ordinary Bitcoin fee-market costs
  - and the protocol's own bond pricing
  clear in spoken explanations.
