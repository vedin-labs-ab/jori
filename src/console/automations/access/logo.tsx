import { cn } from "@/lib/utils"
import { type AutomationSurfaceIntegration, getAutomationSurfaceLogo } from "."

export function SurfaceLogo({
  className,
  integration,
}: {
  className?: string
  integration: AutomationSurfaceIntegration
}) {
  return (
    <img
      alt=""
      className={cn("size-3.5 shrink-0", className)}
      src={getAutomationSurfaceLogo(integration)}
    />
  )
}
