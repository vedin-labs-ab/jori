import { type MicrosoftCredentials } from "../providers/microsoft/credentials"
import { type RuntimeTarget, type ToolBundle } from "./tools"

export function createMicrosoftTokenPreflightCommand() {
  return microsoftTokenPreflightCommand
}

export function createMicrosoftGraphMcpScript() {
  return microsoftGraphMcpScript
}

export function createMicrosoftToolBundle(args: {
  credentials: MicrosoftCredentials
  target: Partial<Extract<RuntimeTarget, { provider: "microsoft" }>>
}): ToolBundle {
  return {
    mcpServers: [
      {
        name: "microsoft",
        command: "node",
        args: ["/tmp/milo-workspace/milo-microsoft-mcp.mjs"],
        env: {
          MILO_MICROSOFT_ACCESS_TOKEN: args.credentials.accessToken,
          MILO_MICROSOFT_TARGET_JSON: JSON.stringify(args.target),
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/tmp/milo-workspace/milo-microsoft-mcp.mjs",
        content: createMicrosoftGraphMcpScript(),
      },
    ],
    preflights: [
      {
        type: "microsoft",
        credentials: args.credentials,
      },
    ],
  }
}

const microsoftTokenPreflightCommand = [
  "node <<'NODE'",
  "async function main() {",
  "  const token = process.env.MILO_MICROSOFT_ACCESS_TOKEN;",
  "  if (!token) {",
  "    throw new Error('Missing Microsoft access token');",
  "  }",
  "  const response = await fetch('https://graph.microsoft.com/v1.0/me?$select=id', {",
  "    headers: { authorization: 'Bearer ' + token },",
  "  });",
  "  const body = await response.json();",
  "  if (!response.ok || typeof body.id !== 'string') {",
  "    throw new Error('Microsoft token preflight failed: ' + JSON.stringify(body));",
  "  }",
  "  console.log('Microsoft token preflight passed');",
  "}",
  "main().catch((error) => {",
  "  console.error(error);",
  "  process.exit(1);",
  "});",
  "NODE",
].join("\n")

const microsoftGraphMcpScript = `
import { Client } from "@microsoft/microsoft-graph-client";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const accessToken = requiredEnv("MILO_MICROSOFT_ACCESS_TOKEN");
const target = JSON.parse(requiredEnv("MILO_MICROSOFT_TARGET_JSON"));

const graph = Client.init({
  authProvider: (done) => done(null, accessToken),
});

const tools = [
  {
    name: "teams_get_context",
    description: "Read recent Teams context for the conversation that triggered this run.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        limit: { type: "number" },
      },
    },
  },
  {
    name: "teams_reply",
    description: "Reply to the Teams conversation that triggered this run.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["content"],
      properties: {
        content: { type: "string" },
        contentType: {
          type: "string",
          enum: ["html", "text"],
        },
      },
    },
  },
  {
    name: "microsoft_graph_get",
    description: "Read narrowly-scoped Microsoft 365 context with Graph when it is needed for the Teams request.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["path"],
      properties: {
        path: { type: "string" },
      },
    },
  },
];

const server = new Server(
  { name: "milo-microsoft", version: "0.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments ?? {};

  if (!tools.some((tool) => tool.name === toolName)) {
    throw new McpError(ErrorCode.InvalidParams, "Unknown Microsoft tool: " + toolName);
  }

  const result = await callTool(toolName, args);

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

async function callTool(toolName, args) {
  if (toolName === "teams_get_context") {
    return await getTeamsContext(args.limit);
  }

  if (toolName === "teams_reply") {
    if (typeof args.content !== "string" || args.content.trim() === "") {
      throw new McpError(ErrorCode.InvalidParams, "Reply content is required");
    }

    return await replyToTeams(args.content, args.contentType);
  }

  if (toolName === "microsoft_graph_get") {
    if (typeof args.path !== "string" || args.path.trim() === "") {
      throw new McpError(ErrorCode.InvalidParams, "Graph path is required");
    }

    return await graphGet(args.path);
  }

  throw new McpError(ErrorCode.InvalidParams, "Unknown Microsoft tool: " + toolName);
}

async function getTeamsContext(limit) {
  const top = normalizeLimit(limit);

  if (target.chatId !== undefined) {
    return await graph
      .api("/chats/" + encodePath(target.chatId) + "/messages")
      .top(top)
      .orderby("createdDateTime desc")
      .get();
  }

  if (
    target.teamId !== undefined &&
    target.channelId !== undefined &&
    target.messageId !== undefined
  ) {
    const rootMessage = await graph
      .api(
        "/teams/" +
          encodePath(target.teamId) +
          "/channels/" +
          encodePath(target.channelId) +
          "/messages/" +
          encodePath(target.messageId),
      )
      .get();
    const replies = await graph
      .api(
        "/teams/" +
          encodePath(target.teamId) +
          "/channels/" +
          encodePath(target.channelId) +
          "/messages/" +
          encodePath(target.messageId) +
          "/replies",
      )
      .top(top)
      .get();

    return {
      message: rootMessage,
      replies: replies.value ?? [],
    };
  }

  throw new McpError(ErrorCode.InvalidParams, "This run does not have a Teams conversation target");
}

async function replyToTeams(content, contentType) {
  const body = {
    body: {
      contentType: contentType === "text" ? "text" : "html",
      content,
    },
  };

  if (target.chatId !== undefined) {
    return await graph
      .api("/chats/" + encodePath(target.chatId) + "/messages")
      .post(body);
  }

  if (
    target.teamId !== undefined &&
    target.channelId !== undefined &&
    target.messageId !== undefined
  ) {
    return await graph
      .api(
        "/teams/" +
          encodePath(target.teamId) +
          "/channels/" +
          encodePath(target.channelId) +
          "/messages/" +
          encodePath(target.messageId) +
          "/replies",
      )
      .post(body);
  }

  throw new McpError(ErrorCode.InvalidParams, "This run does not have a Teams reply target");
}

async function graphGet(path) {
  const normalizedPath = path.startsWith("/") ? path : "/" + path;

  if (!isAllowedGraphReadPath(normalizedPath)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "This run may only read Teams context plus /me mail, calendar, and drive context",
    );
  }

  return await graph.api(normalizedPath).get();
}

function isAllowedGraphReadPath(path) {
  return [
    "/me",
    "/me/",
    "/me/messages",
    "/me/mailFolders",
    "/me/events",
    "/me/calendar",
    "/me/calendarView",
    "/me/drive",
    "/me/drive/",
  ].some((prefix) => path === prefix || path.startsWith(prefix));
}

function normalizeLimit(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 25;
  }

  return Math.max(1, Math.min(50, Math.round(value)));
}

function encodePath(value) {
  return encodeURIComponent(value);
}

function requiredEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error("Missing " + name);
  }
  return value;
}
`
