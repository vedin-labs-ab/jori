import { wait } from "@trigger.dev/sdk/v3"
import { type ToolRuntime } from "../tool"
import { type ConvexId, type WaiterWake } from "../types"
import { recordActivityEvent } from "./events"
import { type HandoffDeadline, hasResolvedHandoffs } from "./handoffs"

const parkGraceMs = 5000
const minTimeoutSeconds = 5

export async function parkRun(
  runtime: ToolRuntime,
  pending: HandoffDeadline[]
): Promise<WaiterWake> {
  const deadline = earliestDeadline(pending)
  const token = await wait.createToken({
    timeout: `${timeoutSeconds(deadline)}s`,
    tags: [runtime.context.run.id],
  })
  const waiterId = await runtime.convex.createWaiter({
    runId: runtime.context.run.id,
    ...(runtime.context.session === null
      ? {}
      : { sessionId: runtime.context.session.id }),
    waitpointId: token.id,
    expiresAt: deadline,
  })

  await recordWaiting(runtime, waiterId, pending)

  if (await raceResolved(runtime)) {
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

async function raceResolved(runtime: ToolRuntime) {
  const handoffs = await runtime.convex.loadRunHandoffs({
    runId: runtime.context.run.id,
  })

  return hasResolvedHandoffs(handoffs)
}

function earliestDeadline(pending: HandoffDeadline[]) {
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
  waiterId: ConvexId<"waiters">,
  pending: HandoffDeadline[]
) {
  await recordActivityEvent(runtime.convex, runtime.context, {
    callId: waiterId,
    data: {
      metrics: waitMetrics(pending),
      status: "waiting",
      subject: { kind: "waiter", id: waiterId },
      summary: waitSummary(pending),
      title: "Waiting for input",
    },
    sequence: 700_000,
    source: "trigger.run",
    type: "run.waiting",
  })
}

async function recordResumed(
  runtime: ToolRuntime,
  waiterId: ConvexId<"waiters">,
  wake: WaiterWake
) {
  await recordActivityEvent(runtime.convex, runtime.context, {
    callId: waiterId,
    data: {
      status: wakeStatus(wake.reason),
      subject: { kind: "waiter", id: waiterId },
      summary: wakeSummary(wake.reason),
      title: "Run resumed",
    },
    sequence: 700_001,
    source: "trigger.run",
    type: "run.resumed",
  })
}

function waitMetrics(pending: HandoffDeadline[]) {
  return {
    approvals: pending.filter((handoff) => handoff.kind === "approval").length,
    offers: pending.filter((handoff) => handoff.kind === "offer").length,
  }
}

function waitSummary(pending: HandoffDeadline[]) {
  const metrics = waitMetrics(pending)
  const parts = [
    countLabel(metrics.approvals, "approval"),
    countLabel(metrics.offers, "integration"),
  ].filter((part): part is string => part !== undefined)

  return parts.length === 0
    ? "Paused until new input arrives."
    : parts.join(", ")
}

function wakeStatus(reason: WaiterWake["reason"]) {
  return reason === "expired" ? "expired" : "completed"
}

function wakeSummary(reason: WaiterWake["reason"]) {
  switch (reason) {
    case "cancelled":
      return "The wait was cancelled."
    case "expired":
      return "The wait expired."
    case "message":
      return "New requester input arrived."
    case "resolved":
      return "A pending handoff was resolved."
  }
}

function countLabel(count: number, label: string) {
  if (count === 0) {
    return undefined
  }

  return count === 1 ? `1 ${label}` : `${count} ${label}s`
}
