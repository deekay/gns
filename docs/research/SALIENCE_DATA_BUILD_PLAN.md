# Salience Data Build Plan

This note turns the salience-overlay discussion into an actual data-building plan.

The goal is not just to talk about tiers abstractly. The goal is to define:

- the canonical candidate table we will populate
- the derived outputs we expect to publish
- the next source buckets we should ingest first

This note should be read alongside:

- [SALIENCE_OVERLAY_RATIONALE.md](./SALIENCE_OVERLAY_RATIONALE.md)
- [LAUNCH_PREMIUM_OVERLAY_PIPELINE.md](./LAUNCH_PREMIUM_OVERLAY_PIPELINE.md)
- [INITIAL_SALIENCE_TIERING_EXERCISE.md](./INITIAL_SALIENCE_TIERING_EXERCISE.md)
- [SALIENCE_BOUNDARY_CHALLENGE_SET.md](./SALIENCE_BOUNDARY_CHALLENGE_SET.md)
- [SALIENCE_INSTITUTIONAL_NATURAL_BUYER_SET.md](./SALIENCE_INSTITUTIONAL_NATURAL_BUYER_SET.md)
- [SALIENCE_SOURCE_REGISTRY.md](./SALIENCE_SOURCE_REGISTRY.md)

## Build Goal

For v1, "final enough" should mean:

- we have a broad Latin-script candidate universe
- we can show which names were considered
- we can show which names were selected
- we can show which names were near misses
- and we can point to source evidence and review reasoning for the difficult cases

The objective is **not** to produce a magical perfect global list.

The objective is to produce a defensible launch artifact with auditable inputs and explicit edge handling.

## Canonical Table

The canonical working table should be:

- `candidates_considered.csv`

One row should represent one reviewable candidate identity in the v1 namespace.

This is the table we sort, score, review, and classify.

A starter header template now lives at:

- [salience_candidates_considered_template.csv](./salience_candidates_considered_template.csv)

An initial pilot population derived from the current `33`-name seed now lives at:

- [candidates_considered_seed.csv](./candidates_considered_seed.csv)
- [overlay_selected_seed.csv](./overlay_selected_seed.csv)
- [overlay_near_miss_seed.csv](./overlay_near_miss_seed.csv)
- [considered_not_selected_seed.csv](./considered_not_selected_seed.csv)

A dedicated lower-edge pressure-test slice now lives at:

- [salience_boundary_challenge_set.csv](./salience_boundary_challenge_set.csv)

A companion institutional/professional natural-buyer slice now lives at:

- [salience_institutional_natural_buyer_set.csv](./salience_institutional_natural_buyer_set.csv)

## Recommended Columns

### Identity

These fields define what the candidate is.

| Column | Purpose |
| --- | --- |
| `candidate_id` | Stable internal identifier for the candidate row |
| `entity_id` | Stable grouped identifier shared by aliases that refer to the same entity |
| `display_name` | Human-readable source-facing name, e.g. `Coca-Cola` |
| `normalized_name` | V1 GNS form, e.g. `cocacola` |
| `script_fit` | `direct_v1_fit`, `official_latin_alias`, or `out_of_scope_non_v1_script` |
| `raw_primary_label` | Primary label from the strongest source row |
| `official_latin_name` | Official or widely coordinated Latin-script form when applicable |
| `normalization_notes` | Short note about punctuation stripping, aliasing, or ambiguity |

### Classification

These fields help us reason about what kind of name this is.

| Column | Purpose |
| --- | --- |
| `category_primary` | Main classification, e.g. `consumer_brand`, `internet_platform`, `payments`, `retail`, `automotive`, `media`, `enterprise_software` |
| `category_secondary` | Secondary classification when helpful |
| `coordination_surface` | Why people coordinate around it: `web`, `app`, `retail`, `payments`, `communications`, `transport`, `media`, `institution`, etc. |
| `region_primary` | Primary country or region of salience |
| `region_scope` | `global`, `multi_region`, `national`, `regional` |
| `household_facing` | `yes` or `no` |
| `public_coordination_value` | Short note on why misallocation would matter publicly |
| `natural_buyer_clarity` | `high`, `medium`, or `low` confidence that an obvious existing entity naturally owns the name |
| `capture_risk_notes` | Short note on why cheap launch capture would or would not create an obvious resale trade |

### Source Evidence

These are the fields that make the row auditable.

| Column | Purpose |
| --- | --- |
| `source_count_total` | Total number of supporting source rows attached to the entity |
| `source_count_strong` | Count of high-confidence or high-prestige supporting inputs |
| `source_bucket_count` | Number of distinct source buckets represented |
| `sources_present` | Delimited short codes for supporting sources |
| `best_global_brand_rank` | Best rank from major global brand lists, if any |
| `best_web_rank` | Best web/app/service ranking, if any |
| `best_regional_rank` | Best rank from a regional or national source, if any |
| `persistence_windows` | Number of independent time windows or yearly snapshots in which the name appears |
| `geography_count` | Count of regions/countries with supporting evidence |
| `evidence_notes` | Brief human-readable summary of why this row has support |

### Scores

These fields are deterministic or near-deterministic outputs.

| Column | Purpose |
| --- | --- |
| `presence_score` | Score from cross-dataset presence |
| `rank_strength_score` | Score from rank percentile / placement |
| `geographic_breadth_score` | Score from region and country spread |
| `cross_context_score` | Score from category / coordination diversity |
| `persistence_score` | Score from repeated appearance over time |
| `salience_score_raw` | Combined deterministic score |
| `score_version` | Version tag for the scoring logic |

### Review

These fields let the methodology stay honest once we get into gray areas.

| Column | Purpose |
| --- | --- |
| `review_confidence` | `high`, `medium`, or `low` confidence in the inclusion outcome |
| `proposed_tier` | `S+`, `S`, `A`, `B`, or blank |
| `selection_status` | `selected`, `near_miss`, `considered_not_selected`, or `out_of_scope` |
| `review_reason` | Short statement of why it was selected or not |
| `review_flags` | Delimited flags such as `alias_risk`, `source_bias`, `regional_gap`, `capture_risk_high`, `non_latin_primary` |
| `reviewer_notes` | Free-form notes for difficult cases |

## Derived Output Tables

The canonical table should produce at least these derived outputs:

### `overlay_selected.csv`

Contains:

- candidates that clearly cleared a tier bar
- their final tier
- their confidence level
- their evidence summary

### `overlay_near_miss.csv`

Contains:

- names that came close enough to deserve explicit review
- but did not clearly clear the bar

This file is important because it keeps the lower edge honest.

However, for very prestige-heavy pilot sets, the near-miss file may legitimately be tiny or even empty. That is a sign the candidate set is not yet stressing the boundary, not necessarily that the methodology is failing.

### `considered_not_selected.csv`

Contains:

- names that were reviewed
- but are not close enough to justify overlay treatment right now

This prevents the false impression that omitted names were simply ignored.

### `out_of_scope_non_v1_script.csv`

Contains:

- salient names intentionally deferred because they are not representable in the current v1 namespace

This is how we stay honest about the multilingual gap.

### `salience_boundary_challenge_set.csv`

Contains:

- a deliberately non-obvious slice of names
- provisional expectations such as `likely_selected`, `arguable`, and `likely_not_selected`
- stress-pattern labels that explain why each name is useful for calibration

This file should not be confused with the final overlay output.

Its job is to make the lower edge reviewable and repeatable.

### `salience_institutional_natural_buyer_set.csv`

Contains:

- institutional and professional names that may deserve overlay treatment even when they are not household-facing
- provisional expectations such as `likely_selected`, `arguable`, and `likely_not_selected`
- stress-pattern labels for elite education, professional services, pharma, market infrastructure, media, and developer infrastructure

This file exists to keep the `natural buyer with real firepower` lane from being discussed only in the abstract.

## Suggested Row Lifecycle

Each candidate should move through a simple lifecycle:

1. `raw_ingested`
2. `normalized`
3. `entity_grouped`
4. `scored`
5. `reviewed`
6. `classified`

That makes it easier to separate:

- source ingestion problems
- normalization problems
- scoring problems
- and final review disputes

## Source Buckets To Ingest Next

The next pass should not just add "more sources." It should add the **right missing source buckets**.

## Wave 1: Regional Household And Consumer Brands

This is the most important missing piece right now.

Why:

- the current pilot is too global-brand and platform-heavy
- it does not populate a serious `B` tier yet
- it misses regionally obvious names like `chickfila`-type examples

What to ingest:

- major regional or national best-brand rankings
- consumer-retail rankings
- restaurant / QSR brand rankings
- grocery / household retail rankings
- telecom and media household-brand rankings

Desired outcome:

- better evidence for nationally or regionally obvious names
- less dependence on global tech/platform lists

## Wave 2: Regional Internet And App Coordination Sources

Why:

- some names are coordination-critical because of actual usage, not brand-finance prestige
- the pilot currently leans too heavily on Similarweb global-only intuition

What to ingest:

- regional top-site rankings
- major app-store or platform rankings with stable Latin-script labels
- large communications, transport, travel, and marketplace services by region

Desired outcome:

- better treatment of names like `mercadolibre`, `flipkart`, or regionally dominant comms / transport / commerce platforms

## Wave 3: Payments, Financial, And Public-Service Coordination Names

Why:

- some names matter because misrouting is expensive, not because they are glamorous brands
- some names also matter because cheap launch capture would create an overly easy resale trade to a well-capitalized natural buyer

What to ingest:

- payment network rankings
- major fintech and consumer-bank rankings
- public-company size and liquidity screens as secondary capture-risk evidence
- hedge fund, asset-manager, venture-capital, and private-equity prestige or scale lists
- publicly visible logistics / travel / booking / delivery services
- large institutional or infrastructure-facing names people already coordinate around

Desired outcome:

- stronger handling of names where incorrect resolution would create obvious coordination harm
- better handling of names like `asana`, `citadel`, or `foundersfund`, where buyer firepower matters even if the name is not broadly household-facing

## Wave 4: Enterprise / Software / Developer Names

Why:

- these names do matter
- but they should usually enter only after stronger public-facing and consumer-facing source buckets are in place

What to ingest:

- enterprise software rankings
- developer-platform rankings
- B2B / cloud / infrastructure rankings

Guardrail:

- this wave should not dominate the overlay
- especially not the lower tiers

Its main use is:

- supporting inclusion where a name is truly multi-context important
- or clearly populating the considered / near-miss sets

## Source-Priority Rule

When adding a new source, ask:

1. Does it improve regional consumer coverage?
2. Does it improve public coordination evidence?
3. Does it add genuinely new signal rather than duplicate a source class we already have?
4. Does it already publish names in stable Latin-script form?

If the answer is mostly "no," it should not be a priority source.

## Minimum Inclusion Logic For Lower Tiers

For lower-tier names, we should probably require more than raw score alone.

For example, a plausible `B`-tier gate might require:

- stable Latin-script identity
- either strong public-facing coordination value or high natural-buyer clarity
- at least regional or national obviousness
- at least `2` independent supporting signals, or `1` extremely strong public-coordination signal plus a second supporting source
- no major review flag suggesting the apparent salience is just source bias

And where the case is mostly about `capture risk`, a lower-tier name should usually also have:

- evidence that the buyer is already substantial enough for cheap capture to feel like an obvious windfall
- and no major ambiguity that would make the exact token feel socially contested

This is how we avoid "random mid-tier SaaS with decent visibility" becoming protocol special cases while still allowing obvious capture-risk names like `datadog`-type examples to qualify.

## A Good First Real Build Pass

The next real build pass should try to produce:

- `250-500` manually reviewable candidates
- from `6-10` source buckets
- with enough diversity to stress-test `S+`, `S`, `A`, and especially `B`
- and with a dedicated boundary challenge set containing names that are real brands but not obviously selected

That is enough to reveal:

- whether the bars are too strict
- whether the bars are too loose
- whether `B` is a real category
- and which source gaps still matter most

## What Success Looks Like

We are getting close to a final artifact when:

- `S+` and `S` feel boring and obvious
- `A` still feels strongly defensible
- `B` feels regionally obvious rather than random
- the near-miss set contains the arguable cases
- and the selected set is stable under reasonable weighting or source tweaks

That is the point where the methodology starts to feel complete enough to freeze.
