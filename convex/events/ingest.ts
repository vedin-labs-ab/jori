import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import { actorValidator } from "../shared/actor"
import { recordEvent } from "./data"

export const record = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    key: v.string(),
    type: v.string(),
    resource: v.optional(v.string()),
    actor: v.optional(actorValidator),
    text: v.optional(v.string()),
    data: v.optional(v.any()),
    observedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)

    if (integration === null || integration.status !== "active") {
      return { status: "missing_integration" as const }
    }

    const result = await recordEvent(ctx, {
      integration,
      key: args.key,
      type: args.type,
      resource: args.resource,
      actor: args.actor,
      text: args.text,
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
