import { X } from "lucide-react"
import { SurfaceLogo } from "../logo"
import { type ScheduleSurfaceProvider } from "../surfaces"

export function ScheduleSurfaceRemoveButton({
  onRemove,
  provider,
  providerLabel,
}: {
  onRemove: () => void
  provider: ScheduleSurfaceProvider
  providerLabel: string
}) {
  return (
    <span
      className="group/remove flex items-center gap-1 px-1 font-medium"
      data-schedule-remove-content=""
    >
      <button
        aria-label={`Remove ${providerLabel} marker`}
        className="group/x grid h-5 w-4 place-items-center outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring/30"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onRemove()
        }}
        title={`Remove ${providerLabel}`}
        type="button"
      >
        <SurfaceLogo
          className="size-3 group-hover/remove:hidden group-focus-within/remove:hidden"
          provider={provider}
        />
        <X className="hidden size-3 opacity-55 transition-opacity duration-150 ease-out group-hover/remove:block group-focus-within/remove:block group-hover/x:opacity-100 group-focus-visible/x:opacity-100" />
      </button>
      <span className="whitespace-nowrap">{providerLabel}</span>
    </span>
  )
}
