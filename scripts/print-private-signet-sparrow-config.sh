#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
usage() {
  cat <<'EOF'
Usage:
  ./scripts/print-private-signet-sparrow-config.sh [user@host] [ssh-key-path]

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
