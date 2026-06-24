import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server"
import { updateSlackMessage } from "../../broker/tools/slack"
import { readAppOrigin } from "../../shared/app"
import { integrationLogoUrl } from "./logos"
import { createSlackSetupLinkMessage } from "./slack"
import { markSetupLinkExpired } from "./transition"

type TerminalSetupStatus = "connected" | "expired" | "failed"

export const expire = internalAction({
  args: {
    setupLinkId: v.id("setupLinks"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.integrations.setup.lifecycle.markExpired, {
      setupLinkId: args.setupLinkId,
    })
  },
})

export const sync = internalAction({
  args: {
    setupLinkId: v.id("setupLinks"),
  },
  handler: async (ctx, args) => {
    const target = await ctx.runQuery(
      internal.integrations.setup.lifecycle.getSurfaceTarget,
      {
        setupLinkId: args.setupLinkId,
      }
    )

    if (target === null) {
      return
    }

    await syncSlackSurface(target)
  },
})

export const markExpired = internalMutation({
  args: {
    setupLinkId: v.id("setupLinks"),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.setupLinkId)

    if (
      link === null ||
      link.status === "connected" ||
      link.status === "expired" ||
      Date.now() < link.expiresAt
    ) {
      return null
    }

    await markSetupLinkExpired(ctx, link, Date.now())

    return null
  },
})

export const getSurfaceTarget = internalQuery({
  args: {
    setupLinkId: v.id("setupLinks"),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.setupLinkId)

    if (link === null) {
      return null
    }

    const status = terminalStatus(link.status)

    if (status === null) {
      return null
    }

    const delivery = link.delivery

    if (delivery === undefined) {
      return null
    }

    const integration = await ctx.db.get(delivery.integrationId)

    if (
      integration === null ||
      integration.status !== "active" ||
      integration.tenantId !== link.tenantId ||
      integration.integration !== delivery.integration
    ) {
      return null
    }

    return { delivery, integration, link: { ...link, status } }
  },
})

async function syncSlackSurface(target: {
  delivery: Extract<Doc<"setupLinks">["delivery"], { integration: "slack" }>
  integration: Doc<"integrations">
  link: Doc<"setupLinks"> & { status: TerminalSetupStatus }
}) {
  const origin = readAppOrigin()

  if (origin === undefined) {
    throw new Error("MILO_APP_URL must be configured to update setup offers.")
  }

  const message = createSlackSetupLinkMessage({
    expiresAt: target.link.expiresAt,
    integration: target.link.integration,
    logoUrl: integrationLogoUrl(target.link.integration, origin),
    status: target.link.status,
    summary: target.link.summary ?? "Milo requested this connection.",
    updatedAt: target.link.updatedAt,
  })

  await updateSlackMessage(target.integration, {
    channel: target.delivery.data.channelId,
    ts: target.delivery.data.messageTs,
    text: message.text,
    blocks: message.blocks,
  })
}

function terminalStatus(
  status: Doc<"setupLinks">["status"]
): TerminalSetupStatus | null {
  return status === "connected" || status === "expired" || status === "failed"
    ? status
    : null
}
