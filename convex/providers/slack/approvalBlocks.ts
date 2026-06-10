import { type SlackApprovalDecisionResult } from "../../approvals/runtime"
import { type SlackBlock } from "../../tools/providers/slack"
import { type Provider } from "../catalog"

export type SlackApprovalInteraction = {
  accountId: string
  actorId?: string
  channelId: string
  messageTs: string
  threadTs?: string
  code: string
  decision: "approved" | "denied"
}

export function createSlackApprovalRequest(args: {
  code: string
  provider: Provider
  tool: string
  summary: string
  expiresAt: number
}) {
  return {
    text: [
      "Milo needs approval before continuing.",
      args.summary,
      `Tool: ${args.provider}.${args.tool}`,
    ].join("\n"),
    blocks: createSlackApprovalBlocks(args),
  }
}

export function createSlackDecisionResponse(
  interaction: SlackApprovalInteraction,
  result: SlackApprovalDecisionResult
) {
  return {
    replace_original: true,
    text: createDecisionFallbackText(result),
    blocks: createDecisionBlocks(interaction, result),
  }
}

function createSlackApprovalBlocks(args: {
  code: string
  provider: Provider
  tool: string
  summary: string
  expiresAt: number
}): SlackBlock[] {
  return [
    createApprovalCard({
      icon: "edit",
      title: "Approval required",
      subtitle: getToolLabel(args.tool),
      body: `${truncateSlackText(args.summary, 2800)}\n\n_Expires at ${formatSlackTime(
        toSlackTimestamp(args.expiresAt)
      )}_`,
      actions: createApprovalActions(args.code),
    }),
  ]
}

function createDecisionFallbackText(result: SlackApprovalDecisionResult) {
  if (result.status === "approved") {
    return "Approved. Milo is continuing the run."
  }

  if (result.status === "denied") {
    return "Denied. Milo will not run this action."
  }

  return result.message
}

function createDecisionBlocks(
  interaction: SlackApprovalInteraction,
  result: SlackApprovalDecisionResult
): SlackBlock[] {
  const title = getDecisionTitle(result.status, result.approval?.decision)
  const decidedAt = Math.floor(Date.now() / 1000)
  const actor = formatSlackActor(interaction.actorId)
  const time = formatSlackTime(decidedAt)
  const summary = result.approval?.summary
  const subtitle =
    result.approval === undefined
      ? undefined
      : getToolLabel(result.approval.tool)

  return [
    createApprovalCard({
      icon: "check",
      title: `${title} by ${actor} at ${time}`,
      subtitle,
      body: summary ?? result.message,
    }),
  ]
}

function createApprovalCard(args: {
  icon: string
  title: string
  subtitle?: string
  body: string
  actions?: Record<string, unknown>[]
}): SlackBlock {
  return {
    type: "card",
    slack_icon: {
      type: "icon",
      name: args.icon,
    },
    title: markdownText(args.title),
    ...(args.subtitle === undefined
      ? {}
      : { subtitle: markdownText(args.subtitle) }),
    body: markdownText(args.body),
    ...(args.actions === undefined ? {} : { actions: args.actions }),
  }
}

function createApprovalActions(code: string) {
  return [
    {
      type: "button",
      text: {
        type: "plain_text",
        text: "Deny",
        emoji: false,
      },
      action_id: "milo_approval_deny",
      value: JSON.stringify({ code }),
    },
    {
      type: "button",
      style: "primary",
      text: {
        type: "plain_text",
        text: "Approve",
        emoji: false,
      },
      action_id: "milo_approval_approve",
      value: JSON.stringify({ code }),
    },
  ]
}

function markdownText(text: string) {
  return {
    type: "mrkdwn",
    text,
    verbatim: false,
  }
}

function getDecisionTitle(
  status: SlackApprovalDecisionResult["status"],
  decision?: "approved" | "denied"
) {
  if (status === "approved" || decision === "approved") {
    return "Approved"
  }

  if (status === "denied" || decision === "denied") {
    return "Denied"
  }

  if (status === "expired") {
    return "Approval expired"
  }

  return "Approval unavailable"
}

function formatSlackActor(actorId: string | undefined) {
  return actorId === undefined ? "unknown user" : `<@${actorId}>`
}

function formatSlackTime(timestamp: number) {
  const fallback = new Date(timestamp * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })

  return `<!date^${timestamp}^{time}|${fallback}>`
}

function toSlackTimestamp(timestampMs: number) {
  return Math.floor(timestampMs / 1000)
}

function getToolLabel(tool: string) {
  return toolLabels[tool] ?? humanizeToolName(tool)
}

function humanizeToolName(tool: string) {
  return tool
    .split("_")
    .filter((part) => part !== "")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ")
}

function truncateSlackText(value: string, maximumLength: number) {
  return value.length <= maximumLength
    ? value
    : `${value.slice(0, maximumLength - 3)}...`
}

const toolLabels: Record<string, string> = {
  add_schedule: "Add schedule",
  channels_list: "List Slack channels",
  conversations_add_message: "Send Slack message",
  conversations_history: "Read Slack channel history",
  conversations_replies: "Read Slack thread replies",
  conversations_search_messages: "Search Slack messages",
  delete_schedule: "Delete schedule",
  google_calendar_create_event: "Create Google Calendar event",
  google_calendar_get_event: "Read Google Calendar event",
  google_calendar_list_events: "List Google Calendar events",
  google_calendar_update_event: "Update Google Calendar event",
  google_gmail_get_message: "Read Gmail message",
  google_gmail_get_thread: "Read Gmail thread",
  google_gmail_reply_to_thread: "Reply to Gmail thread",
  google_gmail_search_threads: "Search Gmail threads",
  github_add_issue_comment: "Add GitHub issue comment",
  github_clone_repository: "Clone GitHub repository",
  github_get_file: "Read GitHub file",
  github_get_issue: "Read GitHub issue",
  github_get_pull_request: "Read GitHub pull request",
  github_get_repository: "Read GitHub repository",
  github_list_repositories: "List GitHub repositories",
  github_search_issues: "Search GitHub issues and pull requests",
  linear_add_comment: "Add Linear comment",
  linear_get_issue: "Read Linear issue",
  linear_list_comments: "Read Linear comments",
  linear_search_issues: "Search Linear issues",
  microsoft_calendar_create_event: "Create Microsoft Calendar event",
  microsoft_calendar_get_event: "Read Microsoft Calendar event",
  microsoft_calendar_list_events: "List Microsoft Calendar events",
  microsoft_calendar_update_event: "Update Microsoft Calendar event",
  microsoft_email_create_draft: "Create Outlook draft",
  microsoft_email_get_message: "Read Outlook message",
  microsoft_email_search_messages: "Search Outlook messages",
  microsoft_email_send_message: "Send Outlook email",
  microsoft_email_update_message: "Update Outlook message",
  notion_append_block_children: "Append Notion blocks",
  notion_create_comment: "Add Notion comment",
  notion_create_page: "Create Notion page",
  notion_get_block_children: "Read Notion page content",
  notion_get_page: "Read Notion page",
  notion_list_comments: "Read Notion comments",
  notion_query_data_source: "Query Notion data source",
  notion_search: "Search Notion",
  notion_update_page: "Update Notion page",
  read_schedule: "Read schedule",
  search_schedules: "Search schedules",
  update_schedule: "Update schedule",
  users_search: "Search Slack users",
}
