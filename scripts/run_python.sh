#!/usr/bin/env bash
# Run the Python MCP server via uv.

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)

# Load environment variables from .env if present
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  # shellcheck disable=SC1090
  source "$PROJECT_ROOT/.env"
fi

# Default transport is stdio.  Override via MCP_TRANSPORT.
export MCP_TRANSPORT=${MCP_TRANSPORT:-stdio}

cd "$PROJECT_ROOT"
uv python mcp_specialist/python_server/server.py