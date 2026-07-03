import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { type JudgeOp } from "./review/ops"
import {
  type AllowedSources,
  hasConfirmSupport,
  legalStatusTransition,
  maxObservedAt,
  requiresCitations,
  resolveCitations,
  type Sighting,
  statusAfterTransition,
} from "./rules"
import { loadSupport, resolveBelief, writeSightings } from "./support"

export type ApplyState = {
  allowed: AllowedSources
  temp: Map<string, Id<"beliefs">>
  now: number
  created: number
  updated: number
  merged: number
  closed: number
  discarded: number
}

export async function applyOp(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: ApplyState,
  op: JudgeOp
) {
  const sightings = resolveCitations(op.citations, state.allowed)

  if (sightings === null || (requiresCitations(op) && sightings.length === 0)) {
    state.discarded += 1

    return
  }

  switch (op.op) {
    case "create":
      return applyCreate(ctx, pass, state, op, sightings)
    case "update":
      return applyUpdate(ctx, pass, state, op, sightings)
    case "status":
      return applyStatus(ctx, pass, state, op, sightings)
    case "merge":
      return applyMerge(ctx, pass, state, op, sightings)
    case "journal":
      return applyJournal(ctx, pass, state, op, sightings)
  }
}

async function applyCreate(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: ApplyState,
  op: JudgeOp & { op: "create" },
  sightings: Sighting[]
) {
  const parent =
    op.parentId === undefined
      ? null
      : await resolveBelief(ctx, pass, state.temp, op.parentId)
  const beliefId = await ctx.db.insert("beliefs", {
    tenantId: pass.tenantId,
    kind: pass.kind,
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
  state.created += 1
  await ctx.db.insert("journal", {
    tenantId: pass.tenantId,
    beliefId,
    passId: pass._id,
    entry: op.entry,
    createdAt: state.now,
  })
  await writeSightings(ctx, pass, beliefId, sightings, op.brief)
}

async function applyUpdate(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: ApplyState,
  op: JudgeOp & { op: "update" },
  sightings: Sighting[]
) {
  const belief = await resolveBelief(ctx, pass, state.temp, op.beliefId)

  if (belief === null || belief.lockedBy !== undefined) {
    state.discarded += 1

    return
  }

  const parent =
    op.parentId === undefined
      ? undefined
      : await resolveBelief(ctx, pass, state.temp, op.parentId)

  await ctx.db.patch(belief._id, {
    ...(op.name === undefined ? {} : { name: op.name }),
    ...(op.aliases === undefined ? {} : { aliases: op.aliases }),
    ...(op.brief === undefined ? {} : { brief: op.brief }),
    ...(parent == null ? {} : { parentId: parent._id }),
    updatedAt: state.now,
  })
  state.updated += 1
  await writeSightings(
    ctx,
    pass,
    belief._id,
    sightings,
    op.brief ?? belief.brief
  )
}

async function applyStatus(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: ApplyState,
  op: JudgeOp & { op: "status" },
  sightings: Sighting[]
) {
  const belief = await resolveBelief(ctx, pass, state.temp, op.beliefId)

  if (
    belief === null ||
    belief.lockedBy !== undefined ||
    !legalStatusTransition(belief.status, op.to)
  ) {
    state.discarded += 1

    return
  }

  if (op.to === "confirm") {
    const support = [...(await loadSupport(ctx, belief._id)), ...sightings]

    if (!hasConfirmSupport(support)) {
      state.discarded += 1

      return
    }
  }

  await ctx.db.patch(belief._id, {
    status: statusAfterTransition(op.to),
    updatedAt: state.now,
  })

  if (op.to === "close") {
    state.closed += 1
  }

  await writeSightings(ctx, pass, belief._id, sightings, belief.brief)
}

async function applyMerge(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: ApplyState,
  op: JudgeOp & { op: "merge" },
  sightings: Sighting[]
) {
  const belief = await resolveBelief(ctx, pass, state.temp, op.beliefId)
  const into = await resolveBelief(ctx, pass, state.temp, op.into)

  if (
    belief === null ||
    into === null ||
    belief._id === into._id ||
    belief.lockedBy !== undefined
  ) {
    state.discarded += 1

    return
  }

  await ctx.db.patch(belief._id, {
    supersededBy: into._id,
    updatedAt: state.now,
  })
  state.merged += 1
  await writeSightings(ctx, pass, into._id, sightings, into.brief)
}

async function applyJournal(
  ctx: MutationCtx,
  pass: Doc<"passes">,
  state: ApplyState,
  op: JudgeOp & { op: "journal" },
  sightings: Sighting[]
) {
  const belief = await resolveBelief(ctx, pass, state.temp, op.beliefId)

  if (belief === null) {
    state.discarded += 1

    return
  }

  await ctx.db.insert("journal", {
    tenantId: pass.tenantId,
    beliefId: belief._id,
    passId: pass._id,
    entry: op.entry,
    createdAt: state.now,
  })
  await writeSightings(ctx, pass, belief._id, sightings, op.entry)
}
