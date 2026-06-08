import { type Doc } from "../_generated/dataModel"

const slackMcpUrl = "https://mcp.slack.com/mcp"

export type CodexRuntimeInput = {
  execution: Doc<"executions">
  integration: Doc<"integrations">
  message: Doc<"messages">
}

export type CodexRuntimeResult = {
  prompt: string
  jsonl: string
  finalMessage?: string
}

export function createCodexConfig() {
  return [
    'cli_auth_credentials_store = "file"',
    'approval_policy = "never"',
    'sandbox_mode = "read-only"',
    'model_reasoning_effort = "low"',
    "",
    "[mcp_servers.slack]",
    `url = "${slackMcpUrl}"`,
    'bearer_token_env_var = "MILO_SLACK_MCP_TOKEN"',
    "required = true",
    'default_tools_approval_mode = "approve"',
    "startup_timeout_sec = 20",
    "tool_timeout_sec = 30",
    "",
  ].join("\n")
}

export function createCodexPrompt(input: CodexRuntimeInput) {
  const channel = input.message.containerId ?? ""
  const threadId = input.message.threadId ?? input.message.providerId
  const text = input.message.text ?? ""

  return [
    "You are Milo, a concise AI teammate responding in Slack.",
    "",
    "Task:",
    "- Use the Slack MCP server to send exactly one witty, friendly reply.",
    "- Send it only to the Slack channel and thread listed below.",
    "- Do not call any non-Slack tools.",
    "- Do not inspect files, run shell commands, browse the web, or ask questions.",
    "- After the Slack message is sent, stop and briefly confirm what you sent.",
    "",
    "Slack target:",
    `- Channel ID: ${channel}`,
    `- Thread timestamp: ${threadId}`,
    "",
    "Original Slack message:",
    text,
  ].join("\n")
}

export function parseFinalCodexMessage(jsonl: string) {
  let finalMessage: string | undefined

  for (const line of jsonl.split("\n")) {
    const event = parseJsonLine(line)

    if (isAgentMessageEvent(event)) {
      finalMessage = event.item.text
    }
  }

  return finalMessage
}

function parseJsonLine(line: string) {
  if (line.trim() === "") {
    return null
  }

  try {
    return JSON.parse(line) as unknown
  } catch {
    return null
  }
}

function isAgentMessageEvent(
  event: unknown
): event is { item: { type: "agent_message"; text: string } } {
  if (typeof event !== "object" || event === null || !("item" in event)) {
    return false
  }

  const item = event.item

  return (
    typeof item === "object" &&
    item !== null &&
    "type" in item &&
    item.type === "agent_message" &&
    "text" in item &&
    typeof item.text === "string"
  )
}
