import { isRecord } from "../../../contracts/json"
import {
  type RuntimeModelUsage,
  type RuntimeValueSummary,
} from "../../../contracts/runtime"
import { type Doc } from "../../_generated/dataModel"
import { optionalNumber, optionalString } from "../../shared/input"
import { type ToolLabel } from "./types"

export type ToolResult = RuntimeValueSummary
export type ModelUsage = RuntimeModelUsage

const modelReasoningCharacterLimit = 1500

export function readPreparedTools(data: unknown) {
  const record = asRecord(data)
  const tools = asRecord(record?.tools)

  if (!Array.isArray(tools?.groups)) {
    return []
  }

  return tools.groups
    .flatMap((group) => {
      const toolGroup = asRecord(group)

      return Array.isArray(toolGroup?.tools) ? toolGroup.tools : []
    })
    .flatMap(readPreparedTool)
}

export function readTraceError(data: unknown) {
  return optionalString(asRecord(data)?.error)
}

export function readTraceData(trace: Doc<"traces">) {
  return "data" in trace ? trace.data : undefined
}

export function traceAttempt(trace: Doc<"traces">) {
  return "attempt" in trace ? trace.attempt : 0
}

export function traceSequence(trace: Doc<"traces">) {
  return "sequence" in trace ? trace.sequence : undefined
}

export function readModelUsage(data: unknown): ModelUsage | undefined {
  const usage = asRecord(asRecord(data)?.usage)

  if (usage === undefined) {
    return undefined
  }

  return {
    durationMs: optionalNumber(usage.durationMs) ?? 0,
    inputTokens: optionalNumber(usage.inputTokens) ?? 0,
    inputCacheReadTokens: optionalNumber(usage.inputCacheReadTokens) ?? 0,
    inputCacheWriteTokens: optionalNumber(usage.inputCacheWriteTokens) ?? 0,
    inputUncachedTokens: optionalNumber(usage.inputUncachedTokens) ?? 0,
    outputTokens: optionalNumber(usage.outputTokens) ?? 0,
    reasoningTokens: optionalNumber(usage.reasoningTokens) ?? 0,
    totalTokens: optionalNumber(usage.totalTokens) ?? 0,
    toolCalls: optionalNumber(usage.toolCalls) ?? 0,
  }
}

export function readModelReasoning(data: unknown) {
  const reasoning = optionalString(asRecord(data)?.reasoning)

  return reasoning === undefined
    ? undefined
    : reasoning.slice(0, modelReasoningCharacterLimit)
}

export function readToolAccess(data: unknown): ToolLabel["access"] | undefined {
  return readTool(data)?.access
}

export function readToolError(data: unknown) {
  return readTraceError(data)
}

export function readToolInput(data: unknown) {
  return asRecord(asRecord(data)?.input)
}

export function readToolName(data: unknown) {
  return readTool(data)?.name
}

export function readToolResult(data: unknown): ToolResult | undefined {
  const result = asRecord(asRecord(data)?.result)
  const kind = optionalString(result?.kind)

  if (kind === undefined) {
    return undefined
  }

  return readResultByKind(kind, result)
}

function readTool(
  data: unknown
):
  | { access: NonNullable<ToolLabel["access"]>; name: string; route: string }
  | undefined {
  const tool = asRecord(asRecord(data)?.tool)
  const name = optionalString(tool?.name)
  const route = optionalString(tool?.route)
  const access =
    tool?.access === "read" || tool?.access === "write"
      ? tool.access
      : undefined

  if (name === undefined || route === undefined || access === undefined) {
    return undefined
  }

  return { access, name, route }
}

function readResultByKind(
  kind: string,
  result: Record<string, unknown> | undefined
): ToolResult | undefined {
  switch (kind) {
    case "array":
      return resultSize(kind, result)
    case "object":
      return objectResult(result)
    case "boolean":
    case "null":
      return { kind }
    case "number":
      return resultPreview(kind, result)
    case "string":
      return resultString(result)
    default:
      return undefined
  }
}

function resultSize(
  kind: "array",
  result: Record<string, unknown> | undefined
) {
  const size = optionalNumber(result?.size)

  return size === undefined ? undefined : { kind, size }
}

function objectResult(result: Record<string, unknown> | undefined) {
  const size = optionalNumber(result?.size)

  if (size === undefined) {
    return undefined
  }

  return {
    kind: "object" as const,
    size,
    ...optionalNumberField("itemCount", result?.itemCount),
    ...optionalStringField("itemKey", result?.itemKey),
    ...optionalBoolean("hasMore", result?.hasMore),
  }
}

function resultPreview(
  kind: "number",
  result: Record<string, unknown> | undefined
) {
  const preview = optionalString(result?.preview)

  return preview === undefined ? undefined : { kind, preview }
}

function resultString(result: Record<string, unknown> | undefined) {
  const preview = optionalString(result?.preview)
  const length = optionalNumber(result?.length)

  return preview === undefined || length === undefined
    ? undefined
    : { kind: "string" as const, preview, length }
}

function readPreparedTool(value: unknown): ToolLabel[] {
  if (!isRecord(value)) {
    return []
  }

  const tool = optionalString(value.tool)
  const label = optionalString(value.label)
  const access =
    value.access === "read" || value.access === "write"
      ? value.access
      : undefined

  if (tool === undefined || label === undefined) {
    return []
  }

  return [
    {
      access,
      description: optionalString(value.description),
      label,
      tool,
    },
  ]
}

function optionalBoolean(key: "hasMore", value: unknown) {
  return typeof value === "boolean" ? { [key]: value } : {}
}

function optionalNumberField(key: "itemCount", value: unknown) {
  const number = optionalNumber(value)

  return number === undefined ? {} : { [key]: number }
}

function optionalStringField(key: "itemKey", value: unknown) {
  const string = optionalString(value)

  return string === undefined ? {} : { [key]: string }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}
