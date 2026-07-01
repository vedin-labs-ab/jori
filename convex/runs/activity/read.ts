import { type ToolLabel } from "./types"

export type ToolResult =
  | { kind: "string"; preview: string; length: number }
  | { kind: "number"; preview: string }
  | { kind: "boolean" }
  | { kind: "null" }
  | { kind: "array"; size: number }
  | {
      hasMore?: boolean
      itemCount?: number
      itemKey?: string
      kind: "object"
      size: number
    }

export type ModelUsage = {
  durationMs: number
  inputTokens: number
  inputCacheReadTokens: number
  inputCacheWriteTokens: number
  inputUncachedTokens: number
  outputTokens: number
  reasoningTokens: number
  totalTokens: number
  toolCalls: number
}

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
  return readString(asRecord(data)?.error)
}

export function readModelUsage(data: unknown): ModelUsage | undefined {
  const usage = asRecord(asRecord(data)?.usage)

  if (usage === undefined) {
    return undefined
  }

  return {
    durationMs: readNumber(usage.durationMs) ?? 0,
    inputTokens: readNumber(usage.inputTokens) ?? 0,
    inputCacheReadTokens: readNumber(usage.inputCacheReadTokens) ?? 0,
    inputCacheWriteTokens: readNumber(usage.inputCacheWriteTokens) ?? 0,
    inputUncachedTokens: readNumber(usage.inputUncachedTokens) ?? 0,
    outputTokens: readNumber(usage.outputTokens) ?? 0,
    reasoningTokens: readNumber(usage.reasoningTokens) ?? 0,
    totalTokens: readNumber(usage.totalTokens) ?? 0,
    toolCalls: readNumber(usage.toolCalls) ?? 0,
  }
}

export function readModelReasoning(data: unknown) {
  const reasoning = readString(asRecord(data)?.reasoning)

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
  const kind = readString(result?.kind)

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
  const name = readString(tool?.name)
  const route = readString(tool?.route)
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
  const size = readNumber(result?.size)

  return size === undefined ? undefined : { kind, size }
}

function objectResult(result: Record<string, unknown> | undefined) {
  const size = readNumber(result?.size)

  if (size === undefined) {
    return undefined
  }

  return {
    kind: "object" as const,
    size,
    ...optionalNumber("itemCount", result?.itemCount),
    ...optionalString("itemKey", result?.itemKey),
    ...optionalBoolean("hasMore", result?.hasMore),
  }
}

function resultPreview(
  kind: "number",
  result: Record<string, unknown> | undefined
) {
  const preview = readString(result?.preview)

  return preview === undefined ? undefined : { kind, preview }
}

function resultString(result: Record<string, unknown> | undefined) {
  const preview = readString(result?.preview)
  const length = readNumber(result?.length)

  return preview === undefined || length === undefined
    ? undefined
    : { kind: "string" as const, preview, length }
}

function readPreparedTool(value: unknown): ToolLabel[] {
  if (!isRecord(value)) {
    return []
  }

  const tool = readString(value.tool)
  const label = readString(value.label)
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
      description: readString(value.description),
      label,
      tool,
    },
  ]
}

function optionalBoolean(key: "hasMore", value: unknown) {
  return typeof value === "boolean" ? { [key]: value } : {}
}

function optionalNumber(key: "itemCount", value: unknown) {
  const number = readNumber(value)

  return number === undefined ? {} : { [key]: number }
}

function optionalString(key: "itemKey", value: unknown) {
  const string = readString(value)

  return string === undefined ? {} : { [key]: string }
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
