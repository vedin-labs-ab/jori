import { type Doc } from "../_generated/dataModel"
import { getSlackChannelId, getSlackMessageTs } from "../providers/slack/data"
import { slackMessageUrl } from "../providers/slack/links"
import { toolSurfaceLabel } from "../shared/integrations"
import { getToolLabel } from "./slack/labels"

export function summarizeApproval(args: {
  approval: Doc<"approvals">
  approvalDeliveryIntegration: Doc<"integrations"> | null
  integration: Doc<"integrations"> | null
  message: Doc<"messages"> | null
}) {
  const state = getApprovalState(args.approval)

  return {
    decidedAt: args.approval.decidedAt,
    delivery: deliveryLabel(args.approval.delivery),
    expiresAt: args.approval.expiresAt,
    id: args.approval._id,
    surface: args.approval.surface,
    source: approvalSource(args),
    state,
    summary: args.approval.summary,
    tool: args.approval.tool,
    toolLabel: getToolLabel(args.approval.tool),
  }
}

function getApprovalState(approval: Doc<"approvals">) {
  if (approval.decision !== undefined) {
    return approval.decision
  }

  return Date.now() > approval.expiresAt
    ? ("expired" as const)
    : ("pending" as const)
}

function approvalSource({
  approval,
  approvalDeliveryIntegration,
  integration,
  message,
}: {
  approval: Doc<"approvals">
  approvalDeliveryIntegration: Doc<"integrations"> | null
  integration: Doc<"integrations"> | null
  message: Doc<"messages"> | null
}) {
  const messageUrl = slackMessageUrl({
    channelId: getSlackChannelId(message?.data),
    messageTs: getSlackMessageTs(message?.data),
    teamId:
      integration?.integration === "slack" ? integration.externalId : null,
  })

  if (messageUrl !== undefined) {
    return {
      label: "Request message",
      integration: "slack",
      url: messageUrl,
    }
  }

  const deliveryUrl =
    approval.delivery?.integration === "slack"
      ? slackMessageUrl({
          channelId: approval.delivery.data.channelId,
          messageTs: approval.delivery.data.messageTs,
          teamId: approvalDeliveryIntegration?.externalId ?? null,
        })
      : undefined

  if (deliveryUrl !== undefined) {
    return {
      label: "Delivered to Slack",
      integration: "slack",
      url: deliveryUrl,
    }
  }

  const label = deliveryLabel(approval.delivery)

  return label === undefined
    ? undefined
    : {
        label,
        integration: approval.delivery?.integration,
      }
}

function deliveryLabel(delivery: Doc<"approvals">["delivery"]) {
  if (delivery === undefined) {
    return undefined
  }

  if (delivery.integration === "slack") {
    return "Delivered to Slack"
  }

  return `Delivered to ${toolSurfaceLabel(delivery.integration)}`
}
