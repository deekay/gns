#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_ROOT"

failures=0

pass() {
  printf 'OK   %s\n' "$1"
}

todo() {
  printf 'TODO %s\n' "$1"
  failures=$((failures + 1))
}

info() {
  printf '%s\n' "$1"
}

section() {
  printf '\n%s\n' "$1"
}

read_env_value() {
  local key="$1"
  local fallback="$2"

  if [[ ! -f .env ]]; then
    printf '%s' "$fallback"
    return
  fi

  local value
  value="$(awk -F= -v key="$key" '$1 == key { print $2; found = 1 } END { if (!found) print "" }' .env)"
  if [[ -n "$value" ]]; then
    printf '%s' "$value"
    return
  fi

  printf '%s' "$fallback"
}

section "ONT self-host preflight"

if command -v docker >/dev/null 2>&1; then
  pass "$(docker --version | head -n 1)"
else
  if [[ "$(uname -s)" == "Darwin" ]]; then
    todo "Docker is not installed or not on PATH. Install Docker Desktop for Mac first."
  else
    todo "Docker is not installed or not on PATH. Install Docker Desktop or Docker Engine first."
  fi
fi

if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    pass "Docker Compose is available."
  else
    todo "Docker Compose is not available. Make sure the Compose plugin is installed."
  fi
fi

if [[ -f .env ]]; then
  pass ".env exists."
else
  todo ".env is missing. Run: npm run selfhost:init"
fi

if [[ -f docker-compose.yml ]]; then
  pass "docker-compose.yml is present."
else
  todo "docker-compose.yml is missing."
fi

if [[ -f docker/Dockerfile ]]; then
  pass "docker/Dockerfile is present."
else
  todo "docker/Dockerfile is missing."
fi

if [[ -f fixtures/demo-chain.json ]]; then
  pass "fixtures/demo-chain.json is present."
else
  todo "fixtures/demo-chain.json is missing."
fi

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 && [[ -f .env ]]; then
  if docker compose config >/dev/null 2>&1; then
    pass "docker compose config parses cleanly."
  else
    todo "docker compose config failed. Check .env for invalid values."
  fi
fi

section "Configured defaults"
info "Source mode: $(read_env_value "ONT_SOURCE_MODE" "fixture")"
info "Web URL: http://127.0.0.1:$(read_env_value "ONT_WEB_PORT" "3000")"
info "Resolver URL: http://127.0.0.1:$(read_env_value "ONT_RESOLVER_PORT" "8787")"

section "Next step"
if [[ "$failures" -eq 0 ]]; then
  info "Run: npm run selfhost:up"
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  info "Install Docker first, then run: npm run selfhost:init"
  exit 1
fi

info "Fix the items marked TODO, then rerun: npm run selfhost:doctor"
exit 1
