import { type ToolRuntime } from "../tool"
import { type WaiterWake } from "../types"
import { parkWaitpoint } from "../waiter"
import { hasResolvedHandoffs, type PendingHandoff } from "./handoffs/pending"

export async function parkRun(
  runtime: ToolRuntime,
  pending: PendingHandoff[]
): Promise<WaiterWake> {
  return await parkWaitpoint(runtime, {
    deadline: earliestDeadline(pending),
    resolved: async () => await handoffsResolved(runtime),
  })
}

async function handoffsResolved(runtime: ToolRuntime) {
  const handoffs = await runtime.convex.loadRunHandoffs({
    runId: runtime.context.run.id,
  })

  return hasResolvedHandoffs(handoffs)
}

function earliestDeadline(pending: PendingHandoff[]) {
  return pending.reduce(
    (earliest, handoff) => Math.min(earliest, handoff.expiresAt),
    Number.POSITIVE_INFINITY
  )
}
