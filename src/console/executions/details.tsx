import { AlertCircle, Copy, Info, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { absoluteTime, approvalLabel, formatDuration } from "./format"
import { type ExecutionItem } from "./types"

export function ApprovalCallout({
  approval,
  now,
}: {
  approval: NonNullable<ExecutionItem["approval"]>
  now: number
}) {
  return (
    <div className="mt-3 rounded-md border border-amber-700/20 bg-amber-700/5 p-3">
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
        <div className="flex items-center gap-2 font-medium text-amber-900 text-xs">
          <AlertCircle className="size-3.5" />
          {approvalLabel(approval.state)}
        </div>
        <div className="grid gap-1 text-xs">
          <p className="font-medium">
            Tool: {approval.tool}
            <ApprovalExpiry approval={approval} now={now} />
          </p>
          <p className="text-muted-foreground">{approval.summary}</p>
          {approval.delivery !== undefined ? (
            <p className="text-muted-foreground">{approval.delivery}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ApprovalExpiry({
  approval,
  now,
}: {
  approval: NonNullable<ExecutionItem["approval"]>
  now: number
}) {
  if (approval.state !== "pending") {
    return null
  }

  return (
    <span className="font-normal text-muted-foreground">
      {" "}
      - expires in {formatDuration(Math.max(0, approval.expiresAt - now))}
    </span>
  )
}

export function DetailLine({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="grid gap-2 border-b py-3 text-xs sm:grid-cols-[10rem_1fr]">
      <div className="flex items-center gap-2 font-medium">
        <Icon className="size-3.5 text-muted-foreground" />
        {label}
      </div>
      <p className="min-w-0 text-foreground">{value}</p>
    </div>
  )
}

export function ExecutionDetails({
  children,
  createdAt,
}: {
  children: React.ReactNode
  createdAt: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 text-xs">
      <span className="inline-flex items-center gap-2 font-medium">
        <Info className="size-3.5 text-muted-foreground" />
        Details
      </span>
      {children}
      <span className="text-muted-foreground">
        Created {absoluteTime(createdAt)}
      </span>
    </div>
  )
}

export function CodeDetail({
  label,
  value,
}: {
  label: string
  value?: string
}) {
  if (value === undefined || value === "") {
    return null
  }

  const shortValue = value.length > 12 ? `${value.slice(0, 8)}...` : value

  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge variant="secondary">{label}</Badge>
      <code className="text-muted-foreground">{shortValue}</code>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={`Copy ${label}`}
            onClick={() => void navigator.clipboard?.writeText(value)}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <Copy />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy {label}</TooltipContent>
      </Tooltip>
    </span>
  )
}
