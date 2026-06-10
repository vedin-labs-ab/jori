import { AlertTriangle, Check, Copy, type LucideIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { absoluteTime, approvalLabel, formatDuration } from "./format"
import { type ExecutionItem } from "./types"

const copyResetDelayMs = 1200

export function ApprovalCallout({
  approval,
  now,
}: {
  approval: NonNullable<ExecutionItem["approval"]>
  now: number
}) {
  return (
    <div className="m-3 rounded-md border border-amber-700/20 bg-amber-700/5 p-3">
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
        <div className="flex items-center gap-2 font-medium text-amber-900 text-xs">
          <AlertTriangle className="size-3.5" />
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

export function ErrorDetail({ value }: { value: string }) {
  return (
    <CodeBlockDetail
      icon={AlertTriangle}
      iconClassName="text-destructive"
      label="Error"
      value={value}
    />
  )
}

export function CodeBlockDetail({
  icon: Icon,
  iconClassName = "text-muted-foreground",
  label,
  value,
}: {
  icon: LucideIcon
  iconClassName?: string
  label: string
  value: string
}) {
  return (
    <div className="grid gap-2 px-3 py-3 text-xs sm:grid-cols-[10rem_1fr]">
      <div className="flex items-start gap-2 font-medium">
        <Icon className={cn("mt-0.5 size-3.5", iconClassName)} />
        {label}
      </div>
      <div className="relative min-w-0 rounded-md bg-muted px-2.5 py-2 pr-9 font-mono text-foreground text-xs leading-relaxed">
        <code className="block whitespace-pre-wrap break-words">{value}</code>
        <CopyButton
          className="absolute top-1.5 right-1.5"
          label={label}
          value={value}
        />
      </div>
    </div>
  )
}

export function ExecutionDetails({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t bg-muted/40 px-3 py-2 text-xs">
      {children}
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
      <CopyButton label={label} value={value} />
    </span>
  )
}

export function RelativeTime({
  absolute,
  value,
}: {
  absolute: number
  value: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-muted-foreground text-xs">{value}</span>
      </TooltipTrigger>
      <TooltipContent>{absoluteTime(absolute)}</TooltipContent>
    </Tooltip>
  )
}

function CopyButton({
  className,
  label,
  value,
}: {
  className?: string
  label: string
  value: string
}) {
  const [hasCopied, setHasCopied] = useState(false)

  useEffect(() => {
    if (!hasCopied) {
      return
    }

    const timeout = window.setTimeout(
      () => setHasCopied(false),
      copyResetDelayMs
    )

    return () => window.clearTimeout(timeout)
  }, [hasCopied])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={`${hasCopied ? "Copied" : "Copy"} ${label}`}
          className={cn("relative", className)}
          onClick={(event) => {
            event.stopPropagation()
            void navigator.clipboard?.writeText(value)
            setHasCopied(true)
          }}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <Copy
            className={cn(
              "transition-all duration-200 ease-out",
              hasCopied && "scale-75 opacity-0"
            )}
          />
          <Check
            className={cn(
              "absolute transition-all duration-200 ease-out",
              hasCopied ? "scale-100 opacity-100" : "scale-75 opacity-0"
            )}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{hasCopied ? "Copied" : `Copy ${label}`}</TooltipContent>
    </Tooltip>
  )
}
