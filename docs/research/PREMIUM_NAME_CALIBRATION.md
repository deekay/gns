# Premium Name Calibration

This note is a working calibration aid for launch-only premium-name tiers.

It does **not** define a final bond curve. Its job is to help build intuition about what counts as:

- obviously too cheap
- meaningfully expensive
- or probably too harsh

for already-famous legacy names such as `google`, `facebook`, or similarly obvious global brands.

## Core Modeling Principle

For premium legacy names, the question is not just:

> how many BTC are bonded?

It is:

> how much BTC-denominated carrying cost does the claimant actually bear over time, and how much resale upside remains if the claimant tries to monetize the name early?

That means calibration should focus on:

- bond size
- lock duration
- realistic BTC-denominated opportunity cost
- early resale scenarios
- fiat-denominated upside sanity

## Conservative BTC Hurdle Assumptions

Recent discussion suggests that long-run BTC-denominated yield should be modeled conservatively.

Recommended scenario range:

- `1%` low
- `3%` medium
- `5%` high

Rationale:

- reliable BTC-denominated yield is hard to find
- sustaining it for `5-10` years is harder still
- `10%+` BTC hurdle assumptions are better treated as stress cases than baseline inputs

## Example Modeling Assumption

One especially interesting premium-transfer variant is:

- a claimant sells the name before maturity
- the name can move
- but the claimant's original premium bond remains locked until its original maturity

Under that assumption, the speculator can receive sale proceeds early, but cannot recycle their original bonded capital early.

That is the main case modeled below.

## Formulas

### Full-Term Carrying Cost

If a claimant locks `B` BTC for `T` years and their BTC-denominated hurdle rate is `r`, then a simple compounded carrying-cost estimate is:

`carrying_cost = B * ((1 + r)^T - 1)`

This is a useful approximation for:

- "how expensive does this feel in BTC terms if the claimant really has to hold the whole term?"

### Breakeven Early Resale

If the claimant sells in year `s`, but the original bond remains locked until year `T`, then an approximate breakeven resale price is:

`breakeven_sale = (1 + r)^s * B * (1 - (1 + r)^(-T))`

This is a useful approximation for:

- "what sale price would the squatter need just to justify the trade?"

## Carrying Cost Table

Compounded BTC-denominated carrying cost if the bond is held through full maturity.

### 5-Year Lock

| Bond | `1%` | `3%` | `5%` |
| --- | ---: | ---: | ---: |
| `50 BTC` | `2.6 BTC` | `8.0 BTC` | `13.8 BTC` |
| `100 BTC` | `5.1 BTC` | `15.9 BTC` | `27.6 BTC` |
| `250 BTC` | `12.8 BTC` | `39.8 BTC` | `69.1 BTC` |
| `500 BTC` | `25.5 BTC` | `79.6 BTC` | `138.1 BTC` |

### 10-Year Lock

| Bond | `1%` | `3%` | `5%` |
| --- | ---: | ---: | ---: |
| `50 BTC` | `5.2 BTC` | `17.2 BTC` | `31.4 BTC` |
| `100 BTC` | `10.5 BTC` | `34.4 BTC` | `62.9 BTC` |
| `250 BTC` | `26.2 BTC` | `86.0 BTC` | `157.2 BTC` |
| `500 BTC` | `52.3 BTC` | `172.0 BTC` | `314.4 BTC` |

## Breakeven Resale Table

These tables assume:

- the claimant sells the name early
- the original premium bond stays locked until its original maturity

### Sale In Year 3

#### 5-Year Lock

| Bond | `1%` | `3%` | `5%` |
| --- | ---: | ---: | ---: |
| `50 BTC` | `2.5 BTC` | `7.5 BTC` | `12.5 BTC` |
| `100 BTC` | `5.0 BTC` | `15.0 BTC` | `25.1 BTC` |
| `250 BTC` | `12.5 BTC` | `37.5 BTC` | `62.6 BTC` |
| `500 BTC` | `25.0 BTC` | `75.1 BTC` | `125.3 BTC` |

#### 10-Year Lock

| Bond | `1%` | `3%` | `5%` |
| --- | ---: | ---: | ---: |
| `50 BTC` | `4.9 BTC` | `14.0 BTC` | `22.3 BTC` |
| `100 BTC` | `9.8 BTC` | `28.0 BTC` | `44.7 BTC` |
| `250 BTC` | `24.4 BTC` | `69.9 BTC` | `111.7 BTC` |
| `500 BTC` | `48.8 BTC` | `139.8 BTC` | `223.5 BTC` |

### Sale In Year 5

#### 5-Year Lock

By year `5`, the lock has ended, so the breakeven figure equals the full-term carrying cost.

| Bond | `1%` | `3%` | `5%` |
| --- | ---: | ---: | ---: |
| `50 BTC` | `2.6 BTC` | `8.0 BTC` | `13.8 BTC` |
| `100 BTC` | `5.1 BTC` | `15.9 BTC` | `27.6 BTC` |
| `250 BTC` | `12.8 BTC` | `39.8 BTC` | `69.1 BTC` |
| `500 BTC` | `25.5 BTC` | `79.6 BTC` | `138.1 BTC` |

#### 10-Year Lock

| Bond | `1%` | `3%` | `5%` |
| --- | ---: | ---: | ---: |
| `50 BTC` | `5.0 BTC` | `14.8 BTC` | `24.6 BTC` |
| `100 BTC` | `10.0 BTC` | `29.7 BTC` | `49.3 BTC` |
| `250 BTC` | `24.9 BTC` | `74.2 BTC` | `123.2 BTC` |
| `500 BTC` | `49.8 BTC` | `148.3 BTC` | `246.4 BTC` |

## Fiat-Upside Sanity Check

Brands may not think in BTC terms. A buyer might accept a resale price because it still looks manageable in fiat, even if the BTC amount is large.

That means a moderate BTC resale can still create an enormous fiat windfall if Bitcoin appreciates strongly after launch.

This table expresses later resale prices in "launch-year BTC-equivalent fiat" under different BTC appreciation multiples.

| Resale price | `1x BTC/USD` | `3x BTC/USD` | `10x BTC/USD` |
| --- | ---: | ---: | ---: |
| `25 BTC` | `25 BTC-eq` | `75 BTC-eq` | `250 BTC-eq` |
| `50 BTC` | `50 BTC-eq` | `150 BTC-eq` | `500 BTC-eq` |
| `100 BTC` | `100 BTC-eq` | `300 BTC-eq` | `1,000 BTC-eq` |
| `250 BTC` | `250 BTC-eq` | `750 BTC-eq` | `2,500 BTC-eq` |

This is not a pricing rule. It is a reminder that:

- a premium tier can look serious in BTC-native carrying-cost terms
- and still feel like an excessive gift to early speculators if later BTC/USD appreciation is large

## Illustrative Tier Candidates

These are not recommendations yet. They are just reasonable starting points for discussion.

| Candidate tier | Example bond | Example lock | Why it may matter |
| --- | ---: | ---: | --- |
| `Tier B` | `50 BTC` | `5 years` | Noticeable commitment, but likely too weak for globally obvious brands |
| `Tier A` | `100 BTC` | `10 years` | Real commitment; still may be too cheap for the very top names |
| `Tier S` | `250 BTC` | `10 years` | Starts to feel meaningfully painful for a squatter even under low BTC-yield assumptions |
| `Tier S+` | `500 BTC` | `10 years` | Much stronger deterrent; likely only appropriate for a very small top bucket |

## Preliminary Intuition

So far, the most useful high-level takeaways seem to be:

1. `10 BTC` or even `50 BTC` for a globally obvious legacy brand is probably too cheap.
2. `100 BTC for 10 years` is a real commitment, but may still be too weak for names like `google` if later resale values are very large.
3. `250-500 BTC for 10 years` starts to feel closer to the zone where obvious top-tier squatting is no longer a trivial trade.
4. Time is a strong lever, but probably not sufficient by itself for the most obvious names.
5. A premium-transfer design that lets the original seller's bond remain timelocked is much more useful than simply resetting maturity for the buyer.
6. The strongest trust story for existing brands is not just "large bond" but "real operator can comfortably hold the long lock, while a speculator cannot exit cleanly without still bearing the time cost."

## What This Still Does Not Solve

Even a strong premium tier may not eliminate all speculation.

Off-chain structures could still exist:

- leases
- lease-plus-option deals
- deferred purchase agreements

So the design goal should remain:

- make obvious premium-name squatting slower, less liquid, and less easy to underwrite
- make long-hold alignment genuinely favor real operators over fast flippers

not:

- assume protocol rules can eliminate all speculative monetization

## Next Useful Questions

1. What should the top premium bucket try to make unattractive:
   - casual speculation?
   - concentrated whale portfolios?
   - even highly convicted specialist squatting?

2. Should premium names differ only in bond size, or in both:
   - bond size
   - and lock duration?

3. Should a premium legacy-name transfer before maturity be:
   - disallowed
   - allowed only if the seller's bond remains locked
   - or allowed under some other premium-specific rule?

4. Which names are important enough to justify a `Tier S` or `Tier S+` burden at all?
