import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { resolveBelief, resolveEffort } from "../engine/resolve"
import { type AllowedSources, type Sighting } from "../engine/rules"
import { absorbIntoBelief, writeEvidence } from "../engine/sightings"
import { type statCounts } from "../engine/wire"
import { type WorkstreamOp } from "./ops"

export type WorkstreamApplyState = {
  allowed: AllowedSources
  temp: Map<string, Id<"beliefs">>
  now: number
  counts: ReturnType<typeof statCounts>
}

// Membership is the structural primitive of this stage: assigning an effort
// moves its evidence and narrative with it, and rolls its freshness and
// anchors up into the workstream.
export async function assignEffort(
  ctx: MutationCtx,
  state: WorkstreamApplyState,
  effort: Doc<"efforts">,
  beliefId: Id<"beliefs">
) {
  await ctx.db.patch(effort._id, {
    workstreamId: beliefId,
    updatedAt: state.now,
  })
  await absorbIntoBelief(ctx, beliefId, {
    seenAt: effort.seenAt,
    anchors: effort.anchors,
    now: state.now,
  })
}

// Citing an effort in a create claims membership: every cited effort is
// assigned to the new workstream, so a split is just creates whose citations
// carve up the old one's members.
export async function adoptCitedEfforts(
  ctx: MutationCtx,
  tenantId: string,
  state: WorkstreamApplyState,
  beliefId: Id<"beliefs">,
  sightings: Sighting[]
) {
  for (const sighting of sightings) {
    if (!("effort" in sighting.citation)) {
      continue
    }

    const effort = await resolveEffort(
      ctx,
      tenantId,
      new Map(),
      sighting.citation.effort
    )

    if (effort !== null) {
      await assignEffort(ctx, state, effort, beliefId)
    }
  }
}

// The assign op needs no citations: the effort being assigned is itself the
// evidence, recorded as a sighting on the workstream.
export async function applyAssign(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: WorkstreamApplyState,
  op: WorkstreamOp & { op: "assign" }
) {
  const effort =
    state.allowed.efforts.has(op.effortId) === false
      ? null
      : await resolveEffort(ctx, pass.tenantId, new Map(), op.effortId)
  const belief = await resolveBelief(
    ctx,
    pass.tenantId,
    "workstream",
    state.temp,
    op.beliefId
  )

  if (effort === null || belief === null) {
    state.counts.discarded += 1

    return
  }

  await assignEffort(ctx, state, effort, belief._id)
  state.counts.assigned += 1
  await writeEvidence(
    ctx,
    pass,
    { kind: "belief", beliefId: belief._id },
    [
      {
        citation: { effort: op.effortId, why: op.why },
        observedAt: effort.seenAt,
      },
    ],
    effort.name
  )
}
