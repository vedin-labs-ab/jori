import { type MiloConvexClient } from "./convex"
import { runtimeEvent } from "./events"
import { type ModelToolCall } from "./model/types"
import {
  type RuntimeContext,
  type RuntimeTool,
  type RuntimeToolTraceData,
  type RuntimeValueSummary,
} from "./types"

type RuntimeToolTraceDetails = Omit<
  RuntimeToolTraceData,
  "access" | "name" | "route"
>

export function providerTrace(
  result: unknown
): Pick<RuntimeToolTraceData, "providerTrace"> {
  if (
    typeof result !== "object" ||
    result === null ||
    !("provider" in result)
  ) {
    return {}
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
    return {}
  }

  return {
    providerTrace: {
      provider: provider.name,
      requestId: provider.requestId,
    },
  }
}

export async function recordToolEvent(
  args: {
    attempt: number
    call: ModelToolCall
    convex: MiloConvexClient
    context: RuntimeContext
    sequence: number
  },
  tool: RuntimeTool,
  type: "tool.completed" | "tool.failed" | "tool.started",
  data?: RuntimeToolTraceDetails
) {
  await args.convex.recordEvent(
    runtimeEvent({
      attempt: args.attempt,
      data: {
        access: tool.access,
        name: tool.name,
        route: tool.route,
        ...data,
      },
      runId: args.context.run.id,
      sequence: args.sequence,
      source: "trigger.tool",
      callId: args.call.id,
      type,
    })
  )
}

export function toolTraceDetails(result: unknown): RuntimeToolTraceDetails {
  return {
    ...providerTrace(result),
    result: summarizeResult(result),
  }
}

function summarizeResult(result: unknown): RuntimeValueSummary {
  if (result === null || result === undefined) {
    return { type: "null" }
  }

  if (Array.isArray(result)) {
    return { type: "array", size: result.length }
  }

  switch (typeof result) {
    case "boolean":
      return { type: "boolean" }
    case "number":
      return { preview: String(result), type: "number" }
    case "object":
      return { type: "object", size: Object.keys(result).length }
    case "string":
      return {
        preview: result.slice(0, 500),
        size: result.length,
        type: "string",
      }
    default:
      return { type: "null" }
  }
}
