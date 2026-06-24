import { type Id } from "../../_generated/dataModel"
import { createSlackCard } from "../../providers/slack/card"
import {
  formatSlackTime,
  toSlackTimestamp,
  truncateSlackText,
} from "../../providers/slack/format"
import { type Actor, getActorDisplayName } from "../../shared/actor"
import { type Integration, integrationLabel } from "../../shared/integrations"
import { setupLinkCancelActionId, setupLinkOpenActionId } from "./interaction"

const setupLinkSummaryLimit = 200

type SlackSetupLinkStatus =
  | "cancelled"
  | "connected"
  | "expired"
  | "failed"
  | "pending"

export function createSlackSetupLinkMessage(args: {
  actor?: Actor
  expiresAt: number
  integration: Integration
  setupLinkId?: Id<"setupLinks">
  status?: SlackSetupLinkStatus
  summary: string
  updatedAt?: number
  url?: string
}) {
  const label = integrationLabel(args.integration)
  const status = args.status ?? "pending"
  const title = setupTitle({ actor: args.actor, label, status })
  const summary = truncateSlackText(args.summary, setupLinkSummaryLimit)

  return {
    text: [title, summary, setupFallback(status, label, args.expiresAt)].join(
      "\n"
    ),
    blocks: [
      createSlackCard({
        icon: {
          type: "icon",
          name: setupCardIcon(status),
        },
        title: setupCardTitle({ actor: args.actor, status }),
        subtitle: `Configure ${label}`,
        body: summary,
        subtext: setupSubtext({
          expiresAt: args.expiresAt,
          status,
          updatedAt: args.updatedAt,
        }),
        actions: setupActions({
          label,
          setupLinkId: args.setupLinkId,
          status,
          url: args.url,
        }),
      }),
    ],
  }
}

function setupTitle(args: {
  actor: Actor | undefined
  label: string
  status: SlackSetupLinkStatus
}) {
  if (args.status === "cancelled") {
    const actor = getActorDisplayName(args.actor)

    return actor === undefined
      ? `${args.label} connection cancelled`
      : `${args.label} connection cancelled by ${actor}`
  }

  if (args.status === "connected") {
    const actor = getActorDisplayName(args.actor)

    return actor === undefined
      ? `${args.label} connected to Milo`
      : `${args.label} connected by ${actor}`
  }

  if (args.status === "failed") {
    return `${args.label} connection failed`
  }

  if (args.status === "expired") {
    return `${args.label} connection request expired`
  }

  return `Connect ${args.label} to Milo`
}

function setupCardTitle(args: {
  actor: Actor | undefined
  status: SlackSetupLinkStatus
}) {
  if (args.status === "cancelled") {
    const actor = getActorDisplayName(args.actor)

    return actor === undefined
      ? "Connection cancelled"
      : `Cancelled by ${actor}`
  }

  if (args.status === "connected") {
    const actor = getActorDisplayName(args.actor)

    return actor === undefined ? "Connection complete" : `Connected by ${actor}`
  }

  if (args.status === "failed") {
    return "Connection failed"
  }

  if (args.status === "expired") {
    return "Connection request expired"
  }

  return "Connection request"
}

function setupCardIcon(status: SlackSetupLinkStatus) {
  if (status === "cancelled") {
    return "archive"
  }

  return status === "connected" ? "check" : "link"
}

function setupFallback(
  status: SlackSetupLinkStatus,
  label: string,
  expiresAt: number
) {
  if (status === "cancelled") {
    return `The ${label} connection request was cancelled.`
  }

  if (status === "connected") {
    return `${label} is connected.`
  }

  if (status === "failed") {
    return `The ${label} connection did not finish.`
  }

  if (status === "expired") {
    return `The ${label} connection request expired.`
  }

  return `Expires at ${formatSlackTime(toSlackTimestamp(expiresAt))}`
}

function setupActions(args: {
  label: string
  setupLinkId: Id<"setupLinks"> | undefined
  status: SlackSetupLinkStatus
  url: string | undefined
}) {
  if (args.status !== "pending") {
    return undefined
  }

  const actions: Record<string, unknown>[] = []

  if (args.setupLinkId !== undefined) {
    actions.push({
      type: "button",
      action_id: setupLinkCancelActionId,
      text: {
        type: "plain_text",
        text: "Cancel",
        emoji: false,
      },
      value: JSON.stringify({ setupLinkId: args.setupLinkId }),
    })
  }

  if (args.url !== undefined) {
    actions.push({
      type: "button",
      action_id: setupLinkOpenActionId,
      style: "primary",
      text: {
        type: "plain_text",
        text: `Connect ${args.label}`,
        emoji: false,
      },
      url: args.url,
    })
  }

  return actions.length === 0 ? undefined : actions
}

function setupSubtext(args: {
  expiresAt: number
  status: SlackSetupLinkStatus
  updatedAt: number | undefined
}) {
  if (args.status === "cancelled") {
    return `Cancelled at ${formatSlackTime(
      toSlackTimestamp(args.updatedAt ?? Date.now())
    )}`
  }

  if (args.status === "connected") {
    return `Connected at ${formatSlackTime(
      toSlackTimestamp(args.updatedAt ?? Date.now())
    )}`
  }

  if (args.status === "failed") {
    return `Failed at ${formatSlackTime(
      toSlackTimestamp(args.updatedAt ?? Date.now())
    )}`
  }

  if (args.status === "expired") {
    return `Expired at ${formatSlackTime(toSlackTimestamp(args.expiresAt))}`
  }

  return `Expires at ${formatSlackTime(toSlackTimestamp(args.expiresAt))}`
}
