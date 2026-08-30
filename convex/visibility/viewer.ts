import { type TeamMember } from "better-auth/plugins/organization"
import { type Id } from "../_generated/dataModel"
import { authComponent, createAdapterOptions } from "../auth"
import { type QueryLikeCtx } from "../shared/context"

// Team membership resolution for visibility checks. Grants store Better
// Auth team ids; a viewer's teams are read from live `teamMember` rows on
// every resolution, so leaving a team revokes access immediately. The
// person-to-user join is the `identities` table (provider "auth").

const identityLimit = 25
const membershipLimit = 100

export type TeamMembershipRow = Pick<TeamMember, "teamId">

/** The Better Auth team ids a person belongs to, via their linked auth
 *  identities. People without a signed-in identity belong to no teams. */
export async function loadPersonTeamIds(
  ctx: QueryLikeCtx,
  args: { organizationId: string; personId: Id<"persons"> }
): Promise<ReadonlySet<string>> {
  const userIds = await loadAuthUserIds(ctx, args)

  if (userIds.length === 0) {
    return new Set()
  }

  const adapter = authComponent.adapter(ctx)(createAdapterOptions())
  const memberships = await Promise.all(
    userIds.map(
      async (userId) =>
        await adapter.findMany<TeamMembershipRow>({
          model: "teamMember",
          where: [{ field: "userId", value: userId }],
          limit: membershipLimit,
        })
    )
  )

  return teamIdsOf(memberships.flat())
}

/** The Better Auth user ids linked to a person in this organization. */
export async function loadAuthUserIds(
  ctx: QueryLikeCtx,
  args: { organizationId: string; personId: Id<"persons"> }
): Promise<string[]> {
  const identities = await ctx.db
    .query("identities")
    .withIndex("by_person", (index) => index.eq("personId", args.personId))
    .take(identityLimit)

  return identities
    .filter(
      (identity) =>
        identity.provider === "auth" &&
        identity.organizationId === args.organizationId
    )
    .map((identity) => identity.externalId)
}

export function teamIdsOf(
  memberships: readonly TeamMembershipRow[]
): ReadonlySet<string> {
  return new Set(memberships.map((membership) => membership.teamId))
}

const teamLimit = 100

/** The organization's own Better Auth team ids, for validating grants. */
export async function listOrganizationTeamIds(
  ctx: QueryLikeCtx,
  organizationId: string
): Promise<ReadonlySet<string>> {
  const adapter = authComponent.adapter(ctx)(createAdapterOptions())
  const teams = await adapter.findMany<{ id: string }>({
    model: "team",
    where: [{ field: "organizationId", value: organizationId }],
    limit: teamLimit,
  })

  return new Set(teams.map((team) => team.id))
}
