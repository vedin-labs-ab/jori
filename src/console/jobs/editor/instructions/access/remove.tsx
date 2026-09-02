import { X } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { type JobSurfaceIntegration } from "../../../access"
import { SurfaceLogo } from "../../../access/logo"

/** A marker's identity segment: the kind icon that swaps to a remove
 *  button on hover or focus, next to the marker's name. */
export function JobMarkerRemoveButton({
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
      data-job-remove-content=""
    >
      <button
        aria-label={`Remove ${label}`}
        className="group/x grid w-6 place-items-center self-stretch outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/30 lg:w-4"
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
        <span className="hidden place-items-center lg:grid lg:group-focus-within/remove:hidden lg:group-hover/remove:hidden">
          {icon}
        </span>
        <X className="block size-3 opacity-100 transition-opacity duration-150 ease-out lg:hidden lg:opacity-55 lg:group-focus-within/remove:block lg:group-hover/remove:block lg:group-focus-visible/x:opacity-100 lg:group-hover/x:opacity-100" />
      </button>
      <span className="whitespace-nowrap">{label}</span>
    </span>
  )
}

export function JobSurfaceRemoveButton({
  onRemove,
  integration,
  toolSurfaceLabel,
}: {
  onRemove: () => void
  integration: JobSurfaceIntegration
  toolSurfaceLabel: string
}) {
  return (
    <JobMarkerRemoveButton
      icon={<SurfaceLogo className="size-3" integration={integration} />}
      label={toolSurfaceLabel}
      onRemove={onRemove}
    />
  )
}

/** A marker's action segment: a quiet icon button in the pill's own tone,
 *  brightening on hover, that must not steal the editor's selection. */
export function JobMarkerActionButton({
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
