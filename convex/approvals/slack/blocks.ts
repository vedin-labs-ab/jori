import { type SlackBlock } from "../../broker/tools/slack"
import { type ToolSurface } from "../../shared/integrations"
import { type SlackApprovalDecisionResult } from "../runtime"
import {
  createApprovalCard,
  formatSlackTime,
  toSlackTimestamp,
  truncateSlackText,
} from "./cards"
import { createDecisionTitle, getDecisionIcon } from "./decision"
import { getToolLabel } from "./labels"

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
  surface: ToolSurface
  tool: string
  summary: string
  expiresAt: number
}) {
  return {
    text: [
      "Milo needs approval before continuing.",
      `Action: ${getToolLabel(args.tool)}`,
      args.summary,
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

export function createSlackConsoleDecisionResponse(
  result: SlackApprovalDecisionResult
) {
  if (result.status === "expired" && result.approval !== undefined) {
    return createSlackExpirationResponse(result.approval)
  }

  return {
    replace_original: true,
    text: createDecisionFallbackText(result),
    blocks: createConsoleDecisionBlocks(result),
  }
}

export function createSlackExpirationResponse(args: {
  tool: string
  summary: string
  expiresAt: number
}) {
  return {
    replace_original: true,
    text: "Request expired. Milo skipped this action.",
    blocks: createExpirationBlocks(args),
  }
}

function createSlackApprovalBlocks(args: {
  code: string
  surface: ToolSurface
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
    return "Denied. Milo is continuing without this action."
  }

  return result.message
}

function createDecisionBlocks(
  interaction: SlackApprovalInteraction,
  result: SlackApprovalDecisionResult
): SlackBlock[] {
  const summary = result.approval?.summary
  const subtitle =
    result.approval === undefined
      ? undefined
      : getToolLabel(result.approval.tool)

  return [
    createApprovalCard({
      icon: getDecisionIcon(result.status, result.approval?.decision),
      title: createDecisionTitle(result, {
        fallbackActor: formatSlackActor(interaction.actorId),
      }),
      subtitle,
      body: summary ?? result.message,
    }),
  ]
}

function createConsoleDecisionBlocks(
  result: SlackApprovalDecisionResult
): SlackBlock[] {
  const summary = result.approval?.summary
  const subtitle =
    result.approval === undefined
      ? undefined
      : getToolLabel(result.approval.tool)

  return [
    createApprovalCard({
      icon: getDecisionIcon(result.status, result.approval?.decision),
      title: createDecisionTitle(result, { surface: "milo" }),
      subtitle,
      body: summary ?? result.message,
    }),
  ]
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

function formatSlackActor(actorId: string | undefined) {
  return actorId === undefined ? "unknown user" : `<@${actorId}>`
}
