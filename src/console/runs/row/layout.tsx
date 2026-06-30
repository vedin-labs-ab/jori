import {
  type FocusEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from "react"
import { cn } from "@/lib/utils"

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
