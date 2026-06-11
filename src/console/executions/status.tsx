import {
  AlertCircle,
  CheckCircle2,
  Circle,
  CircleAlert,
  ClockAlert,
  Loader2,
  type LucideIcon,
  UserCheck,
} from "lucide-react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { formatDuration } from "./format"
import { type ApprovalState, type ExecutionStatus } from "./types"

const statusIconClasses = {
  completed: "text-emerald-800",
  failed: "text-red-800",
  queued: "text-muted-foreground",
  running: "text-muted-foreground",
  stopped: "text-muted-foreground",
} satisfies Record<ExecutionStatus, string>

export function StatusIcon({
  approvalState,
  status,
}: {
  approvalState?: ApprovalState
  status: ExecutionStatus
}) {
  if (approvalState === "pending") {
    return <CircleAlert className="size-4 text-amber-900" />
  }

  if (approvalState === "expired") {
    return <ClockAlert className="size-4 text-amber-900" />
  }

  const Icon =
    status === "completed"
      ? CheckCircle2
      : status === "failed"
        ? AlertCircle
        : status === "running"
          ? Loader2
          : status === "queued"
            ? Loader2
            : Circle

  return (
    <Icon
      className={cn(
        "size-4",
        statusIconClasses[status],
        (status === "queued" || status === "running") && "animate-spin"
      )}
    />
  )
}

export function ApprovalBadge({
  expiresAt,
  isVisible,
  now,
}: {
  expiresAt: number
  isVisible: boolean
  now: number
}) {
  const [shouldRender, setShouldRender] = useState(isVisible)

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
      return
    }

    const timeout = window.setTimeout(() => setShouldRender(false), 200)

    return () => window.clearTimeout(timeout)
  }, [isVisible])

  if (!shouldRender) {
    return null
  }

  return (
    <span
      aria-hidden={!isVisible}
      className={cn(
        "inline-flex origin-left items-center gap-1 text-warning text-xs transition-[opacity,transform] duration-200 ease-out",
        isVisible
          ? "scale-x-100 opacity-100"
          : "pointer-events-none scale-x-95 opacity-0"
      )}
    >
      <UserCheck className="size-3.5 shrink-0" />
      <span>
        Needs approval · {formatDuration(Math.max(0, expiresAt - now))}
      </span>
    </span>
  )
}

export function MetaPill({
  icon: Icon,
  label,
}: {
  icon: LucideIcon
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
      <Icon className="size-3.5" />
      {label}
    </span>
  )
}
