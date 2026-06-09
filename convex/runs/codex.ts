import { type Doc } from "../_generated/dataModel"
import { type McpServerConfig } from "./tools"

export type SlackRuntimeInput = {
  type: "message"
  provider: "slack"
  execution: Doc<"executions">
  trigger: Doc<"triggers">
  integration: Doc<"integrations">
  message: Doc<"messages">
}

export type LinearRuntimeInput = {
  type: "message"
  provider: "linear"
  execution: Doc<"executions">
  trigger: Doc<"triggers">
  integration: Doc<"integrations">
  message: Doc<"messages">
}

export type MicrosoftRuntimeInput = {
  type: "message"
  provider: "microsoft"
  execution: Doc<"executions">
  trigger: Doc<"triggers">
  integration: Doc<"integrations">
  message: Doc<"messages">
}

export type ScheduledRuntimeInput = {
  type: "scheduled"
  execution: Doc<"executions">
  trigger: Doc<"triggers">
  integration: Doc<"integrations">
  schedule: Doc<"schedules">
}

export type CodexRuntimeInput =
  | SlackRuntimeInput
  | LinearRuntimeInput
  | MicrosoftRuntimeInput
  | ScheduledRuntimeInput

export function createCodexConfig(args: { mcpServers: McpServerConfig[] }) {
  return [
    'cli_auth_credentials_store = "file"',
    'approval_policy = "never"',
    'sandbox_mode = "read-only"',
    'model = "gpt-5.5"',
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
