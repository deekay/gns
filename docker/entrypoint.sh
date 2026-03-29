#!/usr/bin/env bash

set -euo pipefail

APP_ROOT=/app
SERVICE="${1:-web}"

fetch_launch_height_from_rpc() {
  node --input-type=module - "$GNS_BITCOIN_RPC_URL" "${GNS_BITCOIN_RPC_USERNAME:-}" "${GNS_BITCOIN_RPC_PASSWORD:-}" <<'NODE'
const [url, username, password] = process.argv.slice(2);

const headers = { "content-type": "application/json" };
if (username) {
  headers.authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

const response = await fetch(url, {
  method: "POST",
  headers,
  body: JSON.stringify({
    jsonrpc: "1.0",
    id: "gns-container",
    method: "getblockcount",
    params: []
  })
});

if (!response.ok) {
  throw new Error(`RPC request failed with status ${response.status}`);
}

const payload = await response.json();
if (payload.error) {
  throw new Error(`RPC returned error: ${JSON.stringify(payload.error)}`);
}

process.stdout.write(String(payload.result));
NODE
}

fetch_launch_height_from_esplora() {
  node --input-type=module - "$GNS_ESPLORA_BASE_URL" <<'NODE'
const [baseUrl] = process.argv.slice(2);
const response = await fetch(`${baseUrl.replace(/\/$/, "")}/blocks/tip/height`);
if (!response.ok) {
  throw new Error(`Esplora request failed with status ${response.status}`);
}

process.stdout.write((await response.text()).trim());
NODE
}

ensure_launch_height() {
  local snapshot_path="$1"
  local source_mode="${GNS_SOURCE_MODE:-fixture}"

  mkdir -p "$(dirname "$snapshot_path")"

  if [[ -n "${GNS_LAUNCH_HEIGHT:-}" || -f "$snapshot_path" || "$source_mode" == "fixture" ]]; then
    return
  fi

  if [[ "$source_mode" == "rpc" ]]; then
    if [[ -z "${GNS_BITCOIN_RPC_URL:-}" ]]; then
      echo "GNS_BITCOIN_RPC_URL is required when GNS_SOURCE_MODE=rpc and GNS_LAUNCH_HEIGHT is unset." >&2
      exit 1
    fi
    export GNS_LAUNCH_HEIGHT
    GNS_LAUNCH_HEIGHT="$(fetch_launch_height_from_rpc)"
    echo "Resolved GNS_LAUNCH_HEIGHT=${GNS_LAUNCH_HEIGHT} from Bitcoin RPC."
    return
  fi

  if [[ "$source_mode" == "esplora" ]]; then
    if [[ -z "${GNS_ESPLORA_BASE_URL:-}" ]]; then
      echo "GNS_ESPLORA_BASE_URL is required when GNS_SOURCE_MODE=esplora and GNS_LAUNCH_HEIGHT is unset." >&2
      exit 1
    fi
    export GNS_LAUNCH_HEIGHT
    GNS_LAUNCH_HEIGHT="$(fetch_launch_height_from_esplora)"
    echo "Resolved GNS_LAUNCH_HEIGHT=${GNS_LAUNCH_HEIGHT} from Esplora."
    return
  fi
}

case "$SERVICE" in
  resolver)
    ensure_launch_height "${GNS_SNAPSHOT_PATH:-${APP_ROOT}/.data/resolver-snapshot.json}"
    exec node "${APP_ROOT}/apps/resolver/dist/apps/resolver/src/index.js"
    ;;
  web)
    exec node "${APP_ROOT}/apps/web/dist/apps/web/src/index.js"
    ;;
  indexer)
    ensure_launch_height "${GNS_SNAPSHOT_PATH:-${APP_ROOT}/.data/indexer-snapshot.json}"
    exec node "${APP_ROOT}/apps/indexer/dist/apps/indexer/src/index.js"
    ;;
  bash|sh)
    exec "$SERVICE"
    ;;
  *)
    exec "$@"
    ;;
esac
