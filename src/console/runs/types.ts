import { type Integration } from "@contracts/integrations"

export const pageSize = 25

export const runFilterOptions = [
  { label: "All", value: "all" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Failed", value: "failed" },
  { label: "Stopped", value: "stopped" },
  { label: "Completed", value: "completed" },
] as const

export const approvalFilterOptions = [
  { label: "Any", value: "any" },
  { label: "Needs approval", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Denied", value: "denied" },
  { label: "Expired", value: "expired" },
  { label: "Not required", value: "none" },
] as const

export const approvalFilterLabels = Object.fromEntries(
  approvalFilterOptions.map((option) => [option.value, option.label])
) as Record<ApprovalFilter, string>

export type RunFilter = (typeof runFilterOptions)[number]["value"]
export type ApprovalFilter = (typeof approvalFilterOptions)[number]["value"]
export type ExecutionStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "stopped"
export type ApprovalState =
  | "pending"
  | "approved"
  | "denied"
  | "cancelled"
  | "expired"
  | "failed"
export type OfferState =
  | "pending"
  | "claimed"
  | "cancelled"
  | "connected"
  | "expired"
  | "failed"

export type SourceDatum = {
  type: string
  label: string
  url?: string
}

export type ExecutionSource = {
  type: "automation" | "event" | "manual" | "message"
  event?: SourceDatum
  kind?: SourceDatum
  surface?: string
  stop?: {
    actor: SourceDatum
  }
  url?: string
}

export type ExecutionDetailType =
  | "calendar_event"
  | "channel"
  | "comment"
  | "decision"
  | "email"
  | "file"
  | "folder"
  | "issue"
  | "message"
  | "next"
  | "page"
  | "project"
  | "pull_request"
  | "repository"
  | "schedule"
  | "sender"
  | "status"
  | "stopped"
  | "subject"
  | "tools"
  | "web_search"

export type ExecutionDetailGroup = {
  type: string
  label: string
  tools: ExecutionDetailTool[]
}

export type ExecutionDetailTool = {
  access: "read" | "write"
  description: string
  label: string
  requiresApproval?: boolean
  tool: string
}

export type ExecutionDetail = {
  type: ExecutionDetailType
  label: string
  url?: string
  timestamp?: number
  groups?: ExecutionDetailGroup[]
}

export type ExecutionApproval = {
  id: string
  state: ApprovalState
  tool: string
  toolLabel: string
  summary: string
  surface: string
  expiresAt: number
  decidedAt?: number
  delivery?: string
  source?: {
    label: string
    surface?: string
    url?: string
  }
}

export type ExecutionOffer = {
  id: string
  state: OfferState
  integration: Integration
  integrationLabel: string
  summary: string
  expiresAt: number
  updatedAt: number
  delivery?: string
  result?: {
    error?: string
    reason?: string
  }
}

export type ExecutionItem = {
  id: string
  status: ExecutionStatus
  title: string
  source: ExecutionSource
  task: string
  trigger: string
  createdAt: number
  details: ExecutionDetail[]
  endedAt?: number
  durationMs?: number
  error?: string
  approval: ExecutionApproval | null
  approvals: ExecutionApproval[]
  offer: ExecutionOffer | null
  offers: ExecutionOffer[]
  waiter?: {
    id: string
    state: "waiting"
    expiresAt: number
  } | null
  searchableText: string
}
