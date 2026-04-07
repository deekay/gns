# Salience Meteoric Name Set

This note defines a companion challenge slice for newer breakout names that can rise too quickly to be captured well by slow-moving global brand rankings.

This slice exists because the current prestige seed is built mostly from:

- durable global brand lists
- major website rankings

That is useful for obvious legacy names, but it underweights:

- fast-rising AI labs
- breakout AI product brands
- fast-growing developer tools
- newly public or still-private companies whose name salience has outrun traditional brand-list inclusion

This should be read alongside:

- [INITIAL_SALIENCE_TIERING_EXERCISE.md](./INITIAL_SALIENCE_TIERING_EXERCISE.md)
- [SALIENCE_BOUNDARY_CHALLENGE_SET.md](./SALIENCE_BOUNDARY_CHALLENGE_SET.md)
- [LAUNCH_PREMIUM_OVERLAY_PIPELINE.md](./LAUNCH_PREMIUM_OVERLAY_PIPELINE.md)
- [SALIENCE_DATA_BUILD_PLAN.md](./SALIENCE_DATA_BUILD_PLAN.md)

The working CSV for this slice now lives at:

- [salience_meteoric_name_set.csv](./salience_meteoric_name_set.csv)

## Why This Exists

One useful pressure test is:

> how do we make sure the overlay can see names that became globally salient too recently for classic brand lists to catch up?

This matters because the system should not accidentally protect:

- `cocacola`
- `nike`
- `oracle`

while missing things like:

- `openai`
- `anthropic`
- `claude`
- `perplexity`

just because those names rose through a different path.

## Current Gap In The Prestige Seed

Right now the original prestige seed includes:

- `chatgpt`

But it does **not** include:

- `openai`
- `anthropic`
- `claude`

That does not necessarily mean those names should be excluded.

It mostly means the original seed was built from source classes that:

- reward durability
- reward established multinational brand presence
- and only partly capture meteoric product or lab names through broad website traffic

So this slice exists to keep "new but obviously real" names from falling through the cracks.

## Current Buckets

The CSV uses the same provisional expectations as the other challenge slices:

- `likely_selected`
- `arguable`
- `likely_not_selected`

The current first pass contains `21` names:

- `7` `likely_selected`
- `7` `arguable`
- `7` `likely_not_selected`

These are not final judgments. They are stress-test hypotheses.

## How To Read The Results

### `likely_selected`

Typical pattern:

- very strong recent public coordination
- clear natural buyer
- distinctive token
- and enough momentum that cheap launch capture already feels like an obvious mistake

Good examples:

- `openai`
- `anthropic`
- `perplexity`
- `deepseek`

### `arguable`

Typical pattern:

- the name is clearly real and fast-rising
- but the exact token is weaker than the product or company behind it
- or the momentum is strong but still more audience-specific
- or the brand is meaningful while the token is generic or common-word-like

Good examples:

- `claude`
- `cursor`
- `gemini`
- `copilot`

### `likely_not_selected`

Typical pattern:

- real product or company exists
- but the token is too generic, too short, too person-name-like, or too contested
- or the salience is still not broad enough to justify protocol special treatment

Good examples:

- `pi`
- `poe`
- `scale`
- `harvey`

## Stress Patterns In This CSV

| Stress pattern | Why it matters | Example names |
| --- | --- | --- |
| `ai_company_breakout` | tests whether recent company names with obvious buyers can clear the bar even before old brand lists catch up | `openai`, `anthropic`, `deepseek` |
| `ai_product_breakout` | tests whether product names rather than company names should carry the stronger salience signal | `chatgpt`, `claude`, `gemini` |
| `developer_tool_breakout` | tests whether new software/tool names should qualify on momentum plus buyer clarity | `cursor`, `replit`, `bolt` |
| `consumer_ai_service` | tests whether newer consumer-facing AI brands with clear buyer identity should make the overlay | `perplexity`, `midjourney`, `elevenlabs`, `suno` |
| `generic_token_meteoric` | tests whether a meteoric brand still fails when the token is too broad or contested | `pi`, `poe`, `scale`, `harvey`, `sierra` |

## Main Questions This Slice Should Help Answer

1. How do we recognize names whose salience has outrun legacy brand datasets?
2. When should product-level salience count more than company-level salience?
3. How much should current traffic or app usage matter for newer names?
4. Which meteoric names still fail because the token itself is too weak or generic?

## Current Working Intuition

My current intuition is:

- `openai`, `anthropic`, and `perplexity` should absolutely be in scope for serious review
- `claude` and `cursor` are very important pressure tests because their products may be more salient than their company names, but their tokens are weaker
- meteoric names require newer source types than the prestige seed used
- and the methodology needs an explicit way to reward recent public coordination without automatically overfitting to hype cycles

## The Sourcing Implication

If we want this lane to be real, we need source buckets that capture:

- current web usage for AI/chat products
- app-level rankings for breakout consumer AI products
- private-company or breakout-company rankings
- developer-tool momentum and visibility

Without those, the overlay will systematically undercount newer names and overcount only slow-moving incumbents.
