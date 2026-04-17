#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/configure-sparrow-private-signet.sh [user@host] [ssh-key-path]

Note:
  This hosted private-signet helper currently requires granted SSH access to the
  demo VPS. If you do not have that access yet, use the self-host path instead.

Environment:
  ONT_PRIVATE_SIGNET_SSH_TARGET  Preferred SSH target for the private signet demo.
  ONT_PRIVATE_SIGNET_SSH_KEY     Optional SSH key path.
  ONT_SSH_TARGET                 Shared fallback SSH target.
  ONT_SSH_KEY                    Shared fallback SSH key path.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

REMOTE="${1:-${ONT_PRIVATE_SIGNET_SSH_TARGET:-${ONT_SSH_TARGET:-}}}"
SSH_KEY_PATH="${2:-${ONT_PRIVATE_SIGNET_SSH_KEY:-${ONT_SSH_KEY:-}}}"
SPARROW_HOME="${SPARROW_HOME:-$HOME/.sparrow}"
SPARROW_SIGNET_CONFIG="${SPARROW_SIGNET_CONFIG:-$SPARROW_HOME/signet/config}"

if [[ -z "$REMOTE" ]]; then
  echo "Missing SSH target. This hosted private-signet path currently requires granted SSH access." >&2
  echo "Pass [user@host] or set ONT_PRIVATE_SIGNET_SSH_TARGET. If you do not have demo SSH access, use the self-host path instead." >&2
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

CONFIG_LINES=$(
  ssh \
    "${SSH_ARGS[@]}" \
    "$REMOTE" \
    "grep -E 'ONT_BITCOIN_RPC_(URL|USERNAME|PASSWORD)|ONT_WEB_NETWORK_LABEL' /etc/ont/ont-private.env"
)

RPC_URL=$(printf '%s\n' "$CONFIG_LINES" | sed -n 's/^ONT_BITCOIN_RPC_URL=//p')
RPC_USERNAME=$(printf '%s\n' "$CONFIG_LINES" | sed -n 's/^ONT_BITCOIN_RPC_USERNAME=//p')
RPC_PASSWORD=$(printf '%s\n' "$CONFIG_LINES" | sed -n 's/^ONT_BITCOIN_RPC_PASSWORD=//p')
NETWORK_LABEL=$(printf '%s\n' "$CONFIG_LINES" | sed -n 's/^ONT_WEB_NETWORK_LABEL=//p')

if [[ -z "$RPC_URL" || -z "$RPC_USERNAME" || -z "$RPC_PASSWORD" ]]; then
  echo "Could not read the private signet RPC settings from $REMOTE" >&2
  exit 1
fi

install -d "$(dirname "$SPARROW_SIGNET_CONFIG")"

if [[ -f "$SPARROW_SIGNET_CONFIG" ]]; then
  cp "$SPARROW_SIGNET_CONFIG" "$SPARROW_SIGNET_CONFIG.bak.$(date +%Y%m%d%H%M%S)"
elif [[ -f "$SPARROW_HOME/config" ]]; then
  cp "$SPARROW_HOME/config" "$SPARROW_SIGNET_CONFIG"
fi

node - "$SPARROW_SIGNET_CONFIG" "$RPC_URL" "$RPC_USERNAME" "$RPC_PASSWORD" <<'NODE'
const fs = require("fs");

const [configPath, rpcUrl, rpcUsername, rpcPassword] = process.argv.slice(2);

let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
}

config.mode = "ONLINE";
config.serverType = "BITCOIN_CORE";
config.coreServer = rpcUrl;
config.recentCoreServers = Array.isArray(config.recentCoreServers)
  ? Array.from(new Set([rpcUrl, ...config.recentCoreServers.filter((value) => typeof value === "string")]))
  : [rpcUrl];
config.coreAuthType = "USERPASS";
config.coreAuth = `${rpcUsername}:${rpcPassword}`;
config.useProxy = false;

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
NODE

cat <<EOF
Configured Sparrow signet profile for the private demo.

Config file:     ${SPARROW_SIGNET_CONFIG}
Network label:   ${NETWORK_LABEL}
Core server:     ${RPC_URL}
Auth mode:       USERPASS
Username:        ${RPC_USERNAME}

If Sparrow was already open, restart it so it reloads the updated signet config.
EOF
