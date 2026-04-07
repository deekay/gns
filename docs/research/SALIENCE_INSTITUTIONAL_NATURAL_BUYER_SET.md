# Salience Institutional Natural-Buyer Set

This note defines a companion challenge slice for names that may deserve launch protection even when they are not primarily household-facing.

The core idea is:

> some names matter less because the general public coordinates on them every day, and more because cheap launch capture would create an obvious resale trade to one well-capitalized, natural institutional buyer

This slice should be read alongside:

- [SALIENCE_BOUNDARY_CHALLENGE_SET.md](./SALIENCE_BOUNDARY_CHALLENGE_SET.md)
- [LAUNCH_PREMIUM_OVERLAY_PIPELINE.md](./LAUNCH_PREMIUM_OVERLAY_PIPELINE.md)
- [SALIENCE_DATA_BUILD_PLAN.md](./SALIENCE_DATA_BUILD_PLAN.md)

The working CSV for this slice now lives at:

- [salience_institutional_natural_buyer_set.csv](./salience_institutional_natural_buyer_set.csv)

## Why This Exists

The first boundary slice is useful for:

- consumer services
- regional household brands
- finance-circle names
- lower-edge software brands

But once we started talking about names like:

- `harvard`
- `mckinsey`
- `pfizer`
- `nasdaq`
- `bloomberg`
- `mongodb`

it became clear that there is another meaningful category:

- names with narrow or professional audiences
- clear natural buyers
- and enough buyer firepower that cheap launch capture could still feel like an obvious windfall

That is a different question from "is this a household brand?"

## What This Slice Is Testing

This challenge set is meant to pressure-test categories like:

- elite education brands
- consultancies and professional-services firms
- pharma and biotech companies
- exchanges and financial infrastructure
- institutional media and information brands
- developer and infrastructure companies

The point is **not** to say every large institution should be special-cased.

The point is to learn where the methodology should say:

- `yes, there is one obvious buyer here and cheap capture feels too easy`

versus:

- `this institution is real, but the exact token is too ambiguous, generic, or socially contested to deserve protocol special treatment`

## Current Buckets

The CSV uses the same three provisional expectations as the broader boundary slice:

- `likely_selected`
- `arguable`
- `likely_not_selected`

The current first pass contains `36` names:

- `12` `likely_selected`
- `12` `arguable`
- `12` `likely_not_selected`

These are not final judgments. They are stress-test hypotheses.

## How To Read The Results

### `likely_selected`

Typical pattern:

- strong natural buyer clarity
- substantial institutional or capital scale
- token is specific enough that capture would feel like a real misallocation or obvious resale trade

Good examples:

- `mckinsey`
- `pfizer`
- `nasdaq`
- `bloomberg`
- `mongodb`

### `arguable`

Typical pattern:

- the institution is clearly real and important
- but the exact token is weaker than the institution behind it
- or the audience is narrower
- or the name is more acronym-like, geographically broad, or semantically loaded

Good examples:

- `mit`
- `oxford`
- `bain`
- `merck`
- `cme`
- `vercel`

### `likely_not_selected`

Typical pattern:

- the organization may be strong
- but the token is too generic, too place-like, too surname-like, or too contested
- or the institutional importance does not clearly turn into protocol-level capture risk

Good examples:

- `cambridge`
- `fidelity`
- `apollo`
- `nature`
- `cell`

## Stress Patterns In This CSV

| Stress pattern | Why it matters | Example names |
| --- | --- | --- |
| `elite_education` | tests whether world-famous institutional brands should be protected even when they are not conventional commercial brands | `harvard`, `stanford`, `mit`, `oxford` |
| `professional_services` | tests whether consultancies and advisory firms have obvious enough natural buyers to justify overlay treatment | `mckinsey`, `deloitte`, `accenture`, `bain` |
| `pharma_biotech` | tests whether buyer clarity and real-world coordination stakes justify inclusion | `pfizer`, `moderna`, `novartis`, `merck` |
| `financial_infrastructure` | tests whether exchanges, data providers, and asset managers should be treated as high-capture-risk names | `nasdaq`, `blackrock`, `cme`, `bloomberg` |
| `media_information` | tests whether high-value institutional media brands deserve protection even when the words themselves may be broader | `reuters`, `economist`, `nature`, `cell` |
| `developer_infrastructure` | tests whether clear enterprise buyers and public-company scale can outweigh lower household salience | `mongodb`, `databricks`, `vercel`, `netlify` |
| `legal_or_surname_brand` | tests whether prestigious professional brands fail once the token becomes too surname-like or socially broad | `cooley`, `latham`, `wharton` |

## Main Questions This Slice Should Help Answer

1. How much should capital-rich natural buyers matter outside consumer brands?
2. When does token ambiguity override buyer firepower?
3. Are elite institutions and professional firms a real overlay lane, or just a tempting way to over-expand the list?
4. Do developer-infrastructure names belong with `asana` and `datadog`, or are they still mostly too niche?

## Current Working Intuition

My current intuition is:

- many institutional names should be eligible
- but this lane should stay narrower than "all successful institutions"
- and token clarity matters even more here than in consumer brands

That is why:

- `harvard` and `stanford` can plausibly clear the bar
- while `cambridge` and `wharton` are much harder
- `mckinsey` and `deloitte` may clear
- while `bain` is more arguable
- `bloomberg` and `nasdaq` may clear
- while `economist` and `apollo` are much harder

## Relationship To The Main Overlay

This slice is not saying the protocol should privilege institutional names over public-coordination names.

It is just making explicit that there is a second legitimate path to overlay treatment:

- not only "people already coordinate heavily on this name"
- but also "there is one obvious institutional buyer and cheap capture would produce an obviously too-easy windfall"

That path still needs strict gates:

- strong buyer clarity
- nontrivial brand salience
- and low enough token ambiguity that the special-casing feels legitimate rather than arbitrary
