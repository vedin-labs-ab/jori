import { type RuntimeEventRecord } from "../platform/types"

export type RuntimeEventInput = Omit<RuntimeEventRecord, "key"> & {
  keyId?: string
}

export function runtimeEvent(args: RuntimeEventInput): RuntimeEventRecord {
  const { keyId, ...event } = args

  return {
    ...event,
    key: traceKey(args),
  }
}

// One key per event a run can record, so a replayed step writes the row it
// already wrote instead of a second one.
function traceKey(args: RuntimeEventInput) {
  const keyId = args.keyId ?? args.callId
  const key = keyId === undefined ? "" : `:${keyId}`

  return [args.runId, args.sequence.toString(), args.type].join(":") + key
}

export function errorDetails(error: unknown) {
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
