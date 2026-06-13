import { type MutationCtx, type QueryCtx } from "../_generated/server"

type QueryLikeCtx = QueryCtx | MutationCtx

export async function listPermissionOverrides(
  ctx: QueryLikeCtx,
  tenantId: string
) {
  return await ctx.db
    .query("permissions")
    .withIndex("by_tenant", (query) => query.eq("tenantId", tenantId))
    .collect()
}
