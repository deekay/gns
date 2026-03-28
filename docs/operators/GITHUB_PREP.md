# GitHub Prep

This repository is close to publishable, but a few decisions are still worth making before pushing it publicly.

## Ready Now

- product naming is standardized around `Global Name System` / `GNS`
- top-level docs now explain architecture, contribution flow, testing, and Sparrow setup
- local scripts can be run directly with full paths
- the private signet Sparrow setup is documented and automated
- private strategy files can live under `private/` or match the ignored planning-list patterns in `.gitignore`

## Private First Is Fine

Starting on a private GitHub repo and making it public later is a normal workflow.

The important caveat is that **Git history matters**. If sensitive files are ever committed, they remain in history even if they are deleted before the repo becomes public. So for anything you never want public, the safest rule is:

- do not commit it at all
- keep it under `private/` or another ignored path from day one
- if something sensitive is accidentally committed, rewrite history before making the repo public

## Remaining Decisions

### 1. Decide how infra-specific defaults should be

Some scripts still default to the current demo host and SSH key path for convenience.

That is useful for the current team, but before public release you may want to decide whether to:

- keep those defaults as examples
- replace them with placeholders
- or move them behind explicit environment variables

Note: the repo is already moving toward explicit env vars and placeholders, which is the safer public default.

### 2. Add GitHub repo polish

Good next additions:

- CI workflow
- screenshots in the README

### 3. Decide what should stay demo-only

A few parts of the repo are intentionally tuned for the hosted private signet demo:

- private signet funding helpers
- demo reset scripts
- demo-specific VPS bootstrap defaults

That is fine, but it helps to be explicit in public docs about which paths are:

- reference architecture
- current demo infrastructure
- operator convenience

## Suggested Public Repo Shape

If you want the repo to feel approachable on day one, the minimum recommended public-facing set is:

- `README.md`
- `docs/core/ARCHITECTURE.md`
- `CONTRIBUTING.md`
- `docs/core/TESTING.md`
- `docs/demo/SPARROW_PRIVATE_SIGNET.md`
- `LICENSE`
- `.github/ISSUE_TEMPLATE/*`
- `.github/PULL_REQUEST_TEMPLATE.md`

## Recommended Non-Public Paths

If you want a clean split between public protocol work and private planning, use these conventions:

- `private/`: commercial ideas, influencer lists, outreach notes, deal flow
- `COMMERCIAL_IDEAS.md`: already ignored
- env files such as `.env` / `.env.local`: already ignored

## Suggested Next Step

Pick how opinionated you want the infra defaults to be in public scripts, then add CI.
