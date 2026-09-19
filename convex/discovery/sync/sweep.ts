import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type Doc, type TableNames } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import { isWorkspaceDeleting } from "../../retention/access"
import { project } from "../source"
import { sourceTables } from "../source/types"
import { findSource, raise } from "./intent"
/** Minute recovery is bounded and independent of user writes. Content is
 * reconciled weekly, in small pages, without re-embedding unchanged sources. */
export const run = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await expireSources(ctx)
    const queues = await ctx.db
      .query("discoveryQueues")
      .withIndex("by_nextAt", (q) => q.lte("nextAt", Date.now()))
      .take(50)
    for (const queue of queues) {
      await ctx.scheduler.runAfter(0, internal.discovery.sync.queue.start, {
        organizationId: queue.organizationId,
        lane: queue.lane,
      })
    }
    let scan = await ctx.db
      .query("discoveryScans")
      .withIndex("by_name", (q) => q.eq("name", "sources"))
      .unique()
    if (!scan) {
      const id = await ctx.db.insert("discoveryScans", {
        name: "sources",
        table: 0,
        cursor: null,
        nextAt: Date.now(),
      })
      scan = await ctx.db.get(id)
    }
    if (scan && scan.nextAt <= Date.now()) {
      await ctx.scheduler.runAfter(0, internal.discovery.sync.sweep.page, {})
    }
    return null
  },
})
export const expire = internalMutation({
  args: {},
  returns: v.null(),
  handler: expireSources,
})
async function expireSources(ctx: MutationCtx) {
  const expired = await ctx.db
    .query("discoverySources")
    .withIndex("by_pending_and_expiresAt", (q) =>
      q.eq("pending", false).gt("expiresAt", 0).lte("expiresAt", Date.now())
    )
    .take(50)
  for (const source of expired) {
    // The outbox owns retries from here; a workspace being erased must not
    // leave an expiry at the front of this index while its purge finishes.
    await ctx.db.patch(source._id, { expiresAt: undefined })
    await raise(ctx, source.organizationId, source.key)
  }
  if (expired.length === 50) {
    await ctx.scheduler.runAfter(100, internal.discovery.sync.sweep.expire, {})
  }
  return null
}
export const page = internalMutation({
  args: {},
  handler: async (ctx) => {
    const scan = await ctx.db
      .query("discoveryScans")
      .withIndex("by_name", (q) => q.eq("name", "sources"))
      .unique()
    if (!scan || scan.nextAt > Date.now()) {
      return
    }
    const table = sourceTables[scan.table]
    const page = table
      ? await ctx.db
          .query(table)
          .paginate({ numItems: 16, cursor: scan.cursor })
      : await ctx.db
          .query("discoverySources")
          .paginate({ numItems: 16, cursor: scan.cursor })
    for (const item of page.page) {
      await reconcile(ctx, item, table, scan.rebuilding ?? false)
    }
    const done = page.isDone && scan.table === sourceTables.length
    await ctx.db.patch(scan._id, {
      table: done ? 0 : page.isDone ? scan.table + 1 : scan.table,
      cursor: page.isDone ? null : page.continueCursor,
      nextAt: Date.now() + (done ? 7 * 24 * 60 * 60_000 : 0),
      ...(done ? { completedAt: Date.now(), rebuilding: undefined } : {}),
    })
    if (!done) {
      await ctx.scheduler.runAfter(100, internal.discovery.sync.sweep.page, {})
    }
  },
})
export const rebuild = internalMutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const scan = await ctx.db
      .query("discoveryScans")
      .withIndex("by_name", (q) => q.eq("name", "sources"))
      .unique()
    if (scan) {
      await ctx.db.patch(scan._id, {
        table: 0,
        cursor: null,
        nextAt: Date.now(),
        rebuilding: args.force ?? true,
      })
    }
    await ctx.scheduler.runAfter(0, internal.discovery.sync.sweep.run, {})
  },
})
async function organization(ctx: MutationCtx, row: Doc<TableNames>) {
  if ("organizationId" in row && typeof row.organizationId === "string") {
    return row.organizationId
  }
  if ("collectionId" in row) {
    return (await ctx.db.get(row.collectionId))?.organizationId
  }
  return undefined
}

async function reconcile(
  ctx: MutationCtx,
  item: Doc<TableNames>,
  table: string | undefined,
  rebuilding: boolean
) {
  const key = table
    ? `${table}:${item._id}`
    : (item as Doc<"discoverySources">).key
  const organizationId = await organization(ctx, item)
  if (!organizationId || (await isWorkspaceDeleting(ctx, organizationId))) {
    return
  }
  const state = await findSource(ctx, key)
  if (state?.pending && !rebuilding) {
    return
  }
  try {
    const source = await project(ctx, key)
    if (!source && (await retired(ctx, state))) {
      return
    }
    if (rebuilding || !state || state.revision !== source?.revision) {
      if (rebuilding && state) {
        await ctx.db.patch(state._id, {
          textHash: undefined,
          fileKey: undefined,
        })
      }
      await raise(ctx, organizationId, key)
    }
  } catch {
    await raise(ctx, organizationId, key)
  }
}

async function retired(
  ctx: MutationCtx,
  state: Doc<"discoverySources"> | null
) {
  if (!state) {
    return true
  }
  if (!state.key.startsWith("traces:") || state.pending || state.parts !== 0) {
    return false
  }
  await ctx.db.delete(state._id)
  return true
}
