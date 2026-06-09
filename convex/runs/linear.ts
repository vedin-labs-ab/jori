import { linearGraphqlUrl } from "../providers/linear/config"

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
const allowedIssueId = requiredEnv("MILO_LINEAR_ALLOWED_ISSUE_ID");
const linearGraphqlUrl = ${JSON.stringify(linearGraphqlUrl)};

const tools = [
  {
    name: "linear_get_issue",
    description: "Read the Linear issue that triggered this run, including recent comments.",
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
    description: "Read recent comments from the Linear issue that triggered this run.",
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
    description: "Add a comment to the Linear issue that triggered this run.",
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
  const issueId = getIssueId(args);

  if (toolName === "linear_get_issue") {
    return await getIssue(issueId);
  }

  if (toolName === "linear_list_comments") {
    return await listComments(issueId, args.first);
  }

  if (toolName === "linear_add_comment") {
    if (typeof args.body !== "string" || args.body.trim() === "") {
      throw new McpError(ErrorCode.InvalidParams, "Comment body is required");
    }
    return await addComment(issueId, args.body);
  }

  throw new McpError(ErrorCode.InvalidParams, "Unknown Linear tool: " + toolName);
}

function getIssueId(args) {
  const issueId = args.issueId ?? allowedIssueId;

  if (issueId !== allowedIssueId) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "This run may only access the Linear issue that triggered it",
    );
  }

  return issueId;
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

function requiredEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error("Missing " + name);
  }
  return value;
}
`
