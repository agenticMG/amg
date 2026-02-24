#!/usr/bin/env bash
set -euo pipefail

echo "=== AMG Setup ==="

# Check prerequisites
command -v bun >/dev/null 2>&1 || { echo "Error: bun is required. Install from https://bun.sh"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Warning: docker not found. Required for production deployment."; }

# Copy env if needed
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — please edit with your credentials"
fi

# Install dependencies
echo "Installing dependencies..."
bun install

# Build all packages
echo "Building packages..."
bun run build

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit .env with your credentials (SOLANA_PRIVATE_KEY, ANTHROPIC_API_KEY, etc.)"
echo "  2. Start with: docker compose up -d"
echo "  3. Or dev mode: bun run dev"
echo "  4. Grafana at http://localhost:3001 (admin / amg_admin)"
