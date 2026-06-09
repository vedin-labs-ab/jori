import { type GitHubCredentials } from "../../providers/github/credentials"
import { type ToolBundle } from "./types"

export function createGitHubTokenPreflightCommand() {
  return githubTokenPreflightCommand
}

export function createGitHubMcpScript() {
  return githubMcpScript
}

export function createGitHubToolBundle(args: {
  credentials: GitHubCredentials
  owner: string
  repo: string
  issueNumber?: number
  pullNumber?: number
  commentId: string
  commentKind: string
}): ToolBundle {
  if (args.credentials.token === undefined) {
    throw new Error("Missing GitHub runtime token")
  }

  return {
    mcpServers: [
      {
        name: "github",
        command: "node",
        args: ["/tmp/milo-workspace/milo-github-mcp.mjs"],
        env: {
          MILO_GITHUB_TOKEN: args.credentials.token,
          MILO_GITHUB_OWNER: args.owner,
          MILO_GITHUB_REPO: args.repo,
          MILO_GITHUB_ISSUE_NUMBER: String(args.issueNumber ?? ""),
          MILO_GITHUB_PULL_NUMBER: String(args.pullNumber ?? ""),
          MILO_GITHUB_COMMENT_ID: args.commentId,
          MILO_GITHUB_COMMENT_KIND: args.commentKind,
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/tmp/milo-workspace/milo-github-mcp.mjs",
        content: createGitHubMcpScript(),
      },
    ],
    preflights: [
      {
        type: "github",
        credentials: args.credentials,
        owner: args.owner,
        repo: args.repo,
      },
    ],
  }
}

const githubTokenPreflightCommand = [
  "node <<'NODE'",
  "async function main() {",
  "  const token = process.env.MILO_GITHUB_TOKEN;",
  "  const owner = process.env.MILO_GITHUB_OWNER;",
  "  const repo = process.env.MILO_GITHUB_REPO;",
  "  if (!token) {",
  "    throw new Error('Missing GitHub token');",
  "  }",
  "  if (!owner || !repo) {",
  "    throw new Error('Missing GitHub repository scope');",
  "  }",
  "  const response = await fetch('https://api.github.com/repos/' + owner + '/' + repo, {",
  "    headers: {",
  "      accept: 'application/vnd.github+json',",
  "      authorization: 'Bearer ' + token,",
  "      'x-github-api-version': '2022-11-28',",
  "    },",
  "  });",
  "  const body = await response.json();",
  "  if (!response.ok) {",
  "    throw new Error('GitHub token preflight failed: ' + JSON.stringify(body));",
  "  }",
  "  console.log('GitHub token preflight passed');",
  "}",
  "main().catch((error) => {",
  "  console.error(error);",
  "  process.exit(1);",
  "});",
  "NODE",
].join("\n")

const githubMcpScript = `
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { Octokit } from "@octokit/rest";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const run = promisify(execFile);
const token = requiredEnv("MILO_GITHUB_TOKEN");
const owner = requiredEnv("MILO_GITHUB_OWNER");
const repo = requiredEnv("MILO_GITHUB_REPO");
const issueNumber = optionalNumberEnv("MILO_GITHUB_ISSUE_NUMBER");
const pullNumber = optionalNumberEnv("MILO_GITHUB_PULL_NUMBER");
const commentId = requiredEnv("MILO_GITHUB_COMMENT_ID");
const commentKind = requiredEnv("MILO_GITHUB_COMMENT_KIND");
const workspace = "/tmp/milo-workspace";
const defaultCloneDirectory = path.join(workspace, "repository");
const repoPathPrefix = "/repos/" + owner + "/" + repo;
const octokit = new Octokit({
  auth: token,
  userAgent: "milo-github",
});

const tools = [
  {
    name: "github_get_trigger_context",
    description: "Read the GitHub issue, pull request, triggering comment, and adjacent comments for this run.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "github_request",
    description: "Call the GitHub REST API for the triggering repository using the installation token.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["method", "path"],
      properties: {
        method: { type: "string" },
        path: { type: "string" },
        parameters: { type: "object" },
      },
    },
  },
  {
    name: "github_clone_repository",
    description: "Clone the triggering repository into the sandbox using scoped GitHub App credentials.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        directory: { type: "string" },
        ref: { type: "string" },
      },
    },
  },
  {
    name: "github_reply",
    description: "Reply in the GitHub comment thread that triggered this run.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["body"],
      properties: {
        body: { type: "string" },
      },
    },
  },
];

const server = new Server(
  { name: "milo-github", version: "0.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments ?? {};

  if (!tools.some((tool) => tool.name === toolName)) {
    throw new McpError(ErrorCode.InvalidParams, "Unknown GitHub tool: " + toolName);
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
  if (toolName === "github_get_trigger_context") {
    return await getTriggerContext();
  }

  if (toolName === "github_request") {
    return await githubRequest(args);
  }

  if (toolName === "github_clone_repository") {
    return await cloneRepository(args);
  }

  if (toolName === "github_reply") {
    return await reply(args);
  }

  throw new McpError(ErrorCode.InvalidParams, "Unknown GitHub tool: " + toolName);
}

async function getTriggerContext() {
  if (commentKind === "pull_request_review") {
    return {
      repository: await request("GET", repoPathPrefix),
      pullRequest: await request("GET", repoPathPrefix + "/pulls/" + requiredPullNumber()),
      reviewComment: await request("GET", repoPathPrefix + "/pulls/comments/" + commentId),
      reviewComments: await request("GET", repoPathPrefix + "/pulls/" + requiredPullNumber() + "/comments", {
        per_page: 100,
      }),
    };
  }

  const issue = await request("GET", repoPathPrefix + "/issues/" + requiredIssueNumber());
  const response = {
    repository: await request("GET", repoPathPrefix),
    issue,
    comment: await request("GET", repoPathPrefix + "/issues/comments/" + commentId),
    comments: await request("GET", repoPathPrefix + "/issues/" + requiredIssueNumber() + "/comments", {
      per_page: 100,
    }),
  };

  if (pullNumber !== undefined) {
    response.pullRequest = await request("GET", repoPathPrefix + "/pulls/" + pullNumber);
  }

  return response;
}

async function githubRequest(args) {
  if (typeof args.method !== "string" || typeof args.path !== "string") {
    throw new McpError(ErrorCode.InvalidParams, "method and path are required");
  }

  return await request(args.method, args.path, args.parameters);
}

async function cloneRepository(args) {
  const directory = normalizeCloneDirectory(args.directory);
  await ensureDirectoryCanBeCreated(directory);

  const cloneUrl =
    "https://x-access-token:" +
    encodeURIComponent(token) +
    "@github.com/" +
    owner +
    "/" +
    repo +
    ".git";
  const cloneArgs = ["clone", "--depth", "1"];

  if (typeof args.ref === "string" && args.ref.trim() !== "") {
    cloneArgs.push("--branch", args.ref.trim());
  }

  cloneArgs.push(cloneUrl, directory);

  await run("git", cloneArgs, { cwd: workspace });

  return { directory, repository: owner + "/" + repo };
}

async function reply(args) {
  if (typeof args.body !== "string" || args.body.trim() === "") {
    throw new McpError(ErrorCode.InvalidParams, "Reply body is required");
  }

  if (commentKind === "pull_request_review") {
    return await request(
      "POST",
      repoPathPrefix + "/pulls/comments/" + commentId + "/replies",
      { body: args.body },
    );
  }

  return await request("POST", repoPathPrefix + "/issues/" + requiredIssueNumber() + "/comments", {
    body: args.body,
  });
}

async function request(method, requestPath, parameters = {}) {
  const normalizedMethod = method.toUpperCase();

  if (!isAllowedMethod(normalizedMethod)) {
    throw new McpError(ErrorCode.InvalidParams, "Unsupported GitHub method: " + method);
  }

  assertRepoScopedPath(requestPath);

  try {
    const response = await octokit.request(
      normalizedMethod + " " + requestPath,
      parameters ?? {},
    );

    return response.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, "GitHub request failed: " + message);
  }
}

function assertRepoScopedPath(requestPath) {
  if (
    requestPath !== repoPathPrefix &&
    !requestPath.startsWith(repoPathPrefix + "/")
  ) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "GitHub API access is limited to " + repoPathPrefix,
    );
  }
}

function isAllowedMethod(method) {
  return ["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method);
}

function normalizeCloneDirectory(value) {
  if (value === undefined || value === null || value === "") {
    return defaultCloneDirectory;
  }

  if (typeof value !== "string") {
    throw new McpError(ErrorCode.InvalidParams, "directory must be a string");
  }

  const resolved = path.resolve(workspace, value);

  if (resolved !== workspace && !resolved.startsWith(workspace + path.sep)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Clone directory must stay inside " + workspace,
    );
  }

  return resolved;
}

async function ensureDirectoryCanBeCreated(directory) {
  try {
    const entries = await fs.readdir(directory);

    if (entries.length > 0) {
      throw new McpError(ErrorCode.InvalidParams, "Clone directory is not empty");
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }
}

function requiredIssueNumber() {
  if (issueNumber === undefined) {
    throw new McpError(ErrorCode.InvalidParams, "This trigger has no issue target");
  }

  return issueNumber;
}

function requiredPullNumber() {
  if (pullNumber === undefined) {
    throw new McpError(ErrorCode.InvalidParams, "This trigger has no pull request target");
  }

  return pullNumber;
}

function optionalNumberEnv(name) {
  const value = process.env[name];

  if (value === undefined || value === "") {
    return undefined;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error("Invalid " + name);
  }

  return numberValue;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error("Missing " + name);
  }
  return value;
}
`
