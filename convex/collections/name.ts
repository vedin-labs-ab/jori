import { availableName } from "../../contracts/text"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { createSight } from "../visibility/sight"

/** Generate inside creation's transaction; hidden names never affect labels. */
export async function newCollectionName(
  ctx: MutationCtx,
  args: {
    organizationId: string
    personId: Id<"persons">
    folderId?: Id<"folders">
  },
  kind: "table" | "store"
) {
  const rows = await ctx.db
    .query("collections")
    .withIndex("by_organization_and_kind_and_updated_at", (q) =>
      q.eq("organizationId", args.organizationId).eq("kind", kind)
    )
    .order("desc")
    .take(2000)
  const sight = createSight(ctx, args)
  const names: string[] = []
  for (const row of rows) {
    if (
      row.folderId === args.folderId &&
      row.archivedAt === undefined &&
      (await sight.canSee(row))
    ) {
      names.push(row.name)
    }
  }
  return availableName(`New ${kind}`, names)
}
