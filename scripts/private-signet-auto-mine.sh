#!/usr/bin/env bash

set -euo pipefail

CONF_PATH="${ONT_PRIVATE_SIGNET_CONF:-/etc/bitcoin-private-signet.conf}"
DATA_DIR="${ONT_PRIVATE_SIGNET_DATADIR:-/var/lib/bitcoind-private-signet}"
BITCOIN_CLI="${ONT_PRIVATE_SIGNET_BITCOIN_CLI:-/usr/local/bin/bitcoin-cli}"
MINE_COMMAND="${ONT_PRIVATE_SIGNET_MINE_COMMAND:-/usr/local/bin/ont-private-signet-mine}"
INTERVAL_SECONDS="${ONT_PRIVATE_SIGNET_AUTO_MINE_INTERVAL_SECONDS:-30}"

if ! [[ "$INTERVAL_SECONDS" =~ ^[0-9]+$ ]] || [[ "$INTERVAL_SECONDS" -lt 1 ]]; then
  echo "ONT_PRIVATE_SIGNET_AUTO_MINE_INTERVAL_SECONDS must be a positive integer." >&2
  exit 1
fi

bitcoin_cli() {
  "$BITCOIN_CLI" -conf="$CONF_PATH" -datadir="$DATA_DIR" "$@"
}

while true; do
  if bitcoin_cli getblockchaininfo >/dev/null 2>&1; then
    MEMPOOL_SIZE="$(bitcoin_cli getmempoolinfo | jq -r '.size // 0' 2>/dev/null || echo 0)"
    if [[ "$MEMPOOL_SIZE" =~ ^[0-9]+$ ]] && [[ "$MEMPOOL_SIZE" -gt 0 ]]; then
      echo "Auto-mining 1 block for ${MEMPOOL_SIZE} pending transaction(s)." >&2
      "$MINE_COMMAND" 1 >/dev/null
    fi
  fi

  sleep "$INTERVAL_SECONDS"
done
