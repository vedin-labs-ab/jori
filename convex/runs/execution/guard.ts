import { type Doc, type Id } from "../../_generated/dataModel"
import { canExecuteJobRunTools } from "../../jobs/execution"
import { runExecutionIsCurrent } from "../../sessions/scope"
import { type QueryLikeCtx } from "../../shared/context"
import { runResourceGate } from "../sight"

/** Recheck at publication, after any earlier broker check or awaited work. */
export async function isRunExecutable(ctx: QueryLikeCtx, run: Doc<"runs">) {
  return (
    (await canExecuteJobRunTools(ctx, run)) &&
    (await runExecutionIsCurrent(ctx, run)) &&
    (await runResourceGate(ctx, run)) !== null
  )
}

export async function requireExecutingRun(
  ctx: QueryLikeCtx,
  args: { organizationId: string; runId: Id<"runs"> }
) {
  const run = await ctx.db.get(args.runId)
  if (
    run === null ||
    run.organizationId !== args.organizationId ||
    !(await isRunExecutable(ctx, run))
  ) {
    throw new Error("Run is no longer active.")
  }
  return run
}
