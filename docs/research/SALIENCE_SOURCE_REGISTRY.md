# Salience Source Registry

This registry gives short codes to the sources currently used in the salience work and records what role each source plays.

It is intentionally small for now.

The goal is to let future candidate rows reference source evidence compactly while keeping the meaning of each code readable.

## Currently Used Sources

| Code | Source | Bucket | Status | Why It Helps | Main Limitation |
| --- | --- | --- | --- | --- | --- |
| `BZ25` | Kantar BrandZ Global 2025 | `global_brand` | active | strong signal for globally salient household and technology brands | still biased toward large global brands and weak on regional-only names |
| `IB24` | Interbrand Best Global Brands 2024 | `global_brand` | active | useful cross-check on durable multinational brand salience | weaker for newer platforms and regionally obvious names |
| `BF25` | Brand Finance Global 500 2025 | `global_brand` | active | adds another global ranking with broad corporate and brand coverage | still pushes toward financially legible multinationals |
| `SW26` | Similarweb Top Websites viewed 2026-04-06 | `global_web` | active | strong evidence for live public coordination on exact Latin-script names | strongly favors websites and major consumer internet destinations |

## Source Buckets We Need Next

These are not individual sources yet. They are the missing evidence classes the next pass should ingest.

| Bucket code | Bucket | Priority | Why It Matters |
| --- | --- | --- | --- |
| `REG_BRAND` | Regional and national consumer brand rankings | `wave_1` | needed to populate a credible regionally obvious `B` tier |
| `REG_RETAIL` | Grocery retail restaurant and household-facing rankings | `wave_1` | needed for names like `chickfila`-type examples that matter to ordinary people but do not show up in global brand lists |
| `REG_WEB` | Regional top-site and top-app rankings | `wave_2` | improves evidence for regionally dominant coordination names that are not globally top-ranked |
| `PAY_COORD` | Payments and consumer-finance coordination sources | `wave_3` | captures names whose misrouting is socially costly even when they are not glamorous brands |
| `PUB_COORD` | Travel delivery logistics telecom and public-service coordination sources | `wave_3` | captures names people actively coordinate around in everyday life |
| `PUB_EQTY` | Public-company scale and liquidity sources | `wave_3` | useful as a secondary capture-risk amplifier for names like `asana` where cheap launch capture could still be an obvious resale trade |
| `FIN_BRAND` | Hedge fund asset manager venture capital and private equity rankings | `wave_3` | needed for finance-circle names like `citadel` or `foundersfund` that may have weaker household salience but strong natural-buyer pressure |
| `ENT_SOFT` | Enterprise software and B2B cloud rankings | `wave_4` | useful for considered and near-miss sets but should not dominate lower overlay tiers |
| `DEV_PLAT` | Developer and software-platform rankings | `wave_4` | useful where a name is genuinely coordination-critical for software ecosystems |

## Current Read

Right now the active source set is enough to:

- identify obvious `S+`, `S`, and some `A` names
- show where the lower edge feels mushy
- prove that the current pilot is too global-brand and platform-heavy

It is **not** enough yet to:

- populate a serious regional `B` tier
- confidently separate regionally obvious names from merely visible long-tail brands
- or support strong judgments on many national consumer names

That is why the next additions should start with regional household and consumer sources rather than more software or B2B inputs.

The next most important correction after that is:

- finance and public-company scale sources that can sharpen the `capture risk` side of the methodology without turning the overlay into a pure market-cap table
