#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/bootstrap-gns-domain.sh <user@host> [ssh-key-path] [domain]

Examples:
  ./scripts/bootstrap-gns-domain.sh root@example.com ~/.ssh/your_key globalnamesystem.org

Environment:
  GNS_SSH_TARGET  Default SSH target when the first argument is omitted.
  GNS_SSH_KEY     Optional SSH key path when the second argument is omitted.

This script:
  - installs Caddy on the VPS
  - creates a dedicated root-host Global Name System web service on port 3002
  - configures Caddy for globalnamesystem.org and www.globalnamesystem.org
  - opens ports 80 and 443 in UFW
  - keeps the existing /gns path-based deployment intact

Notes:
  - DNS must point the domain at the VPS before HTTPS will succeed.
  - The underlying resolver and protocol identifiers remain GNS for compatibility.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -gt 3 ]]; then
  usage
  exit 1
fi

REMOTE="${1:-${GNS_SSH_TARGET:-}}"
SSH_KEY_PATH="${2:-${GNS_SSH_KEY:-}}"
DOMAIN="${3:-globalnamesystem.org}"

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

echo "Configuring ${DOMAIN} on ${REMOTE}"

ssh "${SSH_ARGS[@]}" "$REMOTE" "DOMAIN='$DOMAIN' bash -s" <<'EOF'
set -euo pipefail

DOMAIN="${DOMAIN}"
WWW_DOMAIN="www.${DOMAIN}"

env_value() {
  local primary="$1"
  local legacy="${2:-}"
  local value

  value=$(sed -n "s/^${primary}=//p" /etc/gns/gns.env | tail -n 1)
  if [[ -n "${value:-}" ]]; then
    printf '%s\n' "$value"
    return
  fi

  if [[ -n "$legacy" ]]; then
    sed -n "s/^${legacy}=//p" /etc/gns/gns.env | tail -n 1
  fi
}

RESOLVER_PORT="$(env_value GNS_RESOLVER_PORT)"
NETWORK_LABEL="$(env_value GNS_WEB_NETWORK_LABEL)"
SHOW_LIVE_SMOKE="$(env_value GNS_WEB_SHOW_LIVE_SMOKE)"
FUND_COMMAND="$(env_value GNS_WEB_PRIVATE_SIGNET_FUNDING_COMMAND)"
FUND_ENABLED="$(env_value GNS_WEB_PRIVATE_SIGNET_FUNDING_ENABLED)"
FUND_AMOUNT_SATS="$(env_value GNS_WEB_PRIVATE_SIGNET_FUNDING_AMOUNT_SATS)"
FUND_COOLDOWN_MS="$(env_value GNS_WEB_PRIVATE_SIGNET_FUNDING_COOLDOWN_MS)"
ELECTRUM_ENDPOINT="$(sed -n 's/^GNS_WEB_PRIVATE_SIGNET_ELECTRUM_ENDPOINT=//p' /etc/gns/gns-private.env | tail -n 1)"

RESOLVER_PORT="${RESOLVER_PORT:-8787}"
NETWORK_LABEL="${NETWORK_LABEL:-Private Signet Demo}"
SHOW_LIVE_SMOKE="${SHOW_LIVE_SMOKE:-false}"
FUND_COMMAND="${FUND_COMMAND:-/usr/local/bin/gns-private-signet-fund}"
FUND_ENABLED="${FUND_ENABLED:-true}"
FUND_AMOUNT_SATS="${FUND_AMOUNT_SATS:-1000000}"
FUND_COOLDOWN_MS="${FUND_COOLDOWN_MS:-30000}"
ELECTRUM_ENDPOINT="${ELECTRUM_ENDPOINT:-${DOMAIN}:50001:t}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y caddy

cat >/etc/gns/gns-domain.env <<ENVFILE
GNS_WEB_PORT=3002
GNS_WEB_BASE_PATH=
GNS_WEB_RESOLVER_URL=http://127.0.0.1:${RESOLVER_PORT}
GNS_WEB_NETWORK_LABEL=${NETWORK_LABEL}
GNS_WEB_SHOW_LIVE_SMOKE=${SHOW_LIVE_SMOKE}
GNS_WEB_PRIVATE_DEMO_BASE_PATH=/gns-private
GNS_WEB_PRIVATE_BATCH_SMOKE_STATUS_PATH=/var/lib/gns/private-batch-smoke-summary.json
GNS_WEB_PRIVATE_AUCTION_SMOKE_STATUS_PATH=/var/lib/gns/private-auction-smoke-summary.json
GNS_WEB_PRIVATE_SIGNET_FUNDING_COMMAND=${FUND_COMMAND}
GNS_WEB_PRIVATE_SIGNET_FUNDING_ENABLED=${FUND_ENABLED}
GNS_WEB_PRIVATE_SIGNET_FUNDING_AMOUNT_SATS=${FUND_AMOUNT_SATS}
GNS_WEB_PRIVATE_SIGNET_FUNDING_COOLDOWN_MS=${FUND_COOLDOWN_MS}
GNS_WEB_PRIVATE_SIGNET_ELECTRUM_ENDPOINT=${ELECTRUM_ENDPOINT}
ENVFILE

chown root:gns /etc/gns/gns-domain.env
chmod 640 /etc/gns/gns-domain.env

cat >/etc/systemd/system/gns-domain-web.service <<'SERVICE'
[Unit]
Description=Global Name System web service (root domain)
After=network-online.target gns-resolver.service
Wants=network-online.target
Requires=gns-resolver.service

[Service]
User=gns
Group=gns
WorkingDirectory=/opt/gns/app
EnvironmentFile=/etc/gns/gns-domain.env
ExecStart=/usr/bin/npm run dev:web
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICE

cat >/etc/caddy/Caddyfile <<CADDYFILE
${DOMAIN} {
  encode zstd gzip
  @private_demo path /gns-private /gns-private/*
  handle @private_demo {
    reverse_proxy 127.0.0.1:3001
  }

  handle {
    reverse_proxy 127.0.0.1:3002
  }
}

${WWW_DOMAIN} {
  redir https://${DOMAIN}{uri} permanent
}
CADDYFILE

ufw allow 80/tcp
ufw allow 443/tcp

systemctl daemon-reload
systemctl enable --now gns-domain-web.service
systemctl enable --now caddy.service
systemctl restart gns-domain-web.service
systemctl restart caddy.service

wait_for_http() {
  local url="$1"
  local attempts="${2:-30}"

  for _ in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null; then
      return 0
    fi
    sleep 2
  done

  return 1
}

echo
echo "[gns domain web health]"
wait_for_http http://127.0.0.1:3002/api/health 30
curl -fsS http://127.0.0.1:3002/api/health
echo
echo
echo "[local caddy route check]"
curl -fsS -H "Host: ${DOMAIN}" http://127.0.0.1/api/health || true
echo
echo
echo "If DNS has not been switched yet, HTTPS certificate issuance will complete after the domain points here."
EOF

echo
echo "Global Name System domain bootstrap complete."
