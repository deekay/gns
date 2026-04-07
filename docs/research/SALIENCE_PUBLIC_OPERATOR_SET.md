# Salience Public-Operator Set

This note defines a companion challenge slice for **full-name public operator identities**:

- founders
- CEOs
- investors
- public intellectuals
- other durable public operators whose full-name token already functions like a stable public identity

The core idea is:

> some full-name identities may deserve launch protection not because they are celebrity-stage brands, but because there is one clear long-run operator and cheap capture would create obviously uneven hostage-risk

This slice should be read alongside:

- [SALIENCE_OVERLAY_RATIONALE.md](./SALIENCE_OVERLAY_RATIONALE.md)
- [PREMIUM_NAME_CALIBRATION.md](./PREMIUM_NAME_CALIBRATION.md)
- [SALIENCE_DATA_BUILD_PLAN.md](./SALIENCE_DATA_BUILD_PLAN.md)
- [SALIENCE_PUBLIC_FIGURE_SET.md](./SALIENCE_PUBLIC_FIGURE_SET.md)

The working CSV for this slice now lives at:

- [salience_public_operator_set.csv](./salience_public_operator_set.csv)

## Why This Exists

The public-figure lane is useful for:

- musicians
- athletes
- creators
- stage-name and mononym cases

But there is another important class of person-linked names:

- full-name founder identities
- public executive names
- investor names
- durable public-intellectual identities

These names often have:

- one clear dominant referent
- strong long-run operator fit
- and meaningful hostage-risk if captured cheaply

But they are not always celebrity names in the usual sense.

That makes them a useful separate pressure test.

## What This Slice Is Testing

This challenge set is meant to pressure-test:

- globally obvious founder and executive full names
- strong but less globally dominant public operator names
- public intellectual and writer identities with durable followings
- full-name identities that are clear but maybe not monetizable enough to justify launch overlay treatment
- common-name or lower-firepower operator cases where the full-name form may still not be enough

The point is **not** to say every CEO, founder, investor, or thinker should be selected.

The point is to learn where the methodology should say:

- `yes, this full-name token has a clear operator, real trust benefit, and enough capture risk to justify special treatment`

versus:

- `the person is real and public, but the full-name token still does not create enough hostage-risk or clean enough claimant clarity to justify launch overlay treatment`

## Current Buckets

The CSV uses the same three provisional expectations as the other challenge slices:

- `likely_selected`
- `arguable`
- `likely_not_selected`

The current first pass contains `18` names:

- `6` `likely_selected`
- `6` `arguable`
- `6` `likely_not_selected`

These are not final judgments. They are stress-test hypotheses.

## How To Read The Results

### `likely_selected`

Typical pattern:

- clean full-name token
- one dominant public operator
- real brand, business, or reputational hostage-risk if captured
- and a believable reason the operator would tolerate a long capital-time commitment more easily than a speculator

Good examples:

- `markzuckerberg`
- `jensenhuang`
- `patrickcollison`
- `parkerconrad`

### `arguable`

Typical pattern:

- full-name identity is real and durable
- dominant referent is clear
- but the expected resale asymmetry or trust benefit is lower than for the strongest operator names
- or the name is important enough to review but still not obviously protocol-special-case-worthy

Good examples:

- `tylercowen`
- `paulgraham`
- `reidhoffman`
- `navalravikant`

### `likely_not_selected`

Typical pattern:

- real full-name public identity exists
- but the hostage-risk is probably too low
- or the long-run buyer firepower is modest
- or the token is too common or not durable enough to justify launch overlay treatment

Good examples:

- `morganhousel`
- `mattlevine`
- `kevinroose`
- `noahsmith`

## Stress Patterns In This CSV

| Stress pattern | Why it matters | Example names |
| --- | --- | --- |
| `global_platform_founder` | tests whether globally obvious platform or company leaders should generally clear the bar in full-name form | `markzuckerberg`, `jensenhuang`, `samaltman` |
| `strong_public_operator` | tests whether clean full-name operators with real but lower asymmetry still deserve selection | `patrickcollison`, `parkerconrad`, `garrytan` |
| `founder_investor_boundary` | tests where well-known founder or investor names move from obvious inclusion to real debate | `reidhoffman`, `navalravikant`, `brianarmstrong` |
| `public_intellectual_boundary` | tests whether durable thinkers and writers should qualify when the monetizable upside is probably lower | `tylercowen`, `paulgraham`, `morganhousel` |
| `lower_hostage_risk_full_name` | tests when a real full-name identity still does not create enough capture-risk to justify protocol treatment | `mattlevine`, `kevinroose`, `noahsmith` |
| `common_name_collision` | tests when a full-name form may still be too common or claimant-thin to justify inclusion | `scottgalloway`, `andrewsullivan` |

## Launch-Time Scope Policy

The right launch posture for this lane is:

- broad review of clean full-name public operator identities
- but a smaller selected subset based on clear hostage-risk and operator fit

This lane can be broader than the mononym-heavy celebrity lane because full names are inherently cleaner.

But it should still not become:

- every public thinker
- every founder
- every executive
- every investor with a following

The real filter is not just fame.

It is:

- clear dominant referent
- clear long-run operator
- low enough token ambiguity
- and enough likely capture asymmetry that cheap launch allocation would feel obviously weak

## Current Working Intuition

My current intuition is:

- full names should get much more benefit of the doubt than single names
- `markzuckerberg` can reasonably land in a stronger bucket than `tylercowen`
- names like `patrickcollison`, `parkerconrad`, and `garrytan` are good tests of whether a broad full-name trust strategy still stays coherent
- narrower intellectual names should often remain review-only unless the trust benefit clearly outweighs the lower expected resale asymmetry

This is the main reason to keep this slice separate from both:

- the celebrity / creator lane
- and the institutional natural-buyer lane

## Relationship To BTC-Time Calibration

This lane is a good place to apply a **class-based operator rubric** rather than bespoke willingness-to-pay estimates.

The rough idea is:

- globally obvious operator full names can plausibly map to `A`
- strong but less extreme operator names can plausibly map to `B`
- narrower intellectual or writer identities may stay on the review edge of `B` rather than being auto-selected

That is a cleaner way to reason about:

- `markzuckerberg`
versus
- `tylercowen`

than trying to guess a precise future fiat buyout number for each person.
