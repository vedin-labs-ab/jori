import { type JsonValue } from "../json"
import { type ToolAccess } from "../permissions"
import { type RuntimeTool } from "./context"
import { type RuntimeId } from "./ids"
import { type RuntimeModelUsage, type RuntimeValueSummary } from "./trace"

export type RuntimeErrorTraceData = {
  error: string
}

export type RuntimeToolTraceTool = {
  access: ToolAccess
  name: string
  route: RuntimeTool["route"]
}

export type RuntimeToolProviderTrace = {
  name: string
  request: string
} | null

type RuntimeToolTraceData =
  | { tool: RuntimeToolTraceTool; input: JsonValue | null }
  | {
      tool: RuntimeToolTraceTool
      result: RuntimeValueSummary
      provider: RuntimeToolProviderTrace
    }
  | { tool: RuntimeToolTraceTool; input: JsonValue | null; error: string }
  | { tool: RuntimeToolTraceTool }

type RuntimeModelTraceData = {
  model: string
  usage: RuntimeModelUsage
  output: string | null
  reasoning: string | null
}

type RuntimeRelationTraceData =
  | { approval: RuntimeId<"approvals"> }
  | { offer: RuntimeId<"integrationOffers"> }
  | { file: RuntimeId<"files"> }
  | { child: RuntimeId<"runs"> }
  | { waiter: RuntimeId<"waiters"> }

export type RuntimeEventTraceData =
  | RuntimeErrorTraceData
  | RuntimeModelTraceData
  | RuntimeRelationTraceData
  | RuntimeToolTraceData

export type RuntimeEventType =
  | "agent.started"
  | "approval.requested"
  | "approval.resolved"
  | "file.saved"
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
  callId?: string
  data?: RuntimeEventTraceData
  keyId?: string
  runId: RuntimeId<"runs">
  sequence: number
  type: RuntimeEventType
}

export type RuntimeEventRecord = Omit<
  RuntimeEventInput,
  "data" | "keyId" | "sequence" | "type"
> & {
  data?: RuntimeEventTraceData | { tools: unknown }
  key: string
  sequence?: number
  type: RuntimeEventType | "run.prepared"
}
