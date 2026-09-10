import { isTerminalRunStatus } from "../../contracts/runtime/runs"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { type Actor } from "../shared/actor"
import { recordUsageEnded } from "../usage/record"
import { clearRunDraft } from "./execution/drafts/data"
import { recordTrace } from "./execution/traces/write"
import { wakeParentForTerminalRun, wakeRun } from "./execution/waiters/data"

// Delegation implies lifetime containment: a child run never outlives its
// parent. One stop implementation serves the console stop, the terminal
// cascade, and the stop_agent tool.

/** Stop a run and every descendant that is still live. */
export async function stopRunTree(
  ctx: MutationCtx,
  run: Doc<"runs">,
  stoppedBy?: Actor
) {
  await stopRun(ctx, run, stoppedBy)

  await stopRunChildren(ctx, run._id, stoppedBy)
}

/** Stop every live descendant of a run, leaving the run itself untouched. */
export async function stopRunChildren(
  ctx: MutationCtx,
  parentId: Id<"runs">,
  stoppedBy?: Actor
) {
  const children = await ctx.db
    .query("runs")
    .withIndex("by_parent", (index) => index.eq("parentId", parentId))
    .collect()

  for (const child of children) {
    await stopRunTree(ctx, child, stoppedBy)
  }
}

/** Stops this run only; callers scanning a whole conversation own traversal. */
export async function stopRun(
  ctx: MutationCtx,
  run: Doc<"runs">,
  stoppedBy?: Actor
) {
  if (isTerminalRunStatus(run.status)) {
    return
  }

  const now = Date.now()

  await recordTrace(ctx, {
    run,
    key: `run:${run._id}:stopped`,
    timestamp: now,
    type: "run.stopped",
  })
  await ctx.db.patch(run._id, {
    status: "stopped",
    ...(stoppedBy === undefined ? {} : { stoppedBy }),
    endedAt: now,
  })
  // Only live runs reach here, so the count rides the one patch that ends
  // this run. A stop is an ending, not a failure.
  await recordUsageEnded(ctx, { run, failed: false })
  await clearRunDraft(ctx, run._id)
  await wakeRun(ctx, { runId: run._id, reason: "cancelled" })
  await wakeParentForTerminalRun(ctx, run._id)
}
