import { type Scope, scopeLabels } from "@contracts/permissions/scope"
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CornerDownLeft,
  UserRound,
} from "lucide-react"
import { type ElementType, type ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { scrollFade } from "@/shared/fade"
import { FieldHelp } from "@/shared/field"
import { CopyableCodeBlock, CopyButton } from "./copy"
import { absoluteTime } from "./time"

export const codeBlockContentClassName = "max-h-[250px] overflow-y-auto"
const codeBlockBodyClassName = cn(
  scrollFade,
  "max-h-[250px] overflow-y-auto px-2.5 py-2 font-mono text-foreground text-xs leading-relaxed"
)

export type DetailIcon = ElementType<{ className?: string }>

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

/** The outcome a run returned via finish_run. */
export function ResultDetail({ value }: { value: string }) {
  return (
    <CodeBlockDetail
      help={
        <FieldHelp label="About the outcome">
          The run's return value, written by the agent as it finished. A parent
          run waiting on this one receives exactly this text; the steps behind
          it are in the run's activity.
        </FieldHelp>
      }
      icon={CornerDownLeft}
      label="Outcome"
      value={value}
    />
  )
}

export function CodeBlockDetail({
  contentClassName,
  framed = false,
  header,
  help,
  icon: Icon,
  iconClassName,
  label,
  value,
}: {
  contentClassName?: string
  framed?: boolean
  header?: ReactNode
  /** Suffix hint after the label, a FieldHelp explaining the row. */
  help?: ReactNode
  icon: DetailIcon
  iconClassName?: string
  label: string
  value: string
}) {
  const rowLabel =
    help === undefined ? (
      label
    ) : (
      <span className="inline-flex items-center gap-1.5">
        {label}
        {help}
      </span>
    )

  if (framed || header !== undefined) {
    return (
      <DetailRow icon={Icon} iconClassName={iconClassName} label={rowLabel}>
        <DetailFrame
          action={<CopyButton label={label} value={value} />}
          header={header}
        >
          <CodeBlockBody className={contentClassName} value={value} />
        </DetailFrame>
      </DetailRow>
    )
  }

  return (
    <DetailRow icon={Icon} iconClassName={iconClassName} label={rowLabel}>
      <CopyableCodeBlock
        contentClassName={contentClassName}
        label={label}
        value={value}
      />
    </DetailRow>
  )
}

export function CodeBlockBody({
  className,
  value,
}: {
  className?: string
  value: string
}) {
  return (
    <div className={codeBlockBodyClassName}>
      <code className={cn("block whitespace-pre-wrap break-words", className)}>
        {value}
      </code>
    </div>
  )
}

export function DetailFrame({
  action,
  children,
  className,
  contentClassName,
  header,
  headerClassName,
}: {
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  header?: ReactNode
  headerClassName?: string
}) {
  const hasHeader = header !== undefined || action !== undefined

  return (
    <div
      className={cn(
        "grid min-w-0 max-w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-md bg-muted",
        className
      )}
    >
      {hasHeader ? (
        <div
          className={cn(
            "flex min-w-0 items-center justify-between gap-2 border-b px-2.5 py-1.5 text-muted-foreground",
            headerClassName
          )}
        >
          <div className="min-w-0 truncate">{header}</div>
          {action === undefined ? null : (
            <div className="shrink-0">{action}</div>
          )}
        </div>
      ) : null}
      <div className={cn("min-h-0 min-w-0 overflow-hidden", contentClassName)}>
        {children}
      </div>
    </div>
  )
}

export function DetailLink({
  children,
  href,
}: {
  children: ReactNode
  href: string
}) {
  return (
    <a
      className={cn(
        "group/detail-link inline-flex min-w-0 max-w-full items-center gap-1.5",
        "rounded-sm font-medium text-foreground underline-offset-4",
        "transition-colors hover:underline focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/50"
      )}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <span className="min-w-0 truncate">{children}</span>
      <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-colors group-hover/detail-link:text-foreground" />
    </a>
  )
}

export function DetailRow({
  children,
  icon: Icon,
  iconClassName = "text-muted-foreground",
  label,
}: {
  children: React.ReactNode
  icon: DetailIcon
  iconClassName?: string
  label: ReactNode
}) {
  return (
    <div className="grid gap-2 px-3 py-3 text-xs sm:grid-cols-[10rem_1fr]">
      <div className="flex items-start gap-2 font-medium">
        <Icon className={cn("mt-0.5 size-3.5", iconClassName)} />
        {label}
      </div>
      {children}
    </div>
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

/** Who a run belongs to, as an icon: the organization or one member. */
export function ScopeIcon({
  className,
  scope,
}: {
  className?: string
  scope: Scope
}) {
  const Icon = scope === "organization" ? Building2 : UserRound

  return <Icon className={className} />
}

/** Quiet inline scope marker for list metadata rows; shown for both scopes. */
export function ScopeDatum({
  iconClassName = "size-3.5",
  scope,
}: {
  iconClassName?: string
  scope: Scope
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <ScopeIcon className={cn("shrink-0", iconClassName)} scope={scope} />
      <span className="text-foreground">{scopeLabels[scope]}</span>
    </span>
  )
}
