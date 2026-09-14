import { type Integration, integrationLabel } from "@contracts/integrations"
import { type ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { LogoImage } from "./image"
import { providerLogo } from "./registry"

import { type LogoSize, LogoStack } from "./stack"

export function IntegrationLogo({
  className,
  decorative = false,
  integration,
  size = "sm",
  ...props
}: Omit<ComponentProps<"img">, "alt" | "src"> & {
  decorative?: boolean
  integration: Integration
  size?: LogoSize
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
  size?: LogoSize
}) {
  return (
    <LogoStack
      items={integrations}
      label={integrationLabel}
      renderLogo={(integration) => (
        <IntegrationLogo integration={integration} size={size} />
      )}
      size={size}
    />
  )
}

function logoSizeClassName(size: LogoSize) {
  return size === "md" ? "size-5" : "size-4"
}
