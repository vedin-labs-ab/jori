import { type McpToolDefinition } from "../definitions"

export function createMiloMcpScript(args: { tools: McpToolDefinition[] }) {
  return miloMcpScript({
    toolsJson: JSON.stringify(args.tools),
  })
}

function miloMcpScript(args: { toolsJson: string }) {
  return `
import fs from "node:fs/promises";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const convexSiteUrl = requiredEnv("MILO_CONVEX_SITE_URL");
const codexHome = requiredEnv("MILO_CODEX_HOME");
const executionToken = requiredEnv("MILO_EXECUTION_TOKEN");
const workspace = requiredEnv("MILO_WORKSPACE");
const allTools = ${args.toolsJson};
const tools = filterEnabledTools(allTools);
const generatedImagesDirectory = path.join(codexHome, "generated_images");
const maxArtifactBytes = 25 * 1024 * 1024;

const server = new Server(
  { name: "milo", version: "0.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;

  if (!tools.some((tool) => tool.name === toolName)) {
    throw new McpError(ErrorCode.InvalidParams, "Unknown Milo tool: " + toolName);
  }

  const result =
    toolName === "save_artifact"
      ? await saveArtifact(request.params.arguments ?? {})
      : await callMilo(toolName, request.params.arguments ?? {});

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

async function saveArtifact(args) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    throw new McpError(ErrorCode.InvalidParams, "save_artifact arguments must be an object");
  }

  const filePath = requiredString(args.path, "path");
  const resolvedPath = await resolveArtifactPath(filePath);
  const stat = await fs.stat(resolvedPath);

  if (!stat.isFile()) {
    throw new McpError(ErrorCode.InvalidParams, "Artifact path must be a file");
  }

  if (stat.size <= 0) {
    throw new McpError(ErrorCode.InvalidParams, "Artifact file is empty");
  }

  if (stat.size > maxArtifactBytes) {
    throw new McpError(ErrorCode.InvalidParams, "Artifact file exceeds the 25 MB limit");
  }

  const bytes = await fs.readFile(resolvedPath);
  const name = optionalString(args.name) ?? path.basename(resolvedPath);
  const mimeType = optionalString(args.mimeType) ?? inferMimeType(resolvedPath);
  const description = optionalString(args.description);
  const url = new URL("/milo/artifacts", convexSiteUrl);

  url.searchParams.set("name", name);

  if (description !== undefined) {
    url.searchParams.set("description", description);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: "Bearer " + executionToken,
      "content-type": mimeType,
    },
    body: bytes,
  });
  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new McpError(
      ErrorCode.InternalError,
      result?.error ?? "Artifact upload failed",
    );
  }

  return result;
}

async function resolveArtifactPath(value) {
  const candidate = path.isAbsolute(value)
    ? path.resolve(value)
    : path.resolve(workspace, value);
  let resolvedPath;

  try {
    resolvedPath = await fs.realpath(candidate);
  } catch {
    throw new McpError(ErrorCode.InvalidParams, "Artifact path does not exist");
  }

  const roots = await Promise.all(
    [workspace, generatedImagesDirectory].map(async (root) => {
      try {
        return await fs.realpath(root);
      } catch {
        return path.resolve(root);
      }
    }),
  );

  if (!roots.some((root) => isInsideDirectory(resolvedPath, root))) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Artifact path must be inside the workspace or generated image directory",
    );
  }

  return resolvedPath;
}

function isInsideDirectory(filePath, directory) {
  const relative = path.relative(directory, filePath);

  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function requiredString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new McpError(ErrorCode.InvalidParams, name + " is required");
  }

  return value.trim();
}

function optionalString(value) {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function inferMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".csv") return "text/csv";
  if (extension === ".html" || extension === ".htm") return "text/html";
  if (extension === ".json") return "application/json";
  if (extension === ".md" || extension === ".txt") return "text/plain";

  return "application/octet-stream";
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
