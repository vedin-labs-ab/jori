import { type Doc } from "../../_generated/dataModel"
import { updateSlackMessage } from "../../providers/slack/delivery/messages"
import { getActorDisplayName } from "../../shared/actor"
import {
  createApprovalCard,
  formatSlackTime,
  toSlackTimestamp,
  truncateSlackText,
} from "./cards"
import { getToolLabel } from "./labels"

const cardBodyLimit = 200

type SlackApprovalDelivery = Extract<
  NonNullable<Doc<"approvals">["delivery"]>,
  { integration: "slack" }
>

export async function syncSlackApprovalSurface(args: {
  approval: Doc<"approvals">
  delivery: SlackApprovalDelivery
  integration: Doc<"integrations">
}) {
  const message = createSlackApprovalSurfaceMessage(args.approval)

  await updateSlackMessage(args.integration, {
    channel: args.delivery.data.channelId,
    ts: args.delivery.data.messageTs,
    text: message.text,
    blocks: message.blocks,
  })
}

export function createSlackApprovalSurfaceMessage(approval: Doc<"approvals">) {
  return {
    text: fallbackText(approval),
    blocks: [
      createApprovalCard({
        icon: icon(approval.status),
        title: title(approval),
        subtitle: getToolLabel(approval.tool),
        body: truncateSlackText(approval.summary, cardBodyLimit),
        subtext: subtext(approval),
      }),
    ],
  }
}

function fallbackText(approval: Doc<"approvals">) {
  if (approval.status === "approved") {
    return "Approved. Milo is continuing the run."
  }

  if (approval.status === "denied") {
    return "Denied. Milo is continuing without this action."
  }

  if (approval.status === "cancelled") {
    return "Request cancelled. Milo skipped this action."
  }

  if (approval.status === "expired") {
    return "Request expired. Milo skipped this action."
  }

  if (approval.status === "failed") {
    return "Request failed. Milo skipped this action."
  }

  return "Approval request updated."
}

function icon(status: Doc<"approvals">["status"]) {
  if (status === "denied") {
    return "thumbs-down"
  }

  if (status === "cancelled" || status === "expired" || status === "failed") {
    return "archive"
  }

  return "check"
}

function title(approval: Doc<"approvals">) {
  if (approval.status === "approved") {
    return actorTitle("Approved", approval.decidedBy)
  }

  if (approval.status === "denied") {
    return actorTitle("Denied", approval.decidedBy)
  }

  if (approval.status === "cancelled") {
    return actorTitle("Request cancelled", approval.cancelledBy)
  }

  if (approval.status === "expired") {
    return "Request expired"
  }

  if (approval.status === "failed") {
    return "Request failed"
  }

  return "Approval updated"
}

function actorTitle(label: string, actor: Doc<"approvals">["decidedBy"]) {
  const name = getActorDisplayName(actor)

  if (name === undefined) {
    return label
  }

  const surface = actor !== undefined && "personId" in actor ? " in Milo" : ""

  return `${label} by ${name}${surface}`
}

function subtext(approval: Doc<"approvals">) {
  if (approval.status === "approved" && approval.decidedAt !== undefined) {
    return `Approved at ${formatSlackTime(toSlackTimestamp(approval.decidedAt))}`
  }

  if (approval.status === "denied" && approval.decidedAt !== undefined) {
    return `Denied at ${formatSlackTime(toSlackTimestamp(approval.decidedAt))}`
  }

  if (approval.status === "cancelled") {
    return `Cancelled at ${formatSlackTime(
      toSlackTimestamp(approval.cancelledAt ?? Date.now())
    )}`
  }

  if (approval.status === "expired") {
    return `Expired at ${formatSlackTime(toSlackTimestamp(approval.expiresAt))}`
  }

  if (approval.status === "failed") {
    return "Approval delivery failed"
  }

  return `Updated at ${formatSlackTime(toSlackTimestamp(Date.now()))}`
}
