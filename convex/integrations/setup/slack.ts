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
  logoUrl: string
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
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${title}*\n\n${summary}`,
        },
        accessory: {
          type: "image",
          image_url: args.logoUrl,
          alt_text: `${label} logo`,
        },
      },
      ...setupActionBlocks(status, label, args.url),
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: setupSubtext({
              expiresAt: args.expiresAt,
              label,
              status,
              updatedAt: args.updatedAt,
            }),
          },
        ],
      },
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

function setupActionBlocks(
  status: SlackSetupLinkStatus,
  label: string,
  url: string | undefined
) {
  if (status !== "pending" || url === undefined) {
    return []
  }

  return [
    {
      type: "actions",
      elements: [
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
      ],
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
    return `:lock: Connected at ${formatSlackTime(
      toSlackTimestamp(args.updatedAt ?? Date.now())
    )}. You can manage ${args.label} access from Milo.`
  }

  if (args.status === "failed") {
    return `:lock: Failed at ${formatSlackTime(
      toSlackTimestamp(args.updatedAt ?? Date.now())
    )}. You'll review permissions before connecting.`
  }

  if (args.status === "expired") {
    return `:lock: Expired at ${formatSlackTime(
      toSlackTimestamp(args.expiresAt)
    )}. Ask Milo for a new setup offer.`
  }

  return `:lock: Expires at ${formatSlackTime(
    toSlackTimestamp(args.expiresAt)
  )}. You'll review permissions before connecting.`
}
