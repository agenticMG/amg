#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Restarting AMG agent..."
./scripts/stop.sh
sleep 1
./scripts/start.sh
