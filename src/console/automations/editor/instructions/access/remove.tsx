import { X } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { type AutomationSurfaceIntegration } from "../../../access"
import { SurfaceLogo } from "../../../access/logo"

/** A marker's identity segment: the kind icon that swaps to a remove
 *  button on hover or focus, next to the marker's name. */
export function AutomationMarkerRemoveButton({
  icon,
  label,
  onRemove,
}: {
  icon: ReactNode
  label: string
  onRemove: () => void
}) {
  return (
    <span
      className="group/remove flex items-center gap-1 px-1 font-medium"
      data-automation-remove-content=""
    >
      <button
        aria-label={`Remove ${label}`}
        className="group/x grid w-4 place-items-center self-stretch outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/30"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onRemove()
        }}
        onMouseDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        title={`Remove ${label}`}
        type="button"
      >
        <span className="grid place-items-center group-focus-within/remove:hidden group-hover/remove:hidden">
          {icon}
        </span>
        <X className="hidden size-3 opacity-55 transition-opacity duration-150 ease-out group-focus-within/remove:block group-hover/remove:block group-focus-visible/x:opacity-100 group-hover/x:opacity-100" />
      </button>
      <span className="whitespace-nowrap">{label}</span>
    </span>
  )
}

export function AutomationSurfaceRemoveButton({
  onRemove,
  integration,
  toolSurfaceLabel,
}: {
  onRemove: () => void
  integration: AutomationSurfaceIntegration
  toolSurfaceLabel: string
}) {
  return (
    <AutomationMarkerRemoveButton
      icon={<SurfaceLogo className="size-3" integration={integration} />}
      label={toolSurfaceLabel}
      onRemove={onRemove}
    />
  )
}

/** A marker's action segment: a quiet icon button in the pill's own tone,
 *  brightening on hover, that must not steal the editor's selection. */
export function AutomationMarkerActionButton({
  ariaLabel,
  children,
  className,
  onOpen,
  onWarm,
  title,
}: {
  ariaLabel: string
  children: ReactNode
  className?: string
  onOpen: () => void
  /** First sign of pointer or focus intent; lets callers warm data early. */
  onWarm?: () => void
  title: string
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 self-stretch px-1 font-medium opacity-70 outline-none transition-opacity duration-150 ease-out hover:opacity-100 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/30",
        className
      )}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onOpen()
      }}
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onFocus={onWarm}
      onPointerOver={onWarm}
      title={title}
      type="button"
    >
      {children}
    </button>
  )
}
