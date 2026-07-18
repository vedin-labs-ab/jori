import { ErrorDetail, ResultDetail } from "../../shared/details"
import { RunActivity } from "../activity"
import { ApprovalCallout } from "../request/approval"
import { OfferCallout } from "../request/offer"
import { type ExecutionItem } from "../types"
import { ExecutionFacts } from "./facts"
import { RunRowBody } from "./layout"
import { TaskDetail } from "./task"

export function ExpandedExecution({
  execution,
  now,
  tenantId,
}: {
  execution: ExecutionItem
  now: number
  tenantId: string
}) {
  return (
    <RunRowBody>
      <TaskDetail sourceUrl={execution.source.url} task={execution.task} />
      <ExecutionFacts details={execution.details} />
      {execution.approvals.length > 0 ? (
        <ApprovalCallout
          approvals={execution.approvals}
          now={now}
          tenantId={tenantId}
        />
      ) : null}
      {execution.offers.length > 0 ? (
        <OfferCallout
          now={now}
          offers={execution.offers}
          runId={execution.id}
          tenantId={tenantId}
        />
      ) : null}
      {execution.result !== undefined ? (
        <ResultDetail value={execution.result} />
      ) : null}
      {execution.error !== undefined ? (
        <ErrorDetail value={execution.error} />
      ) : null}
      <RunActivity now={now} runId={execution.id} tenantId={tenantId} />
    </RunRowBody>
  )
}
