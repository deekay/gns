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

echo "[stop services]"
systemctl stop ont-domain-web.service ont-web.service ont-resolver.service ont-private-web.service ont-private-resolver.service || true
systemctl stop bitcoind-private-signet.service || true

echo
echo "[wipe chain and file snapshots]"
rm -rf /var/lib/bitcoind-private-signet/signet
rm -f /var/lib/bitcoind-private-signet/miner-address.txt
rm -f /var/lib/ont/ont-prod-demo-snapshot.json
rm -f /var/lib/ont/private-signet-resolver-snapshot.json
rm -f /var/lib/ont/private-signet-value-records.json

echo
echo "[wipe database-backed resolver docs]"
if [[ -f /etc/ont/ont.env ]]; then
  ONT_DATABASE_URL=$(awk -F= '/^ONT_DATABASE_URL=/{sub(/^[^=]*=/,""); print; exit}' /etc/ont/ont.env)
  ONT_DATABASE_SCHEMA=$(awk -F= '/^ONT_DATABASE_SCHEMA=/{print $2; exit}' /etc/ont/ont.env)

  if [[ -n "${ONT_DATABASE_URL:-}" ]]; then
    runuser -u ont -- env \
      ONT_DATABASE_URL="${ONT_DATABASE_URL}" \
      ONT_DATABASE_SCHEMA="${ONT_DATABASE_SCHEMA:-public}" \
      bash -lc 'cd /opt/ont/app && node <<'"'"'NODE'"'"'
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
NODE'
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

/usr/local/bin/ont-private-signet-ensure-wallet >/dev/null
CURRENT_BLOCKS=$(/usr/local/bin/bitcoin-cli -conf=/etc/bitcoin-private-signet.conf -datadir=/var/lib/bitcoind-private-signet getblockcount)
if [[ "$CURRENT_BLOCKS" -lt "${BOOTSTRAP_BLOCKS}" ]]; then
  echo
  echo "[mine bootstrap blocks]"
  /usr/local/bin/ont-private-signet-mine "$((BOOTSTRAP_BLOCKS - CURRENT_BLOCKS))"
fi

echo
echo "[restart ont services]"
systemctl restart ont-private-resolver.service ont-private-web.service ont-resolver.service ont-web.service ont-domain-web.service

wait_for_http "http://127.0.0.1:8788/health" "private resolver health" 45
wait_for_http "http://127.0.0.1:3001/ont-private/api/health" "private web health" 30
wait_for_http "http://127.0.0.1:8787/health" "main resolver health" 45
wait_for_http "http://127.0.0.1:3000/ont/api/health" "main web health" 30
wait_for_http "http://127.0.0.1:3002/api/health" "root domain web health" 30
EOF

if [[ "$DELETE_LOCAL" == "1" ]]; then
  echo
  echo "[clear local demo files]"
  osascript -e 'tell application "Sparrow" to quit' >/dev/null 2>&1 || true
  pkill -x Sparrow >/dev/null 2>&1 || true
  rm -rf "$HOME/Downloads/ont-demo"
  rm -f "$HOME/Downloads/ont-claim-moneyball-signer-notes.txt"
  rm -rf "$ROOT_DIR/.data/private-signet-demo"
  rm -f "$HOME/.sparrow/signet/wallets/ont-demo.mv.db"
  rm -f "$HOME/.sparrow/signet/wallets/ont-demo-2.mv.db"
fi

echo
echo "Private signet demo reset complete."
