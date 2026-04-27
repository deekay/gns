#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/reseed-private-signet-canonical.sh <user@host> [ssh-key-path]

Examples:
  ./scripts/reseed-private-signet-canonical.sh root@example.com ~/.ssh/your_key

Environment:
  ONT_SSH_TARGET                                  Default SSH target when the first argument is omitted.
  ONT_SSH_KEY                                     Optional SSH key path when the second argument is omitted.
  ONT_PRIVATE_SIGNET_RESET_BLOCKS                 Initial blocks to mine after reset. Default: 110
  ONT_PRIVATE_SIGNET_RESET_DELETE_LOCAL           Delete local demo wallets/artifacts too. Default: 1
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

REMOTE="${1:-${ONT_SSH_TARGET:-}}"
SSH_KEY_PATH="${2:-${ONT_SSH_KEY:-}}"

if [[ -z "$REMOTE" ]]; then
  echo "Missing SSH target. Pass <user@host> or set ONT_SSH_TARGET." >&2
  usage
  exit 1
fi

if [[ -n "$SSH_KEY_PATH" && ! -f "$SSH_KEY_PATH" ]]; then
  echo "SSH key not found: $SSH_KEY_PATH" >&2
  exit 1
fi

export ONT_PRIVATE_SIGNET_SSH_TARGET="$REMOTE"
export ONT_PRIVATE_SIGNET_SSH_KEY="${SSH_KEY_PATH:-}"

cd "$ROOT_DIR"

echo
echo "[1/3] Reset private signet chain and demo state"
bash ./scripts/reset-private-signet-demo.sh "$REMOTE" "${SSH_KEY_PATH:-}"

echo
echo "[2/3] Seed canonical auction smoke lot"
node ./scripts/private-signet-auction-smoke.mjs

echo
echo "[3/3] Park dedicated live auction phase examples"
node ./scripts/private-signet-auction-phase-gallery.mjs

echo
echo "Canonical private signet reseed complete."
echo "Examples:"
echo "  private auction smoke lots (see /auctions)"
echo "  dedicated phase lots: phasepending, phaseawaiting, phaselive, phasesoftclose"
