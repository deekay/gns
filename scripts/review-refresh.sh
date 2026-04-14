#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

run_step() {
  local label="$1"
  shift
  echo
  echo "[$label]"
  "$@"
}

has_private_signet_target() {
  [[ -n "${GNS_PRIVATE_SIGNET_SSH_TARGET:-${GNS_SSH_TARGET:-}}" ]]
}

has_regtest_target() {
  [[ -n "${GNS_REGTEST_SSH_TARGET:-${GNS_SSH_TARGET:-}}" ]]
}

run_step "1/6 local package tests" npm test -w @gns/protocol
run_step "1/6 local package tests" npm test -w @gns/core
run_step "1/6 local package tests" npm test -w @gns/cli
run_step "1/6 local package tests" npm test -w @gns/web

run_step "2/6 fixture batch smoke" npm run test:smoke-fixture-batch

if [[ "${GNS_REVIEW_REFRESH_SKIP_PRIVATE_SIGNET:-0}" == "1" ]]; then
  echo
  echo "[3/6 private signet] skipped by GNS_REVIEW_REFRESH_SKIP_PRIVATE_SIGNET=1"
elif has_private_signet_target; then
  run_step "3/6 private signet batch smoke" npm run test:private-signet-batch-smoke
  run_step "4/6 private signet auction smoke" npm run test:private-signet-auction-smoke
  run_step "5/6 private signet auction phase gallery" npm run test:private-signet-auction-phase-gallery
else
  echo
  echo "[3-5/6 private signet] skipped because no private-signet SSH target is configured"
fi

if [[ "${GNS_REVIEW_REFRESH_SKIP_REGTEST:-0}" == "1" ]]; then
  echo
  echo "[6/6 regtest] skipped by GNS_REVIEW_REFRESH_SKIP_REGTEST=1"
elif has_regtest_target; then
  run_step "6/6 regtest lifecycle suite" npm run test:regtest-cli-suite
else
  echo
  echo "[6/6 regtest] skipped because no regtest SSH target is configured"
fi

echo
echo "Review refresh complete."
echo "Suggested manual checks:"
echo "  https://globalnamesystem.org/gns-private/api/experimental-auctions"
echo "  https://globalnamesystem.org/api/private-batch-smoke-status"
echo "  https://globalnamesystem.org/api/private-auction-smoke-status"
echo "  https://globalnamesystem.org/auctions"
echo "  https://globalnamesystem.org/gns-private/auctions"
