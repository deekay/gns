#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/bootstrap-private-signet-vps.sh <user@host> [ssh-key-path]

Examples:
  ./scripts/bootstrap-private-signet-vps.sh root@example.com ~/.ssh/your_key

Environment:
  GNS_SSH_TARGET                     Default SSH target when the first argument is omitted.
  GNS_SSH_KEY                        Optional SSH key path when the second argument is omitted.
  GNS_BITCOIN_VERSION                 Bitcoin Core source tag to clone for contrib/signet/miner. Default: 30.2
  GNS_PRIVATE_SIGNET_WEB_PORT         Public web port for the private signet demo. Default: 3001
  GNS_PRIVATE_SIGNET_RESOLVER_PORT    Private resolver port. Default: 8788
  GNS_PRIVATE_SIGNET_RPC_PORT         Local Bitcoin RPC port. Default: 39332
  GNS_PRIVATE_SIGNET_P2P_PORT         P2P port for the private signet node. Default: 39333
  GNS_PRIVATE_SIGNET_ELECTRUM_PORT    Public Electrum port for the private signet demo. Default: 50001
  GNS_PRIVATE_SIGNET_CHALLENGE        Signet challenge hex. Default: 51
  GNS_PRIVATE_SIGNET_BASE_PATH        Web base path. Default: /gns-private
  GNS_PRIVATE_SIGNET_BOOTSTRAP_BLOCKS Initial blocks to mine for mature demo funds. Default: 110
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
WEB_PORT="${GNS_PRIVATE_SIGNET_WEB_PORT:-3001}"
RESOLVER_PORT="${GNS_PRIVATE_SIGNET_RESOLVER_PORT:-8788}"
RPC_PORT="${GNS_PRIVATE_SIGNET_RPC_PORT:-39332}"
P2P_PORT="${GNS_PRIVATE_SIGNET_P2P_PORT:-39333}"
ELECTRUM_PORT="${GNS_PRIVATE_SIGNET_ELECTRUM_PORT:-50001}"
CHALLENGE="${GNS_PRIVATE_SIGNET_CHALLENGE:-51}"
BASE_PATH="${GNS_PRIVATE_SIGNET_BASE_PATH:-/gns-private}"
BOOTSTRAP_BLOCKS="${GNS_PRIVATE_SIGNET_BOOTSTRAP_BLOCKS:-110}"
PUBLIC_HOST="${REMOTE#*@}"

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

echo "Bootstrapping private signet on $REMOTE"

rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.data' \
  --exclude '.DS_Store' \
  -e "ssh ${SSH_ARGS[*]}" \
  "$ROOT_DIR/" \
  "$REMOTE:/opt/gns/app/"

ssh "${SSH_ARGS[@]}" "$REMOTE" "BITCOIN_VERSION='$BITCOIN_VERSION' WEB_PORT='$WEB_PORT' RESOLVER_PORT='$RESOLVER_PORT' RPC_PORT='$RPC_PORT' P2P_PORT='$P2P_PORT' ELECTRUM_PORT='$ELECTRUM_PORT' CHALLENGE='$CHALLENGE' BASE_PATH='$BASE_PATH' BOOTSTRAP_BLOCKS='$BOOTSTRAP_BLOCKS' PUBLIC_HOST='$PUBLIC_HOST' bash -s" <<'EOF'
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl gnupg jq build-essential git rsync python3 libssl-dev

id -u bitcoin >/dev/null 2>&1 || useradd --system --home /var/lib/bitcoind --shell /usr/sbin/nologin --create-home bitcoin
id -u gns >/dev/null 2>&1 || useradd --system --create-home --home /var/lib/gns --shell /usr/sbin/nologin gns

install -d -o bitcoin -g bitcoin -m 750 /var/lib/bitcoind-private-signet
install -d -o gns -g gns -m 755 /var/lib/gns
install -d -o root -g root -m 755 /etc/gns
install -d -o root -g root -m 755 /opt/bitcoin-source-${BITCOIN_VERSION}

if [[ ! -d /opt/bitcoin-source-${BITCOIN_VERSION}/.git ]]; then
  rm -rf /opt/bitcoin-source-${BITCOIN_VERSION}
  git clone --depth 1 --branch "v${BITCOIN_VERSION}" https://github.com/bitcoin/bitcoin /opt/bitcoin-source-${BITCOIN_VERSION}
fi

chown -R gns:gns /opt/gns/app /var/lib/gns

cc -O3 -pthread -o /usr/local/bin/gns-grind-header-fast /opt/gns/app/scripts/grind-header-fast.c -lcrypto
chmod 755 /usr/local/bin/gns-grind-header-fast

RPC_PASSWORD=$(openssl rand -hex 24)

cat >/etc/bitcoin-private-signet.conf <<CONF
signet=1
signetchallenge=${CHALLENGE}
server=1
txindex=1
daemon=0
printtoconsole=0
fallbackfee=0.0002
dnsseed=0
listen=1

[signet]
port=${P2P_PORT}
rpcbind=127.0.0.1
rpcallowip=127.0.0.1
rpcport=${RPC_PORT}
rpcuser=gnsrpcprivate
rpcpassword=${RPC_PASSWORD}
CONF

chown root:bitcoin /etc/bitcoin-private-signet.conf
chmod 640 /etc/bitcoin-private-signet.conf

if id -u gns >/dev/null 2>&1; then
  usermod -a -G bitcoin gns
fi

cat >/usr/local/bin/gns-private-signet-ensure-wallet <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

CONF=/etc/bitcoin-private-signet.conf
DATADIR=/var/lib/bitcoind-private-signet
CLI="/usr/local/bin/bitcoin-cli -conf=${CONF} -datadir=${DATADIR}"
WALLET=miner
ADDRESS_FILE=${DATADIR}/miner-address.txt

if ! ${CLI} -rpcwallet="${WALLET}" getwalletinfo >/dev/null 2>&1; then
  if ! ${CLI} loadwallet "${WALLET}" >/dev/null 2>&1; then
    ${CLI} createwallet "${WALLET}" >/dev/null
  fi
fi

if [[ ! -s "${ADDRESS_FILE}" ]]; then
  ${CLI} -rpcwallet="${WALLET}" getnewaddress >"${ADDRESS_FILE}"
fi

cat "${ADDRESS_FILE}"
SCRIPT
chmod 755 /usr/local/bin/gns-private-signet-ensure-wallet

cat >/usr/local/bin/gns-private-signet-mine <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

BLOCKS="${1:-1}"
CONF=/etc/bitcoin-private-signet.conf
DATADIR=/var/lib/bitcoind-private-signet
CLI="/usr/local/bin/bitcoin-cli -conf=${CONF} -datadir=${DATADIR}"
BITCOIN_SOURCE=/opt/bitcoin-source-30.2
GRIND_CMD="/usr/local/bin/gns-grind-header-fast"
ADDRESS=$(/usr/local/bin/gns-private-signet-ensure-wallet)
MINER_CLI="${CLI} -rpcwallet=miner"

for _ in $(seq 1 "${BLOCKS}"); do
  python3 "${BITCOIN_SOURCE}/contrib/signet/miner" \
    --cli "${MINER_CLI}" \
    generate \
    --address "${ADDRESS}" \
    --nbits 1e0377ae \
    --grind-cmd "${GRIND_CMD}" \
    --set-block-time -1
done
SCRIPT
chmod 755 /usr/local/bin/gns-private-signet-mine
sed -i "s|/opt/bitcoin-source-30.2|/opt/bitcoin-source-${BITCOIN_VERSION}|g" /usr/local/bin/gns-private-signet-mine

cat >/usr/local/bin/gns-private-signet-fund <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: gns-private-signet-fund <address> <amount-btc>" >&2
  exit 1
fi

ADDRESS="$1"
AMOUNT="$2"
CONF=/etc/bitcoin-private-signet.conf
DATADIR=/var/lib/bitcoind-private-signet
CLI="/usr/local/bin/bitcoin-cli -conf=${CONF} -datadir=${DATADIR}"

/usr/local/bin/gns-private-signet-ensure-wallet >/dev/null
TXID=$(${CLI} -rpcwallet=miner sendtoaddress "${ADDRESS}" "${AMOUNT}")
/usr/local/bin/gns-private-signet-mine 1 >/dev/null
echo "${TXID}"
SCRIPT
chmod 755 /usr/local/bin/gns-private-signet-fund

install -m 755 /opt/gns/app/scripts/private-signet-auto-mine.sh /usr/local/bin/gns-private-signet-auto-mine

cat >/etc/default/gns-private-signet-auto-mine <<'ENVFILE'
GNS_PRIVATE_SIGNET_AUTO_MINE_INTERVAL_SECONDS=30
ENVFILE
chown root:root /etc/default/gns-private-signet-auto-mine
chmod 644 /etc/default/gns-private-signet-auto-mine

cat >/etc/systemd/system/bitcoind-private-signet.service <<'SERVICE'
[Unit]
Description=Bitcoin Core daemon (private signet)
After=network-online.target
Wants=network-online.target

[Service]
User=bitcoin
Group=bitcoin
Type=simple
ExecStart=/usr/local/bin/bitcoind -conf=/etc/bitcoin-private-signet.conf -datadir=/var/lib/bitcoind-private-signet
ExecStop=/usr/local/bin/bitcoin-cli -conf=/etc/bitcoin-private-signet.conf -datadir=/var/lib/bitcoind-private-signet stop
TimeoutStopSec=120
Restart=on-failure
RestartSec=10
RuntimeDirectory=bitcoind-private-signet
RuntimeDirectoryMode=0750
PrivateTmp=true
NoNewPrivileges=true
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICE

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

cat >/etc/gns/gns-private.env <<ENVFILE
GNS_SOURCE_MODE=rpc
GNS_EXPECT_CHAIN=signet
GNS_BITCOIN_RPC_URL=http://127.0.0.1:${RPC_PORT}
GNS_BITCOIN_RPC_USERNAME=gnsrpcprivate
GNS_BITCOIN_RPC_PASSWORD=${RPC_PASSWORD}
GNS_LAUNCH_HEIGHT=1
GNS_RESOLVER_PORT=${RESOLVER_PORT}
GNS_WEB_PORT=${WEB_PORT}
GNS_WEB_BASE_PATH=${BASE_PATH}
GNS_EXPERIMENTAL_AUCTION_FIXTURE_DIR=/opt/gns/app/fixtures/auction/private-signet-lab
GNS_EXPERIMENTAL_AUCTION_NO_BID_RELEASE_BLOCKS=64
GNS_WEB_NETWORK_LABEL=Private Signet (Fast Maturity Demo)
GNS_WEB_PRIVATE_BATCH_SMOKE_STATUS_PATH=/var/lib/gns/private-batch-smoke-summary.json
GNS_WEB_PRIVATE_AUCTION_SMOKE_STATUS_PATH=/var/lib/gns/private-auction-smoke-summary.json
GNS_TEST_OVERRIDE_INITIAL_MATURITY_BLOCKS=12
GNS_TEST_OVERRIDE_EPOCH_LENGTH_BLOCKS=12
GNS_TEST_OVERRIDE_MIN_MATURITY_BLOCKS=4
GNS_WEB_PRIVATE_SIGNET_ELECTRUM_ENDPOINT=${PUBLIC_HOST}:${ELECTRUM_PORT}:t
GNS_SNAPSHOT_PATH=/var/lib/gns/private-signet-resolver-snapshot.json
GNS_VALUE_STORE_PATH=/var/lib/gns/private-signet-value-records.json
ENVFILE

chown root:gns /etc/gns/gns-private.env
chmod 640 /etc/gns/gns-private.env

cat >/etc/systemd/system/gns-private-resolver.service <<'SERVICE'
[Unit]
Description=Global Name System resolver service (private signet)
After=network-online.target bitcoind-private-signet.service
Wants=network-online.target
Requires=bitcoind-private-signet.service

[Service]
User=gns
Group=gns
WorkingDirectory=/opt/gns/app
EnvironmentFile=/etc/gns/gns-private.env
ExecStart=/usr/bin/npm run dev:resolver
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICE

cat >/etc/systemd/system/gns-private-web.service <<'SERVICE'
[Unit]
Description=Global Name System web service (private signet)
After=network-online.target gns-private-resolver.service
Wants=network-online.target
Requires=gns-private-resolver.service

[Service]
User=gns
Group=gns
WorkingDirectory=/opt/gns/app
EnvironmentFile=/etc/gns/gns-private.env
ExecStart=/usr/bin/npm run dev:web
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable bitcoind-private-signet.service
systemctl restart bitcoind-private-signet.service

wait_for_rpc() {
  for _ in $(seq 1 45); do
    if /usr/local/bin/bitcoin-cli -conf=/etc/bitcoin-private-signet.conf -datadir=/var/lib/bitcoind-private-signet getblockchaininfo >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  echo "private signet RPC did not become ready in time" >&2
  exit 1
}

wait_for_rpc
/usr/local/bin/gns-private-signet-ensure-wallet >/dev/null

CURRENT_BLOCKS=$(/usr/local/bin/bitcoin-cli -conf=/etc/bitcoin-private-signet.conf -datadir=/var/lib/bitcoind-private-signet getblockcount)
if [[ "$CURRENT_BLOCKS" -lt "${BOOTSTRAP_BLOCKS}" ]]; then
  /usr/local/bin/gns-private-signet-mine "$((BOOTSTRAP_BLOCKS - CURRENT_BLOCKS))"
fi

su -s /bin/bash gns -c 'cd /opt/gns/app && npm ci --no-audit --no-fund'
GNS_PRIVATE_SIGNET_RPC_PORT="${RPC_PORT}" \
GNS_PRIVATE_SIGNET_P2P_PORT="${P2P_PORT}" \
GNS_PRIVATE_SIGNET_ELECTRUM_PORT="${ELECTRUM_PORT}" \
GNS_PRIVATE_SIGNET_RPC_USERNAME="gnsrpcprivate" \
GNS_PRIVATE_SIGNET_RPC_PASSWORD="${RPC_PASSWORD}" \
  /opt/gns/app/scripts/install-private-signet-electrum.sh
systemctl enable --now gns-private-signet-auto-mine.service
systemctl enable --now gns-private-resolver.service
systemctl enable --now gns-private-web.service

ufw allow ${WEB_PORT}/tcp >/dev/null

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-45}"

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
wait_for_http "http://127.0.0.1:${WEB_PORT}${BASE_PATH}/api/health" "private web health" 30

echo
echo "[private signet]"
/usr/local/bin/bitcoin-cli -conf=/etc/bitcoin-private-signet.conf -datadir=/var/lib/bitcoind-private-signet getblockchaininfo
echo
echo "[private resolver service]"
systemctl --no-pager --full status gns-private-resolver.service | sed -n '1,30p'
echo
echo "[private web service]"
systemctl --no-pager --full status gns-private-web.service | sed -n '1,30p'
echo
echo "[private auto-miner service]"
systemctl --no-pager --full status gns-private-signet-auto-mine.service | sed -n '1,30p'
echo
echo "[private electrum service]"
systemctl --no-pager --full status electrs-private-signet.service | sed -n '1,30p'
EOF

echo
echo "Private signet web URL: http://${REMOTE#*@}:${WEB_PORT}${BASE_PATH}"
echo "Private signet Electrum endpoint: ${PUBLIC_HOST}:${ELECTRUM_PORT}:t"
