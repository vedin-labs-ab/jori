import { type SlackApprovalDecisionResult } from "../../approvals/runtime"
import { type SlackBlock } from "../../tools/providers/slack"
import { type Provider } from "../catalog"

export type SlackApprovalInteraction = {
  accountId: string
  actorId?: string
  channelId: string
  threadTs?: string
  responseUrl?: string
  code: string
  decision: "approved" | "denied"
}

export function createSlackApprovalRequest(args: {
  code: string
  provider: Provider
  tool: string
  summary: string
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
}): SlackBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Approval requested*",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: truncateSlackText(args.summary, 2900),
      },
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `*Tool:* ${args.provider}.${args.tool}` },
      ],
    },
    {
      type: "actions",
      block_id: `milo_approval_${args.code}`,
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Approve" },
          style: "primary",
          action_id: "milo_approval_approve",
          value: JSON.stringify({ code: args.code }),
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Deny" },
          action_id: "milo_approval_deny",
          value: JSON.stringify({ code: args.code }),
        },
      ],
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: ":alarm_clock: Expires in 30 minutes" },
      ],
    },
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
  const actor =
    interaction.actorId === undefined ? "" : ` by <@${interaction.actorId}>`
  const time = ` at <!date^${decidedAt}^{time}|${new Date(
    decidedAt * 1000
  ).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}>`
  const summary = result.approval?.summary
  const tool =
    result.approval === undefined
      ? undefined
      : `${result.approval.provider}.${result.approval.tool}`

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          summary === undefined
            ? `*${title}*${actor}${time}\n${result.message}`
            : `*${title}*${actor}${time}\n${summary}`,
      },
    },
    ...createDecisionContextBlocks(tool, result.message),
  ]
}

function createDecisionContextBlocks(
  tool: string | undefined,
  message: string
): SlackBlock[] {
  if (tool === undefined) {
    return []
  }

  return [
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `*Tool:* ${tool}` }],
    },
    { type: "context", elements: [{ type: "mrkdwn", text: message }] },
  ]
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

function truncateSlackText(value: string, maximumLength: number) {
  return value.length <= maximumLength
    ? value
    : `${value.slice(0, maximumLength - 3)}...`
}
