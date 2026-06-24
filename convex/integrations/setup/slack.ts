import { createSlackCard } from "../../providers/slack/card"
import {
  formatSlackTime,
  toSlackTimestamp,
  truncateSlackText,
} from "../../providers/slack/format"
import { type Integration, integrationLabel } from "../../shared/integrations"

const setupLinkActionId = "milo_setup_link_open"
const setupLinkSummaryLimit = 200

type SlackSetupLinkStatus = "connected" | "expired" | "failed" | "pending"

export function createSlackSetupLinkMessage(args: {
  expiresAt: number
  integration: Integration
  iconUrl: string
  status?: SlackSetupLinkStatus
  summary: string
  updatedAt?: number
  url?: string
}) {
  const label = integrationLabel(args.integration)
  const status = args.status ?? "pending"
  const title = setupTitle(status, label)
  const summary = truncateSlackText(args.summary, setupLinkSummaryLimit)

  return {
    text: [title, summary, setupFallback(status, label, args.expiresAt)].join(
      "\n"
    ),
    blocks: [
      createSlackCard({
        icon: {
          type: "image",
          image_url: args.iconUrl,
          alt_text: `${label} logo`,
        },
        title: setupCardTitle(status),
        subtitle: label,
        body: summary,
        subtext: setupSubtext({
          expiresAt: args.expiresAt,
          label,
          status,
          updatedAt: args.updatedAt,
        }),
        actions: setupActions(status, label, args.url),
      }),
    ],
  }
}

export function isSlackSetupLinkInteraction(payload: unknown) {
  return readActionIds(payload).includes(setupLinkActionId)
}

function readActionIds(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return []
  }

  const actions = (payload as { actions?: unknown }).actions

  if (!Array.isArray(actions)) {
    return []
  }

  return actions.flatMap((action) => {
    if (typeof action !== "object" || action === null) {
      return []
    }

    const actionId = (action as { action_id?: unknown }).action_id

    return typeof actionId === "string" ? [actionId] : []
  })
}

function setupTitle(status: SlackSetupLinkStatus, label: string) {
  if (status === "connected") {
    return `${label} connected to Milo`
  }

  if (status === "failed") {
    return `${label} connection failed`
  }

  if (status === "expired") {
    return `${label} setup offer expired`
  }

  return `Connect ${label} to Milo`
}

function setupCardTitle(status: SlackSetupLinkStatus) {
  if (status === "connected") {
    return "Connection complete"
  }

  if (status === "failed") {
    return "Connection failed"
  }

  if (status === "expired") {
    return "Setup offer expired"
  }

  return "Connection required"
}

function setupFallback(
  status: SlackSetupLinkStatus,
  label: string,
  expiresAt: number
) {
  if (status === "connected") {
    return `${label} is connected.`
  }

  if (status === "failed") {
    return `The ${label} connection did not finish.`
  }

  if (status === "expired") {
    return `The ${label} setup offer expired.`
  }

  return `Expires at ${formatSlackTime(toSlackTimestamp(expiresAt))}.`
}

function setupActions(
  status: SlackSetupLinkStatus,
  label: string,
  url: string | undefined
) {
  if (status !== "pending" || url === undefined) {
    return undefined
  }

  return [
    {
      type: "button",
      action_id: setupLinkActionId,
      style: "primary",
      text: {
        type: "plain_text",
        text: `Connect ${label}`,
        emoji: false,
      },
      url,
    },
  ]
}

function setupSubtext(args: {
  expiresAt: number
  label: string
  status: SlackSetupLinkStatus
  updatedAt: number | undefined
}) {
  if (args.status === "connected") {
    return `Connected at ${formatSlackTime(
      toSlackTimestamp(args.updatedAt ?? Date.now())
    )}. You can manage ${args.label} access from Milo.`
  }

  if (args.status === "failed") {
    return `Failed at ${formatSlackTime(
      toSlackTimestamp(args.updatedAt ?? Date.now())
    )}. You'll review permissions before connecting.`
  }

  if (args.status === "expired") {
    return `Expired at ${formatSlackTime(
      toSlackTimestamp(args.expiresAt)
    )}. Ask Milo for a new setup offer.`
  }

  return `Expires at ${formatSlackTime(
    toSlackTimestamp(args.expiresAt)
  )}. You'll review permissions before connecting.`
}
