#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

PIDFILE=".amg.pid"

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping AMG agent (PID $PID)..."
    kill "$PID"
    # Wait up to 10 seconds for clean shutdown
    for i in $(seq 1 10); do
      kill -0 "$PID" 2>/dev/null || break
      sleep 1
    done
    if kill -0 "$PID" 2>/dev/null; then
      echo "Force killing..."
      kill -9 "$PID"
    fi
    echo "AMG agent stopped."
  else
    echo "AMG agent not running (stale pidfile)."
  fi
  rm -f "$PIDFILE"
else
  echo "No pidfile found. Checking for running agent..."
  PIDS=$(pgrep -f "bun run agent/src/index.ts" || true)
  if [ -n "$PIDS" ]; then
    echo "Killing agent processes: $PIDS"
    kill $PIDS
    echo "Done."
  else
    echo "AMG agent is not running."
  fi
fi
