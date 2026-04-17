# Bitcoin Review Closure Matrix

This note is for internal use.

Its job is to make one thing explicit before external review:

> which questions do we already have a working recommendation for, which ones
> are still provisional but shareable, and which ones should be tightened
> before we put this in front of Bitcoin experts?

This is not a list of every unresolved thought in the repo. It is the shortest
useful closure map for the next review revision.

Related notes:

- [BITCOIN_EXPERT_REVIEW_PACKET.md](/Users/davidking/dev/gns/docs/research/BITCOIN_EXPERT_REVIEW_PACKET.md)
- [LAUNCH_SPEC_V0.md](/Users/davidking/dev/gns/docs/research/LAUNCH_SPEC_V0.md)
- [ONT_IMPLEMENTATION_AND_VALIDATION.md](/Users/davidking/dev/gns/docs/research/ONT_IMPLEMENTATION_AND_VALIDATION.md)
- [VALUE_RECORD_HISTORY_AND_KEYBASE_NOTES.md](/Users/davidking/dev/gns/docs/research/VALUE_RECORD_HISTORY_AND_KEYBASE_NOTES.md)

Status labels:

- `closed for this review rev`
- `provisional but shareable`
- `tighten before broader outreach`
- `defer from this review round`

## Closure Table

| Topic | Current recommendation | Status | Should Bitcoin experts review this now? | Next action |
| --- | --- | --- | --- | --- |
| Core framing | Payment handles first, owner-signed payment records second, broader key/value uses later | closed for this review rev | yes, as context | keep intro docs aligned |
| Public vs private signet | Private signet is the live demo path; public signet is retired | closed for this review rev | no, only mention for clarity | keep docs and site consistent |
| Ordinary claim architecture | Keep commit / reveal for ordinary names | closed for this review rev | yes | keep as baseline in review packet |
| Ordinary-lane batching | Explicit Merkle batching is the current mainline path | closed for this review rev | yes | present implemented + validated path clearly |
| Reveal proof carrier | Explicit reveal proof carrier now; annex remains upgrade research | provisional but shareable | yes | ask for Bitcoin-native feedback on annex sensibility |
| Annex adoption decision | Do not adopt annex as mainline yet | provisional but shareable | yes | keep it framed as research, not launch dependency |
| Transfer batching | Defer | defer from this review round | no | leave out unless directly asked |
| Launch architecture | Two-lane model remains the lead direction | provisional but shareable | yes, at high level | present one-lane as alternative, not lead |
| One-lane universal auction | Keep as serious alternative architecture, not the current recommendation | defer from this review round | maybe, but not as the main ask | mention only as background appendix |
| Reserved classes | Use 3 coarse reserved classes rather than one universal burden | provisional but shareable | yes, at design level | tighten example class semantics |
| Exact class floors and lock durations | Keep temporary numbers for testing; do not present them as final | tighten before broader outreach | not as a core review ask | document which numbers are placeholders |
| Auction family | Open ascending, soft close, meaningful increments, stronger late-extension increments | provisional but shareable | yes | present current rule family and why |
| No-bid release valve | Keep it | closed for this review rev | yes | present as a deliberate closure mechanism |
| Same-bidder rebid shape | Later bid should spend the earlier bid bond outpoint | provisional but shareable | yes | include in auction semantics section |
| Winning-bid settlement shape | Winning bid carries eventual owner key and materializes directly into a name | provisional but shareable | yes | ask whether a separate settlement step would be cleaner |
| Reserved list scope | Broad list is acceptable if pricing is auction-based | provisional but shareable | maybe, but not central for Bitcoin review | keep high level |
| Reserved list generation methodology | Use a source-registry plus inclusion-path method with selected and near-miss outputs | provisional but shareable | not the best use of Bitcoin-wizard time | keep [RESERVED_LIST_GENERATION_METHOD.md](/Users/davidking/dev/gns/docs/research/RESERVED_LIST_GENERATION_METHOD.md) aligned with the data build notes |
| Auction implementation status | Present as experimental but real: simulator + bid artifacts + chain-derived state + private-signet smoke | closed for this review rev | yes | keep status language honest |
| Merkle implementation status | Present as implemented and strongly validated | closed for this review rev | yes | keep validation evidence centralized |
| Value-record history | Use Keybase-style signed predecessor chains scoped to ownership intervals | closed for this review rev | maybe, as a systems question rather than a Bitcoin-native blocker | keep implementation, website history view, and CLI multi-resolver comparison exercised |
| Resolver transparency roots | Defer until value chains and multi-resolver publish/read are clearer | defer from this review round | maybe only if reviewers raise anti-rollback / forked-view concerns | keep routine value updates off Bitcoin by default |
| Website / tooling story | Website is good enough for inspection and demo; not yet a full end-user bidder flow | closed for this review rev | no, only as context | keep expectations explicit |

## What Should Be Closed Before A Broader Technical Outreach

The highest-value tightening work before a broader round is:

1. one short note that clearly marks which auction numbers are placeholders and
   which mechanics are the real design choice
2. one canonical review packet rather than many parallel entry points
3. one tighter explanation of which questions are Bitcoin-native versus launch
   governance questions
4. one hosted-demo refresh so value-record history is visible against current
   private-signet names

Those are not giant protocol blockers, but they reduce confusion.

## What Is Good Enough To Share Now

These items are already in a reviewable state:

- payment-handle framing
- ordinary claim flow
- explicit Merkle batching baseline
- annex as research rather than mainline
- two-lane lead architecture
- reserved auctions as an experimental but real system slice
- no-bid release valve
- winner materialization into owned names

## Recommended First-Round Ask

The best first-round ask to technically sophisticated Bitcoin reviewers is:

1. Is the ordinary-lane batching path sensible and disciplined?
2. Is the explicit-vs-annex posture reasonable?
3. Are the auction transaction and settlement shapes coherent?
4. Are there obvious Bitcoin-native concerns we are missing around policy,
   relay, footprint, or state-machine complexity?
5. If they care about resolver trust, does the value-record history direction
   look sufficient before we consider heavier transparency machinery?

That is a much better first ask than trying to get them to decide every launch
policy and governance question immediately.
