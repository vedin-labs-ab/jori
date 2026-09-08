import { type ToolSurface } from "../integrations"
import { type RuntimeId } from "./ids"

export type HandoffSubject =
  | { kind: "approval"; id: RuntimeId<"approvals"> }
  | { kind: "offer"; id: RuntimeId<"integrationOffers"> }

export const approvalExecutionTimeoutMs = 5 * 60 * 1000

export type ApprovalExecution =
  | { state: "done"; result: string }
  | { state: "executing"; expiresAt: number }

export type ApprovalHandoff = {
  id: RuntimeId<"approvals">
  status: "pending" | "approved" | "denied" | "cancelled" | "expired" | "failed"
  surface: ToolSurface
  tool: string
  summary: string
  code: string
  expiresAt: number
  executionPendingUntil?: number
}

export type OfferHandoff = {
  id: RuntimeId<"integrationOffers">
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
