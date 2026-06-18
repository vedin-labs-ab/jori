import { Timer } from "lucide-react"
import { memo, useState } from "react"
import { ErrorDetail, RelativeTime } from "../../shared/details"
import { formatDuration, relativeTime } from "../format"
import { type ExecutionItem } from "../types"
import { ApprovalCallout } from "./approval"
import { ExecutionFacts } from "./facts"
import { SourceLine } from "./source"
import { ApprovalStatusMeta, MetaPill, StatusIcon } from "./status"
import { StopExecution } from "./stop"
import { TaskDetail } from "./task"
import { TraceTerminal } from "./terminal"

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
    <article className="overflow-hidden rounded-md bg-background ring-1 ring-foreground/10 ring-inset transition-shadow focus-within:ring-2 focus-within:ring-ring/50">
      <div className="flex items-center">
        <button
          className="group/execution-row grid min-w-0 flex-1 grid-cols-[auto_1fr] items-center gap-3 p-3 text-left outline-none md:grid-cols-[auto_1fr_auto]"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
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
        </button>
        {isOngoing ? (
          <StopExecution
            className="mr-3 shrink-0"
            executionId={execution.id}
            tenantId={tenantId}
          />
        ) : null}
      </div>
      {isOpen ? (
        <ExpandedExecution
          execution={execution}
          now={now}
          tenantId={tenantId}
        />
      ) : null}
    </article>
  )
})

function ExecutionTitle({ execution }: { execution: ExecutionItem }) {
  return (
    <div className="grid min-w-0 max-w-[56ch] gap-1">
      <div className="truncate font-medium text-sm">{execution.title}</div>
      <SourceLine source={execution.source} />
    </div>
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
    <div className="col-span-2 flex flex-wrap items-center gap-3 justify-self-start md:col-span-1 md:justify-self-end">
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
    </div>
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
    <div className="grid gap-0">
      <TaskDetail source={execution.taskSource} task={execution.task} />
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
      <TraceTerminal execution={execution} tenantId={tenantId} />
    </div>
  )
}

function durationFor(execution: ExecutionItem, now: number) {
  if (execution.finishedAt === undefined) {
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
