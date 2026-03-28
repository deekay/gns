# Run Against Signet

This repo defaults to the local fixture chain. You now have two remote signet paths:

- `rpc` mode for a real Bitcoin Core JSON-RPC node you control
- `esplora` mode for a public read-only signet backend such as [mempool.space signet API](https://mempool.space/signet/api)

Use `esplora` when you want to validate the live read path without running your own node.
Use `rpc` when you want the most complete and controllable write path for claim broadcast, reveal broadcast, and transfer execution.
The prototype CLI now also accepts `--base-url <esplora-url>` for transport commands, but that public write path has not yet been exercised with a funded end-to-end claim.

If you want to run the current prototype on your own VPS, use [VPS_SETUP.md](../operators/VPS_SETUP.md).

## Terminal-Only Live Flow

For live testing, the cleanest prototype loop is now:

```bash
npm run dev:cli -- generate-live-account --network signet --write /path/to/live-account.json
npm run dev:cli -- create-claim-package <name> \
  --owner-pubkey <owner-pubkey-hex> \
  --bond-destination <funding-address> \
  --change-destination <funding-address> \
  --write /path/to/claim-package.json
```

That gives you:

- one owner key for GNS ownership and off-chain value updates
- one funding WIF/address for signet transaction inputs
- one claim package ready for `build-commit-artifacts` or `submit-claim`

## Fastest Remote Signet Check

This is the exact public endpoint used to validate the prototype:

```bash
export GNS_ESPLORA_BASE_URL="https://mempool.space/signet/api"
export GNS_EXPECT_CHAIN="signet"
TIP=$(curl -sS https://mempool.space/signet/api/blocks/tip/height)
export GNS_LAUNCH_HEIGHT="$TIP"
export GNS_RPC_END_HEIGHT="$TIP"
```

Then run:

```bash
npm run dev:cli -- check-esplora --base-url https://mempool.space/signet/api --expected-chain signet
npm run dev:cli -- check-address --address <signet-address> --base-url https://mempool.space/signet/api
npm run dev:indexer
```

The address check is useful when you are waiting on faucet funds and want to see whether a signet UTXO is visible yet.

Expected output includes:

- `source: "esplora"`
- `syncMode: "esplora-oneshot"`
- `descriptor: "https://mempool.space/signet/api"`

Or run the resolver:

```bash
GNS_RESOLVER_PORT=8790 npm run dev:resolver
curl -s http://127.0.0.1:8790/health
```

Expected health fields include:

- `source: "esplora"`
- `syncMode: "esplora-polling"` or `esplora-oneshot`
- `descriptor: "https://mempool.space/signet/api"`

That node can be:

- local on your machine
- remote on a VPS you control
- remote on a hosted service, as long as it exposes Bitcoin Core-compatible JSON-RPC

## Prerequisites

- A running `bitcoind` with signet enabled
- RPC enabled for the current user or a dedicated service user
- The signet node should be synced at least past your chosen `GNS_LAUNCH_HEIGHT`

## Environment

Example environment for a remote signet node:

```bash
export GNS_SOURCE_MODE="rpc"
export GNS_BITCOIN_RPC_URL="https://your-remote-signet-node.example/rpc"
export GNS_BITCOIN_RPC_USERNAME="bitcoinrpc"
export GNS_BITCOIN_RPC_PASSWORD="your-rpc-password"
export GNS_ESPLORA_BASE_URL=""
export GNS_EXPECT_CHAIN="signet"
export GNS_LAUNCH_HEIGHT="100"
export GNS_RPC_POLL_INTERVAL_MS="10000"
export GNS_RESOLVER_PORT="8787"
export GNS_WEB_PORT="3000"
```

Notes:

- `GNS_SOURCE_MODE` can be `auto`, `fixture`, `rpc`, or `esplora`. For remote signet work, setting it explicitly avoids ambiguity.
- `GNS_EXPECT_CHAIN` defaults to `signet` in the apps, but setting it explicitly makes intent obvious.
- `GNS_LAUNCH_HEIGHT` is required in RPC mode if no snapshot exists yet.
- `GNS_LAUNCH_HEIGHT` is also required in Esplora mode if no snapshot exists yet.
- `GNS_SNAPSHOT_PATH` is optional. If unset, each app uses a default file under `.data/`.
- Only set one remote source at a time. If `GNS_BITCOIN_RPC_URL` and `GNS_ESPLORA_BASE_URL` are both set, startup will fail.

## Check The Remote RPC First

Before starting the resolver or trying claims, sanity-check the remote endpoint:

```bash
npm run dev:cli -- check-rpc --expected-chain signet
```

Or pass credentials explicitly:

```bash
npm run dev:cli -- check-rpc \
  --rpc-url https://your-remote-signet-node.example/rpc \
  --rpc-username bitcoinrpc \
  --rpc-password your-rpc-password \
  --expected-chain signet
```

Expected output includes:

- `kind: "gns-rpc-check-result"`
- `chain: "signet"`
- `blocks`
- `headers`
- `bestblockhash`

If this fails, fix the RPC endpoint first before moving on to resolver sync or transaction broadcast.

## Start The Indexer Snapshot Pass

```bash
npm run dev:indexer
```

Expected output includes:

- `source: "rpc"`
- `syncMode: "rpc-oneshot"`
- `expectedChain: "signet"`
- `rpcChainInfo.chain: "signet"`

If the RPC endpoint points to the wrong network, startup will fail fast with a chain-mismatch error.

## Start The Resolver

```bash
npm run dev:resolver
```

Resolver health:

```bash
curl -s http://127.0.0.1:8787/health
```

If you override `GNS_RESOLVER_PORT`, use that port in the health URL instead.

Expected health fields in RPC mode:

- `source: "rpc"`
- `syncMode: "rpc-polling"` or `rpc-oneshot`
- `expectedChain: "signet"`
- `rpcChainInfo.chain: "signet"`
- `rpcStatus.nextHeight`

## Snapshot Behavior

In RPC mode:

- the app saves an index snapshot to disk
- on restart it attempts to restore from that snapshot
- it verifies the saved head block hash against Bitcoin Core
- if the saved head is no longer on the active chain, it discards the snapshot state and rebuilds from `GNS_LAUNCH_HEIGHT`

Current prototype limitation:

- reorg handling is `detect and rebuild`, not selective rollback

## Useful Overrides

You can cap the sync range for debugging:

```bash
export GNS_RPC_END_HEIGHT="200"
```

`GNS_RPC_END_HEIGHT` currently caps both RPC and Esplora sync windows in the prototype.

You can change the resolver polling cadence:

```bash
export GNS_RPC_POLL_INTERVAL_MS="5000"
```

If `3000` or `8787` is already taken on your machine, move both apps together:

```bash
export GNS_RESOLVER_PORT="8788"
export GNS_WEB_PORT="3001"
```
