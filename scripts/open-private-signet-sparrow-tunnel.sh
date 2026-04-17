#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/open-private-signet-sparrow-tunnel.sh [user@host] [ssh-key-path]

Note:
  This hosted private-signet helper currently requires granted SSH access to the
  demo VPS. If you do not have that access yet, use the self-host path instead.

Environment:
  ONT_PRIVATE_SIGNET_SSH_TARGET        Preferred SSH target for the private signet demo.
  ONT_PRIVATE_SIGNET_SSH_KEY           Optional SSH key path.
  ONT_SSH_TARGET                       Shared fallback SSH target.
  ONT_SSH_KEY                          Shared fallback SSH key path.
  ONT_PRIVATE_SIGNET_LOCAL_RPC_PORT    Local forwarded RPC port. Default: 39332
  ONT_PRIVATE_SIGNET_REMOTE_RPC_PORT   Remote RPC port. Default: 39332
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

REMOTE="${1:-${ONT_PRIVATE_SIGNET_SSH_TARGET:-${ONT_SSH_TARGET:-}}}"
SSH_KEY_PATH="${2:-${ONT_PRIVATE_SIGNET_SSH_KEY:-${ONT_SSH_KEY:-}}}"
LOCAL_PORT="${ONT_PRIVATE_SIGNET_LOCAL_RPC_PORT:-39332}"
REMOTE_PORT="${ONT_PRIVATE_SIGNET_REMOTE_RPC_PORT:-39332}"

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
  -o ServerAliveInterval=30
  -o ServerAliveCountMax=3
  -N
  -L "${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT}"
)

if [[ -n "$SSH_KEY_PATH" ]]; then
  SSH_ARGS=(
    -i "$SSH_KEY_PATH"
    -o IdentitiesOnly=yes
    "${SSH_ARGS[@]}"
  )
fi

cat <<EOF
Opening SSH tunnel for Sparrow -> private signet Bitcoin Core

  local:  127.0.0.1:${LOCAL_PORT}
  remote: 127.0.0.1:${REMOTE_PORT}
  host:   ${REMOTE}

Keep this terminal open while Sparrow is using the private signet node.
EOF

exec ssh "${SSH_ARGS[@]}" "$REMOTE"
