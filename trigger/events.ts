import {
  type ConvexId,
  type RuntimeErrorTraceData,
  type RuntimeEventInput,
  type RuntimeEventType,
} from "./types"

export function runtimeEvent(args: RuntimeEventInput) {
  const { keyId, ...event } = args

  return {
    ...event,
    key: traceKey(args),
  }
}

function traceKey(args: {
  attempt?: number
  callId?: string
  keyId?: string
  runId: ConvexId<"runs">
  sequence: number
  type: RuntimeEventType
}) {
  const keyId = args.keyId ?? args.callId
  const key = keyId === undefined ? "" : `:${keyId}`
  const attempt = args.attempt === undefined ? "" : `:attempt-${args.attempt}`

  return (
    [args.runId, args.sequence.toString(), args.type].join(":") + key + attempt
  )
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
