import { type RuntimeId } from "../../../contracts/runtime/ids"
import {
  type WaiterCondition,
  type WaiterWake,
} from "../../../contracts/runtime/waiters"
import { type TraceRuntime } from "../platform/types"
import { recordRuntimeEvent } from "../trace/record"
import { hasResolvedHandoffs, type PendingHandoff } from "./pending"

export type Parked = { parked: { eventId: string } }

export type ParkOutcome = { reason: "resolved" } | Parked

/**
 * Open a waiter and hand its event back to the workflow. Nothing blocks
 * here: the step returns, the handler awaits the event, and the next step
 * resumes with the wake. The re-check closes the race where the wake landed
 * between the caller's last read and the waiter's creation.
 */
export async function park(
  runtime: TraceRuntime,
  args: {
    condition?: WaiterCondition
    deadline: number
    onParked?: () => Promise<void>
    resolved: () => Promise<boolean>
    token?: string
  }
): Promise<ParkOutcome> {
  const { eventId, waiterId } = await runtime.platform.park({
    expiresAt: args.deadline,
    ...(args.condition === undefined ? {} : { condition: args.condition }),
    ...(args.token === undefined ? {} : { token: args.token }),
  })

  await recordWaiting(runtime, waiterId)
  await args.onParked?.()

  if (await args.resolved()) {
    await runtime.platform.resolveWaiter({ waiterId })
    await recordResumed(runtime, { reason: "resolved", waiter: waiterId })

    return { reason: "resolved" }
  }

  return { parked: { eventId } }
}

export function isParked(value: unknown): value is Parked {
  return (
    typeof value === "object" &&
    value !== null &&
    "parked" in value &&
    typeof (value as Parked).parked.eventId === "string"
  )
}

/** Wait for the earliest of the run's open approvals and offers to settle. */
export async function parkHandoffs(
  runtime: TraceRuntime,
  pending: PendingHandoff[]
) {
  return await park(runtime, {
    deadline: earliestDeadline(pending),
    resolved: async () => await handoffsResolved(runtime),
  })
}

export async function recordResumed(runtime: TraceRuntime, wake: WaiterWake) {
  await recordRuntimeEvent(runtime.platform, runtime.context, {
    data: { waiter: wake.waiter },
    keyId: `${wake.waiter}:${wake.reason}`,
    sequence: 700_001,
    type: "run.resumed",
  })
}

async function recordWaiting(
  runtime: TraceRuntime,
  waiterId: RuntimeId<"waiters">
) {
  await recordRuntimeEvent(runtime.platform, runtime.context, {
    data: { waiter: waiterId },
    keyId: waiterId,
    sequence: 700_000,
    type: "run.waiting",
  })
}

async function handoffsResolved(runtime: TraceRuntime) {
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
