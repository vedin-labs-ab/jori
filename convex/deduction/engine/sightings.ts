import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { getActorDisplayName } from "../../shared/actor"
import { eventAnchor } from "../anchors"
import { maxBeliefAnchors, maxEffortActors, maxEffortAnchors } from "../limits"
import { type EvidenceSubject } from "../schema"
import { maxObservedAt, mergeTokens, type Sighting } from "./rules"

// Sightings append per pass; repeat citations are expected and are what
// advance seenAt. For conversations, observedAt carries summarizedAt.
export async function writeEvidence(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  subject: EvidenceSubject,
  sightings: Sighting[],
  fallbackWhy: string
) {
  for (const sighting of sightings) {
    await ctx.db.insert("evidence", {
      tenantId: pass.tenantId,
      subject,
      passId: pass._id,
      reference: toReference(sighting),
      why: sighting.citation.why ?? fallbackWhy,
      observedAt: sighting.observedAt,
    })
  }
}

function toReference(sighting: Sighting) {
  const citation = sighting.citation

  if ("event" in citation) {
    return { kind: "event" as const, eventId: citation.event as Id<"events"> }
  }

  if ("conversation" in citation) {
    return {
      kind: "conversation" as const,
      conversationId: citation.conversation as Id<"conversations">,
      summarizedAt: sighting.observedAt,
    }
  }

  return {
    kind: "effort" as const,
    effortId: citation.effort as Id<"efforts">,
  }
}

// Anchors and actors an effort absorbs from cited events. Conversations
// carry neither; they still advance seenAt.
export async function collectFacets(ctx: MutationCtx, sightings: Sighting[]) {
  const anchors = new Set<string>()
  const actors = new Set<string>()

  for (const sighting of sightings) {
    if (!("event" in sighting.citation)) {
      continue
    }

    const event = await ctx.db.get(sighting.citation.event as Id<"events">)

    if (event === null) {
      continue
    }

    const anchor = eventAnchor(event)
    const actor = getActorDisplayName(event.actor)

    if (anchor !== undefined) {
      anchors.add(anchor)
    }

    if (actor !== undefined) {
      actors.add(actor)
    }
  }

  return { anchors, actors }
}

// Advance an effort from this pass's sightings, and cascade freshness into
// its workstream so the roster stays current without a belief-stage rewrite.
export async function bumpEffort(
  ctx: MutationCtx,
  effort: Doc<"efforts">,
  sightings: Sighting[],
  now: number
) {
  if (sightings.length === 0) {
    return
  }

  const { anchors, actors } = await collectFacets(ctx, sightings)
  const seenAt = Math.max(effort.seenAt, maxObservedAt(sightings))
  const mergedAnchors = mergeTokens(effort.anchors, anchors, maxEffortAnchors)

  await ctx.db.patch(effort._id, {
    seenAt,
    anchors: mergedAnchors,
    actors: mergeTokens(effort.actors, actors, maxEffortActors),
    updatedAt: now,
  })

  if (effort.workstreamId !== undefined) {
    await absorbIntoBelief(ctx, effort.workstreamId, {
      seenAt,
      anchors: mergedAnchors,
      now,
    })
  }
}

// Roll an effort's freshness and anchors up into a belief. The only writes a
// belief takes outside its own stage's ops: seenAt and anchors are rollups,
// wording never changes here.
export async function absorbIntoBelief(
  ctx: MutationCtx,
  beliefId: Id<"beliefs">,
  effort: { seenAt: number; anchors: string[]; now: number }
) {
  const belief = await ctx.db.get(beliefId)

  if (belief === null) {
    return
  }

  await ctx.db.patch(beliefId, {
    seenAt: Math.max(belief.seenAt, effort.seenAt),
    anchors: mergeTokens(
      belief.anchors ?? [],
      effort.anchors,
      maxBeliefAnchors
    ),
    updatedAt: effort.now,
  })
}
