#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/deploy-vps.sh <user@host> [ssh-key-path]

Examples:
  ./scripts/deploy-vps.sh root@example.com ~/.ssh/your_key

This script:
  - rsyncs the current repo to /opt/ont/app
  - installs npm dependencies on the server
  - by default, preserves the current launch height and snapshot
  - restarts ont-resolver and ont-web
  - prints local health checks from the VPS

Environment:
  ONT_SSH_TARGET                   Default SSH target when the first argument is omitted.
  ONT_SSH_KEY                      Optional SSH key path when the second argument is omitted.
  ONT_DEPLOY_REFRESH_LAUNCH_HEIGHT  Set to 1 to refresh ONT_LAUNCH_HEIGHT from the configured RPC tip and clear the configured snapshot. Default: 0
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
REFRESH_LAUNCH_HEIGHT="${ONT_DEPLOY_REFRESH_LAUNCH_HEIGHT:-0}"

echo "Deploying to $REMOTE"

RELEASE_DIR=$(ssh "${SSH_ARGS[@]}" "$REMOTE" 'install -d /opt/ont/releases && mktemp -d /opt/ont/releases/public-XXXXXX')

rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.data' \
  --exclude '.DS_Store' \
  -e "ssh ${SSH_ARGS[*]}" \
  "$ROOT_DIR/" \
  "$REMOTE:${RELEASE_DIR}/"

ssh "${SSH_ARGS[@]}" "$REMOTE" "RELEASE_DIR='$RELEASE_DIR' REFRESH_LAUNCH_HEIGHT='$REFRESH_LAUNCH_HEIGHT' bash -s" <<'EOF'
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

LOCK_PATH=/var/lock/ont-app-deploy.lock
echo "Waiting for deploy lock: $LOCK_PATH"
exec 9>"$LOCK_PATH"
flock 9

if [[ -f /etc/ont/ont.env ]]; then
  upsert_env /etc/ont/ont.env ONT_WEB_PRIVATE_BATCH_SMOKE_STATUS_PATH /var/lib/ont/private-batch-smoke-summary.json
  upsert_env /etc/ont/ont.env ONT_WEB_PRIVATE_AUCTION_SMOKE_STATUS_PATH /var/lib/ont/private-auction-smoke-summary.json
fi
if [[ -f /etc/ont/ont-domain.env ]]; then
  upsert_env /etc/ont/ont-domain.env ONT_WEB_PRIVATE_DEMO_BASE_PATH /ont-private
  upsert_env /etc/ont/ont-domain.env ONT_WEB_PRIVATE_BATCH_SMOKE_STATUS_PATH /var/lib/ont/private-batch-smoke-summary.json
  upsert_env /etc/ont/ont-domain.env ONT_WEB_PRIVATE_AUCTION_SMOKE_STATUS_PATH /var/lib/ont/private-auction-smoke-summary.json
fi

install -d /opt/ont/app
rsync -a --delete "${RELEASE_DIR}/" /opt/ont/app/
chown -R ont:ont /opt/ont/app
su -s /bin/bash ont -c 'cd /opt/ont/app && npm ci --no-audit --no-fund'

if [[ -f /etc/bitcoin-private-signet.conf ]]; then
  install -m 755 /opt/ont/app/scripts/private-signet-auto-mine.sh /usr/local/bin/ont-private-signet-auto-mine
  cat >/etc/default/ont-private-signet-auto-mine <<'ENVFILE'
ONT_PRIVATE_SIGNET_AUTO_MINE_INTERVAL_SECONDS=30
ENVFILE
  chown root:root /etc/default/ont-private-signet-auto-mine
  chmod 644 /etc/default/ont-private-signet-auto-mine

  cat >/etc/systemd/system/ont-private-signet-auto-mine.service <<'SERVICE'
[Unit]
Description=Open Name Tags private signet auto-miner
After=bitcoind-private-signet.service
Requires=bitcoind-private-signet.service

[Service]
User=bitcoin
Group=bitcoin
EnvironmentFile=-/etc/default/ont-private-signet-auto-mine
ExecStart=/usr/local/bin/ont-private-signet-auto-mine
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICE

  systemctl daemon-reload
  systemctl enable --now ont-private-signet-auto-mine.service
  systemctl restart ont-private-signet-auto-mine.service
fi

if [[ "${REFRESH_LAUNCH_HEIGHT:-0}" != "0" ]]; then
  SOURCE_MODE=$(env_value ONT_SOURCE_MODE /etc/ont/ont.env)
  RPC_URL=$(env_value ONT_BITCOIN_RPC_URL /etc/ont/ont.env)
  RPC_USERNAME=$(env_value ONT_BITCOIN_RPC_USERNAME /etc/ont/ont.env)
  RPC_PASSWORD=$(env_value ONT_BITCOIN_RPC_PASSWORD /etc/ont/ont.env)
  SNAPSHOT_PATH=$(env_value ONT_SNAPSHOT_PATH /etc/ont/ont.env)

  if [[ "$SOURCE_MODE" != "rpc" || -z "$RPC_URL" ]]; then
    echo "Refusing to refresh launch height without rpc mode and ONT_BITCOIN_RPC_URL" >&2
    exit 1
  fi

  CURRENT_BLOCKS=$(python3 - "$RPC_URL" "$RPC_USERNAME" "$RPC_PASSWORD" <<'PY'
import base64
import json
import sys
import urllib.request

url = sys.argv[1]
username = sys.argv[2]
password = sys.argv[3]
request = urllib.request.Request(
    url,
    data=json.dumps({
        "jsonrpc": "1.0",
        "id": "ont-deploy",
        "method": "getblockcount",
        "params": []
    }).encode("utf-8"),
    headers={"content-type": "application/json"}
)

if username:
    token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
    request.add_header("authorization", f"Basic {token}")

with urllib.request.urlopen(request, timeout=30) as response:
    payload = json.load(response)

if payload.get("error") is not None:
    raise SystemExit(f"RPC error while refreshing launch height: {payload['error']}")

print(payload["result"])
PY
)
  awk -v h="$CURRENT_BLOCKS" '
  BEGIN {FS=OFS="="}
  /^ONT_LAUNCH_HEIGHT=/ {$2=h; found=1}
  {print}
  END {
    if (!found) {
      print "ONT_LAUNCH_HEIGHT=" h
    }
  }
  ' /etc/ont/ont.env >/etc/ont/ont.env.new
  mv /etc/ont/ont.env.new /etc/ont/ont.env
  chown root:ont /etc/ont/ont.env
  chmod 640 /etc/ont/ont.env
  if [[ -z "$SNAPSHOT_PATH" ]]; then
    SNAPSHOT_PATH=/var/lib/ont/resolver-snapshot.json
  fi
  rm -f "$SNAPSHOT_PATH"
fi
systemctl restart ont-resolver.service ont-web.service
if systemctl list-unit-files ont-domain-web.service >/dev/null 2>&1; then
  systemctl restart ont-domain-web.service
fi

RESOLVER_PORT=$(env_value ONT_RESOLVER_PORT /etc/ont/ont.env)
WEB_PORT=$(env_value ONT_WEB_PORT /etc/ont/ont.env)
WEB_BASE_PATH=$(env_value ONT_WEB_BASE_PATH /etc/ont/ont.env)
if [[ -z "$WEB_BASE_PATH" || "$WEB_BASE_PATH" == "/" ]]; then
  WEB_BASE_PATH=""
fi
if [[ -z "$RESOLVER_PORT" ]]; then
  RESOLVER_PORT=8787
fi
if [[ -z "$WEB_PORT" ]]; then
  WEB_PORT=3000
fi

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
  return 1
}

wait_for_http "http://127.0.0.1:${RESOLVER_PORT}/health" "resolver health" 45
wait_for_http "http://127.0.0.1:${WEB_PORT}${WEB_BASE_PATH}/api/health" "web health" 20

echo
echo "[resolver service]"
systemctl --no-pager --full status ont-resolver.service | sed -n '1,40p'
echo
echo "[web service]"
systemctl --no-pager --full status ont-web.service | sed -n '1,40p'
if systemctl list-unit-files ont-domain-web.service >/dev/null 2>&1; then
  echo
  echo "[domain web service]"
  systemctl --no-pager --full status ont-domain-web.service | sed -n '1,40p'
fi
EOF

echo
echo "Deployment complete."
