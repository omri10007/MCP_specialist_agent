# MCP Specialist Custom Mode for Cursor

This repository contains a **Model Context Protocol (MCP)** specialist
custom mode for [Cursor](https://cursor.com).  It is designed to help
you spin up, configure and operate MCP servers directly from within
Cursor.  The custom mode exposes strongly‑typed tools via both
Python and TypeScript implementations and includes ready‑to‑use
configuration files, example servers and development scripts.

## Contents

The project is divided into three top‑level folders and a `.cursor` folder:

| Path | Purpose |
|---|---|
| `python_server/` | A FastMCP based MCP server written in Python.  Provides a `health_check` tool, an `echo_text` tool and demonstrates proper typing, structured errors and logging to `stderr`. |
| `typescript_server/` | A Node/TypeScript MCP server using the official `@modelcontextprotocol/sdk`.  Mirrors the Python server’s functionality and supports both stdio and Streamable HTTP transports.  Uses [`zod`](https://github.com/colinhacks/zod) for schema validation. |
| `.cursor/mcp.json` | Project‑level MCP configuration for Cursor.  Registers both the Python and TypeScript servers as tools. |
| `~/.cursor/mcp.json` (example only) | Example global configuration demonstrating how to register the servers for every Cursor project on your machine. |
| `.cursor/rules/mcp-specialist.mdc` | A rule file guiding Cursor’s agent to ask clarifying questions before generating a new MCP server and to follow best practices outlined in the MCP specification. |
| `cursor_custom_mode_instructions.md` | System instructions to be pasted into Cursor’s Custom Mode editor when creating the MCP specialist mode. |
| `.env.example` | Example environment variables for both servers.  Copy to `.env` and fill in values as needed. |
| `scripts/` | Shell scripts for running and testing the servers in development and production modes. |

## Installation

### Prerequisites

1. **Python 3.11** or higher with [`uv`](https://astral.sh/uv) installed.  The
   FastMCP SDK requires Python 3.10+ and is distributed via the `mcp[cli]`
   extra.  See the [MCP server quickstart](https://modelcontextprotocol.io/quickstart/server) for details【276509196029062†L152-L189】.
2. **Node.js 18** or higher and **npm** for building the TypeScript
   implementation.  The TypeScript server depends on
   `@modelcontextprotocol/sdk` and `zod`.

### Python Server

```sh
# create and activate a virtual environment
uv venv
source .venv/bin/activate

# install dependencies defined in `python_server/pyproject.toml`
uv pip install -e python_server

# run the server via stdio
uv python python_server/server.py

# run the server via streamable HTTP transport
export MCP_TRANSPORT=http
export MCP_HTTP_PORT=3000
uv python python_server/server.py
```

### TypeScript Server

```sh
# install dependencies
cd typescript_server
npm install

# compile TypeScript to ESM
npm run build

# run via stdio
node dist/index.mjs

# run via streamable HTTP transport
MCP_TRANSPORT=http MCP_HTTP_PORT=3001 node dist/index.mjs

# Alternatively, use the helper script
cd ..
./scripts/run_ts.sh
```

## Wiring into Cursor

1. **Copy `mcp.json` into your project**: place `.cursor/mcp.json` in the
   root of your Cursor project.  Cursor automatically detects MCP
   servers defined in this file【905586872762732†L170-L199】.  The example
   config registers both servers with separate names.  You can remove
   either entry if you only need one implementation.
2. **Global configuration (optional)**: copy the contents of
   `~/.cursor/mcp.json` from this repository into your actual
   `~/.cursor/mcp.json`.  This makes the servers available in every
   Cursor project on your machine【905586872762732†L188-L194】.  Ensure the
   `command` and `args` paths are correct for your environment.
3. **Enable MCP servers**: open Cursor settings → Features → *Model Context
   Protocol* and toggle the servers you want to use.  Once enabled,
   the tools will appear in the “Available Tools” list【905586872762732†L204-L217】.
4. **Approve or auto‑run tools**: when calling a tool in chat, Cursor asks
   for approval by default【905586872762732†L220-L223】.  You can enable
   auto‑run if you trust the server for repeated usage【905586872762732†L229-L234】.

## Testing

1. **Run the server**: start either the Python or TypeScript server
   using the instructions above.  For HTTP transport, the server
   listens on the port specified by `MCP_HTTP_PORT` and exposes a
   single endpoint at `/mcp`, as required by the MCP specification
   【188513758930004†L103-L116】.
2. **Verify with MCP Inspector**: open the
   [MCP Inspector](https://github.com/modelcontextprotocol/mcp-inspector)
   and connect to your running server via stdio or HTTP.  Call the
   `health_check` tool; it should return `{ "status": "ok" }`.
3. **Test in Cursor**: open a chat in Cursor and type a command such
   as `health_check()` or `echo_text`.  Cursor will surface the
   corresponding tools from the server.  Approve the call and verify
   the response appears in chat.

## Troubleshooting

- **Missing tools**: ensure the server is running and that
  `.cursor/mcp.json` points to the correct executable.  Refresh the
  tool list in Cursor if necessary.
- **Connection errors**: check the MCP logs in Cursor via
  *View → Output → MCP Logs*.  Errors may indicate issues such as
  invalid JSON messages or authentication failures【905586872762732†L305-L311】.
- **Environment variables**: copy `.env.example` to `.env` and set
  appropriate values for your external APIs.  Cursor passes these
  variables into the server process【905586872762732†L197-L200】.
- **HTTP security**: when running in HTTP mode, bind the server to
  `127.0.0.1` or protect it with authentication to avoid DNS
  rebinding attacks【188513758930004†L120-L131】.

## Acceptance Checklist

- [ ] The Python server builds and runs via `uv` and exposes the
  expected tools on both transports.
- [ ] The TypeScript server compiles, runs via Node.js and exposes
  identical tools via both transports.
- [ ] `.cursor/mcp.json` correctly registers both servers and passes
  environment variables to them.
- [ ] The `health_check` tool returns `{status:"ok"}` in both MCP
  Inspector and Cursor.
- [ ] Both servers use strong typing (`pydantic`/`zod`), include
  structured error responses and implement timeouts.
- [ ] Logs are written to `stderr` only; nothing writes to `stdout`
  besides MCP messages【276509196029062†L116-L134】.
- [ ] Secrets are not hard‑coded.  `.env.example` lists variables
  without values for the user to fill in.
- [ ] Documentation covers installation, usage, integration, testing
  and troubleshooting.