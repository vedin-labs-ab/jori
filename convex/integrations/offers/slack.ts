import { type Id } from "../../_generated/dataModel"
import { type Actor, getActorDisplayName } from "../../shared/actor"
import { type Integration, integrationLabel } from "../../shared/integrations"
import { createSlackCard } from "../slack/card"
import {
  formatSlackTime,
  toSlackTimestamp,
  truncateSlackText,
} from "../slack/format"
import {
  integrationOfferCancelActionId,
  integrationOfferOpenActionId,
} from "./interaction"

const integrationOfferSummaryLimit = 200

type SlackIntegrationOfferStatus =
  | "cancelled"
  | "connected"
  | "expired"
  | "failed"
  | "pending"

export function createSlackIntegrationOfferMessage(args: {
  actor?: Actor
  expiresAt: number
  integration: Integration
  integrationOfferId?: Id<"integrationOffers">
  status?: SlackIntegrationOfferStatus
  summary: string
  updatedAt?: number
  url?: string
}) {
  const label = integrationLabel(args.integration)
  const status = args.status ?? "pending"
  const title = offerTitle({ actor: args.actor, label, status })
  const summary = truncateSlackText(args.summary, integrationOfferSummaryLimit)

  return {
    text: [title, summary, offerFallback(status, label, args.expiresAt)].join(
      "\n"
    ),
    blocks: [
      createSlackCard({
        icon: {
          type: "icon",
          name: offerCardIcon(status),
        },
        title: offerCardTitle({ actor: args.actor, status }),
        subtitle: `Connect ${label}`,
        body: summary,
        subtext: offerSubtext({
          expiresAt: args.expiresAt,
          status,
          updatedAt: args.updatedAt,
        }),
        actions: offerActions({
          label,
          integrationOfferId: args.integrationOfferId,
          status,
          url: args.url,
        }),
      }),
    ],
  }
}

function offerTitle(args: {
  actor: Actor | undefined
  label: string
  status: SlackIntegrationOfferStatus
}) {
  if (args.status === "cancelled") {
    const actor = getActorDisplayName(args.actor)

    return actor === undefined
      ? `${args.label} integration offer cancelled`
      : `${args.label} integration offer cancelled by ${actor}`
  }

  if (args.status === "connected") {
    const actor = getActorDisplayName(args.actor)

    return actor === undefined
      ? `${args.label} connected to Milo`
      : `${args.label} connected by ${actor}`
  }

  if (args.status === "failed") {
    return `${args.label} integration failed`
  }

  if (args.status === "expired") {
    return `${args.label} integration offer expired`
  }

  return `Connect ${args.label} to Milo`
}

function offerCardTitle(args: {
  actor: Actor | undefined
  status: SlackIntegrationOfferStatus
}) {
  if (args.status === "cancelled") {
    const actor = getActorDisplayName(args.actor)

    return actor === undefined ? "Offer cancelled" : `Cancelled by ${actor}`
  }

  if (args.status === "connected") {
    const actor = getActorDisplayName(args.actor)

    return actor === undefined
      ? "Integration connected"
      : `Connected by ${actor}`
  }

  if (args.status === "failed") {
    return "Integration failed"
  }

  if (args.status === "expired") {
    return "Offer expired"
  }

  return "Integration offer"
}

function offerCardIcon(status: SlackIntegrationOfferStatus) {
  if (status === "cancelled") {
    return "archive"
  }

  return status === "connected" ? "check" : "link"
}

function offerFallback(
  status: SlackIntegrationOfferStatus,
  label: string,
  expiresAt: number
) {
  if (status === "cancelled") {
    return `The ${label} integration offer was cancelled.`
  }

  if (status === "connected") {
    return `${label} is connected.`
  }

  if (status === "failed") {
    return `The ${label} integration did not finish.`
  }

  if (status === "expired") {
    return `The ${label} integration offer expired.`
  }

  return `Expires at ${formatSlackTime(toSlackTimestamp(expiresAt))}`
}

function offerActions(args: {
  label: string
  integrationOfferId: Id<"integrationOffers"> | undefined
  status: SlackIntegrationOfferStatus
  url: string | undefined
}) {
  if (args.status !== "pending") {
    return undefined
  }

  const actions: Record<string, unknown>[] = []

  if (args.integrationOfferId !== undefined) {
    actions.push({
      type: "button",
      action_id: integrationOfferCancelActionId,
      text: {
        type: "plain_text",
        text: "Cancel",
        emoji: false,
      },
      value: JSON.stringify({ integrationOfferId: args.integrationOfferId }),
    })
  }

  if (args.url !== undefined) {
    actions.push({
      type: "button",
      action_id: integrationOfferOpenActionId,
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

function offerSubtext(args: {
  expiresAt: number
  status: SlackIntegrationOfferStatus
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
