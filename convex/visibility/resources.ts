import { type ObjectType, v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { resolveCreationFolder } from "../folders/tree"
import { createRunSight, runResourceGate } from "../runs/sight"
import { runExecutionIsCurrent } from "../sessions/execution"
import { type QueryLikeCtx } from "../shared/context"
import { normalizeStoredVisibility, type StoredVisibility } from "./schema"
import { createSight, type Sight } from "./sight"

/** Internal resource calls receive a trusted run, or a resolved console person. */
export const resourceViewerArgs = {
  organizationId: v.string(),
  personId: v.optional(v.id("persons")),
  runId: v.optional(v.id("runs")),
}

export type ResourceViewer = ObjectType<typeof resourceViewerArgs>

export async function createResourceSight(
  ctx: QueryLikeCtx,
  args: ResourceViewer
): Promise<Sight> {
  const run = await resourceRun(ctx, args)
  return run === undefined ? createSight(ctx, args) : createRunSight(ctx, run)
}

/** New outputs inherit where their work belongs and who may see it. */
export async function resourceCreation(
  ctx: QueryLikeCtx,
  args: ResourceViewer & {
    visibility?: StoredVisibility
    folderId?: Id<"folders">
  }
) {
  const run = await resourceRun(ctx, args)
  const sight =
    run === undefined ? createSight(ctx, args) : await createRunSight(ctx, run)
  const origin = run === undefined ? undefined : await runResourceGate(ctx, run)
  const visibility = normalizeStoredVisibility(
    args.visibility ?? origin?.visibility ?? { mode: "organization" }
  )
  if (visibility.mode === "private" && sight.personId === undefined) {
    throw new Error("Private resources require a personal execution context.")
  }
  const folderId = args.folderId ?? origin?.folderId ?? run?.folderId
  return {
    ownerId: origin?.ownerId ?? sight.personId,
    visibility,
    folderId: await resolveCreationFolder(
      ctx,
      {
        organizationId: args.organizationId,
        personId: sight.personId,
        folderId,
      },
      sight
    ),
  }
}

async function resourceRun(ctx: QueryLikeCtx, args: ResourceViewer) {
  if (args.runId === undefined) {
    return undefined
  }
  const run = await ctx.db.get(args.runId)
  if (
    run === null ||
    run.organizationId !== args.organizationId ||
    (run.status !== "running" && run.status !== "queued") ||
    !(await runExecutionIsCurrent(ctx, run))
  ) {
    throw new Error("Run is no longer active.")
  }
  return run
}
