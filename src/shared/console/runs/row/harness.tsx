import { render } from "@testing-library/react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ActivityLog } from "../activity"
import { ApprovalCallout } from "../request/approval"
import { OfferCallout, type OfferClaim } from "../request/offer"
import { type ExecutionItem } from "../types"
import { ExecutionRow } from "."
import { ExpandedExecution } from "./expanded"
import { StopRunButton } from "./stop"

/** The row as tests render it: every slot filled with the view that fills
 *  it in the console, over callbacks that settle without reaching anything. */
export function renderExecutionRow(item: ExecutionItem) {
  return render(
    <TooltipProvider>
      <ExecutionRow
        execution={item}
        expanded={renderExpanded}
        now={1700000001000}
        showAudience={true}
        stop={renderStop}
      />
    </TooltipProvider>
  )
}

function renderExpanded(execution: ExecutionItem, now: number) {
  return (
    <ExpandedExecution
      approvals={
        <ApprovalCallout
          approvals={execution.approvals}
          now={now}
          onDecide={settle}
        />
      }
      execution={execution}
      log={<ActivityLog activity={{ items: [], status: "loaded" }} now={now} />}
      offers={
        <OfferCallout
          now={now}
          offers={execution.offers}
          onCancel={settle}
          onClaim={claim}
        />
      }
    />
  )
}

function renderStop() {
  return <StopRunButton onStop={settle} />
}

function settle() {
  return Promise.resolve()
}

function claim(): Promise<OfferClaim> {
  return Promise.resolve({ status: "connected" })
}
