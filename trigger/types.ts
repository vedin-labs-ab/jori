import { type GenericId } from "convex/values"
import { type ToolSurface } from "../contracts/integrations"
import { type JsonObject } from "../contracts/json"

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

export type RuntimeToolRoute = "convex" | "sandbox" | "subagent"

export type RuntimeTraceSource =
  | "trigger.approval"
  | "trigger.run"
  | "trigger.tool"

export type RuntimeValueSummary = {
  type: "array" | "boolean" | "null" | "number" | "object" | "string"
  preview?: string
  size?: number
}

export type RuntimeErrorTraceData = {
  error: string
}

export type RuntimeToolTraceData = {
  name: string
  route: RuntimeToolRoute
  error?: string
  providerTrace?: {
    provider: string
    requestId: string
  }
  result?: RuntimeValueSummary
}

export type RuntimeRunTraceData = RuntimeErrorTraceData

export type RuntimeTraceData = RuntimeRunTraceData | RuntimeToolTraceData

export type RuntimeTool = {
  description: string
  inputSchema: JsonObject
  mode?: "allowed" | "blocked" | "prompted" | "required"
  name: string
  route: RuntimeToolRoute
  surface?: ToolSurface
  tool?: string
}

export type RuntimeContext = {
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
  authority: "authoritative" | "soft"
  createdAt: number
  id: ConvexId<"messages">
  identifiers: string[]
  integration: string
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

export type ApprovalResolution = {
  approvalId?: ConvexId<"approvals">
  decision: "approved" | "denied"
  reason?: "expired"
}
