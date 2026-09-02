import { wait } from "@trigger.dev/sdk"
import {
  type RuntimeId,
  type WaiterCondition,
  type WaiterWake,
} from "../contracts/runtime/worker"
import { type TraceRuntime } from "./runtime"
import { recordRuntimeEvent } from "./trace/runtime"

const parkGraceMs = 5000
const minTimeoutSeconds = 5

export async function parkWaitpoint(
  runtime: TraceRuntime,
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
  const waiterId = await runtime.platform.createWaiter({
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
    await runtime.platform.expireWaiter({ waiterId })
    await recordResumed(runtime, waiterId, { reason: "resolved" })
    return { reason: "resolved" }
  }

  const result = await wait.forToken<WaiterWake>(token)

  if (!result.ok) {
    await runtime.platform.expireWaiter({ waiterId })
    await recordResumed(runtime, waiterId, { reason: "expired" })
    return { reason: "expired" }
  }

  await recordResumed(runtime, waiterId, result.output)

  return result.output
}

function timeoutSeconds(deadline: number) {
  const remainingMs = deadline + parkGraceMs - Date.now()

  return Math.max(minTimeoutSeconds, Math.ceil(remainingMs / 1000))
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

async function recordResumed(
  runtime: TraceRuntime,
  waiterId: RuntimeId<"waiters">,
  wake: WaiterWake
) {
  await recordRuntimeEvent(runtime.platform, runtime.context, {
    data: { waiter: waiterId },
    keyId: `${waiterId}:${wake.reason}`,
    sequence: 700_001,
    type: "run.resumed",
  })
}
