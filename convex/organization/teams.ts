import { type Team, type TeamMember } from "better-auth/plugins/organization"
import { v } from "convex/values"
import { type QueryCtx, query } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { authComponent, createAdapterOptions } from "../auth"

// Reads stay bounded: an organization approaching either edge is far past
// what the settings surface is for.
const teamLimit = 100
const membershipLimit = 100

/** The organization's teams with their rosters, for the settings dialog.
 *
 *  Reads go straight through the Better Auth adapter rather than its API:
 *  the API's team-member listing only answers members of that team, while
 *  this surface shows every roster to every organization member — the same
 *  visibility the People tab gives the member list. Writes stay on the
 *  Better Auth client, whose endpoints enforce the team permissions, and
 *  Convex reactivity refreshes this view when they land. */
export const list = query({
  args: { organizationId: v.string() },
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      createdAt: v.number(),
      members: v.array(
        v.object({
          userId: v.string(),
          name: v.string(),
          image: v.optional(v.string()),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    const adapter = authComponent.adapter(ctx)(createAdapterOptions())
    const teams = await adapter.findMany<Team>({
      model: "team",
      where: [{ field: "organizationId", value: args.organizationId }],
      limit: teamLimit,
    })
    const rosters = await Promise.all(
      teams.map(async (team) => ({
        team,
        memberships: await adapter.findMany<TeamMember>({
          model: "teamMember",
          where: [{ field: "teamId", value: team.id }],
          limit: membershipLimit,
        }),
      }))
    )
    const users = await loadUsers(
      ctx,
      rosters.flatMap(({ memberships }) =>
        memberships.map((membership) => membership.userId)
      )
    )

    return rosters
      .map(({ team, memberships }) => ({
        id: team.id,
        name: team.name,
        createdAt: toMillis(team.createdAt),
        members: memberships
          .sort(
            (left, right) =>
              toMillis(left.createdAt) - toMillis(right.createdAt)
          )
          .map((membership) => ({
            userId: membership.userId,
            name: users.get(membership.userId)?.name ?? "Removed member",
            image: users.get(membership.userId)?.image ?? undefined,
          })),
      }))
      .sort((left, right) => left.createdAt - right.createdAt)
  },
})

/** Display profiles for the roster's users, fetched once per unique user. */
async function loadUsers(ctx: QueryCtx, userIds: string[]) {
  const uniqueIds = [...new Set(userIds)]
  const users = await Promise.all(
    uniqueIds.map(
      async (userId) =>
        [userId, await authComponent.getAnyUserById(ctx, userId)] as const
    )
  )

  return new Map(
    users.flatMap(([userId, user]) =>
      user === null
        ? []
        : [[userId, { name: user.name, image: user.image ?? undefined }]]
    )
  )
}

function toMillis(value: Date | number | null | undefined) {
  if (value instanceof Date) {
    return value.getTime()
  }

  return typeof value === "number" ? value : 0
}
