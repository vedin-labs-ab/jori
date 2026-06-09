import { type GitHubCredentials } from "../../providers/github/credentials"
import {
  enabledToolsEnv,
  getPromptedTools,
  type ToolPermissionInput,
} from "./policy"
import { type ToolBundle } from "./types"

export const githubAccountToolNames = [
  "github_list_repositories",
  "github_get_repository",
  "github_search_issues",
  "github_get_file",
] as const

export function createGitHubTokenPreflightCommand() {
  return githubTokenPreflightCommand
}

export function createGitHubMcpScript() {
  return githubMcpScript
}

export function createGitHubToolBundle(
  args: {
    credentials: GitHubCredentials
    owner: string
    repo: string
    issueNumber?: number
    pullNumber?: number
    commentId: string
    commentKind: string
  } & ToolPermissionInput
): ToolBundle {
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
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
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
    promptedTools: getPromptedTools(args),
  }
}

export function createGitHubAccountToolBundle(
  args: {
    credentials: GitHubCredentials
  } & ToolPermissionInput
): ToolBundle {
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
          MILO_ENABLED_TOOLS: enabledToolsEnv(args.permissions),
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
      },
    ],
    promptedTools: getPromptedTools(args),
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
  "  const path = owner && repo ? '/repos/' + owner + '/' + repo : '/installation/repositories?per_page=1';",
  "  const response = await fetch('https://api.github.com' + path, {",
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
const owner = optionalEnv("MILO_GITHUB_OWNER");
const repo = optionalEnv("MILO_GITHUB_REPO");
const issueNumber = optionalNumberEnv("MILO_GITHUB_ISSUE_NUMBER");
const pullNumber = optionalNumberEnv("MILO_GITHUB_PULL_NUMBER");
const commentId = optionalEnv("MILO_GITHUB_COMMENT_ID");
const commentKind = optionalEnv("MILO_GITHUB_COMMENT_KIND");
const workspace = "/tmp/milo-workspace";
const defaultCloneDirectory = path.join(workspace, "repository");
const repoPathPrefix = owner && repo ? "/repos/" + owner + "/" + repo : undefined;
const octokit = new Octokit({
  auth: token,
  userAgent: "milo-github",
});

const accountTools = [
  {
    name: "github_list_repositories",
    description: "List repositories available to this GitHub App installation.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        perPage: { type: "number", minimum: 1, maximum: 100 },
        page: { type: "number", minimum: 1 },
      },
    },
  },
  {
    name: "github_get_repository",
    description: "Read GitHub repository metadata.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["owner", "repo"],
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
      },
    },
  },
  {
    name: "github_search_issues",
    description: "Search GitHub issues and pull requests visible to the installation.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: {
        query: { type: "string" },
        owner: { type: "string" },
        repo: { type: "string" },
        state: { type: "string", enum: ["open", "closed"] },
        perPage: { type: "number", minimum: 1, maximum: 100 },
        page: { type: "number", minimum: 1 },
      },
    },
  },
  {
    name: "github_get_file",
    description: "Read a file or directory from a GitHub repository.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["owner", "repo", "path"],
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        path: { type: "string" },
        ref: { type: "string" },
      },
    },
  },
];

const triggerTools = hasTriggerTarget() ? [
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
  ] : [];

const allTools = [...accountTools, ...triggerTools];

const tools = filterEnabledTools(allTools);

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
  if (toolName === "github_list_repositories") {
    return await listRepositories(args);
  }

  if (toolName === "github_get_repository") {
    return await getRepository(args);
  }

  if (toolName === "github_search_issues") {
    return await searchIssues(args);
  }

  if (toolName === "github_get_file") {
    return await getFile(args);
  }

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

async function listRepositories(args) {
  const response = await octokit.request("GET /installation/repositories", {
    per_page: boundedNumber(args.perPage, 30, 1, 100),
    page: boundedNumber(args.page, 1, 1, 100),
  });

  return {
    totalCount: response.data.total_count,
    repositories: response.data.repositories.map(summarizeRepository),
  };
}

async function getRepository(args) {
  return summarizeRepository(
    await readRequest(repositoryPath(args.owner, args.repo)),
  );
}

async function searchIssues(args) {
  const query = requiredString(args.query, "query");
  const scopedQuery =
    typeof args.owner === "string" &&
    args.owner.trim() !== "" &&
    typeof args.repo === "string" &&
    args.repo.trim() !== ""
      ? query + " repo:" + args.owner.trim() + "/" + args.repo.trim()
      : query;
  const stateQuery =
    args.state === "open" || args.state === "closed"
      ? scopedQuery + " state:" + args.state
      : scopedQuery;
  const response = await octokit.request("GET /search/issues", {
    q: stateQuery,
    per_page: boundedNumber(args.perPage, 30, 1, 100),
    page: boundedNumber(args.page, 1, 1, 100),
  });

  return {
    totalCount: response.data.total_count,
    items: response.data.items.map((item) => ({
      title: item.title,
      number: item.number,
      state: item.state,
      repositoryUrl: item.repository_url,
      htmlUrl: item.html_url,
      pullRequest: item.pull_request !== undefined,
      updatedAt: item.updated_at,
      user: item.user?.login,
    })),
  };
}

async function getFile(args) {
  const path = requiredString(args.path, "path");
  const parameters = {};

  if (typeof args.ref === "string" && args.ref.trim() !== "") {
    parameters.ref = args.ref.trim();
  }

  const result = await readRequest(
    repositoryPath(args.owner, args.repo) + "/contents/" + encodeRepositoryPath(path),
    parameters,
  );

  if (Array.isArray(result)) {
    return {
      type: "directory",
      entries: result.map((entry) => ({
        name: entry.name,
        path: entry.path,
        type: entry.type,
        size: entry.size,
        htmlUrl: entry.html_url,
      })),
    };
  }

  if (result.type !== "file") {
    return result;
  }

  const encoding = result.encoding;
  const content =
    encoding === "base64" && typeof result.content === "string"
      ? Buffer.from(result.content, "base64").toString("utf8")
      : "";

  return {
    name: result.name,
    path: result.path,
    sha: result.sha,
    size: result.size,
    htmlUrl: result.html_url,
    truncated: content.length > 100_000,
    content: content.slice(0, 100_000),
  };
}

async function getTriggerContext() {
  requireTriggerTarget();

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
  requireTriggerTarget();

  if (typeof args.method !== "string" || typeof args.path !== "string") {
    throw new McpError(ErrorCode.InvalidParams, "method and path are required");
  }

  return await request(args.method, args.path, args.parameters);
}

async function cloneRepository(args) {
  requireTriggerTarget();

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
  requireTriggerTarget();

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

async function readRequest(requestPath, parameters = {}) {
  try {
    const response = await octokit.request("GET " + requestPath, parameters ?? {});

    return response.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, "GitHub request failed: " + message);
  }
}

function assertRepoScopedPath(requestPath) {
  requireTriggerTarget();

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

function hasTriggerTarget() {
  return (
    owner !== undefined &&
    repo !== undefined &&
    commentId !== undefined &&
    commentKind !== undefined
  );
}

function requireTriggerTarget() {
  if (repoPathPrefix === undefined || commentId === undefined || commentKind === undefined) {
    throw new McpError(ErrorCode.InvalidParams, "GitHub trigger context is not available for this run");
  }
}

function repositoryPath(ownerValue, repoValue) {
  return "/repos/" + encodeURIComponent(requiredString(ownerValue, "owner")) + "/" + encodeURIComponent(requiredString(repoValue, "repo"));
}

function encodeRepositoryPath(value) {
  return value
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function summarizeRepository(repository) {
  return {
    id: repository.id,
    fullName: repository.full_name,
    private: repository.private,
    description: repository.description,
    defaultBranch: repository.default_branch,
    htmlUrl: repository.html_url,
    updatedAt: repository.updated_at,
  };
}

function requiredString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new McpError(ErrorCode.InvalidParams, name + " is required");
  }

  return value.trim();
}

function boundedNumber(value, fallback, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.trunc(value)));
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

function optionalEnv(name) {
  const value = process.env[name];

  return value === undefined || value === "" ? undefined : value;
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
