import { X } from "lucide-react"
import { type AutomationSurfaceIntegration } from "../../../access"
import { SurfaceLogo } from "../../../access/logo"

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
    <span
      className="group/remove flex items-center gap-1 px-1 font-medium"
      data-automation-remove-content=""
    >
      <button
        aria-label={`Remove ${toolSurfaceLabel}`}
        className="group/x grid h-5 w-4 place-items-center outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/30"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onRemove()
        }}
        onMouseDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        title={`Remove ${toolSurfaceLabel}`}
        type="button"
      >
        <SurfaceLogo
          className="size-3 group-hover/remove:hidden group-focus-within/remove:hidden"
          integration={integration}
        />
        <X className="hidden size-3 opacity-55 transition-opacity duration-150 ease-out group-hover/remove:block group-focus-within/remove:block group-hover/x:opacity-100 group-focus-visible/x:opacity-100" />
      </button>
      <span className="whitespace-nowrap">{toolSurfaceLabel}</span>
    </span>
  )
}
