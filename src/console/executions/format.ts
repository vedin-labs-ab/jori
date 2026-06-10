import {
  type ApprovalState,
  type ExecutionItem,
  type FilterValue,
} from "./types"

export function matchesFilter(row: ExecutionItem, filter: FilterValue) {
  if (filter === "all") {
    return true
  }

  if (filter === "approval") {
    return row.approval?.state === "pending"
  }

  if (filter === "ongoing") {
    return row.status === "queued" || row.status === "running"
  }

  return row.status === filter
}

export function approvalLabel(state: ApprovalState) {
  const labels = {
    approved: "Approval granted",
    consumed: "Approval used",
    denied: "Approval denied",
    expired: "Approval expired",
    pending: "Approval required",
  } satisfies Record<ApprovalState, string>

  return labels[state]
}

export function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000))

  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes < 60) {
    return remainingSeconds === 0
      ? `${minutes}m`
      : `${minutes}m ${remainingSeconds}s`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`
}

export function relativeTime(timestamp: number, now: number) {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000))

  if (seconds < 60) {
    return "just now"
  }

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)

  return days === 1 ? "Yesterday" : `${days}d ago`
}

export function absoluteTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp)
}
