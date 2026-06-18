import { type ToolSurface } from "../contracts/integrations"

export { agentTaskId, cleanupTaskId } from "../contracts/runtime"

import { type Id } from "../convex/_generated/dataModel"

export type JsonObject = Record<string, unknown>

export type AgentRunPayload = {
  executionId: Id<"executions">
  parentRunId?: Id<"runs">
  rootRunId?: Id<"runs">
  runId: Id<"runs">
}

export type SandboxCleanupPayload = {
  executionId: Id<"executions">
  runId: Id<"runs">
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
    id: Id<"executions">
    sandboxId: string | null
  }
  prompt: string
  run: {
    id: Id<"runs">
    rootRunId: Id<"runs"> | null
    task: string
    tenantId: Id<"tenants">
    title: string
  }
  tools: RuntimeTool[]
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
  executionId: Id<"executions">
  payload?: JsonObject
  runId: Id<"runs">
  sequence: number
  source: string
  toolCallId?: string
  type: RuntimeEventType
}

export type ApprovalDecision = {
  approvalId?: Id<"approvals">
  decision: "approved" | "denied"
}
