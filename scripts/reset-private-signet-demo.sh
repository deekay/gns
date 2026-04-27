#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/reset-private-signet-demo.sh <user@host> [ssh-key-path]

Examples:
  ./scripts/reset-private-signet-demo.sh root@example.com ~/.ssh/your_key

Environment:
  ONT_SSH_TARGET                       Default SSH target when the first argument is omitted.
  ONT_SSH_KEY                          Optional SSH key path when the second argument is omitted.
  ONT_PRIVATE_SIGNET_RESET_BLOCKS        Initial blocks to mine after reset. Default: 110
  ONT_PRIVATE_SIGNET_RESET_DELETE_LOCAL  Delete local demo wallets/artifacts too. Default: 1
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -gt 2 ]]; then
  usage
  exit 1
fi

REMOTE="${1:-${ONT_SSH_TARGET:-}}"
SSH_KEY_PATH="${2:-${ONT_SSH_KEY:-}}"
BOOTSTRAP_BLOCKS="${ONT_PRIVATE_SIGNET_RESET_BLOCKS:-110}"
DELETE_LOCAL="${ONT_PRIVATE_SIGNET_RESET_DELETE_LOCAL:-1}"

if [[ -z "$REMOTE" ]]; then
  echo "Missing SSH target. Pass <user@host> or set ONT_SSH_TARGET." >&2
  usage
  exit 1
fi

if [[ -n "$SSH_KEY_PATH" && ! -f "$SSH_KEY_PATH" ]]; then
  echo "SSH key not found: $SSH_KEY_PATH" >&2
  exit 1
fi

SSH_ARGS=(
  -o StrictHostKeyChecking=accept-new
)

if [[ -n "$SSH_KEY_PATH" ]]; then
  SSH_ARGS=(
    -i "$SSH_KEY_PATH"
    -o IdentitiesOnly=yes
    "${SSH_ARGS[@]}"
  )
fi

echo "Resetting private signet demo on $REMOTE"

ssh "${SSH_ARGS[@]}" "$REMOTE" "BOOTSTRAP_BLOCKS='$BOOTSTRAP_BLOCKS' bash -s" <<'EOF'
set -euo pipefail

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-30}"

  echo
  echo "[$label]"
  for _ in $(seq 1 "$attempts"); do
    if curl -fsS "$url"; then
      echo
      return 0
    fi
    sleep 2
  done

  echo "$label did not become healthy in time" >&2
  exit 1
}

wait_for_any_http() {
  local label="$1"
  local attempts="$2"
  shift 2
  local urls=("$@")

  echo
  echo "[$label]"
  for _ in $(seq 1 "$attempts"); do
    for url in "${urls[@]}"; do
      if curl -fsS "$url"; then
        echo
        return 0
      fi
    done
    sleep 2
  done

  echo "$label did not become healthy in time" >&2
  printf 'Tried:\n' >&2
  printf '  %s\n' "${urls[@]}" >&2
  exit 1
}

service_exists() {
  systemctl list-unit-files "$1" >/dev/null 2>&1
}

stop_if_exists() {
  if service_exists "$1"; then
    systemctl stop "$1" || true
  fi
}

restart_if_exists() {
  if service_exists "$1"; then
    systemctl restart "$1"
  fi
}

first_existing_file() {
  for path in "$@"; do
    if [[ -f "$path" ]]; then
      printf '%s\n' "$path"
      return 0
    fi
  done
}

first_existing_dir() {
  for path in "$@"; do
    if [[ -d "$path" ]]; then
      printf '%s\n' "$path"
      return 0
    fi
  done
}

first_existing_command() {
  for path in "$@"; do
    if [[ -x "$path" ]]; then
      printf '%s\n' "$path"
      return 0
    fi
  done
}

echo "[stop services]"
for service in \
  ont-domain-web.service ont-web.service ont-resolver.service ont-private-web.service ont-private-resolver.service \
  ont-private-signet-auto-mine.service
do
  stop_if_exists "$service"
done
systemctl stop bitcoind-private-signet.service || true

echo
echo "[wipe chain and file snapshots]"
rm -rf /var/lib/bitcoind-private-signet/signet
rm -f /var/lib/bitcoind-private-signet/miner-address.txt
rm -f /var/lib/ont/ont-prod-demo-snapshot.json
rm -f /var/lib/ont/private-signet-resolver-snapshot.json
rm -f /var/lib/ont/private-signet-value-records.json
rm -f /var/lib/ont/private-auction-smoke-summary.json

echo
echo "[wipe database-backed resolver docs]"
APP_ENV_FILE="$(first_existing_file /etc/ont/ont.env || true)"
APP_DIR="$(first_existing_dir /opt/ont/app || true)"
APP_USER=ont

if [[ -n "$APP_ENV_FILE" && -n "$APP_DIR" ]]; then
  ONT_DATABASE_URL=$(awk -F= '/^ONT_DATABASE_URL=/{sub(/^[^=]*=/,""); print; exit}' "$APP_ENV_FILE")
  ONT_DATABASE_SCHEMA=$(awk -F= '/^ONT_DATABASE_SCHEMA=/{print $2; exit}' "$APP_ENV_FILE")

  if [[ -n "${ONT_DATABASE_URL:-}" ]]; then
    runuser -u "$APP_USER" -- env \
      ONT_DATABASE_URL="${ONT_DATABASE_URL}" \
      ONT_DATABASE_SCHEMA="${ONT_DATABASE_SCHEMA:-public}" \
      NODE_PATH="$APP_DIR/node_modules" \
      node <<'NODE'
const { Client } = require("pg");

const schema = process.env.ONT_DATABASE_SCHEMA || "public";
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
  throw new Error(`invalid schema name: ${schema}`);
}

(async () => {
  const client = new Client({ connectionString: process.env.ONT_DATABASE_URL });
  await client.connect();
  await client.query(`delete from "${schema}"."ont_documents" where kind = any($1) and document_key = $2`, [
    ["indexer_snapshot", "value_record_store"],
    "resolver"
  ]);
  await client.end();
  console.log("Deleted resolver snapshot/value-store docs from database.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
  fi
fi

echo
echo "[restart node]"
systemctl start bitcoind-private-signet.service
for _ in $(seq 1 60); do
  if /usr/local/bin/bitcoin-cli -conf=/etc/bitcoin-private-signet.conf -datadir=/var/lib/bitcoind-private-signet getblockchaininfo >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

ENSURE_WALLET_CMD="$(first_existing_command /usr/local/bin/ont-private-signet-ensure-wallet)"
MINE_CMD="$(first_existing_command /usr/local/bin/ont-private-signet-mine)"

"$ENSURE_WALLET_CMD" >/dev/null
CURRENT_BLOCKS=$(/usr/local/bin/bitcoin-cli -conf=/etc/bitcoin-private-signet.conf -datadir=/var/lib/bitcoind-private-signet getblockcount)
if [[ "$CURRENT_BLOCKS" -lt "${BOOTSTRAP_BLOCKS}" ]]; then
  echo
  echo "[mine bootstrap blocks]"
  "$MINE_CMD" "$((BOOTSTRAP_BLOCKS - CURRENT_BLOCKS))"
fi

echo
echo "[restart ont services]"
for service in \
  ont-private-resolver.service ont-private-web.service ont-resolver.service ont-web.service ont-domain-web.service \
  ont-private-signet-auto-mine.service
do
  restart_if_exists "$service"
done

wait_for_http "http://127.0.0.1:8788/health" "private resolver health" 45
wait_for_any_http "private web health" 30 \
  "http://127.0.0.1:3001/ont-private/api/health"
wait_for_http "http://127.0.0.1:8787/health" "main resolver health" 45
wait_for_any_http "main web health" 30 \
  "http://127.0.0.1:3000/ont/api/health" \
  "http://127.0.0.1:3000/api/health"
wait_for_http "http://127.0.0.1:3002/api/health" "root domain web health" 30
EOF

if [[ "$DELETE_LOCAL" == "1" ]]; then
  echo
  echo "[clear local demo files]"
  osascript -e 'tell application "Sparrow" to quit' >/dev/null 2>&1 || true
  pkill -x Sparrow >/dev/null 2>&1 || true
  rm -rf "$HOME/Downloads/ont-demo"
  rm -rf "$ROOT_DIR/.data/private-signet-demo"
  rm -f "$HOME/.sparrow/signet/wallets/ont-demo.mv.db"
  rm -f "$HOME/.sparrow/signet/wallets/ont-demo-2.mv.db"
fi

echo
echo "Private signet demo reset complete."
