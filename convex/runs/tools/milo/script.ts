export function createMiloMcpScript() {
  return miloMcpScript
}

const miloMcpScript = `
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

const allTools = [
  {
    name: "request_tool_approval",
    description: "Request user approval for one prompted tool call. This sends the approval request and code to the user. Use this instead of sending a normal message asking for approval, then stop after the request succeeds.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["provider", "tool", "args", "summary", "handoff"],
      properties: {
        provider: {
          enum: ["milo", "slack", "linear", "github", "gmail", "googleCalendar", "notion", "microsoftEmail", "microsoftCalendar"],
        },
        tool: { type: "string" },
        args: { type: "object" },
        summary: { type: "string", description: "Short user-facing description of the exact action being approved." },
        handoff: {
          type: "object",
          additionalProperties: false,
          required: ["objective", "progress", "next"],
          properties: {
            objective: { type: "string", description: "The user's overall goal." },
            progress: { type: "string", description: "Useful context gathered before approval." },
            next: { type: "string", description: "What the continuation agent should do after the approved call result is available." },
          },
        },
      },
    },
  },
  {
    name: "add_schedule",
    description: "Create a Milo schedule. Use a one-shot UTC ISO timestamp or a recurring five-field UTC cron expression. The output target is required; ask the user for clarification before calling this tool if it is ambiguous.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["name", "description", "schedule", "output"],
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        metadata: {},
        schedule: {
          oneOf: [
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "runAt"],
              properties: {
                type: { const: "oneShot" },
                runAt: { type: "string", description: "ISO timestamp in UTC, ending with Z." },
              },
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "cron"],
              properties: {
                type: { const: "recurring" },
                cron: { type: "string", description: "Five-field cron expression interpreted in UTC." },
              },
            },
          ],
        },
        output: slackOutputSchema(),
      },
    },
  },
  {
    name: "search_schedules",
    description: "Search Milo schedules by name or description. Omit query for list-like behavior.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: { type: "string" },
        includeCompleted: { type: "boolean" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "read_schedule",
    description: "Read one Milo schedule by id.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["scheduleId"],
      properties: {
        scheduleId: { type: "string" },
      },
    },
  },
  {
    name: "update_schedule",
    description: "Update a Milo schedule. Provide only fields that should change.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["scheduleId"],
      properties: {
        scheduleId: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        metadata: {},
        schedule: {
          oneOf: [
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "runAt"],
              properties: {
                type: { const: "oneShot" },
                runAt: { type: "string" },
              },
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "cron"],
              properties: {
                type: { const: "recurring" },
                cron: { type: "string" },
              },
            },
          ],
        },
        output: slackOutputSchema(),
      },
    },
  },
  {
    name: "delete_schedule",
    description: "Delete a Milo schedule and cancel its pending Convex scheduled function.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["scheduleId"],
      properties: {
        scheduleId: { type: "string" },
      },
    },
  },
];

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

function slackOutputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["type", "channelId"],
    properties: {
      type: { const: "slack" },
      channelId: { type: "string" },
      threadId: { type: "string" },
    },
  };
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

  return allTools.filter((tool) => tool.name === "request_tool_approval" || enabledTools.has(tool.name));
}

function readEnabledTools() {
  const value = process.env.MILO_ENABLED_TOOLS;

  if (value === undefined || value === "") {
    return undefined;
  }

  return new Set(value.split(",").filter(Boolean));
}
`
