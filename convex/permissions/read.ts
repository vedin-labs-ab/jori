import { type QueryLikeCtx } from "../shared/context"

export async function listPermissionOverrides(
  ctx: QueryLikeCtx,
  tenantId: string
) {
  return await ctx.db
    .query("permissions")
    .withIndex("by_tenant", (query) => query.eq("tenantId", tenantId))
    .collect()
}
