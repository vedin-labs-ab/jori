import { type ToolSurface } from "../../contracts/integrations"
import { type ConvexId } from "./id"

export type HandoffSubject =
  | { kind: "approval"; id: ConvexId<"approvals"> }
  | { kind: "offer"; id: ConvexId<"integrationOffers"> }

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
