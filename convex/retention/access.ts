import { internal } from "../_generated/api"
import {
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server"
import { findRetention } from "./data"

export async function isWorkspaceDeleting(
  ctx: Pick<QueryCtx, "db">,
  organizationId: string
) {
  const row = await findRetention(ctx, organizationId)
  return row !== null && row.state !== "retained"
}

export async function assertWorkspaceAvailable(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  organizationId: string
) {
  const deleting: boolean =
    "db" in ctx
      ? await isWorkspaceDeleting(ctx, organizationId)
      : await ctx.runQuery(internal.retention.records.deleting, {
          organizationId,
        })
  if (deleting) {
    throw new Error("This workspace is being deleted or has been deleted.")
  }
}
