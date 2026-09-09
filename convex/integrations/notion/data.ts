import { v } from "convex/values"
import { internalMutation, internalQuery } from "../../_generated/server"
import { recordEvent } from "../../events/data"
import { eventData, eventMatch } from "../../events/schema"
import {
  type Actor,
  actorValidator,
  getActorExternalId,
} from "../../shared/actor"
import { readDataString } from "../../shared/data"
import { requireNotionCredentials } from "./credentials"

export const recordWebhookEvent = internalMutation({
  args: {
    workspaceId: v.string(),
    integrationId: v.id("integrations"),
    expectedConnectionGeneration: v.number(),
    key: v.string(),
    type: v.string(),
    match: v.optional(eventMatch),
    actor: v.optional(actorValidator),
    data: v.optional(eventData),
    observedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (
      integration === null ||
      integration.integration !== "notion" ||
      integration.status !== "active" ||
      integration.externalId !== args.workspaceId ||
      (integration.connectionGeneration ?? 0) !==
        args.expectedConnectionGeneration
    ) {
      return { status: "missing_integration" as const }
    }

    if (isNotionBotEvent(args.actor, integration.data)) {
      return { status: "ignored_bot" as const }
    }

    const result = await recordEvent(ctx, {
      integration,
      key: args.key,
      type: args.type,
      match: args.match,
      actor: args.actor,
      data: args.data,
      observedAt: args.observedAt,
    })

    return {
      status: result.status,
      eventId: result.eventId,
      runIds: result.status === "recorded" ? result.runIds : [],
    }
  },
})

function isNotionBotEvent(actor: Actor | undefined, data: unknown) {
  const actorId = getActorExternalId(actor)
  const botId = readDataString(data, "botId")

  return actorId !== undefined && botId !== undefined && actorId === botId
}

export const get = internalQuery({
  args: { integrationId: v.id("integrations") },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)
    return integration?.integration === "notion" &&
      integration.status === "active"
      ? integration
      : null
  },
})

export const expire = internalMutation({
  args: { integrationId: v.id("integrations"), accessToken: v.string() },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)
    if (
      integration?.integration !== "notion" ||
      integration.status !== "active" ||
      requireNotionCredentials(integration).tokens.access !== args.accessToken
    ) {
      return false
    }
    await ctx.db.patch(integration._id, {
      status: "expired",
      updatedAt: Date.now(),
    })
    return true
  },
})
