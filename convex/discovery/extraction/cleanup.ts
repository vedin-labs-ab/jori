"use node"

import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx, internalAction } from "../../_generated/server"
import { killSandbox } from "../../runtime/sandbox/blaxel/client"

export const run = internalAction({
  args: { id: v.id("discoverySandboxes") },
  handler: async (ctx, args) => {
    const row: Doc<"discoverySandboxes"> | null = await ctx.runQuery(
      internal.discovery.extraction.records.get,
      args
    )
    if (row !== null && !(await remove(ctx, row))) {
      await ctx.scheduler.runAfter(
        60_000,
        internal.discovery.extraction.cleanup.run,
        args
      )
    }
  },
})

/** Workspace erasure calls this until true before acknowledging deletion. */
export const workspace = internalAction({
  args: { organizationId: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const rows: Doc<"discoverySandboxes">[] = await ctx.runQuery(
      internal.discovery.extraction.records.workspace,
      args
    )
    const removed = await Promise.all(rows.map((row) => remove(ctx, row)))
    return rows.length < 25 && removed.every(Boolean)
  },
})

export async function remove(
  ctx: ActionCtx,
  row: Pick<Doc<"discoverySandboxes">, "_id" | "externalId">
) {
  try {
    await killSandbox(row.externalId)
    await ctx.runMutation(internal.discovery.extraction.records.remove, {
      id: row._id,
    })
    return true
  } catch {
    // Keep the durable record for the scheduled retry, without logging content.
    return false
  }
}
