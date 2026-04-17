#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
usage() {
  cat <<'EOF'
Usage:
  ./scripts/start-private-signet-sparrow-session.sh [user@host] [ssh-key-path]

Note:
  This hosted private-signet helper currently requires granted SSH access to the
  demo VPS. If you do not have that access yet, use the self-host path instead.

Environment:
  ONT_PRIVATE_SIGNET_SSH_TARGET  Preferred SSH target for the private signet demo.
  ONT_PRIVATE_SIGNET_SSH_KEY     Optional SSH key path.
  ONT_SSH_TARGET                 Shared fallback SSH target.
  ONT_SSH_KEY                    Shared fallback SSH key path.
  CONFIGURE_SPARROW=0            Skip rewriting Sparrow's local signet config.
  LAUNCH_SPARROW=0               Skip launching Sparrow before opening the tunnel.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

REMOTE="${1:-${ONT_PRIVATE_SIGNET_SSH_TARGET:-${ONT_SSH_TARGET:-}}}"
SSH_KEY_PATH="${2:-${ONT_PRIVATE_SIGNET_SSH_KEY:-${ONT_SSH_KEY:-}}}"
CONFIGURE_SPARROW="${CONFIGURE_SPARROW:-1}"
LAUNCH_SPARROW="${LAUNCH_SPARROW:-1}"

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
