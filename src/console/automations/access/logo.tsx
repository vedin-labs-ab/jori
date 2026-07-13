import { cn } from "@/lib/utils"
import { providerLogoPath } from "@/shared/logo/path"
import { type AutomationSurfaceIntegration } from "./catalog"

export function SurfaceLogo({
  alt = "",
  className,
  integration,
}: {
  alt?: string
  className?: string
  integration: AutomationSurfaceIntegration
}) {
  return (
    <img
      alt={alt}
      className={cn("size-3.5 shrink-0", className)}
      src={providerLogoPath(integration)}
    />
  )
}
