import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { resolveEffort } from "../engine/resolve"
import {
  type AllowedSources,
  maxObservedAt,
  type Sighting,
} from "../engine/rules"
import { bumpEffort, writeEvidence } from "../engine/sightings"
import { type statCounts } from "../engine/wire"
import { type EffortOp } from "./ops"

export type EffortApplyState = {
  allowed: AllowedSources
  temp: Map<string, Id<"efforts">>
  now: number
  counts: ReturnType<typeof statCounts>
}

export async function applyCreate(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: EffortApplyState,
  op: EffortOp & { op: "create" },
  sightings: Sighting[]
) {
  const effortId = await ctx.db.insert("efforts", {
    tenantId: pass.tenantId,
    name: op.name,
    summary: op.summary,
    anchors: [],
    actors: [],
    seenAt: maxObservedAt(sightings),
    createdAt: state.now,
    updatedAt: state.now,
  })

  state.temp.set(op.tempId, effortId)
  state.counts.created += 1
  await ctx.db.insert("journal", {
    tenantId: pass.tenantId,
    effortId,
    passId: pass._id,
    entry: op.entry,
    createdAt: state.now,
  })
  await recordSightings(ctx, pass, effortId, sightings, op.summary, state.now)
}

export async function applyUpdate(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: EffortApplyState,
  op: EffortOp & { op: "update" },
  sightings: Sighting[]
) {
  const effort = await resolveEffort(
    ctx,
    pass.tenantId,
    state.temp,
    op.effortId
  )

  if (effort === null) {
    state.counts.discarded += 1

    return
  }

  await ctx.db.patch(effort._id, {
    ...(op.name === undefined ? {} : { name: op.name }),
    ...(op.summary === undefined ? {} : { summary: op.summary }),
    updatedAt: state.now,
  })
  state.counts.updated += 1
  await recordSightings(
    ctx,
    pass,
    effort._id,
    sightings,
    op.summary ?? effort.summary,
    state.now
  )
}

export async function applyJournal(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: EffortApplyState,
  op: EffortOp & { op: "journal" },
  sightings: Sighting[]
) {
  const effort = await resolveEffort(
    ctx,
    pass.tenantId,
    state.temp,
    op.effortId
  )

  if (effort === null) {
    state.counts.discarded += 1

    return
  }

  await ctx.db.insert("journal", {
    tenantId: pass.tenantId,
    effortId: effort._id,
    passId: pass._id,
    entry: op.entry,
    createdAt: state.now,
  })
  state.counts.updated += 1
  await recordSightings(ctx, pass, effort._id, sightings, op.entry, state.now)
}

// Efforts are plumbing, not identity: merging one consolidates its journal,
// evidence, and references onto the winner so reads stay a single walk.
// (Belief merges keep history in place; effort merges move it.)
export async function applyMerge(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: EffortApplyState,
  op: EffortOp & { op: "merge" },
  sightings: Sighting[]
) {
  const effort = await resolveEffort(
    ctx,
    pass.tenantId,
    state.temp,
    op.effortId
  )
  const into = await resolveEffort(ctx, pass.tenantId, state.temp, op.into)

  if (effort === null || into === null || effort._id === into._id) {
    state.counts.discarded += 1

    return
  }

  await repointEffortRows(ctx, effort._id, into._id)

  if (into.workstreamId === undefined && effort.workstreamId !== undefined) {
    await ctx.db.patch(into._id, { workstreamId: effort.workstreamId })
  }

  await ctx.db.patch(effort._id, {
    supersededBy: into._id,
    updatedAt: state.now,
  })
  state.counts.merged += 1
  await recordSightings(ctx, pass, into._id, sightings, into.summary, state.now)
}

async function repointEffortRows(
  ctx: MutationCtx,
  from: Id<"efforts">,
  to: Id<"efforts">
) {
  const entries = await ctx.db
    .query("journal")
    .withIndex("by_effort_and_created_at", (index) =>
      index.eq("effortId", from)
    )
    .collect()

  for (const entry of entries) {
    await ctx.db.patch(entry._id, { effortId: to })
  }

  const subjects = await ctx.db
    .query("evidence")
    .withIndex("by_subject_effort_id", (index) =>
      index.eq("subject.effortId", from)
    )
    .collect()

  for (const row of subjects) {
    await ctx.db.patch(row._id, { subject: { kind: "effort", effortId: to } })
  }

  const references = await ctx.db
    .query("evidence")
    .withIndex("by_reference_effort_id", (index) =>
      index.eq("reference.effortId", from)
    )
    .collect()

  for (const row of references) {
    await ctx.db.patch(row._id, { reference: { kind: "effort", effortId: to } })
  }
}

async function recordSightings(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  effortId: Id<"efforts">,
  sightings: Sighting[],
  fallbackWhy: string,
  now: number
) {
  await writeEvidence(
    ctx,
    pass,
    { kind: "effort", effortId },
    sightings,
    fallbackWhy
  )
  const effort = await ctx.db.get(effortId)

  if (effort !== null) {
    await bumpEffort(ctx, effort, sightings, now)
  }
}
