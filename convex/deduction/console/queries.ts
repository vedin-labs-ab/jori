import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx, query } from "../../_generated/server"
import { checkTenantAccess } from "../../identity/access"
import { type Integration } from "../../shared/integrations"
import { loadSupport } from "../support"
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

    return {
      ...(await listRow(ctx, belief)),
      aliases: belief.aliases,
      sightings: await recentSightings(ctx, belief._id),
      history: await recentHistory(ctx, belief._id),
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

// The distinct tools the evidence spans, for the source chips.
async function sourceKeys(ctx: QueryCtx, beliefId: Id<"beliefs">) {
  const records = await loadSupport(ctx, beliefId)
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

async function recentSightings(ctx: QueryCtx, beliefId: Id<"beliefs">) {
  const rows = await ctx.db
    .query("evidence")
    .withIndex("by_belief", (index) => index.eq("beliefId", beliefId))
    .collect()
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

async function recentHistory(ctx: QueryCtx, beliefId: Id<"beliefs">) {
  const rows = await ctx.db
    .query("journal")
    .withIndex("by_belief_and_created_at", (index) =>
      index.eq("beliefId", beliefId)
    )
    .order("desc")
    .take(detailLimit)

  return rows.map((row) => ({
    id: row._id,
    entry: row.entry,
    createdAt: row.createdAt,
  }))
}
