import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDuration } from "./format"
import { type ExecutionStatus } from "./types"

const statusIconClasses = {
  completed: "text-emerald-800",
  failed: "text-red-800",
  queued: "text-muted-foreground",
  running: "text-muted-foreground",
  stopped: "text-muted-foreground",
} satisfies Record<ExecutionStatus, string>

export function StatusIcon({ status }: { status: ExecutionStatus }) {
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
  now,
}: {
  expiresAt: number
  now: number
}) {
  return (
    <Badge variant="secondary" className="bg-amber-700/10 text-amber-900">
      Approval - {formatDuration(Math.max(0, expiresAt - now))}
    </Badge>
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
