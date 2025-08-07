#!/usr/bin/env node
/*
 * MCP server implemented in TypeScript using the official
 * `@modelcontextprotocol/sdk`.  This file defines three tools
 * analogous to the Python implementation: `health_check`, `echo_text`
 * and `compute_sum`.  The server supports both stdio and
 * streamable HTTP transports.  It writes logs to stderr and never
 * prints to stdout, as required for stdio transports【276509196029062†L116-L134】.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHttpServerTransport } from '@modelcontextprotocol/sdk/server/http.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Tools definitions as JSON Schema objects.  MCP clients use these
// schemas to validate input and output.  A more expressive approach
// would use Zod directly, but the low‑level SDK expects JSON schema.
const healthCheckTool: Tool = {
  name: 'health_check',
  description: 'Return a simple health status indicator.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  outputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Health status',
      },
    },
    required: ['status'],
  },
};

const echoTextTool: Tool = {
  name: 'echo_text',
  description: 'Echo back a provided string.',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text to echo back.',
      },
    },
    required: ['text'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Echoed string.',
      },
    },
    required: ['text'],
  },
};

const computeSumTool: Tool = {
  name: 'compute_sum',
  description: 'Add two numbers and return their sum.',
  inputSchema: {
    type: 'object',
    properties: {
      a: {
        type: 'number',
        description: 'First addend.',
      },
      b: {
        type: 'number',
        description: 'Second addend.',
      },
    },
    required: ['a', 'b'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      result: {
        type: 'number',
        description: 'Sum of the inputs.',
      },
    },
    required: ['result'],
  },
};

// All tools exposed by this server.  The list is returned when the
// client requests the list of available tools.
const tools: Tool[] = [healthCheckTool, echoTextTool, computeSumTool];

// Create the MCP server.  The second argument is optional and can be
// used to pre‑declare capabilities; here we leave it empty and
// implement ListTools/CallTool handlers manually.
const server = new Server(
  {
    name: 'mcp-specialist-typescript',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle listing tools.  Return the `tools` array to the client.
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle calling tools.  Validate input manually and return structured
// responses.  Errors are returned with `isError: true` to signal
// failure.
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case 'health_check':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ status: 'ok' }),
            },
          ],
        };
      case 'echo_text': {
        if (!args || typeof (args as any).text !== 'string') {
          throw new Error('Invalid input: expected { text: string }');
        }
        const text = (args as any).text as string;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ text }),
            },
          ],
        };
      }
      case 'compute_sum': {
        if (!args || typeof (args as any).a !== 'number' || typeof (args as any).b !== 'number') {
          throw new Error('Invalid input: expected { a: number, b: number }');
        }
        const { a, b } = args as { a: number; b: number };
        // Example timeout: reject if computation takes too long
        const result = await new Promise<number>((resolve, reject) => {
          // In real scenarios you might perform async work here.
          // We simulate with a setImmediate to show asynchronous behaviour.
          setImmediate(() => {
            resolve(a + b);
          });
          // Timeouts could be implemented using setTimeout + reject.
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ result }),
            },
          ],
        };
      }
      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (err) {
    // Write errors to stderr and return a structured error response.
    console.error('Tool execution error:', err);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: (err as Error).message ?? String(err) }),
        },
      ],
      isError: true,
    };
  }
});

// Start the server using the requested transport.  Environment
// variables control the transport type and HTTP port.  See the
// README for usage instructions.
async function run() {
  const transportMode = process.env.MCP_TRANSPORT?.toLowerCase() ?? 'stdio';
  if (transportMode === 'http') {
    const port = parseInt(process.env.MCP_HTTP_PORT || '3334', 10);
    const host = process.env.MCP_HTTP_HOST || '127.0.0.1';
    const transport = new StreamableHttpServerTransport({ port, host });
    await server.connect(transport);
    console.error(`TypeScript MCP server listening on http://${host}:${port}/mcp`);
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('TypeScript MCP server listening on stdio');
  }
}

run().catch((error) => {
  console.error('Fatal error starting MCP server:', error);
  process.exit(1);
});