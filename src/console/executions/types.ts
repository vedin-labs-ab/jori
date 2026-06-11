export const pageSize = 25

export const filterOptions = [
  { label: "All", value: "all" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Needs approval", value: "approval" },
  { label: "Failed", value: "failed" },
  { label: "Completed", value: "completed" },
] as const

export type FilterValue = (typeof filterOptions)[number]["value"]
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
  stoppedAt?: number
  stoppedBy?: string
  durationMs?: number
  sandboxId?: string
  hash?: string
  promptId: string
  traceFileId?: string
  error?: string
  approval: {
    id: string
    state: ApprovalState
    tool: string
    summary: string
    provider: string
    expiresAt: number
    delivery?: string
    source?: {
      label: string
      url?: string
    }
  } | null
  searchableText: string
}
