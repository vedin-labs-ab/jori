import { type QueryLikeCtx } from "../shared/context"

export async function listPermissionOverrides(
  ctx: QueryLikeCtx,
  organizationId: string
) {
  return await ctx.db
    .query("permissions")
    .withIndex("by_organization", (query) =>
      query.eq("organizationId", organizationId)
    )
    .collect()
}
