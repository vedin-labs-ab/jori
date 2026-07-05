import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { loadBeliefSupport, resolveBelief } from "../engine/resolve"
import {
  hasConfirmSupport,
  legalStatusTransition,
  maxObservedAt,
  type Sighting,
  statusAfterTransition,
} from "../engine/rules"
import { writeEvidence } from "../engine/sightings"
import {
  adoptCitedEfforts,
  assignEffort,
  type WorkstreamApplyState,
} from "./members"
import { type WorkstreamOp } from "./ops"

export async function applyCreate(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: WorkstreamApplyState,
  op: WorkstreamOp & { op: "create" },
  sightings: Sighting[]
) {
  const parent =
    op.parentId === undefined
      ? null
      : await resolveBelief(
          ctx,
          pass.tenantId,
          "workstream",
          state.temp,
          op.parentId
        )
  const beliefId = await ctx.db.insert("beliefs", {
    tenantId: pass.tenantId,
    kind: "workstream",
    name: op.name,
    aliases: op.aliases,
    status: "proposed",
    anchors: [],
    brief: op.brief,
    parentId: parent?._id,
    seenAt: maxObservedAt(sightings),
    createdAt: state.now,
    updatedAt: state.now,
  })

  state.temp.set(op.tempId, beliefId)
  state.counts.created += 1
  await writeEvidence(
    ctx,
    pass,
    { kind: "belief", beliefId },
    sightings,
    op.brief
  )
  await adoptCitedEfforts(ctx, pass.tenantId, state, beliefId, sightings)
}

export async function applyUpdate(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: WorkstreamApplyState,
  op: WorkstreamOp & { op: "update" },
  sightings: Sighting[]
) {
  const belief = await resolveBelief(
    ctx,
    pass.tenantId,
    "workstream",
    state.temp,
    op.beliefId
  )

  if (belief === null || belief.lockedBy !== undefined) {
    state.counts.discarded += 1

    return
  }

  const parent =
    op.parentId === undefined
      ? undefined
      : await resolveBelief(
          ctx,
          pass.tenantId,
          "workstream",
          state.temp,
          op.parentId
        )

  await ctx.db.patch(belief._id, {
    ...(op.name === undefined ? {} : { name: op.name }),
    ...(op.aliases === undefined ? {} : { aliases: op.aliases }),
    ...(op.brief === undefined ? {} : { brief: op.brief }),
    ...(parent == null ? {} : { parentId: parent._id }),
    updatedAt: state.now,
  })
  state.counts.updated += 1
  await writeEvidence(
    ctx,
    pass,
    { kind: "belief", beliefId: belief._id },
    sightings,
    op.brief ?? belief.brief
  )
}

export async function applyStatus(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: WorkstreamApplyState,
  op: WorkstreamOp & { op: "status" },
  sightings: Sighting[]
) {
  const belief = await resolveBelief(
    ctx,
    pass.tenantId,
    "workstream",
    state.temp,
    op.beliefId
  )

  if (
    belief === null ||
    belief.lockedBy !== undefined ||
    !legalStatusTransition(belief.status, op.to)
  ) {
    state.counts.discarded += 1

    return
  }

  if (
    op.to === "confirm" &&
    !hasConfirmSupport(await loadBeliefSupport(ctx, belief._id))
  ) {
    state.counts.discarded += 1

    return
  }

  await ctx.db.patch(belief._id, {
    status: statusAfterTransition(op.to),
    updatedAt: state.now,
  })

  if (op.to === "close") {
    state.counts.closed += 1
  }

  await writeEvidence(
    ctx,
    pass,
    { kind: "belief", beliefId: belief._id },
    sightings,
    belief.brief
  )
}

// Merging a workstream moves its members: the efforts re-assign to the
// winner, and their evidence and narrative travel with them. The loser's
// own belief evidence stays where history put it.
export async function applyMerge(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: WorkstreamApplyState,
  op: WorkstreamOp & { op: "merge" },
  sightings: Sighting[]
) {
  const belief = await resolveBelief(
    ctx,
    pass.tenantId,
    "workstream",
    state.temp,
    op.beliefId
  )
  const into = await resolveBelief(
    ctx,
    pass.tenantId,
    "workstream",
    state.temp,
    op.into
  )

  if (
    belief === null ||
    into === null ||
    belief._id === into._id ||
    belief.lockedBy !== undefined
  ) {
    state.counts.discarded += 1

    return
  }

  const members = await ctx.db
    .query("efforts")
    .withIndex("by_workstream", (index) => index.eq("workstreamId", belief._id))
    .collect()

  for (const member of members) {
    await assignEffort(ctx, state, member, into._id)
  }

  await ctx.db.patch(belief._id, {
    supersededBy: into._id,
    updatedAt: state.now,
  })
  state.counts.merged += 1
  await writeEvidence(
    ctx,
    pass,
    { kind: "belief", beliefId: into._id },
    sightings,
    into.brief
  )
}
