import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js"
import { checkArtifactWorkspace } from "../artifact/builder/index.ts"
import { resolveWorkspacePath, saveFile } from "./files.ts"

type ToolDefinition = {
  name: string
  [key: string]: unknown
}

type RecordValue = Record<string, unknown>

const convexSiteUrl = requiredEnv("MILO_CONVEX_SITE_URL")
const codexHome = requiredEnv("MILO_CODEX_HOME")
const executionToken = requiredEnv("MILO_EXECUTION_TOKEN")
const workspace = requiredEnv("MILO_WORKSPACE")
const allTools = readJsonEnv<ToolDefinition[]>("MILO_TOOL_DEFINITIONS_BASE64")
const tools = filterEnabledTools(allTools)

const server = new Server(
  { name: "milo", version: "0.0.0" },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name

  if (!tools.some((tool) => tool.name === toolName)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Unknown Milo tool: ${toolName}`
    )
  }

  const result =
    toolName === "save_file"
      ? await saveFile(request.params.arguments ?? {}, {
          codexHome,
          convexSiteUrl,
          executionToken,
          workspace,
        })
      : await callMilo(
          toolName,
          await prepareMiloArgs(toolName, request.params.arguments ?? {})
        )

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  }
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
    body: JSON.stringify({ tool, args }),
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

async function prepareMiloArgs(toolName: string, args: unknown) {
  if (toolName !== "create_artifact" && toolName !== "update_artifact") {
    return args
  }

  if (!isRecord(args)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Artifact arguments must be an object"
    )
  }

  try {
    const artifact = await checkArtifactWorkspace(
      await resolveWorkspacePath(
        requiredString(args.workspacePath, "workspacePath"),
        workspace
      )
    )
    const publishArgs = { ...args }
    delete publishArgs.workspacePath

    return {
      ...publishArgs,
      contract: artifact.contract,
      source: artifact.source,
      build: artifact.build,
    }
  } catch (error) {
    throw new McpError(
      ErrorCode.InvalidParams,
      error instanceof Error ? error.message : "Artifact validation failed"
    )
  }
}

function requiredString(value: unknown, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new McpError(ErrorCode.InvalidParams, `${name} is required`)
  }

  return value.trim()
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

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function responseErrorMessage(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : fallback
}
