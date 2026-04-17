# Initial Salience Tiering Exercise

This note begins the exercise of tiering and pricing existing names by salience using the methodology described in [LAUNCH_PREMIUM_OVERLAY_PIPELINE.md](./LAUNCH_PREMIUM_OVERLAY_PIPELINE.md) and the pricing intuition from [PREMIUM_NAME_CALIBRATION.md](./PREMIUM_NAME_CALIBRATION.md).

This is **not** a launch-ready artifact. It is an initial seed exercise meant to:

- test whether the methodology produces sane outputs
- expose where the current source mix is too narrow
- and give us something concrete to react to before building a much larger ranked candidate set

## Scope Of This First Pass

This first pass intentionally uses a small, readable source set:

- Kantar BrandZ Global Top 100 / Top 10 summary
- Interbrand Best Global Brands 2024
- Brand Finance Global 500 2025 press release summary
- Similarweb global top websites ranking

The current source snapshot for this exercise is:

- brand-ranking sources as published for `2024-2025`
- Similarweb global website rankings as viewed on `2026-04-06`

That means the current seed is strongest for:

- global technology brands
- internet platforms
- highly visible consumer brands

and weaker for:

- non-English regions that are less represented in the initial source mix
- institutions not well covered by these particular rankings
- culturally important but less digitally dominant household names

So this seed should be treated as:

- a methodology pilot
- not a final judgment about which names deserve premium treatment

For the current lower-edge pressure-test slice, see:

- [SALIENCE_BOUNDARY_CHALLENGE_SET.md](./SALIENCE_BOUNDARY_CHALLENGE_SET.md)

For a companion slice focused on newer breakout names that the original seed undercounts, see:

- [SALIENCE_METEORIC_NAME_SET.md](./SALIENCE_METEORIC_NAME_SET.md)

## V1 Script Boundary

This exercise is intentionally scoped to the names ONT v1 can actually represent.

That means:

- lowercase Latin letters
- digits
- no punctuation, whitespace, or non-Latin characters

So this seed is **not** trying to rank every globally salient brand in every script.

It is trying to rank:

> already-salient names that can plausibly live inside the current Latin-only v1 namespace

This matters for interpretation:

- a brand primarily expressed in Chinese characters should not be treated as "missing from the list" if ONT v1 cannot represent that name directly
- if such a brand already has an official and genuinely coordinated Latin-script identity, that Latin identity can still be considered
- otherwise it should be tracked as future namespace work, not shoehorned into the v1 overlay

This keeps the exercise aligned with the protocol we actually have instead of the broader multilingual system we may eventually want.

## What This Seed Misses

The original `33`-name prestige seed was useful for obvious legacy names, but it is not a full picture of current salience.

In particular:

- `chatgpt` is in the seed
- but `openai`, `anthropic`, and `claude` are not

That is mainly a source-mix artifact, not a settled judgment that those names do not matter.

The seed leans on:

- durable global brand rankings
- and broad website visibility

So it naturally sees a meteoric product like `chatgpt` sooner than:

- the company name `openai`
- the lab/company name `anthropic`
- or the product brand `claude`

That is one reason the new meteoric-name slice exists.

## Tier Definitions Used In This Exercise

This exercise uses the current illustrative premium bands:

| Tier | Illustrative bond | Illustrative lock |
| --- | ---: | ---: |
| `S+` | `500 BTC` | `10 years` |
| `S` | `250 BTC` | `10 years` |
| `A` | `100 BTC` | `10 years` |
| `B` | `50 BTC` | `5 years` |

These are working calibration bands only. They are not recommendations yet.

## Pilot Decision Rules

This first pass is still manually smoothed, but it is not meant to be arbitrary. The provisional tier calls below follow these decision rules:

1. **Count strong-source presence first.**
   Repeated appearance across independent public datasets is the strongest current salience signal.

2. **Treat very high placement as stronger than mere inclusion.**
   A top-`5` or top-`10` placement in a major global ranking matters more than a low placement in a single list.

3. **Treat direct coordination usage as distinct evidence.**
   A very high Similarweb placement is not just "brand awareness." It is evidence that large numbers of people already coordinate around that exact name on the public internet.

4. **Allow only a narrow source-mix correction.**
   A small number of household legacy brands can be lifted if the pilot source mix is obviously undercounting them for being too digital/platform-heavy. This is why names like `cocacola` are not forced down to a low tier simply because the first pass is not yet globally balanced.

5. **Prefer under-tiering to over-tiering when uncertain.**
   If a name looks important but the current pilot sources do not support a higher tier clearly enough, it should stay lower for now and move up only after the source set improves.

This is still less rigorous than the eventual deterministic scoring pipeline. The point is to make the current provisional calls legible enough that later work can replace them with code rather than reinterpret them from scratch.

## Public-Input Adjustments Under V1

Given the current Latin-only namespace, the next round of source expansion should change in two ways.

First:

- broaden beyond U.S.-heavy and platform-heavy sources

Second:

- still prefer sources whose entity names already map to official or widely coordinated Latin-script identities

That suggests:

- add more international consumer-brand rankings
- add more regional internet/app rankings that publish stable Latin-script brand labels
- add more global household-brand sources, not just technology/platform lists
- separately log high-salience non-Latin-primary names that are out of scope for v1

It does **not** suggest:

- using ad hoc LLM transliterations as if they were already real public identities
- pretending v1 can solve the full multilingual bootstrapping problem at launch

## Pricing Read-Through Used Here

This exercise is not just ranking names. It is trying to connect salience to actual launch commitments.

The current read-through from salience to pricing is:

| Tier | Characteristic bar | Salience shape | Illustrative commitment |
| --- | --- | --- | --- |
| `S+` | globally unavoidable | globally ubiquitous, repeatedly top-ranked, often both household brand and major coordination endpoint | `500 BTC` for `10 years` |
| `S` | globally obvious | clear global names with strong multi-context salience | `250 BTC` for `10 years` |
| `A` | internationally important | strong international or category-defining names that matter widely but are less universal | `100 BTC` for `10 years` |
| `B` | regionally obvious or clearly high capture-risk | names that are at least nationally or regionally obvious, or obvious existing brands that would be too easy to capture cheaply | `50 BTC` for `5 years` |

These bars are still working intuition, not settled protocol policy. They are included here because a salience methodology is only useful if it eventually maps to concrete capital-time commitments.

## Seed Ranking Table

`Source presence` below counts how many of the current pilot sources surfaced the name strongly enough to include it directly.

| Name | Normalized | Kantar 2025 | Interbrand 2024 | Brand Finance 2025 | Similarweb 2026 | Source presence | Provisional tier | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Apple | `apple` | `1` | `1` | `1` | — | `3` | `S+` | Canonical global household brand; top-ranked across all three brand-value datasets in the pilot set |
| Google | `google` | `2` | `4` | `3` | `1` | `4` | `S+` | Strongest multi-context case in the pilot set: brand + dominant web entry point |
| Microsoft | `microsoft` | `3` | `2` | `2` | `29` | `4` | `S+` | Global enterprise + consumer salience, reinforced by direct web/platform prominence |
| Amazon | `amazon` | `4` | `3` | `4` | `16` | `4` | `S+` | Strong across brand-value rankings and global web usage |
| Facebook | `facebook` | `6` | `21` | — | `3` | `3` | `S` | Still globally salient despite lower current brand-ranking placement than early platform peers |
| Instagram | `instagram` | `7` | `15` | — | `4` | `3` | `S` | Strong consumer-platform salience and very high global usage |
| YouTube | `youtube` | — | `24` | — | `2` | `2` | `S` | Very high global coordination value despite thinner coverage in classic brand-value lists |
| NVIDIA | `nvidia` | `5` | — | `Top 10` | — | `2` | `S` | Clear top-tier technology salience; likely to remain a methodological flashpoint for “brand vs product power” debates |
| Coca-Cola | `cocacola` | — | `7` | — | — | `1` | `S` | Included as a deliberate legacy-household-brand check; underrepresented by the current pilot source mix |
| McDonald’s | `mcdonalds` | `8` | `9` | — | — | `2` | `S` | Strong cross-cultural consumer salience with direct ranking support |
| Samsung | `samsung` | — | `5` | — | `38` | `2` | `A` | Large global electronics brand with both enterprise and direct consumer web visibility |
| Walmart | `walmart` | — | — | `5` | — | `1` | `A` | Very high real-world salience, but thin coverage in this first source set |
| Visa | `visa` | `10` | — | — | — | `1` | `A` | Strong brand salience and payment coordination importance; likely deserves attention despite sparse pilot coverage |
| Oracle | `oracle` | `9` | `18` | — | — | `2` | `A` | Strong enterprise coordination value and repeated brand-list presence |
| TikTok | `tiktok` | — | — | — | `11` | `1` | `A` | Very strong live consumer salience; weak in this pilot only because brand-value lists lag some cultural/platform names |
| ChatGPT | `chatgpt` | — | — | — | `5` | `1` | `A` | Strong current coordination value; persistence over time remains less proven than older incumbents |
| WhatsApp | `whatsapp` | — | — | — | `9` | `1` | `A` | Globally important communications identity despite limited presence in classic brand rankings |
| Netflix | `netflix` | — | — | — | `21` | `1` | `A` | Major global consumer service with strong direct usage salience |
| Nike | `nike` | — | `14` | — | — | `1` | `A` | Another important check that household brands can still land high even if the pilot source set is somewhat digital-heavy |
| Toyota | `toyota` | — | `6` | — | — | `1` | `A` | Strong global auto brand with broad recognition |
| Disney | `disney` | — | `16` | — | — | `1` | `A` | Major entertainment brand; likely to move depending on how non-web salience is weighted |
| LinkedIn | `linkedin` | — | — | — | `17` | `1` | `B` | Important platform, but probably not in the same bucket as the globally dominant consumer identities |
| Baidu | `baidu` | — | — | — | `18` | `1` | `B` | Important regional/global search identity; broader non-Western datasets may move it upward |
| Naver | `naver` | — | — | — | `20` | `1` | `B` | Same rationale as Baidu; good test case for geographic breadth weighting |
| Adobe | `adobe` | — | `17` | — | — | `1` | `B` | Strong enterprise/creative brand, but likely below the highest public-coordination tier |
| Cisco | `cisco` | — | `13` | — | — | `1` | `B` | High enterprise salience, lower mainstream household salience |
| Tesla | `tesla` | — | `12` | — | — | `1` | `A` | Strong internationally visible consumer brand; closer to the selected household-brand set than to the near-miss bucket |
| BMW | `bmw` | — | `10` | — | — | `1` | `B` | High salience, but more category-specific than the very top consumer names |
| Mercedes-Benz | `mercedesbenz` | — | `8` | — | — | `1` | `B` | Similar rationale to BMW |
| J.P. Morgan | `jpmorgan` | — | `25` | — | — | `1` | `B` | Important institutional brand, but less universal public coordination pressure than the top tiers |
| IBM | `ibm` | — | `19` | — | — | `1` | `B` | Durable enterprise brand; likely sits in the reviewable lower-premium range |
| SAP | `sap` | — | `20` | — | — | `1` | `B` | Strong enterprise salience, but not obviously top public-identity tier |
| GitHub | `github` | — | — | — | `48` | `1` | `B` | Important for software coordination, though not as universal as the larger consumer-facing names |

## What This First Pass Suggests

A few patterns already show up:

1. The pilot source mix naturally pushes:
   - `google`
   - `microsoft`
   - `amazon`
   - `facebook`
   - `instagram`
   - `youtube`
   - `chatgpt`
   upward because they are both brands and globally dominant web destinations.

2. Household consumer brands like:
   - `cocacola`
   - `nike`
   - `toyota`
   - `disney`

   still look important, but they are underpowered by a source mix that currently leans more digital than cultural or consumer-wide.

3. This confirms that the final methodology should not rely only on:
   - web traffic
   - or only brand-finance style rankings

   It needs both, plus more international and consumer-brand inputs.

4. The next-source problem is not just "more global."
   It is "more global within names that already coordinate in Latin script."
   That is a narrower and more honest target for v1.

## Threshold-Based Trial From The Current Seed

If we switch from "target a count" to "select names that clearly clear a characteristic bar," then this current seed reads differently.

Within this small pilot set, the names that seem to clear the bar **right now** are:

- `apple`
- `google`
- `microsoft`
- `amazon`
- `facebook`
- `instagram`
- `youtube`
- `nvidia`
- `cocacola`
- `mcdonalds`
- `samsung`
- `walmart`
- `visa`
- `tiktok`
- `whatsapp`
- `netflix`
- `nike`
- `tesla`
- `toyota`
- `disney`
- `oracle`
- `chatgpt`
- `linkedin`
- `baidu`
- `naver`
- `adobe`
- `cisco`
- `bmw`
- `mercedesbenz`
- `jpmorgan`
- `ibm`
- `sap`
- `github`

That is effectively `33` selected names out of the current `33`-name pilot seed.

That does **not** mean the overlay should be this broad in final form.

It means the current pilot set is:

- too prestige-heavy
- too biased toward already-famous names
- and not yet a real boundary-testing set

This is a much better fit for how the lower edge of the overlay probably needs to work:

- names in this prestige seed mostly do clear the bar once capture-risk is taken seriously
- and the actual exclusion work now needs to happen in a dedicated challenge set of less obviously protected names

## Current View On Scope

This exercise reinforces the current scope recommendation:

- raw candidate universe in the `25,000-100,000` range
- careful review set in the `5,000-20,000` range
- final selected overlay count should fall out of the tier bars rather than be pre-targeted

The present seed list is intentionally much smaller because it is only meant to test the methodology and the pricing intuition.

## Characteristic Intuition Sketches

If the threshold-based methodology is working, the tiers should feel roughly like this:

### `S+` Should Feel Like

- `apple`
- `google`
- `microsoft`
- `amazon`

These are names almost everyone would agree deserve exceptional treatment.

### `S` Should Feel Like

- `facebook`
- `instagram`
- `youtube`
- `cocacola`
- `mcdonalds`
- `nvidia`

These are still obviously special, but a little less universal than the smallest top bucket.

### `A` Should Feel Like

- `nike`
- `disney`
- `netflix`
- `whatsapp`
- `tiktok`
- `toyota`
- `visa`
- `samsung`

These are internationally important names where most reasonable reviewers would still say "yes, special-casing that seems about right."

### `B` Should Feel Like

This is the most sensitive tier.

It should **not** feel like:

- random lower-ranked SaaS
- or the tail of a long global spreadsheet

It should feel more like:

- names that are at least nationally or regionally obvious
- names ordinary people in a major country or region already coordinate around
- names whose misallocation would feel socially costly even if they are not global super-brands

Examples that could plausibly belong in this kind of `B` tier, once better regional sources are added, are names more like:

- `chickfila`
- `traderjoes`
- `timhortons`
- `mercadolibre`
- `flipkart`
- `datadog`
- `cisco`
- `sap`
- `jpmorgan`

The current pilot source mix is not yet good enough to populate this tier credibly, which is itself a useful result.

## Near-Miss Neighborhood Intuition

Near-miss names should usually behave like peers rather than like sharply ordered winners and losers.

That means names more like:

- `digitalocean`
- `eventbrite`
- `box`
- `deepl`
- `xero`
- `asana`
- `miro`
- `mixpanel`

should generally be read as:

- plausible candidates considered during review
- but not clearly selected unless stronger evidence emerges

That is the kind of set we still need to build on purpose.

The current `33`-name prestige pilot is no longer a good near-miss set, because under the revised capture-risk lens it is mostly composed of names that should already be selected.

That is exactly why the final pipeline should publish:

- the selected overlay set
- the considered-but-not-selected set
- and the near-miss set

instead of pretending the lower boundary is ever deeply self-justifying.

## What To Do Next

The most useful next expansions would be:

1. add a broader set of consumer-brand and regional datasets
2. add more non-English and non-U.S. prominence sources
3. keep an explicit deferred list of salient non-Latin-primary names that are out of scope for v1
4. compute a deterministic draft score rather than this manually smoothed seed
5. publish explicit:
   - selected
   - near-miss
   - and considered-but-not-selected outputs
6. separate:
   - mechanical score
   - and review-adjusted score
   so we can see where the current source mix is biasing the result

## Source Notes

This initial seed used current public source material from:

- [Kantar BrandZ Global rankings](https://www.kantar.com/Campaigns/BrandZ/Global)
- [Interbrand Best Global Brands 2024](https://interbrand.com/best-global-brands/)
- [Brand Finance Global 500 2025](https://brandfinance.com/press-releases/power-and-paradox-value-of-leading-us-brands-rises-to-6-44-trillion-as-global-trust-weakens)
- [Similarweb global top websites](https://www.similarweb.com/top-websites/)

The point here was not completeness. It was to start the exercise with real public inputs and expose what the next source additions most need to fix.
