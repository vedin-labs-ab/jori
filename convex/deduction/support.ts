import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { eventAnchor } from "./anchors"
import { maxBeliefAnchors } from "./limits"
import { type Sighting, type SourceRecord } from "./rules"

// Resolve a wire id to a live belief of the pass's tenant and kind: temp ids
// minted by this pass first, then real document ids. Superseded beliefs are
// out of the roster and never valid targets.
export async function resolveBelief(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  temp: Map<string, Id<"beliefs">>,
  raw: string
): Promise<Doc<"beliefs"> | null> {
  const id = temp.get(raw) ?? ctx.db.normalizeId("beliefs", raw)

  if (id === null) {
    return null
  }

  const doc = await ctx.db.get(id)

  return doc !== null &&
    doc.tenantId === pass.tenantId &&
    doc.kind === pass.kind &&
    doc.supersededBy === undefined
    ? doc
    : null
}

// Sightings append per pass; repeat citations are expected and are what
// advance seenAt. For conversations, observedAt carries summarizedAt.
export async function writeSightings(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  beliefId: Id<"beliefs">,
  sightings: Sighting[],
  fallbackWhy: string
) {
  const anchors = new Set<string>()

  for (const sighting of sightings) {
    const anchor = await sightingAnchor(ctx, sighting)

    if (anchor !== undefined) {
      anchors.add(anchor)
    }

    await ctx.db.insert("evidence", {
      tenantId: pass.tenantId,
      beliefId,
      passId: pass._id,
      reference: toReference(sighting),
      why: sighting.citation.why ?? fallbackWhy,
      observedAt: sighting.observedAt,
    })
  }

  await bumpBelief(ctx, beliefId, sightings, anchors)
}

async function sightingAnchor(ctx: MutationCtx, sighting: Sighting) {
  if (!("event" in sighting.citation)) {
    return undefined
  }

  const event = await ctx.db.get(sighting.citation.event as Id<"events">)

  return event === null ? undefined : eventAnchor(event)
}

function toReference(sighting: Sighting) {
  if ("event" in sighting.citation) {
    return {
      kind: "event" as const,
      eventId: sighting.citation.event as Id<"events">,
    }
  }

  return {
    kind: "conversation" as const,
    conversationId: sighting.citation.conversation as Id<"conversations">,
    summarizedAt: sighting.observedAt,
  }
}

async function bumpBelief(
  ctx: MutationCtx,
  beliefId: Id<"beliefs">,
  sightings: Sighting[],
  anchors: Set<string>
) {
  if (sightings.length === 0) {
    return
  }

  const belief = await ctx.db.get(beliefId)

  if (belief === null) {
    return
  }

  const latest = Math.max(...sightings.map((sighting) => sighting.observedAt))
  const merged = [...new Set([...(belief.anchors ?? []), ...anchors])]
    .sort()
    .slice(0, maxBeliefAnchors)

  await ctx.db.patch(beliefId, {
    seenAt: Math.max(belief.seenAt, latest),
    anchors: merged,
  })
}

// Confirmation thresholds count all accumulated support: existing evidence
// resolved back to its integration, plus this op's new sightings.
export async function loadSupport(
  ctx: QueryCtx,
  beliefId: Id<"beliefs">
): Promise<SourceRecord[]> {
  const rows = await ctx.db
    .query("evidence")
    .withIndex("by_belief", (index) => index.eq("beliefId", beliefId))
    .collect()
  const records: SourceRecord[] = []

  for (const row of rows) {
    const source =
      row.reference.kind === "event"
        ? await ctx.db.get(row.reference.eventId)
        : await ctx.db.get(row.reference.conversationId)

    if (source !== null) {
      records.push({
        observedAt: row.observedAt,
        integrationId: source.integrationId,
      })
    }
  }

  return records
}
