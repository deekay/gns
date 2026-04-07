# Salience Public-Figure Set

This note defines a companion challenge slice for public-figure and personal-name cases that may deserve launch protection for the same underlying reason as obvious brands:

> cheap capture would create bad hostage dynamics around a name that people already expect to point to one dominant real-world referent

This slice should be read alongside:

- [SALIENCE_OVERLAY_RATIONALE.md](./SALIENCE_OVERLAY_RATIONALE.md)
- [LAUNCH_PREMIUM_OVERLAY_PIPELINE.md](./LAUNCH_PREMIUM_OVERLAY_PIPELINE.md)
- [SALIENCE_DATA_BUILD_PLAN.md](./SALIENCE_DATA_BUILD_PLAN.md)

The working CSV for this slice now lives at:

- [salience_public_figure_set.csv](./salience_public_figure_set.csv)

## Why This Exists

Some important names do not fit neatly into either:

- household brand
- institutional natural-buyer
- or meteoric company / product

The user-facing trust problem can still be very similar.

If someone cheaply captures:

- `kanyewest`
- `taylorswift`
- `elonmusk`

the system may feel weak in exactly the same way that it would feel weak if someone cheaply captured:

- `google`
- `cooley`
- `openai`

The difference is that the relevant question is slightly different.

For person-linked names, we are usually asking about:

- dominant existing referent
- dominant existing claimant
- long-run operator fit

not only about a corporate natural buyer.

## What This Slice Is Testing

This challenge set is meant to pressure-test:

- full public names
- highly distinctive mononyms
- creator-native identities and handles
- athlete full-name identities
- first-name shorthand and stage-name ambiguity
- rebrand, family, and estate-adjacent complexity

The point is **not** to say every famous person should be special-cased.

The point is to learn when the methodology should say:

- `yes, cheap capture would obviously create the wrong incentive and the long-run operator is clear`

versus:

- `the public figure is real, but the token is too generic, too contested, or too structurally weak to privilege one claimant cleanly`

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

- one clearly dominant public referent
- token is either a full name or a highly distinctive public identity
- cheap capture would obviously feel like hostage behavior
- and a real long-run operator could plausibly accept a long capital-time commitment more easily than a speculator

Good examples:

- `taylorswift`
- `kanyewest`
- `elonmusk`
- `mrbeast`

### `arguable`

Typical pattern:

- the referent is strong in practice
- but the exact token is weaker than the person behind it
- or the name is mononymic
- or the token is also a broader word, family label, or shorthand

Good examples:

- `kanye`
- `beyonce`
- `drake`
- `trump`

### `likely_not_selected`

Typical pattern:

- real public figure exists
- but the token is too generic, too short, too title-like, too first-name-like, or too contested
- and special-casing it would feel more like privileging one claimant over a socially broader token than protecting a clearly coordinated identity

Good examples:

- `prince`
- `future`
- `jordan`
- `ye`

## Stress Patterns In This CSV

| Stress pattern | Why it matters | Example names |
| --- | --- | --- |
| `full_public_name` | tests whether full names with singular dominant referents should usually clear the bar | `taylorswift`, `kanyewest`, `elonmusk` |
| `distinctive_mononym` | tests when a single-name identity is distinctive enough to behave like a unique coordinated name | `oprah`, `beyonce`, `rihanna` |
| `creator_brand` | tests whether creator-native names and handles should be treated like strong existing identities | `mrbeast` |
| `athlete_full_name` | tests whether globally famous athlete full names should qualify on dominant referent plus public coordination | `cristianoronaldo` |
| `mononym_pressure_test` | tests whether strong real-world fame can still fail when the token is weaker than the person | `kanye`, `drake`, `madonna` |
| `title_or_common_word_name` | tests when a stage name loses to broad common usage | `prince`, `future` |
| `rebrand_or_alias` | tests whether newer or shorter aliases should fail even when the full-name identity is strong | `ye`, `elon` |
| `shared_family_name` | tests when a famous surname still has too many overlapping claimants | `trump`, `jordan`, `smith` |

## Main Questions This Slice Should Help Answer

1. When should a dominant public referent count like a dominant natural buyer?
2. How much stronger should full names be than mononyms or shorthand handles?
3. When is a stage name distinctive enough to deserve overlay treatment?
4. How should the methodology think about family brands, estates, and management-company operation of person-linked names?

## Current Working Intuition

My current intuition is:

- public-figure names belong in the same broad fairness discussion as brand and institutional names
- but they need stricter token-clarity rules
- full names should generally be much stronger than first names, surnames, titles, or generic mononyms
- and the public-figure lane should not quietly inherit company-brand logic without making the `dominant referent` concept explicit

That is why:

- `kanyewest` looks much stronger than `kanye`
- `elonmusk` looks much stronger than `elon`
- and `oprah` may still clear even though it is a mononym, because it behaves more like a singular coordinated identity than a generic token

## Relationship To The Main Overlay

This slice is not saying public figures should get a privileged carveout unrelated to the rest of the methodology.

It is saying the same underlying fairness logic appears again in a slightly different form:

- there is one obvious real-world referent
- the long-run operator is clearer than for an arbitrary speculator
- and cheap capture can obviously degrade trust in the system

The main extra guardrail is token clarity.

That means the public-figure lane should usually require:

- a full-name form
- or a highly distinctive stage name / creator identity
- and a much stricter standard for first names, surnames, titles, or broad common words
