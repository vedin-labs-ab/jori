import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { startEventAutomations } from "../automations/lifecycle"
import { actorIdentityProvider } from "../persons/identity/schema"
import { resolveActor } from "../persons/resolve"
import { normalizeEventData } from "./payload"
import { type EventMatch } from "./schema"

export async function recordEvent(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    key: string
    type: string
    match?: EventMatch
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
  const provider = actorIdentityProvider(args.integration.integration)

  if (provider !== undefined) {
    await resolveActor(ctx, {
      organizationId: args.integration.organizationId,
      provider,
      actor: args.actor,
    })
  }

  const eventId = await ctx.db.insert("events", {
    organizationId: args.integration.organizationId,
    integrationId: args.integration._id,
    key: args.key,
    type: args.type,
    match: args.match,
    actor: args.actor,
    text: args.text,
    data: normalizeEventData(args.integration.integration, args.data),
    observedAt: args.observedAt,
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
