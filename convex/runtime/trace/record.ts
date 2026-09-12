import { type RuntimeContext } from "../../../contracts/runtime/context"
import {
  type RuntimeErrorTraceData,
  type RuntimeEventInput,
  type RuntimeEventTraceData,
  type RuntimeEventType,
} from "../../../contracts/runtime/events"
import { type RuntimePlatform } from "../platform/types"
import { runtimeEvent } from "./events"

type RuntimeEventBase = Omit<RuntimeEventInput, "data" | "runId" | "type">
type RuntimeEventArgs =
  | (RuntimeEventBase & {
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
  platform: RuntimePlatform,
  context: RuntimeContext,
  input: RuntimeEventArgs
) {
  await platform.recordEvent(
    runtimeEvent({
      ...input,
      runId: context.run.id,
    })
  )
}
