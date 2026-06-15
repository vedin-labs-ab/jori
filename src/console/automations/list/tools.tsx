import { Globe, GlobeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { IntegrationLogoStack } from "../../integrations/logo"
import { type Automation } from "../types"

export function AutomationToolSummary({
  automation,
}: {
  automation: Automation
}) {
  return (
    <span className="grid min-w-0 gap-1.5">
      <span className="flex min-w-0 items-center gap-2 text-foreground">
        <IntegrationLogoStack
          integrations={automation.access.surfaces.map(
            (surface) => surface.integration
          )}
        />
        <span className="truncate">{toolSummary(countTools(automation))}</span>
      </span>
      <WebSearchStatus allowed={automation.access.webSearch} />
    </span>
  )
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

function countTools(automation: Automation) {
  return automation.access.surfaces.reduce(
    (sum, surface) => sum + surface.tools.length,
    0
  )
}

function toolSummary(count: number) {
  return count === 1 ? "1 tool" : `${count} tools`
}
