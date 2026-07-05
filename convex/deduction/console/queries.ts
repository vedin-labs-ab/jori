import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx, query } from "../../_generated/server"
import { checkTenantAccess } from "../../identity/access"
import { eventKindLabel, statusLabels } from "./labels"

// Console reads follow the write-time read model: source chips come from the
// belief's `sources` rollup, and the expanded lists page one stamped index
// range each — no evidence walks at read time.

// Counting caps a single index range; real totals at these volumes. Swap for
// denormalized counters if a workstream ever nears the cap. The timeline is
// similarly bounded: past the cap, the oldest narrative is the deep-memory
// system's job, not the console's.
const countLimit = 1000
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

    if (belief === null) {
      return null
    }

    return {
      ...listRow(belief),
      aliases: belief.aliases,
      efforts: await memberEfforts(ctx, belief._id),
      counts: { sightings: await countRange(sightingsRange(ctx, belief._id)) },
    }
  },
})

// One page of the workstream's source sightings, newest first: the evidence
// of its member efforts, read through the membership stamp.
export const sightings = query({
  args: {
    tenantId: v.string(),
    workstreamId: v.id("beliefs"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)
    const belief = access.ok ? await loadWorkstream(ctx, args) : null

    if (belief === null) {
      return emptyPage()
    }

    const result = await sightingsRange(ctx, belief._id)
      .order("desc")
      .paginate(args.paginationOpts)

    return {
      ...result,
      page: await Promise.all(result.page.map((row) => sightingRow(ctx, row))),
    }
  },
})

// The workstream's full narrative timeline, newest first: the journals of
// its member efforts, read through the same stamp. Bounded rather than
// paginated — the journal is curated and rate-limited by the charter, so a
// year of an active workstream stays in the hundreds; temporal grouping in
// the console is the progressive disclosure.
export const timeline = query({
  args: { tenantId: v.string(), workstreamId: v.id("beliefs") },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)
    const belief = access.ok ? await loadWorkstream(ctx, args) : null

    if (belief === null) {
      return []
    }

    const names = new Map(
      (await memberEfforts(ctx, belief._id)).map((row) => [row.id, row.name])
    )
    const receipts = await receiptCounts(ctx, belief._id)
    const rows = await historyRange(ctx, belief._id)
      .order("desc")
      .take(timelineLimit)

    return rows.map((row) => ({
      id: row._id,
      entry: row.entry,
      observedAt: row.observedAt,
      effortId: row.effortId,
      effort: names.get(row.effortId) ?? "",
      passId: row.passId,
      receipts: receipts.get(`${row.effortId}:${row.passId}`) ?? 0,
    }))
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

    return Promise.all(cited.map((row) => sightingRow(ctx, row)))
  },
})

// Exact per-entry receipt counts from one stamped index range: evidence and
// journal rows written by the same pass for the same effort belong together.
async function receiptCounts(ctx: QueryCtx, beliefId: Id<"beliefs">) {
  const rows = await ctx.db
    .query("evidence")
    .withIndex("by_workstream_and_observed_at", (index) =>
      index.eq("workstreamId", beliefId)
    )
    .take(countLimit)
  const counts = new Map<string, number>()

  for (const row of rows) {
    if (row.subject.kind !== "effort") {
      continue
    }

    const key = `${row.subject.effortId}:${row.passId}`

    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return counts
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

async function memberEfforts(ctx: QueryCtx, beliefId: Id<"beliefs">) {
  const rows = await ctx.db
    .query("efforts")
    .withIndex("by_workstream", (index) => index.eq("workstreamId", beliefId))
    .collect()

  return rows
    .filter((row) => row.supersededBy === undefined)
    .sort((first, second) => second.seenAt - first.seenAt)
    .map((row) => ({
      id: row._id,
      name: row.name,
      summary: row.summary,
      seenAt: row.seenAt,
    }))
}

function sightingsRange(ctx: QueryCtx, beliefId: Id<"beliefs">) {
  return ctx.db
    .query("evidence")
    .withIndex("by_workstream_and_observed_at", (index) =>
      index.eq("workstreamId", beliefId)
    )
}

function historyRange(ctx: QueryCtx, beliefId: Id<"beliefs">) {
  return ctx.db
    .query("journal")
    .withIndex("by_workstream_and_observed_at", (index) =>
      index.eq("workstreamId", beliefId)
    )
}

async function countRange(range: {
  take(count: number): Promise<{ length: number }>
}) {
  return (await range.take(countLimit)).length
}

function emptyPage() {
  return { page: [], isDone: true, continueCursor: "" }
}

async function sightingRow(ctx: QueryCtx, row: Doc<"evidence">) {
  const base = { id: row._id, why: row.why, observedAt: row.observedAt }

  if (row.reference.kind === "conversation") {
    const conversation = await ctx.db.get(row.reference.conversationId)

    return {
      ...base,
      integration: await integrationKey(ctx, conversation?.integrationId),
      kind: "Conversation",
      url: undefined,
    }
  }

  if (row.reference.kind === "effort") {
    return { ...base, integration: null, kind: "Effort", url: undefined }
  }

  const event = await ctx.db.get(row.reference.eventId)

  return {
    ...base,
    integration: await integrationKey(ctx, event?.integrationId),
    kind: eventKindLabel(event?.type ?? ""),
    url: event === null ? undefined : eventUrl(event.data),
  }
}

async function integrationKey(
  ctx: QueryCtx,
  integrationId: Id<"integrations"> | undefined
) {
  const integration =
    integrationId === undefined ? null : await ctx.db.get(integrationId)

  return integration === null ? null : integration.integration
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
