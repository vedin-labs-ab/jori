export function createSlackProxyScript() {
  return slackProxyScript
}

const slackProxyScript = `
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const contextTools = [
  "channels_list",
  "conversations_history",
  "conversations_replies",
  "conversations_search_messages",
  "users_search",
].join(",");
const cacheKey = sanitizeCacheKey(requiredEnv("MILO_SLACK_CACHE_KEY"));

const upstreams = [
  await createUpstream("context", ["--transport", "stdio", "--enabled-tools", contextTools], {
    SLACK_MCP_XOXP_TOKEN: requiredEnv("MILO_SLACK_USER_TOKEN"),
    SLACK_MCP_ENABLED_TOOLS: contextTools,
    SLACK_MCP_CHANNELS_CACHE: "/tmp/milo-slack-" + cacheKey + "-context-channels-cache.json",
    SLACK_MCP_USERS_CACHE: "/tmp/milo-slack-" + cacheKey + "-context-users-cache.json",
    SLACK_MCP_LOG_LEVEL: "error",
  }),
  await createUpstream("reply", ["--transport", "stdio", "--enabled-tools", "conversations_add_message"], {
    SLACK_MCP_XOXB_TOKEN: requiredEnv("MILO_SLACK_BOT_TOKEN"),
    SLACK_MCP_ADD_MESSAGE_TOOL: "true",
    SLACK_MCP_ENABLED_TOOLS: "conversations_add_message",
    SLACK_MCP_CHANNELS_CACHE: "/tmp/milo-slack-" + cacheKey + "-reply-channels-cache.json",
    SLACK_MCP_USERS_CACHE: "/tmp/milo-slack-" + cacheKey + "-reply-users-cache.json",
    SLACK_MCP_LOG_LEVEL: "error",
  }),
];

const toolRoutes = new Map();
const tools = [];

for (const upstream of upstreams) {
  const response = await upstream.client.listTools();
  for (const tool of response.tools) {
    if (toolRoutes.has(tool.name)) {
      throw new Error("Duplicate Slack MCP tool: " + tool.name);
    }
    toolRoutes.set(tool.name, upstream);
    tools.push(tool);
  }
}

const server = new Server(
  { name: "milo-slack-proxy", version: "0.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const upstream = toolRoutes.get(toolName);

  if (upstream === undefined) {
    throw new McpError(ErrorCode.InvalidParams, "Unknown Slack tool: " + toolName);
  }

  return await upstream.client.callTool({
    name: toolName,
    arguments: request.params.arguments ?? {},
  });
});

const transport = new StdioServerTransport();
await server.connect(transport);

async function createUpstream(label, args, env) {
  const transport = new StdioClientTransport({
    command: "slack-mcp-server",
    args,
    env: {
      ...process.env,
      ...env,
    },
  });
  const client = new Client(
    { name: "milo-slack-proxy-" + label, version: "0.0.0" },
    { capabilities: {} },
  );
  await client.connect(transport);
  return { label, client };
}

function requiredEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error("Missing " + name);
  }
  return value;
}

function sanitizeCacheKey(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}
`
