import { type Id } from "../convex/_generated/dataModel"
import {
  type JsonObject,
  type RuntimeEventInput,
  type RuntimeEventType,
} from "./types"

export function runtimeEvent(args: RuntimeEventInput) {
  return {
    ...args,
    eventKey: eventKey(args),
  }
}

export function eventKey(args: {
  attempt?: number
  runId: Id<"runs">
  sequence: number
  source: string
  toolCallId?: string
  type: RuntimeEventType
}) {
  const tool = args.toolCallId === undefined ? "" : `:${args.toolCallId}`
  const attempt = args.attempt === undefined ? "" : `:attempt-${args.attempt}`

  return (
    [args.runId, args.source, args.sequence.toString(), args.type].join(":") +
    tool +
    attempt
  )
}

export function errorDetails(error: unknown): JsonObject {
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
