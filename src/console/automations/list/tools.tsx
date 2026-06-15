import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getAutomationSurfaceLabel } from "../access"
import { SurfaceLogo } from "../access/logo"
import { type Automation } from "../types"

type AutomationSurface = Automation["access"]["surfaces"][number]

export function AutomationToolSummary({
  automation,
}: {
  automation: Automation
}) {
  return (
    <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
      <SurfaceLogoStack surfaces={automation.access.surfaces} />
      <span className="truncate">{toolSummary(countTools(automation))}</span>
    </span>
  )
}

function SurfaceLogoStack({ surfaces }: { surfaces: AutomationSurface[] }) {
  const hasOverflow = surfaces.length > 3
  const visibleSurfaces = surfaces.slice(0, hasOverflow ? 2 : 3)
  const hiddenSurfaces = hasOverflow ? surfaces.slice(2) : []

  if (visibleSurfaces.length === 0) {
    return null
  }

  return (
    <span className="inline-flex shrink-0 items-center">
      <span className="-space-x-1 inline-flex">
        {visibleSurfaces.map((surface) => (
          <SurfaceLogo
            className="size-4 rounded-sm bg-background ring-2 ring-card"
            integration={surface.integration}
            key={surface.integration}
          />
        ))}
      </span>
      {hiddenSurfaces.length > 0 ? (
        <HiddenSurfaceCount surfaces={hiddenSurfaces} />
      ) : null}
    </span>
  )
}

function HiddenSurfaceCount({ surfaces }: { surfaces: AutomationSurface[] }) {
  const hiddenLabels = surfaces.map((surface) =>
    getAutomationSurfaceLabel(surface.integration)
  )
  const hiddenTitle = hiddenLabels.join(", ")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={`Show ${surfaces.length} more integrations: ${hiddenTitle}`}
          className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-sm border bg-background px-1 text-[0.625rem] text-muted-foreground leading-none outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/35"
          type="button"
        >
          +{surfaces.length}
        </button>
      </TooltipTrigger>
      <TooltipContent>{hiddenTitle}</TooltipContent>
    </Tooltip>
  )
}

function countTools(automation: Automation) {
  return automation.access.surfaces.reduce(
    (sum, surface) => sum + surface.tools.length,
    0
  )
}

function toolSummary(count: number) {
  return count === 1 ? "1 tool" : `${count} tools`
}
