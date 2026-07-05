import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { resolveBelief, resolveEffort } from "../engine/resolve"
import { type AllowedSources, type Sighting } from "../engine/rules"
import { moveEffort, writeEvidence } from "../engine/sightings"
import { type statCounts } from "../engine/wire"
import { type WorkstreamOp } from "./ops"

export type WorkstreamApplyState = {
  allowed: AllowedSources
  temp: Map<string, Id<"beliefs">>
  now: number
  counts: ReturnType<typeof statCounts>
}

// Citing an effort in a create claims membership: every cited effort is
// assigned to the new workstream, so a split is just creates whose citations
// carve up the old one's members. Membership itself is the engine's
// moveEffort primitive, shared with console corrections.
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
      await moveEffort(ctx, effort, beliefId, state.now)
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

  await moveEffort(ctx, effort, belief._id, state.now)
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
