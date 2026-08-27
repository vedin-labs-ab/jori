import { type JsonValue } from "../../json"
import { type ToolAccess } from "../../permissions"
import { type RuntimeModelUsage, type RuntimeValueSummary } from "../trace"
import { type RuntimeTool } from "./context"
import { type RuntimeId } from "./ids"

export type RuntimeErrorTraceData = {
  error: string
}

/** Outcome a run returned via finish_run; recorded with run.completed. */
export type RuntimeResultTraceData = {
  result: string
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
  | RuntimeResultTraceData
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
  attempt?: number
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
