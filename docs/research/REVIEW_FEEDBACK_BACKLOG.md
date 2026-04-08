# Reviewer Feedback Backlog

This document captures the major open questions and objections raised during recent external review of the GNS video, one-pager, and prototype framing.

Its job is not to resolve everything immediately. Its job is to preserve the real points of contention so they can be worked through deliberately before broader outreach.

## How To Use This

- Treat this as a pre-broader-review checklist, not a changelog.
- Keep concerns grouped by issue cluster rather than by who said them.
- Update the `Current status` line as we form a clearer viewpoint or close an issue.

## 1. Terminology And Lifecycle Clarity

### Concern

Some basic protocol terms still created confusion in the one-pager and surrounding materials:

- `settlement period`
- `launch`
- `epoch`
- `maturity`

Reviewers were not always sure whether these referred to:

- mainnet launch
- the initial public opening of the namespace
- the life cycle of an individual name
- a recurring protocol epoch

### Why It Matters

If these terms are unclear in a short explainer, reviewers will infer that the design itself is still vague even when the underlying rule is already fairly specific.

### Current Status

Open, but partly improved in recent edits. Still worth treating as a first-class communication risk.

## 2. Fixed-At-Launch Versus Changeable-Later Rules

### Concern

Reviewers wanted a sharper distinction between:

- design choices that are still under discussion now
- parameters that will be frozen before launch
- things that could actually change after launch

This came up most clearly around the maturity schedule and epoch logic.

### Why It Matters

People are trying to assess whether GNS is governed by stable protocol rules or by future discretionary changes.

### Current Status

Partly answered in `DECISIONS.md`, but still not fully internalized in reviewer-facing materials.

## 3. Owner-Key Loss And Recovery

### Concern

If the owner key is lost, is the name effectively frozen forever?

Follow-on question:

- should a future version allow recovery through the wallet that controls the original or current bond UTXO?

### Why It Matters

This is both a usability issue and a sovereignty issue. Reviewers want to know whether the system has an unforgiving failure mode and whether that is intentional.

### Current Status

Current v1 stance is documented: no built-in recovery path. Still an open design area for future versions.

## 4. Premium Brands And Top-End Squatting

### Concern

The strongest economic objection so far is that the current bond model may be too focused on the total namespace and not focused enough on the economically relevant subset of names:

- major brands
- common words
- premium terms
- memorable personal or business names

The specific challenge is not "can someone corner all 6-character names?" but rather:

- can a wealthy actor rationally lock up the top 10,000 or 100,000 names people most care about?

### Why It Matters

This is currently the most serious challenge to the fairness story.

### Current Status

Active design paths now exist.

Current working direction:

- keep the objective base curve
- add a bounded, frozen, launch-only premium overlay for already-salient names
- score that overlay from public salience and coordination evidence
- allow a second inclusion path for clear natural-buyer capture-risk cases

Parallel alternative now under active exploration:

- keep a simple ordinary commit / reveal lane for non-reserved names
- prepare a broad reserved list of salient existing names
- defer those names to a later auction lane
- let the market set BTC amount under a fixed long lock instead of protocol-side pricing

Still open, but no longer structurally vague.

## 5. Bond Curve Justification

### Concern

Reviewers want a more defendable explanation for the current launch curve:

- why `1 BTC` for 1-character names?
- why a simple halving per character?
- why this floor?
- what real-world behaviors is the curve supposed to prevent or tolerate?

### Why It Matters

If the curve feels arbitrary, the fairness story feels arbitrary too.

### Current Status

Open. Existing spreadsheets and reasoning are helpful but do not yet answer the premium-name objection well enough.

## 6. Permissionlessness Versus Brand Expectations

### Concern

A permissionless, identity-free namespace may allow names like `nike` or `starbucks` to be claimed by someone other than the real-world brand holder.

That creates a challenge:

- is permissionlessness a virtue here?
- or does it weaken the usefulness of the namespace for names that people already expect to map to existing entities?

### Why It Matters

This is not just a trademark concern. It cuts directly into the AI and consumer trust story.

### Current Status

Open. There is a real worldview split here between:

- "existing brands are a bootstrapping problem"
- and "this is a major utility problem if not addressed"

## 7. Why GNS Instead Of DNS Plus Ranking Signals

### Concern

Reviewers are not yet fully convinced that GNS solves a sufficiently important problem that DNS, search, ranking signals, or other trust signals do not already cover.

The current AI/agent framing helped, but it did not close the case by itself.

### Why It Matters

If GNS is framed only as "another naming system," skepticism stays high. The product thesis needs to make clear what DNS does not do and why that matters more in an agentic world.

### Current Status

Open, but clearer framing language is emerging.

## 8. Need For A Concrete End-To-End Use Case

### Concern

Reviewers want a compelling example that shows:

- the human intent
- the agent interpretation step
- the authoritative resolution step
- the final payment or API action

They want to see the actual user payoff, not just the protocol properties.

### Why It Matters

The abstract argument is easier to dismiss than a realistic flow.

### Current Status

Open. We have draft language around the "Presidio Bitcoin" example, but it has not been turned into a canonical shared walkthrough yet.

## 9. Resolver Decentralization And Incentives

### Concern

Reviewers asked:

- who runs resolvers?
- why would they run them?
- how many are enough?
- how are they discovered?
- what incentives keep them complete and up to date?

### Why It Matters

The ownership story is strong, but if resolver availability feels hand-wavy, people may conclude that decentralization has simply been deferred to a weaker layer.

### Current Status

Open, but we do have real design material:

- completeness scoring
- multi-resolver publish/read
- bootstrap strategies
- possible on-chain announcements

The remaining gap is turning that into a tighter reviewer-facing position.

## 10. Blockspace And Throughput

### Concern

Reviewers want a stronger answer to:

- how much blockspace does this consume?
- how many claims or transfers fit at realistic fee levels?
- does this compete too much with Bitcoin's monetary use case?

The concern sharpened into a request for stronger footprint minimization and a more concrete scaling path.

### Why It Matters

This is a core Bitcoin-cultural question, not just an engineering optimization.

### Current Status

Open. Current footprint is measured, but the future minimization story is not settled.

## 11. Batching, Merkle Anchoring, And "Scriptless" Directions

### Concern

Reviewers want us to revisit smaller-footprint alternatives such as:

- Merkle batching
- OpenTimestamps-style anchoring
- Taproot tweaks
- signature-embedded reveals

The key question is whether some version of this should be part of launch rather than treated only as future work.

### Why It Matters

This is the main candidate answer to "respect blockspace more aggressively before launch."

### Current Status

Open, but more concrete than before. Current direction is to treat Merkle batching as the leading launch-plausible footprint improvement if batching becomes part of v1, while treating Taproot / scriptless directions as deeper future research unless a much stronger implementation case emerges. A first implementation-facing design note now exists in `MERKLE_BATCHING_V0.md`.

## 12. Auction Dynamics Versus Fixed Bonds

### Concern

The current design uses fixed length-based bonds plus commit/reveal rather than an on-chain auction.

That avoids one class of contest, but reviewers are now explicitly asking whether:

- auctions should be reconsidered
- fixed bonds are enough
- or some hybrid design is needed

### Why It Matters

This is the central design question behind premium-name squatting and fairness at launch.

### Current Status

Open. Needs explicit comparison of allocation mechanics and their trade-offs.

## 13. Transaction-Level Technical Transparency

### Concern

Reviewers asked for clearer technical detail on:

- payload shapes
- script types
- signatures
- commit/reveal contents
- transfer contents

### Why It Matters

Critical Bitcoin reviewers often want to see the exact transaction shape before they form an opinion.

### Current Status

Partly answered in the implementation plan and decision log, but not yet distilled into a simple reviewer-facing explanation.

## 14. Existing Brands Versus Future Brands

### Concern

There is a live disagreement about whether the brand problem is:

- primarily a bootstrapping issue for already-famous names
- or a deeper reason why people and agents may not trust the namespace at all

### Why It Matters

This distinction drives whether GNS should be optimized mainly for future-native adoption or must solve more of the legacy brand-mapping problem before launch.

### Current Status

Open. This likely needs a clearer protocol and product stance, not just economic modeling.

## 15. Pre-Launch Review Readiness

### Concern

There is real interest in sharing GNS with sharper Bitcoin developers and potentially attracting outside implementation help, but only after the strongest open issues are addressed clearly enough.

### Why It Matters

We want broader review to create signal, not avoidable confusion.

### Current Status

Open. This backlog is part of getting to that point.

## 16. Post-Quantum Migration And Signature Agility

### Concern

If GNS contemplates long-lived names and premium lock periods measured in many years, reviewers may reasonably ask what happens if Bitcoin's current signature assumptions become vulnerable before those timelines finish.

The concern is not that GNS must solve post-quantum migration by itself. The concern is that long-duration commitments make it harder to ignore.

### Why It Matters

For decade-scale names or bonds, "we'll think about it later" is not a satisfying answer. We should have an explicit position on:

- what GNS can and cannot promise
- whether owner-key migration is part of the design story
- and how dependent the answer is on Bitcoin's own future path

### Current Status

Open. See [POST_QUANTUM_AND_SIGNATURE_AGILITY.md](./POST_QUANTUM_AND_SIGNATURE_AGILITY.md).

## Suggested Discussion Order

If we work through these one by one, the most leveraged order is probably:

1. premium brands and top-end squatting
2. fixed bonds versus auction dynamics
3. batching / Merkle / lower-footprint launch options
4. why GNS over DNS + ranking signals in the agentic age
5. resolver decentralization and discovery
6. owner-key loss and possible future recovery
