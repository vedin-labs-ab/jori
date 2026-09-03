import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { clearOrganization, type SeedContext } from "../context"
import { slackActor } from "../people"
import { findSlackIntegration, resolvePlaces } from "../places"
import { eventKey, type WorkItem } from "./work"

// The webhook deliveries behind event-triggered runs. Only the work that an
// event actually woke gets one, so a run's cause can point at the delivery
// rather than claim a person asked for it.

const openers: Record<string, string> = {
  support: "priya",
  incidents: "oskar",
}

export async function seedEvents(
  ctx: MutationCtx,
  seed: SeedContext,
  items: WorkItem[]
) {
  const integration = await findSlackIntegration(ctx, seed)
  const places = await resolvePlaces(ctx, seed)
  const events = new Map<string, Id<"events">>()

  await clearOrganization(ctx, ["events"], seed.organizationId)

  if (integration === null) {
    return events
  }

  for (const item of items) {
    const place = places.get(item.channel ?? "")

    if (item.trigger !== "event" || place === undefined) {
      continue
    }

    const key = eventKey(item)

    events.set(
      key,
      await ctx.db.insert("events", {
        organizationId: seed.organizationId,
        integrationId: integration._id,
        key,
        type: "message.created",
        match: { channel: place.externalId },
        actor: slackActor(openers[item.channel ?? ""] ?? "oskar"),
        data: {
          channel: { id: place.externalId, name: place.name },
          ts: `${Math.floor(item.at / 1000)}.000100`,
        },
        observedAt: item.at,
      })
    )
  }

  return events
}
