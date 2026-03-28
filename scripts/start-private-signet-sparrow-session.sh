#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
usage() {
  cat <<'EOF'
Usage:
  ./scripts/start-private-signet-sparrow-session.sh [user@host] [ssh-key-path]

Environment:
  GNS_PRIVATE_SIGNET_SSH_TARGET  Preferred SSH target for the private signet demo.
  GNS_PRIVATE_SIGNET_SSH_KEY     Optional SSH key path.
  GNS_SSH_TARGET                 Shared fallback SSH target.
  GNS_SSH_KEY                    Shared fallback SSH key path.
  CONFIGURE_SPARROW=0            Skip rewriting Sparrow's local signet config.
  LAUNCH_SPARROW=0               Skip launching Sparrow before opening the tunnel.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

REMOTE="${1:-${GNS_PRIVATE_SIGNET_SSH_TARGET:-${GNS_SSH_TARGET:-}}}"
SSH_KEY_PATH="${2:-${GNS_PRIVATE_SIGNET_SSH_KEY:-${GNS_SSH_KEY:-}}}"
CONFIGURE_SPARROW="${CONFIGURE_SPARROW:-1}"
LAUNCH_SPARROW="${LAUNCH_SPARROW:-1}"

if [[ -z "$REMOTE" ]]; then
  echo "Missing SSH target. Pass [user@host] or set GNS_PRIVATE_SIGNET_SSH_TARGET." >&2
  usage
  exit 1
fi

if [[ -n "$SSH_KEY_PATH" && ! -f "$SSH_KEY_PATH" ]]; then
  echo "SSH key not found: $SSH_KEY_PATH" >&2
  exit 1
fi

if [[ "$CONFIGURE_SPARROW" != "0" ]]; then
  "$SCRIPT_DIR/configure-sparrow-private-signet.sh" "$REMOTE" "$SSH_KEY_PATH"
  echo
fi

if [[ "$LAUNCH_SPARROW" != "0" ]]; then
  ("$SCRIPT_DIR/launch-sparrow-signet.sh" >/dev/null 2>&1) &
  echo "Attempted to launch Sparrow in signet mode."
  sleep 1
fi

echo
"$SCRIPT_DIR/print-private-signet-sparrow-config.sh" "$REMOTE" "$SSH_KEY_PATH"
echo
echo "Starting SSH tunnel. Keep this terminal open while Sparrow is connected."
echo
exec "$SCRIPT_DIR/open-private-signet-sparrow-tunnel.sh" "$REMOTE" "$SSH_KEY_PATH"
