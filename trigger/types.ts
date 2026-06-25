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
export { agentTaskId, cleanupTaskId } from "../contracts/runtime"

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
}

export type RuntimeToolRoute =
  | "active_surface"
  | "convex"
  | "run"
  | "sandbox"
  | "subagent"

export type RuntimeTraceSource =
  | "trigger.approval"
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
  providerTrace?: {
    provider: string
    requestId: string
  }
  input?: RuntimeToolInputSummary
  result?: RuntimeValueSummary
}

export type RuntimeRunTraceData = RuntimeErrorTraceData

export type RuntimeTraceData = RuntimeRunTraceData | RuntimeToolTraceData

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
  integration: string
  messageIds: string[]
  mentioned: boolean
  observedAt: number | null
  source: "bot" | "self" | "unknown" | "user"
  text: string
  type: string
}

export type RuntimeEventType =
  | "run.completed"
  | "run.failed"
  | "run.started"
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

export type WaiterWakeReason =
  | "approval_resolved"
  | "integration_resolved"
  | "message"
  | "run_cancelled"
  | "expired"

export type WaiterWake = {
  reason: WaiterWakeReason
  subject?: unknown
}

export type ApprovalHandoff = {
  id: ConvexId<"approvals">
  status: "pending" | "approved" | "denied" | "cancelled" | "expired"
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
