import { notionApiUrl, notionApiVersion } from "../../providers/notion/config"
import { type NotionCredentials } from "../../providers/notion/credentials"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "./policy"
import { type ToolBundle } from "./types"

export function createNotionToolBundle(
  args: {
    credentials: NotionCredentials
  } & ToolPermissionInput
): ToolBundle {
  return {
    mcpServers: [
      {
        name: "notion",
        command: "node",
        args: ["/tmp/milo-workspace/milo-notion-mcp.mjs"],
        env: {
          MILO_NOTION_ACCESS_TOKEN: args.credentials.accessToken,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/tmp/milo-workspace/milo-notion-mcp.mjs",
        content: createNotionProxyScript(),
      },
    ],
    preflights: [
      {
        type: "notion",
        credentials: args.credentials,
      },
    ],
    promptedTools: getPromptedTools(args),
  }
}

export function createNotionTokenPreflightCommand() {
  return notionTokenPreflightCommand
}

export function createNotionProxyScript() {
  return notionProxyScript
}

const notionTokenPreflightCommand = [
  "node <<'NODE'",
  "async function main() {",
  "  const token = process.env.MILO_NOTION_ACCESS_TOKEN;",
  "  if (!token) {",
  "    throw new Error('Missing Notion access token');",
  "  }",
  "  const response = await fetch('https://api.notion.com/v1/users/me', {",
  "    headers: {",
  "      authorization: 'Bearer ' + token,",
  `      'notion-version': ${JSON.stringify(notionApiVersion)},`,
  "    },",
  "  });",
  "  const body = await response.json();",
  "  if (!response.ok) {",
  "    throw new Error('Notion token preflight failed: ' + JSON.stringify(body));",
  "  }",
  "  console.log('Notion token preflight passed');",
  "}",
  "main().catch((error) => {",
  "  console.error(error);",
  "  process.exit(1);",
  "});",
  "NODE",
].join("\n")

const notionProxyScript = `
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const accessToken = requiredEnv("MILO_NOTION_ACCESS_TOKEN");
const notionApiUrl = ${JSON.stringify(notionApiUrl)};
const notionApiVersion = ${JSON.stringify(notionApiVersion)};

const allTools = [
  {
    name: "notion_search",
    description: "Search shared Notion pages and databases by query text.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: { type: "string" },
        filter: { type: "object", additionalProperties: true },
        sort: { type: "object", additionalProperties: true },
        page_size: { type: "number" },
        start_cursor: { type: "string" },
      },
    },
  },
  {
    name: "notion_get_page",
    description: "Read Notion page metadata and properties by page ID.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["pageId"],
      properties: {
        pageId: { type: "string" },
      },
    },
  },
  {
    name: "notion_get_block_children",
    description: "Read child blocks from a Notion page or block ID.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["blockId"],
      properties: {
        blockId: { type: "string" },
        page_size: { type: "number" },
        start_cursor: { type: "string" },
      },
    },
  },
  {
    name: "notion_query_data_source",
    description: "Query a Notion data source. For older workspaces, set sourceType to database to query a database ID.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["sourceId"],
      properties: {
        sourceId: { type: "string" },
        sourceType: { type: "string", enum: ["data_source", "database"] },
        filter: { type: "object", additionalProperties: true },
        sorts: { type: "array", items: { type: "object", additionalProperties: true } },
        page_size: { type: "number" },
        start_cursor: { type: "string" },
      },
    },
  },
  {
    name: "notion_list_comments",
    description: "Read open comments for a Notion page or block ID.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["blockId"],
      properties: {
        blockId: { type: "string" },
        page_size: { type: "number" },
        start_cursor: { type: "string" },
      },
    },
  },
  {
    name: "notion_create_page",
    description: "Create a Notion page or database record using Notion API page fields.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["parent"],
      properties: {
        parent: { type: "object", additionalProperties: true },
        properties: { type: "object", additionalProperties: true },
        children: { type: "array", items: { type: "object", additionalProperties: true } },
        icon: { type: "object", additionalProperties: true },
        cover: { type: "object", additionalProperties: true },
      },
    },
  },
  {
    name: "notion_update_page",
    description: "Update a Notion page's properties, icon, cover, or archive state.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["pageId"],
      properties: {
        pageId: { type: "string" },
        properties: { type: "object", additionalProperties: true },
        icon: { type: "object", additionalProperties: true },
        cover: { type: "object", additionalProperties: true },
        archived: { type: "boolean" },
        in_trash: { type: "boolean" },
      },
    },
  },
  {
    name: "notion_append_block_children",
    description: "Append child blocks to a Notion page or block.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["blockId", "children"],
      properties: {
        blockId: { type: "string" },
        children: { type: "array", items: { type: "object", additionalProperties: true } },
        after: { type: "string" },
      },
    },
  },
  {
    name: "notion_create_comment",
    description: "Add a Notion page comment or reply to an existing discussion. Provide exactly one of pageId or discussionId.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["markdown"],
      properties: {
        pageId: { type: "string" },
        discussionId: { type: "string" },
        markdown: { type: "string" },
      },
    },
  },
];

const tools = filterEnabledTools(allTools);

const server = new Server(
  { name: "milo-notion", version: "0.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments ?? {};

  if (!tools.some((tool) => tool.name === toolName)) {
    throw new McpError(ErrorCode.InvalidParams, "Unknown Notion tool: " + toolName);
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
  if (toolName === "notion_search") {
    return await notionJson("POST", "/search", pickBody(args, ["query", "filter", "sort", "page_size", "start_cursor"]));
  }

  if (toolName === "notion_get_page") {
    return await notionJson("GET", "/pages/" + encodeURIComponent(requiredString(args.pageId, "pageId")));
  }

  if (toolName === "notion_get_block_children") {
    const blockId = requiredString(args.blockId, "blockId");
    return await notionJson("GET", "/blocks/" + encodeURIComponent(blockId) + "/children", undefined, paginationParams(args));
  }

  if (toolName === "notion_query_data_source") {
    const sourceId = requiredString(args.sourceId, "sourceId");
    const sourceType = args.sourceType === "database" ? "databases" : "data_sources";
    return await notionJson("POST", "/" + sourceType + "/" + encodeURIComponent(sourceId) + "/query", pickBody(args, ["filter", "sorts", "page_size", "start_cursor"]));
  }

  if (toolName === "notion_list_comments") {
    return await notionJson("GET", "/comments", undefined, {
      block_id: requiredString(args.blockId, "blockId"),
      ...paginationParams(args),
    });
  }

  if (toolName === "notion_create_page") {
    return await notionJson("POST", "/pages", pickBody(args, ["parent", "properties", "children", "icon", "cover"]));
  }

  if (toolName === "notion_update_page") {
    const pageId = requiredString(args.pageId, "pageId");
    return await notionJson("PATCH", "/pages/" + encodeURIComponent(pageId), pickBody(args, ["properties", "icon", "cover", "archived", "in_trash"]));
  }

  if (toolName === "notion_append_block_children") {
    const blockId = requiredString(args.blockId, "blockId");
    return await notionJson("PATCH", "/blocks/" + encodeURIComponent(blockId) + "/children", pickBody(args, ["children", "after"]));
  }

  if (toolName === "notion_create_comment") {
    return await createComment(args);
  }

  throw new McpError(ErrorCode.InvalidParams, "Unknown Notion tool: " + toolName);
}

async function createComment(args) {
  const markdown = requiredString(args.markdown, "markdown");
  const pageId = typeof args.pageId === "string" && args.pageId !== "" ? args.pageId : undefined;
  const discussionId = typeof args.discussionId === "string" && args.discussionId !== "" ? args.discussionId : undefined;

  if ((pageId === undefined && discussionId === undefined) || (pageId !== undefined && discussionId !== undefined)) {
    throw new McpError(ErrorCode.InvalidParams, "Provide exactly one of pageId or discussionId");
  }

  return await notionJson("POST", "/comments", {
    ...(pageId === undefined ? { discussion_id: discussionId } : { parent: { page_id: pageId } }),
    markdown,
  });
}

async function notionJson(method, path, body, queryParams = {}) {
  const url = new URL(notionApiUrl + path);

  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      authorization: "Bearer " + accessToken,
      "content-type": "application/json",
      "notion-version": notionApiVersion,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const result = text === "" ? null : JSON.parse(text);

  if (!response.ok) {
    throw new McpError(
      ErrorCode.InternalError,
      "Notion API request failed: " + JSON.stringify(result),
    );
  }

  return result;
}

function paginationParams(args) {
  return pickBody(args, ["page_size", "start_cursor"]);
}

function pickBody(args, keys) {
  const body = {};

  for (const key of keys) {
    if (args[key] !== undefined) {
      body[key] = args[key];
    }
  }

  return Object.keys(body).length === 0 ? undefined : body;
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new McpError(ErrorCode.InvalidParams, label + " is required");
  }

  return value.trim();
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
