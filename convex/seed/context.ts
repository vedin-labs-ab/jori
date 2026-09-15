import { type DataModel } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"

// Shared ground for every seed stage: the organization being filled, the
// instant the fixture dates are measured back from, and the people lookup
// each stage needs to attribute its rows. Stages run as separate mutations
// and re-resolve what they need, so any one of them can be re-run alone.

/** Tables the seed writes. Every one of them is organization-scoped, though
 *  a couple also hold rows belonging to no organization — global skills —
 *  which the clear leaves alone because it matches on the id. */
export type SeedTable = {
  [Table in keyof DataModel]: DataModel[Table]["document"] extends {
    organizationId: string | null
  }
    ? Table
    : never
}[keyof DataModel]

export const dayMs = 24 * 60 * 60 * 1000

/** The organization's declared zone, mirrored from the profile the seed
 *  writes so usage dates bucket the way the console reads them. */
export const seedTimezone = "Europe/Stockholm"

export type SeedContext = {
  organizationId: string
  /** The instant every `daysAgo` offset counts back from. */
  now: number
}

export async function seedContext(
  ctx: QueryCtx,
  organizationId: string | undefined
): Promise<SeedContext> {
  return {
    organizationId: await resolveOrganizationId(ctx, organizationId),
    now: Date.now(),
  }
}

/** Seeding targets one organization. Naming it is optional only because a
 *  development deployment normally holds exactly one; anything else has to
 *  say which, rather than have the seed guess. */
async function resolveOrganizationId(
  ctx: QueryCtx,
  organizationId: string | undefined
) {
  if (organizationId !== undefined) {
    return organizationId
  }

  const profiles = await ctx.db.query("organizationProfile").collect()

  if (profiles.length !== 1) {
    throw new Error(
      `Seeding needs an organizationId: the deployment holds ${profiles.length} organization profiles, not one.`
    )
  }

  return profiles[0].organizationId
}

/** A fixture timestamp, written the way the content reads: `daysAgo(seed, 3)`
 *  is three days before the seed instant, at a plausible working hour. */
export function daysAgo(
  seed: SeedContext,
  days: number,
  hour = 10,
  minute = 0
) {
  const start = seed.now - days * dayMs
  const date = new Date(start)

  date.setHours(hour, minute, 0, 0)

  return date.getTime()
}

/** The seed owns the organization's content: each stage clears what it
 *  previously wrote before writing again, so re-running a stage replaces its
 *  rows instead of doubling them. Tables people own — persons carrying a real
 *  sign-in, and the integrations they connected — are cleared by their own
 *  stage under narrower rules. */
export async function clearOrganization(
  ctx: MutationCtx,
  tables: readonly SeedTable[],
  organizationId: string
) {
  let deleted = 0

  for (const table of tables) {
    const rows = await ctx.db
      .query(table)
      .filter((row) => row.eq(row.field("organizationId"), organizationId))
      .collect()

    for (const row of rows) {
      await ctx.db.delete(row._id as never)
      deleted += 1
    }
  }

  return deleted
}
