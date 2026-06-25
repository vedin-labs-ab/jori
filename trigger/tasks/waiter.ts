import { wait } from "@trigger.dev/sdk/v3"
import { type ToolRuntime } from "../tool"
import { type WaiterWake } from "../types"
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

  if (await raceResolved(runtime)) {
    await runtime.convex.expireWaiter({ waiterId })
    return { reason: "resolved" }
  }

  const result = await wait.forToken<WaiterWake>(token)

  if (!result.ok) {
    await runtime.convex.expireWaiter({ waiterId })
    return { reason: "expired" }
  }

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
