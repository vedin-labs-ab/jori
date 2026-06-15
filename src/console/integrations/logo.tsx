import { type Integration, integrationLabel } from "@contracts/integrations"
import { type ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { providerLogoPath } from "../runs/row/logos"

type IntegrationLogoSize = "sm" | "md"

export function IntegrationLogo({
  className,
  integration,
  size = "sm",
}: {
  className?: string
  integration: Integration
  size?: IntegrationLogoSize
}) {
  const logo = providerLogoPath(integration)

  if (logo === undefined) {
    return null
  }

  return (
    <img
      alt={integrationLabel(integration)}
      className={cn(logoSizeClassName(size), "shrink-0", className)}
      src={logo}
    />
  )
}

export function IntegrationLogoStack({
  className,
  emptyFallback = null,
  integrations,
  maxVisible = 3,
  size = "sm",
}: {
  className?: string
  emptyFallback?: ReactNode
  integrations: readonly Integration[]
  maxVisible?: number
  size?: IntegrationLogoSize
}) {
  const uniqueIntegrations = uniqueIntegrationList(integrations)
  const visibleLimit = Math.max(1, maxVisible)
  const hasOverflow = uniqueIntegrations.length > visibleLimit
  const visibleCount = hasOverflow
    ? Math.max(1, visibleLimit - 1)
    : visibleLimit
  const visibleIntegrations = uniqueIntegrations.slice(0, visibleCount)
  const hiddenIntegrations = uniqueIntegrations.slice(visibleCount)

  if (visibleIntegrations.length === 0) {
    return emptyFallback
  }

  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <span className="-space-x-1 inline-flex">
        {visibleIntegrations.map((integration) => (
          <IntegrationLogo
            className="rounded-sm bg-background ring-2 ring-card"
            integration={integration}
            key={integration}
            size={size}
          />
        ))}
      </span>
      {hiddenIntegrations.length > 0 ? (
        <HiddenIntegrationCount integrations={hiddenIntegrations} size={size} />
      ) : null}
    </span>
  )
}

function HiddenIntegrationCount({
  integrations,
  size,
}: {
  integrations: Integration[]
  size: IntegrationLogoSize
}) {
  const hiddenTitle = integrations.map(integrationLabel).join(", ")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={`Show ${integrations.length} more integrations: ${hiddenTitle}`}
          className={cn(
            "ml-1 inline-flex items-center justify-center rounded-sm border bg-background px-1 text-muted-foreground leading-none outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/35",
            overflowCountClassName(size)
          )}
          type="button"
        >
          +{integrations.length}
        </button>
      </TooltipTrigger>
      <TooltipContent>{hiddenTitle}</TooltipContent>
    </Tooltip>
  )
}

function uniqueIntegrationList(integrations: readonly Integration[]) {
  return [...new Set(integrations)]
}

function logoSizeClassName(size: IntegrationLogoSize) {
  return size === "md" ? "size-5" : "size-4"
}

function overflowCountClassName(size: IntegrationLogoSize) {
  return size === "md"
    ? "h-5 min-w-5 text-[0.6875rem]"
    : "h-4 min-w-4 text-[0.625rem]"
}
