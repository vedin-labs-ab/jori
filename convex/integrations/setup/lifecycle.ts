import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server"
import { updateSlackMessage } from "../../broker/tools/slack"
import { actorValidator } from "../../shared/actor"
import { createSlackSetupLinkMessage } from "./slack"
import { markSetupLinkCancelled, markSetupLinkExpired } from "./transition"

type TerminalSetupStatus = "cancelled" | "connected" | "expired" | "failed"

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
      terminalStatus(link.status) !== null ||
      Date.now() < link.expiresAt
    ) {
      return null
    }

    await markSetupLinkExpired(ctx, link, Date.now())

    return null
  },
})

export const cancel = internalMutation({
  args: {
    accountId: v.string(),
    actor: v.optional(actorValidator),
    channelId: v.string(),
    messageTs: v.string(),
    setupLinkId: v.id("setupLinks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.setupLinkId)

    if (link === null) {
      return null
    }

    const delivery = link.delivery

    if (
      delivery?.integration !== "slack" ||
      delivery.data.channelId !== args.channelId ||
      delivery.data.messageTs !== args.messageTs
    ) {
      return null
    }

    const integration = await ctx.db.get(delivery.integrationId)

    if (
      integration === null ||
      integration.integration !== delivery.integration ||
      integration.externalId !== args.accountId
    ) {
      return null
    }

    await markSetupLinkCancelled(ctx, link, {
      actor: args.actor,
      now: Date.now(),
    })

    return null
  },
})

export const cancelForRun = internalMutation({
  args: {
    setupLinkId: v.id("setupLinks"),
    runId: v.id("runs"),
    tenantId: v.string(),
    reason: v.string(),
  },
  returns: v.object({
    status: v.union(
      v.literal("cancelled"),
      v.literal("missing"),
      v.literal("settled")
    ),
  }),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.setupLinkId)

    if (
      link === null ||
      link.runId !== args.runId ||
      link.tenantId !== args.tenantId
    ) {
      return { status: "missing" as const }
    }

    if (link.status !== "pending" && link.status !== "claimed") {
      return { status: "settled" as const }
    }

    await markSetupLinkCancelled(ctx, link, {
      actor: undefined,
      reason: args.reason,
      now: Date.now(),
    })

    return { status: "cancelled" as const }
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
    const delivery = link.delivery

    if (status === null || delivery === undefined) {
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
  const message = createSlackSetupLinkMessage({
    expiresAt: target.link.expiresAt,
    integration: target.link.integration,
    actor: target.link.result?.actor,
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
  if (
    status === "cancelled" ||
    status === "connected" ||
    status === "expired" ||
    status === "failed"
  ) {
    return status
  }

  return null
}
