#!/usr/bin/env bash

set -euo pipefail

DEFAULT_PREFIX=ont

CONF_PATH="${ONT_PRIVATE_SIGNET_CONF:-/etc/bitcoin-private-signet.conf}"
DATA_DIR="${ONT_PRIVATE_SIGNET_DATADIR:-/var/lib/bitcoind-private-signet}"
BITCOIN_CLI="${ONT_PRIVATE_SIGNET_BITCOIN_CLI:-/usr/local/bin/bitcoin-cli}"
MINE_COMMAND="${ONT_PRIVATE_SIGNET_MINE_COMMAND:-/usr/local/bin/${DEFAULT_PREFIX}-private-signet-mine}"
INTERVAL_SECONDS="${ONT_PRIVATE_SIGNET_AUTO_MINE_INTERVAL_SECONDS:-30}"
HEARTBEAT_SECONDS="${ONT_PRIVATE_SIGNET_AUTO_MINE_HEARTBEAT_SECONDS:-600}"

if ! [[ "$INTERVAL_SECONDS" =~ ^[0-9]+$ ]] || [[ "$INTERVAL_SECONDS" -lt 1 ]]; then
  echo "ONT_PRIVATE_SIGNET_AUTO_MINE_INTERVAL_SECONDS must be a positive integer." >&2
  exit 1
fi

if ! [[ "$HEARTBEAT_SECONDS" =~ ^[0-9]+$ ]] || [[ "$HEARTBEAT_SECONDS" -lt 1 ]]; then
  echo "ONT_PRIVATE_SIGNET_AUTO_MINE_HEARTBEAT_SECONDS must be a positive integer." >&2
  exit 1
fi

bitcoin_cli() {
  "$BITCOIN_CLI" -conf="$CONF_PATH" -datadir="$DATA_DIR" "$@"
}

last_mined_at="$(date +%s)"

while true; do
  if bitcoin_cli getblockchaininfo >/dev/null 2>&1; then
    MEMPOOL_SIZE="$(bitcoin_cli getmempoolinfo | jq -r '.size // 0' 2>/dev/null || echo 0)"
    NOW="$(date +%s)"
    if [[ "$MEMPOOL_SIZE" =~ ^[0-9]+$ ]] && [[ "$MEMPOOL_SIZE" -gt 0 ]]; then
      echo "Auto-mining 1 block for ${MEMPOOL_SIZE} pending transaction(s)." >&2
      "$MINE_COMMAND" 1 >/dev/null
      last_mined_at="$NOW"
    elif [[ "$((NOW - last_mined_at))" -ge "$HEARTBEAT_SECONDS" ]]; then
      echo "Auto-mining 1 heartbeat block after ${HEARTBEAT_SECONDS}s without a block." >&2
      "$MINE_COMMAND" 1 >/dev/null
      last_mined_at="$NOW"
    fi
  fi

  sleep "$INTERVAL_SECONDS"
done
