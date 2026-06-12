import { v } from "convex/values"
import { internalMutation } from "../_generated/server"
import { startEventAutomations } from "../automations/data"
import { actorValidator } from "../shared/actor"

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

    const existing = await ctx.db
      .query("events")
      .withIndex("by_integration_and_key", (index) =>
        index.eq("integrationId", integration._id).eq("key", args.key)
      )
      .first()

    if (existing !== null) {
      return { status: "duplicate" as const, eventId: existing._id }
    }

    const now = Date.now()
    const eventId = await ctx.db.insert("events", {
      tenantId: integration.tenantId,
      integrationId: integration._id,
      key: args.key,
      type: args.type,
      resource: args.resource,
      actor: args.actor,
      text: args.text,
      data: args.data,
      observedAt: args.observedAt,
      createdAt: now,
    })
    const event = await ctx.db.get(eventId)

    if (event === null) {
      throw new Error("Event insert failed.")
    }

    const runIds = await startEventAutomations(ctx, { event, now })

    return {
      status: "recorded" as const,
      eventId,
      runIds,
    }
  },
})
