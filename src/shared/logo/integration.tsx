import { type Integration, integrationLabel } from "@contracts/integrations"
import { type ComponentProps } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { LogoImage } from "./image"
import { providerLogo } from "./registry"

type IntegrationLogoSize = "sm" | "md"

// Labeled outline chips, one per integration: the standard way a record
// wears its source rollup (workstream cards, detail headers).
export function IntegrationChips({
  integrations,
}: {
  integrations: readonly Integration[]
}) {
  if (integrations.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {integrations.map((integration) => (
        <Badge key={integration} variant="outline">
          <IntegrationLogo
            className="size-3"
            decorative
            integration={integration}
          />
          {integrationLabel(integration)}
        </Badge>
      ))}
    </div>
  )
}

export function IntegrationLogo({
  className,
  decorative = false,
  integration,
  size = "sm",
  ...props
}: Omit<ComponentProps<"img">, "alt" | "src"> & {
  decorative?: boolean
  integration: Integration
  size?: IntegrationLogoSize
}) {
  const logo = providerLogo(integration)

  if (logo === undefined) {
    return null
  }

  return (
    <LogoImage
      alt={decorative ? "" : integrationLabel(integration)}
      aria-hidden={decorative}
      className={cn(logoSizeClassName(size), className)}
      {...logo}
      {...props}
    />
  )
}

export function IntegrationLogoStack({
  integrations,
  size = "sm",
}: {
  integrations: readonly Integration[]
  size?: IntegrationLogoSize
}) {
  const uniqueIntegrations = [...new Set(integrations)]
  const visibleCount = uniqueIntegrations.length > 3 ? 2 : 3
  const visibleIntegrations = uniqueIntegrations.slice(0, visibleCount)
  const hiddenIntegrations = uniqueIntegrations.slice(visibleCount)

  if (visibleIntegrations.length === 0) {
    return null
  }

  return (
    <span className="inline-flex shrink-0 items-center">
      <span className="-space-x-1 inline-flex">
        {/* The backdrop sits on a wrapper, not the mark: an ink mark
            inverts on a dark ground, and its backdrop must not. */}
        {visibleIntegrations.map((integration) => (
          <span
            className="inline-flex rounded-sm bg-background ring-2 ring-card"
            key={integration}
          >
            <IntegrationLogo integration={integration} size={size} />
          </span>
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

function logoSizeClassName(size: IntegrationLogoSize) {
  return size === "md" ? "size-5" : "size-4"
}

function overflowCountClassName(size: IntegrationLogoSize) {
  return size === "md"
    ? "h-5 min-w-5 text-[0.6875rem]"
    : "h-4 min-w-4 text-[0.625rem]"
}
