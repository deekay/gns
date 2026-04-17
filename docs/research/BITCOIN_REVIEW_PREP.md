# Bitcoin Review Prep

This note is the practical checklist for getting ONT into a clean state before
sharing it with technically sophisticated Bitcoin reviewers.

Related notes:

- [BITCOIN_EXPERT_ONE_PAGER.md](/Users/davidking/dev/gns/docs/research/BITCOIN_EXPERT_ONE_PAGER.md)
- [BITCOIN_EXPERT_REVIEW_PACKET.md](/Users/davidking/dev/gns/docs/research/BITCOIN_EXPERT_REVIEW_PACKET.md)
- [BITCOIN_PROTOCOL_REVIEW_QUESTIONS.md](/Users/davidking/dev/gns/docs/research/BITCOIN_PROTOCOL_REVIEW_QUESTIONS.md)

## Reading Order

The current recommended reading order is:

1. [BITCOIN_EXPERT_ONE_PAGER.md](/Users/davidking/dev/gns/docs/research/BITCOIN_EXPERT_ONE_PAGER.md)
2. [ONT_FROM_ZERO.md](/Users/davidking/dev/gns/docs/core/ONT_FROM_ZERO.md)
3. [BITCOIN_EXPERT_REVIEW_PACKET.md](/Users/davidking/dev/gns/docs/research/BITCOIN_EXPERT_REVIEW_PACKET.md)
4. [ONT_IMPLEMENTATION_AND_VALIDATION.md](/Users/davidking/dev/gns/docs/research/ONT_IMPLEMENTATION_AND_VALIDATION.md)
5. [BITCOIN_PROTOCOL_REVIEW_QUESTIONS.md](/Users/davidking/dev/gns/docs/research/BITCOIN_PROTOCOL_REVIEW_QUESTIONS.md)

Then use the deeper appendices only as needed.

## Refresh Checklist

Before sending the packet around, we should refresh evidence and live surfaces.

The intended shortcut is:

```bash
npm run review:refresh
```

If you only want the local packet refresh without remote private-signet or
regtest targets, use:

```bash
npm run review:refresh:local
```

That script:

- reruns local package tests
- reruns the fixture batch smoke
- reruns the fixture browser E2E smoke, including the configured
  multi-resolver value fanout/lagging-resolver browser path
- reruns private-signet batch smoke if private-signet SSH env is configured
- reruns private-signet auction smoke if private-signet SSH env is configured
- refreshes the private auction phase gallery
- reruns the regtest suite if regtest SSH env is configured

## Manual Spot Checks

After the refresh run, check:

- [https://opennametags.org/ont-private/api/experimental-auctions](https://opennametags.org/ont-private/api/experimental-auctions)
- [https://opennametags.org/api/private-batch-smoke-status](https://opennametags.org/api/private-batch-smoke-status)
- [https://opennametags.org/api/private-auction-smoke-status](https://opennametags.org/api/private-auction-smoke-status)
- [https://opennametags.org/auctions](https://opennametags.org/auctions)
- [https://opennametags.org/ont-private/auctions](https://opennametags.org/ont-private/auctions)

## What We Should Say Out Loud

The clean current stance is:

- ordinary-lane explicit Merkle batching is implemented and validated
- annex is a credible research upgrade path, not the baseline
- two-lane is the current lead launch direction
- reserved auctions are implemented enough to inspect and critique, but some
  numbers are still calibration placeholders
- private signet and regtest are the real live/demo and exhaustive test lanes

That is enough to begin informed external review without pretending every open
question is already closed.
