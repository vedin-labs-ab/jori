import { type ToolProvider } from "../../permissions/catalog"
import { type McpToolDefinition } from "./definitions"

export function createBrokerMcpScript(args: {
  provider: ToolProvider
  tools: McpToolDefinition[]
}) {
  return brokerMcpScript({
    provider: args.provider,
    toolsJson: JSON.stringify(args.tools),
  })
}

function brokerMcpScript(args: { provider: ToolProvider; toolsJson: string }) {
  return `
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const run = promisify(execFile);
const provider = ${JSON.stringify(args.provider)};
const convexSiteUrl = requiredEnv("MILO_CONVEX_SITE_URL");
const executionToken = requiredEnv("MILO_EXECUTION_TOKEN");
const workspace = "/home/user/milo-workspace";
const allTools = ${args.toolsJson};
const tools = filterEnabledTools(allTools);

const server = new Server(
  { name: "milo-" + provider, version: "0.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;

  if (!tools.some((tool) => tool.name === toolName)) {
    throw new McpError(ErrorCode.InvalidParams, "Unknown " + provider + " tool: " + toolName);
  }

  const args = request.params.arguments ?? {};
  const result = await callMilo(toolName, args);

  if (result?.download?.kind === "github_tarball") {
    return textResult(JSON.stringify(await downloadGitHubTarball(result.download), null, 2));
  }

  return textResult(JSON.stringify(result, null, 2));
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
    body: JSON.stringify({ provider, tool, args }),
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

async function downloadGitHubTarball(download) {
  const directory = normalizeCloneDirectory(download.directory);
  await ensureEmptyOrMissingDirectory(directory);
  await fs.mkdir(directory, { recursive: true });

  const archivePath = path.join(
    os.tmpdir(),
    "milo-github-" + Date.now() + "-" + Math.random().toString(36).slice(2) + ".tar.gz",
  );
  const response = await fetch(new URL("/milo/github/tarball", convexSiteUrl), {
    method: "POST",
    headers: {
      authorization: "Bearer " + executionToken,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      owner: download.owner,
      repo: download.repo,
      ref: download.ref,
    }),
  });

  if (!response.ok || response.body === null) {
    const body = await response.text().catch(() => "");
    throw new McpError(ErrorCode.InternalError, "GitHub archive download failed: " + body);
  }

  await fs.writeFile(archivePath, Buffer.from(await response.arrayBuffer()));
  await run("tar", ["-xzf", archivePath, "--strip-components", "1", "-C", directory]);
  await fs.rm(archivePath, { force: true });

  return {
    directory,
    repository: download.owner + "/" + download.repo,
  };
}

function textResult(text) {
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}

function normalizeCloneDirectory(value) {
  if (value === undefined || value === null || value === "") {
    return path.join(workspace, "repository");
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

async function ensureEmptyOrMissingDirectory(directory) {
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
}
