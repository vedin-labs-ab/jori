export const pageSize = 25

export const executionFilterOptions = [
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

export type ExecutionFilter = (typeof executionFilterOptions)[number]["value"]
export type ApprovalFilter = (typeof approvalFilterOptions)[number]["value"]
export type ExecutionStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "stopped"
export type ApprovalState = "pending" | "approved" | "denied" | "expired"

export type SourceDatum = {
  type: string
  label: string
  url?: string
}

export type ExecutionTaskSource = {
  label: string
  url: string
}

export type ExecutionSource = {
  type: "automation" | "event" | "manual" | "message"
  event?: SourceDatum
  kind?: SourceDatum
  metadata: SourceDatum[]
  provider?: SourceDatum
  stop?: {
    actor: SourceDatum
  }
}

export type ExecutionDetailType =
  | "channel"
  | "comment"
  | "decision"
  | "issue"
  | "message"
  | "page"
  | "pull_request"
  | "repository"
  | "stopped"

export type ExecutionDetail = {
  type: ExecutionDetailType
  label: string
  url?: string
  at?: number
}

export type ExecutionItem = {
  id: string
  status: ExecutionStatus
  title: string
  source: ExecutionSource
  task: string
  taskSource?: ExecutionTaskSource
  trigger: string
  createdAt: number
  details: ExecutionDetail[]
  finishedAt?: number
  durationMs?: number
  traceFileId?: string
  error?: string
  approval: {
    id: string
    state: ApprovalState
    tool: string
    toolLabel: string
    summary: string
    provider: string
    expiresAt: number
    decidedAt?: number
    delivery?: string
    source?: {
      label: string
      provider?: string
      url?: string
    }
  } | null
  searchableText: string
}
