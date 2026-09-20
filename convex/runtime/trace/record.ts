import {
  type RuntimeTraceType,
  type TraceData,
} from "../../runs/execution/traces/schema"
import { type TraceRuntime } from "../platform/types"
import { type RuntimeEventInput, runtimeEvent } from "./events"

type RuntimeEventBase = Omit<RuntimeEventInput, "data" | "runId" | "type">
type RuntimeEventArgs =
  | (RuntimeEventBase & {
      type: "run.completed"
    })
  | (RuntimeEventBase & {
      data?: { error: string }
      type: "run.failed"
    })
  | (RuntimeEventBase & {
      data?: TraceData
      type: Exclude<RuntimeTraceType, "run.completed" | "run.failed">
    })

export async function recordRuntimeEvent(
  runtime: TraceRuntime,
  input: RuntimeEventArgs
) {
  await runtime.platform.recordEvent(
    runtimeEvent({
      ...input,
      runId: runtime.context.run.id,
    })
  )
}
