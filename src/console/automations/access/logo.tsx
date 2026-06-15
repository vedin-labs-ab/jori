import { cn } from "@/lib/utils"
import { type AutomationSurfaceIntegration, getAutomationSurfaceLogo } from "."

export function SurfaceLogo({
  className,
  provider,
}: {
  className?: string
  provider: AutomationSurfaceIntegration
}) {
  return (
    <img
      alt=""
      className={cn("size-3.5 shrink-0", className)}
      src={getAutomationSurfaceLogo(provider)}
    />
  )
}
