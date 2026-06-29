import { type MiloConvexClient } from "../convex"
import { runtimeEvent } from "../events"
import {
  type RuntimeContext,
  type RuntimeEventTraceData,
  type RuntimeEventType,
  type RuntimeRunTraceData,
  type RuntimeTraceSource,
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
      data,
      runId: context.run.id,
      sequence,
      source: "trigger.run",
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
    data: RuntimeEventTraceData
    sequence: number
    source: RuntimeTraceSource
    type: RuntimeEventType
  }
) {
  await convex.recordEvent(
    runtimeEvent({
      attempt: input.attempt,
      callId: input.callId,
      data: input.data,
      runId: context.run.id,
      sequence: input.sequence,
      source: input.source,
      type: input.type,
    })
  )
}
