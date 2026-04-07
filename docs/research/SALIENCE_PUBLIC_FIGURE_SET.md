# Salience Public-Figure Set

This note defines a companion challenge slice for public-figure and personal-name cases that may deserve launch protection for the same underlying reason as obvious brands:

> cheap capture would create bad hostage dynamics around a name that people already expect to point to one dominant real-world referent

This slice should be read alongside:

- [SALIENCE_OVERLAY_RATIONALE.md](./SALIENCE_OVERLAY_RATIONALE.md)
- [LAUNCH_PREMIUM_OVERLAY_PIPELINE.md](./LAUNCH_PREMIUM_OVERLAY_PIPELINE.md)
- [SALIENCE_DATA_BUILD_PLAN.md](./SALIENCE_DATA_BUILD_PLAN.md)
- [SALIENCE_PUBLIC_OPERATOR_SET.md](./SALIENCE_PUBLIC_OPERATOR_SET.md)

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

## Launch-Time Scope Policy

The public-figure lane should probably be **broad in research** but **narrow in the actual launch overlay**.

In practice that means:

- yes, we should prepare a serious review universe spanning musicians, athletes, creators, politicians, founders, CEOs, and other public figures
- no, we should not aim to freeze a giant exhaustive public-figure protocol list at launch

The right structure is probably:

- a large public-figure watchlist for candidate review
- and a much smaller protocol overlay subset containing only the clearest, highest-confidence names

This is important because the public-figure lane can become governance-heavy faster than the brand and institution lanes.

There are simply too many plausible names, and the edge cases get messy quickly:

- stage names
- family names
- officeholders
- management-controlled identities
- estate-controlled identities
- rebrands and aliases
- highly current but not clearly durable internet fame

So the launch artifact should be intentionally conservative.

## Convergence Rule

The practical convergence rule should be:

> the public-figure overlay should include only the names for which a broad set of reasonable reviewers would say "yes, cheap capture would obviously create the wrong incentive, and this token is specific enough to privilege one claimant cleanly"

That means the public-figure lane should not be optimized for count.

It should be optimized for:

- low embarrassment risk
- high durability
- high token clarity
- and obvious trust benefit

## In Scope By Default

Names should generally be **in scope for serious review** if they look like one of these:

- full public names of globally or strongly regionally salient figures
- highly distinctive creator-native identities
- highly distinctive mononyms that already function like singular coordinated names
- athlete or entertainer full-name identities that already behave like durable public brands

Typical examples:

- `taylorswift`
- `kanyewest`
- `elonmusk`
- `cristianoronaldo`
- `mrbeast`

## Out Of Scope By Default

Names should generally be **out of scope by default for launch overlay treatment** if they look like one of these:

- common first names
- broad surnames
- titles or honorific-like words
- ordinary nouns or adjectives used as stage names
- office names rather than person-linked identities
- weak aliases or recent rebrands whose token is much less stable than the underlying person

Typical examples:

- `michael`
- `jordan`
- `prince`
- `future`
- `president`
- `ye`

These can still be tracked in research, but they should not be presumed to belong in the launch artifact.

## Review-Only High-Bar Cases

Some categories should probably remain **review-only unless they clear a very high bar**:

- mononyms that are famous but still socially broad
- politicians whose names blur with offices, families, or dynasties
- CEOs and executives whose public salience may be real but still less durable than brand-like creator identities
- podcasters and internet-native personalities whose fame may be large but still time-sensitive
- family-brand surnames where multiple claimants or entities have a plausible story

Typical examples:

- `kanye`
- `beyonce`
- `drake`
- `trump`
- `lexfridman`
- `joerogan`

The point is not that these names are unimportant.

The point is that the launch artifact should be more conservative than the watchlist.

For founder, executive, investor, and public-intellectual full names, see the sibling slice:

- [SALIENCE_PUBLIC_OPERATOR_SET.md](./SALIENCE_PUBLIC_OPERATOR_SET.md)

That lane is usually better for names like:

- `markzuckerberg`
- `patrickcollison`
- `parkerconrad`
- `garrytan`
- `tylercowen`

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
- the review watchlist may end up quite extensive
- but the actual launch overlay subset should stay small and high-confidence
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

It also means that public-figure work should likely produce two different artifacts over time:

- a broad `considered` or watchlist universe
- and a much smaller selected subset that is actually frozen into the launch overlay
