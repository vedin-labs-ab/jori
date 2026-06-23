import { type MiloConvexClient } from "../convex"
import { runtimeEvent } from "../events"
import {
  type RuntimeContext,
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
      data,
      runId: context.run.id,
      sequence,
      source: "trigger.run",
      type,
    })
  )
}
