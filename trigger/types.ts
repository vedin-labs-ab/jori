import { type GenericId } from "convex/values"
import { type ToolSurface } from "../contracts/integrations"
import { type JsonObject, type JsonValue } from "../contracts/json"
import { type ToolAccess } from "../contracts/permissions"

export type {
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
} from "../contracts/json"
export {
  agentTaskId,
  cleanupTaskId,
  type RuntimeToolMetadataItem,
  type SurfaceReactionTarget,
} from "../contracts/runtime"

export type ConvexId<TableName extends string> = GenericId<TableName>

export type AgentRunPayload = {
  runId: ConvexId<"runs">
}

export type SandboxCleanupPayload = {
  expiresAt?: number
  runId: ConvexId<"runs">
  sandboxId: string
}

export type ActiveSurface = {
  communicated: boolean
  surface: "github" | "linear" | "slack"
  target: string | null
}

export type RuntimeToolRoute =
  | "agent"
  // Distinct from ToolSurface/activeSurface, which names integrations like Slack.
  | "surface"
  | "convex"
  | "run"
  | "sandbox"

export type RuntimeValueSummary =
  | { kind: "string"; preview: string; length: number }
  | { kind: "number"; preview: string }
  | { kind: "boolean" }
  | { kind: "null" }
  | { kind: "array"; size: number }
  | { kind: "object"; size: number }

export type RuntimeErrorTraceData = {
  error: string
}

export type RuntimeToolTraceTool = {
  access: ToolAccess
  name: string
  route: RuntimeToolRoute
}

export type RuntimeToolProviderTrace = {
  name: string
  request: string
} | null

export type RuntimeToolTraceData =
  | { tool: RuntimeToolTraceTool; input: JsonValue | null }
  | {
      tool: RuntimeToolTraceTool
      result: RuntimeValueSummary
      provider: RuntimeToolProviderTrace
    }
  | { tool: RuntimeToolTraceTool; input: JsonValue | null; error: string }
  | { tool: RuntimeToolTraceTool }

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

export type RuntimeModelTraceData = {
  usage: RuntimeModelUsage
  output: string | null
  reasoning: string | null
}

export type RuntimeRelationTraceData =
  | { approval: ConvexId<"approvals"> }
  | { offer: ConvexId<"integrationOffers"> }
  | { asset: ConvexId<"assets"> }
  | { child: ConvexId<"runs"> }
  | { waiter: ConvexId<"waiters"> }

export type RuntimeRunTraceData = RuntimeErrorTraceData

export type RuntimeEventTraceData =
  | RuntimeErrorTraceData
  | RuntimeModelTraceData
  | RuntimeRelationTraceData
  | RuntimeToolTraceData

export type RuntimeTraceData = RuntimeEventTraceData | RuntimeRunTraceData

export type RuntimeTool = {
  access: ToolAccess
  description: string
  inputSchema: JsonObject
  mode?: "allowed" | "blocked" | "prompted" | "required"
  name: string
  route: RuntimeToolRoute
  surface?: ToolSurface
  tool?: string
}

export type RuntimeContext = {
  activeSurface: ActiveSurface | null
  prompt: string
  run: {
    id: ConvexId<"runs">
    rootId: ConvexId<"runs"> | null
    sandboxId: string | null
    status: "completed" | "failed" | "queued" | "running" | "stopped"
    tenantId: string
  }
  session: {
    id: ConvexId<"sessions">
  } | null
  tools: RuntimeTool[]
}

export type RuntimeMessage = {
  actor: string | null
  actorIds: string[]
  authority: "authoritative" | "soft"
  createdAt: number
  id: ConvexId<"messages">
  identifiers: string[]
  integration: string
  mentioned: boolean
  observedAt: number | null
  reactions: string | null
  replyTarget: string | null
  source: "bot" | "person" | "self" | "unknown"
  text: string
  type: string
}

export type RuntimeInteraction = {
  actor: string | null
  actorIds: string[]
  createdAt: number
  id: ConvexId<"reactions">
  identifiers: string[]
  observedAt: number | null
  preview: string | null
  reaction: string
  source: "bot" | "person" | "self" | "unknown"
  target: string
  type: "reaction.added" | "reaction.removed"
}

export type RuntimeEventType =
  | "agent.started"
  | "approval.requested"
  | "approval.resolved"
  | "asset.saved"
  | "model.completed"
  | "model.failed"
  | "model.started"
  | "offer.requested"
  | "offer.resolved"
  | "run.completed"
  | "run.failed"
  | "run.resumed"
  | "run.started"
  | "run.stopped"
  | "run.waiting"
  | "tool.completed"
  | "tool.failed"
  | "tool.started"
  | "tool.waiting"

export type RuntimeEventInput = {
  attempt?: number
  callId?: string
  data?: RuntimeTraceData
  keyId?: string
  runId: ConvexId<"runs">
  sequence: number
  type: RuntimeEventType
}

export type WaiterWakeReason = "resolved" | "message" | "cancelled" | "expired"

export type WaiterWake = {
  reason: WaiterWakeReason
  subject?: unknown
}

export type ApprovalHandoff = {
  id: ConvexId<"approvals">
  status: "pending" | "approved" | "denied" | "cancelled" | "expired" | "failed"
  surface: ToolSurface
  tool: string
  summary: string
  code: string
  expiresAt: number
}

export type OfferHandoff = {
  id: ConvexId<"integrationOffers">
  integration: string
  status:
    | "pending"
    | "claimed"
    | "cancelled"
    | "connected"
    | "failed"
    | "expired"
  summary: string | null
  expiresAt: number
}

export type RunHandoffs = {
  approvals: ApprovalHandoff[]
  offers: OfferHandoff[]
}
