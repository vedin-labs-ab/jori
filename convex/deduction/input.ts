import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../_generated/server"
import { getActorDisplayName } from "../shared/actor"
import { eventAnchor } from "./anchors"
import {
  maxWindowConversations,
  maxWindowEvents,
  rosterJournalTail,
} from "./limits"
import { type BeliefStatus, beliefKind, passWindow } from "./schema"

// Everything one pass shows the judge, plus the source metadata the applier
// needs to validate citations. The judge sees a projection of this (see
// judge.ts); integration ids never reach the model.
export type PassInput = {
  window: { start: number; end: number }
  roster: RosterEntry[]
  events: WindowEvent[]
  conversations: WindowConversation[]
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
  journal: string[]
}

export type WindowEvent = {
  id: Id<"events">
  integrationId: Id<"integrations">
  type: string
  text?: string
  actor?: string
  anchor?: string
  observedAt: number
}

export type WindowConversation = {
  id: Id<"conversations">
  integrationId: Id<"integrations">
  summary: string
  summarizedAt: number
}

export const assemble = internalQuery({
  args: {
    tenantId: v.string(),
    kind: beliefKind,
    window: passWindow,
  },
  handler: async (ctx, args): Promise<PassInput> => {
    return {
      window: args.window,
      roster: await loadRoster(ctx, args),
      events: await loadEvents(ctx, args),
      conversations: await loadConversations(ctx, args),
    }
  },
})

async function loadRoster(
  ctx: QueryCtx,
  args: { tenantId: string; kind: Doc<"beliefs">["kind"] }
) {
  const rows = await ctx.db
    .query("beliefs")
    .withIndex("by_tenant_and_kind_and_status", (index) =>
      index.eq("tenantId", args.tenantId).eq("kind", args.kind)
    )
    .collect()
  const current = rows.filter((row) => row.supersededBy === undefined)

  return Promise.all(current.map((row) => readRosterEntry(ctx, row)))
}

async function readRosterEntry(
  ctx: QueryCtx,
  row: Doc<"beliefs">
): Promise<RosterEntry> {
  const entries = await ctx.db
    .query("journal")
    .withIndex("by_belief_and_created_at", (index) =>
      index.eq("beliefId", row._id)
    )
    .order("desc")
    .take(rosterJournalTail)

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
    journal: entries.map((entry) => journalLine(entry)),
  }
}

export function journalLine(
  entry: Pick<Doc<"journal">, "createdAt" | "entry">
) {
  return `${new Date(entry.createdAt).toISOString().slice(0, 10)}: ${entry.entry}`
}

// Windows range over ingestion time (_creationTime), so late-arriving webhooks
// are never skipped; observedAt is for narrative.
async function loadEvents(
  ctx: QueryCtx,
  args: { tenantId: string; window: { start: number; end: number } }
) {
  const rows = await ctx.db
    .query("events")
    .withIndex("by_tenant", (index) =>
      index
        .eq("tenantId", args.tenantId)
        .gt("_creationTime", args.window.start)
        .lte("_creationTime", args.window.end)
    )
    .order("desc")
    .take(maxWindowEvents)

  return rows.reverse().map((row) => readWindowEvent(row))
}

export function readWindowEvent(row: Doc<"events">): WindowEvent {
  return {
    id: row._id,
    integrationId: row.integrationId,
    type: row.type,
    text: row.text,
    actor: getActorDisplayName(row.actor),
    anchor: eventAnchor(row),
    observedAt: row.observedAt ?? row._creationTime,
  }
}

async function loadConversations(
  ctx: QueryCtx,
  args: { tenantId: string; window: { start: number; end: number } }
) {
  const rows = await ctx.db
    .query("conversations")
    .withIndex("by_tenant_and_summarized_at", (index) =>
      index
        .eq("tenantId", args.tenantId)
        .gt("summarizedAt", args.window.start)
        .lte("summarizedAt", args.window.end)
    )
    .order("desc")
    .take(maxWindowConversations)

  return rows
    .filter((row) => isReadableConversation(row))
    .map((row) => readWindowConversation(row))
}

// The one privacy gate on judge input: only tenant-scoped conversations with
// a non-empty summary are readable.
export function isReadableConversation(row: Doc<"conversations">) {
  return (
    row.scope === "tenant" &&
    row.summary !== undefined &&
    row.summary !== "" &&
    row.summarizedAt !== undefined
  )
}

export function readWindowConversation(
  row: Doc<"conversations">
): WindowConversation {
  return {
    id: row._id,
    integrationId: row.integrationId,
    summary: row.summary ?? "",
    summarizedAt: row.summarizedAt ?? 0,
  }
}
