#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
usage() {
  cat <<'EOF'
Usage:
  ./scripts/print-private-signet-sparrow-config.sh [user@host] [ssh-key-path]

Environment:
  GNS_PRIVATE_SIGNET_SSH_TARGET  Preferred SSH target for the private signet demo.
  GNS_PRIVATE_SIGNET_SSH_KEY     Optional SSH key path.
  GNS_SSH_TARGET                 Shared fallback SSH target.
  GNS_SSH_KEY                    Shared fallback SSH key path.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

REMOTE="${1:-${GNS_PRIVATE_SIGNET_SSH_TARGET:-${GNS_SSH_TARGET:-}}}"
SSH_KEY_PATH="${2:-${GNS_PRIVATE_SIGNET_SSH_KEY:-${GNS_SSH_KEY:-}}}"

if [[ -z "$REMOTE" ]]; then
  echo "Missing SSH target. Pass [user@host] or set GNS_PRIVATE_SIGNET_SSH_TARGET." >&2
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
    "grep -E 'GNS_BITCOIN_RPC_(URL|USERNAME|PASSWORD)|GNS_WEB_NETWORK_LABEL' /etc/gns/gns-private.env"
)

RPC_URL=$(printf '%s\n' "$CONFIG_LINES" | sed -n 's/^GNS_BITCOIN_RPC_URL=//p')
RPC_USERNAME=$(printf '%s\n' "$CONFIG_LINES" | sed -n 's/^GNS_BITCOIN_RPC_USERNAME=//p')
RPC_PASSWORD=$(printf '%s\n' "$CONFIG_LINES" | sed -n 's/^GNS_BITCOIN_RPC_PASSWORD=//p')
NETWORK_LABEL=$(printf '%s\n' "$CONFIG_LINES" | sed -n 's/^GNS_WEB_NETWORK_LABEL=//p')

RPC_PORT=$(printf '%s' "$RPC_URL" | sed -n 's#.*:\([0-9][0-9]*\)$#\1#p')
RPC_PORT="${RPC_PORT:-39332}"

cat <<EOF
Private signet Sparrow settings
===============================

Network:        Signet
Server type:    Bitcoin Core
Host:           127.0.0.1
Port:           ${RPC_PORT}
Username:       ${RPC_USERNAME}
Password:       ${RPC_PASSWORD}
Node label:     ${NETWORK_LABEL}

Open the tunnel first:
  ${SCRIPT_DIR}/open-private-signet-sparrow-tunnel.sh ${REMOTE} ${SSH_KEY_PATH}

Then in Sparrow:
  1. Start Sparrow in signet mode
  2. Turn Public Server off
  3. Choose Bitcoin Core
  4. Use the host/port/user/pass above

Keep this output private. It includes the live RPC password.
EOF
