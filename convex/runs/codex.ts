import { type Doc } from "../_generated/dataModel"

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

export function createCodexConfig(args: {
  allowedChannelId: string
  botToken: string
  userToken: string
}) {
  return [
    'cli_auth_credentials_store = "file"',
    'approval_policy = "never"',
    'sandbox_mode = "read-only"',
    'model_reasoning_effort = "low"',
    "",
    "[mcp_servers.slack]",
    'command = "node"',
    'args = ["/tmp/milo-workspace/milo-slack-mcp-proxy.mjs"]',
    "required = true",
    'default_tools_approval_mode = "approve"',
    "startup_timeout_sec = 30",
    "tool_timeout_sec = 30",
    "",
    "[mcp_servers.slack.env]",
    `MILO_SLACK_USER_TOKEN = ${tomlString(args.userToken)}`,
    `MILO_SLACK_BOT_TOKEN = ${tomlString(args.botToken)}`,
    `MILO_SLACK_ALLOWED_CHANNEL_ID = ${tomlString(args.allowedChannelId)}`,
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
    "- Send exactly one witty, friendly reply with the Slack tools.",
    "- Send it only to the Slack channel and thread listed below.",
    "- Use Slack read/search tools only if you need extra Slack context before replying.",
    "- Do not use non-Slack tools.",
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

function tomlString(value: string) {
  return JSON.stringify(value)
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
