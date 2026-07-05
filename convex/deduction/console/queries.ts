import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx, query } from "../../_generated/server"
import { checkTenantAccess } from "../../identity/access"
import { type Integration } from "../../shared/integrations"
import { loadBeliefSupport } from "../engine/resolve"
import { eventKindLabel, statusLabels } from "./labels"

const detailLimit = 8

export const list = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)

    if (!access.ok) {
      return { status: "unauthorized" as const, workstreams: [] }
    }

    const rows = await currentBeliefs(ctx, args.tenantId)

    return {
      status: "ready" as const,
      workstreams: await Promise.all(rows.map((row) => listRow(ctx, row))),
    }
  },
})

export const get = query({
  args: { tenantId: v.string(), workstreamId: v.id("beliefs") },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)

    if (!access.ok) {
      return null
    }

    const belief = await ctx.db.get(args.workstreamId)

    if (
      belief === null ||
      belief.tenantId !== args.tenantId ||
      belief.kind !== "workstream"
    ) {
      return null
    }

    const members = await memberEfforts(ctx, belief._id)

    return {
      ...(await listRow(ctx, belief)),
      aliases: belief.aliases,
      efforts: members.map((member) => ({
        id: member._id,
        name: member.name,
        summary: member.summary,
        seenAt: member.seenAt,
      })),
      sightings: await recentSightings(ctx, members),
      history: await recentHistory(ctx, members),
    }
  },
})

async function currentBeliefs(ctx: QueryCtx, tenantId: string) {
  const rows = await ctx.db
    .query("beliefs")
    .withIndex("by_tenant_and_kind_and_status", (index) =>
      index.eq("tenantId", tenantId).eq("kind", "workstream")
    )
    .collect()

  return rows
    .filter((row) => row.supersededBy === undefined)
    .sort((first, second) => second.seenAt - first.seenAt)
}

async function listRow(ctx: QueryCtx, row: Doc<"beliefs">) {
  return {
    id: row._id,
    name: row.name,
    status: row.status,
    statusLabel: statusLabels[row.status],
    brief: row.brief,
    sources: await sourceKeys(ctx, row._id),
    seenAt: row.seenAt,
    locked: row.lockedBy !== undefined,
  }
}

async function memberEfforts(ctx: QueryCtx, beliefId: Id<"beliefs">) {
  const rows = await ctx.db
    .query("efforts")
    .withIndex("by_workstream", (index) => index.eq("workstreamId", beliefId))
    .collect()

  return rows
    .filter((row) => row.supersededBy === undefined)
    .sort((first, second) => second.seenAt - first.seenAt)
}

// The distinct tools the transitive evidence spans, for the source chips.
async function sourceKeys(ctx: QueryCtx, beliefId: Id<"beliefs">) {
  const records = await loadBeliefSupport(ctx, beliefId)
  const keys = new Map<string, Integration | null>()

  for (const record of records) {
    if (!keys.has(record.integrationId)) {
      keys.set(
        record.integrationId,
        await integrationKey(ctx, record.integrationId)
      )
    }
  }

  return [...new Set([...keys.values()].filter((key) => key !== null))]
}

async function integrationKey(ctx: QueryCtx, integrationId: string) {
  const id = ctx.db.normalizeId("integrations", integrationId)
  const integration = id === null ? null : await ctx.db.get(id)

  return integration === null ? null : integration.integration
}

// A workstream's sightings are its member efforts' evidence: the source
// records behind the work, read transitively.
async function recentSightings(ctx: QueryCtx, members: Doc<"efforts">[]) {
  const rows: Doc<"evidence">[] = []

  for (const member of members) {
    rows.push(
      ...(await ctx.db
        .query("evidence")
        .withIndex("by_subject_effort_id", (index) =>
          index.eq("subject.effortId", member._id)
        )
        .collect())
    )
  }

  const latest = rows
    .sort((first, second) => second.observedAt - first.observedAt)
    .slice(0, detailLimit)

  return Promise.all(latest.map((row) => sightingRow(ctx, row)))
}

async function sightingRow(ctx: QueryCtx, row: Doc<"evidence">) {
  const base = { id: row._id, why: row.why, observedAt: row.observedAt }

  if (row.reference.kind === "conversation") {
    const conversation = await ctx.db.get(row.reference.conversationId)

    return {
      ...base,
      integration: await integrationKey(ctx, conversation?.integrationId ?? ""),
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
    integration: await integrationKey(ctx, event?.integrationId ?? ""),
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

// A workstream's timeline is the merged journals of its member efforts;
// narrative travels with membership.
async function recentHistory(ctx: QueryCtx, members: Doc<"efforts">[]) {
  const rows: Doc<"journal">[] = []

  for (const member of members) {
    rows.push(
      ...(await ctx.db
        .query("journal")
        .withIndex("by_effort_and_created_at", (index) =>
          index.eq("effortId", member._id)
        )
        .order("desc")
        .take(detailLimit))
    )
  }

  return rows
    .sort((first, second) => second.createdAt - first.createdAt)
    .slice(0, detailLimit)
    .map((row) => ({ id: row._id, entry: row.entry, createdAt: row.createdAt }))
}
