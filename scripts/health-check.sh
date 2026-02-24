#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
GRAFANA_PORT="${GRAFANA_PORT:-3001}"

echo "=== AMG Health Check ==="

# Check agent
echo -n "Agent (port $PORT): "
if curl -sf "http://localhost:$PORT/health" >/dev/null 2>&1; then
  echo "OK"
else
  echo "FAIL"
fi

# Check PostgreSQL
echo -n "PostgreSQL: "
if docker exec amg-postgres pg_isready -U amg -d amg >/dev/null 2>&1; then
  echo "OK"
else
  echo "FAIL"
fi

# Check Grafana
echo -n "Grafana (port $GRAFANA_PORT): "
if curl -sf "http://localhost:$GRAFANA_PORT/api/health" >/dev/null 2>&1; then
  echo "OK"
else
  echo "FAIL"
fi

# Check latest snapshot
echo ""
echo "--- Latest Portfolio Snapshot ---"
docker exec amg-postgres psql -U amg -d amg -c \
  "SELECT timestamp, sol_balance, total_portfolio_value FROM portfolio_snapshots ORDER BY timestamp DESC LIMIT 1;" \
  2>/dev/null || echo "No snapshots yet"

# Check recent decisions
echo ""
echo "--- Recent Decisions ---"
docker exec amg-postgres psql -U amg -d amg -c \
  "SELECT timestamp, action, confidence, success, dry_run FROM agent_decisions ORDER BY timestamp DESC LIMIT 5;" \
  2>/dev/null || echo "No decisions yet"
