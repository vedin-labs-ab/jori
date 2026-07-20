import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type Integration } from "../../shared/integrations"
import { type EvidenceSubject } from "../schema"
import { refreshBelief } from "./derive"
import { type Sighting } from "./rules"

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
    const reference = toReference(sighting)

    await ctx.db.insert("evidence", {
      organizationId: pass.organizationId,
      subject,
      passId: pass._id,
      reference,
      why: sighting.citation.why ?? fallbackWhy,
      observedAt: sighting.observedAt,
      integration: await citedIntegration(ctx, reference),
      workstreamId,
    })
  }
}

type EvidenceReference = ReturnType<typeof toReference>

// The integration behind a citation, resolved once at write time so reads
// never walk the reference chain. Effort references carry none.
export async function citedIntegration(
  ctx: MutationCtx,
  reference: EvidenceReference
): Promise<Integration | undefined> {
  if (reference.kind === "effort") {
    return undefined
  }

  const cited =
    reference.kind === "event"
      ? await ctx.db.get(reference.eventId)
      : await ctx.db.get(reference.conversationId)

  if (cited?.integrationId === undefined) {
    return undefined
  }

  const integration = await ctx.db.get(cited.integrationId)

  return integration?.integration
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

// The one membership primitive: every path that moves an effort into a
// workstream — judge assigns and creates, belief merges, console
// corrections — goes through here, so the read-model stamps on its evidence
// and journal never drift from the assignment, and both the old and new
// workstream caches are refreshed.
//
// A move to the current workstream writes nothing. Window passes select
// efforts by updatedAt, so a review's own writes must never re-qualify an
// unchanged effort for the next window — bumping updatedAt here is what once
// kept an idle organization's judge running every hour.
export async function moveEffort(
  ctx: MutationCtx,
  effort: Doc<"efforts">,
  beliefId: Id<"beliefs">,
  now: number
) {
  const previous = effort.workstreamId

  if (previous === beliefId) {
    return
  }

  await ctx.db.patch(effort._id, { workstreamId: beliefId, updatedAt: now })
  await stampEffortRows(ctx, effort._id, beliefId)
  await refreshBelief(ctx, beliefId)

  if (previous !== undefined) {
    await refreshBelief(ctx, previous)
  }
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
