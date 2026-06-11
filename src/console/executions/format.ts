import { type ApprovalState } from "./types"

export function approvalLabel(state: ApprovalState) {
  const labels = {
    approved: "Approved",
    consumed: "Approved",
    denied: "Denied",
    expired: "Expired",
    pending: "Required",
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
