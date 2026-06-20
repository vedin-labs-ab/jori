import { v } from "convex/values"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { recordEvent } from "../../events/data"
import { eventData, eventMatch } from "../../events/schema"
import {
  type Actor,
  actorValidator,
  getActorExternalId,
} from "../../shared/actor"
import { readProviderDataString } from "../data"

export function getNotionBotId(data: unknown) {
  return readProviderDataString(data, "botId")
}

export const recordWebhookEvent = internalMutation({
  args: {
    workspaceId: v.string(),
    key: v.string(),
    type: v.string(),
    match: v.optional(eventMatch),
    actor: v.optional(actorValidator),
    data: v.optional(eventData),
    observedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const integration = await findActiveNotionIntegration(ctx, args.workspaceId)

    if (integration === null) {
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

async function findActiveNotionIntegration(
  ctx: MutationCtx,
  workspaceId: string
) {
  const integration = await ctx.db
    .query("integrations")
    .withIndex("by_integration_and_external", (query) =>
      query.eq("integration", "notion").eq("externalId", workspaceId)
    )
    .first()

  if (integration === null || integration.status !== "active") {
    return null
  }

  return integration
}

function isNotionBotEvent(actor: Actor | undefined, data: unknown) {
  const actorId = getActorExternalId(actor)
  const botId = getNotionBotId(data)

  return actorId !== undefined && botId !== undefined && actorId === botId
}
