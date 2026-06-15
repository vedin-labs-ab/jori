import { type Doc } from "../_generated/dataModel"
import { providerLabel } from "../providers/catalog"
import { slackMessageUrl } from "../providers/slack/links"
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
    provider: args.approval.provider,
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
    channelId: readString(message?.data, "channelId"),
    messageTs: readString(message?.data, "ts"),
    teamId: integration?.provider === "slack" ? integration.externalId : null,
  })

  if (messageUrl !== undefined) {
    return {
      label: "Request message",
      provider: "slack",
      url: messageUrl,
    }
  }

  const deliveryUrl =
    approval.delivery?.provider === "slack"
      ? slackMessageUrl({
          channelId: approval.delivery.data.channelId,
          messageTs: approval.delivery.data.messageTs,
          teamId: approvalDeliveryIntegration?.externalId ?? null,
        })
      : undefined

  if (deliveryUrl !== undefined) {
    return {
      label: "Delivered to Slack",
      provider: "slack",
      url: deliveryUrl,
    }
  }

  const label = deliveryLabel(approval.delivery)

  return label === undefined
    ? undefined
    : {
        label,
        provider: approval.delivery?.provider,
      }
}

function deliveryLabel(delivery: Doc<"approvals">["delivery"]) {
  if (delivery === undefined) {
    return undefined
  }

  if (delivery.provider === "slack") {
    return "Delivered to Slack"
  }

  return `Delivered to ${providerLabel(delivery.provider)}`
}

function readString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null || !(key in data)) {
    return undefined
  }

  const value = data[key as keyof typeof data]

  return typeof value === "string" && value !== "" ? value : undefined
}
