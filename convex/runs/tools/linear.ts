import { linearGraphqlUrl } from "../../providers/linear/config"
import { type LinearCredentials } from "../../providers/linear/credentials"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "./policy"
import { type ToolBundle } from "./types"

export function createLinearToolBundle(
  args: {
    credentials: LinearCredentials
    defaultIssueId?: string
  } & ToolPermissionInput
): ToolBundle {
  return {
    mcpServers: [
      {
        name: "linear",
        command: "node",
        args: ["/tmp/milo-workspace/milo-linear-mcp.mjs"],
        env: {
          MILO_LINEAR_ACCESS_TOKEN: args.credentials.accessToken,
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
          ...(args.defaultIssueId === undefined
            ? {}
            : { MILO_LINEAR_DEFAULT_ISSUE_ID: args.defaultIssueId }),
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/tmp/milo-workspace/milo-linear-mcp.mjs",
        content: createLinearProxyScript(),
      },
    ],
    preflights: [
      {
        type: "linear",
        credentials: args.credentials,
      },
    ],
    promptedTools: getPromptedTools(args),
  }
}

export function createLinearTokenPreflightCommand() {
  return linearTokenPreflightCommand
}

export function createLinearProxyScript() {
  return linearProxyScript
}

const linearTokenPreflightCommand = [
  "node <<'NODE'",
  "async function main() {",
  "  const token = process.env.MILO_LINEAR_ACCESS_TOKEN;",
  "  if (!token) {",
  "    throw new Error('Missing Linear access token');",
  "  }",
  "  const response = await fetch('https://api.linear.app/graphql', {",
  "    method: 'POST',",
  "    headers: {",
  "      authorization: 'Bearer ' + token,",
  "      'content-type': 'application/json',",
  "    },",
  "    body: JSON.stringify({ query: 'query MiloLinearPreflight { viewer { id } }' }),",
  "  });",
  "  const body = await response.json();",
  "  if (!response.ok || body.errors) {",
  "    throw new Error('Linear token preflight failed: ' + JSON.stringify(body));",
  "  }",
  "  console.log('Linear token preflight passed');",
  "}",
  "main().catch((error) => {",
  "  console.error(error);",
  "  process.exit(1);",
  "});",
  "NODE",
].join("\n")

const linearProxyScript = `
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const accessToken = requiredEnv("MILO_LINEAR_ACCESS_TOKEN");
const defaultIssueId = process.env.MILO_LINEAR_DEFAULT_ISSUE_ID;
const linearGraphqlUrl = ${JSON.stringify(linearGraphqlUrl)};

const allTools = [
  {
    name: "linear_search_issues",
    description: "Search Linear issues by title or exact issue identifier, such as ENG-123.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: {
        query: { type: "string" },
        first: { type: "number" },
      },
    },
  },
  {
    name: "linear_get_issue",
    description: "Read a Linear issue by ID, including recent comments. Defaults to the trigger issue when this run came from Linear.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        issueId: { type: "string" },
      },
    },
  },
  {
    name: "linear_list_comments",
    description: "Read recent comments from a Linear issue by ID. Defaults to the trigger issue when this run came from Linear.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        issueId: { type: "string" },
        first: { type: "number" },
      },
    },
  },
  {
    name: "linear_add_comment",
    description: "Add a comment to a Linear issue by ID. Defaults to the trigger issue when this run came from Linear.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["body"],
      properties: {
        issueId: { type: "string" },
        body: { type: "string" },
      },
    },
  },
];

const tools = filterEnabledTools(allTools);

const server = new Server(
  { name: "milo-linear", version: "0.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments ?? {};

  if (!tools.some((tool) => tool.name === toolName)) {
    throw new McpError(ErrorCode.InvalidParams, "Unknown Linear tool: " + toolName);
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
  if (toolName === "linear_search_issues") {
    return await searchIssues(args.query, args.first);
  }

  if (toolName === "linear_get_issue") {
    const issueId = getIssueId(args);
    return await getIssue(issueId);
  }

  if (toolName === "linear_list_comments") {
    const issueId = getIssueId(args);
    return await listComments(issueId, args.first);
  }

  if (toolName === "linear_add_comment") {
    const issueId = getIssueId(args);
    if (typeof args.body !== "string" || args.body.trim() === "") {
      throw new McpError(ErrorCode.InvalidParams, "Comment body is required");
    }
    return await addComment(issueId, args.body);
  }

  throw new McpError(ErrorCode.InvalidParams, "Unknown Linear tool: " + toolName);
}

function getIssueId(args) {
  const issueId = args.issueId ?? defaultIssueId;

  if (typeof issueId !== "string" || issueId === "") {
    throw new McpError(ErrorCode.InvalidParams, "Issue ID is required");
  }

  return issueId;
}

async function searchIssues(query, first) {
  const normalizedQuery = normalizeIssueSearchQuery(query);
  const exactIssue = await getIssueSummaryByIdentifier(normalizedQuery);
  const result = await linearGraphql({
    query: \`
      query MiloIssueSearch($query: String!, $first: Int!) {
        issues(first: $first, filter: { title: { containsIgnoreCase: $query } }) {
          nodes {
            id
            identifier
            title
            url
            updatedAt
            state {
              name
              type
            }
            assignee {
              id
              name
            }
            creator {
              id
              name
            }
          }
        }
      }
    \`,
    variables: {
      query: normalizedQuery,
      first: normalizeIssueSearchLimit(first),
    },
  });

  const issuesById = new Map();
  if (exactIssue !== null) {
    issuesById.set(exactIssue.id, exactIssue);
  }

  for (const issue of result.data?.issues?.nodes ?? []) {
    issuesById.set(issue.id, issue);
  }

  return {
    query: normalizedQuery,
    issues: Array.from(issuesById.values()),
  };
}

async function getIssueSummaryByIdentifier(query) {
  if (!/^[a-z]+-\\d+$/i.test(query)) {
    return null;
  }

  const result = await linearGraphql({
    query: \`
      query MiloIssueSummary($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          url
          updatedAt
          state {
            name
            type
          }
          assignee {
            id
            name
          }
          creator {
            id
            name
          }
        }
      }
    \`,
    variables: { id: query.toUpperCase() },
  });

  return result.data?.issue ?? null;
}

async function getIssue(issueId) {
  const result = await linearGraphql({
    query: \`
      query MiloIssue($id: String!) {
        issue(id: $id) {
          id
          identifier
          title
          description
          url
          createdAt
          updatedAt
          state {
            name
            type
          }
          assignee {
            id
            name
          }
          creator {
            id
            name
          }
          comments(first: 25) {
            nodes {
              id
              body
              createdAt
              updatedAt
              url
              user {
                id
                name
              }
            }
          }
        }
      }
    \`,
    variables: { id: issueId },
  });

  return result.data?.issue ?? null;
}

async function listComments(issueId, first) {
  const result = await linearGraphql({
    query: \`
      query MiloIssueComments($id: String!, $first: Int!) {
        issue(id: $id) {
          id
          comments(first: $first) {
            nodes {
              id
              body
              createdAt
              updatedAt
              url
              user {
                id
                name
              }
            }
          }
        }
      }
    \`,
    variables: {
      id: issueId,
      first: normalizeCommentLimit(first),
    },
  });

  return result.data?.issue?.comments?.nodes ?? [];
}

async function addComment(issueId, body) {
  const result = await linearGraphql({
    query: \`
      mutation MiloAddComment($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment {
            id
            body
            url
          }
        }
      }
    \`,
    variables: {
      input: {
        issueId,
        body,
      },
    },
  });

  return result.data?.commentCreate ?? result;
}

async function linearGraphql(body) {
  const response = await fetch(linearGraphqlUrl, {
    method: "POST",
    headers: {
      authorization: "Bearer " + accessToken,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const result = await response.json();

  if (!response.ok || result.errors) {
    throw new McpError(
      ErrorCode.InternalError,
      "Linear GraphQL request failed: " + JSON.stringify(result),
    );
  }

  return result;
}

function normalizeCommentLimit(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 25;
  }

  return Math.max(1, Math.min(50, Math.round(value)));
}

function normalizeIssueSearchQuery(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new McpError(ErrorCode.InvalidParams, "Search query is required");
  }

  return value.trim();
}

function normalizeIssueSearchLimit(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 10;
  }

  return Math.max(1, Math.min(25, Math.round(value)));
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
