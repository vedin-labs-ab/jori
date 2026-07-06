import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../../_generated/server"
import { readEffortContext } from "../effort/input"
import { iso, type JournalRecord } from "../engine/judge"
import {
  consolidationJournalTail,
  effortActiveMs,
  effortJournalTail,
  maxConsolidationEfforts,
  maxContextEfforts,
  maxMemberEffortNames,
} from "../limits"
import {
  type BeliefStatus,
  type PassScope,
  passScope,
  passWindow,
} from "../schema"

// Everything one workstream pass shows the judge. Window scope reviews the
// efforts that changed inside the window; full scope (consolidation) reviews
// the whole active effort layer for restructuring. Efforts are the only
// citable sources at this stage. `changed` counts the efforts the window
// actually touched — every structural change moves an effort through
// moveEffort, so a zero here means the review has nothing to react to and
// the judge is never called.
export type WorkstreamPassInput = {
  window: { start: number; end: number }
  scope: PassScope
  roster: RosterEntry[]
  efforts: EffortEntry[]
  changed: number
}

export type RosterEntry = {
  id: Id<"beliefs">
  name: string
  aliases: string[]
  status: BeliefStatus
  brief: string
  parentId?: Id<"beliefs">
  anchors: string[]
  seenAt: number
  locked: boolean
  members: string[]
}

export type EffortEntry = {
  id: Id<"efforts">
  name: string
  summary: string
  anchors: string[]
  actors: string[]
  seenAt: number
  workstreamId?: Id<"beliefs">
  journal: JournalRecord[]
}

export const assemble = internalQuery({
  args: { tenantId: v.string(), scope: passScope, window: passWindow },
  handler: async (ctx, args): Promise<WorkstreamPassInput> => {
    const efforts = await loadEfforts(ctx, args)
    const changed =
      args.scope === "window"
        ? efforts.length
        : (await windowEfforts(ctx, args.tenantId, args.window)).length

    return {
      window: args.window,
      scope: args.scope,
      roster: await loadRoster(ctx, args.tenantId),
      efforts,
      changed,
    }
  },
})

async function loadRoster(ctx: QueryCtx, tenantId: string) {
  const rows = await ctx.db
    .query("beliefs")
    .withIndex("by_tenant_and_kind_and_status", (index) =>
      index.eq("tenantId", tenantId).eq("kind", "workstream")
    )
    .collect()
  const current = rows.filter((row) => row.supersededBy === undefined)

  return Promise.all(current.map((row) => readRosterEntry(ctx, row)))
}

async function readRosterEntry(
  ctx: QueryCtx,
  row: Doc<"beliefs">
): Promise<RosterEntry> {
  const members = await ctx.db
    .query("efforts")
    .withIndex("by_workstream", (index) => index.eq("workstreamId", row._id))
    .collect()
  const names = members
    .filter((member) => member.supersededBy === undefined)
    .sort((left, right) => right.seenAt - left.seenAt)
    .slice(0, maxMemberEffortNames)
    .map((member) => member.name)

  return {
    id: row._id,
    name: row.name,
    aliases: row.aliases,
    status: row.status,
    brief: row.brief,
    parentId: row.parentId,
    anchors: row.anchors ?? [],
    seenAt: row.seenAt,
    locked: row.lockedBy !== undefined,
    members: names,
  }
}

// Window scope: efforts touched inside the window, ranged over updatedAt so
// nothing a prior effort pass wrote is ever skipped. Full scope: the whole
// active layer, for restructuring.
async function loadEfforts(
  ctx: QueryCtx,
  args: {
    tenantId: string
    scope: PassScope
    window: { start: number; end: number }
  }
) {
  const rows =
    args.scope === "window"
      ? await windowEfforts(ctx, args.tenantId, args.window)
      : await activeEfforts(ctx, args.tenantId)
  const tail =
    args.scope === "window" ? effortJournalTail : consolidationJournalTail
  const current = rows.filter((row) => row.supersededBy === undefined)

  return Promise.all(
    current.map(async (row) => ({
      ...(await readEffortContext(ctx, row, tail)),
      workstreamId: row.workstreamId,
    }))
  )
}

async function windowEfforts(
  ctx: QueryCtx,
  tenantId: string,
  window: { start: number; end: number }
) {
  return await ctx.db
    .query("efforts")
    .withIndex("by_tenant_and_updated_at", (index) =>
      index
        .eq("tenantId", tenantId)
        .gt("updatedAt", window.start)
        .lte("updatedAt", window.end)
    )
    .order("desc")
    .take(maxContextEfforts)
}

async function activeEfforts(ctx: QueryCtx, tenantId: string) {
  const cutoff = Date.now() - effortActiveMs

  return await ctx.db
    .query("efforts")
    .withIndex("by_tenant_and_seen_at", (index) =>
      index.eq("tenantId", tenantId).gt("seenAt", cutoff)
    )
    .order("desc")
    .take(maxConsolidationEfforts)
}

// The applier validates citations against exactly the efforts this pass
// showed the judge; observedAt carries the effort's seenAt.
export function toAllowed(input: WorkstreamPassInput) {
  return {
    efforts: input.efforts.map((effort) => ({
      id: effort.id as string,
      observedAt: effort.seenAt,
    })),
  }
}

// An anchor that already appears on several workstreams identifies none of
// them alone. The payload names those tokens so the charter can demote them
// from match-first signals to tie-breakers.
export function sharedAnchors(roster: RosterEntry[]) {
  const counts = new Map<string, number>()

  for (const entry of roster) {
    for (const anchor of new Set(entry.anchors)) {
      counts.set(anchor, (counts.get(anchor) ?? 0) + 1)
    }
  }

  return [...counts]
    .filter(([, count]) => count > 1)
    .map(([anchor]) => anchor)
    .sort()
}

export function toPayload(input: WorkstreamPassInput) {
  return {
    window: { start: iso(input.window.start), end: iso(input.window.end) },
    sharedAnchors: sharedAnchors(input.roster),
    workstreams: input.roster.map((entry) => ({
      id: entry.id,
      name: entry.name,
      aliases: entry.aliases,
      status: entry.status,
      brief: entry.brief,
      parentId: entry.parentId,
      anchors: entry.anchors,
      seenAt: iso(entry.seenAt),
      locked: entry.locked,
      members: entry.members,
    })),
    efforts: input.efforts.map((effort) => ({
      id: effort.id,
      name: effort.name,
      summary: effort.summary,
      anchors: effort.anchors,
      actors: effort.actors,
      seenAt: iso(effort.seenAt),
      workstream: effort.workstreamId ?? null,
      journal: effort.journal,
    })),
  }
}
