import { type GenericId } from "convex/values"
import { type ToolSurface } from "../contracts/integrations"

export { agentTaskId, cleanupTaskId } from "../contracts/runtime"

export type JsonObject = Record<string, unknown>
export type ConvexId<TableName extends string> = GenericId<TableName>

export type AgentRunPayload = {
  executionId: ConvexId<"executions">
  parentRunId?: ConvexId<"runs">
  rootRunId?: ConvexId<"runs">
  runId: ConvexId<"runs">
}

export type SandboxCleanupPayload = {
  executionId: ConvexId<"executions">
  runId: ConvexId<"runs">
  sandboxId: string
}

export type RuntimeToolRoute = "convex" | "sandbox" | "subagent"

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
  execution: {
    id: ConvexId<"executions">
    sandboxId: string | null
    status: "completed" | "failed" | "queued" | "running" | "stopped"
  }
  prompt: string
  run: {
    id: ConvexId<"runs">
    rootRunId: ConvexId<"runs"> | null
    task: string
    tenantId: string
    title: string
  }
  session: {
    id: ConvexId<"sessions">
  } | null
  tools: RuntimeTool[]
}

export type RuntimeMessage = {
  createdAt: number
  id: ConvexId<"messages">
  integration: string
  observedAt: number | null
  text: string
  type: string
}

export type RuntimeEventType =
  | "message.final"
  | "run.completed"
  | "run.failed"
  | "run.started"
  | "tool.completed"
  | "tool.failed"
  | "tool.started"
  | "tool.waiting"

export type RuntimeEventInput = {
  attempt?: number
  executionId: ConvexId<"executions">
  payload?: JsonObject
  runId: ConvexId<"runs">
  sequence: number
  source: string
  toolCallId?: string
  type: RuntimeEventType
}

export type ApprovalDecision = {
  approvalId?: ConvexId<"approvals">
  decision: "approved" | "denied"
}
