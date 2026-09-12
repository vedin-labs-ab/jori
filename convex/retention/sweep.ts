import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import {
  dayMs,
  findRetention,
  noticeMs,
  resumeWorkspace,
  retainWorkspace,
} from "./data"
import { beginDeletion } from "./deletion"
import { ensureNotice } from "./notice"

export const run = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, internal.retention.sweep.accounts, {
      cursor: null,
    })
    for (const state of ["retained", "deleting"] as const) {
      const rows = await ctx.db
        .query("workspaceRetention")
        .withIndex("by_state_and_nextAt", (q) =>
          q.eq("state", state).lte("nextAt", Date.now())
        )
        .take(20)
      for (const row of rows) {
        if (state === "deleting") {
          await ctx.scheduler.runAfter(0, internal.retention.deletion.step, {
            id: row._id,
          })
          continue
        }
        await checkRetained(ctx, row)
      }
    }
    return null
  },
})

/** Bounded bootstrap also handles pre-policy expired trials and paused accounts. */
export const accounts = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("accounts")
      .paginate({ cursor: args.cursor, numItems: 50 })
    for (const account of page.page) {
      if (
        account.state.kind === "trial" &&
        account.state.endsAt <= Date.now()
      ) {
        await retainWorkspace(ctx, account.organizationId, account.state.endsAt)
      } else if (
        account.state.kind === "paused" &&
        !(await findRetention(ctx, account.organizationId))
      ) {
        // Historical records lack an exact effective end; start conservatively now.
        await retainWorkspace(ctx, account.organizationId, Date.now())
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.retention.sweep.accounts, {
        cursor: page.continueCursor,
      })
    }
    return null
  },
})

async function checkRetained(ctx: MutationCtx, row: Doc<"workspaceRetention">) {
  const account = await ctx.db
    .query("accounts")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", row.organizationId)
    )
    .unique()
  if (account?.state.kind === "active") {
    await resumeWorkspace(ctx, row.organizationId)
    return
  }
  const noticeAt = await ensureNotice(ctx, row)
  if (
    noticeAt !== null &&
    noticeAt + noticeMs <= Date.now() &&
    row.deletesAt <= Date.now()
  ) {
    const blocked = await beginDeletion(ctx, row.organizationId, true)
    if (blocked) {
      await ctx.db.patch(row._id, { blocked, nextAt: Date.now() + dayMs })
    }
  } else {
    await ctx.db.patch(row._id, { nextAt: Date.now() + 60 * 60_000 })
  }
}
