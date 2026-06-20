import { v } from "convex/values"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { recordEvent } from "../../events/data"
import {
  type Actor,
  actorValidator,
  getActorExternalId,
} from "../../shared/actor"
import { readProviderDataString } from "../data"

const eventCriteriaValue = v.union(v.string(), v.number())
const eventCriteria = v.record(v.string(), eventCriteriaValue)

export function getNotionBotId(data: unknown) {
  return readProviderDataString(data, "botId")
}

export const recordWebhookEvent = internalMutation({
  args: {
    workspaceId: v.string(),
    key: v.string(),
    type: v.string(),
    resource: v.optional(v.string()),
    criteria: v.optional(eventCriteria),
    actor: v.optional(actorValidator),
    data: v.optional(v.any()),
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
      resource: args.resource,
      criteria: args.criteria,
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
