import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { startEventAutomations } from "../automations/data"
import { createSourceMetadata } from "../sources/metadata"

export async function recordEvent(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    key: string
    type: string
    resource?: string
    criteria?: Doc<"events">["criteria"]
    actor?: Doc<"events">["actor"]
    text?: string
    data?: unknown
    observedAt?: number
    now?: number
  }
): Promise<
  | { status: "duplicate"; eventId: Id<"events"> }
  | { status: "recorded"; eventId: Id<"events">; runIds: Id<"runs">[] }
> {
  const existing = await ctx.db
    .query("events")
    .withIndex("by_integration_and_key", (index) =>
      index.eq("integrationId", args.integration._id).eq("key", args.key)
    )
    .first()

  if (existing !== null) {
    return { status: "duplicate", eventId: existing._id }
  }

  const now = args.now ?? Date.now()
  const eventId = await ctx.db.insert("events", {
    tenantId: args.integration.tenantId,
    integrationId: args.integration._id,
    provider: args.integration.provider,
    key: args.key,
    type: args.type,
    resource: args.resource,
    criteria: args.criteria,
    actor: args.actor,
    text: args.text,
    data: args.data,
    metadata: createSourceMetadata({
      provider: args.integration.provider,
      event: args.type,
      data: args.data,
    }),
    observedAt: args.observedAt,
    createdAt: now,
  })
  const event = await ctx.db.get(eventId)

  if (event === null) {
    throw new Error("Event insert failed.")
  }

  return {
    status: "recorded",
    eventId,
    runIds: await startEventAutomations(ctx, { event, now }),
  }
}
