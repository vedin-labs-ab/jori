import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { reparentUsage } from "../usage/record"

// What a folder cost outlives the folder. Deleting one only changes which
// folder its spend answers to — the deleted folder's parent, or nothing at
// all when a root folder goes — and that holds even when the deletion takes
// the resources with it: money already spent is history, not content.

/** Moves one dead folder's spend to the destination within the pass's
 *  budget, runs first. Returns the rows touched. */
export async function reparentSpend(
  ctx: MutationCtx,
  args: {
    organizationId: string
    folderId: Id<"folders">
    destination: Id<"folders"> | undefined
    budget: number
  }
) {
  const runs = await ctx.db
    .query("runs")
    .withIndex("by_organization_and_folder_and_created_at", (index) =>
      index
        .eq("organizationId", args.organizationId)
        .eq("folderId", args.folderId)
    )
    .take(args.budget)

  for (const run of runs) {
    await ctx.db.patch(run._id, { folderId: args.destination })
  }

  if (runs.length >= args.budget) {
    return runs.length
  }

  // The rollup owns its own key format, so the merge a re-parented row can
  // collide into is its business, not the sweep's.
  const moved = await reparentUsage(ctx, {
    folderId: args.folderId,
    destination: args.destination,
    budget: args.budget - runs.length,
  })

  return runs.length + moved
}
