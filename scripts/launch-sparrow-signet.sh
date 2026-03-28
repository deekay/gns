#!/usr/bin/env bash

set -euo pipefail

SPARROW_APP_PATH="${SPARROW_APP_PATH:-/Applications/Sparrow.app}"

if [[ "$(uname -s)" == "Darwin" ]]; then
  if [[ -d "$SPARROW_APP_PATH" ]]; then
    echo "Launching Sparrow in signet mode from: $SPARROW_APP_PATH"
    exec open "$SPARROW_APP_PATH" --args -n signet
  fi

  echo "Sparrow.app was not found at: $SPARROW_APP_PATH" >&2
  echo "Set SPARROW_APP_PATH or launch Sparrow manually in signet mode." >&2
  exit 1
fi

if command -v sparrow >/dev/null 2>&1; then
  echo "Launching Sparrow in signet mode via 'sparrow -n signet'"
  exec sparrow -n signet
fi

echo "Could not find a Sparrow launcher on this machine." >&2
echo "Launch Sparrow manually in signet mode, then use the tunnel script." >&2
exit 1
