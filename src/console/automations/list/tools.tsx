import { ToolAccessSummary } from "../../tools/summary"
import { type Automation } from "../types"

export function AutomationToolSummary({
  automation,
}: {
  automation: Automation
}) {
  return (
    <ToolAccessSummary
      surfaces={automation.access.surfaces.map(
        (surface) => surface.integration
      )}
      toolCount={countTools(automation)}
      webSearch={automation.access.webSearch}
    />
  )
}

function countTools(automation: Automation) {
  return automation.access.surfaces.reduce(
    (sum, surface) => sum + surface.tools.length,
    0
  )
}
