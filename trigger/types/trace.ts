import { type JsonValue } from "../../contracts/json"
import { type ToolAccess } from "../../contracts/permissions"
import {
  type RuntimeModelUsage,
  type RuntimeValueSummary,
} from "../../contracts/runtime/trace"
import { type ConvexId } from "./id"

export type RuntimeErrorTraceData = {
  error: string
}

export type RuntimeToolTraceTool = {
  access: ToolAccess
  name: string
  route: "agent" | "surface" | "convex" | "run" | "sandbox"
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
  | { approval: ConvexId<"approvals"> }
  | { offer: ConvexId<"integrationOffers"> }
  | { asset: ConvexId<"assets"> }
  | { child: ConvexId<"runs"> }
  | { waiter: ConvexId<"waiters"> }

export type RuntimeEventTraceData =
  | RuntimeErrorTraceData
  | RuntimeModelTraceData
  | RuntimeRelationTraceData
  | RuntimeToolTraceData

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
  data?: RuntimeEventTraceData
  keyId?: string
  runId: ConvexId<"runs">
  sequence: number
  type: RuntimeEventType
}
