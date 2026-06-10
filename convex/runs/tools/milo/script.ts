import { type McpToolDefinition } from "../definitions"

export function createMiloMcpScript(args: { tools: McpToolDefinition[] }) {
  return miloMcpScript({
    toolsJson: JSON.stringify(args.tools),
  })
}

function miloMcpScript(args: { toolsJson: string }) {
  return `
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const convexSiteUrl = requiredEnv("MILO_CONVEX_SITE_URL");
const executionToken = requiredEnv("MILO_EXECUTION_TOKEN");
const instructions = "Use these Milo scheduling tools only when the user asks to create, inspect, update, or delete scheduled work. Schedules use UTC timestamps or UTC cron expressions, and write calls need a clear output target.";
const allTools = ${args.toolsJson};
const tools = filterEnabledTools(allTools);

const server = new Server(
  { name: "milo", version: "0.0.0" },
  { capabilities: { tools: {} }, instructions },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;

  if (!tools.some((tool) => tool.name === toolName)) {
    throw new McpError(ErrorCode.InvalidParams, "Unknown Milo tool: " + toolName);
  }

  const result = await callMilo(toolName, request.params.arguments ?? {});

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);

async function callMilo(tool, args) {
  const response = await fetch(new URL("/milo/mcp", convexSiteUrl), {
    method: "POST",
    headers: {
      authorization: "Bearer " + executionToken,
      "content-type": "application/json",
    },
    body: JSON.stringify({ tool, args }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new McpError(
      ErrorCode.InternalError,
      result?.error ?? "Milo MCP request failed",
    );
  }

  return result;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error("Missing " + name);
  }
  return value;
}

function filterEnabledTools(allTools) {
  const enabledTools = readEnabledTools();

  if (enabledTools === undefined) {
    return allTools;
  }

  return allTools.filter((tool) => enabledTools.has(tool.name));
}

function readEnabledTools() {
  const value = process.env.MILO_ENABLED_TOOLS;

  if (value === undefined || value === "") {
    return undefined;
  }

  return new Set(value.split(",").filter(Boolean));
}
`
}
