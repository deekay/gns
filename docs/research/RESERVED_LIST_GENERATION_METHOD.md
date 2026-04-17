# Reserved List Generation Method

This note turns one persistent open question into a concrete working answer:

> how should ONT generate the reserved list for the deferred auction lane
> without pretending the list is arbitrary or purely vibe-based?

This is not the final frozen launch list. It is the current recommended method
for producing one.

Related notes:

- [LAUNCH_SPEC_V0.md](/Users/davidking/dev/gns/docs/research/LAUNCH_SPEC_V0.md)
- [SALIENCE_OVERLAY_RATIONALE.md](/Users/davidking/dev/gns/docs/research/SALIENCE_OVERLAY_RATIONALE.md)
- [SALIENCE_SOURCE_REGISTRY.md](/Users/davidking/dev/gns/docs/research/SALIENCE_SOURCE_REGISTRY.md)
- [RESERVED_CLASS_OPTIONS.md](/Users/davidking/dev/gns/docs/research/RESERVED_CLASS_OPTIONS.md)
- [RESERVED_LIST_SCALE_AND_AUCTION_DYNAMICS.md](/Users/davidking/dev/gns/docs/research/RESERVED_LIST_SCALE_AND_AUCTION_DYNAMICS.md)

## 1. The Goal

The goal is not:

- to discover the perfect price for every meaningful word
- or to create an indefinitely governed editorial namespace

The goal is narrower:

- identify the bounded set of already-salient existing names that should not
  open through the ordinary lane on day one
- place those names into a small number of reserved classes
- freeze that list before launch

## 2. High-Level Rule

The current recommended rule is:

> reserve names where cheap ordinary-lane capture would create an obviously
> wrong launch outcome because the name already has a dominant real-world
> referent, dominant natural buyer, or unusually strong coordination role.

This means the reserved list is not about "importance" in the abstract.

It is about:

- dominant referent
- natural-buyer asymmetry
- coordination importance
- trust / hostage risk at launch

## 3. Inclusion Paths

There are three clean inclusion paths.

### A. Dominant coordination names

Examples:

- global brands
- major web destinations
- major consumer or platform names
- obvious category-defining institutional names

The argument here is:

- many people will already expect the real operator or dominant referent
- cheap capture would be visibly wrong and trust-damaging

### B. Natural-buyer capture-risk names

Examples:

- strong institutional or company names with one obvious natural buyer
- names where a speculator can cheaply create a hostage / resale opportunity

The argument here is:

- even if the name is not globally famous, there is still one obvious operator
- that operator is plausibly well capitalized
- cheap launch capture would create an asymmetric resale trade

### C. Public-identity names

Examples:

- full-name public figures
- public operators and founders

The argument here is:

- there is one dominant referent
- identity confusion and hostage dynamics are real
- the trust value of broad reservation is still strong

## 4. Exclusion Heuristics

The list should stay disciplined.

A name should usually stay out if:

- the referent is genuinely ambiguous
- there is no dominant real-world buyer or referent
- the inclusion case is mostly “this is a nice word”
- the token only looks strong because of general financial value, not because
  the protocol should prefer one claimant

This is important because the reserved list gets much harder to defend if it
drifts into:

- generic desirability
- semantic beauty contests
- category creep

## 5. Source Types

The current recommended source stack is:

- public rankings and brand lists
- public company / institutional lists
- curated public-figure and operator lists
- explicit boundary / near-miss review sets

The point is to use:

- public evidence
- auditable source categories
- and a repeatable process

not:

- hand-picked one-off names with no paper trail

## 6. Practical Build Sequence

The working method should be:

1. collect candidate names from the source registry
2. normalize them into v1-legal ONT tokens
3. tag each candidate with source category and inclusion path
4. deduplicate and merge duplicate evidence
5. classify each candidate as:
   - reserve
   - near miss
   - exclude
6. assign each reserved name to one of the coarse reserved classes
7. freeze the pre-launch list and publish both:
   - selected names
   - challenge / near-miss set for transparency

That last step matters. Publishing only the final selected set makes the
process look more arbitrary than it really is.

## 7. Output Shape

For each reserved name, the minimal output should include:

- normalized token
- inclusion path
- source categories
- reserved class
- short rationale

For the boundary set, it should include:

- normalized token
- why it was considered
- why it was excluded or deferred

## 8. Relationship To Reserved Classes

This method chooses:

- which names go to the reserved lane

The reserved-class system chooses:

- what burden shape those names receive

Those are related but distinct decisions.

The current recommendation remains:

- broad reserved list
- `3` coarse reserved classes
- market discovery for the exact winning BTC amount inside those classes

## 8a. Rough Scale Expectation

For current review and communication purposes, the rough order-of-magnitude
expectation is:

- not a few hundred
- not millions
- probably **tens of thousands to low hundreds of thousands**

The current best working range is discussed in:

- [RESERVED_LIST_SCALE_AND_AUCTION_DYNAMICS.md](/Users/davidking/dev/gns/docs/research/RESERVED_LIST_SCALE_AND_AUCTION_DYNAMICS.md)

## 9. What Should Be Frozen Before Launch

Before any serious launch announcement, the following should be fixed:

- source registry
- normalization rules
- inclusion / exclusion principles
- final frozen reserved set
- final frozen boundary / near-miss set
- class assignment for reserved names

That is the minimum needed to make the process reviewable and legible.

## 10. What Still Does Not Need To Be Perfect Before First Expert Review

For the first round of Bitcoin-expert feedback, we do not need:

- the final production reserved list
- every edge-case name settled
- every class assignment fully finalized

What we do need is a credible method.

This note is the current recommendation for that method.
