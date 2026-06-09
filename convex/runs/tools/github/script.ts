export function createGitHubMcpScript() {
  return githubMcpScript
}

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
const workspace = "/tmp/milo-workspace";
const defaultCloneDirectory = path.join(workspace, "repository");
const octokit = new Octokit({
  auth: token,
  userAgent: "milo-github",
});

const allTools = [
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
    name: "github_get_issue",
    description: "Read a GitHub issue or pull request conversation by repository and issue number.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["owner", "repo", "issueNumber"],
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        issueNumber: { type: "number" },
        comments: { type: "number", minimum: 0, maximum: 100 },
      },
    },
  },
  {
    name: "github_get_pull_request",
    description: "Read a GitHub pull request by repository and pull request number.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["owner", "repo", "pullNumber"],
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        pullNumber: { type: "number" },
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
  {
    name: "github_clone_repository",
    description: "Clone a GitHub repository into the sandbox using GitHub App credentials.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["owner", "repo"],
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        directory: { type: "string" },
        ref: { type: "string" },
      },
    },
  },
  {
    name: "github_add_issue_comment",
    description: "Add a comment to a GitHub issue or pull request conversation.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["owner", "repo", "issueNumber", "body"],
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        issueNumber: { type: "number" },
        body: { type: "string" },
      },
    },
  },
];

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

  if (toolName === "github_get_issue") {
    return await getIssue(args);
  }

  if (toolName === "github_get_pull_request") {
    return await getPullRequest(args);
  }

  if (toolName === "github_get_file") {
    return await getFile(args);
  }

  if (toolName === "github_clone_repository") {
    return await cloneRepository(args);
  }

  if (toolName === "github_add_issue_comment") {
    return await addIssueComment(args);
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

async function getIssue(args) {
  const issueNumber = requiredNumber(args.issueNumber, "issueNumber");
  const commentsLimit = boundedNumber(args.comments, 30, 0, 100);
  const issuePath = repositoryPath(args.owner, args.repo) + "/issues/" + issueNumber;
  const issue = await readRequest(issuePath);
  const comments =
    commentsLimit === 0
      ? []
      : await readRequest(issuePath + "/comments", {
          per_page: commentsLimit,
        });

  return {
    issue: summarizeIssue(issue),
    comments: comments.map(summarizeComment),
  };
}

async function getPullRequest(args) {
  const pullNumber = requiredNumber(args.pullNumber, "pullNumber");
  const pullRequest = await readRequest(
    repositoryPath(args.owner, args.repo) + "/pulls/" + pullNumber,
  );

  return summarizePullRequest(pullRequest);
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

async function cloneRepository(args) {
  const owner = requiredString(args.owner, "owner");
  const repo = requiredString(args.repo, "repo");
  const directory = normalizeCloneDirectory(args.directory);
  await ensureDirectoryCanBeCreated(directory);

  const cloneUrl =
    "https://x-access-token:" +
    encodeURIComponent(token) +
    "@github.com/" +
    encodeURIComponent(owner) +
    "/" +
    encodeURIComponent(repo) +
    ".git";
  const cloneArgs = ["clone", "--depth", "1"];

  if (typeof args.ref === "string" && args.ref.trim() !== "") {
    cloneArgs.push("--branch", args.ref.trim());
  }

  cloneArgs.push(cloneUrl, directory);

  await run("git", cloneArgs, { cwd: workspace });

  return { directory, repository: owner + "/" + repo };
}

async function addIssueComment(args) {
  const owner = requiredString(args.owner, "owner");
  const repo = requiredString(args.repo, "repo");
  const issueNumber = requiredNumber(args.issueNumber, "issueNumber");
  const body = requiredString(args.body, "body");

  const response = await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });

  return summarizeComment(response.data);
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

function summarizeIssue(issue) {
  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    htmlUrl: issue.html_url,
    pullRequest: issue.pull_request !== undefined,
    author: issue.user?.login,
    assignees: issue.assignees?.map((user) => user.login) ?? [],
    labels: issue.labels?.map((label) =>
      typeof label === "string" ? label : label.name,
    ) ?? [],
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
  };
}

function summarizePullRequest(pullRequest) {
  return {
    id: pullRequest.id,
    number: pullRequest.number,
    title: pullRequest.title,
    body: pullRequest.body,
    state: pullRequest.state,
    draft: pullRequest.draft,
    merged: pullRequest.merged,
    mergeable: pullRequest.mergeable,
    htmlUrl: pullRequest.html_url,
    author: pullRequest.user?.login,
    base: {
      ref: pullRequest.base?.ref,
      sha: pullRequest.base?.sha,
      repository: pullRequest.base?.repo?.full_name,
    },
    head: {
      ref: pullRequest.head?.ref,
      sha: pullRequest.head?.sha,
      repository: pullRequest.head?.repo?.full_name,
    },
    additions: pullRequest.additions,
    deletions: pullRequest.deletions,
    changedFiles: pullRequest.changed_files,
    createdAt: pullRequest.created_at,
    updatedAt: pullRequest.updated_at,
  };
}

function summarizeComment(comment) {
  return {
    id: comment.id,
    body: comment.body,
    htmlUrl: comment.html_url,
    author: comment.user?.login,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
  };
}

function requiredString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new McpError(ErrorCode.InvalidParams, name + " is required");
  }

  return value.trim();
}

function requiredNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new McpError(ErrorCode.InvalidParams, name + " is required");
  }

  return Math.trunc(value);
}

function boundedNumber(value, fallback, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.trunc(value)));
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
