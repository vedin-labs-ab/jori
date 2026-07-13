import { type MiloConvexClient } from "../convex"
import { runtimeEvent } from "../events"
import {
  type RuntimeContext,
  type RuntimeErrorTraceData,
  type RuntimeEventInput,
  type RuntimeEventTraceData,
  type RuntimeEventType,
} from "../types"

type RuntimeEventBase = Omit<RuntimeEventInput, "data" | "runId" | "type">
type RuntimeEventArgs =
  | (RuntimeEventBase & {
      data?: RuntimeErrorTraceData
      type: "run.completed" | "run.failed"
    })
  | (RuntimeEventBase & {
      data?: RuntimeEventTraceData
      type: Exclude<RuntimeEventType, "run.completed" | "run.failed">
    })

export async function recordRuntimeEvent(
  convex: MiloConvexClient,
  context: RuntimeContext,
  input: RuntimeEventArgs
) {
  await convex.recordEvent(
    runtimeEvent({
      ...input,
      runId: context.run.id,
    })
  )
}
