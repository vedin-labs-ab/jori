import { type ToolSurface } from "./integrations"
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
  place: string | null
  person: string | null
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

const surfaceCommunicationTools = ["send_reply", "add_reaction"] as const

// Surface tools whose completion is, by itself, visible communication to the
// requester. Convex derives a run's `communicated` state from their traces;
// the worker marks the active surface when they succeed.
export function isSurfaceCommunicationTool(name: unknown) {
  return surfaceCommunicationTools.some((tool) => tool === name)
}

// A convex-routed tool call that communicated visibly: an integration offer
// whose card was delivered on the run's active surface.
export function isVisibleCommunicationTool(
  toolName: string,
  result: unknown,
  activeSurface: ToolSurface
) {
  return (
    toolName === "offer_integration" &&
    deliveredOnActiveSurface(result, activeSurface)
  )
}

function deliveredOnActiveSurface(result: unknown, activeSurface: ToolSurface) {
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    return false
  }

  const delivery = (result as { delivery?: unknown }).delivery

  if (
    typeof delivery !== "object" ||
    delivery === null ||
    Array.isArray(delivery)
  ) {
    return false
  }

  return (
    (delivery as { status?: unknown }).status === "delivered" &&
    (delivery as { surface?: unknown }).surface === activeSurface
  )
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
