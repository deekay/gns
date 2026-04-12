#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/deploy-private-signet-vps.sh <user@host> [ssh-key-path]

Examples:
  ./scripts/deploy-private-signet-vps.sh root@example.com ~/.ssh/your_key

Environment:
  GNS_SSH_TARGET  Default SSH target when the first argument is omitted.
  GNS_SSH_KEY     Optional SSH key path when the second argument is omitted.
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

REMOTE="${1:-${GNS_SSH_TARGET:-}}"
SSH_KEY_PATH="${2:-${GNS_SSH_KEY:-}}"
ELECTRUM_PORT="${GNS_PRIVATE_SIGNET_ELECTRUM_PORT:-50001}"
PUBLIC_HOST="${REMOTE#*@}"

if [[ -z "$REMOTE" ]]; then
  echo "Missing SSH target. Pass <user@host> or set GNS_SSH_TARGET." >&2
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

echo "Deploying private signet services to $REMOTE"

RELEASE_DIR=$(ssh "${SSH_ARGS[@]}" "$REMOTE" 'install -d /opt/gns/releases && mktemp -d /opt/gns/releases/private-XXXXXX')

rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.data' \
  --exclude '.DS_Store' \
  -e "ssh ${SSH_ARGS[*]}" \
  "$ROOT_DIR/" \
  "$REMOTE:${RELEASE_DIR}/"

ssh "${SSH_ARGS[@]}" "$REMOTE" "RELEASE_DIR='$RELEASE_DIR' ELECTRUM_PORT='$ELECTRUM_PORT' PUBLIC_HOST='$PUBLIC_HOST' bash -s" <<'EOF'
set -euo pipefail

env_value() {
  local primary="$1"
  local legacy="${3:+$2}"
  local file="${3:-$2}"
  local value

  value=$(awk -F= -v key="$primary" '$1 == key {sub(/^[^=]*=/, ""); print; found=1} END {if (!found) exit 1}' "$file" 2>/dev/null | tail -n 1) || true
  if [[ -n "${value:-}" ]]; then
    printf '%s\n' "$value"
    return
  fi

  if [[ -n "${legacy:-}" ]]; then
    value=$(awk -F= -v key="$legacy" '$1 == key {sub(/^[^=]*=/, ""); print; found=1} END {if (!found) exit 1}' "$file" 2>/dev/null | tail -n 1) || true
  fi
  printf '%s\n' "${value:-}"
}

upsert_env() {
  local file="$1"
  local key="$2"
  local value="$3"

  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i "s#^${key}=.*#${key}=${value}#" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >>"$file"
  fi
}

cleanup() {
  rm -rf "${RELEASE_DIR:?}"
}

trap cleanup EXIT

LOCK_PATH=/var/lock/gns-app-deploy.lock
echo "Waiting for deploy lock: $LOCK_PATH"
exec 9>"$LOCK_PATH"
flock 9

install -d /opt/gns/app
rsync -a --delete "${RELEASE_DIR}/" /opt/gns/app/
chown -R gns:gns /opt/gns/app
su -s /bin/bash gns -c 'cd /opt/gns/app && npm ci --no-audit --no-fund'

if [[ -f /etc/bitcoin-private-signet.conf ]]; then
  install -m 755 /opt/gns/app/scripts/private-signet-auto-mine.sh /usr/local/bin/gns-private-signet-auto-mine
  install -m 755 /opt/gns/app/scripts/install-private-signet-electrum.sh /usr/local/bin/install-private-signet-electrum
  cat >/etc/default/gns-private-signet-auto-mine <<'ENVFILE'
GNS_PRIVATE_SIGNET_AUTO_MINE_INTERVAL_SECONDS=30
ENVFILE
  chown root:root /etc/default/gns-private-signet-auto-mine
  chmod 644 /etc/default/gns-private-signet-auto-mine

  cat >/etc/systemd/system/gns-private-signet-auto-mine.service <<'SERVICE'
[Unit]
Description=Global Name System private signet auto-miner
After=bitcoind-private-signet.service
Requires=bitcoind-private-signet.service

[Service]
User=bitcoin
Group=bitcoin
EnvironmentFile=-/etc/default/gns-private-signet-auto-mine
ExecStart=/usr/local/bin/gns-private-signet-auto-mine
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICE

  systemctl daemon-reload
  systemctl enable --now gns-private-signet-auto-mine.service
  systemctl restart gns-private-signet-auto-mine.service
  GNS_PRIVATE_SIGNET_ELECTRUM_PORT="${ELECTRUM_PORT}" /usr/local/bin/install-private-signet-electrum

  if [[ -f /etc/gns/gns-private.env ]]; then
    upsert_env /etc/gns/gns-private.env GNS_EXPERIMENTAL_AUCTION_FIXTURE_DIR /opt/gns/app/fixtures/auction/private-signet-lab
    upsert_env /etc/gns/gns-private.env GNS_EXPERIMENTAL_AUCTION_NO_BID_RELEASE_BLOCKS 64
    upsert_env /etc/gns/gns-private.env GNS_WEB_PRIVATE_SIGNET_ELECTRUM_ENDPOINT "${PUBLIC_HOST}:${ELECTRUM_PORT}:t"
    upsert_env /etc/gns/gns-private.env GNS_WEB_PRIVATE_BATCH_SMOKE_STATUS_PATH /var/lib/gns/private-batch-smoke-summary.json
    upsert_env /etc/gns/gns-private.env GNS_WEB_PRIVATE_AUCTION_SMOKE_STATUS_PATH /var/lib/gns/private-auction-smoke-summary.json
  fi
fi

systemctl restart gns-private-resolver.service gns-private-web.service

WEB_PORT=$(env_value GNS_WEB_PORT /etc/gns/gns-private.env)
RESOLVER_PORT=$(env_value GNS_RESOLVER_PORT /etc/gns/gns-private.env)
WEB_BASE_PATH=$(env_value GNS_WEB_BASE_PATH /etc/gns/gns-private.env)

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

wait_for_http "http://127.0.0.1:${RESOLVER_PORT}/health" "private resolver health" 45
wait_for_http "http://127.0.0.1:${WEB_PORT}${WEB_BASE_PATH}/api/health" "private web health" 30
EOF

echo
echo "Private signet deployment complete."
