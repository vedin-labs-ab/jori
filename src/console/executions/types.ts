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
  { label: "No approval", value: "none" },
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
export type ApprovalState =
  | "pending"
  | "approved"
  | "denied"
  | "expired"
  | "consumed"

export type ExecutionItem = {
  id: string
  status: ExecutionStatus
  title: string
  sourceParts: string[]
  objective?: string
  progress?: string
  next?: string
  trigger: string
  createdAt: number
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
