import { render } from "@testing-library/react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type ExecutionItem } from "@/shared/console/runs/types"
// Keep row assertions independent of production chunk-loading latency.
import "./row/expanded"
import { ExecutionRow } from "./row"

export function renderExecutionRow(item: ExecutionItem) {
  return render(
    <TooltipProvider>
      <ExecutionRow
        execution={item}
        now={1700000001000}
        showAudience={true}
        organizationId="organization"
      />
    </TooltipProvider>
  )
}
