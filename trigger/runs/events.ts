import { type MiloConvexClient } from "../convex"
import { runtimeEvent } from "../events"
import {
  type RuntimeContext,
  type RuntimeEventTraceData,
  type RuntimeEventType,
  type RuntimeRunTraceData,
} from "../types"

export async function recordRunEvent(
  convex: MiloConvexClient,
  context: RuntimeContext,
  type: RuntimeEventType,
  sequence: number,
  attempt: number,
  data?: RuntimeRunTraceData
) {
  await convex.recordEvent(
    runtimeEvent({
      attempt,
      ...(data === undefined ? {} : { data }),
      runId: context.run.id,
      sequence,
      type,
    })
  )
}

export async function recordActivityEvent(
  convex: MiloConvexClient,
  context: RuntimeContext,
  input: {
    attempt?: number
    callId?: string
    data?: RuntimeEventTraceData
    keyId?: string
    sequence: number
    type: RuntimeEventType
  }
) {
  await convex.recordEvent(
    runtimeEvent({
      attempt: input.attempt,
      callId: input.callId,
      ...(input.data === undefined ? {} : { data: input.data }),
      keyId: input.keyId,
      runId: context.run.id,
      sequence: input.sequence,
      type: input.type,
    })
  )
}
