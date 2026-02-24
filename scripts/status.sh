#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

PIDFILE=".amg.pid"

echo "=== AMG Status ==="
echo ""

# Agent process
if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "Agent:    RUNNING (PID $(cat "$PIDFILE"))"
else
  echo "Agent:    STOPPED"
fi

# Docker services
echo ""
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker:   not available"

# Latest decision
echo ""
echo "--- Last Decision ---"
docker exec amg-postgres psql -U amg -d amg -t -c \
  "SELECT action || ' (confidence: ' || confidence || ', dry_run: ' || dry_run || ') at ' || timestamp FROM agent_decisions ORDER BY timestamp DESC LIMIT 1;" 2>/dev/null || echo "N/A"

# Decision count
echo ""
echo "--- Stats ---"
docker exec amg-postgres psql -U amg -d amg -t -c \
  "SELECT 'Total decisions: ' || count(*) || ' | Today: ' || count(*) FILTER (WHERE timestamp > now() - interval '24 hours') FROM agent_decisions;" 2>/dev/null || echo "N/A"
