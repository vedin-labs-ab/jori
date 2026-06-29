import { type Doc } from "../../_generated/dataModel"

export type ActivityStatus =
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

export type ActivityKind =
  | "agent"
  | "approval"
  | "asset"
  | "model"
  | "offer"
  | "run"
  | "tool"
  | "wait"

export type ActivityDetail = {
  label: string
  value: string
}

export type ActivityItem = {
  id: string
  kind: ActivityKind
  status: ActivityStatus
  title: string
  access?: "read" | "write"
  description?: string
  details?: ActivityDetail[]
  durationMs?: number
  endedAt?: number
  isLive?: boolean
  startedAt: number
}

export type ActivityData = {
  approvals: Doc<"approvals">[]
  agents: Doc<"runs">[]
  offers: Doc<"integrationOffers">[]
  run: Doc<"runs">
  traces: Doc<"traces">[]
  waiters: Doc<"waiters">[]
}

export type ToolLabel = {
  access?: "read" | "write"
  description?: string
  label: string
  tool: string
}
