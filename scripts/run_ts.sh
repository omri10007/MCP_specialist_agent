#!/usr/bin/env bash
# Run the TypeScript MCP server.

# This helper script compiles and runs the TypeScript implementation
# using environment variables defined in `.env` if present.  It
# chooses the transport (stdio vs. HTTP) based on `MCP_TRANSPORT`
# and sets reasonable defaults.  To use this script, ensure you have
# installed the dependencies in `typescript_server/package.json` via
# `npm install` and built the server with `npm run build`.

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

# Navigate into the TypeScript server directory
cd "$PROJECT_ROOT/mcp_specialist/typescript_server"

# Build the TypeScript sources if needed
npm run build

# Execute the server with Node.js
if [[ "$MCP_TRANSPORT" == "http" ]]; then
  : "Running TypeScript server with HTTP transport"
else
  : "Running TypeScript server with stdio transport"
fi
node dist/index.mjs