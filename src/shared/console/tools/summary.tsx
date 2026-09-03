import { type ToolSurface, toolSurfaceLabel } from "@contracts/integrations"
import { Globe } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { countLabel } from "@/shared/console/count"
import { SeparatorDot } from "@/shared/console/dot"
import { RowMark } from "@/shared/console/list/mark"
import { ProviderLogo } from "@/shared/logo/provider"

/** What a job can reach, on one line: the marks of the integrations it
 *  was given, how many of their tools, and the globe when it may also
 *  reach the web. The web is off unless someone turned it on, so a row
 *  says nothing when it is off and marks the exception when it is on. */
export function ToolAccessSummary({
  surfaces,
  toolCount,
  webSearch,
}: {
  surfaces: ToolSurface[]
  toolCount: number
  webSearch: boolean
}) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-foreground">
      <ToolSurfaceLogoStack surfaces={surfaces} />
      <span className="truncate">{countLabel(toolCount, "tool")}</span>
      {webSearch ? (
        <>
          <SeparatorDot className="shrink-0 text-muted-foreground/60" />
          <RowMark icon={<Globe />} label="Web access allowed" />
        </>
      ) : null}
    </span>
  )
}

function ToolSurfaceLogoStack({
  surfaces,
}: {
  surfaces: readonly ToolSurface[]
}) {
  const uniqueSurfaces = [...new Set(surfaces)]
  const visibleCount = uniqueSurfaces.length > 3 ? 2 : 3
  const visibleSurfaces = uniqueSurfaces.slice(0, visibleCount)
  const hiddenSurfaces = uniqueSurfaces.slice(visibleSurfaces.length)

  if (visibleSurfaces.length === 0) {
    return null
  }

  return (
    <span className="inline-flex shrink-0 items-center">
      <span className="-space-x-1 inline-flex">
        {visibleSurfaces.map((surface) => (
          <ProviderLogo
            className="size-4 shrink-0 rounded-sm bg-background ring-2 ring-card"
            key={surface}
            surface={surface}
          />
        ))}
      </span>
      {hiddenSurfaces.length > 0 ? (
        <HiddenSurfaceCount surfaces={hiddenSurfaces} />
      ) : null}
    </span>
  )
}

function HiddenSurfaceCount({ surfaces }: { surfaces: ToolSurface[] }) {
  const label = surfaces.map(toolSurfaceLabel).join(", ")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={`Show ${surfaces.length} more integrations: ${label}`}
          className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-sm border bg-background px-1 text-[0.625rem] text-muted-foreground leading-none outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
          type="button"
        >
          +{surfaces.length}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
