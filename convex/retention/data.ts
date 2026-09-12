import { type MutationCtx, type QueryCtx } from "../_generated/server"

export const dayMs = 86_400_000
export const retentionMs = 90 * dayMs
export const noticeMs = 7 * dayMs

export async function findRetention(
  ctx: Pick<QueryCtx, "db">,
  organizationId: string
) {
  return await ctx.db
    .query("workspaceRetention")
    .withIndex("by_organizationId", (q) =>
      q.eq("organizationId", organizationId)
    )
    .unique()
}

export async function retainWorkspace(
  ctx: MutationCtx,
  organizationId: string,
  endedAt: number
) {
  const existing = await findRetention(ctx, organizationId)
  if (existing) {
    return
  }
  await ctx.db.insert("workspaceRetention", {
    organizationId,
    state: "retained",
    endedAt,
    deletesAt: endedAt + retentionMs,
    nextAt: Math.max(Date.now(), endedAt + retentionMs - noticeMs),
  })
}

export async function resumeWorkspace(
  ctx: MutationCtx,
  organizationId: string
) {
  const existing = await findRetention(ctx, organizationId)
  if (existing?.state === "retained") {
    if (existing.noticeId) {
      await ctx.db.delete(existing.noticeId)
    }
    await ctx.db.delete(existing._id)
  }
}
