import { type MiloConvexClient } from "./convex"
import { runtimeEvent } from "./events"
import { toolInputMetadataTrace, toolResultMetadataTrace } from "./metadata"
import { type ModelToolCall } from "./model/types"
import {
  type RuntimeContext,
  type RuntimeTool,
  type RuntimeToolInputSummary,
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
        ...toolInputTrace(tool.name, args.call.args, type),
        ...toolInputMetadataTrace(tool.name, args.call.args),
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

export function toolInputTrace(
  tool: string,
  input: unknown,
  type: "tool.completed" | "tool.failed" | "tool.started"
): Pick<RuntimeToolTraceData, "input"> {
  if (type !== "tool.started" || !isRecord(input)) {
    return {}
  }

  const summary = toolInputSummary(tool, input)

  return summary === undefined ? {} : { input: summary }
}

function toolInputSummary(
  tool: string,
  input: Record<string, unknown>
): RuntimeToolInputSummary | undefined {
  switch (tool) {
    case "bash":
      return bashInputSummary(input)
    case "git":
      return gitInputSummary(input)
    case "glob":
      return globInputSummary(input)
    case "grep":
      return grepInputSummary(input)
    case "github_clone_repository":
      return githubCloneInputSummary(input)
    case "read":
      return readInputSummary(input)
    default:
      return undefined
  }
}

export function toolTraceDetails(
  tool: string,
  input: unknown,
  result: unknown
): RuntimeToolTraceDetails {
  return {
    ...providerTrace(result),
    ...toolResultMetadataTrace(tool, input, result),
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

function bashInputSummary(
  input: Record<string, unknown>
): RuntimeToolInputSummary {
  return compactSummary({
    command: readString(input.command, 500),
    cwd: readString(input.cwd, 200),
    timeoutMs: readNumber(input.timeoutMs),
  })
}

function gitInputSummary(
  input: Record<string, unknown>
): RuntimeToolInputSummary {
  return compactSummary({
    args: readStringArray(input.args, 40, 200),
    cwd: readString(input.cwd, 200),
    timeoutMs: readNumber(input.timeoutMs),
  })
}

function grepInputSummary(
  input: Record<string, unknown>
): RuntimeToolInputSummary {
  return compactSummary({
    include: readString(input.include, 200),
    limit: readNumber(input.limit),
    path: readString(input.path, 200),
    pattern: readString(input.pattern, 500),
  })
}

function globInputSummary(
  input: Record<string, unknown>
): RuntimeToolInputSummary {
  return compactSummary({
    limit: readNumber(input.limit),
    path: readString(input.path, 200),
    pattern: readString(input.pattern, 500),
  })
}

function githubCloneInputSummary(
  input: Record<string, unknown>
): RuntimeToolInputSummary {
  return compactSummary({
    directory: readString(input.directory, 200),
    owner: readString(input.owner, 200),
    ref: readString(input.ref, 200),
    repo: readString(input.repo, 200),
  })
}

function readInputSummary(
  input: Record<string, unknown>
): RuntimeToolInputSummary {
  return compactSummary({
    limit: readNumber(input.limit),
    offset: readNumber(input.offset),
    path: readString(input.path, 200),
  })
}

function compactSummary(input: RuntimeToolInputSummary) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as RuntimeToolInputSummary
}

function readString(value: unknown, limit: number) {
  return typeof value === "string" ? value.slice(0, limit) : undefined
}

function readStringArray(value: unknown, limit: number, itemLimit: number) {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .slice(0, limit)
    .map((item) => item.slice(0, itemLimit))
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
