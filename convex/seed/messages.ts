import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { clearOrganization, daysAgo, type SeedContext } from "./context"
import { requireSeedPerson, resolvePeople, slackActor } from "./people"
import { findSlackIntegration, resolvePlaces } from "./places"
import { threads } from "./threads"

// The observed side of the workspace: one conversation per channel and the
// messages that landed in it. Both are written with backdated timestamps, so
// they read as a month of history rather than as fresh traffic.

const summaries: Record<string, string> = {
  engineering:
    "Rate limiting and the webhook retry path dominated the month: a wrong 429 backoff was found, fixed, and shipped, cutting p99 on the sync endpoint to under a second. A Postgres 16 upgrade is queued for the next maintenance window.",
  product:
    "The March release was scoped to shared workspaces, the usage page, and per-folder permissions. Permissions were built as a folder cascade rather than per resource, accepting that moving a folder can change who sees its contents.",
  support:
    "A Slack reconnect failure hit five workspaces, Northwind Systems worst. Kessler Group asked whether Jori can be scoped to one channel, which per-folder permissions answers. Holmberg Retail is waiting on an export.",
  gtm: "Kessler Group signed for 90 annual seats, taking the quarter past target. Holmberg Retail is in security review and Aurora Freight has gone quiet.",
  incidents:
    "One incident: rotated Slack refresh tokens were read from the wrong response field and silently dropped, breaking reconnects for nine days. Fixed, postmortem filed, two follow-ups open.",
  general:
    "Elin joined on marketing. The week's shipped list covered per-folder permissions, the Slack reconnect fix, and the usage page behind a flag.",
  design:
    "Critique on the folder move dialog and the usage chart, where a single dominant job flattens every other bar.",
  founders:
    "Runway stands at eighteen months; the next hire is a second support person rather than a third engineer.",
}

export async function seedMessages(ctx: MutationCtx, seed: SeedContext) {
  const integration = await findSlackIntegration(ctx, seed)
  const places = await resolvePlaces(ctx, seed)
  const people = await resolvePeople(ctx, seed)

  await clearOrganization(
    ctx,
    ["messages", "conversations"],
    seed.organizationId
  )

  if (integration === null) {
    return 0
  }

  for (const [name, place] of places) {
    await ctx.db.insert("conversations", {
      organizationId: seed.organizationId,
      surface: "slack",
      integrationId: integration._id,
      externalId: place.externalId,
      scope: place.visibility === "private" ? "conversation" : "organization",
      summary: summaries[name],
      summarizedAt: place.profiledAt,
    })
  }

  return await writeMessages(ctx, seed, { integration, places, people })
}

async function writeMessages(
  ctx: MutationCtx,
  seed: SeedContext,
  refs: {
    integration: Doc<"integrations">
    places: Map<string, Doc<"places">>
    people: Map<string, Id<"persons">>
  }
) {
  for (const [index, message] of threads.entries()) {
    const place = refs.places.get(message.channel)
    const person = requireSeedPerson(message.author)
    const [days, hour, minute] = message.at
    const at = daysAgo(seed, days, hour, minute)

    if (place === undefined) {
      throw new Error(`No seeded place is called ${message.channel}.`)
    }

    await ctx.db.insert("messages", {
      organizationId: seed.organizationId,
      surface: "slack",
      integrationId: refs.integration._id,
      type: "message",
      externalId: slackTimestamp(at, index),
      mentioned: message.mentioned ?? false,
      actor: slackActor(message.author),
      personId: refs.people.get(person.email),
      conversationId: place.externalId,
      placeId: place._id,
      text: message.text,
      observedAt: at,
      createdAt: at,
    })
  }

  return threads.length
}

/** Slack names a message by the second it landed plus a counter, and the rest
 *  of the system treats that string as opaque. */
function slackTimestamp(at: number, index: number) {
  return `${Math.floor(at / 1000)}.${String(index + 1).padStart(6, "0")}`
}
