import { type GenericId } from "convex/values"
import { type ToolSurface } from "../contracts/integrations"
import { type JsonObject } from "../contracts/json"
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

import { type RuntimeToolMetadataItem } from "../contracts/runtime"

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
  | "active_surface"
  | "convex"
  | "run"
  | "sandbox"

export type RuntimeTraceSource =
  | "trigger.approval"
  | "trigger.model"
  | "trigger.run"
  | "trigger.tool"

export type RuntimeValueSummary = {
  type: "array" | "boolean" | "null" | "number" | "object" | "string"
  preview?: string
  size?: number
}

export type RuntimeToolInputSummary = {
  args?: string[]
  command?: string
  cwd?: string
  directory?: string
  include?: string
  limit?: number
  offset?: number
  owner?: string
  path?: string
  pattern?: string
  ref?: string
  repo?: string
  timeoutMs?: number
}

export type RuntimeErrorTraceData = {
  error: string
}

export type RuntimeToolTraceData = {
  access?: ToolAccess
  name: string
  route: RuntimeToolRoute
  error?: string
  metadata?: RuntimeToolMetadataItem[]
  providerTrace?: {
    provider: string
    requestId: string
  }
  input?: RuntimeToolInputSummary
  result?: RuntimeValueSummary
}

export type RuntimeRunTraceData = RuntimeErrorTraceData

export type RuntimeTraceSubject =
  | { kind: "agent"; id: ConvexId<"runs"> }
  | { kind: "approval"; id: ConvexId<"approvals"> }
  | { kind: "asset"; id: ConvexId<"assets"> }
  | { kind: "offer"; id: ConvexId<"integrationOffers"> }
  | { kind: "waiter"; id: ConvexId<"waiters"> }

export type RuntimeTraceMetrics = {
  approvals?: number
  durationMs?: number
  inputCacheReadTokens?: number
  inputCacheWriteTokens?: number
  inputTokens?: number
  inputUncachedTokens?: number
  messages?: number
  offers?: number
  outputTokens?: number
  reasoningTokens?: number
  toolCalls?: number
  totalTokens?: number
}

export type RuntimeTraceStatus =
  | "approved"
  | "cancelled"
  | "completed"
  | "connected"
  | "denied"
  | "expired"
  | "failed"
  | "pending"
  | "requested"
  | "running"
  | "stopped"
  | "waiting"

export type RuntimeEventTraceData = {
  metrics?: RuntimeTraceMetrics
  status?: RuntimeTraceStatus
  subject?: RuntimeTraceSubject
  summary?: string
  title: string
}

export type RuntimeTraceData =
  | RuntimeEventTraceData
  | RuntimeRunTraceData
  | RuntimeToolTraceData

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
  runId: ConvexId<"runs">
  sequence: number
  source: RuntimeTraceSource
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
