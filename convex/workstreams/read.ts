import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"

// Shared read helpers for the console projection and the agent tool, so the
// two surfaces resolve names and citation links identically.

/** Journal rows keep citing superseded efforts, so name resolution reads the
 *  whole membership, replaced rows included. */
export async function effortNames(ctx: QueryCtx, beliefId: Id<"beliefs">) {
  const rows = await ctx.db
    .query("efforts")
    .withIndex("by_workstream", (index) => index.eq("workstreamId", beliefId))
    .collect()

  return new Map(rows.map((row) => [row._id, row.name]))
}

export function eventUrl(data: Doc<"events">["data"]): string | undefined {
  if (data === undefined) {
    return undefined
  }

  if ("repository" in data) {
    return (
      data.pullRequest?.url ??
      data.issue?.url ??
      data.comment?.url ??
      data.repository.url
    )
  }

  if ("notionEventId" in data) {
    return data.page?.url
  }

  if ("channel" in data) {
    return undefined
  }

  return data.url ?? data.issue?.url ?? data.project?.url
}
