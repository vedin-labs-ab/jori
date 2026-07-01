import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"

type QueryLikeCtx = MutationCtx | QueryCtx

export async function findActiveSandbox(ctx: QueryLikeCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("sandboxes")
    .withIndex("by_run_and_status", (query) =>
      query.eq("runId", runId).eq("status", "active")
    )
    .order("desc")
    .first()
}

export async function findSandboxByExternalId(
  ctx: QueryLikeCtx,
  externalId: string
) {
  return await ctx.db
    .query("sandboxes")
    .withIndex("by_external_id", (query) => query.eq("externalId", externalId))
    .first()
}

export async function findSessionByRun(ctx: MutationCtx, runId: Id<"runs">) {
  return await ctx.db
    .query("sessions")
    .withIndex("by_run", (query) => query.eq("runId", runId))
    .first()
}

export function isTerminalRun(run: Doc<"runs">) {
  return ["completed", "failed", "stopped"].includes(run.status)
}
