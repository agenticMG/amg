#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

PIDFILE=".amg.pid"
LOGFILE="amg-agent.log"

# Check if already running
if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "AMG agent is already running (PID $(cat "$PIDFILE"))"
  echo "Use ./scripts/stop.sh to stop it first, or ./scripts/restart.sh"
  exit 1
fi

# Ensure infrastructure is up
echo "Starting infrastructure..."
docker compose up -d postgres
echo "Waiting for PostgreSQL..."
until docker exec amg-postgres pg_isready -U amg -d amg -q 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL ready."

# Start agent
echo "Starting AMG agent..."
nohup bun run agent/src/index.ts >> "$LOGFILE" 2>&1 &
echo $! > "$PIDFILE"
echo "AMG agent started (PID $!)"
echo "Logs: tail -f $LOGFILE"
