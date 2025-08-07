"""FastMCP server exposing basic tools for the MCP specialist mode.

This server demonstrates how to implement a minimal MCP server using
the official `fastmcp` Python SDK.  It provides three tools:

* **health_check** – returns `{status:"ok"}` to allow health probes.
* **echo_text** – echoes back a provided string argument.
* **compute_sum** – sums two numeric parameters and returns the result.

Features included:

* Pydantic models for input/output validation and documentation.
* Structured error handling with timeouts and logging to `stderr` only.
* Optional support for streamable HTTP transport via the `MCP_TRANSPORT`
  and `MCP_HTTP_PORT` environment variables.

Note: Avoid writing to `stdout` because stdio transport uses it for
JSON‑RPC messages【276509196029062†L116-L134】.  Use the `logging` module instead.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Dict, Literal

from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field


# Configure logging: send all messages to stderr only.  Do not
# configure a stream handler that writes to stdout.  The default
# `StreamHandler` writes to stderr when no stream is specified.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Create the FastMCP server.  The server name identifies this
# implementation when multiple servers are registered with Cursor.
mcp = FastMCP("mcp-specialist-python")


class HealthCheckResult(BaseModel):
    """Output schema for the health_check tool."""

    status: Literal["ok"] = Field(..., description="Health status indicator")


@mcp.tool("health_check")
async def health_check() -> HealthCheckResult:
    """Return a simple health status.

    This tool is useful for verifying that the server is running and
    responding to JSON‑RPC requests.  It takes no arguments and
    returns a fixed object `{status:"ok"}`.
    """
    return HealthCheckResult(status="ok")


class EchoParams(BaseModel):
    """Input schema for the echo_text tool."""

    text: str = Field(..., description="Text to echo back to the caller.")


class EchoResult(BaseModel):
    """Output schema for the echo_text tool."""

    text: str = Field(..., description="The same text that was provided.")


@mcp.tool("echo_text")
async def echo_text(params: EchoParams) -> EchoResult:
    """Echo back a provided string.

    Args:
        params: A Pydantic model with a single string field named
            `text`.  FastMCP uses the model’s type hints and
            docstring to derive the tool schema automatically.

    Returns:
        EchoResult: A model containing the same string.  If the caller
        provides an empty string, it will be returned unchanged.
    """
    return EchoResult(text=params.text)


class SumParams(BaseModel):
    """Input schema for the compute_sum tool."""

    a: float = Field(..., description="The first addend.")
    b: float = Field(..., description="The second addend.")


class SumResult(BaseModel):
    """Output schema for the compute_sum tool."""

    result: float = Field(..., description="The sum of the two inputs.")


@mcp.tool("compute_sum")
async def compute_sum(params: SumParams) -> SumResult:
    """Add two numbers together.

    This tool demonstrates simple arithmetic with type checking and
    includes a timeout to prevent runaway computations.  It returns
    structured errors on invalid inputs.

    Args:
        params: A Pydantic model containing two numeric values.

    Returns:
        SumResult: A model containing the sum of the inputs.
    """
    try:
        # Use an asyncio timeout to limit execution to a reasonable
        # duration.  Although this computation is trivial, the pattern
        # demonstrates how to guard long‑running calls.
        async with asyncio.timeout(5):
            result = params.a + params.b
            return SumResult(result=result)
    except asyncio.TimeoutError as exc:
        logger.error("compute_sum timed out", exc_info=exc)
        raise RuntimeError("timeout: operation exceeded 5 seconds")
    except Exception as exc:
        # Catch and log any unexpected exceptions.  Do not leak
        # sensitive information back to the client.
        logger.error("compute_sum encountered an unexpected error", exc_info=exc)
        raise RuntimeError("internal_error: failed to compute sum")


def main() -> None:
    """Entrypoint for running the server.

    Depending on the `MCP_TRANSPORT` environment variable, the server
    will run using stdio (the default) or streamable HTTP transport.
    When `MCP_TRANSPORT=http`, the server listens on `MCP_HTTP_PORT`
    (default: 3333) and exposes the MCP endpoint at `/mcp`.
    """
    transport = os.environ.get("MCP_TRANSPORT", "stdio").lower()

    if transport == "stdio":
        # When using stdio, FastMCP’s CLI automatically reads from
        # stdin/stdout, so simply running the script is sufficient.
        logger.info("Starting MCP server using stdio transport")
        mcp.run()
    elif transport == "http":
        # Expose the server via streamable HTTP transport.  The
        # `mcp.run_http` helper starts an ASGI server under the hood.
        port = int(os.environ.get("MCP_HTTP_PORT", "3333"))
        host = os.environ.get("MCP_HTTP_HOST", "127.0.0.1")
        logger.info("Starting MCP server on http://%s:%s/mcp", host, port)
        mcp.run_http(host=host, port=port)
    else:
        logger.error("Unknown MCP_TRANSPORT value: %s", transport)
        raise SystemExit("Invalid MCP_TRANSPORT; expected 'stdio' or 'http'")


if __name__ == "__main__":
    # Run the main function.  This guard prevents the code from
    # executing when imported as a module.
    main()