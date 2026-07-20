import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { actorIdentityProvider } from "../../persons/identity/schema"
import { resolvePersonId } from "../../persons/names"
import { type Integration } from "../../shared/integrations"
import { eventAnchor } from "../anchors"
import {
  maxBeliefAnchors,
  maxEffortAnchors,
  maxEffortPersons,
  maxRollupSources,
} from "../limits"
import { mergeTokens } from "./rules"

// The single writer for every derived column. Efforts derive from their
// evidence, beliefs from their member efforts; both are recomputed from
// scratch on any change, so the caches cannot drift and heal themselves
// (person merges, moved members) on the next touch. Essence columns and
// updatedAt are never written here.

export async function refreshEffort(ctx: MutationCtx, effortId: Id<"efforts">) {
  const effort = await ctx.db.get(effortId)

  if (effort === null) {
    return
  }

  const rows = await ctx.db
    .query("evidence")
    .withIndex("by_subject_effort_id", (index) =>
      index.eq("subject.effortId", effortId)
    )
    .collect()
  const facets = await collectFacets(ctx, rows)
  const seenAt = rows.reduce(
    (latest, row) => Math.max(latest, row.observedAt),
    effort.createdAt
  )

  await ctx.db.patch(effortId, {
    seenAt,
    anchors: mergeTokens([], facets.anchors, maxEffortAnchors),
    personIds: [...facets.persons].slice(0, maxEffortPersons),
    sources: mergeTokens([], facets.sources, maxRollupSources) as Integration[],
  })

  if (effort.workstreamId !== undefined) {
    await refreshBelief(ctx, effort.workstreamId)
  }
}

export async function refreshBelief(ctx: MutationCtx, beliefId: Id<"beliefs">) {
  const belief = await ctx.db.get(beliefId)

  if (belief === null) {
    return
  }

  const members = await ctx.db
    .query("efforts")
    .withIndex("by_workstream", (index) => index.eq("workstreamId", beliefId))
    .collect()
  const current = members.filter((member) => member.supersededBy === undefined)

  await ctx.db.patch(beliefId, {
    seenAt: current.reduce(
      (latest, member) => Math.max(latest, member.seenAt),
      belief.createdAt
    ),
    anchors: mergeTokens(
      [],
      current.flatMap((member) => member.anchors),
      maxBeliefAnchors
    ),
    sources: mergeTokens(
      [],
      current.flatMap((member) => member.sources),
      maxRollupSources
    ) as Integration[],
  })
}

// What an effort's evidence yields: integrations from the write-time stamp,
// anchors from events, and the people behind the activity — only those the
// person graph actually resolves. Unlinked actors (bots, unmapped providers)
// carry no lasting signal and are skipped.
async function collectFacets(ctx: MutationCtx, rows: Doc<"evidence">[]) {
  const anchors = new Set<string>()
  const sources = new Set<Integration>()
  const persons = new Set<Id<"persons">>()

  for (const row of rows) {
    if (row.integration !== undefined) {
      sources.add(row.integration)
    }

    if (row.reference.kind !== "event") {
      continue
    }

    const event = await ctx.db.get(row.reference.eventId)

    if (event === null) {
      continue
    }

    const anchor = eventAnchor(event)
    const personId = await resolvePersonId(ctx, {
      organizationId: event.organizationId,
      provider:
        row.integration === undefined
          ? undefined
          : actorIdentityProvider(row.integration),
      actor: event.actor,
    })

    if (anchor !== undefined) {
      anchors.add(anchor)
    }

    if (personId !== undefined) {
      persons.add(personId)
    }
  }

  return { anchors, sources, persons }
}
