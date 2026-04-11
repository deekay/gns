#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/bootstrap-vps.sh <user@host> [ssh-key-path]

Examples:
  ./scripts/bootstrap-vps.sh root@example.com ~/.ssh/your_key
  GNS_WEB_PORT=3001 ./scripts/bootstrap-vps.sh root@example.com

Environment:
  GNS_SSH_TARGET        Default SSH target when the first argument is omitted.
  GNS_SSH_KEY           Optional SSH key path when the second argument is omitted.
  GNS_BITCOIN_VERSION   Bitcoin Core version to install. Default: 30.2
  GNS_NODE_MAJOR        NodeSource major version. Default: 22
  GNS_WEB_PORT          Public web port. Default: 3000
  GNS_RESOLVER_PORT     Private resolver port. Default: 8787
  GNS_RPC_PORT          Local Bitcoin RPC port. Default: 38332
  GNS_DB_CACHE_MB       bitcoind dbcache. Default: 450
  GNS_MAX_MEMPOOL_MB    bitcoind maxmempool. Default: 300
  GNS_SWAP_GB           Swap file size in GiB. Default: 2
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

BITCOIN_VERSION="${GNS_BITCOIN_VERSION:-30.2}"
NODE_MAJOR="${GNS_NODE_MAJOR:-22}"
WEB_PORT="${GNS_WEB_PORT:-3000}"
RESOLVER_PORT="${GNS_RESOLVER_PORT:-8787}"
RPC_PORT="${GNS_RPC_PORT:-38332}"
DB_CACHE_MB="${GNS_DB_CACHE_MB:-450}"
MAX_MEMPOOL_MB="${GNS_MAX_MEMPOOL_MB:-300}"
SWAP_GB="${GNS_SWAP_GB:-2}"
SWAP_MB="$((SWAP_GB * 1024))"

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

echo "Bootstrapping $REMOTE"

ssh "${SSH_ARGS[@]}" "$REMOTE" bash <<EOF
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl gnupg ufw fail2ban unzip xz-utils jq build-essential git rsync

if [ ! -f /swapfile ]; then
  fallocate -l ${SWAP_GB}G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=${SWAP_MB}
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
apt-get install -y nodejs

id -u bitcoin >/dev/null 2>&1 || useradd --system --home /var/lib/bitcoind --shell /usr/sbin/nologin --create-home bitcoin
id -u gns >/dev/null 2>&1 || useradd --system --create-home --home /var/lib/gns --shell /usr/sbin/nologin gns

install -d -o bitcoin -g bitcoin -m 750 /var/lib/bitcoind
install -d -o gns -g gns -m 755 /opt/gns
install -d -o gns -g gns -m 755 /var/lib/gns
install -d -o gns -g gns -m 755 /var/log/gns
install -d -o root -g root -m 755 /etc/gns

cd /tmp
curl -fsSLO https://bitcoincore.org/bin/bitcoin-core-${BITCOIN_VERSION}/bitcoin-${BITCOIN_VERSION}-x86_64-linux-gnu.tar.gz
curl -fsSLO https://bitcoincore.org/bin/bitcoin-core-${BITCOIN_VERSION}/SHA256SUMS
grep " bitcoin-${BITCOIN_VERSION}-x86_64-linux-gnu.tar.gz\$" SHA256SUMS | sha256sum -c -
tar -xzf bitcoin-${BITCOIN_VERSION}-x86_64-linux-gnu.tar.gz
cp -f bitcoin-${BITCOIN_VERSION}/bin/bitcoin-cli bitcoin-${BITCOIN_VERSION}/bin/bitcoind /usr/local/bin/
chmod 755 /usr/local/bin/bitcoin-cli /usr/local/bin/bitcoind

RPC_PASSWORD=\$(openssl rand -hex 24)

cat >/etc/bitcoin-signet.conf <<CONF
signet=1
server=1
txindex=1
daemon=0
printtoconsole=0
rpcworkqueue=64
dbcache=${DB_CACHE_MB}
maxmempool=${MAX_MEMPOOL_MB}

[signet]
rpcbind=127.0.0.1
rpcallowip=127.0.0.1
rpcport=${RPC_PORT}
rpcuser=gnsrpc
rpcpassword=\${RPC_PASSWORD}
zmqpubrawblock=tcp://127.0.0.1:28332
zmqpubrawtx=tcp://127.0.0.1:28333
CONF

chown root:bitcoin /etc/bitcoin-signet.conf
chmod 640 /etc/bitcoin-signet.conf

cat >/etc/systemd/system/bitcoind-signet.service <<'SERVICE'
[Unit]
Description=Bitcoin Core daemon (signet)
After=network-online.target
Wants=network-online.target

[Service]
User=bitcoin
Group=bitcoin
Type=simple
ExecStart=/usr/local/bin/bitcoind -conf=/etc/bitcoin-signet.conf -datadir=/var/lib/bitcoind
ExecStop=/usr/local/bin/bitcoin-cli -conf=/etc/bitcoin-signet.conf -datadir=/var/lib/bitcoind stop
TimeoutStopSec=120
Restart=on-failure
RestartSec=10
RuntimeDirectory=bitcoind
RuntimeDirectoryMode=0750
PrivateTmp=true
NoNewPrivileges=true
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable --now bitcoind-signet.service

CURRENT_BLOCKS=\$(bitcoin-cli -conf=/etc/bitcoin-signet.conf -datadir=/var/lib/bitcoind getblockcount)

cat >/etc/gns/gns.env <<ENVFILE
GNS_SOURCE_MODE=rpc
GNS_EXPECT_CHAIN=signet
GNS_BITCOIN_RPC_URL=http://127.0.0.1:${RPC_PORT}
GNS_BITCOIN_RPC_USERNAME=gnsrpc
GNS_BITCOIN_RPC_PASSWORD=\${RPC_PASSWORD}
GNS_LAUNCH_HEIGHT=\${CURRENT_BLOCKS}
GNS_RESOLVER_PORT=${RESOLVER_PORT}
GNS_WEB_PORT=${WEB_PORT}
GNS_WEB_PRIVATE_BATCH_SMOKE_STATUS_PATH=/var/lib/gns/private-batch-smoke-summary.json
GNS_SNAPSHOT_PATH=/var/lib/gns/resolver-snapshot.json
GNS_VALUE_STORE_PATH=/var/lib/gns/value-records.json
ENVFILE

chown root:gns /etc/gns/gns.env
chmod 640 /etc/gns/gns.env

cat >/etc/systemd/system/gns-resolver.service <<'SERVICE'
[Unit]
Description=Global Name System resolver service
After=network-online.target bitcoind-signet.service
Wants=network-online.target
Requires=bitcoind-signet.service

[Service]
User=gns
Group=gns
WorkingDirectory=/opt/gns/app
EnvironmentFile=/etc/gns/gns.env
ExecStart=/usr/bin/npm run dev:resolver
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICE

cat >/etc/systemd/system/gns-web.service <<'SERVICE'
[Unit]
Description=Global Name System web service
After=network-online.target gns-resolver.service
Wants=network-online.target
Requires=gns-resolver.service

[Service]
User=gns
Group=gns
WorkingDirectory=/opt/gns/app
EnvironmentFile=/etc/gns/gns.env
ExecStart=/usr/bin/npm run dev:web
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICE

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow ${WEB_PORT}/tcp
ufw --force enable

systemctl daemon-reload
echo "Bootstrap complete on \$(hostname)"
EOF

rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.data' \
  --exclude '.DS_Store' \
  -e "ssh ${SSH_ARGS[*]}" \
  "$ROOT_DIR/" \
  "$REMOTE:/opt/gns/app/"

ssh "${SSH_ARGS[@]}" "$REMOTE" bash <<'EOF'
set -euo pipefail
chown -R gns:gns /opt/gns /var/lib/gns /var/log/gns
su -s /bin/bash gns -c 'cd /opt/gns/app && npm ci --no-audit --no-fund'
systemctl enable --now gns-resolver.service
systemctl enable --now gns-web.service

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

echo
echo "[bitcoind]"
systemctl --no-pager --full status bitcoind-signet.service | sed -n '1,40p'

wait_for_http http://127.0.0.1:8787/health "resolver health" 45
wait_for_http http://127.0.0.1:3000/api/health "web health" 20
EOF

echo
echo "Public web URL: http://${REMOTE#*@}:${WEB_PORT}"
