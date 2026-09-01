import { type Doc } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { channels } from "./channels"
import { clearOrganization, daysAgo, type SeedContext } from "./context"

// Writes one place per Slack channel Vedin Labs works in, and hands later
// stages the channel rows they file messages and runs into.

/** The Slack connection every seeded place, conversation, and message hangs
 *  off. The seed does not invent one: places belong to a real workspace, and
 *  a deployment without Slack connected simply has no places. */
export async function slackIntegration(
  ctx: QueryCtx,
  seed: SeedContext
): Promise<Doc<"integrations">> {
  const integration = await ctx.db
    .query("integrations")
    .withIndex("by_organization_and_integration", (index) =>
      index.eq("organizationId", seed.organizationId).eq("integration", "slack")
    )
    .first()

  if (integration === null) {
    throw new Error(
      "Seeding places needs a connected Slack integration; connect one in the console first."
    )
  }

  return integration
}

export async function seedPlaces(ctx: MutationCtx, seed: SeedContext) {
  const integration = await slackIntegration(ctx, seed)

  await clearOrganization(ctx, ["places"], seed.organizationId)

  for (const place of channels) {
    await ctx.db.insert("places", {
      organizationId: seed.organizationId,
      integrationId: integration._id,
      externalId: place.externalId,
      name: place.name,
      visibility: place.visibility,
      claims: place.claims.map(([section, text]) => ({
        section,
        text,
        confirmedAt: daysAgo(seed, place.profiled, 16),
        misses: 0,
      })),
      profiledAt: daysAgo(seed, place.profiled, 16, 30),
    })
  }

  return channels.length
}

/** Channels by name, for the stages that file messages and runs into them. */
export async function resolvePlaces(ctx: QueryCtx, seed: SeedContext) {
  const rows = await ctx.db
    .query("places")
    .filter((row) => row.eq(row.field("organizationId"), seed.organizationId))
    .collect()

  return new Map(rows.map((row) => [row.name, row]))
}
