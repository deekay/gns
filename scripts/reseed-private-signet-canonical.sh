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
  GNS_SSH_TARGET                                  Default SSH target when the first argument is omitted.
  GNS_SSH_KEY                                     Optional SSH key path when the second argument is omitted.
  GNS_PRIVATE_SIGNET_RESET_BLOCKS                 Initial blocks to mine after reset. Default: 110
  GNS_PRIVATE_SIGNET_RESET_DELETE_LOCAL           Delete local demo wallets/artifacts too. Default: 1
  GNS_PRIVATE_SIGNET_BATCH_SMOKE_ALPHA_NAME       Override canonical alpha batch name. Default: batchalpha
  GNS_PRIVATE_SIGNET_BATCH_SMOKE_BETA_NAME        Override canonical beta batch name. Default: batchbeta
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
ALPHA_NAME="${GNS_PRIVATE_SIGNET_BATCH_SMOKE_ALPHA_NAME:-batchalpha}"
BETA_NAME="${GNS_PRIVATE_SIGNET_BATCH_SMOKE_BETA_NAME:-batchbeta}"

if [[ -z "$REMOTE" ]]; then
  echo "Missing SSH target. Pass <user@host> or set GNS_SSH_TARGET." >&2
  usage
  exit 1
fi

if [[ -n "$SSH_KEY_PATH" && ! -f "$SSH_KEY_PATH" ]]; then
  echo "SSH key not found: $SSH_KEY_PATH" >&2
  exit 1
fi

export GNS_PRIVATE_SIGNET_SSH_TARGET="$REMOTE"
export GNS_PRIVATE_SIGNET_SSH_KEY="${SSH_KEY_PATH:-}"

cd "$ROOT_DIR"

echo
echo "[1/5] Reset private signet chain and demo state"
bash ./scripts/reset-private-signet-demo.sh "$REMOTE" "${SSH_KEY_PATH:-}"

echo
echo "[2/5] Seed canonical single-claim/value/transfer examples"
node ./scripts/private-signet-reseed-demo.mjs

echo
echo "[3/5] Seed canonical batched claim proof"
GNS_PRIVATE_SIGNET_BATCH_SMOKE_ALPHA_NAME="$ALPHA_NAME" \
GNS_PRIVATE_SIGNET_BATCH_SMOKE_BETA_NAME="$BETA_NAME" \
node ./scripts/private-signet-batch-smoke.mjs

echo
echo "[4/5] Seed canonical auction smoke lot"
node ./scripts/private-signet-auction-smoke.mjs

echo
echo "[5/5] Park dedicated live auction phase examples"
node ./scripts/private-signet-auction-phase-gallery.mjs

echo
echo "Canonical private signet reseed complete."
echo "Examples:"
echo "  claimdemo"
echo "  valuedemo"
echo "  transferdemo"
echo "  ${ALPHA_NAME}"
echo "  ${BETA_NAME}"
echo "  private auction smoke lots (see /auctions)"
echo "  dedicated phase lots: phasepending, phaseawaiting, phaselive, phasesoftclose"
