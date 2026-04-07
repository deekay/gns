# Launch Premium Overlay Pipeline

This note explores a bounded version of semantic pricing for GNS:

- not a permanent global name-pricing engine
- not a live protocol that keeps revaluing names
- not a claim that we can estimate the "true" value of every important word on earth

Instead, it asks a narrower question:

> If GNS wants a one-time bootstrap mechanism for already-famous names, what would a practical, as-fair-as-possible pipeline look like?

## Why This Exists

The strongest fairness objection so far is not that someone can corner the entire namespace.

It is that someone may be able to lock up a relatively small but economically important slice of already-valuable names:

- global brands
- major internet services
- culturally dominant entities

Those names already have off-chain value before GNS exists. That makes launch different from the long-run steady state.

The idea here is to address that one-time bootstrapping problem without turning GNS into an ongoing semantic governance system.

## Core Design Constraint

If GNS explores this path, the cleanest version is:

- a **normal objective base curve** for every name
- plus a **frozen launch-only premium overlay** for a bounded set of already-salient names

In other words:

`required_bond(name) = max(base_curve(name), launch_premium_floor(name))`

That keeps the ordinary protocol simple while acknowledging that a small set of existing names may need extra launch-era protection.

## V1 Namespace Scope

The launch premium overlay should be scoped to the namespace GNS v1 can actually express.

For the current v1 design, that means:

- lowercase Latin letters
- digits
- no punctuation, whitespace, or non-Latin characters

So the right claim is **not**:

> this table prices the most important names in every script on earth

It is:

> this table prices the most salient already-existing names that can be represented in the v1 GNS namespace

That has an important consequence:

- brands primarily expressed only in Han, Arabic, Devanagari, Cyrillic, Kana, or other non-Latin scripts are outside the scope of the v1 premium overlay unless they also have an established official Latin-script identity that real users already coordinate around

This is a limitation, but it is also the honest way to keep the methodology aligned with the actual protocol surface.

## What "LLM-Assisted" Should Mean

LLMs can help with:

- gathering candidate names from public datasets
- deduplicating spelling variants
- normalizing aliases and punctuation differences
- flagging likely omissions
- assigning rough salience buckets based on structured evidence

LLMs should **not** be trusted with:

- live protocol-time pricing decisions
- exact per-name valuations
- trademark adjudication
- final authority over edge cases

The protocol should never depend on "whatever the model says today."

The model is a research and curation helper. The protocol only sees a frozen output table.

## Recommended Shape

The most defensible version of this idea is:

- launch-only
- frozen before launch
- based on public source data
- coarse tiered pricing, not bespoke valuations
- explicitly limited to existing high-salience entities

This suggests a pipeline like:

1. collect public candidate datasets
2. normalize them into GNS-legal names
3. consolidate duplicates and aliases into entity groups
4. assign rough salience scores from transparent inputs
5. map scores into a few premium tiers
6. publish the draft list for review
7. freeze the final table before launch

## Step 1: Candidate Set Assembly

The goal is not to discover every valuable word. The goal is to assemble a broad, defensible candidate pool of already-salient names that might deserve extra launch protection.

Candidate sources could include:

- major global brand rankings
- top websites and internet services
- major app rankings
- large public-company and product lists
- large nonprofit, institutional, and government entities
- high-salience consumer platforms and infrastructure brands

At this stage it is better to over-include than under-include.

### Public-Input Rule For V1

Because the v1 namespace is Latin-only, candidate sources should be chosen with one additional constraint:

- prefer sources whose entity labels already map to an official or widely coordinated Latin-script name

This does **not** mean using only Western datasets.

It means:

- include global and regional sources where entities are already published under stable Latin-script brand forms
- include non-Western entities that clearly operate under a Latin-script name users already recognize in practice
- avoid pretending that machine transliteration of a non-Latin-only brand creates a fair v1 launch artifact

Examples of good v1-fit inputs:

- global brand rankings with stable Latin-script labels
- website and app rankings where the public service identity is already expressed in Latin script
- international business and consumer rankings that publish English or official Latin-script brand names

Examples that should be tracked separately:

- high-salience entities whose public identity is primarily non-Latin and not already coordinated around a stable Latin-script form

Those are important for future namespace versions, but they should not be quietly folded into a v1 premium table as if the script problem has already been solved.

The main deliverable from this step is:

- `candidates_raw.csv`

with fields like:

- source
- source rank
- raw name
- country or region
- category
- source URL or source identifier

## Step 2: Name Normalization

Every candidate needs to be normalized into the actual v1 GNS namespace:

- lowercase
- `[a-z0-9]{1,32}`
- no punctuation or whitespace

Examples:

- `Coca-Cola` -> `cocacola`
- `AT&T` -> `att`
- `OpenAI` -> `openai`

This step also needs to record:

- the original string
- the normalized string
- any lossy transformation
- any ambiguity introduced by normalization

It should also classify each candidate into one of three buckets:

- `direct_v1_fit`
- `official_latin_alias`
- `out_of_scope_non_v1_script`

That keeps the pipeline honest about which names are genuinely representable in v1 and which ones are being deferred rather than silently excluded.

The main deliverable from this step is:

- `candidates_normalized.csv`

## Step 3: Entity Consolidation

This is where LLM assistance is useful but should remain auditable.

The pipeline should group multiple source entries that appear to refer to the same entity:

- `Google`
- `Google Search`
- `Google LLC`

But it should keep hard evidence for why they were grouped.

Recommended rule:

- keep a stable `entity_id`
- preserve all source evidence rows
- do not discard source diversity

The output should still be reviewable by humans.

The main deliverable from this step is:

- `entities_with_aliases.json`

## Step 4: Transparent Salience Scoring

This is the key step, and it should stay deliberately simple.

Avoid trying to estimate "fair market value" directly.

Instead, score salience using transparent, rank-like signals such as:

- how many strong public datasets include the entity
- how highly it ranks across those datasets
- whether it appears across multiple categories
- web/app/user reach proxies
- market scale proxies
- search or attention proxies

This is still imperfect, but it is much more defensible than pretending to produce a precise valuation.

### Capital And Buyer-Firepower Signals

One thing the early salience work understated is that some names may deserve launch protection even when they are not especially household-facing.

Why:

- the name has a clear natural buyer
- the buyer is already well-capitalized
- and cheap launch capture would create an unusually obvious resale trade

That means inputs like these should matter as **secondary capture-risk amplifiers**:

- public-company market capitalization
- investment capital or AUM for major financial firms
- durable committed capital for large venture, private-equity, or hedge-fund brands
- major-category rank within a public market or finance list

These should **not** become the main pricing engine.

They are better used this way:

- first establish that the name is a real coordinated brand or institution
- then use capital scale to decide whether cheap capture would be too easy to monetize

This helps explain why names like `asana` may deserve overlay treatment even if they are weaker on household salience than `nike` or `disney`.

It also helps with finance-circle names like `citadel` or `foundersfund`, where:

- broad public coordination may be thinner
- but the natural buyer is obvious
- and the financial upside from cheap capture may still be too easy

The important guardrail is that capital scale should amplify a clear name-claim story, not override ambiguity.

So:

- `foundersfund` can score well on both buyer clarity and capture risk
- while `sequoia` or `rentech` may still be harder because the exact short token is more ambiguous than the institution behind it

### Recommended Scoring Style

Use coarse, rank-derived scores rather than raw-dollar calculations.

For example:

- dataset presence score
- average percentile rank score
- cross-category diversity score
- global breadth score

Then combine them into a single `salience_score`.

### Role Of LLMs Here

LLMs can help:

- classify category
- detect alias collisions
- suggest missing entity joins
- flag suspiciously high or low placements

But the final score should come from deterministic code over frozen input data.

## A More Explicit Salience Methodology

The most important methodological choice is this:

**tier names by public salience and coordination importance, not by company fundamentals.**

That means the goal is not to ask:

- how much revenue does this company make?
- what is its profit margin?
- what is its market cap?
- how old is the brand?

Those may correlate loosely with importance, but they are not the real thing we care about.

The actual question is:

> how important is this name, globally, as a thing people already expect to resolve correctly?

Under v1, that should be read more precisely as:

> how important is this name, globally, among the names people already expect to resolve correctly in Latin-script form?

Under that framing, names like:

- `apple`
- `google`
- `nvidia`
- `cocacola`

can naturally land in the same top tier even though the underlying businesses are economically very different.

### What Should Drive The Score

The cleanest scoring methodology is to use public evidence of name salience across independent contexts.

Recommended score dimensions:

1. **Cross-dataset presence**
   How many strong independent datasets include the entity at all?

2. **Rank strength**
   How highly does the entity rank within those datasets?

3. **Geographic breadth**
   Does the entity show up across multiple regions, countries, or language contexts?

4. **Cross-context importance**
   Does the name matter in more than one domain, such as brand ranking, website prominence, app usage, public-company prominence, institutional importance, or infrastructure presence?

5. **Persistence**
   Does the name appear repeatedly across time rather than only in one transient snapshot?

### Recommended Weighting

The exact weights can be tuned, but a good starting point is:

- `35%` cross-dataset presence
- `25%` rank strength
- `20%` geographic breadth
- `10%` cross-context importance
- `10%` persistence

These weights intentionally favor:

- broad recognition
- repeated appearance
- global coordination value

over:

- raw business size
- accounting outcomes
- or one-source prestige

### What Should Not Be Primary Inputs

The following should not be primary drivers of tier placement:

- total revenue
- profitability
- market capitalization
- enterprise value
- company age

Those can be weak supporting signals in some source datasets, but using them directly would push the methodology toward valuing corporations rather than valuing names.

### Why This Is More Neutral

This approach is still not perfectly neutral, but it is more defensible because it asks:

- how visible is the name?
- how globally expected is it?
- how often does it show up as something people coordinate around?

rather than:

- how financially valuable is the underlying enterprise?

That is much closer to the actual bootstrapping problem.

It is also more honest about the current script boundary:

- the launch overlay can aim to be globally aware
- but only within the representable v1 namespace
- while maintaining a separately documented backlog of important names that belong to future non-Latin namespace work

## Step 5: Threshold-Based Tiering, Not Quotas Or Bespoke Pricing

Do not assign a custom bond to every name.

Instead, map names into a few discrete tiers based on **characteristics they clearly satisfy**, not on a target count the protocol feels obligated to fill.

The better question is:

> what makes a name important enough to justify launch-era special treatment at all?

That suggests threshold-style tier definitions such as:

- `S+`: globally unavoidable names
- `S`: globally obvious names
- `A`: internationally important names
- `B`: at least regionally obvious names with clear public coordination value

A name should be able to clear these bars through **either** of two rationales:

1. **Public-coordination rationale**
   The name is something large numbers of people already expect software or agents to resolve correctly.

2. **Capture-risk rationale**
   The name is an obvious pre-existing brand or institution with a clear natural buyer, such that cheap launch capture would create an overly easy speculative resale trade.

This matters because some names are not maximally household-facing, but still feel clearly wrong to leave cheap at launch. A name like `datadog` can be less universal than `google` and still be an obvious capture-risk name if the natural end buyer is clear and well-capitalized.

The core principle is:

- score and ranking help order evidence
- but protocol inclusion should depend on whether a name clearly clears a characteristic bar with enough confidence
- not on whether it happened to land above an arbitrary line like `#10,000`

This is especially important at the lower end of the overlay:

- if two names feel like near peers
- and the evidence difference between them is fragile
- they should usually be treated the same

not forced into materially different rules just to satisfy a quota.

### Suggested Characteristic Bars

`S+` should feel like:

- universally recognizable household or infrastructure identities
- repeated top placement across major global sources
- names large numbers of people already expect to resolve correctly without explanation

`S` should feel like:

- clearly global names
- strong cross-context salience
- obvious enough that most reasonable reviewers would say "yes, that belongs in a special bucket"

`A` should feel like:

- internationally important names
- strong evidence across countries, sectors, or major public coordination contexts
- still clearly worthy of protection, but not in the most universal set

An `A`-tier name may qualify because it is:

- strongly public-facing
- or because it is an internationally important existing brand with a very obvious natural buyer and high asymmetric resale risk

`B` should feel like:

- at least nationally or regionally obvious names
- clear public coordination value in one or more major countries or regions
- not merely lower-ranked SaaS or category-specific brands that happen to appear in a long tail of data

That last point matters. `B` only makes sense if it represents a **different kind of obviousness**, not just the tail end of a single scalar ranking.

A `B`-tier name can also qualify through capture risk if it is:

- an already-established regional or sector-leading brand
- clearly tied to an obvious natural buyer
- and likely to create a too-easy speculative resale path if left on the plain base curve

So lower-tier enterprise or institutional names should not be excluded merely because they are not household brands. The real question is whether cheap capture would feel like an obvious launch giveaway.

### Illustrative Commitment Shape

The current calibration still points to something like:

- `S+`: `500 BTC` for `10 years`
- `S`: `250 BTC` for `10 years`
- `A`: `100 BTC` for `10 years`
- `B`: `50 BTC` for `5 years`

These are still only working intuition, but they line up better with characteristic tiers than with quota-driven slices.

### Required Outputs

If the pipeline is working well, it should produce at least four artifacts:

- `candidates_considered.csv`
  Every candidate reviewed, with evidence and a selected / not-selected outcome.
- `overlay_selected.csv`
  The names that clearly cleared a tier bar.
- `overlay_near_miss.csv`
  Names that came close enough to deserve visible review but did not clearly clear the bar.
- `out_of_scope_non_v1_script.csv`
  Salient names deferred because they are not representable in the current v1 namespace.

This makes the final artifact much easier to audit:

- which names were selected
- which names were considered and rejected
- and which names were never eligible for v1 in the first place

## Recommended Scope And Size

There are really three different set sizes to think about:

1. the **raw candidate universe**
2. the **ranked shortlist worth reviewing carefully**
3. the **final frozen premium table**

These should not all be the same size.

### Raw Candidate Universe

This should be broad.

Recommended target:

- roughly `25,000-100,000` candidate names

Why:

- over-inclusion is useful at this stage
- it gives the scoring model room to work
- and it reduces the risk that obvious global names are missing before ranking starts

### Ranked Review Set

This is the set that deserves careful human inspection for:

- normalization problems
- duplicate entities
- regional bias
- obvious omissions

Recommended target:

- roughly `5,000-20,000` names

### Final Frozen Premium Table

The final protocol-facing overlay should **not** target a fixed count.

Instead:

- build a large candidate universe
- rank it for review
- then let the number of selected names fall out of the characteristic bars and confidence thresholds

That means the final count might be:

- a few hundred
- a few thousand
- or something else entirely

The count is an output of the methodology, not an input to optimize toward.

### Best Current Recommendation

So the best phased answer right now is probably:

- build a raw candidate pool in the `25,000-100,000` range
- score and review the top `5,000-20,000`
- select whatever names clearly satisfy the overlay bars
- publish a visible near-miss set alongside the selected set

This keeps the protocol-facing artifact smaller and more defensible while still allowing research to range much more broadly.

## How Hard This Is

There are two different difficulty levels here.

### Rough first draft

This is not especially hard.

If we gather enough public datasets, a rough first-pass pipeline that:

- assembles candidates
- normalizes names
- consolidates obvious aliases
- and produces a ranked draft

is very feasible.

### Defensible global launch artifact

This is materially harder.

The hard part is not computing the score. The hard part is making the output feel:

- geographically fair
- language-aware
- source-diverse
- and not embarrassingly narrow or arbitrary

So the real difficulty lies in:

- source selection
- normalization quality
- duplicate/entity handling
- and reviewing the top slice carefully enough that the launch table feels defensible

That is still doable. It just means the challenge is more curation and methodology than pure code.

## Step 6: Public Review Before Launch

If this path is taken, the list should be published before launch with:

- source datasets
- normalization rules
- scoring code
- tier assignments
- obvious known limitations

This review period matters because some errors will only become visible once outsiders inspect the draft.

Expected review questions:

- missing names
- bad normalizations
- duplicate entities
- regional bias
- category bias
- over-inclusion or under-inclusion

## Step 7: Freeze The Output

Before launch, freeze:

- the source snapshot date
- the normalization rules
- the deterministic scoring code
- the final premium table
- a hash of the final artifact

The protocol should treat that output as immutable launch data.

If later revisions are desired, they should be handled as:

- a new protocol version
- or a new namespace version

not as ad hoc live updates.

## Recommended Protocol Representation

The consensus-facing representation should be minimal.

For example:

- `normalized_name -> tier_id`

not:

- source evidence
- explanations
- exact valuation data

The richer provenance can live in the repository and launch materials. The protocol only needs the frozen result.

## What This Should Not Try To Solve

This should **not** try to solve:

- every valuable dictionary word
- every culturally important phrase
- every personal name
- every future brand
- trademark legitimacy
- legal ownership disputes

Those are either too subjective or too large for a credible frozen launch table.

This is why the most plausible scope is:

- existing high-salience brands and entities
- launch-only bootstrap fairness

## Main Risks

Even the best version of this pipeline has real risks:

### 1. Data-source bias

The output will reflect the worldview of the source datasets.

### 2. Language and geography bias

English-heavy and Western-heavy rankings can distort the table badly if not corrected.

### 3. Incumbent bias

The system may overprotect already-dominant entities and underweight culturally important but smaller names.

### 4. False legitimacy

A premium tier is not proof of rightful ownership. It is only a launch pricing decision.

### 5. Governance creep

If people start asking for updates after launch, the exception can become a permanent governance treadmill.

## How To Keep It As Fair As Possible

If this path is pursued, fairness comes from restraint:

- keep the scope narrow
- use public datasets
- freeze a snapshot date
- make the code reproducible
- use coarse tiers
- publish the draft before launch
- freeze permanently at launch

This does not make the system perfectly neutral.

It makes the exception bounded, inspectable, and less arbitrary than improvising ad hoc premium rules.

## Current Recommendation

If we explore this seriously, the best shape is probably:

- **base protocol**: objective length-based bond curve
- **launch exception**: frozen premium overlay for a bounded set of existing high-salience entities
- **LLM role**: candidate discovery, normalization help, and anomaly detection
- **deterministic role**: final scoring, tiering, and protocol artifact generation

That keeps the LLM in the research pipeline, not in consensus.

## Additional Economic Intuition To Preserve

Recent discussion has clarified a few important points that should shape any premium-tier calibration work.

### 1. BTC-denominated yield assumptions should be conservative

For long-duration premium locks, it is too aggressive to assume that claimants can reliably earn `10%+` BTC-denominated yield for `5-10` years.

A more realistic calibration range is probably closer to:

- `1%` low
- `3%` medium
- `5%` high

That matters because long premium lockups may look stronger on paper than they really are if the model assumes unrealistically high BTC hurdle rates.

### 2. Time is a powerful premium lever, but it is not enough by itself

Long premium maturities align incentives better than short ones:

- a real brand may not mind holding a name for `10` years
- a speculator usually dislikes locking large BTC positions for that long

That makes duration a strong anti-speculation lever.

But duration alone may still be insufficient for the most obvious legacy names if the eventual buyer is extremely patient and the eventual sale value is very large.

### 3. We need both a BTC-native and a fiat-native lens

Premium-name calibration should be evaluated in two ways:

- **BTC-native carrying cost** for the claimant
- **fiat-upside sanity** for a future buyer who may think in dollars rather than BTC

This matters because even a moderate BTC resale price can become a very large fiat windfall if Bitcoin appreciates substantially between launch and later brand adoption.

### 4. Transfer design matters almost as much as initial pricing

If premium names can transfer freely before maturity, a speculator may still flip the name early and avoid bearing the full intended time cost.

Two important conclusions followed from this:

- simply resetting maturity for the buyer is probably too weak, because the real brand buyer may not care about a long future hold
- if early-transfer penalties are explored, the most philosophically aligned version is likely one where the original claimant's premium bond remains timelocked until its original maturity, rather than burning BTC or charging protocol fees

### 5. Leasing and option structures remain possible

Even strong pre-maturity transfer restrictions may not eliminate all speculative monetization.

Speculators could still try:

- lease arrangements
- lease-plus-option contracts
- operational control deals that stop short of full transfer

So the design goal should be:

- reduce clean, obvious, high-liquidity flips

not:

- assume the protocol can eliminate every off-chain workaround

See [PREMIUM_NAME_CALIBRATION.md](./PREMIUM_NAME_CALIBRATION.md) for a more concrete modeling note.

## Next Questions

If we want to continue this path, the next concrete design questions are:

1. What exact categories belong in scope for the first draft?
2. Should this cover only brands, or brands plus a limited class of institutions and infrastructure names?
3. How many premium tiers should exist?
4. Should premium tiers set:
   - a bond floor
   - a multiplier
   - or a separate launch-era maturity rule?
5. What source datasets are diverse enough to avoid an obviously narrow worldview?
