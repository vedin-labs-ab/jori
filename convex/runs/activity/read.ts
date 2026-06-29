import {
  type ActivityMetadataItem,
  type ActivityStatus,
  type ToolLabel,
} from "./types"

export type EventData = {
  metrics?: {
    durationMs?: number
    inputTokens?: number
    outputTokens?: number
    reasoningTokens?: number
    toolCalls?: number
    totalTokens?: number
  }
  status?: ActivityStatus
  summary?: string
  title: string
}

export type ToolResult = {
  preview?: string
  size?: number
  type: string
}

export function readEventData(data: unknown): EventData | undefined {
  const record = asRecord(data)

  if (record === undefined || typeof record.title !== "string") {
    return undefined
  }

  return {
    metrics: readMetrics(record.metrics),
    status: readStatus(record.status),
    summary: readString(record.summary),
    title: record.title,
  }
}

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

export function readToolAccess(data: unknown) {
  const access = asRecord(data)?.access

  return access === "read" || access === "write" ? access : undefined
}

export function readToolError(data: unknown) {
  return readString(asRecord(data)?.error)
}

export function readToolInput(data: unknown) {
  return asRecord(asRecord(data)?.input)
}

export function readToolMetadata(data: unknown): ActivityMetadataItem[] {
  const metadata = asRecord(data)?.metadata

  return Array.isArray(metadata) ? metadata.flatMap(readMetadataItem) : []
}

export function readToolName(data: unknown) {
  return readString(asRecord(data)?.name)
}

export function readToolResult(data: unknown) {
  const result = asRecord(asRecord(data)?.result)

  if (result === undefined) {
    return undefined
  }

  const type = readString(result.type)

  return type === undefined
    ? undefined
    : {
        preview: readString(result.preview),
        size: readNumber(result.size),
        type,
      }
}

export function readToolRoute(data: unknown) {
  return readString(asRecord(data)?.route)
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

function readMetadataItem(value: unknown): ActivityMetadataItem[] {
  if (!isRecord(value)) {
    return []
  }

  const kind = readMetadataKind(value.kind)
  const text = readString(value.text)

  return kind === undefined || text === undefined ? [] : [{ kind, text }]
}

function readMetadataKind(
  value: unknown
): ActivityMetadataItem["kind"] | undefined {
  if (value === "target" || value === "scope" || value === "outcome") {
    return value
  }

  return undefined
}

function readMetrics(value: unknown): EventData["metrics"] {
  if (!isRecord(value)) {
    return undefined
  }

  return {
    durationMs: readNumber(value.durationMs),
    inputTokens: readNumber(value.inputTokens),
    outputTokens: readNumber(value.outputTokens),
    reasoningTokens: readNumber(value.reasoningTokens),
    toolCalls: readNumber(value.toolCalls),
    totalTokens: readNumber(value.totalTokens),
  }
}

function readStatus(value: unknown) {
  return typeof value === "string" && isActivityStatus(value)
    ? value
    : undefined
}

function isActivityStatus(value: string): value is ActivityStatus {
  return [
    "approved",
    "cancelled",
    "completed",
    "connected",
    "denied",
    "expired",
    "failed",
    "pending",
    "requested",
    "running",
    "stopped",
    "waiting",
  ].includes(value)
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
