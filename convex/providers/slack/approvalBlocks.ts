import { type SlackApprovalDecisionResult } from "../../approvals/runtime"
import { type SlackBlock } from "../../tools/providers/slack"
import { type Provider } from "../catalog"
import { getToolLabel } from "./approvalLabels"

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
  if (result.status === "expired" && result.approval !== undefined) {
    return createSlackExpirationResponse(result.approval)
  }

  return {
    replace_original: true,
    text: createDecisionFallbackText(result),
    blocks: createDecisionBlocks(interaction, result),
  }
}

export function createSlackExpirationResponse(args: {
  tool: string
  summary: string
  expiresAt: number
}) {
  return {
    replace_original: true,
    text: "Request expired. Milo will not run this action.",
    blocks: createExpirationBlocks(args),
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
      body: truncateSlackText(args.summary, 2800),
      subtext: `Expires at ${formatSlackTime(
        toSlackTimestamp(args.expiresAt)
      )}`,
      actions: createApprovalActions(args.code),
    }),
  ]
}

function createExpirationBlocks(args: {
  tool: string
  summary: string
  expiresAt: number
}): SlackBlock[] {
  return [
    createApprovalCard({
      icon: "archive",
      title: "Request expired",
      subtitle: getToolLabel(args.tool),
      body: truncateSlackText(args.summary, 2800),
      subtext: `Expired at ${formatSlackTime(
        toSlackTimestamp(args.expiresAt)
      )}`,
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
      icon: getDecisionIcon(result.status, result.approval?.decision),
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
  subtext?: string
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
    ...(args.subtext === undefined
      ? {}
      : { subtext: markdownText(args.subtext) }),
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
    return "Request expired"
  }

  return "Approval unavailable"
}

function getDecisionIcon(
  status: SlackApprovalDecisionResult["status"],
  decision?: "approved" | "denied"
) {
  if (status === "denied" || decision === "denied") {
    return "thumbs-down"
  }

  return "check"
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

function truncateSlackText(value: string, maximumLength: number) {
  return value.length <= maximumLength
    ? value
    : `${value.slice(0, maximumLength - 3)}...`
}
