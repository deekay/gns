# Testing The Current Prototype

This document is about the prototype as it exists today, not the eventual target architecture.

## Current Reality

Today the repo has:

- a local web app
- a local resolver
- an in-memory indexer inside the resolver and indexer app
- fixture-mode and RPC-mode chain loading
- snapshot persistence for RPC mode
- a browser-side claim draft composer that prepares commit/reveal payloads and wallet handoff templates
- a prototype CLI flow that can build, sign, broadcast a commit, and queue a pre-signed reveal
- core-engine support for signed transfer events, including immature bond-continuity validation and mature gift-transfer handling
- a prototype off-chain value-record flow through the CLI and resolver
- a prototype cooperative mature-sale transfer flow through the CLI
- a terminal-only live-testing path for generating owner/funding keys and creating claim packages without the browser
- a source-mode override via `GNS_SOURCE_MODE=auto|fixture|rpc|esplora` so local demos do not accidentally inherit stale remote-node env
- an optional Postgres/Supabase-backed persistence mode when `GNS_DATABASE_URL` is set

Today the repo does **not** yet have:

- a browser flow that signs or broadcasts a new claim
- wallet integration
- a browser flow for transfer or sale signing
- a separate persistent database-backed indexer service

So the answer to your questions right now is:

- `Vercel?`
  Not yet. If we deploy later, only the web app belongs on Vercel.
- `CLI tools locally?`
  Yes. The CLI can now run a prototype end-to-end claim flow locally, plus gift/pre-arranged transfers, cooperative mature-sale transfers, and off-chain value publication.
- `Indexer locally?`
  Yes. Right now the resolver runs with an in-memory indexer inside it. There is also a one-shot local indexer app for inspection/debugging.

## What Runs Where Right Now

### `npm run dev:web`

Starts the website at:

- `http://127.0.0.1:3000` by default

Override with:

```bash
GNS_WEB_PORT=3001 npm run dev:web
```

The website does not index Bitcoin itself. It proxies to the resolver.

### `npm run dev:resolver`

Starts the resolver at:

- `http://127.0.0.1:8787` by default

Override with:

```bash
GNS_RESOLVER_PORT=8788 npm run dev:resolver
```

The resolver currently:

- loads blocks from either fixture mode or RPC mode
- builds/maintains the in-memory index
- serves read-only ownership/index responses
- accepts signed off-chain value records via `POST /values`

### `npm run dev:indexer`

Runs a one-shot indexer pass and prints a JSON snapshot to stdout.

Use this when you want to:

- confirm what the indexer sees
- inspect chain source metadata
- test snapshot restore behavior

This is not an always-on service right now.

## Fastest Test: Local Fixture Mode

This is the easiest path and requires no Bitcoin node.

### 1. Install dependencies

```bash
npm install
```

### 2. Fast path: run web and resolver together

In one terminal:

```bash
npm run dev:all
```

Then open:

- `http://127.0.0.1:3000`

If `3000` or `8787` is already taken on your machine, use:

```bash
GNS_WEB_PORT=3001 GNS_RESOLVER_PORT=8788 npm run dev:all
```

Then open:

- `http://127.0.0.1:3001`

If you have old remote-node env vars hanging around in your shell and want to force the reliable local path, use:

```bash
GNS_SOURCE_MODE=fixture GNS_WEB_PORT=3001 GNS_RESOLVER_PORT=8788 npm run dev:all
```

### 2a. Repeatable smoke test for fixture mode

If you want one command that boots the resolver and web app on dedicated test ports, exercises the key HTTP paths, and shuts them back down again:

```bash
npm run test:smoke-fixture
```

This checks:

- resolver `/health`
- web `/api/health`
- web `/api/names`
- name lookup for `alice`
- claim plan lookup for `bob`
- prototype owner-key generation
- claim-draft generation

### 2c. Experimental reserved-auction lab

The current reserved-auction work is implemented as an experimental simulator
and website lab, not an on-chain market yet.

You can inspect it in the local app at:

- `http://127.0.0.1:3000/auctions`

The backing API is:

- `/api/auctions`
- `/api/experimental-auctions`

And the most relevant automated coverage is:

```bash
npm test -w @gns/core
npm test -w @gns/web
```

That coverage includes:

- single-auction policy and fixture outcomes
- market-level bidder budget behavior
- state-at-block phase derivation
- website loading of the curated auction-state fixtures
- chain-derived experimental auction-state derivation from observed
  `AUCTION_BID` transactions
- stale-state rejection when a bid package no longer matches the derived
  pre-bid state
- derived accepted-bid bond / release summaries for experimental lots

### 2b. Repeatable smoke test for batched fixture mode

If you want the same kind of repeatable proof for the ordinary-lane Merkle
batching path, use:

```bash
npm run test:smoke-fixture-batch
```

This boots the resolver and web app against the dedicated batched fixture at
[`fixtures/demo-chain-batch.json`](../../fixtures/demo-chain-batch.json),
then checks:

- resolver `/health`
- web `/api/health`
- web `/api/names`
- name lookups for `batchalpha` and `batchbravo`
- name activity for `batchalpha`
- transaction provenance for the batch anchor tx
- transaction provenance for one batch reveal tx
- offline architect HTML includes both the batch commit and batch reveal builder controls

The goal is not to simulate every signer step. It is to prove that the
resolver, web app, provenance surfaces, and offline review flow all remain
coherent when names arrive through a batched ordinary-lane commit.

## Full CLI Integration Suite: Controlled Chain

For the exhaustive protocol suite, we use a controlled `regtest` environment instead of public signet. That lets us mint funds deterministically and exercise failure cases without depending on faucets.

Run it with:

```bash
npm run test:regtest-cli-suite
```

What it covers today:

- fresh availability feedback for an unclaimed name
- invalid-name feedback
- missing-name feedback
- insufficient bond funding for a claim
- successful claim commit/reveal flow
- successful ordinary-lane batched claim flow with one batch anchor and two queued reveals
- successful immature gift transfer for a name originally claimed through a batch anchor
- invalid ordinary-lane batch reveal that is valid Bitcoin, confirms on-chain, and is ignored by GNS because the Merkle proof is wrong
- duplicate claim that does not overtake the earlier winner
- missed reveal window / stale reveal handling
- immature gift transfer with bond continuity
- signed off-chain value publication
- stale sequence rejection for value records
- wrong-owner rejection for value records
- invalid immature transfer that breaks bond continuity
- mature cooperative sale transfer

Artifacts:

- stable summary: `./.data/last-regtest-suite-summary.json`
- full per-run artifacts: printed at suite start as a temp artifact directory

Important note:

- the suite uses explicit test-only maturity overrides so the mature-sale case finishes in minutes instead of requiring a full `52,000`-block wait
- production behavior is unchanged unless `GNS_TEST_OVERRIDE_*` env vars are set

## Live Public Signet Smoke Flow

For the shared public demo at [https://globalnamesystem.org](https://globalnamesystem.org), use:

```bash
npm run test:signet-smoke
```

What it does:

- opens SSH tunnels to the VPS-backed signet RPC and resolver
- reuses a stable owner account from `./.data/live-account-2.json`
- checks whether that address has enough signet for the `50,000` sat bond plus fees
- publishes the latest smoke summary to the VPS at `/var/lib/gns/live-smoke-summary.json` so the public app can show current readiness
- currently exercises the **single-name** live signet claim flow, not the newer ordinary-lane batched claim path
- if funded:
  - prepares a fresh available name
  - submits the live signet claim
  - waits for reveal broadcast
  - waits for the public app to show the claimed name
  - publishes a value record
  - attempts a gift transfer if enough fee liquidity remains
- if not funded:
  - writes a summary explaining the funding shortfall

Artifacts:

- summary: `./.data/live-smoke-summary.json`
- live claim package: `./.data/live-smoke-claim.json`

Important note:

- this script does **not** bypass faucet anti-bot protection
- if the owner address is unfunded, the script will stop at `awaiting_funds` and leave everything ready for the moment a real signet UTXO arrives
- the public app can surface the latest published status at [https://globalnamesystem.org/api/live-smoke-status](https://globalnamesystem.org/api/live-smoke-status) once the VPS web service is deployed with `GNS_WEB_LIVE_SMOKE_STATUS_PATH=/var/lib/gns/live-smoke-summary.json`
- if we want live signet evidence for batched ordinary claims, that still needs a separate batch-oriented smoke script and summary path

## Private Signet On The Existing VPS

When public faucet funding is unreliable, we can use a parallel private signet on the same VPS.

If you want Sparrow to talk to that private demo chain, use the dedicated setup guide:

- [SPARROW_PRIVATE_SIGNET.md](../demo/SPARROW_PRIVATE_SIGNET.md)

Helper commands:

```bash
npm run sparrow:private-signet:start
npm run sparrow:private-signet:configure
npm run sparrow:private-signet:config
npm run sparrow:private-signet:tunnel
```

Direct scripts you can run from anywhere:

```bash
/path/to/gns/scripts/configure-sparrow-private-signet.sh
/path/to/gns/scripts/print-private-signet-sparrow-config.sh
/path/to/gns/scripts/open-private-signet-sparrow-tunnel.sh
/path/to/gns/scripts/launch-sparrow-signet.sh
/path/to/gns/scripts/start-private-signet-sparrow-session.sh
```

If you do not want to pass the SSH target and key every time, set:

```bash
export GNS_PRIVATE_SIGNET_SSH_TARGET=root@<server-ip>
export GNS_PRIVATE_SIGNET_SSH_KEY=~/.ssh/<your-key>
```

Bootstrap it once with:

```bash
npm run bootstrap:private-signet:vps -- root@<server-ip> ~/.ssh/<your-key>
```

Routine code deploys go through:

```bash
npm run deploy:private-signet:vps -- root@<server-ip> ~/.ssh/<your-key>
```

To seed a fresh private-signet demo state from the CLI against that VPS:

```bash
npm run test:private-signet-demo
```

To reset the private chain and reseed the canonical hosted-demo examples in one go:

```bash
npm run reseed:private-signet:canonical -- root@<server-ip> ~/.ssh/<your-key>
```

That canonical reseed leaves behind this deterministic set:

- `claimdemo`
- `valuedemo`
- `transferdemo`
- `batchalpha`
- `batchbeta`

That full script:

- funds demo accounts from the VPS miner wallet
- claims multiple names
- publishes an off-chain value record
- performs a gift transfer
- performs an immature buyer-funded sale transfer
- advances blocks into maturity
- leaves one fresh immature name and one pending claim plan behind for UI inspection

For faster, focused checks, use:

```bash
npm run test:private-signet-batch-smoke
npm run test:private-signet-claim-smoke
npm run test:private-signet-transfer-smoke
npm run test:private-signet-value-handoff-smoke
```

Those focused smokes cover:

- `batch-smoke`: one private-signet batch anchor, two later reveals, and a later gift transfer on one of the batch-claimed names
- `claim-smoke`: one name through commit, reveal, and claimed state
- `transfer-smoke`: gift transfer and immature buyer-funded sale transfer
- `value-handoff-smoke`: post-transfer value authority moving from the old owner to the new owner

The batch smoke writes a local summary to:

- `./.data/private-signet-demo/batch-smoke-summary.json`

If `GNS_PRIVATE_SIGNET_BATCH_SMOKE_PUBLISH_REMOTE_STATUS` is not set to `0`,
it also publishes that summary to the VPS path in
`GNS_PRIVATE_SIGNET_BATCH_SMOKE_REMOTE_STATUS_PATH`, which defaults to:

- `/var/lib/gns/private-batch-smoke-summary.json`

If the private web service is configured with
`GNS_WEB_PRIVATE_BATCH_SMOKE_STATUS_PATH=/var/lib/gns/private-batch-smoke-summary.json`,
the site can surface that status at:

- `/api/private-batch-smoke-status`

Useful server-side commands:

```bash
ssh -i ~/.ssh/<your-key> root@<server-ip>
systemctl status bitcoind-private-signet
systemctl status gns-private-resolver
systemctl status gns-private-web
gns-private-signet-mine 1
gns-private-signet-fund <address> <amount-btc>
```

Important notes:

- the private chain still reports `chain=signet`, but it is isolated by a custom signet challenge
- the private web app is configured separately with `GNS_WEB_BASE_PATH=/gns-private`
- the private web app hides the public live-smoke panel so it does not look broken or unfunded
- the direct private demo URL on the VPS is `http://<server-ip>:3001/gns-private`

## Troubleshooting

If the terminal says both services are listening but the page stays on `Loading...`, the usual causes are:

- a stale older web/resolver process is still holding the port
- the browser is showing an older page instance

Check which processes are holding the ports:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:3001 -sTCP:LISTEN
lsof -nP -iTCP:8787 -sTCP:LISTEN
lsof -nP -iTCP:8788 -sTCP:LISTEN
```

Stop any stale local listeners:

```bash
lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null | xargs -r kill
lsof -tiTCP:3001 -sTCP:LISTEN 2>/dev/null | xargs -r kill
lsof -tiTCP:8787 -sTCP:LISTEN 2>/dev/null | xargs -r kill
lsof -tiTCP:8788 -sTCP:LISTEN 2>/dev/null | xargs -r kill
```

Then restart cleanly:

```bash
GNS_WEB_PORT=3001 GNS_RESOLVER_PORT=8788 npm run dev:all
```

If you previously exported a placeholder RPC URL and the resolver still tries to boot remotely, force fixture mode explicitly:

```bash
GNS_SOURCE_MODE=fixture GNS_WEB_PORT=3001 GNS_RESOLVER_PORT=8788 npm run dev:all
```

Then hard-refresh the browser and open:

- `http://127.0.0.1:3001`

If you want to verify the backend directly before opening the page:

```bash
curl -s http://127.0.0.1:8788/health
curl -s http://127.0.0.1:3001/api/health
curl -s http://127.0.0.1:3001/api/names
```

What you should see:

- a resolver status card
- one claimed name: `alice`
- a search box where `alice` resolves successfully
- a claim draft composer that can generate:
  - a prototype owner key
  - commit payload bytes
  - a commit transaction skeleton
  - a reveal payload once a commit txid is supplied

If you prefer to run each process separately, use the manual steps below.

### 3. Manual path: run the resolver

In terminal 1:

```bash
npm run dev:resolver
```

Expected:

- resolver listens on `http://127.0.0.1:8787`
- it loads from the local fixture chain

Health check:

```bash
curl -s http://127.0.0.1:8787/health
```

If you changed the resolver port, use that port in the URL instead.

Expected important fields:

- `"source":"fixture"`
- `"syncMode":"fixture"`
- `"trackedNames":1`
- `"valueRecordsTracked":0` unless you have already published prototype value records

### 4. Run the web app

In terminal 2:

```bash
npm run dev:web
```

Open:

- `http://127.0.0.1:3000`

If you changed `GNS_WEB_PORT`, open that port instead.

What you should see:

- a resolver status card
- one claimed name: `alice`
- a search box where `alice` resolves successfully
- a claim draft composer for preparing unsigned claim inputs

### 4a. Exercise the claim draft composer

This is the best way to test the new claim-prep flow without a wallet integration yet.

1. Search for an unclaimed name like `bob`.
2. In the `Claim Draft Composer`, click `Generate Test Key`.
3. Leave `Bond Output Vout` at `0` unless you are intentionally testing another output order.
4. Optionally fill in:
   - `Bond Destination`
   - `Change Destination`
5. Click `Prepare Draft`.

What you should see:

- the required bond amount for the name
- the commit hash
- the commit payload hex
- a wallet handoff section for the commit transaction
- an explanation of how the reveal can be prepared later
- a `Download Claim Package` button

## Terminal-Only Claim Prep

If you want to stay out of the browser entirely, the CLI can now prepare the live-testing inputs directly.

### 1. Generate a fresh live-testing account

```bash
npm run dev:cli -- generate-live-account --network signet
```

That prints:

- `ownerPrivateKeyHex`
- `ownerPubkey`
- `fundingWif`
- `fundingAddress`

The current prototype keeps the owner key and the funding key separate on purpose.

### 2. Create a claim package directly from the CLI

```bash
npm run dev:cli -- create-claim-package codexlive2026a \
  --owner-pubkey <owner-pubkey-hex> \
  --bond-destination <funding-address> \
  --change-destination <funding-address> \
  --write /path/to/claim-package.json
```

Notes:

- if you omit `--nonce-hex`, the CLI generates a fresh 8-byte nonce automatically
- long names at the bond floor are the easiest live test path because they only require `50,000 sats` of bonded value
- once the package exists, the rest of the claim flow is the same `build/sign/broadcast/queue reveal` sequence documented below

If you then paste a `commit txid` and click `Prepare Draft` again, you should also see:

- the reveal payload hex
- a reveal transaction skeleton
- an auto-reveal plan describing how a future watcher service could broadcast the pre-signed reveal

### 4b. Validate the downloaded claim package in the CLI

After downloading the claim package from the browser, you can validate it locally:

```bash
npm run dev:cli -- inspect-claim-package ./gns-claim-bob-commit-ready.json
```

What you should see:

- confirmation that the claim package is valid
- the normalized name
- the required bond amount
- the bond output index
- the commit payload bytes
- whether the reveal payload is already ready

### 4c. Build unsigned commit and reveal artifacts from a claim package

The CLI can now turn a claim package into prototype unsigned transaction artifacts.

Input format:

```text
txid:vout:valueSats:bech32Address
```

Current prototype assumptions:

- inputs and output destinations should be native segwit or taproot bech32 addresses
- `signet` uses testnet-style `tb1...` addresses
- the commit builder currently supports `bondVout` `0` or `1`
- the first signer implementation currently signs `witnesspubkeyhash` inputs only

Example commit build:

```bash
npm run dev:cli -- build-commit-artifacts ./gns-claim-bob-commit-ready.json \
  --input aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:0:30000000:tb1qqvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcr7mrzn4 \
  --fee-sats 1000 \
  --network signet \
  --bond-address tb1qqyqszqgpqyqszqgpqyqszqgpqyqszqgpw0yxjz \
  --change-address tb1qqgpqyqszqgpqyqszqgpqyqszqgpqyqszltzre5 \
  --write-package ./gns-claim-bob-reveal-ready.json
```

What you should get:

- unsigned commit transaction hex
- commit PSBT in base64
- derived commit txid
- an updated reveal-ready claim package

Example reveal build:

```bash
npm run dev:cli -- build-reveal-artifacts ./gns-claim-bob-reveal-ready.json \
  --input bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb:1:15000:tb1qqszqgpqyqszqgpqyqszqgpqyqszqgpqy7ty85f \
  --fee-sats 500 \
  --network signet \
  --change-address tb1qqgpqyqszqgpqyqszqgpqyqszqgpqyqszltzre5
```

What you should get:

- unsigned reveal transaction hex
- reveal PSBT in base64
- reveal txid

### 4d. Sign built artifacts with WIF keys

Once you have written commit or reveal artifacts to disk, the CLI can sign the embedded PSBT:

```bash
npm run dev:cli -- sign-artifacts ./gns-commit-artifacts.json \
  --wif cMpMxK92W1DjqDvWV3pMn4xLwAuQJhNF3MFqkEHUQRPQofUJku8R
```

What you should get:

- signed transaction hex
- signed transaction id
- finalized PSBT in base64

Current limitation:

- the prototype signer only handles `witnesspubkeyhash` inputs for now

### 4e. Broadcast a signed transaction through Bitcoin Core RPC

Once you have a signed artifacts JSON file, you can broadcast it directly:

```bash
npm run dev:cli -- broadcast-transaction ./gns-signed-commit-artifacts.json \
  --expected-chain signet
```

By default, the CLI will read RPC credentials from:

```bash
GNS_BITCOIN_RPC_URL
GNS_BITCOIN_RPC_USERNAME
GNS_BITCOIN_RPC_PASSWORD
```

You can also pass them explicitly:

```bash
npm run dev:cli -- broadcast-transaction ./gns-signed-commit-artifacts.json \
  --rpc-url http://127.0.0.1:38332 \
  --rpc-username bitcoinrpc \
  --rpc-password your-password \
  --expected-chain signet
```

### 4f. Watch for commit confirmation and auto-broadcast the signed reveal

After signing the reveal transaction, the CLI can poll your node until the commit confirms and then broadcast the reveal:

```bash
npm run dev:cli -- watch-and-broadcast-reveal ./gns-signed-reveal-artifacts.json \
  --commit-txid <commit-txid> \
  --expected-chain signet \
  --poll-interval-ms 10000 \
  --timeout-ms 1800000
```

What this does:

- checks your Bitcoin RPC chain first
- polls for the commit transaction
- waits until it has at least 1 confirmation
- broadcasts the pre-signed reveal transaction

Current note:

- this command assumes you already have a fully signed reveal artifact on disk

### 4g. Persist a signed reveal so the watcher can resume after restarts

If you want the reveal to survive process restarts, enqueue it on disk:

```bash
npm run dev:cli -- enqueue-reveal ./gns-signed-reveal-artifacts.json \
  --commit-txid <commit-txid> \
  --expected-chain signet
```

By default this writes to:

```text
.data/reveal-queue.json
```

You can override it with:

```bash
--queue /path/to/reveal-queue.json
```

### 4h. Run the reveal watcher against the persisted queue

Run one pass:

```bash
npm run dev:cli -- run-reveal-watcher --expected-chain signet --once
```

Run continuously:

```bash
npm run dev:cli -- run-reveal-watcher \
  --expected-chain signet \
  --poll-interval-ms 10000
```

What it does:

- loads the disk queue
- checks each pending commit transaction for confirmations
- broadcasts any reveal whose commit is confirmed
- writes the updated queue back to disk

This is the restart-safe version of the earlier one-shot watcher flow.

### 4i. Run the end-to-end prototype claim flow in one command

Once you have:

- a downloaded claim package
- one or more commit funding inputs
- one or more reveal funding inputs
- a signing WIF for those inputs
- Bitcoin Core RPC configured

you can run the full prototype flow in one step:

```bash
npm run dev:cli -- submit-claim ./gns-claim-bob-commit-ready.json \
  --commit-input aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:0:30000000:tb1qqvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcr7mrzn4 \
  --commit-fee-sats 1000 \
  --reveal-input bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb:1:15000:tb1qqvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcr7mrzn4 \
  --reveal-fee-sats 500 \
  --wif cMpMxK92W1DjqDvWV3pMn4xLwAuQJhNF3MFqkEHUQRPQofUJku8R \
  --expected-chain signet \
  --queue .data/reveal-queue.json \
  --out-dir .data/claim-bob
```

What this does:

- builds unsigned commit artifacts
- signs the commit
- broadcasts the signed commit through Bitcoin Core RPC
- upgrades the claim package to reveal-ready
- builds and signs the reveal
- enqueues the signed reveal on disk for the watcher
- writes all intermediate JSON artifacts to `--out-dir`

What it does **not** do yet:

- automatically run the watcher in the same process
- derive keys from a seed phrase
- support anything beyond the current prototype signing assumptions

After `submit-claim`, run the watcher separately:

```bash
npm run dev:cli -- run-reveal-watcher --expected-chain signet --once
```

### 4j. Run the prototype gift/pre-arranged transfer flow in one command

If you already know:

- the current `prevStateTxid` for the name's latest ownership state
- the current bond input outpoint
- the new owner pubkey
- the owner private key used to authorize the name transfer
- the WIF needed to spend the live bond input and any extra fee-paying inputs

you can build, sign, and broadcast a prototype transfer in one step:

```bash
npm run dev:cli -- submit-transfer \
  --prev-state-txid 4444444444444444444444444444444444444444444444444444444444444444 \
  --new-owner-pubkey 5555555555555555555555555555555555555555555555555555555555555555 \
  --owner-private-key-hex 4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a \
  --bond-input aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:0:25000000:tb1qqvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcr7mrzn4 \
  --input bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb:1:10000:tb1qqvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcr7mrzn4 \
  --successor-bond-vout 0 \
  --successor-bond-sats 25000000 \
  --fee-sats 1000 \
  --bond-address tb1qqyqszqgpqyqszqgpqyqszqgpqyqszqgpw0yxjz \
  --change-address tb1qqgpqyqszqgpqyqszqgpqyqszqgpqyqszltzre5 \
  --wif cMpMxK92W1DjqDvWV3pMn4xLwAuQJhNF3MFqkEHUQRPQofUJku8R \
  --expected-chain signet \
  --out-dir .data/transfer-bob
```

What this does:

- builds unsigned transfer artifacts with a successor bond output
- signs the transaction inputs with the supplied WIF
- embeds the owner authorization in the GNS transfer payload
- broadcasts the signed transfer transaction through Bitcoin Core RPC
- writes the unsigned and signed transfer artifacts to `--out-dir`

What it does **not** do yet:

- construct an on-chain seller payment output as part of this gift/pre-arranged transfer flow
- derive the owner private key from a seed phrase
- help discover the current `prevStateTxid` or live bond input automatically

### 4j1. Run the prototype immature buyer-funded sale transfer flow in one command

This flow is intended for the immature-sale case where:

- the seller spends the current live bond outpoint
- the buyer funds the successor bond, the sale price, and the fee
- the seller receives one payout output containing their reclaimed bond value plus the sale price
- the transaction carries the GNS transfer event in one on-chain step

Example:

```bash
npm run dev:cli -- submit-immature-sale-transfer \
  --prev-state-txid 8888888888888888888888888888888888888888888888888888888888888888 \
  --new-owner-pubkey 9999999999999999999999999999999999999999999999999999999999999999 \
  --owner-private-key-hex 4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a \
  --bond-input aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:0:25000000:tb1qqvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcr7mrzn4 \
  --seller-input abababababababababababababababababababababababababababababababab:1:5000:tb1qqvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcr7mrzn4 \
  --buyer-input bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb:2:25050000:tb1qqszqgpqyqszqgpqyqszqgpqyqszqgpqy7ty85f \
  --successor-bond-vout 0 \
  --successor-bond-sats 25000000 \
  --sale-price-sats 40000 \
  --seller-payout-address tb1qqyqszqgpqyqszqgpqyqszqgpqyqszqgpw0yxjz \
  --buyer-change-address tb1qqszqgpqyqszqgpqyqszqgpqyqszqgpqy7ty85f \
  --fee-sats 1000 \
  --bond-address tb1qqszqgpqyqszqgpqyqszqgpqyqszqgpqy7ty85f \
  --wif <seller-wif> \
  --wif <buyer-wif> \
  --expected-chain signet \
  --out-dir .data/immature-sale-transfer-bob
```

What this does:

- spends the seller's current bond input
- creates a successor bond output for the buyer
- pays the seller their original seller-side inputs plus the negotiated sale price
- requires signatures from the seller and buyer inputs
- broadcasts the signed transfer transaction through Bitcoin Core RPC
- writes the unsigned and signed transfer artifacts to `--out-dir`

### 4j2. Run the prototype cooperative mature-sale transfer flow in one command

This flow is intended for the mature-sale case where:

- the seller contributes at least one Bitcoin input to bind the exact transaction
- the buyer contributes payment inputs
- the transaction pays the seller and carries the GNS transfer event in one on-chain step

Example:

```bash
npm run dev:cli -- submit-sale-transfer \
  --prev-state-txid 6666666666666666666666666666666666666666666666666666666666666666 \
  --new-owner-pubkey 7777777777777777777777777777777777777777777777777777777777777777 \
  --owner-private-key-hex 4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a \
  --seller-input aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa:0:12000:tb1qqvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcr7mrzn4 \
  --buyer-input bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb:1:55000:tb1qqszqgpqyqszqgpqyqszqgpqyqszqgpqy7ty85f \
  --seller-payment-sats 40000 \
  --seller-payment-address tb1qqyqszqgpqyqszqgpqyqszqgpqyqszqgpw0yxjz \
  --seller-change-address tb1qqvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcr7mrzn4 \
  --buyer-change-address tb1qqszqgpqyqszqgpqyqszqgpqyqszqgpqy7ty85f \
  --fee-sats 1000 \
  --wif <seller-wif> \
  --wif <buyer-wif> \
  --expected-chain signet \
  --out-dir .data/sale-transfer-bob
```

What this does:

- builds an unsigned cooperative sale transaction
- includes the GNS transfer event plus an explicit seller payment output
- requires signatures from the seller and buyer inputs
- broadcasts the signed transaction through Bitcoin Core RPC
- writes sale-transfer artifacts to `--out-dir`

Important current limit:

- this prototype sale flow is the mature-sale model
- it does not try to preserve or move a live immature bond

### 4k. Sign and publish an off-chain value record

The prototype now supports owner-signed value records stored off-chain in the resolver.

Sign a value record:

```bash
npm run dev:cli -- sign-value-record \
  --name bob \
  --owner-private-key-hex 4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a4a \
  --sequence 1 \
  --value-type 2 \
  --payload-utf8 "https://example.com/bob" \
  --write .data/bob-value-record.json
```

Publish the signed value record to the resolver:

```bash
npm run dev:cli -- publish-value-record .data/bob-value-record.json
```

What the resolver validates:

- the record signature verifies against the owner pubkey
- the name currently exists in the resolver
- the record owner pubkey matches the resolver's current owner pubkey
- the sequence increases relative to the current owner-visible value record

Read the current value directly from the resolver:

```bash
curl -s http://127.0.0.1:8787/name/bob/value
```

Important note for fixture mode:

- the bundled fixture owner keys are not set up for a user-facing publish demo
- the value-record flow is easiest to exercise after claiming a real signet name that you control with the prototype CLI

### 5. Optional: run the one-shot indexer

In terminal 3:

```bash
npm run dev:indexer
```

Expected important fields:

- `"source":"fixture"`
- `"syncMode":"fixture"`
- `"trackedNames":1`
- `"name":"alice"`

## Real Test: Local Signet RPC Mode

This requires your own `bitcoind`.

### 1. Start a signet Bitcoin Core node

You need:

- signet enabled
- RPC enabled
- chain synced past your chosen launch height

### 2. Export the environment

In each terminal where you want to run the apps:

```bash
export GNS_BITCOIN_RPC_URL="https://your-remote-signet-node.example/rpc"
export GNS_BITCOIN_RPC_USERNAME="bitcoinrpc"
export GNS_BITCOIN_RPC_PASSWORD="your-rpc-password"
export GNS_EXPECT_CHAIN="signet"
export GNS_LAUNCH_HEIGHT="100"
export GNS_RPC_POLL_INTERVAL_MS="10000"
export GNS_RESOLVER_PORT="8787"
export GNS_WEB_PORT="3000"
```

### 2a. Check the remote RPC before doing anything else

```bash
npm run dev:cli -- check-rpc --expected-chain signet
```

If you do not want to rely on environment variables yet:

```bash
npm run dev:cli -- check-rpc \
  --rpc-url https://your-remote-signet-node.example/rpc \
  --rpc-username bitcoinrpc \
  --rpc-password your-rpc-password \
  --expected-chain signet
```

Expected important fields:

- `"kind":"gns-rpc-check-result"`
- `"chain":"signet"`
- `"blocks"`
- `"headers"`

If this check fails, do not keep going to resolver startup or claim submission until the remote node is fixed.

Optional:

```bash
export GNS_SNAPSHOT_PATH=".data/gns-snapshot.json"
export GNS_RPC_END_HEIGHT="200"
```

### 3. Run the resolver in RPC mode

In terminal 1:

```bash
npm run dev:resolver
```

Health check:

```bash
curl -s http://127.0.0.1:8787/health
```

Expected important fields:

- `"source":"rpc"`
- `"expectedChain":"signet"`
- `"rpcChainInfo":{"chain":"signet", ...}`

If the RPC endpoint is not signet, startup should fail immediately.

### 4. Run the website

In terminal 2:

```bash
npm run dev:web
```

The website will continue to read through the resolver.

### 5. Optional: run the one-shot indexer in RPC mode

In terminal 3:

```bash
npm run dev:indexer
```

Expected important fields:

- `"source":"rpc"`
- `"syncMode":"rpc-oneshot"`
- `"expectedChain":"signet"`
- `"rpcChainInfo":{"chain":"signet", ...}`

## Snapshot Behavior In RPC Mode

When RPC mode is active:

- the app writes a snapshot file to disk
- on restart it tries to restore from that snapshot
- it verifies the saved head block hash against Bitcoin Core
- if the saved head is no longer on the active chain, it discards the snapshot state and rebuilds from `GNS_LAUNCH_HEIGHT`

Current prototype behavior on reorg:

- detect mismatch
- rebuild from launch

It does **not** yet do selective rollback.

## Public Signet Without Credentials

If you only want to validate the live remote read path, you do not need a password or your own node.

This prototype now supports a public Esplora-backed signet source. The endpoint used during development is:

- [mempool.space signet API](https://mempool.space/signet/api)

Example:

```bash
export GNS_ESPLORA_BASE_URL="https://mempool.space/signet/api"
export GNS_EXPECT_CHAIN="signet"
TIP=$(curl -sS https://mempool.space/signet/api/blocks/tip/height)
export GNS_LAUNCH_HEIGHT="$TIP"
export GNS_RPC_END_HEIGHT="$TIP"
```

One-shot indexer check:

```bash
npm run dev:indexer
```

Expected important fields:

- `"source":"esplora"`
- `"syncMode":"esplora-oneshot"`
- `"descriptor":"https://mempool.space/signet/api"`

Resolver check:

```bash
GNS_RESOLVER_PORT=8790 npm run dev:resolver
```

In another terminal:

```bash
curl -s http://127.0.0.1:8790/health
```

Expected important fields:

- `"source":"esplora"`
- `"syncMode":"esplora-polling"` or `"esplora-oneshot"`
- `"descriptor":"https://mempool.space/signet/api"`

Current prototype status:

- resolver/indexer live reads are validated against the public signet Esplora source
- CLI transport commands also accept `--base-url <esplora-url>` now
- a funded end-to-end claim/reveal/transfer flow has still not been exercised live against the public backend

## Vercel Answer

Current recommendation:

- `web app`: can later go to Vercel
- `resolver`: should **not** go to Vercel
- `indexer`: should **not** go to Vercel
- `bitcoind`: should **not** go to Vercel

So if you want to test today:

- run everything locally first
- later, deploy only the website separately if useful

## Most Likely Confusions

### “Do I need to run the indexer separately?”

For the website/resolver path: no.

The resolver already builds and serves indexed state.

The separate `dev:indexer` command is mainly for:

- debugging
- inspecting snapshots
- checking what the indexer sees without starting the resolver

### “Do I need the CLI to test?”

Not yet.

The current prototype does not implement real end-user CLI flows for creating claims or signing transactions. Right now the CLI app is only a scaffold.

### “What is the easiest successful test right now?”

This one:

1. `npm install`
2. `npm run dev:all`
4. open `http://127.0.0.1:3000`
5. search for `alice`

That is the current shortest end-to-end proof that the stack is wired correctly.
