import { wait } from "@trigger.dev/sdk"
import {
  type RuntimeContext,
  type RuntimeId,
  type WaiterCondition,
  type WaiterWake,
} from "../contracts/runtime/worker"
import { type RuntimePlatform } from "./platform"
import { recordRuntimeEvent } from "./trace/runtime"

const parkGraceMs = 5000
const minTimeoutSeconds = 5

type WaitRuntime = {
  convex: RuntimePlatform
  context: RuntimeContext
}

export async function parkWaitpoint(
  runtime: WaitRuntime,
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

function timeoutSeconds(deadline: number) {
  const remainingMs = deadline + parkGraceMs - Date.now()

  return Math.max(minTimeoutSeconds, Math.ceil(remainingMs / 1000))
}

async function recordWaiting(
  runtime: WaitRuntime,
  waiterId: RuntimeId<"waiters">
) {
  await recordRuntimeEvent(runtime.convex, runtime.context, {
    data: { waiter: waiterId },
    keyId: waiterId,
    sequence: 700_000,
    type: "run.waiting",
  })
}

async function recordResumed(
  runtime: WaitRuntime,
  waiterId: RuntimeId<"waiters">,
  wake: WaiterWake
) {
  await recordRuntimeEvent(runtime.convex, runtime.context, {
    data: { waiter: waiterId },
    keyId: `${waiterId}:${wake.reason}`,
    sequence: 700_001,
    type: "run.resumed",
  })
}
