import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../../_generated/server"
import { personDisplayName } from "../../persons/names"
import { getActorDisplayName } from "../../shared/actor"
import { eventAnchor } from "../anchors"
import { iso, type JournalRecord, journalRecord } from "../engine/judge"
import {
  effortActiveMs,
  effortJournalTail,
  maxContextEfforts,
  maxWindowConversations,
  maxWindowEvents,
} from "../limits"
import { passWindow } from "../schema"

// Everything one effort pass shows the judge, plus the source metadata the
// applier needs to validate citations. The judge sees a projection of this
// (toPayload); integration ids never reach the model. Existing efforts are
// continuity context for extend-versus-create decisions — the judge never
// sees workstreams, and that blindness is deliberate.
export type EffortPassInput = {
  window: { start: number; end: number }
  efforts: EffortContext[]
  events: WindowEvent[]
  conversations: WindowConversation[]
}

export type EffortContext = {
  id: Id<"efforts">
  name: string
  summary: string
  anchors: string[]
  actors: string[]
  seenAt: number
  journal: JournalRecord[]
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
  args: { tenantId: v.string(), window: passWindow },
  handler: async (ctx, args): Promise<EffortPassInput> => {
    return {
      window: args.window,
      efforts: await loadActiveEfforts(ctx, args.tenantId),
      events: await loadEvents(ctx, args),
      conversations: await loadConversations(ctx, args),
    }
  },
})

// Efforts sighted inside the active window, newest first, capped. Dormant
// efforts leave the payload, so continuing work spawns a fresh effort
// instead of reanimating an old one.
async function loadActiveEfforts(ctx: QueryCtx, tenantId: string) {
  const rows = await activeEffortRows(ctx, tenantId, maxContextEfforts)

  return Promise.all(rows.map((row) => readEffortContext(ctx, row)))
}

// Current efforts, newest sighting first and never superseded. The default
// cutoff is the dormancy window both judges read through; the console pulse
// passes its own view range instead.
export async function activeEffortRows(
  ctx: QueryCtx,
  tenantId: string,
  limit: number,
  sightedSince = Date.now() - effortActiveMs
) {
  const rows = await ctx.db
    .query("efforts")
    .withIndex("by_tenant_and_seen_at", (index) =>
      index.eq("tenantId", tenantId).gt("seenAt", sightedSince)
    )
    .order("desc")
    .take(limit)

  return rows.filter((row) => row.supersededBy === undefined)
}

export async function readEffortContext(
  ctx: QueryCtx,
  row: Doc<"efforts">,
  tail = effortJournalTail
): Promise<EffortContext> {
  const entries = await ctx.db
    .query("journal")
    .withIndex("by_effort_and_observed_at", (index) =>
      index.eq("effortId", row._id)
    )
    .order("desc")
    .take(tail)

  const names = await Promise.all(
    row.personIds.map((personId) => personDisplayName(ctx, personId))
  )

  return {
    id: row._id,
    name: row.name,
    summary: row.summary,
    anchors: row.anchors,
    actors: names.filter((name): name is string => name !== undefined),
    seenAt: row.seenAt,
    journal: entries.map((entry) => journalRecord(entry)),
  }
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

// The applier validates citations against exactly what this pass showed the
// judge; for conversations, observedAt carries summarizedAt.
export function toAllowed(input: EffortPassInput) {
  return {
    events: input.events.map((event) => ({
      id: event.id as string,
      observedAt: event.observedAt,
      integrationId: event.integrationId as string,
    })),
    conversations: input.conversations.map((conversation) => ({
      id: conversation.id as string,
      observedAt: conversation.summarizedAt,
      integrationId: conversation.integrationId as string,
    })),
  }
}

// The judge sees names, content, and ISO dates, never integration ids or raw
// timestamps: this projection keeps applier-only metadata out of the model.
export function toPayload(input: EffortPassInput) {
  return {
    window: { start: iso(input.window.start), end: iso(input.window.end) },
    efforts: input.efforts.map((effort) => ({
      id: effort.id,
      name: effort.name,
      summary: effort.summary,
      anchors: effort.anchors,
      actors: effort.actors,
      seenAt: iso(effort.seenAt),
      journal: effort.journal,
    })),
    events: input.events.map((event) => ({
      id: event.id,
      type: event.type,
      text: event.text,
      actor: event.actor,
      anchor: event.anchor,
      observedAt: iso(event.observedAt),
    })),
    conversations: input.conversations.map((conversation) => ({
      id: conversation.id,
      summary: conversation.summary,
      summarizedAt: iso(conversation.summarizedAt),
    })),
  }
}
