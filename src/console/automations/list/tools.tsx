import { IntegrationLogoStack } from "../../integrations/logo"
import { type Automation } from "../types"

export function AutomationToolSummary({
  automation,
}: {
  automation: Automation
}) {
  return (
    <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
      <IntegrationLogoStack
        integrations={automation.access.surfaces.map(
          (surface) => surface.integration
        )}
      />
      <span className="truncate">{toolSummary(countTools(automation))}</span>
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
