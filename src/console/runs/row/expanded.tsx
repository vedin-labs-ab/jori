import { ExpandedExecution } from "@/shared/console/runs/row/expanded"
import { type ExecutionItem } from "@/shared/console/runs/types"
import { RunActivity } from "../activity"
import { RunApprovals } from "../request/approval"
import { RunOffers } from "../request/offer"

/** A run's detail bound to its organization: the shared detail view with
 *  its approvals, offers, and log each talking to Convex. The list loads
 *  this module lazily, so the page's own chunk carries only the rows. */
export function ExpandedRun({
  execution,
  now,
  organizationId,
}: {
  execution: ExecutionItem
  now: number
  organizationId: string
}) {
  return (
    <ExpandedExecution
      approvals={
        <RunApprovals
          approvals={execution.approvals}
          now={now}
          organizationId={organizationId}
        />
      }
      execution={execution}
      log={
        <RunActivity
          now={now}
          organizationId={organizationId}
          runId={execution.id}
        />
      }
      offers={
        <RunOffers
          now={now}
          offers={execution.offers}
          organizationId={organizationId}
          runId={execution.id}
        />
      }
    />
  )
}
