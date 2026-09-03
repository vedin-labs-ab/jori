import {
  type RuntimeErrorTraceData,
  type RuntimeEventInput,
  type RuntimeEventRecord,
  type RuntimeEventType,
} from "../../../contracts/runtime/events"
import { type RuntimeId } from "../../../contracts/runtime/ids"

export function runtimeEvent(args: RuntimeEventInput): RuntimeEventRecord {
  const { keyId, ...event } = args

  return {
    ...event,
    key: traceKey(args),
  }
}

// One key per event a run can record, so a replayed step writes the row it
// already wrote instead of a second one.
function traceKey(args: {
  callId?: string
  keyId?: string
  runId: RuntimeId<"runs">
  sequence: number
  type: RuntimeEventType
}) {
  const keyId = args.keyId ?? args.callId
  const key = keyId === undefined ? "" : `:${keyId}`

  return [args.runId, args.sequence.toString(), args.type].join(":") + key
}

export function errorDetails(error: unknown): RuntimeErrorTraceData {
  return {
    error: formatError(error),
  }
}

export function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  return "Unknown runtime error"
}
