import { type Doc } from "../_generated/dataModel"
import { type McpServerConfig } from "./tools"

export type MessageProvider = "github" | "linear" | "slack"
export type RuntimeIntegration = Doc<"integrations">

export type MessageRuntimeInput = {
  type: "message"
  provider: MessageProvider
  trigger: Doc<"triggers">
  integration: RuntimeIntegration
  integrations: RuntimeIntegration[]
  message: Doc<"messages">
}

export type ScheduledRuntimeInput = {
  type: "scheduled"
  trigger: Doc<"triggers">
  integration: RuntimeIntegration | null
  integrations: RuntimeIntegration[]
  schedule: Doc<"schedules">
}

export type CodexRuntimeInput = MessageRuntimeInput | ScheduledRuntimeInput

export function createCodexConfig(args: { mcpServers: McpServerConfig[] }) {
  return [
    'cli_auth_credentials_store = "file"',
    'approval_policy = "never"',
    'sandbox_mode = "danger-full-access"',
    'model = "gpt-5.5"',
    'model_reasoning_effort = "low"',
    "",
    "[tools]",
    "web_search = true",
    "",
    ...args.mcpServers.flatMap(renderMcpServerConfig),
  ].join("\n")
}

function renderMcpServerConfig(server: McpServerConfig) {
  const enabledTools = server.env.MILO_ENABLED_TOOLS?.split(",").filter(Boolean)

  return [
    `[mcp_servers.${server.name}]`,
    `command = ${tomlString(server.command)}`,
    `args = ${tomlArray(server.args)}`,
    "required = true",
    ...(enabledTools === undefined || enabledTools.length === 0
      ? []
      : [`enabled_tools = ${tomlArray(enabledTools)}`]),
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
