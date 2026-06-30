import { type MiloConvexClient } from "./convex"
import { runtimeEvent } from "./events"
import { type ModelToolCall } from "./model/types"
import {
  type JsonValue,
  type RuntimeContext,
  type RuntimeTool,
  type RuntimeToolProviderTrace,
  type RuntimeToolTraceTool,
  type RuntimeValueSummary,
} from "./types"

const maxToolInputBytes = 32 * 1024
const textEncoder = new TextEncoder()

type ToolEventType = "tool.completed" | "tool.failed" | "tool.started"
type RuntimeToolCompletedDetails = {
  provider: RuntimeToolProviderTrace
  result: RuntimeValueSummary
}
type RuntimeToolFailedDetails = {
  error: string
}

export function providerTrace(result: unknown): RuntimeToolProviderTrace {
  if (
    typeof result !== "object" ||
    result === null ||
    !("provider" in result)
  ) {
    return null
  }

  const provider = result.provider

  if (
    typeof provider !== "object" ||
    provider === null ||
    !("name" in provider) ||
    !("requestId" in provider) ||
    typeof provider.name !== "string" ||
    typeof provider.requestId !== "string"
  ) {
    return null
  }

  return {
    name: provider.name,
    request: provider.requestId,
  }
}

export async function recordToolEvent(
  args: ToolEventArgs,
  tool: RuntimeTool,
  type: "tool.completed",
  details: RuntimeToolCompletedDetails
): Promise<void>
export async function recordToolEvent(
  args: ToolEventArgs,
  tool: RuntimeTool,
  type: "tool.failed",
  details: RuntimeToolFailedDetails
): Promise<void>
export async function recordToolEvent(
  args: ToolEventArgs,
  tool: RuntimeTool,
  type: "tool.started"
): Promise<void>
export async function recordToolEvent(
  args: ToolEventArgs,
  tool: RuntimeTool,
  type: ToolEventType,
  details?: RuntimeToolCompletedDetails | RuntimeToolFailedDetails
) {
  await args.convex.recordEvent(
    runtimeEvent({
      attempt: args.attempt,
      callId: args.call.id,
      data: toolTraceData(tool, type, args.call.args, details),
      runId: args.context.run.id,
      sequence: args.sequence,
      type,
    })
  )
}

export function traceToolInput(input: JsonValue): JsonValue | null {
  const encoded = JSON.stringify(input)

  if (encoded === undefined) {
    return null
  }

  return textEncoder.encode(encoded).byteLength > maxToolInputBytes
    ? null
    : input
}

export function toolTraceDetails(result: unknown): RuntimeToolCompletedDetails {
  return {
    provider: providerTrace(result),
    result: summarizeResult(result),
  }
}

function toolTraceData(
  runtimeTool: RuntimeTool,
  type: ToolEventType,
  input: JsonValue,
  details: RuntimeToolCompletedDetails | RuntimeToolFailedDetails | undefined
) {
  const tool = traceTool(runtimeTool)

  if (type === "tool.completed") {
    return { tool, ...completedDetails(details) }
  }

  const traceInput = traceToolInput(input)

  if (type === "tool.failed") {
    return { tool, input: traceInput, error: failedDetails(details).error }
  }

  return { tool, input: traceInput }
}

function completedDetails(
  details: RuntimeToolCompletedDetails | RuntimeToolFailedDetails | undefined
): RuntimeToolCompletedDetails {
  if (details === undefined || !("result" in details)) {
    throw new Error("Completed tool trace is missing result details.")
  }

  return details
}

function failedDetails(
  details: RuntimeToolCompletedDetails | RuntimeToolFailedDetails | undefined
): RuntimeToolFailedDetails {
  if (details === undefined || !("error" in details)) {
    throw new Error("Failed tool trace is missing error details.")
  }

  return details
}

function traceTool(tool: RuntimeTool): RuntimeToolTraceTool {
  return {
    access: tool.access,
    name: tool.name,
    route: tool.route,
  }
}

function summarizeResult(result: unknown): RuntimeValueSummary {
  if (result === null || result === undefined) {
    return { kind: "null" }
  }

  if (Array.isArray(result)) {
    return { kind: "array", size: result.length }
  }

  switch (typeof result) {
    case "boolean":
      return { kind: "boolean" }
    case "number":
      return { kind: "number", preview: String(result) }
    case "object":
      return { kind: "object", size: Object.keys(result).length }
    case "string":
      return {
        kind: "string",
        length: result.length,
        preview: result.slice(0, 500),
      }
    default:
      return { kind: "null" }
  }
}

type ToolEventArgs = {
  attempt: number
  call: ModelToolCall
  convex: MiloConvexClient
  context: RuntimeContext
  sequence: number
}
