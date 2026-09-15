import { v } from "convex/values"
import { type Doc } from "../../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../../_generated/server"
import { isWorkspaceDeleting } from "../../retention/access"
import { lane } from "../schema"
import { project } from "../source"
import { type Projection } from "../source/types"
import { findSource, raise } from "./intent"
export const batch = internalQuery({
  args: { organizationId: v.string(), lane, lease: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (await isWorkspaceDeleting(ctx, args.organizationId)) {
      return []
    }
    if (args.lease !== undefined) {
      const queue = await ctx.db
        .query("discoveryQueues")
        .withIndex("by_organizationId_and_lane", (q) =>
          q.eq("organizationId", args.organizationId).eq("lane", args.lane)
        )
        .unique()
      if (queue?.lease !== args.lease || args.lease <= Date.now()) {
        return []
      }
    }
    return ctx.db
      .query("discoverySources")
      .withIndex("by_organizationId_and_lane_and_pending_and_nextAt", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("lane", args.lane)
          .eq("pending", true)
          .lte("nextAt", Date.now())
      )
      .take(args.lane === "file" ? 1 : 16)
  },
})
export const read = internalQuery({
  args: { organizationId: v.string(), keys: v.array(v.string()) },
  handler: async (
    ctx,
    args
  ): Promise<
    Array<{ key: string; source: Projection | null; failed: boolean }>
  > => {
    if (await isWorkspaceDeleting(ctx, args.organizationId)) {
      return []
    }
    const results = []
    for (const key of args.keys.slice(0, 8)) {
      try {
        const source = await project(ctx, key)
        results.push({
          key,
          source:
            source?.organizationId === args.organizationId ? source : null,
          failed: false,
        })
      } catch {
        results.push({ key, source: null, failed: true })
      }
    }
    return results
  },
})
export const cached = internalQuery({
  args: { key: v.string(), after: v.number() },
  handler: async (ctx, args) =>
    ctx.db
      .query("discoveryPassages")
      .withIndex("by_key_and_part", (q) =>
        q.eq("key", args.key).gt("part", args.after)
      )
      .take(100),
})
export const failed = internalMutation({
  args: { key: v.string(), generation: v.number() },
  handler: async (ctx, args) => {
    const row = await findSource(ctx, args.key)
    if (!row || row.generation !== args.generation) {
      return
    }
    const attempts = row.attempts + 1
    await ctx.db.patch(row._id, {
      pending: true,
      attempts,
      error: "Indexing will retry.",
      nextAt:
        Date.now() + Math.min(60 * 60_000, 5000 * 2 ** Math.min(attempts, 10)),
    })
  },
})
export const finish = internalMutation({
  args: {
    key: v.string(),
    generation: v.number(),
    revision: v.optional(v.string()),
    textHash: v.optional(v.string()),
    resourceKey: v.optional(v.string()),
    authorityKey: v.optional(v.string()),
    fileKey: v.optional(v.string()),
    coverage: v.optional(v.string()),
    parts: v.number(),
  },
  handler: async (ctx, args) => {
    const row = await findSource(ctx, args.key)
    if (!row || row.generation !== args.generation) {
      return
    }
    if (await isWorkspaceDeleting(ctx, row.organizationId)) {
      return
    }
    const { cascade, phase, cursor } = await cascadeChildren(ctx, row)
    const { key: _key, generation: _generation, ...fields } = args
    await ctx.db.patch(row._id, {
      ...fields,
      revision: args.revision,
      textHash: args.textHash,
      fileKey: args.fileKey,
      coverage: args.coverage,
      pending: cascade,
      cascade,
      cascadePhase: phase,
      cascadeCursor: cursor,
      nextAt: Date.now(),
      indexedAt: Date.now(),
      attempts: 0,
      error: undefined,
    })
  },
})

async function cascadeChildren(ctx: MutationCtx, row: Doc<"discoverySources">) {
  let cascade = row.cascade ?? false,
    phase = row.cascadePhase ?? 0,
    cursor = row.cascadeCursor ?? null
  if (!cascade) {
    return { cascade, phase, cursor }
  }
  const page =
    phase === 0
      ? await ctx.db
          .query("discoverySources")
          .withIndex("by_organizationId_and_authorityKey", (q) =>
            q
              .eq("organizationId", row.organizationId)
              .eq("authorityKey", row.key)
          )
          .paginate({ numItems: 80, cursor })
      : await ctx.db
          .query("discoverySources")
          .withIndex("by_organizationId_and_resourceKey", (q) =>
            q
              .eq("organizationId", row.organizationId)
              .eq("resourceKey", row.key)
          )
          .paginate({ numItems: 80, cursor })
  for (const child of page.page) {
    if (child.key !== row.key) {
      await raise(ctx, row.organizationId, child.key)
    }
  }
  if (page.isDone) {
    phase++
    cursor = null
    if (phase === 2) {
      cascade = false
    }
  } else {
    cursor = page.continueCursor
  }
  return { cascade, phase, cursor }
}

/** Invalidate the accepted external copy before any provider mutation, even if
 * a newer source edit arrives while that mutation is in flight. */
export const publishing = internalMutation({
  args: { key: v.string(), generation: v.number() },
  handler: async (ctx, args) => {
    const row = await findSource(ctx, args.key)
    if (
      !row ||
      row.generation !== args.generation ||
      (await isWorkspaceDeleting(ctx, row.organizationId))
    ) {
      return false
    }
    await ctx.db.patch(row._id, { textHash: undefined, revision: undefined })
    return true
  },
})
