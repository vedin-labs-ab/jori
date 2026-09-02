import { type ReactNode } from "react"
import { ErrorDetail, ResultDetail } from "../details"
import { type ExecutionItem } from "../types"
import { ExecutionFacts } from "./facts"
import { RunRowBody } from "./layout"
import { TaskDetail } from "./task"

/** The run opened up: its task and facts, the requests it is waiting on,
 *  what it returned or how it failed, and its log. The requests and the
 *  log are slots, since deciding, connecting, and reading the log each
 *  reach the backend. */
export function ExpandedExecution({
  approvals,
  execution,
  log,
  offers,
}: {
  /** The approvals section, shown when the run has any. */
  approvals: ReactNode
  execution: ExecutionItem
  /** The Log row. */
  log: ReactNode
  /** The integration offers section, shown when the run has any. */
  offers: ReactNode
}) {
  return (
    <RunRowBody>
      <TaskDetail sourceUrl={execution.source.url} task={execution.task} />
      <ExecutionFacts details={execution.details} />
      {execution.approvals.length > 0 ? approvals : null}
      {execution.offers.length > 0 ? offers : null}
      {execution.result !== undefined ? (
        <ResultDetail value={execution.result} />
      ) : null}
      {execution.error !== undefined ? (
        <ErrorDetail value={execution.error} />
      ) : null}
      {log}
    </RunRowBody>
  )
}
