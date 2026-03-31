#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_ROOT"

if [[ -f .env ]]; then
  printf '.env already exists. Leaving it unchanged.\n'
  printf 'Next: npm run selfhost:doctor\n'
  exit 0
fi

cp .env.example .env
printf 'Created .env from .env.example\n'
printf 'Next: npm run selfhost:doctor\n'
