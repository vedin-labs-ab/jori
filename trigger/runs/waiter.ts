import { wait } from "@trigger.dev/sdk"
import { type ToolRuntime } from "../tool/runtime"
import { type ConvexId, type WaiterCondition, type WaiterWake } from "../types"
import { recordRuntimeEvent } from "./events"
import { hasResolvedHandoffs, type PendingHandoff } from "./handoff"

const parkGraceMs = 5000
const minTimeoutSeconds = 5

export async function parkRun(
  runtime: ToolRuntime,
  pending: PendingHandoff[]
): Promise<WaiterWake> {
  return await parkWaitpoint(runtime, {
    deadline: earliestDeadline(pending),
    resolved: async () => await handoffsResolved(runtime),
  })
}

export async function parkWaitpoint(
  runtime: ToolRuntime,
  args: {
    condition?: WaiterCondition
    deadline: number
    onParked?: () => Promise<void>
    resolved: () => Promise<boolean>
  }
): Promise<WaiterWake> {
  const token = await wait.createToken({
    timeout: `${timeoutSeconds(args.deadline)}s`,
    tags: [runtime.context.run.id],
  })
  const waiterId = await runtime.convex.createWaiter({
    runId: runtime.context.run.id,
    ...(runtime.context.session === null
      ? {}
      : { sessionId: runtime.context.session.id }),
    waitpointId: token.id,
    expiresAt: args.deadline,
    ...(args.condition === undefined ? {} : { condition: args.condition }),
  })

  await recordWaiting(runtime, waiterId)
  await args.onParked?.()

  if (await args.resolved()) {
    await runtime.convex.expireWaiter({ waiterId })
    await recordResumed(runtime, waiterId, { reason: "resolved" })
    return { reason: "resolved" }
  }

  const result = await wait.forToken<WaiterWake>(token)

  if (!result.ok) {
    await runtime.convex.expireWaiter({ waiterId })
    await recordResumed(runtime, waiterId, { reason: "expired" })
    return { reason: "expired" }
  }

  await recordResumed(runtime, waiterId, result.output)

  return result.output
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

function timeoutSeconds(deadline: number) {
  const remainingMs = deadline + parkGraceMs - Date.now()

  return Math.max(minTimeoutSeconds, Math.ceil(remainingMs / 1000))
}

async function recordWaiting(
  runtime: ToolRuntime,
  waiterId: ConvexId<"waiters">
) {
  await recordRuntimeEvent(runtime.convex, runtime.context, {
    data: { waiter: waiterId },
    keyId: waiterId,
    sequence: 700_000,
    type: "run.waiting",
  })
}

async function recordResumed(
  runtime: ToolRuntime,
  waiterId: ConvexId<"waiters">,
  wake: WaiterWake
) {
  await recordRuntimeEvent(runtime.convex, runtime.context, {
    data: { waiter: waiterId },
    keyId: `${waiterId}:${wake.reason}`,
    sequence: 700_001,
    type: "run.resumed",
  })
}
