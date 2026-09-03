import { type WaiterWake } from "../../contracts/runtime/worker"
import { type AgentRuntime } from "../runtime"
import { parkWaitpoint } from "../waiter"
import { hasResolvedHandoffs, type PendingHandoff } from "./handoffs/pending"

export async function parkRun(
  runtime: AgentRuntime,
  pending: PendingHandoff[]
): Promise<WaiterWake> {
  return await parkWaitpoint(runtime, {
    deadline: earliestDeadline(pending),
    resolved: async () => await handoffsResolved(runtime),
  })
}

async function handoffsResolved(runtime: AgentRuntime) {
  const handoffs = await runtime.platform.loadRunHandoffs({
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
