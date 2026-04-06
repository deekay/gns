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

## V1 Script Boundary

This exercise is intentionally scoped to the names GNS v1 can actually represent.

That means:

- lowercase Latin letters
- digits
- no punctuation, whitespace, or non-Latin characters

So this seed is **not** trying to rank every globally salient brand in every script.

It is trying to rank:

> already-salient names that can plausibly live inside the current Latin-only v1 namespace

This matters for interpretation:

- a brand primarily expressed in Chinese characters should not be treated as "missing from the list" if GNS v1 cannot represent that name directly
- if such a brand already has an official and genuinely coordinated Latin-script identity, that Latin identity can still be considered
- otherwise it should be tracked as future namespace work, not shoehorned into the v1 overlay

This keeps the exercise aligned with the protocol we actually have instead of the broader multilingual system we may eventually want.

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

| Tier | Rough slice | Salience shape | Illustrative commitment |
| --- | --- | --- | --- |
| `S+` | top `10-25` names | globally ubiquitous, repeatedly top-ranked, often both household brand and major coordination endpoint | `500 BTC` for `10 years` |
| `S` | top `25-250` names | globally expected brand or platform identity with clear multi-context salience | `250 BTC` for `10 years` |
| `A` | top `250-2,500` names | strong international or category-defining names that matter widely but are less universal | `100 BTC` for `10 years` |
| `B` | top `2,500-10,000` names | important names worth protecting, but not at the most globally obvious level | `50 BTC` for `5 years` |

These slices are still working intuition, not settled protocol policy. They are included here because a salience methodology is only useful if it eventually maps to concrete capital-time commitments.

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
| Tesla | `tesla` | — | `12` | — | — | `1` | `B` | Strong public brand, but less universally coordination-critical than top platform/household names |
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

## Current View On Scope

This exercise reinforces the current scope recommendation:

- raw candidate universe in the `25,000-100,000` range
- careful review set in the `5,000-20,000` range
- initial frozen premium table around `10,000`

The present seed list is intentionally much smaller because it is only meant to test the methodology and the pricing intuition.

## Boundary Intuition Sketches

We do not have a computed top-`10,000` table yet, so the sketches below are illustrative rather than authoritative.

The point is to preview the **feel** of the boundary slices so we can sanity-check whether the eventual tiering output seems directionally right.

### Around `95-105`

This slice should feel like:

- globally recognizable names
- strong consumer or internet coordination value
- clearly important, but not in the tiny set of most universal brand identities on earth

The kinds of names that plausibly live here are things like:

- `nike`
- `disney`
- `paypal`
- `spotify`
- `uber`
- `adidas`
- `airbnb`
- `mastercard`
- `pepsi`
- `ikea`
- `nintendo`

These are names that many people across regions already expect to resolve correctly, but they are one step below the absolute top handful of global identities like `google`, `apple`, or `amazon`.

### Around `995-1005`

This slice should feel like:

- still very real brands
- category leaders, strong regional champions, or widely used internet/software services
- important enough that a claim would not feel frivolous
- but no longer near the globally dominant salience bucket

The kinds of names that plausibly live here are things like:

- `doordash`
- `canva`
- `cloudflare`
- `shopify`
- `xiaomi`
- `discord`
- `atlassian`
- `garmin`
- `expedia`
- `roblox`
- `tripadvisor`

The common pattern here is:

- real user coordination value
- but thinner cross-dataset presence, weaker persistence, narrower geography, or more category-specific salience than the names clustered near rank `100`

### Around `9990-10000`

The very bottom of a top-`10,000` premium table should still not feel trivial.

It should feel like:

- names with clear existing coordination value
- but only modest evidence compared with the stronger buckets
- often major national or regional brands, or category-specific services with meaningful but not universal recognition

Illustrative examples could look more like:

- `asana`
- `digitalocean`
- `miro`
- `wise`
- `zendesk`
- `mercari`
- `monzo`
- `squarespace`
- `typeform`
- `kayak`
- `brex`

If names in this band start feeling tiny, obscure, or purely niche, the premium table has probably extended too far into the long tail.

### The First `10` That Did Not Make The List

The first names outside the top `10,000` should feel **almost the same** as the bottom ten that made it.

The difference should usually be something small but defensible, such as:

- one fewer strong public-source appearances
- weaker persistence over time
- less cross-region evidence
- weaker Latin-script coordination
- or narrower category salience

The first ten names out would likely look something like:

- `box`
- `basecamp`
- `deepl`
- `eventbrite`
- `vrbo`
- `weebly`
- `monese`
- `bunq`
- `xero`
- `mixpanel`

This is exactly why a final launch artifact needs:

- deterministic scoring
- explicit source rules
- and a visible review pass

Once we get this far down the table, tiny changes in methodology will move names across the line very easily.

## What To Do Next

The most useful next expansions would be:

1. add a broader set of consumer-brand and regional datasets
2. add more non-English and non-U.S. prominence sources
3. keep an explicit deferred list of salient non-Latin-primary names that are out of scope for v1
4. compute a deterministic draft score rather than this manually smoothed seed
5. separate:
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
