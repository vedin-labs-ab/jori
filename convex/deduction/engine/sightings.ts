import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { actorIdentityProvider } from "../../identity/schema"
import { canonicalActorName } from "../../persons/names"
import { type Integration } from "../../shared/integrations"
import { eventAnchor } from "../anchors"
import {
  maxBeliefAnchors,
  maxEffortActors,
  maxEffortAnchors,
  maxRollupSources,
} from "../limits"
import { type EvidenceSubject } from "../schema"
import { maxObservedAt, mergeTokens, type Sighting } from "./rules"

// Sightings append per pass; repeat citations are expected and are what
// advance seenAt. For conversations, observedAt carries summarizedAt. The
// workstream stamp is the read-model owner for effort-subject rows; belief
// subjects pass undefined.
export async function writeEvidence(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  subject: EvidenceSubject,
  sightings: Sighting[],
  fallbackWhy: string,
  workstreamId?: Id<"beliefs">
) {
  for (const sighting of sightings) {
    await ctx.db.insert("evidence", {
      tenantId: pass.tenantId,
      subject,
      passId: pass._id,
      reference: toReference(sighting),
      why: sighting.citation.why ?? fallbackWhy,
      observedAt: sighting.observedAt,
      workstreamId,
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

// What an effort absorbs from cited sources: anchors from events, the
// integration kind from events and conversations alike, and actors resolved
// to canonical person names so one person never appears under two handles.
// Resolved once at write time so reads never walk evidence.
export async function collectFacets(ctx: MutationCtx, sightings: Sighting[]) {
  const anchors = new Set<string>()
  const actors = new Set<string>()
  const sources = new Set<Integration>()

  for (const sighting of sightings) {
    const cited = await loadCitedRecord(ctx, sighting)

    if (cited === null) {
      continue
    }

    const source = await integrationKind(ctx, cited.integrationId)

    if (source !== undefined) {
      sources.add(source)
    }

    if (cited.event === undefined) {
      continue
    }

    const anchor = eventAnchor(cited.event)
    const actor = await canonicalActorName(ctx, {
      tenantId: cited.event.tenantId,
      provider:
        source === undefined ? undefined : actorIdentityProvider(source),
      actor: cited.event.actor,
    })

    if (anchor !== undefined) {
      anchors.add(anchor)
    }

    if (actor !== undefined) {
      actors.add(actor)
    }
  }

  return { anchors, actors, sources }
}

async function loadCitedRecord(ctx: MutationCtx, sighting: Sighting) {
  if ("event" in sighting.citation) {
    const event = await ctx.db.get(sighting.citation.event as Id<"events">)

    return event === null ? null : { event, integrationId: event.integrationId }
  }

  if ("conversation" in sighting.citation) {
    const conversation = await ctx.db.get(
      sighting.citation.conversation as Id<"conversations">
    )

    return conversation === null
      ? null
      : { event: undefined, integrationId: conversation.integrationId }
  }

  return null
}

async function integrationKind(
  ctx: MutationCtx,
  integrationId: Id<"integrations">
): Promise<Integration | undefined> {
  const integration = await ctx.db.get(integrationId)

  return integration?.integration
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

  const facets = await collectFacets(ctx, sightings)
  const seenAt = Math.max(effort.seenAt, maxObservedAt(sightings))
  const anchors = mergeTokens(effort.anchors, facets.anchors, maxEffortAnchors)
  const sources = mergeSources(effort.sources, facets.sources)

  await ctx.db.patch(effort._id, {
    seenAt,
    anchors,
    sources,
    actors: mergeTokens(effort.actors, facets.actors, maxEffortActors),
    updatedAt: now,
  })

  if (effort.workstreamId !== undefined) {
    await absorbIntoBelief(ctx, effort.workstreamId, {
      seenAt,
      anchors,
      sources,
      now,
    })
  }
}

function mergeSources(current: Integration[], added: Iterable<Integration>) {
  return mergeTokens(current, added, maxRollupSources) as Integration[]
}

// Roll an effort's freshness, anchors, and sources up into a belief. The
// only writes a belief takes outside its own stage's ops: rollups only,
// wording never changes here.
export async function absorbIntoBelief(
  ctx: MutationCtx,
  beliefId: Id<"beliefs">,
  effort: {
    seenAt: number
    anchors: string[]
    sources: Integration[]
    now: number
  }
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
    sources: mergeSources(belief.sources ?? [], effort.sources),
    updatedAt: effort.now,
  })
}

// The one membership primitive: every path that moves an effort into a
// workstream — judge assigns and creates, belief merges, console
// corrections — goes through here, so the read-model stamps on its evidence
// and journal never drift from the assignment.
export async function moveEffort(
  ctx: MutationCtx,
  effort: Doc<"efforts">,
  beliefId: Id<"beliefs">,
  now: number
) {
  await ctx.db.patch(effort._id, { workstreamId: beliefId, updatedAt: now })
  await stampEffortRows(ctx, effort._id, beliefId)
  await absorbIntoBelief(ctx, beliefId, {
    seenAt: effort.seenAt,
    anchors: effort.anchors,
    sources: effort.sources,
    now,
  })
}

export async function stampEffortRows(
  ctx: MutationCtx,
  effortId: Id<"efforts">,
  workstreamId: Id<"beliefs"> | undefined
) {
  const rows = await ctx.db
    .query("evidence")
    .withIndex("by_subject_effort_id", (index) =>
      index.eq("subject.effortId", effortId)
    )
    .collect()

  for (const row of rows) {
    await ctx.db.patch(row._id, { workstreamId })
  }

  const entries = await ctx.db
    .query("journal")
    .withIndex("by_effort_and_observed_at", (index) =>
      index.eq("effortId", effortId)
    )
    .collect()

  for (const entry of entries) {
    await ctx.db.patch(entry._id, { workstreamId })
  }
}
