import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { startEventJobs } from "../jobs/lifecycle"
import { actorIdentityProvider } from "../persons/identity/schema"
import { resolveActor } from "../persons/resolve"
import { normalizeEventData } from "./payload"
import { type EventMatch } from "./schema"

type EventInput = {
  integration: Doc<"integrations">
  key: string
  type: string
  match?: EventMatch
  actor?: Doc<"events">["actor"]
  text?: string
  data?: unknown
  observedAt?: number
}

export async function recordEvent(
  ctx: MutationCtx,
  args: EventInput & { now?: number }
): Promise<
  | { status: "duplicate"; eventId: Id<"events"> }
  | { status: "recorded"; eventId: Id<"events">; runIds: Id<"runs">[] }
> {
  const inserted = await insertUniqueEvent(ctx, args)

  if (inserted.status === "duplicate") {
    return inserted
  }

  return {
    ...inserted,
    runIds: await startEventJobs(ctx, {
      event: inserted.event,
      now: args.now ?? Date.now(),
    }),
  }
}

// Historical imports feed deduction, never jobs: replaying a month of
// activity through event triggers would fire every job retroactively.
// observedAt is required because backfilled rows are the one case where the
// ingestion-time fallback would date all of history as today.
export async function recordBackfillEvent(
  ctx: MutationCtx,
  args: EventInput & { observedAt: number }
): Promise<
  | { status: "duplicate"; eventId: Id<"events"> }
  | { status: "recorded"; eventId: Id<"events"> }
> {
  const { event: _event, ...result } = await insertUniqueEvent(ctx, args)

  return result
}

async function insertUniqueEvent(
  ctx: MutationCtx,
  args: EventInput
): Promise<
  | { status: "duplicate"; eventId: Id<"events">; event?: undefined }
  | { status: "recorded"; eventId: Id<"events">; event: Doc<"events"> }
> {
  const existing = await findEventByKey(ctx, args)

  if (existing !== null) {
    return { status: "duplicate", eventId: existing._id }
  }

  const event = await insertEvent(ctx, args)

  return { status: "recorded", eventId: event._id, event }
}

async function findEventByKey(
  ctx: MutationCtx,
  args: { integration: Doc<"integrations">; key: string }
) {
  return await ctx.db
    .query("events")
    .withIndex("by_integration_and_key", (index) =>
      index.eq("integrationId", args.integration._id).eq("key", args.key)
    )
    .first()
}

async function insertEvent(ctx: MutationCtx, args: EventInput) {
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

  return event
}
