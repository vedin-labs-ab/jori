import { type ToolSurface } from "../../../shared/integrations"
import { getToolLabel } from "../../../shared/tools/labels"
import { createSlackCard, slackCardBodyLimit } from "../card"
import { type SlackBlock } from "../delivery/messages"
import { formatSlackTime, toSlackTimestamp, truncateSlackText } from "../format"

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
      "Jori needs approval before continuing.",
      `Action: ${getToolLabel(args.tool)}`,
      args.summary,
    ].join("\n"),
    blocks: createSlackApprovalBlocks(args),
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
    createSlackCard({
      icon: { type: "icon", name: "edit" },
      title: "Approval required",
      subtitle: getToolLabel(args.tool),
      body: truncateSlackText(args.summary, slackCardBodyLimit),
      subtext: `Expires at ${formatSlackTime(
        toSlackTimestamp(args.expiresAt)
      )}`,
      actions: createApprovalActions(args.code),
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
      action_id: "jori_approval_deny",
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
      action_id: "jori_approval_approve",
      value: JSON.stringify({ code }),
    },
  ]
}
