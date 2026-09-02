import { ErrorDetail, ResultDetail } from "@/shared/console/runs/details"
import { ExecutionFacts } from "@/shared/console/runs/row/facts"
import { RunRowBody } from "@/shared/console/runs/row/layout"
import { TaskDetail } from "@/shared/console/runs/row/task"
import { type ExecutionItem } from "@/shared/console/runs/types"
import { RunActivity } from "../activity"
import { ApprovalCallout } from "../request/approval"
import { OfferCallout } from "../request/offer"

export function ExpandedExecution({
  execution,
  now,
  organizationId,
}: {
  execution: ExecutionItem
  now: number
  organizationId: string
}) {
  return (
    <RunRowBody>
      <TaskDetail sourceUrl={execution.source.url} task={execution.task} />
      <ExecutionFacts details={execution.details} />
      {execution.approvals.length > 0 ? (
        <ApprovalCallout
          approvals={execution.approvals}
          now={now}
          organizationId={organizationId}
        />
      ) : null}
      {execution.offers.length > 0 ? (
        <OfferCallout
          now={now}
          offers={execution.offers}
          runId={execution.id}
          organizationId={organizationId}
        />
      ) : null}
      {execution.result !== undefined ? (
        <ResultDetail value={execution.result} />
      ) : null}
      {execution.error !== undefined ? (
        <ErrorDetail value={execution.error} />
      ) : null}
      <RunActivity
        now={now}
        runId={execution.id}
        organizationId={organizationId}
      />
    </RunRowBody>
  )
}
