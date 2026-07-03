import { type JsonObject } from "./json"

export const agentTaskId = "milo-agent-run"
export const cleanupTaskId = "milo-sandbox-cleanup"
export const toolFinalDescription =
  "Set true only when this tool call is the final useful action for the run. If active approvals or integration offers remain, the run waits; otherwise it completes after the tool succeeds."

const runtimeToolMetadataKinds = [
  "filter",
  "outcome",
  "scope",
  "target",
] as const

export type RuntimePrompt = {
  context: string
  instructions: string
  organization: string | null
}

type RuntimeToolMetadataKind = (typeof runtimeToolMetadataKinds)[number]

export type RuntimeToolMetadataItem = {
  kind: RuntimeToolMetadataKind
  text: string
}

export type SurfaceReactionTarget =
  | { messageTs: string }
  | { type: "comment"; commentId: string }
  | { type: "comment"; commentId: number }
  | { type: "issue"; issueId: string }

// Trace event payload shapes: written by the worker, read by the console.
export type RuntimeValueSummary =
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

export type RuntimeModelUsage = {
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

export function finalProperty(): JsonObject {
  return {
    type: "boolean",
    description: toolFinalDescription,
  }
}

export function readFinal(input: JsonObject) {
  const value = input.final

  if (value === undefined || value === null) {
    return false
  }

  if (typeof value !== "boolean") {
    throw new Error("final must be a boolean")
  }

  return value
}
