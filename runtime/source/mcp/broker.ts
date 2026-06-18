import { execFile } from "node:child_process"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js"

type ToolDefinition = {
  name: string
  [key: string]: unknown
}

type GitHubTarballDownload = {
  kind: "github_tarball"
  owner: string
  repo: string
  ref: string
  directory?: string | null
}

type RecordValue = Record<string, unknown>

const run = promisify(execFile)
const surface = requiredEnv("MILO_TOOL_SURFACE")
const convexSiteUrl = requiredEnv("MILO_CONVEX_SITE_URL")
const executionToken = requiredEnv("MILO_EXECUTION_TOKEN")
const workspace = requiredEnv("MILO_WORKSPACE")
const allTools = readJsonEnv<ToolDefinition[]>("MILO_TOOL_DEFINITIONS_BASE64")
const tools = filterEnabledTools(allTools)

const server = new Server(
  { name: `milo-${surface}`, version: "0.0.0" },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name

  if (!tools.some((tool) => tool.name === toolName)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Unknown ${surface} tool: ${toolName}`
    )
  }

  const args = request.params.arguments ?? {}
  const result = await callMilo(toolName, args)

  const download = githubTarballDownload(result)

  if (download !== undefined) {
    return textResult(
      JSON.stringify(await downloadGitHubTarball(download), null, 2)
    )
  }

  return textResult(JSON.stringify(result, null, 2))
})

const transport = new StdioServerTransport()
await server.connect(transport)

async function callMilo(tool: string, args: unknown) {
  const response = await fetch(new URL("/milo/mcp", convexSiteUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${executionToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ surface, tool, args }),
  })
  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new McpError(
      ErrorCode.InternalError,
      responseErrorMessage(result, "Milo MCP request failed")
    )
  }

  return result
}

async function downloadGitHubTarball(download: GitHubTarballDownload) {
  const directory = normalizeCloneDirectory(download.directory)
  await ensureEmptyOrMissingDirectory(directory)
  await fs.mkdir(directory, { recursive: true })

  const archivePath = path.join(
    os.tmpdir(),
    `milo-github-${Date.now()}-${Math.random().toString(36).slice(2)}.tar.gz`
  )
  const response = await fetch(new URL("/milo/github/tarball", convexSiteUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${executionToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      owner: download.owner,
      repo: download.repo,
      ref: download.ref,
    }),
  })

  if (!response.ok || response.body === null) {
    const body = await response.text().catch(() => "")
    throw new McpError(
      ErrorCode.InternalError,
      `GitHub archive download failed: ${body}`
    )
  }

  await fs.writeFile(archivePath, Buffer.from(await response.arrayBuffer()))
  await run("tar", [
    "-xzf",
    archivePath,
    "--strip-components",
    "1",
    "-C",
    directory,
  ])
  await fs.rm(archivePath, { force: true })

  return {
    directory,
    repository: `${download.owner}/${download.repo}`,
  }
}

function textResult(text: string) {
  return {
    content: [
      {
        type: "text",
        text,
      },
    ],
  }
}

function normalizeCloneDirectory(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return path.join(workspace, "repository")
  }

  if (typeof value !== "string") {
    throw new McpError(ErrorCode.InvalidParams, "directory must be a string")
  }

  const resolved = path.resolve(workspace, value)

  if (
    resolved !== workspace &&
    !resolved.startsWith(`${workspace}${path.sep}`)
  ) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Clone directory must stay inside ${workspace}`
    )
  }

  return resolved
}

async function ensureEmptyOrMissingDirectory(directory: string) {
  try {
    const entries = await fs.readdir(directory)

    if (entries.length > 0) {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Clone directory is not empty"
      )
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error
    }

    if (errorCode(error) !== "ENOENT") {
      throw error
    }
  }
}

function requiredEnv(name: string) {
  const value = process.env[name]
  if (value === undefined || value === "") {
    throw new Error(`Missing ${name}`)
  }
  return value
}

function readJsonEnv<T>(name: string): T {
  return JSON.parse(Buffer.from(requiredEnv(name), "base64").toString("utf8"))
}

function filterEnabledTools<T extends ToolDefinition>(allTools: T[]) {
  const enabledTools = readEnabledTools()

  if (enabledTools === undefined) {
    return allTools
  }

  return allTools.filter((tool) => enabledTools.has(tool.name))
}

function readEnabledTools() {
  const value = process.env.MILO_ENABLED_TOOLS

  if (value === undefined || value === "") {
    return undefined
  }

  return new Set(value.split(",").filter(Boolean))
}

function githubTarballDownload(
  value: unknown
): GitHubTarballDownload | undefined {
  if (!isRecord(value) || !isRecord(value.download)) {
    return undefined
  }

  const download = value.download

  return download.kind === "github_tarball" &&
    typeof download.owner === "string" &&
    typeof download.repo === "string" &&
    typeof download.ref === "string"
    ? {
        kind: "github_tarball",
        owner: download.owner,
        repo: download.repo,
        ref: download.ref,
        directory:
          typeof download.directory === "string" || download.directory === null
            ? download.directory
            : undefined,
      }
    : undefined
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function responseErrorMessage(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : fallback
}

function errorCode(value: unknown) {
  return isRecord(value) && typeof value.code === "string"
    ? value.code
    : undefined
}
