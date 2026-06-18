import { type ToolSurface, toolSurfaceLabel } from "@contracts/integrations"
import { Globe, GlobeOff } from "lucide-react"
import { type ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { MiloLogo } from "@/shared/brand"
import { providerLogoPath } from "../shared/logo/path"

type ToolSurfaceLogoSize = "sm" | "md"

export function ToolAccessSummary({
  logoSize,
  surfaces,
  toolCount,
  webSearch,
}: {
  logoSize?: ToolSurfaceLogoSize
  surfaces: ToolSurface[]
  toolCount: number
  webSearch: boolean
}) {
  return (
    <span className="grid min-w-0 gap-1.5">
      <ToolCountSummary
        logoSize={logoSize}
        surfaces={surfaces}
        toolCount={toolCount}
      />
      <WebSearchStatus allowed={webSearch} />
    </span>
  )
}

export function ToolCountSummary({
  logoSize = "md",
  surfaces,
  toolCount,
}: {
  logoSize?: ToolSurfaceLogoSize
  surfaces: ToolSurface[]
  toolCount: number
}) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-foreground">
      <ToolSurfaceLogoStack logoSize={logoSize} surfaces={surfaces} />
      <span className="truncate">{toolCountLabel(toolCount)}</span>
    </span>
  )
}

function ToolSurfaceLogoStack({
  emptyFallback = null,
  logoSize,
  maxVisible = 3,
  surfaces,
}: {
  emptyFallback?: ReactNode
  logoSize: ToolSurfaceLogoSize
  maxVisible?: number
  surfaces: readonly ToolSurface[]
}) {
  const uniqueSurfaces = [...new Set(surfaces)]
  const visibleLimit = Math.max(1, maxVisible)
  const visibleCount =
    uniqueSurfaces.length > visibleLimit ? visibleLimit - 1 : visibleLimit
  const visibleSurfaces = uniqueSurfaces.slice(0, Math.max(1, visibleCount))
  const hiddenSurfaces = uniqueSurfaces.slice(visibleSurfaces.length)

  if (visibleSurfaces.length === 0) {
    return emptyFallback
  }

  return (
    <span className="inline-flex shrink-0 items-center">
      <span className="-space-x-1 inline-flex">
        {visibleSurfaces.map((surface) => (
          <ToolSurfaceLogo key={surface} size={logoSize} surface={surface} />
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

function ToolSurfaceLogo({
  size,
  surface,
}: {
  size: ToolSurfaceLogoSize
  surface: ToolSurface
}) {
  const className = cn(
    "shrink-0 bg-background ring-2 ring-card",
    logoSizeClassName(size)
  )

  if (surface === "milo") {
    return (
      <MiloLogo
        aria-hidden="true"
        className={className}
        focusable="false"
        title=""
      />
    )
  }

  const logo = providerLogoPath(surface)

  return logo === undefined ? null : (
    <img alt="" className={className} src={logo} />
  )
}

function logoSizeClassName(size: ToolSurfaceLogoSize) {
  return size === "sm" ? "size-3 rounded-xs" : "size-4 rounded-sm"
}

function WebSearchStatus({ allowed }: { allowed: boolean }) {
  const Icon = allowed ? Globe : GlobeOff
  const stateClassName = allowed ? "text-primary" : "text-destructive"

  return (
    <span className="flex min-w-0 items-center gap-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate text-foreground">
        Web{" "}
        <span className={cn("font-medium", stateClassName)}>
          {allowed ? "allowed" : "blocked"}
        </span>
      </span>
    </span>
  )
}

function toolCountLabel(count: number) {
  return count === 1 ? "1 tool" : `${count} tools`
}
