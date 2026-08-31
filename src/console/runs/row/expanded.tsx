import { RunActivity } from "../activity"
import { ErrorDetail, ResultDetail } from "../details"
import { ApprovalCallout } from "../request/approval"
import { OfferCallout } from "../request/offer"
import { type ExecutionItem } from "../types"
import { ExecutionFacts } from "./facts"
import { RunRowBody } from "./layout"
import { TaskDetail } from "./task"

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
