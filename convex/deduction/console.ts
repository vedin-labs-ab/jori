import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "../_generated/server"
import { checkTenantAccess, requireTenantAccess } from "../identity/access"
import { ensureCurrentPerson } from "../persons/clerk"
import { createPersonActor } from "../shared/actor"
import { rosterJournalTail } from "./limits"

// Console corrections are the only write path into beliefs besides the pass
// applier. Every correction sets lockedBy, which the applier honors: a belief
// a person touched is no longer the judge's to reshape.

export const list = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)

    if (!access.ok) {
      return { status: "unauthorized" as const, workstreams: [] }
    }

    const rows = await ctx.db
      .query("beliefs")
      .withIndex("by_tenant_and_kind_and_status", (index) =>
        index.eq("tenantId", args.tenantId).eq("kind", "workstream")
      )
      .collect()
    const current = rows
      .filter((row) => row.supersededBy === undefined)
      .sort((first, second) => second.seenAt - first.seenAt)

    return {
      status: "ready" as const,
      workstreams: await Promise.all(
        current.map((row) => readWorkstreamRow(ctx, row))
      ),
    }
  },
})

async function readWorkstreamRow(ctx: QueryCtx, row: Doc<"beliefs">) {
  const journal = await ctx.db
    .query("journal")
    .withIndex("by_belief_and_created_at", (index) =>
      index.eq("beliefId", row._id)
    )
    .order("desc")
    .take(rosterJournalTail)
  const evidence = await ctx.db
    .query("evidence")
    .withIndex("by_belief", (index) => index.eq("beliefId", row._id))
    .collect()

  return {
    id: row._id,
    name: row.name,
    aliases: row.aliases,
    status: row.status,
    brief: row.brief,
    seenAt: row.seenAt,
    locked: row.lockedBy !== undefined,
    evidenceCount: evidence.length,
    journal: journal.map((entry) => ({
      entry: entry.entry,
      createdAt: entry.createdAt,
    })),
  }
}

export const rename = mutation({
  args: {
    tenantId: v.string(),
    workstreamId: v.id("beliefs"),
    name: v.string(),
    brief: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const belief = await requireWorkstream(
      ctx,
      args.tenantId,
      args.workstreamId
    )
    const name = args.name.trim()
    const brief = args.brief.trim()

    if (name === "" || brief === "") {
      throw new Error("Name and brief are required.")
    }

    await ctx.db.patch(belief._id, {
      name,
      brief,
      lockedBy: await currentActor(ctx, args.tenantId),
      updatedAt: Date.now(),
    })
  },
})

export const close = mutation({
  args: { tenantId: v.string(), workstreamId: v.id("beliefs") },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const belief = await requireWorkstream(
      ctx,
      args.tenantId,
      args.workstreamId
    )

    await ctx.db.patch(belief._id, {
      status: "closed",
      lockedBy: await currentActor(ctx, args.tenantId),
      updatedAt: Date.now(),
    })
  },
})

export const merge = mutation({
  args: {
    tenantId: v.string(),
    workstreamId: v.id("beliefs"),
    intoId: v.id("beliefs"),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const belief = await requireWorkstream(
      ctx,
      args.tenantId,
      args.workstreamId
    )
    const into = await requireWorkstream(ctx, args.tenantId, args.intoId)

    if (belief._id === into._id) {
      throw new Error("A workstream cannot merge into itself.")
    }

    await ctx.db.patch(belief._id, {
      supersededBy: into._id,
      updatedAt: Date.now(),
    })
  },
})

export const setLock = mutation({
  args: {
    tenantId: v.string(),
    workstreamId: v.id("beliefs"),
    locked: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    const belief = await requireWorkstream(
      ctx,
      args.tenantId,
      args.workstreamId
    )

    await ctx.db.patch(belief._id, {
      lockedBy: args.locked
        ? await currentActor(ctx, args.tenantId)
        : undefined,
      updatedAt: Date.now(),
    })
  },
})

// Callers guard tenant access first; this helper only loads and validates.
async function requireWorkstream(
  ctx: MutationCtx,
  tenantId: string,
  workstreamId: Id<"beliefs">
) {
  const belief = await ctx.db.get(workstreamId)

  if (
    belief === null ||
    belief.tenantId !== tenantId ||
    belief.kind !== "workstream" ||
    belief.supersededBy !== undefined
  ) {
    throw new Error("Workstream not found.")
  }

  return belief
}

async function currentActor(ctx: MutationCtx, tenantId: string) {
  return createPersonActor(await ensureCurrentPerson(ctx, tenantId))
}
