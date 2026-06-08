import { type Doc } from "../_generated/dataModel"
import { type McpServerConfig } from "./tools"

export type CodexRuntimeInput = {
  execution: Doc<"executions">
  integration: Doc<"integrations">
  sourceItem: Doc<"sourceItems">
}

export function createCodexConfig(args: { mcpServers: McpServerConfig[] }) {
  return [
    'cli_auth_credentials_store = "file"',
    'approval_policy = "never"',
    'sandbox_mode = "read-only"',
    'model_reasoning_effort = "low"',
    "",
    ...args.mcpServers.flatMap(renderMcpServerConfig),
  ].join("\n")
}

function renderMcpServerConfig(server: McpServerConfig) {
  return [
    `[mcp_servers.${server.name}]`,
    `command = ${tomlString(server.command)}`,
    `args = ${tomlArray(server.args)}`,
    "required = true",
    'default_tools_approval_mode = "approve"',
    "startup_timeout_sec = 30",
    "tool_timeout_sec = 30",
    "",
    `[mcp_servers.${server.name}.env]`,
    ...Object.entries(server.env).map(
      ([key, value]) => `${key} = ${tomlString(value)}`
    ),
    "",
  ]
}

function tomlString(value: string) {
  return JSON.stringify(value)
}

function tomlArray(values: string[]) {
  return `[${values.map(tomlString).join(", ")}]`
}
