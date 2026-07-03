import { type LucideIcon } from "lucide-react"
import {
  type FocusEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from "react"
import { cn } from "@/lib/utils"
import { type RunRequestNavigation } from "../request/carousel"
import { RunRequestPager } from "../request/pager"

export function RunRowFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-md bg-background ring-1 ring-foreground/10 ring-inset transition-shadow focus-within:ring-2 focus-within:ring-ring/50",
        className
      )}
    >
      {children}
    </article>
  )
}

export function RunRowList({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("grid gap-3", className)}>{children}</div>
}

export function RunRowHeader({
  action,
  children,
}: {
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex items-center">
      {children}
      {action ?? null}
    </div>
  )
}

export function RunRowControl({
  children,
  className,
  onClick,
  onFocus,
  onPointerEnter,
}: {
  children: ReactNode
  className?: string
  onFocus?: FocusEventHandler<HTMLButtonElement>
  onClick?: () => void
  onPointerEnter?: PointerEventHandler<HTMLButtonElement>
}) {
  const controlClassName = cn(
    "group/run-row grid min-w-0 flex-1 grid-cols-[auto_1fr] items-center gap-3 p-3 text-left outline-none md:grid-cols-[auto_1fr_auto]",
    className
  )

  if (onClick === undefined) {
    return <div className={controlClassName}>{children}</div>
  }

  return (
    <button
      className={controlClassName}
      onClick={onClick}
      onFocus={onFocus}
      onPointerEnter={onPointerEnter}
      type="button"
    >
      {children}
    </button>
  )
}

export function RunRowContent({
  children,
  className,
  title,
}: {
  children?: ReactNode
  className?: string
  title: ReactNode
}) {
  return (
    <div className={cn("grid min-w-0 max-w-[56ch] gap-1", className)}>
      <div className="truncate font-medium text-sm">{title}</div>
      {children}
    </div>
  )
}

export function RunRowMeta({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "col-span-2 flex flex-wrap items-center gap-3 justify-self-start md:col-span-1 md:justify-self-end",
        className
      )}
    >
      {children}
    </div>
  )
}

export function RunRowBody({ children }: { children: ReactNode }) {
  return <div className="grid gap-0">{children}</div>
}

export type RunRequestMeta = {
  Icon: LucideIcon
  iconClassName?: string
  label: string
}

export type RunSectionLabelValue = {
  count: number
  singular: string
}

export function RunRequestSection({
  actions,
  label,
  labelIcon: LabelIcon,
  meta,
  navigation,
  summary,
  title,
  titleIcon,
}: {
  actions?: ReactNode
  label: RunSectionLabelValue
  labelIcon: LucideIcon
  meta: RunRequestMeta | null
  navigation?: RunRequestNavigation
  summary: string
  title: string
  titleIcon: ReactNode
}) {
  return (
    <div className="grid gap-2 px-3 py-3 text-xs sm:grid-cols-[10rem_1fr]">
      <div className="flex items-start gap-1.5 font-medium">
        <LabelIcon className="mt-0.5 size-3.5 text-muted-foreground" />
        <RunSectionLabel label={label} />
      </div>
      <div className="min-w-0">
        <div className="flex min-h-5 items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-sm">
              {titleIcon}
              <span className="truncate">{title}</span>
            </span>
          </div>
          <RunRequestPager navigation={navigation} />
        </div>
        <p className="mt-2.5 text-foreground text-sm leading-relaxed">
          {summary}
        </p>
        <RunRequestFooter actions={actions} meta={meta} />
      </div>
    </div>
  )
}

export function RunSectionLabel({ label }: { label: RunSectionLabelValue }) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1">
      <span>{requestLabelText(label)}</span>
      {label.count > 1 ? (
        <span className="font-normal text-[0.625rem] text-muted-foreground leading-none tabular-nums">
          {label.count}
        </span>
      ) : null}
    </span>
  )
}

function requestLabelText(label: RunSectionLabelValue) {
  return label.count === 1 ? label.singular : `${label.singular}s`
}

function RunRequestFooter({
  actions,
  meta,
}: {
  actions?: ReactNode
  meta: RunRequestMeta | null
}) {
  if (actions === undefined && meta === null) {
    return null
  }

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
      <RunRequestMetaItem meta={meta} />
      {actions ?? null}
    </div>
  )
}

function RunRequestMetaItem({ meta }: { meta: RunRequestMeta | null }) {
  if (meta === null) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <meta.Icon className={cn("size-3.5", meta.iconClassName)} />
        {meta.label}
      </span>
    </div>
  )
}
