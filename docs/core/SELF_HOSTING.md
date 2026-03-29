# Self-Hosting

This is the easiest path for running your own Global Name System stack without depending on the hosted website or resolver.

The Compose stack in this repo gives you:

- your own `gns-web`
- your own `gns-resolver`
- optional one-shot `gns-indexer`

It does **not** force you to run a Bitcoin node on day one. The quickest path uses the bundled fixture chain so you can verify the product locally first, then switch to your own Bitcoin RPC or an Esplora backend later.

## What “Run Your Own Stack” Means Here

There are three progressively more sovereign ways to use GNS:

1. run the hosted website
2. run your own GNS website + resolver
3. run your own GNS website + resolver + Bitcoin backend

This guide covers `2` directly and makes `3` straightforward by letting you point the stack at your own node.

## Quick Start

From the repo root:

```bash
cp .env.example .env
docker compose up --build
```

Then open:

```text
http://127.0.0.1:3000
```

That default mode uses the bundled fixture chain, so you get:

- your own website
- your own resolver state
- your own local detail/explorer experience
- no dependency on the hosted product

## Services

### `resolver`

This is the long-running read API and embedded indexer.

It serves:

- name lookup
- pending commits
- recent activity
- provenance detail
- signed value records

### `web`

This is the browser-facing product surface.

It serves:

- lookup
- explore
- claim prep
- transfer prep
- offline architect download

### `indexer`

This is optional and disabled by default.

Use it when you want a one-shot indexed dump:

```bash
docker compose run --rm indexer
```

## Switching To A Live Chain

The easiest next step after the fixture demo is to point the stack at your own Bitcoin Core node.

Edit `.env` and replace the fixture settings with:

```bash
GNS_SOURCE_MODE=rpc
GNS_EXPECT_CHAIN=signet
GNS_BITCOIN_RPC_URL=http://host.docker.internal:38332
GNS_BITCOIN_RPC_USERNAME=gnsrpc
GNS_BITCOIN_RPC_PASSWORD=replace-me
GNS_WEB_NETWORK_LABEL=Self-Hosted Signet
```

Then restart:

```bash
docker compose up --build
```

Notes:

- On macOS and Windows Docker Desktop, `host.docker.internal` is usually the easiest way to reach a node running on your host machine.
- If your Bitcoin node is another container, use its service name instead.
- If you switch chain backends or want to rebuild state from scratch, reset the local volume:

```bash
docker compose down -v
```

## Using Esplora Instead

If you do not want to expose Bitcoin RPC, you can point the resolver at an Esplora-compatible endpoint:

```bash
GNS_SOURCE_MODE=esplora
GNS_EXPECT_CHAIN=signet
GNS_ESPLORA_BASE_URL=https://blockstream.info/signet/api
GNS_WEB_NETWORK_LABEL=Self-Hosted Signet (Esplora)
```

This is useful for convenience, but it is less sovereign than using your own Bitcoin node.

## Launch Height Handling

In live-chain modes, the container entrypoint will automatically set `GNS_LAUNCH_HEIGHT` from your RPC or Esplora backend if:

- `GNS_LAUNCH_HEIGHT` is unset, and
- no local snapshot exists yet

That makes first startup much easier. The resolver starts from the current tip by default instead of replaying the entire history unless you explicitly choose otherwise.

## Persisted Data

Compose stores resolver/indexer state in the named Docker volume `gns_data`.

That includes:

- resolver snapshot
- value-record store
- optional one-shot indexer snapshot

## Trust Model

Running your own stack changes the trust story:

- you no longer depend on the hosted website for browsing or prep
- you no longer depend on the hosted resolver for ownership state
- if you also use your own Bitcoin backend, the entire read path becomes yours

For high-value claim preparation, the strongest path is still the offline architect plus your own signer.

## What This Does Not Package Yet

This Compose stack does **not** yet include:

- a bundled Bitcoin Core container
- a bundled private signet demo network
- multi-resolver publish
- production reverse-proxy / TLS setup

If you want the full VPS layout, including running the node yourself on a server you control, use:

- [VPS_SETUP.md](../operators/VPS_SETUP.md)

## Useful Commands

Start:

```bash
docker compose up --build
```

Stop:

```bash
docker compose down
```

Reset state:

```bash
docker compose down -v
```

One-shot indexer dump:

```bash
docker compose run --rm indexer
```
