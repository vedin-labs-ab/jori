import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx, query } from "../../_generated/server"
import { checkTenantAccess } from "../../access"
import { type Integration } from "../../shared/integrations"
import { eventKindLabel, statusLabels } from "./labels"

// Console reads follow the write-time read model: source chips come from the
// belief's `sources` rollup, per-entry providers from the evidence rows'
// `integration` stamp — no reference walks at read time.

// Rollups cap a single index range; real totals at these volumes. Swap for
// denormalized counters if a workstream ever nears the cap. The timeline is
// similarly bounded: past the cap, the oldest narrative is the deep-memory
// system's job, not the console's.
const rollupLimit = 1000
const timelineLimit = 500

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
      workstreams: current.map((row) => listRow(row)),
    }
  },
})

export const get = query({
  args: { tenantId: v.string(), workstreamId: v.id("beliefs") },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)
    const belief = access.ok ? await loadWorkstream(ctx, args) : null

    return belief === null
      ? null
      : { ...listRow(belief), aliases: belief.aliases }
  },
})

// The workstream's timeline, newest first: the journals of its member
// efforts, read through the membership stamp and joined with per-entry
// receipt rollups. Bounded rather than paginated — the journal is curated
// and rate-limited by the charter, so a year of an active workstream stays
// in the hundreds; paging in the console is the progressive disclosure.
export const timeline = query({
  args: { tenantId: v.string(), workstreamId: v.id("beliefs") },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)
    const belief = access.ok ? await loadWorkstream(ctx, args) : null

    if (belief === null) {
      return []
    }

    const names = await effortNames(ctx, belief._id)
    const rollups = await receiptRollups(ctx, belief._id)
    const rows = await ctx.db
      .query("journal")
      .withIndex("by_workstream_and_observed_at", (index) =>
        index.eq("workstreamId", belief._id)
      )
      .order("desc")
      .take(timelineLimit)

    return rows.map((row) => {
      const rollup = rollups.get(`${row.effortId}:${row.passId}`)

      return {
        id: row._id,
        entry: row.entry,
        observedAt: row.observedAt,
        effortId: row.effortId,
        effort: names.get(row.effortId) ?? "",
        passId: row.passId,
        receipts: rollup?.count ?? 0,
        integrations: rollup?.integrations ?? [],
      }
    })
  },
})

// One timeline entry's receipts: the evidence written by the same pass for
// the same effort — the citations behind the claim.
export const receipts = query({
  args: {
    tenantId: v.string(),
    effortId: v.id("efforts"),
    passId: v.id("passes"),
  },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)
    const effort = access.ok ? await ctx.db.get(args.effortId) : null

    if (effort === null || effort.tenantId !== args.tenantId) {
      return []
    }

    const rows = await ctx.db
      .query("evidence")
      .withIndex("by_subject_effort_id", (index) =>
        index.eq("subject.effortId", args.effortId)
      )
      .collect()
    const cited = rows
      .filter((row) => row.passId === args.passId)
      .sort((first, second) => second.observedAt - first.observedAt)

    return Promise.all(cited.map((row) => receiptRow(ctx, row)))
  },
})

// Per-entry receipt rollups from one stamped index range, newest first so
// each entry's providers order by recency: evidence and journal rows written
// by the same pass for the same effort belong together.
async function receiptRollups(ctx: QueryCtx, beliefId: Id<"beliefs">) {
  const rows = await ctx.db
    .query("evidence")
    .withIndex("by_workstream_and_observed_at", (index) =>
      index.eq("workstreamId", beliefId)
    )
    .order("desc")
    .take(rollupLimit)
  const rollups = new Map<
    string,
    { count: number; integrations: Integration[] }
  >()

  for (const row of rows) {
    if (row.subject.kind !== "effort") {
      continue
    }

    const key = `${row.subject.effortId}:${row.passId}`
    const rollup = rollups.get(key) ?? { count: 0, integrations: [] }

    rollup.count += 1

    if (
      row.integration !== undefined &&
      !rollup.integrations.includes(row.integration)
    ) {
      rollup.integrations.push(row.integration)
    }

    rollups.set(key, rollup)
  }

  return rollups
}

// Journal rows keep citing superseded efforts, so name resolution reads the
// whole membership, replaced rows included.
async function effortNames(ctx: QueryCtx, beliefId: Id<"beliefs">) {
  const rows = await ctx.db
    .query("efforts")
    .withIndex("by_workstream", (index) => index.eq("workstreamId", beliefId))
    .collect()

  return new Map(rows.map((row) => [row._id, row.name]))
}

function listRow(row: Doc<"beliefs">) {
  return {
    id: row._id,
    name: row.name,
    status: row.status,
    statusLabel: statusLabels[row.status],
    brief: row.brief,
    sources: row.sources ?? [],
    seenAt: row.seenAt,
    locked: row.lockedBy !== undefined,
  }
}

async function loadWorkstream(
  ctx: QueryCtx,
  args: { tenantId: string; workstreamId: Id<"beliefs"> }
) {
  const belief = await ctx.db.get(args.workstreamId)

  return belief !== null &&
    belief.tenantId === args.tenantId &&
    belief.kind === "workstream"
    ? belief
    : null
}

async function receiptRow(ctx: QueryCtx, row: Doc<"evidence">) {
  const base = {
    id: row._id,
    why: row.why,
    observedAt: row.observedAt,
    integration: row.integration ?? null,
  }

  if (row.reference.kind === "conversation") {
    return { ...base, kind: "Conversation", url: undefined }
  }

  if (row.reference.kind === "effort") {
    return { ...base, kind: "Effort", url: undefined }
  }

  const event = await ctx.db.get(row.reference.eventId)

  return {
    ...base,
    kind: eventKindLabel(event?.type ?? ""),
    url: event === null ? undefined : eventUrl(event.data),
  }
}

function eventUrl(data: Doc<"events">["data"]): string | undefined {
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
