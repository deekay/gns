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
  - rsyncs the current repo to /opt/gns/app
  - installs npm dependencies on the server
  - by default, preserves the current launch height and snapshot
  - restarts gns-resolver and gns-web
  - prints local health checks from the VPS

Environment:
  GNS_SSH_TARGET                   Default SSH target when the first argument is omitted.
  GNS_SSH_KEY                      Optional SSH key path when the second argument is omitted.
  GNS_DEPLOY_REFRESH_LAUNCH_HEIGHT  Set to 1 to refresh GNS_LAUNCH_HEIGHT from the configured RPC tip and clear the configured snapshot. Default: 0
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
REFRESH_LAUNCH_HEIGHT="${GNS_DEPLOY_REFRESH_LAUNCH_HEIGHT:-0}"

echo "Deploying to $REMOTE"

RELEASE_DIR=$(ssh "${SSH_ARGS[@]}" "$REMOTE" 'install -d /opt/gns/releases && mktemp -d /opt/gns/releases/public-XXXXXX')

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
if [[ "${REFRESH_LAUNCH_HEIGHT:-0}" != "0" ]]; then
  SOURCE_MODE=$(env_value GNS_SOURCE_MODE /etc/gns/gns.env)
  RPC_URL=$(env_value GNS_BITCOIN_RPC_URL /etc/gns/gns.env)
  RPC_USERNAME=$(env_value GNS_BITCOIN_RPC_USERNAME /etc/gns/gns.env)
  RPC_PASSWORD=$(env_value GNS_BITCOIN_RPC_PASSWORD /etc/gns/gns.env)
  SNAPSHOT_PATH=$(env_value GNS_SNAPSHOT_PATH /etc/gns/gns.env)

  if [[ "$SOURCE_MODE" != "rpc" || -z "$RPC_URL" ]]; then
    echo "Refusing to refresh launch height without rpc mode and GNS_BITCOIN_RPC_URL" >&2
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
        "id": "gns-deploy",
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
  /^GNS_LAUNCH_HEIGHT=/ {$2=h; found=1}
  {print}
  END {
    if (!found) {
      print "GNS_LAUNCH_HEIGHT=" h
    }
  }
  ' /etc/gns/gns.env >/etc/gns/gns.env.new
  mv /etc/gns/gns.env.new /etc/gns/gns.env
  chown root:gns /etc/gns/gns.env
  chmod 640 /etc/gns/gns.env
  if [[ -z "$SNAPSHOT_PATH" ]]; then
    SNAPSHOT_PATH=/var/lib/gns/resolver-snapshot.json
  fi
  rm -f "$SNAPSHOT_PATH"
fi
systemctl restart gns-resolver.service gns-web.service
if systemctl list-unit-files gns-domain-web.service >/dev/null 2>&1; then
  systemctl restart gns-domain-web.service
fi

RESOLVER_PORT=$(env_value GNS_RESOLVER_PORT /etc/gns/gns.env)
WEB_PORT=$(env_value GNS_WEB_PORT /etc/gns/gns.env)
WEB_BASE_PATH=$(env_value GNS_WEB_BASE_PATH /etc/gns/gns.env)
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
systemctl --no-pager --full status gns-resolver.service | sed -n '1,40p'
echo
echo "[web service]"
systemctl --no-pager --full status gns-web.service | sed -n '1,40p'
if systemctl list-unit-files gns-domain-web.service >/dev/null 2>&1; then
  echo
  echo "[domain web service]"
  systemctl --no-pager --full status gns-domain-web.service | sed -n '1,40p'
fi
EOF

echo
echo "Deployment complete."
