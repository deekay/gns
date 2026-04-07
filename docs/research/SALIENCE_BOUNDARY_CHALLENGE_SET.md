# Salience Boundary Challenge Set

This note defines a deliberate challenge set for testing the lower edge of the launch premium overlay.

The current prestige-heavy pilot is useful for:

- `S+`
- `S`
- much of `A`

But it is a bad place to discover real exclusions because almost every name in it already feels obviously special-cased once both public-coordination risk and capture risk are taken seriously.

So this challenge set exists to answer a narrower question:

> where does the methodology start to feel genuinely uncertain?

The working CSV for this slice now lives at:

- [salience_boundary_challenge_set.csv](./salience_boundary_challenge_set.csv)

## What This Set Is For

This set should contain names that are:

- real enough to make people hesitate
- but not so obvious that everyone instantly agrees

That means it should include names that stress different failure modes:

- enterprise brands with clear natural buyers
- consumer platforms that are meaningful but not universal
- regional or category-specific names
- visible SaaS brands that may or may not deserve protocol special treatment
- generic-word brands whose buyer clarity or namespace fairness is less clean than a unique coined name

## Why We Need This

The broader `33`-name prestige seed has become too easy under the current framing.

Once we admit that launch fairness is about both:

- public coordination cost
- and obvious capture-and-resale risk

then many names that once looked like `near_miss` or `considered_not_selected` now reasonably move into `selected`.

That is useful progress, but it means the prestige seed is no longer the right place to pressure-test the lower bar.

This challenge set is the replacement for that job.

## How To Use It

The intended workflow is:

1. score these names with the same evidence model as the broader candidate universe
2. review them explicitly
3. compare the results with human intuition
4. adjust tier bars only if the disagreements point to a coherent problem

This set is especially useful because it avoids the easy cases:

- if we can only agree on `apple` and `google`, the methodology is not saying much
- if we can explain why `datadog` clears the bar while `mixpanel` does not, we are learning something
- if `digitalocean` and `eventbrite` feel like peers, the methodology should not pretend one is decisively in a different world unless the evidence really supports that

## Current Buckets

The challenge CSV groups names into three provisional expectations:

- `likely_selected`
- `arguable`
- `likely_not_selected`

These are not final answers. They are starting hypotheses for stress-testing.

The current first-pass slice contains `41` names:

- `14` `likely_selected`
- `14` `arguable`
- `13` `likely_not_selected`

## How To Read The Buckets

### `likely_selected`

These are names where, under the current broader capture-risk framing, it would feel surprising if they did **not** make the overlay.

Typical pattern:

- clear natural buyer
- enough existing brand salience
- or enough public coordination value
- that cheap launch capture would feel like an obvious giveaway

This bucket now intentionally includes some:

- mid-tier public-company names
- strong regional household brands
- important internet/service brands that are not necessarily `S`-tier famous
- capital-rich finance or investment brands when buyer clarity is strong enough

### `arguable`

These are the names that should generate the most useful debate.

Typical pattern:

- real brand
- real coordination or capture-risk story
- but not strong enough that inclusion feels automatic

This is where the methodology should prove it has a coherent lower edge.

This is also the right home for names like:

- `digitalocean`
- `eventbrite`

where a reasonable person may say:

- "both seem real enough"
- but not feel strong confidence that either one clearly deserves a different protocol treatment from the other

### `likely_not_selected`

These are still real names, but the current intuition is that they probably do **not** deserve launch-era protocol special treatment.

Typical pattern:

- too narrow
- too replaceable
- too weakly coordinated
- too limited in likely resale pressure
- or too ambiguous as a natural-buyer target relative to the rest of the namespace

This bucket is intentionally useful for two different stress patterns:

- smaller or more replaceable SaaS brands like `mixpanel` or `pendo`
- generic-word brand claims like `toast`, `wise`, `bolt`, or `scale`, where there may be a real company but not an obvious social consensus that the protocol should specially privilege that claimant
- finance shorthand or common-word cases where the institution may be powerful but the exact short token is still too ambiguous

If many of these start feeling like obvious overlay names, the bar is probably still too low or `capture risk` is being defined too broadly.

## Stress Patterns In The Current CSV

The initial challenge slice is trying to cover all of these:

| Stress pattern | Why it matters | Example names |
| --- | --- | --- |
| `unique_mid_public_company` | Shows whether clear natural buyers below the prestige tier should still be protected | `datadog`, `cloudflare`, `shopify` |
| `regional_household_brand` | Tests whether a real `B` tier can capture nationally obvious names | `chickfila`, `traderjoes`, `timhortons`, `mercadolibre` |
| `consumer_service_midband` | Tests whether meaningful consumer internet names clear the bar | `eventbrite`, `tripadvisor`, `vrbo`, `squarespace` |
| `enterprise_saas_boundary` | Forces us to decide when enterprise identity becomes important enough for protocol special-casing | `digitalocean`, `asana`, `miro`, `typeform` |
| `finance_circle_brand` | Tests whether capital-rich but less household-facing brands should still be protected from obvious capture | `citadel`, `foundersfund`, `sequoia`, `accel` |
| `generic_word_brand` | Tests whether natural-buyer clarity and fairness break down when a company brand is also a broad common word | `toast`, `wise`, `bolt`, `scale` |
| `replaceable_vertical_software` | Helps identify where the bar should remain high even if there is a real company behind the name | `mixpanel`, `heap`, `pendo`, `mural` |

## What Good Results Would Look Like

A healthy outcome would be something like:

- most `likely_selected` names remain in
- the `arguable` bucket splits in ways we can explain
- at least some `likely_not_selected` names stay out without feeling unfair

If every name in the challenge set gets selected, the current bar is probably still too low or the set is not hard enough.

If almost everything gets excluded, the bar is probably too high or too narrowly defined.

## Relationship To The Main Candidate Table

This challenge set is not a replacement for the full candidate universe.

It should be treated as:

- a pressure-test slice
- small enough for repeated review
- useful for boundary calibration

The broader candidate table still matters because:

- some names are obvious enough that they should not consume much review time
- and some names are out of scope for reasons unrelated to the lower-edge debate

## What To Watch For

The most important signal is not just where individual names land.

It is whether the disagreements cluster around a coherent issue such as:

- regional source gaps
- enterprise-vs-household weighting
- overbroad capture-risk logic
- generic-word ambiguity
- or the need for more explicit lower-tier gates

That is how this challenge set should help us improve the methodology rather than just argue about one-off names.
