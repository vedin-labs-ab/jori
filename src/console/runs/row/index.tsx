import { Timer } from "lucide-react"
import { memo, useState } from "react"
import { ErrorDetail, RelativeTime } from "../../shared/details"
import { formatDuration, relativeTime } from "../../shared/time"
import { RunActivity } from "../activity"
import { type ExecutionItem } from "../types"
import { ApprovalCallout } from "./approval"
import { ExecutionFacts } from "./facts"
import {
  RunRowBody,
  RunRowContent,
  RunRowControl,
  RunRowFrame,
  RunRowHeader,
  RunRowMeta,
} from "./layout"
import { SourceLine } from "./source"
import { ApprovalStatusMeta, MetaPill, StatusIcon } from "./status"
import { StopExecution } from "./stop"
import { TaskDetail } from "./task"

export const ExecutionRow = memo(function ExecutionRow({
  execution,
  now,
  tenantId,
}: {
  execution: ExecutionItem
  now: number
  tenantId: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const durationMs = durationFor(execution, now)
  const isOngoing =
    execution.status === "queued" || execution.status === "running"

  return (
    <RunRowFrame>
      <RunRowHeader
        action={
          isOngoing ? (
            <StopExecution
              className="mr-3 shrink-0"
              runId={execution.id}
              tenantId={tenantId}
            />
          ) : undefined
        }
      >
        <RunRowControl onClick={() => setIsOpen((current) => !current)}>
          <StatusIcon
            approval={execution.approval}
            now={now}
            status={execution.status}
          />
          <ExecutionTitle execution={execution} />
          <ExecutionMeta
            durationMs={durationMs}
            execution={execution}
            isOpen={isOpen}
            now={now}
          />
        </RunRowControl>
      </RunRowHeader>
      {isOpen ? (
        <ExpandedExecution
          execution={execution}
          now={now}
          tenantId={tenantId}
        />
      ) : null}
    </RunRowFrame>
  )
})

function ExecutionTitle({ execution }: { execution: ExecutionItem }) {
  return (
    <RunRowContent title={execution.title}>
      <SourceLine details={execution.details} source={execution.source} />
    </RunRowContent>
  )
}

function ExecutionMeta({
  durationMs,
  execution,
  isOpen,
  now,
}: {
  durationMs: number | undefined
  execution: ExecutionItem
  isOpen: boolean
  now: number
}) {
  return (
    <RunRowMeta>
      {hasLivePendingApproval(execution.approval, now) ? (
        <ApprovalStatusMeta
          expiresAt={execution.approval.expiresAt}
          isVisible={!isOpen}
          now={now}
        />
      ) : null}
      {durationMs !== undefined ? (
        <MetaPill icon={Timer} label={formatDuration(durationMs)} />
      ) : null}
      <RelativeTime
        absolute={execution.createdAt}
        value={relativeTime(execution.createdAt, now)}
      />
    </RunRowMeta>
  )
}

function ExpandedExecution({
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
      {execution.approval !== null ? (
        <ApprovalCallout
          approval={execution.approval}
          now={now}
          tenantId={tenantId}
        />
      ) : null}
      {execution.error !== undefined ? (
        <ErrorDetail value={execution.error} />
      ) : null}
      <RunActivity now={now} runId={execution.id} tenantId={tenantId} />
    </RunRowBody>
  )
}

function durationFor(execution: ExecutionItem, now: number) {
  if (execution.endedAt === undefined) {
    return Math.max(0, now - execution.createdAt)
  }

  return execution.durationMs
}

function hasLivePendingApproval(
  approval: ExecutionItem["approval"],
  now: number
): approval is NonNullable<ExecutionItem["approval"]> {
  return (
    approval !== null &&
    approval.state === "pending" &&
    approval.expiresAt > now
  )
}
