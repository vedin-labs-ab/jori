import {
  type RuntimeContext,
  type RuntimeErrorTraceData,
  type RuntimeEventInput,
  type RuntimeEventTraceData,
  type RuntimeEventType,
  type RuntimeResultTraceData,
} from "../../contracts/runtime/worker"
import { type RuntimePlatform } from "../platform"
import { runtimeEvent } from "./events"

type RuntimeEventBase = Omit<RuntimeEventInput, "data" | "runId" | "type">
type RuntimeEventArgs =
  | (RuntimeEventBase & {
      data?: RuntimeResultTraceData
      type: "run.completed"
    })
  | (RuntimeEventBase & {
      data?: RuntimeErrorTraceData
      type: "run.failed"
    })
  | (RuntimeEventBase & {
      data?: RuntimeEventTraceData
      type: Exclude<RuntimeEventType, "run.completed" | "run.failed">
    })

export async function recordRuntimeEvent(
  convex: RuntimePlatform,
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
