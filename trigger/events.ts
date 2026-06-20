import {
  type ConvexId,
  type RuntimeErrorTraceData,
  type RuntimeEventInput,
  type RuntimeEventType,
  type RuntimeTraceSource,
} from "./types"

export function runtimeEvent(args: RuntimeEventInput) {
  return {
    ...args,
    key: traceKey(args),
  }
}

export function traceKey(args: {
  attempt?: number
  callId?: string
  runId: ConvexId<"runs">
  sequence: number
  source: RuntimeTraceSource
  type: RuntimeEventType
}) {
  const call = args.callId === undefined ? "" : `:${args.callId}`
  const attempt = args.attempt === undefined ? "" : `:attempt-${args.attempt}`

  return (
    [args.runId, args.source, args.sequence.toString(), args.type].join(":") +
    call +
    attempt
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
