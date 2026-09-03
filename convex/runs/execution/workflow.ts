import { start } from "@convex-dev/workflow"
import { isTerminalRunStatus } from "../../../contracts/runtime/runs"
import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"

/**
 * Hand a queued run to its durable workflow. One run has one workflow for its
 * whole life: the id on the run is both the handle events are sent to and the
 * record that says the run was already started, so a second call is a no-op.
 */
export async function startRun(ctx: MutationCtx, runId: Id<"runs">) {
  const run = await ctx.db.get(runId)

  if (
    run === null ||
    run.workflowId !== undefined ||
    isTerminalRunStatus(run.status)
  ) {
    return null
  }

  const workflowId = await start(
    ctx,
    internal.runtime.loop.workflow.agent,
    { runId },
    {
      onComplete: internal.runtime.loop.workflow.complete,
      context: { runId },
    }
  )

  await ctx.db.patch(runId, { workflowId })

  return workflowId
}
