#!/usr/bin/env bash
set -euo pipefail

echo "=== AMG Dev Mode ==="

# Start postgres if not running
if command -v docker >/dev/null 2>&1; then
  echo "Starting PostgreSQL..."
  docker compose up -d postgres
  echo "Waiting for PostgreSQL to be ready..."
  sleep 3
fi

# Run the agent in dev mode
echo "Starting AMG agent (DRY_RUN=true)..."
export DRY_RUN=true
bun run agent/src/index.ts
