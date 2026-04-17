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
  [[ -n "${ONT_PRIVATE_SIGNET_SSH_TARGET:-${ONT_SSH_TARGET:-}}" ]]
}

has_regtest_target() {
  [[ -n "${ONT_REGTEST_SSH_TARGET:-${ONT_SSH_TARGET:-}}" ]]
}

run_step "1/7 local package tests" npm test -w @ont/protocol
run_step "1/7 local package tests" npm test -w @ont/core
run_step "1/7 local package tests" npm test -w @ont/cli
run_step "1/7 local package tests" npm test -w @ont/web

run_step "2/7 fixture batch smoke" npm run test:smoke-fixture-batch
run_step "3/7 fixture browser e2e" npm run test:e2e:fixture-web

if [[ "${ONT_REVIEW_REFRESH_SKIP_PRIVATE_SIGNET:-0}" == "1" ]]; then
  echo
  echo "[4/7 private signet] skipped by ONT_REVIEW_REFRESH_SKIP_PRIVATE_SIGNET=1"
elif has_private_signet_target; then
  run_step "4/7 private signet batch smoke" npm run test:private-signet-batch-smoke
  run_step "5/7 private signet auction smoke" npm run test:private-signet-auction-smoke
  run_step "6/7 private signet auction phase gallery" npm run test:private-signet-auction-phase-gallery
else
  echo
  echo "[4-6/7 private signet] skipped because neither ONT_PRIVATE_SIGNET_SSH_TARGET nor ONT_SSH_TARGET is configured"
  echo "Use 'npm run review:refresh:local' for the local-only packet refresh."
fi

if [[ "${ONT_REVIEW_REFRESH_SKIP_REGTEST:-0}" == "1" ]]; then
  echo
  echo "[7/7 regtest] skipped by ONT_REVIEW_REFRESH_SKIP_REGTEST=1"
elif has_regtest_target; then
  run_step "7/7 regtest lifecycle suite" npm run test:regtest-cli-suite
else
  echo
  echo "[7/7 regtest] skipped because neither ONT_REGTEST_SSH_TARGET nor ONT_SSH_TARGET is configured"
fi

echo
echo "Review refresh complete."
echo "Suggested manual checks:"
echo "  https://opennametags.org/ont-private/api/experimental-auctions"
echo "  https://opennametags.org/api/private-batch-smoke-status"
echo "  https://opennametags.org/api/private-auction-smoke-status"
echo "  https://opennametags.org/auctions"
echo "  https://opennametags.org/ont-private/auctions"
