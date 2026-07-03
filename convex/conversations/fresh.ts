import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { isTerminalRunStatus } from "../runs/schema"

const waiterWakeGraceMs = 5 * 60 * 1000
const runActivityGraceMs = 2 * 60 * 60 * 1000

export async function isFreshRunWithoutWaiter(
  ctx: MutationCtx,
  runId: Id<"runs">,
  now: number
) {
  const run = await ctx.db.get(runId)

  if (run === null || isTerminalRunStatus(run.status)) {
    return false
  }

  const latestActivity = await latestRunActivity(ctx, run)
  const latestInactiveWaiter = await latestInactiveWaiterUpdate(ctx, runId)

  if (isUnresumedWaiterWake(latestActivity, latestInactiveWaiter, now)) {
    return false
  }

  return now - latestActivity <= runActivityGraceMs
}

async function latestRunActivity(ctx: MutationCtx, run: Doc<"runs">) {
  const trace = await ctx.db
    .query("traces")
    .withIndex("by_run_and_timestamp", (query) => query.eq("runId", run._id))
    .order("desc")
    .first()

  return Math.max(run.createdAt, trace?.timestamp ?? 0)
}

async function latestInactiveWaiterUpdate(ctx: MutationCtx, runId: Id<"runs">) {
  const updates = await Promise.all(
    (["cancelled", "expired", "woken"] as const).map(async (status) => {
      const waiter = await ctx.db
        .query("waiters")
        .withIndex("by_run_and_status", (query) =>
          query.eq("runId", runId).eq("status", status)
        )
        .order("desc")
        .first()

      return waiter?.updatedAt
    })
  )

  const values = updates.filter(
    (updatedAt): updatedAt is number => updatedAt !== undefined
  )

  return values.length === 0 ? 0 : Math.max(...values)
}

function isUnresumedWaiterWake(
  latestActivity: number,
  latestInactiveWaiter: number,
  now: number
) {
  return (
    latestInactiveWaiter > 0 &&
    latestActivity <= latestInactiveWaiter &&
    now - latestInactiveWaiter > waiterWakeGraceMs
  )
}
